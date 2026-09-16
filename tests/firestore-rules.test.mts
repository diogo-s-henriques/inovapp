/**
 * Testes das regras de segurança do Firestore (firestore.rules).
 *
 * Correm contra o emulador do Firestore, com o mesmo ficheiro de regras que é publicado em
 * produção, e verificam as invariantes de autorização da app: quem pode ler o quê, quem pode
 * aceitar o quê, o que é exigido por trás da criação de uma sessão e o que garante o anonimato
 * das avaliações.
 *
 * Como correr (o emulador do Firestore é um processo Java, por isso é preciso ter Java instalado):
 *   npm run test:rules
 * O script arranca o emulador, corre estes testes e desliga-o no fim.
 */
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const PROJECT_ID = 'inovapp-68021';
const EMULATOR_HOST = '127.0.0.1';
const EMULATOR_PORT = 8080;

// Contas usadas nos cenários. O papel de cada uma deriva sempre do domínio do email, como na app.
const ALUNO = { uid: 'alunoA', email: 'aluno.a@alunos.iseclisboa.pt' };
const ALUNO_B = { uid: 'alunoB', email: 'aluno.b@alunos.iseclisboa.pt' };
const PROFESSOR = { uid: 'professorA', email: 'professor.a@iseclisboa.pt' };

const CONNECTION_ID = `${ALUNO.uid}_${PROFESSOR.uid}`;
const CONVERSATION_ID = [ALUNO.uid, PROFESSOR.uid].sort().join('_');

let testEnv: RulesTestEnvironment;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
      host: EMULATOR_HOST,
      port: EMULATOR_PORT,
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

/**
 * Firestore de um utilizador com sessão iniciada, com o email no token (é dele que as regras
 * derivam o papel) e o email **já confirmado** - que é o estado normal de quem usa a app.
 *
 * O `email_verified` é o que a regra `isVerified()` lê (ver "email por confirmar" mais abaixo):
 * sem ele no token, quase tudo o que os testes deste ficheiro exercitam seria recusado, e a
 * suite deixava de estar a testar o que diz testar.
 */
function dbAs(user: { uid: string; email: string }) {
  return dbWith(user, true);
}

/**
 * O mesmo, mas com o email **por confirmar**: alguém que se registou e ainda não abriu o link
 * (ou que se registou com o email de outra pessoa).
 */
function dbAsUnverified(user: { uid: string; email: string }) {
  return dbWith(user, false);
}

function dbWith(user: { uid: string; email: string }, emailVerified: boolean) {
  return testEnv.authenticatedContext(user.uid, { email: user.email, email_verified: emailVerified }).firestore();
}

function dbAnonimo() {
  return testEnv.unauthenticatedContext().firestore();
}

/** Escreve um documento ignorando as regras - serve só para montar o cenário que já existiria
 * quando a ação testada acontece. */
async function seed(path: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data);
  });
}

/** Cenário base: pedido de conexão aceite entre o aluno e o professor. */
function seedAcceptedConnection() {
  return seed(`connectionRequests/${CONNECTION_ID}`, {
    from: ALUNO.uid,
    to: PROFESSOR.uid,
    status: 'accepted',
  });
}

/** Sessão agendada, com o pedido de sessão que a originou. Devolve o ID do pedido. */
async function seedPendingSessionRequest(id = 'pedidoSessao1') {
  await seed(`sessionRequests/${id}`, {
    from: ALUNO.uid,
    to: PROFESSOR.uid,
    subject: 'Matemática',
    date: '2099-01-01',
    time: '10:00',
    modality: 'Online',
    message: '',
    status: 'pending',
  });
  return id;
}

function sessionData(sessionRequestId: string) {
  return {
    participants: [ALUNO.uid, PROFESSOR.uid].sort(),
    studentUid: ALUNO.uid,
    mentorUid: PROFESSOR.uid,
    sessionRequestId,
    subject: 'Matemática',
    date: '2099-01-01',
    time: '10:00',
    modality: 'Online',
    status: 'scheduled',
  };
}

/**
 * A política transversal da confirmação do email. Está aqui, e não dentro do bloco de uma coleção,
 * porque não é uma regra de nenhuma coleção: é sobre o **token**.
 *
 * O que se fixa: quem não confirmou o email não lê nem escreve nada - com duas exceções contadas
 * (o seu próprio documento e o `userAccounts` da entrada), que existem para a app conseguir
 * arrancar e mostrar o ecrã que explica o que falta. E a exceção do `create` em `users` está
 * fechada à forma exata que o registo escreve: é esta restrição que impede o caso que a
 * confirmação existe para travar - registar-se com o email de outra pessoa e escrever logo um
 * perfil completo em nome dela.
 */
