import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type AuthError,
} from 'firebase/auth';
import { deleteField, doc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import { setRememberedEmail } from '@/lib/remembered-email';
import { getAccountRole } from '@/constants/auth';
import { getTranslations } from '@/i18n/store';
import type { ProfileSetupData } from '@/types/profile';

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
 * - `users/{uid}` — perfil visível a quem tem sessão iniciada (o que a pesquisa/matching leem);
 * - `userAccounts/{uid}` — dados privados da conta (email, última entrada, sessão prolongada),
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
  // voltar a preencher (ver src/lib/remembered-email.ts) — a sessão em si é duração, não isto.
  await setRememberedEmail(remember ? (credential.user.email ?? email) : null);

  // O email gravado é o que o Firebase autenticou, não o que foi escrito no formulário: o Auth
  // normaliza-o (fica sempre em minúsculas) e a regra de `userAccounts` exige que seja igual ao
  // do token. A gravar a string do formulário, uma única maiúscula fazia as regras recusarem a
  // criação do documento — com a conta já criada no Auth e sem perfil.
  batch.set(doc(db, 'userAccounts', credential.user.uid), {
    email: credential.user.email ?? email,
    role,
    lastLoginAt: serverTimestamp(),
    rememberSession: remember,
  });
  await batch.commit();
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
  // autenticado) — deleteField() não faz nada quando o campo já não existe. Não é crítica:
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
    // ignorado de propósito — ver comentário acima
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Pede o email de reposição da palavra-passe. Erros de "não existe conta" são engolidos de
 * propósito: a resposta mostrada é sempre a mesma para que ninguém possa usar este ecrã para
 * descobrir que emails têm conta na app.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error) {
    if ((error as AuthError)?.code === 'auth/user-not-found') return;
    throw error;
  }
}

export async function completeProfileSetup(uid: string, data: ProfileSetupData): Promise<void> {
  // Campos undefined (ex.: curso/ano de um professor) não são enviados — o Firestore rejeita
  // updateDoc com valores undefined.
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );

  await updateDoc(doc(db, 'users', uid), {
    ...cleanData,
    profileCompleted: true,
  });
}
