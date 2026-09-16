/**
 * Ligação dos testes de integração aos emuladores do Firestore e do Auth.
 *
 * Estes testes correm o código real da camada de dados (`src/lib/*`) contra o SDK verdadeiro do
 * Firebase, com o `firestore.rules` verdadeiro pelo meio — é a única forma de verificar se a
 * aplicação consegue mesmo escrever o que as regras exigem, sem tocar em dados de produção.
 *
 * Os emuladores são arrancados pelo `emulators:exec` do `npm run test:data`, que define
 * `FIRESTORE_EMULATOR_HOST` e `FIREBASE_AUTH_EMULATOR_HOST`.
 *
 * Os ficheiros correm **um a um** (`--test-concurrency=1`, no script do package.json): todos
 * partilham o mesmo par de emuladores e cada um chama `limparEmulador()` no início, por isso em
 * paralelo apagariam as contas uns dos outros a meio — e os erros apareceriam longe da causa
 * (`auth/email-already-in-use` ao criar uma conta, ou um documento que desaparece debaixo de um
 * teste).
 */
import { connectAuthEmulator, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc } from 'firebase/firestore';

import { completeProfileSetup, signUp } from '@/auth/actions';
import { auth, db } from '@/lib/firebase';
import type { ProfileSetupData } from '@/types/profile';

const PROJETO = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'inovapp-68021';
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST;
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;

// Sem esta verificação, um `node --test` sem emuladores a correr apontaria o SDK para a base de
// dados de PRODUÇÃO — e estes testes escrevem pedidos, sessões e avaliações a sério.
if (!FIRESTORE_HOST || !AUTH_HOST) {
  throw new Error(
    'Os testes da camada de dados só correm contra emuladores, e falta ' +
      `${!FIRESTORE_HOST ? 'FIRESTORE_EMULATOR_HOST' : ''}${!FIRESTORE_HOST && !AUTH_HOST ? ' e ' : ''}` +
      `${!AUTH_HOST ? 'FIREBASE_AUTH_EMULATOR_HOST' : ''}. Usa \`npm run test:data\`, que arranca os dois.`,
  );
}

const [firestoreHost, firestorePorta] = FIRESTORE_HOST.split(':');
connectFirestoreEmulator(db, firestoreHost, Number(firestorePorta));
connectAuthEmulator(auth, `http://${AUTH_HOST}`, { disableWarnings: true });

export const SENHA_DE_TESTE = 'Password1!';

/** Emails institucionais: o papel deriva sempre do domínio (ver src/constants/auth.ts). */
export const CONTAS = {
  /** Aluna que só aprende — o lado "Tutorando" dos fluxos. */
  aluna: 'ana.aluna@alunos.iseclisboa.pt',
  /** Aluno que ensina — o lado "Mentor". */
  alunoQueEnsina: 'bruno.aluno@alunos.iseclisboa.pt',
  /** Professora — nunca é "Mentor", é "Tutor". */
  professora: 'carla.professora@iseclisboa.pt',
  /** Aluno que também só aprende, para cenários de terceiro. */
  intruso: 'diogo.aluno@alunos.iseclisboa.pt',
} as const;

/** Esvazia os emuladores de Firestore e de Auth. Cada cenário começa do zero. */
export async function limparEmulador(): Promise<void> {
  // A sessão do SDK guarda um utilizador que vai deixar de existir; sair primeiro evita que o
  // cliente fique a tentar refrescar um token de uma conta apagada.
  await signOut(auth).catch(() => undefined);

  const respostas = await Promise.all([
    fetch(`http://${FIRESTORE_HOST}/emulator/v1/projects/${PROJETO}/databases/(default)/documents`, {
      method: 'DELETE',
    }),
    fetch(`http://${AUTH_HOST}/emulator/v1/projects/${PROJETO}/accounts`, { method: 'DELETE' }),
  ]);

  for (const resposta of respostas) {
    if (!resposta.ok) {
      throw new Error(`Não consegui limpar o emulador (HTTP ${resposta.status}).`);
    }
  }
}

/**
 * Confirma o email da conta **no emulador**, pelo endpoint de administração dele (é o que o
 * `Authorization: Bearer owner` significa ali).
 *
 * Os testes de dados criam contas pelo caminho da app e a seguir usam-nas como se fossem pessoas
 * a sério — e uma pessoa a sério, na app, tem o email confirmado (ver a regra `isVerified()` em
 * firestore.rules). Sem este passo, tudo o que estes testes exercitam seria recusado pelas regras,
 * e a suite estaria a falhar por uma razão que não é a que diz testar.
 *
 * O que **não** se faz aqui é confirmar no caminho da app (abrir o link): isso é o que o ecrã da
 * confirmação faz e o que os testes de componente fixam. Aqui interessa o estado, não o percurso.
 */
