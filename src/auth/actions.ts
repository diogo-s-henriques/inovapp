import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type AuthError,
} from 'firebase/auth';
import { deleteField, doc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import { deleteAccountData } from '@/lib/account';
import { useAuthStore } from '@/auth/store';
import { setRememberedEmail } from '@/lib/remembered-email';
import { getAccountRole } from '@/constants/auth';
import { getLocale, getTranslations } from '@/i18n/store';
import type { ProfileSetupData } from '@/types/profile';

/*
 * Os emails de confirmação e de reposição da palavra-passe não são escritos pela app: quem os
 * escreve é o Firebase, a partir de um modelo do projeto, e a app só pode dizer em **que idioma** o
 * quer. Sem isto, o idioma por omissão do projeto é o inglês - verificado no próprio link que o
 * Firebase gera (`lang=en`) - e um aluno do ISEC recebia um email em inglês de uma app que fala
 * português.
 *
 * Aviso honesto: isto é o que a app pode fazer, não uma garantia. Há relatos de o `languageCode` do
 * cliente não vencer sempre o idioma escolhido no modelo (firebase-js-sdk#5846); quem decide de
 * facto é o idioma do modelo em Authentication -> Templates, e é lá que se confirma.
 */
function setEmailLanguage(): void {
  // `pt-PT` e não `pt`: sem a região, o Firebase serve o português do Brasil.
  auth.languageCode = getLocale() === 'pt' ? 'pt-PT' : 'en';
}

// Fora de React (sem hooks), lê-se o dicionário do idioma atual com getTranslations().
export function getAuthErrorMessage(error: unknown): string {
  const code = (error as AuthError)?.code;
  const i18n = getTranslations();

  switch (code) {
    case 'auth/invalid-email':
      return i18n.auth.errorInvalidEmail;
    case 'auth/email-already-in-use':
      return i18n.auth.errorEmailInUse;
    case 'auth/weak-password':
      return i18n.auth.errorWeakPassword;
    case 'auth/password-does-not-meet-requirements':
      return i18n.auth.errorPasswordRequirements;
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return i18n.auth.errorWrongCredentials;
    case 'auth/too-many-requests':
      return i18n.auth.errorTooManyRequests;
    default:
      // Erros que não vêm do Firebase (ex.: as nossas próprias validações de domínio/confirmação
      // de password) já trazem uma mensagem pronta para mostrar ao utilizador.
      return code ? i18n.common.genericError : ((error as Error)?.message ?? i18n.common.genericError);
  }
}

/**
 * Cria a conta no Firebase Auth e os dois documentos do utilizador, no mesmo writeBatch:
 * - `users/{uid}` - perfil visível a quem tem sessão iniciada (o que a pesquisa/matching leem);
 * - `userAccounts/{uid}` - dados privados da conta (email, última entrada, sessão prolongada),
 *   legíveis só pelo próprio (ver firestore.rules). Sem esta separação, qualquer utilizador
 *   autenticado conseguiria ler o email e a última entrada de todos os outros.
 */
export async function signUp(email: string, password: string, remember: boolean): Promise<void> {
  const role = getAccountRole(email);
  if (!role) {
    throw new Error(getTranslations().auth.institutionalEmailRequired);
  }

  const credential = await createUserWithEmailAndPassword(auth, email, password);

  const batch = writeBatch(db);
  batch.set(doc(db, 'users', credential.user.uid), {
    role,
    profileCompleted: false,
    createdAt: serverTimestamp(),
  });
  // "Lembrar-me" também decide se o email fica guardado no dispositivo para o ecrã de entrada o
  // voltar a preencher (ver src/lib/remembered-email.ts) - a sessão em si é duração, não isto.
  await setRememberedEmail(remember ? (credential.user.email ?? email) : null);

  // O email gravado é o que o Firebase autenticou, não o que foi escrito no formulário: o Auth
  // normaliza-o (fica sempre em minúsculas) e a regra de `userAccounts` exige que seja igual ao
  // do token. A gravar a string do formulário, uma única maiúscula fazia as regras recusarem a
  // criação do documento - com a conta já criada no Auth e sem perfil.
  batch.set(doc(db, 'userAccounts', credential.user.uid), {
    email: credential.user.email ?? email,
    role,
    lastLoginAt: serverTimestamp(),
    rememberSession: remember,
  });
  await batch.commit();

  // O link de confirmação, logo a seguir à conta existir. Falhar aqui **não pode** deitar abaixo o
  // registo: a conta e o par de documentos já estão criados, e o ecrã da confirmação tem um botão
  // para voltar a pedir o email. O que não pode acontecer é a pessoa ficar à espera de um email
  // que ninguém pediu.
  try {
    setEmailLanguage();
    await sendEmailVerification(credential.user);
  } catch {
    // ignorado de propósito - ver acima
  }
}

export async function signIn(email: string, password: string, remember: boolean): Promise<void> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const { uid } = credential.user;
  const accountEmail = credential.user.email ?? email;

  // Guardado (ou esquecido) antes de qualquer escrita ao Firestore: é uma decisão sobre este
  // dispositivo, e tem de valer mesmo para contas cujo email não dá um `role` reconhecível.
  await setRememberedEmail(remember ? accountEmail : null);

  const role = getAccountRole(accountEmail);

  // Contas sem `role` reconhecível (email fora dos domínios institucionais) continuam a entrar:
  // só não fazemos as escritas de manutenção, que as regras do Firestore recusariam.
  if (!role) return;

  // setDoc com merge (e não updateDoc) também repara contas cujo documento ainda não exista no
  // Firestore: antes disto, um login válido no Auth rebentava com um erro sem sentido.
  await setDoc(
    doc(db, 'userAccounts', uid),
    { email: accountEmail, role, lastLoginAt: serverTimestamp(), rememberSession: remember },
    { merge: true },
  );

  // Reparação do perfil e migração dos documentos antigos, que ainda tinham
  // email/lastLoginAt/rememberSession dentro de `users` (legível por qualquer utilizador
  // autenticado) - deleteField() não faz nada quando o campo já não existe. Não é crítica:
  // se as regras a recusarem, a entrada continua a funcionar.
  try {
    await setDoc(
      doc(db, 'users', uid),
      {
        role,
        email: deleteField(),
        lastLoginAt: deleteField(),
        rememberSession: deleteField(),
      },
      { merge: true },
    );
  } catch {
    // ignorado de propósito - ver comentário acima
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Apaga a conta - a do Auth e tudo o que é dela no Firestore. É definitivo e não há caminho de
 * volta; quem chama tem de ter avisado antes (ver src/app/settings.tsx).
 *
 * **A palavra-passe é pedida sempre, e verificada antes de se apagar seja o que for.** O Firebase só
 * se queixa de uma entrada antiga (`auth/requires-recent-login`) no momento em que a conta é
 * apagada - ou seja, depois de os dados já terem ido. Reautenticar primeiro tem duas vantagens: uma
 * palavra-passe errada não deixa nada a meio, e a pergunta que a pessoa vê é sempre a mesma em vez
 * de aparecer só de vez em quando.
 *
 * **A ordem: dados, depois conta.** A conta apagada tira o token, e sem token o cliente já não pode
 * apagar nada - o que sobrasse no Firestore ficava órfão (o raciocínio todo está em
 * src/lib/account.ts).
 */
export async function deleteAccount(password: string): Promise<void> {
  const current = auth.currentUser;
  const email = current?.email;

  if (!current || !email) {
    throw new Error(getTranslations().settings.deleteAccountFailed);
  }

  await reauthenticateWithCredential(current, EmailAuthProvider.credential(email, password));

  await deleteAccountData(current.uid);

  // O email lembrado no dispositivo era o desta conta: quem se registar outra vez com o mesmo
  // endereço não deve encontrar o campo preenchido com a conta antiga.
  await setRememberedEmail(null);

  // A conta em último. A partir daqui o token deixa de valer, o `onAuthStateChanged` dispara com
  // `null` e a app volta ao ecrã de entrada sozinha (ver src/app/_layout.tsx) - não é preciso
  // navegar para lado nenhum a partir daqui.
  await deleteUser(current);
}

/**
 * Manda (ou volta a mandar) o email de confirmação.
 *
 * O Firebase limita os envios seguidos para a mesma caixa: quem carregar duas vezes seguidas no
 * botão leva um `auth/too-many-requests`, e é o ecrã que o traduz.
 */
export async function sendVerificationEmail(): Promise<void> {
  const current = auth.currentUser;
  if (!current) return;

  // Reenviar é a altura em que o idioma mais importa: quem carrega aqui já não recebeu o primeiro
  // (ou não o encontrou), e muitas vezes é porque está em inglês no meio da caixa de correio.
  setEmailLanguage();
  await sendEmailVerification(current);
}

/**
 * Pergunta ao Firebase se o email já foi confirmado, e força um **token novo**.
 *
 * O `reload()` não basta, e é esta a parte que engana: o link abre no browser e a app não é
 * avisada; mesmo depois de o Firebase saber que o email está confirmado, o token que já está no
 * dispositivo continua a dizer `email_verified: false` durante até uma hora - e são as regras do
 * Firestore que leem o token, não o objeto local. Sem o `getIdToken(true)`, a app deixava entrar e
 * o servidor recusava as escritas com um erro que não diz nada sobre o que falta.
 *
 * Devolve o estado para quem chamou poder dizer "ainda não" sem ter de o ir buscar outra vez.
 */
export async function refreshEmailVerified(): Promise<boolean> {
  const current = auth.currentUser;
  if (!current) return false;

  await current.reload();
  if (current.emailVerified) await current.getIdToken(true);

  // O utilizador que o listener guardou é **o mesmo objeto** que este, e o `reload()` escreveu lá
  // dentro: os dois já veem `true`. O que falta é avisar quem está a olhar para ele - sem isto, a
  // app ficava no ecrã da confirmação até algo voltar a mexer no estado.
  const { user, setUser } = useAuthStore.getState();
  if (user) setUser({ ...user, emailVerified: current.emailVerified });

  return current.emailVerified;
}

/**
 * Pede o email de reposição da palavra-passe. Erros de "não existe conta" são engolidos de
 * propósito: a resposta mostrada é sempre a mesma para que ninguém possa usar este ecrã para
 * descobrir que emails têm conta na app.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    setEmailLanguage();
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error) {
    if ((error as AuthError)?.code === 'auth/user-not-found') return;
    throw error;
  }
}

export async function completeProfileSetup(uid: string, data: ProfileSetupData): Promise<void> {
  // Campos undefined (ex.: curso/ano de um professor) não são enviados - o Firestore rejeita
  // updateDoc com valores undefined.
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );

  await updateDoc(doc(db, 'users', uid), {
    ...cleanData,
    profileCompleted: true,
  });
}