describe('email por confirmar - o que um token sem `email_verified` pode e não pode', () => {
  it('NÃO lê o perfil de outra pessoa', async () => {
    await seed(`users/${PROFESSOR.uid}`, { role: 'professor', profileCompleted: true });
    await assertFails(getDoc(doc(dbAsUnverified(ALUNO), 'users', PROFESSOR.uid)));
  });

  it('NÃO cria um pedido de conexão', async () => {
    await assertFails(
      setDoc(doc(dbAsUnverified(ALUNO), 'connectionRequests', CONNECTION_ID), {
        from: ALUNO.uid,
        to: PROFESSOR.uid,
        status: 'pending',
      }),
    );
  });

  it('NÃO lê a conversa em que participa nem escreve nela', async () => {
    await seed(`conversations/${CONVERSATION_ID}`, { participants: [ALUNO.uid, PROFESSOR.uid].sort() });
    const db = dbAsUnverified(ALUNO);

    await assertFails(getDoc(doc(db, 'conversations', CONVERSATION_ID)));
    await assertFails(
      addDoc(collection(db, 'conversations', CONVERSATION_ID, 'messages'), {
        text: 'Olá',
        senderId: ALUNO.uid,
        createdAt: 1,
      }),
    );
  });

  it('NÃO edita o próprio perfil', async () => {
    // Por confirmar, o perfil fica como o registo o deixou - vazio. Sem isto, quem se registasse
    // com o email de outra pessoa escrevia o nome dela aqui assim que quisesse.
    await seed(`users/${ALUNO.uid}`, { role: 'student', profileCompleted: false });
    await assertFails(
      updateDoc(doc(dbAsUnverified(ALUNO), 'users', ALUNO.uid), {
        fullName: 'Nome de Outra Pessoa',
        profileCompleted: true,
      }),
    );
  });

  it('NÃO cria um perfil completo em nome de outra pessoa', async () => {
    await assertFails(
      setDoc(doc(dbAsUnverified(ALUNO), 'users', ALUNO.uid), {
        role: 'student',
        profileCompleted: true,
        fullName: 'Nome de Outra Pessoa',
      }),
    );
  });

  it('pode criar o seu perfil tal como o registo o escreve', async () => {
    await assertSucceeds(
      setDoc(doc(dbAsUnverified(ALUNO), 'users', ALUNO.uid), {
        role: 'student',
        profileCompleted: false,
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('pode ler o seu próprio perfil - é o que faz a app parar no ecrã da confirmação', async () => {
    await seed(`users/${ALUNO.uid}`, { role: 'student', profileCompleted: false });
    await assertSucceeds(getDoc(doc(dbAsUnverified(ALUNO), 'users', ALUNO.uid)));
  });

  it('pode entrar: escreve a última entrada em userAccounts', async () => {
    await assertSucceeds(
      setDoc(doc(dbAsUnverified(ALUNO), 'userAccounts', ALUNO.uid), {
        email: ALUNO.email,
        role: 'student',
        lastLoginAt: serverTimestamp(),
        rememberSession: false,
      }),
    );
  });
});

describe('users - o perfil é público dentro da comunidade, mas não se forja o papel', () => {
  it('o aluno cria o próprio perfil como student', async () => {
    const db = dbAs(ALUNO);
    await assertSucceeds(
      setDoc(doc(db, 'users', ALUNO.uid), { role: 'student', profileCompleted: false }),
    );
  });

  it('o professor cria o próprio perfil como professor', async () => {
    const db = dbAs(PROFESSOR);
    await assertSucceeds(
      setDoc(doc(db, 'users', PROFESSOR.uid), { role: 'professor', profileCompleted: false }),
    );
  });

  it('o aluno NÃO se consegue criar com role de professor', async () => {
    const db = dbAs(ALUNO);
    await assertFails(
      setDoc(doc(db, 'users', ALUNO.uid), { role: 'professor', profileCompleted: false }),
    );
  });

  it('o professor NÃO se consegue criar com role de student', async () => {
    const db = dbAs(PROFESSOR);
    await assertFails(
      setDoc(doc(db, 'users', PROFESSOR.uid), { role: 'student', profileCompleted: false }),
    );
  });

  it('nenhum campo privado da conta pode ser criado no perfil', async () => {
    const db = dbAs(ALUNO);
    for (const campo of ['email', 'lastLoginAt', 'rememberSession']) {
      await assertFails(
        setDoc(doc(db, 'users', ALUNO.uid), { role: 'student', [campo]: 'x' }),
      );
    }
  });

  it('o perfil é legível por outro utilizador autenticado (pesquisa e matches dependem disso)', async () => {
    await seed(`users/${ALUNO.uid}`, { role: 'student', fullName: 'Aluno A' });
    await assertSucceeds(getDoc(doc(dbAs(ALUNO_B), 'users', ALUNO.uid)));
  });

  it('o perfil NÃO é legível sem sessão iniciada', async () => {
    await seed(`users/${ALUNO.uid}`, { role: 'student' });
    await assertFails(getDoc(doc(dbAnonimo(), 'users', ALUNO.uid)));
  });

  it('ninguém escreve no perfil de outra pessoa', async () => {
    await seed(`users/${ALUNO.uid}`, { role: 'student' });
    await assertFails(updateDoc(doc(dbAs(ALUNO_B), 'users', ALUNO.uid), { fullName: 'Invadido' }));
  });

  it('o próprio atualiza o perfil sem mexer no papel', async () => {
    await seed(`users/${ALUNO.uid}`, { role: 'student', fullName: 'Nome antigo' });
    await assertSucceeds(
      updateDoc(doc(dbAs(ALUNO), 'users', ALUNO.uid), { fullName: 'Nome novo', profileCompleted: true }),
    );
  });

  it('o próprio NÃO muda o papel depois de criado', async () => {
    await seed(`users/${ALUNO.uid}`, { role: 'student' });
    await assertFails(updateDoc(doc(dbAs(ALUNO), 'users', ALUNO.uid), { role: 'professor' }));
  });

  it('não se consegue injetar um campo privado novo no perfil', async () => {
    await seed(`users/${ALUNO.uid}`, { role: 'student' });
    await assertFails(
      updateDoc(doc(dbAs(ALUNO), 'users', ALUNO.uid), { email: 'outro@alunos.iseclisboa.pt' }),
    );
  });

  it('um perfil antigo, com campos privados dentro, continua a poder ser editado', async () => {
    // Tolerância deliberada das regras: as contas criadas antes da separação userAccounts ainda
    // têm estes campos em `users`, e não podem ficar sem conseguir editar o perfil. A limpeza
    // acontece no login seguinte (ver src/auth/actions.ts).
    await seed(`users/${ALUNO.uid}`, { role: 'student', email: ALUNO.email, lastLoginAt: 1 });
    await assertSucceeds(updateDoc(doc(dbAs(ALUNO), 'users', ALUNO.uid), { fullName: 'Nome novo' }));
  });

  it('mas um campo privado antigo nunca pode ser alterado', async () => {
    await seed(`users/${ALUNO.uid}`, { role: 'student', email: ALUNO.email });
    await assertFails(
      updateDoc(doc(dbAs(ALUNO), 'users', ALUNO.uid), { email: 'outro@alunos.iseclisboa.pt' }),
    );
  });

  it('o próprio consegue remover os campos privados antigos (a migração do login)', async () => {
    await seed(`users/${ALUNO.uid}`, { role: 'student', email: ALUNO.email, lastLoginAt: 1 });
    await assertSucceeds(
      updateDoc(doc(dbAs(ALUNO), 'users', ALUNO.uid), {
        email: deleteField(),
        lastLoginAt: deleteField(),
      }),
    );
  });
});

describe('users/devices - o token dos avisos é privado (não vive no perfil)', () => {
  const DEVICE = 'dispositivo1';

  const registration = (uid: string) => ({
    userId: uid,
    token: 'ExponentPushToken[abc]',
    platform: 'android',
    updatedAt: 1,
  });

  it('o próprio regista o seu dispositivo', async () => {
    await assertSucceeds(
      setDoc(doc(dbAs(ALUNO), 'users', ALUNO.uid, 'devices', DEVICE), registration(ALUNO.uid)),
    );
  });

  it('o próprio lê e apaga o registo do seu dispositivo', async () => {
    await seed(`users/${ALUNO.uid}/devices/${DEVICE}`, registration(ALUNO.uid));
    const db = dbAs(ALUNO);

    await assertSucceeds(getDoc(doc(db, 'users', ALUNO.uid, 'devices', DEVICE)));
    await assertSucceeds(deleteDoc(doc(db, 'users', ALUNO.uid, 'devices', DEVICE)));
  });

  it('NENHUM outro utilizador autenticado lê o registo alheio', async () => {
    // É a razão de ser deste sítio: com o token de outra pessoa qualquer conta podia mandar-lhe
    // avisos em nome da app. Se isto passar a ser legível (por exemplo, movendo o token para
    // `users/{uid}`, que é público), a app fica com um canal de spam aberto.
    await seed(`users/${ALUNO.uid}/devices/${DEVICE}`, registration(ALUNO.uid));
    await assertFails(getDoc(doc(dbAs(PROFESSOR), 'users', ALUNO.uid, 'devices', DEVICE)));
  });

  it('ninguém escreve no registo de outra pessoa', async () => {
    await assertFails(
      setDoc(doc(dbAs(PROFESSOR), 'users', ALUNO.uid, 'devices', DEVICE), registration(ALUNO.uid)),
    );
  });

  it('NÃO se lê sem sessão iniciada', async () => {
    await seed(`users/${ALUNO.uid}/devices/${DEVICE}`, registration(ALUNO.uid));
    await assertFails(getDoc(doc(dbAnonimo(), 'users', ALUNO.uid, 'devices', DEVICE)));
  });

  it('NÃO se regista um dispositivo com o uid de outra pessoa', async () => {
    await assertFails(
      setDoc(doc(dbAs(ALUNO), 'users', ALUNO.uid, 'devices', DEVICE), registration(PROFESSOR.uid)),
    );
  });

  it('NÃO se regista uma plataforma que não existe', async () => {
    await assertFails(
      setDoc(doc(dbAs(ALUNO), 'users', ALUNO.uid, 'devices', DEVICE), {
        ...registration(ALUNO.uid),
        platform: 'windows',
      }),
    );
  });

  it('NÃO se regista um token vazio', async () => {
    await assertFails(
      setDoc(doc(dbAs(ALUNO), 'users', ALUNO.uid, 'devices', DEVICE), {
        ...registration(ALUNO.uid),
        token: '',
      }),
    );
  });
});

describe('userAccounts - os dados privados da conta são só do próprio', () => {
  it('o próprio lê os seus dados de conta', async () => {
    await seed(`userAccounts/${ALUNO.uid}`, { email: ALUNO.email, role: 'student' });
    await assertSucceeds(getDoc(doc(dbAs(ALUNO), 'userAccounts', ALUNO.uid)));
  });

  it('outro utilizador autenticado NÃO lê os dados de conta alheios', async () => {
    await seed(`userAccounts/${ALUNO.uid}`, { email: ALUNO.email, role: 'student' });
    await assertFails(getDoc(doc(dbAs(ALUNO_B), 'userAccounts', ALUNO.uid)));
  });

  it('NÃO se lê sem sessão iniciada', async () => {
    await seed(`userAccounts/${ALUNO.uid}`, { email: ALUNO.email, role: 'student' });
    await assertFails(getDoc(doc(dbAnonimo(), 'userAccounts', ALUNO.uid)));
  });

  it('o próprio cria os seus dados de conta com o email do token', async () => {
    const db = dbAs(ALUNO);
    await assertSucceeds(
      setDoc(doc(db, 'userAccounts', ALUNO.uid), {
        email: ALUNO.email,
        role: 'student',
        lastLoginAt: 1,
        rememberSession: false,
      }),
    );
  });

  it('NÃO se cria com o email de outra pessoa', async () => {
    const db = dbAs(ALUNO);
    await assertFails(
      setDoc(doc(db, 'userAccounts', ALUNO.uid), { email: ALUNO_B.email, role: 'student' }),
    );
  });

  it('NÃO se cria com um papel que não bate com o domínio do email', async () => {
    const db = dbAs(ALUNO);
    await assertFails(
      setDoc(doc(db, 'userAccounts', ALUNO.uid), { email: ALUNO.email, role: 'professor' }),
    );
  });

  it('o próprio atualiza a última entrada e o "lembrar sessão"', async () => {
    await seed(`userAccounts/${ALUNO.uid}`, { email: ALUNO.email, role: 'student', lastLoginAt: 1 });
    await assertSucceeds(
      updateDoc(doc(dbAs(ALUNO), 'userAccounts', ALUNO.uid), { lastLoginAt: 2, rememberSession: true }),
    );
  });

  it('NÃO se troca o email de uma conta já criada', async () => {
    await seed(`userAccounts/${ALUNO.uid}`, { email: ALUNO.email, role: 'student' });
    await assertFails(
      updateDoc(doc(dbAs(ALUNO), 'userAccounts', ALUNO.uid), { email: ALUNO_B.email }),
    );
  });

  // O dono pode apagá-los (é o primeiro passo de apagar a conta - ver "apagar a própria conta"
  // mais abaixo). O que continua fechado é apagá-los a outra pessoa.
  it('NÃO se apagam os dados de conta de outra pessoa', async () => {
    await seed(`userAccounts/${PROFESSOR.uid}`, { email: PROFESSOR.email, role: 'professor' });
    await assertFails(deleteDoc(doc(dbAs(ALUNO), 'userAccounts', PROFESSOR.uid)));
  });
});

describe('connectionRequests - só o tutorando inicia, só o destinatário responde', () => {
  function requestData(from: string, to: string, status = 'pending') {
    return { from, to, status };
  }

  it('o aluno cria o pedido de conexão para o professor', async () => {
    const db = dbAs(ALUNO);
    await assertSucceeds(
      setDoc(doc(db, 'connectionRequests', CONNECTION_ID), requestData(ALUNO.uid, PROFESSOR.uid)),
    );
  });

  it('NÃO se cria um pedido em nome de outra pessoa', async () => {
    const db = dbAs(ALUNO);
    await assertFails(
      setDoc(doc(db, 'connectionRequests', CONNECTION_ID), requestData(ALUNO_B.uid, PROFESSOR.uid)),
    );
  });

  it('NÃO se cria um pedido para si próprio', async () => {
    const db = dbAs(ALUNO);
    await assertFails(
      setDoc(doc(db, 'connectionRequests', `${ALUNO.uid}_${ALUNO.uid}`), requestData(ALUNO.uid, ALUNO.uid)),
    );
  });

  it('NÃO se cria um pedido com um ID que não seja from_to', async () => {
    const db = dbAs(ALUNO);
    await assertFails(
      setDoc(doc(db, 'connectionRequests', 'id-inventado'), requestData(ALUNO.uid, PROFESSOR.uid)),
    );
  });

  it('NÃO se cria um pedido já aceite (tem de nascer pendente)', async () => {
    await seedAcceptedConnection();
    const db = dbAs(ALUNO);
    await assertFails(
      setDoc(
        doc(db, 'connectionRequests', `${ALUNO.uid}_${ALUNO_B.uid}`),
        requestData(ALUNO.uid, ALUNO_B.uid, 'accepted'),
      ),
    );
  });

  it('o destinatário aceita o pedido', async () => {
    await seed(`connectionRequests/${CONNECTION_ID}`, requestData(ALUNO.uid, PROFESSOR.uid));
    await assertSucceeds(
      updateDoc(doc(dbAs(PROFESSOR), 'connectionRequests', CONNECTION_ID), { status: 'accepted' }),
    );
  });

  it('o destinatário recusa o pedido', async () => {
    await seed(`connectionRequests/${CONNECTION_ID}`, requestData(ALUNO.uid, PROFESSOR.uid));
    await assertSucceeds(
      updateDoc(doc(dbAs(PROFESSOR), 'connectionRequests', CONNECTION_ID), { status: 'declined' }),
    );
  });

  it('quem enviou o pedido NÃO o aceita a si próprio', async () => {
    await seed(`connectionRequests/${CONNECTION_ID}`, requestData(ALUNO.uid, PROFESSOR.uid));
    await assertFails(
      updateDoc(doc(dbAs(ALUNO), 'connectionRequests', CONNECTION_ID), { status: 'accepted' }),
    );
  });

  it('um terceiro NÃO aceita o pedido de outros dois', async () => {
    await seed(`connectionRequests/${CONNECTION_ID}`, requestData(ALUNO.uid, PROFESSOR.uid));
    await assertFails(
      updateDoc(doc(dbAs(ALUNO_B), 'connectionRequests', CONNECTION_ID), { status: 'accepted' }),
    );
  });

  it('um pedido já respondido NÃO volta a ser respondido', async () => {
    await seed(`connectionRequests/${CONNECTION_ID}`, requestData(ALUNO.uid, PROFESSOR.uid, 'declined'));
    await assertFails(
      updateDoc(doc(dbAs(PROFESSOR), 'connectionRequests', CONNECTION_ID), { status: 'accepted' }),
    );
  });

  it('um terceiro NÃO lê o pedido', async () => {
    await seed(`connectionRequests/${CONNECTION_ID}`, requestData(ALUNO.uid, PROFESSOR.uid));
    await assertFails(getDoc(doc(dbAs(ALUNO_B), 'connectionRequests', CONNECTION_ID)));
  });

  it('os dois envolvidos leem o pedido', async () => {
    await seed(`connectionRequests/${CONNECTION_ID}`, requestData(ALUNO.uid, PROFESSOR.uid));
    await assertSucceeds(getDoc(doc(dbAs(ALUNO), 'connectionRequests', CONNECTION_ID)));
    await assertSucceeds(getDoc(doc(dbAs(PROFESSOR), 'connectionRequests', CONNECTION_ID)));
  });

  // Os dois envolvidos levam o pedido quando apagam a conta (ver "apagar a própria conta" mais
  // abaixo); quem não é um deles não lhe toca.
  it('um terceiro não apaga o pedido de conexão', async () => {
    await seed(`connectionRequests/${CONNECTION_ID}`, requestData(ALUNO.uid, PROFESSOR.uid));
    await assertFails(deleteDoc(doc(dbAs(ALUNO_B), 'connectionRequests', CONNECTION_ID)));
  });
});

describe('sessionRequests - só entre duas pessoas já ligadas', () => {
  function requestData(from: string, to: string) {
    return {
      from,
      to,
      subject: 'Matemática',
      date: '2099-01-01',
      time: '10:00',
      modality: 'Online',
      message: '',
      status: 'pending',
    };
  }

  it('o aluno pede sessão ao professor, com uma ligação já aceite', async () => {
    await seedAcceptedConnection();
    const db = dbAs(ALUNO);
    await assertSucceeds(addDoc(collection(db, 'sessionRequests'), requestData(ALUNO.uid, PROFESSOR.uid)));
  });

  it('o professor também pode pedir sessão ao aluno (sentido inverso)', async () => {
    await seedAcceptedConnection();
    const db = dbAs(PROFESSOR);
    await assertSucceeds(addDoc(collection(db, 'sessionRequests'), requestData(PROFESSOR.uid, ALUNO.uid)));
  });

  it('NÃO se pede sessão sem ligação nenhuma', async () => {
    const db = dbAs(ALUNO);
    await assertFails(addDoc(collection(db, 'sessionRequests'), requestData(ALUNO.uid, ALUNO_B.uid)));
  });

  it('NÃO se pede sessão com a ligação apenas pendente (tem de estar aceite)', async () => {
    await seed(`connectionRequests/${CONNECTION_ID}`, {
      from: ALUNO.uid,
      to: PROFESSOR.uid,
      status: 'pending',
    });
    const db = dbAs(ALUNO);
    await assertFails(addDoc(collection(db, 'sessionRequests'), requestData(ALUNO.uid, PROFESSOR.uid)));
  });

  it('NÃO se pede sessão em nome de outra pessoa', async () => {
    await seedAcceptedConnection();
    const db = dbAs(ALUNO);
    await assertFails(addDoc(collection(db, 'sessionRequests'), requestData(ALUNO_B.uid, PROFESSOR.uid)));
  });

  it('o destinatário aceita o pedido de sessão', async () => {
    await seedAcceptedConnection();
    const id = await seedPendingSessionRequest();
    await assertSucceeds(
      updateDoc(doc(dbAs(PROFESSOR), 'sessionRequests', id), { status: 'accepted' }),
    );
  });

  it('quem pediu NÃO aceita o próprio pedido', async () => {
    await seedAcceptedConnection();
    const id = await seedPendingSessionRequest();
    await assertFails(
      updateDoc(doc(dbAs(ALUNO), 'sessionRequests', id), { status: 'accepted' }),
    );
  });
});

describe('sessions - nasce do pedido aceite e só o mentor a termina', () => {
  it('o mentor cria a sessão a partir de um pedido pendente', async () => {
    await seedAcceptedConnection();
    const requestId = await seedPendingSessionRequest();
    const db = dbAs(PROFESSOR);
    await assertSucceeds(addDoc(collection(db, 'sessions'), sessionData(requestId)));
  });

  it('quem pediu a sessão NÃO a cria', async () => {
    await seedAcceptedConnection();
    const requestId = await seedPendingSessionRequest();
    const db = dbAs(ALUNO);
    await assertFails(addDoc(collection(db, 'sessions'), sessionData(requestId)));
  });

  it('NÃO se cria sessão sem pedido de sessão por trás', async () => {
    await seedAcceptedConnection();
    const db = dbAs(PROFESSOR);
    await assertFails(addDoc(collection(db, 'sessions'), sessionData('pedido-que-nao-existe')));
  });

  it('NÃO se cria sessão com um pedido de outro par de utilizadores', async () => {
    await seedAcceptedConnection();
    await seed('sessionRequests/outroPedido', {
      from: ALUNO_B.uid,
      to: PROFESSOR.uid,
      subject: 'Física',
      date: '2099-01-01',
      time: '10:00',
      modality: 'Online',
      message: '',
      status: 'pending',
    });
    const db = dbAs(PROFESSOR);
    await assertFails(
      addDoc(collection(db, 'sessions'), { ...sessionData('outroPedido'), studentUid: ALUNO.uid }),
    );
  });

  it('NÃO se cria sessão com um pedido já respondido', async () => {
    await seedAcceptedConnection();
    const requestId = await seedPendingSessionRequest();
    await seed(`sessionRequests/${requestId}`, {
      from: ALUNO.uid,
      to: PROFESSOR.uid,
      subject: 'Matemática',
      date: '2099-01-01',
      time: '10:00',
      modality: 'Online',
      message: '',
      status: 'accepted',
    });
    const db = dbAs(PROFESSOR);
    await assertFails(addDoc(collection(db, 'sessions'), sessionData(requestId)));
  });

  it('NÃO se cria sessão com participantes que não sejam os do pedido', async () => {
    await seedAcceptedConnection();
    const requestId = await seedPendingSessionRequest();
    const db = dbAs(PROFESSOR);
    await assertFails(
      addDoc(collection(db, 'sessions'), {
        ...sessionData(requestId),
        participants: [ALUNO_B.uid, PROFESSOR.uid],
      }),
    );
  });

  it('o mentor termina a sessão', async () => {
    await seed('sessions/sessao1', sessionData('pedidoSessao1'));
    await assertSucceeds(
      updateDoc(doc(dbAs(PROFESSOR), 'sessions', 'sessao1'), { status: 'completed', completedAt: 1 }),
    );
  });

  it('quem é tutorando NÃO termina a sessão', async () => {
    await seed('sessions/sessao1', sessionData('pedidoSessao1'));
    await assertFails(
      updateDoc(doc(dbAs(ALUNO), 'sessions', 'sessao1'), { status: 'completed', completedAt: 1 }),
    );
  });

  it('um terceiro NÃO termina a sessão', async () => {
    await seed('sessions/sessao1', sessionData('pedidoSessao1'));
    await assertFails(
      updateDoc(doc(dbAs(ALUNO_B), 'sessions', 'sessao1'), { status: 'completed', completedAt: 1 }),
    );
  });

  it('NÃO se reabre uma sessão já concluída', async () => {
    await seed('sessions/sessao1', { ...sessionData('pedidoSessao1'), status: 'completed' });
    await assertFails(
      updateDoc(doc(dbAs(PROFESSOR), 'sessions', 'sessao1'), { status: 'scheduled' }),
    );
  });

  it('não se altera mais nada além do estado ao terminar', async () => {
    await seed('sessions/sessao1', sessionData('pedidoSessao1'));
    await assertFails(
      updateDoc(doc(dbAs(PROFESSOR), 'sessions', 'sessao1'), { status: 'completed', subject: 'Outra' }),
    );
  });

  it('os participantes leem a sessão, um terceiro não', async () => {
    await seed('sessions/sessao1', sessionData('pedidoSessao1'));
    await assertSucceeds(getDoc(doc(dbAs(ALUNO), 'sessions', 'sessao1')));
    await assertSucceeds(getDoc(doc(dbAs(PROFESSOR), 'sessions', 'sessao1')));
    await assertFails(getDoc(doc(dbAs(ALUNO_B), 'sessions', 'sessao1')));
  });
});

describe('conversations - só existem depois de a conexão ser aceite', () => {
  it('a conversa nasce de um pedido de conexão pendente dirigido a quem a cria', async () => {
    await seed(`connectionRequests/${CONNECTION_ID}`, {
      from: ALUNO.uid,
      to: PROFESSOR.uid,
      status: 'pending',
    });
    const db = dbAs(PROFESSOR);
    await assertSucceeds(
      setDoc(doc(db, 'conversations', CONVERSATION_ID), {
        participants: [ALUNO.uid, PROFESSOR.uid].sort(),
      }),
    );
  });

  it('NÃO se cria conversa sem pedido de conexão nenhum', async () => {
    const db = dbAs(PROFESSOR);
    await assertFails(
      setDoc(doc(db, 'conversations', CONVERSATION_ID), {
        participants: [ALUNO.uid, PROFESSOR.uid].sort(),
      }),
    );
  });

  it('NÃO se cria uma conversa em que não participo', async () => {
    await seed(`connectionRequests/${CONNECTION_ID}`, {
      from: ALUNO.uid,
      to: PROFESSOR.uid,
      status: 'pending',
    });
    const db = dbAs(ALUNO_B);
    await assertFails(
      setDoc(doc(db, 'conversations', CONVERSATION_ID), {
        participants: [ALUNO.uid, PROFESSOR.uid].sort(),
      }),
    );
  });

  it('o terceiro NÃO lê a conversa entre outros dois', async () => {
    await seed(`conversations/${CONVERSATION_ID}`, {
      participants: [ALUNO.uid, PROFESSOR.uid].sort(),
    });
    await assertFails(getDoc(doc(dbAs(ALUNO_B), 'conversations', CONVERSATION_ID)));
  });

  it('um participante escreve uma mensagem em seu nome', async () => {
    await seed(`conversations/${CONVERSATION_ID}`, {
      participants: [ALUNO.uid, PROFESSOR.uid].sort(),
    });
    const db = dbAs(ALUNO);
    await assertSucceeds(
      addDoc(collection(db, 'conversations', CONVERSATION_ID, 'messages'), {
        text: 'Olá',
        senderId: ALUNO.uid,
        createdAt: 1,
      }),
    );
  });

  it('NÃO se escreve uma mensagem em nome de outra pessoa', async () => {
    await seed(`conversations/${CONVERSATION_ID}`, {
      participants: [ALUNO.uid, PROFESSOR.uid].sort(),
    });
    const db = dbAs(ALUNO);
    await assertFails(
      addDoc(collection(db, 'conversations', CONVERSATION_ID, 'messages'), {
        text: 'Não é meu',
        senderId: PROFESSOR.uid,
        createdAt: 1,
      }),
    );
  });

  it('um terceiro NÃO lê nem escreve nas mensagens', async () => {
    await seed(`conversations/${CONVERSATION_ID}`, {
      participants: [ALUNO.uid, PROFESSOR.uid].sort(),
    });
    const db = dbAs(ALUNO_B);
    await assertFails(getDoc(doc(db, 'conversations', CONVERSATION_ID, 'messages', 'm1')));
    await assertFails(
      addDoc(collection(db, 'conversations', CONVERSATION_ID, 'messages'), {
        text: 'Intruso',
        senderId: ALUNO_B.uid,
        createdAt: 1,
      }),
    );
  });
});

describe('blocks - um bloqueio corta a ligação para os dois', () => {
  const BLOCK_ID = `${ALUNO.uid}_${PROFESSOR.uid}`;

  function blockData(blocker: string, blocked: string) {
    return { blocker, blocked };
  }

  it('cada um cria o seu bloqueio', async () => {
    await assertSucceeds(
      setDoc(doc(dbAs(ALUNO), 'blocks', BLOCK_ID), blockData(ALUNO.uid, PROFESSOR.uid)),
    );
  });

  it('NÃO se cria um bloqueio em nome de outra pessoa', async () => {
    await assertFails(setDoc(doc(dbAs(ALUNO), 'blocks', BLOCK_ID), blockData(ALUNO_B.uid, PROFESSOR.uid)));
  });

  it('NÃO se cria um bloqueio sobre si próprio', async () => {
    await assertFails(
      setDoc(doc(dbAs(ALUNO), 'blocks', `${ALUNO.uid}_${ALUNO.uid}`), blockData(ALUNO.uid, ALUNO.uid)),
    );
  });

  it('NÃO se cria um bloqueio com um ID que não seja blocker_blocked', async () => {
    await assertFails(setDoc(doc(dbAs(ALUNO), 'blocks', 'id-inventado'), blockData(ALUNO.uid, PROFESSOR.uid)));
  });

  it('os dois lados leem o bloqueio, e um terceiro não', async () => {
    await seed(`blocks/${BLOCK_ID}`, blockData(ALUNO.uid, PROFESSOR.uid));
    // Quem foi bloqueado também o lê: é o que lhe permite excluir o outro da descoberta.
    await assertSucceeds(getDoc(doc(dbAs(ALUNO), 'blocks', BLOCK_ID)));
    await assertSucceeds(getDoc(doc(dbAs(PROFESSOR), 'blocks', BLOCK_ID)));
    await assertFails(getDoc(doc(dbAs(ALUNO_B), 'blocks', BLOCK_ID)));
  });

  it('só o autor desfaz o bloqueio', async () => {
    await seed(`blocks/${BLOCK_ID}`, blockData(ALUNO.uid, PROFESSOR.uid));
    await assertFails(deleteDoc(doc(dbAs(PROFESSOR), 'blocks', BLOCK_ID)));
    await assertSucceeds(deleteDoc(doc(dbAs(ALUNO), 'blocks', BLOCK_ID)));
  });

  it('impede o pedido de conexão, nos dois sentidos', async () => {
    await seed(`blocks/${BLOCK_ID}`, blockData(ALUNO.uid, PROFESSOR.uid));

    await assertFails(
      setDoc(doc(dbAs(ALUNO), 'connectionRequests', CONNECTION_ID), {
        from: ALUNO.uid,
        to: PROFESSOR.uid,
        status: 'pending',
      }),
    );

    // O sentido contrário prova a simetria: quem foi bloqueado também não consegue pedir.
    const contraId = `${PROFESSOR.uid}_${ALUNO.uid}`;
    await assertFails(
      setDoc(doc(dbAs(PROFESSOR), 'connectionRequests', contraId), {
        from: PROFESSOR.uid,
        to: ALUNO.uid,
        status: 'pending',
      }),
    );
  });

  it('impede aceitar um pedido que ainda estava pendente', async () => {
    await seed(`connectionRequests/${CONNECTION_ID}`, { from: ALUNO.uid, to: PROFESSOR.uid, status: 'pending' });
    await seed(`blocks/${BLOCK_ID}`, blockData(ALUNO.uid, PROFESSOR.uid));

    await assertFails(
      updateDoc(doc(dbAs(PROFESSOR), 'connectionRequests', CONNECTION_ID), { status: 'accepted' }),
    );
  });

  it('impede o pedido de sessão', async () => {
    await seedAcceptedConnection();
    await seed(`blocks/${BLOCK_ID}`, blockData(ALUNO.uid, PROFESSOR.uid));

    await assertFails(
      setDoc(doc(dbAs(ALUNO), 'sessionRequests', 'pedidoBloqueado'), {
        from: ALUNO.uid,
        to: PROFESSOR.uid,
        subject: 'Matemática',
        date: '2099-01-01',
        time: '10:00',
        modality: 'Online',
        message: '',
        status: 'pending',
      }),
    );
  });

  it('torna inacessível a conversa que já existia - para os dois', async () => {
    const participants = [ALUNO.uid, PROFESSOR.uid].sort();
    await seed(`conversations/${CONVERSATION_ID}`, { participants });
    await seed(`conversations/${CONVERSATION_ID}/messages/m1`, { text: 'Olá', senderId: ALUNO.uid });
    await seed(`blocks/${BLOCK_ID}`, blockData(ALUNO.uid, PROFESSOR.uid));

    // O histórico continua na base de dados (nada neste projeto apaga), mas deixa de ser legível.
    await assertFails(getDoc(doc(dbAs(ALUNO), 'conversations', CONVERSATION_ID, 'messages', 'm1')));
    await assertFails(getDoc(doc(dbAs(PROFESSOR), 'conversations', CONVERSATION_ID, 'messages', 'm1')));
    await assertFails(
      addDoc(collection(dbAs(ALUNO), 'conversations', CONVERSATION_ID, 'messages'), {
        text: 'Ainda aqui?',
        senderId: ALUNO.uid,
        createdAt: 1,
      }),
    );
  });
});

describe('ratings - anónimas, uma por sessão, só pelo tutorando', () => {
  async function seedCompletedSession() {
    await seed('sessions/sessao1', { ...sessionData('pedidoSessao1'), status: 'completed' });
  }

  it('o tutorando da sessão avalia', async () => {
    await seedCompletedSession();
    const db = dbAs(ALUNO);
    await assertSucceeds(
      setDoc(doc(db, 'ratings', 'sessao1'), { mentorUid: PROFESSOR.uid, rating: 5, comment: '' }),
    );
  });

  it('o documento guarda só a nota e o mentor - nunca quem avaliou', async () => {
    await seedCompletedSession();
    const db = dbAs(ALUNO);
    await assertSucceeds(
      setDoc(doc(db, 'ratings', 'sessao1'), { mentorUid: PROFESSOR.uid, rating: 4, comment: 'Boa' }),
    );

    let stored: Record<string, unknown> = {};
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const snapshot = await getDoc(doc(context.firestore(), 'ratings', 'sessao1'));
      stored = snapshot.data() ?? {};
    });

    // O anonimato não vem de uma regra de leitura, vem de o documento nunca conter a ligação
    // entre a nota e quem a deu. Se algum dia aparecer aqui um campo assim, este teste cai.
    const camposProibidos = Object.keys(stored).filter(
      (campo) => campo !== 'mentorUid' && campo.toLowerCase().includes('uid'),
    );
    if (camposProibidos.length > 0) {
      throw new Error(`a avaliação guardou quem avaliou: ${camposProibidos.join(', ')}`);
    }
  });

  it('o mentor NÃO avalia a própria sessão', async () => {
    await seedCompletedSession();
    const db = dbAs(PROFESSOR);
    await assertFails(
      setDoc(doc(db, 'ratings', 'sessao1'), { mentorUid: PROFESSOR.uid, rating: 5 }),
    );
  });

  it('um terceiro NÃO avalia a sessão de outros dois', async () => {
    await seedCompletedSession();
    const db = dbAs(ALUNO_B);
    await assertFails(
      setDoc(doc(db, 'ratings', 'sessao1'), { mentorUid: PROFESSOR.uid, rating: 5 }),
    );
  });

  it('NÃO se avalia com um mentorUid que não é o da sessão', async () => {
    await seedCompletedSession();
    const db = dbAs(ALUNO);
    await assertFails(
      setDoc(doc(db, 'ratings', 'sessao1'), { mentorUid: ALUNO_B.uid, rating: 5 }),
    );
  });

  it('NÃO se avalia fora da escala de 1 a 5', async () => {
    await seedCompletedSession();
    const db = dbAs(ALUNO);
    await assertFails(setDoc(doc(db, 'ratings', 'sessao1'), { mentorUid: PROFESSOR.uid, rating: 0 }));
    await assertFails(setDoc(doc(db, 'ratings', 'sessao2'), { mentorUid: PROFESSOR.uid, rating: 6 }));
  });

  it('NÃO se altera nem apaga uma avaliação depois de enviada', async () => {
    await seedCompletedSession();
    await seed('ratings/sessao1', { mentorUid: PROFESSOR.uid, rating: 3 });
    const db = dbAs(ALUNO);
    await assertFails(updateDoc(doc(db, 'ratings', 'sessao1'), { rating: 1 }));
    await assertFails(deleteDoc(doc(db, 'ratings', 'sessao1')));
  });
});

/**
 * Apagar a própria conta (ver src/lib/account.ts).
 *
 * O `delete` era a operação mais fechada do ficheiro - só existia nos bloqueios, e só para o autor -
 * e é agora a que faz um caminho a mais. O que aqui se fixa é o desenho dessa abertura, que é
 * estreito de propósito:
 *
 * 1. **O que é só do próprio** (o perfil, os dados privados da conta, os registos dos avisos) sai
 *    com quem o tem, e não precisa de email confirmado - quem não consegue confirmar o email tem de
 *    conseguir remover a conta que criou.
 * 2. **O que é de dois** (pedidos, sessões, conversas) segue o mesmo critério de sempre
 *    (`isVerified()`), e só o leva quem é uma das duas partes.
 * 3. **O que é de outra pessoa não se toca**: nem o perfil de outro, nem as mensagens que o outro
 *    escreveu, nem as avaliações (que ficam inalcançáveis em vez de apagadas - uma regra que
 *    deixasse apagá-las dava a um mentor a forma de deitar fora as notas más).
 */
describe('apagar a própria conta - o que sai com ela e o que fica', () => {
  it('o dono apaga o próprio perfil e os dados privados da conta', async () => {
    await seed(`users/${ALUNO.uid}`, { role: 'student', profileCompleted: true });
    await seed(`userAccounts/${ALUNO.uid}`, { email: ALUNO.email, role: 'student' });

    const db = dbAs(ALUNO);
    await assertSucceeds(deleteDoc(doc(db, 'users', ALUNO.uid)));
    await assertSucceeds(deleteDoc(doc(db, 'userAccounts', ALUNO.uid)));
  });

  it('o dono apaga os registos de avisos deste telemóvel', async () => {
    await seed(`users/${ALUNO.uid}/devices/telemovel1`, {
      userId: ALUNO.uid,
      token: 'ExponentPushToken[abc]',
      platform: 'ios',
    });

    await assertSucceeds(
      deleteDoc(doc(dbAs(ALUNO), 'users', ALUNO.uid, 'devices', 'telemovel1')),
    );
  });

  it('NÃO se apaga o perfil de outra pessoa', async () => {
    await seed(`users/${PROFESSOR.uid}`, { role: 'professor', profileCompleted: true });
    await assertFails(deleteDoc(doc(dbAs(ALUNO), 'users', PROFESSOR.uid)));
  });

  it('NÃO se apagam os dados privados de outra conta', async () => {
    await seed(`userAccounts/${PROFESSOR.uid}`, { email: PROFESSOR.email, role: 'professor' });
    await assertFails(deleteDoc(doc(dbAs(ALUNO), 'userAccounts', PROFESSOR.uid)));
  });

  it('NÃO se apaga o registo de avisos de outro telemóvel', async () => {
    await seed(`users/${PROFESSOR.uid}/devices/telemovel1`, {
      userId: PROFESSOR.uid,
      token: 'ExponentPushToken[abc]',
      platform: 'ios',
    });

    await assertFails(deleteDoc(doc(dbAs(ALUNO), 'users', PROFESSOR.uid, 'devices', 'telemovel1')));
  });

  it('sem o email confirmado, ainda se apaga o próprio perfil', async () => {
    // A exceção é deliberada: quem se registou com um email institucional que não consegue
    // confirmar (perdeu o acesso à caixa, por exemplo) tem de poder remover a conta que criou -
    // senão fica com uma conta que não usa e não consegue apagar.
    await seed(`users/${ALUNO.uid}`, { role: 'student', profileCompleted: false });
    await seed(`userAccounts/${ALUNO.uid}`, { email: ALUNO.email, role: 'student' });

    const db = dbAsUnverified(ALUNO);
    await assertSucceeds(deleteDoc(doc(db, 'users', ALUNO.uid)));
    await assertSucceeds(deleteDoc(doc(db, 'userAccounts', ALUNO.uid)));
  });

  it('sem o email confirmado, NÃO se apaga o que é de dois', async () => {
    await seed(`connectionRequests/${CONNECTION_ID}`, {
      from: ALUNO.uid,
      to: PROFESSOR.uid,
      status: 'accepted',
    });

    await assertFails(deleteDoc(doc(dbAsUnverified(ALUNO), 'connectionRequests', CONNECTION_ID)));
  });

  /** O pedido, montado outra vez: apagado o documento, um segundo delete já não tem onde ler quem
   * está envolvido (o `resource` fica nulo) e a regra recusa-o - o que faria parecer que falha.
   * Cada caso volta a semear o seu cenário, em vez de encadear deletes sobre o mesmo documento. */
  function seedConnectionRequest() {
    return seed(`connectionRequests/${CONNECTION_ID}`, {
      from: ALUNO.uid,
      to: PROFESSOR.uid,
      status: 'accepted',
    });
  }

  it('os dois lados levam o pedido de conexão; um terceiro não', async () => {
    await seedConnectionRequest();
    await assertSucceeds(deleteDoc(doc(dbAs(ALUNO), 'connectionRequests', CONNECTION_ID)));

    await seedConnectionRequest();
    await assertSucceeds(deleteDoc(doc(dbAs(PROFESSOR), 'connectionRequests', CONNECTION_ID)));

    await seedConnectionRequest();
    await assertFails(deleteDoc(doc(dbAs(ALUNO_B), 'connectionRequests', CONNECTION_ID)));
  });

  it('os dois lados levam o pedido de sessão; um terceiro não', async () => {
    const id = await seedPendingSessionRequest();
    await assertSucceeds(deleteDoc(doc(dbAs(ALUNO), 'sessionRequests', id)));

    await seedPendingSessionRequest(id);
    await assertSucceeds(deleteDoc(doc(dbAs(PROFESSOR), 'sessionRequests', id)));

    await seedPendingSessionRequest(id);
    await assertFails(deleteDoc(doc(dbAs(ALUNO_B), 'sessionRequests', id)));
  });

  it('os participantes levam a sessão e a conversa; um terceiro não', async () => {
    await seed('sessions/sessao1', sessionData('pedidoSessao1'));
    await assertSucceeds(deleteDoc(doc(dbAs(ALUNO), 'sessions', 'sessao1')));

    await seed('sessions/sessao1', sessionData('pedidoSessao1'));
    await assertFails(deleteDoc(doc(dbAs(ALUNO_B), 'sessions', 'sessao1')));

    await seed(`conversations/${CONVERSATION_ID}`, {
      participants: [ALUNO.uid, PROFESSOR.uid].sort(),
    });
    await assertSucceeds(deleteDoc(doc(dbAs(PROFESSOR), 'conversations', CONVERSATION_ID)));

    await seed(`conversations/${CONVERSATION_ID}`, {
      participants: [ALUNO.uid, PROFESSOR.uid].sort(),
    });
    await assertFails(deleteDoc(doc(dbAs(ALUNO_B), 'conversations', CONVERSATION_ID)));
  });

  it('cada um apaga as mensagens que escreveu, e só essas', async () => {
    await seed(`conversations/${CONVERSATION_ID}`, {
      participants: [ALUNO.uid, PROFESSOR.uid].sort(),
    });
    await seed(`conversations/${CONVERSATION_ID}/messages/minha`, { senderId: ALUNO.uid, text: 'Olá' });
    await seed(`conversations/${CONVERSATION_ID}/messages/outra`, {
      senderId: PROFESSOR.uid,
      text: 'Boa',
    });

    const db = dbAs(ALUNO);
    await assertSucceeds(deleteDoc(doc(db, 'conversations', CONVERSATION_ID, 'messages', 'minha')));
    // A do outro não: participar numa conversa não dá o direito de apagar o que o outro escreveu.
    await assertFails(deleteDoc(doc(db, 'conversations', CONVERSATION_ID, 'messages', 'outra')));
  });

  it('a avaliação não se apaga, nem quando a conta vai atrás dela', async () => {
    await seed('sessions/sessao1', { ...sessionData('pedidoSessao1'), status: 'completed' });
    await seed('ratings/sessao1', { mentorUid: PROFESSOR.uid, rating: 2 });

    // Nem o mentor avaliado (que é quem tem interesse em apagar uma nota má), nem o tutorando que
    // a escreveu - é o anonimato que a mantém de pé.
    await assertFails(deleteDoc(doc(dbAs(PROFESSOR), 'ratings', 'sessao1')));
    await assertFails(deleteDoc(doc(dbAs(ALUNO), 'ratings', 'sessao1')));

    // E a sessão pode ir: sem ela, a avaliação fica sem por onde ser lida (é o que a torna
    // inofensiva para quem apaga a conta, e é por isso que não precisa de ser apagada).
    await assertSucceeds(deleteDoc(doc(dbAs(ALUNO), 'sessions', 'sessao1')));
  });
});