async function confirmarEmailNoEmulador(uid: string): Promise<void> {
  const resposta = await fetch(
    `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:update?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ localId: uid, emailVerified: true }),
    },
  );

  if (!resposta.ok) {
    throw new Error(`Não consegui confirmar o email no emulador (HTTP ${resposta.status}).`);
  }
}

/** Cria a conta pelo caminho da app (signUp) e devolve o UID. Fica com essa conta com sessão. */
export async function criarConta(email: string): Promise<string> {
  await signOut(auth).catch(() => undefined);
  await signUp(email, SENHA_DE_TESTE, false);

  const user = auth.currentUser;
  if (!user) throw new Error('O signUp não deixou nenhum utilizador com sessão.');

  await confirmarEmailNoEmulador(user.uid);
  // O token que está em uso foi emitido **antes** desta confirmação: sem o renovar, o pedido
  // seguinte levava `email_verified: false` e as regras recusavam-no — um erro que apareceria
  // longe daqui, no teste que estivesse a correr a seguir.
  await user.getIdToken(true);

  return user.uid;
}

/** Entra com uma conta já criada. */
export async function entrarComo(email: string): Promise<string> {
  await signOut(auth).catch(() => undefined);
  const credencial = await signInWithEmailAndPassword(auth, email, SENHA_DE_TESTE);
  return credencial.user.uid;
}

/** Completa o perfil pelo caminho da app, com valores por omissão para o que não interessar. */
export async function configurarPerfil(uid: string, dados: Partial<ProfileSetupData> = {}): Promise<void> {
  await completeProfileSetup(uid, {
    fullName: 'Pessoa de Teste',
    about: 'Perfil criado pelos testes.',
    learningSubjects: [],
    teachingSubjects: [],
    availabilityPeriods: [],
    availabilityModality: [],
    ...dados,
  });
}

/** Lê um documento como o utilizador com sessão — ou seja, sujeito às regras. */
export async function lerDocumento(caminho: string): Promise<Record<string, unknown> | null> {
  const snapshot = await getDoc(doc(db, caminho));
  return snapshot.exists() ? (snapshot.data() as Record<string, unknown>) : null;
}

/** Espera pela primeira emissão de uma subscrição que cumpra uma condição. */
export function esperarPor<T>(
  subscrever: (emitir: (valor: T) => void) => () => void,
  cumpre: (valor: T) => boolean,
  descricao: string,
  timeoutMs = 8_000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let cancelar: (() => void) | null = null;

    const temporizador = setTimeout(() => {
      cancelar?.();
      reject(new Error(`Sem resultado à espera de: ${descricao}`));
    }, timeoutMs);

    cancelar = subscrever((valor) => {
      if (!cumpre(valor)) return;
      clearTimeout(temporizador);
      cancelar?.();
      resolve(valor);
    });
  });
}

export interface Cenario {
  /** Aluna que só aprende. */
  ana: string;
  /** Aluno que ensina (mentor). */
  bruno: string;
  /** Professora (tutor). */
  carla: string;
  /** Outro aluno que só aprende, para cenários de terceiro. */
  diogo: string;
}

/** Emuladores limpos e quatro contas com perfil, cada uma no papel que o domínio do email dita. */
export async function criarCenario(): Promise<Cenario> {
  await limparEmulador();

  const ana = await criarConta(CONTAS.aluna);
  await configurarPerfil(ana, {
    fullName: 'Ana Aluna',
    participationMode: 'learn',
    learningSubjects: ['Matemática'],
    availabilityModality: ['Online'],
  });

  const bruno = await criarConta(CONTAS.alunoQueEnsina);
  await configurarPerfil(bruno, {
    fullName: 'Bruno Aluno',
    participationMode: 'teach',
    teachingSubjects: ['Matemática'],
    availabilityPeriods: ['Tardes'],
    availabilityModality: ['Online'],
  });

  const carla = await criarConta(CONTAS.professora);
  await configurarPerfil(carla, {
    fullName: 'Carla Professora',
    participationMode: 'teach',
    teachingSubjects: ['Física'],
  });

  const diogo = await criarConta(CONTAS.intruso);
  await configurarPerfil(diogo, {
    fullName: 'Diogo Aluno',
    participationMode: 'learn',
    learningSubjects: ['Física'],
  });

  return { ana, bruno, carla, diogo };
}
