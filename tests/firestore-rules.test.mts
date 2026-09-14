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

/** Firestore de um utilizador com sessão iniciada, com o email no token (é dele que as regras
 * derivam o papel). */
function dbAs(user: { uid: string; email: string }) {
  return testEnv.authenticatedContext(user.uid, { email: user.email }).firestore();
}

function dbAnonimo() {
  return testEnv.unauthenticatedContext().firestore();
}

/** Escreve um documento ignorando as regras — serve só para montar o cenário que já existiria
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

describe('users — o perfil é público dentro da comunidade, mas não se forja o papel', () => {
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

describe('userAccounts — os dados privados da conta são só do próprio', () => {
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

  it('NINGUÉM apaga os dados de conta', async () => {
    await seed(`userAccounts/${ALUNO.uid}`, { email: ALUNO.email, role: 'student' });
    await assertFails(deleteDoc(doc(dbAs(ALUNO), 'userAccounts', ALUNO.uid)));
  });
});

describe('connectionRequests — só o tutorando inicia, só o destinatário responde', () => {
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

  it('ninguém apaga pedidos de conexão', async () => {
    await seed(`connectionRequests/${CONNECTION_ID}`, requestData(ALUNO.uid, PROFESSOR.uid));
    await assertFails(deleteDoc(doc(dbAs(ALUNO), 'connectionRequests', CONNECTION_ID)));
  });
});

describe('sessionRequests — só entre duas pessoas já ligadas', () => {
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

describe('sessions — nasce do pedido aceite e só o mentor a termina', () => {
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

describe('conversations — só existem depois de a conexão ser aceite', () => {
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

describe('ratings — anónimas, uma por sessão, só pelo tutorando', () => {
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

  it('o documento guarda só a nota e o mentor — nunca quem avaliou', async () => {
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
