/**
 * Testes de integração da camada de dados (`src/lib/*`) contra os emuladores do Firestore e Auth.
 *
 * Ao contrário dos testes de `tests/lib` — lógica pura, sem rede — estes exercitam o SDK
 * verdadeiro do Firebase com o `firestore.rules` verdadeiro pelo meio. Verificam as regras que
 * a app não pode violar e que ninguém vê até falharem em produção: não há conversa sem pedido
 * aceite, não há sessão sem pedido aceite, só o tutorando avalia e a avaliação não guarda quem
 * a escreveu.
 *
 * Nada disto toca em dados de produção — ver o guarda em tests/data/emulator.mts.
 *
 * Como correr (arranca os dois emuladores, corre e desliga):
 *   npm run test:data
 */
import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, terminate, where } from 'firebase/firestore';

import { signIn, signUp } from '@/auth/actions';
import { pt } from '@/i18n/pt';
import { conversationExists, markConversationRead, sendMessage } from '@/lib/chat';
import { auth, db } from '@/lib/firebase';
import { connectionRequestId, fetchMentorCandidates, matchId, sendConnectionRequest } from '@/lib/matching';
import { hasRatingForSession, submitRating } from '@/lib/ratings';
import {
  respondToConnectionRequest,
  subscribePendingConnectionRequests,
  type ConnectionRequest,
} from '@/lib/requests';
import { completeSession, respondToSessionRequest, sendSessionRequest, subscribeToSessions } from '@/lib/sessions';
import type { AgendaSession, SessionRequest } from '@/types/session';

import {
  CONTAS,
  SENHA_DE_TESTE,
  criarCenario,
  entrarComo,
  esperarPor,
  lerDocumento,
  type Cenario,
} from './emulator.mts';

const DADOS_DA_SESSAO = {
  subject: 'Matemática',
  date: '2026-10-05',
  time: '15:00',
  modality: 'Online' as const,
  message: 'Podemos rever derivadas?',
};

const DADOS_DA_AVALIACAO = {
  rating: 5,
  subject: 'Matemática',
  tags: ['Clara'],
  comment: 'Explicou muito bem.',
};

/**
 * Predicados para `assert.rejects` das escritas que as regras têm de recusar. Verificam dentro e
 * devolvem true, em vez de devolverem só a comparação, para que uma falha mostre o código real em
 * vez de um genérico "a função de validação devia devolver true".
 */
const semPermissao = (erro: { code?: string }) => {
  assert.equal(erro.code, 'permission-denied', 'a escrita devia ter sido recusada pelas regras');
  return true;
};

/**
 * O mesmo que `semPermissao`, mas para as regras cuja única condição que falha é um `get()`.
 *
 * A regra das mensagens vai buscar os participantes da conversa
 * (`get(conversations/…).data.participants`). Para quem não é participante, esse `get()` não é um
 * "não" — é um erro de avaliação, porque o documento também não lhe é legível. O emulador
 * devolve então `invalid-argument`; em produção, qualquer recusa é `permission-denied`. A recusa
 * em si está confirmada sem depender do código: "um terceiro NÃO lê nem escreve nas mensagens" em
 * tests/firestore-rules.test.mts.
 */
const recusadaPelasRegras = (erro: { code?: string }) => {
  assert.ok(
    erro.code === 'permission-denied' || erro.code === 'invalid-argument',
    `a escrita devia ter sido recusada pelas regras (código recebido: ${erro.code})`,
  );
  return true;
};

let cenario: Cenario;

/** Ana pede conexão ao Bruno e o Bruno aceita. Devolve o ID do pedido. */
async function ligar(ana: string, bruno: string): Promise<string> {
  await entrarComo(CONTAS.aluna);
  await sendConnectionRequest(ana, bruno);

  const requestId = connectionRequestId(ana, bruno);
  await entrarComo(CONTAS.alunoQueEnsina);
  await respondToConnectionRequest(requestId, ana, bruno, true);

  return requestId;
}

/** As sessões em que o utilizador com sessão é participante (leitura sujeita às regras). */
async function sessoesDe(uid: string): Promise<Array<Record<string, unknown> & { id: string }>> {
  const snapshot = await getDocs(
    query(collection(db, 'sessions'), where('participants', 'array-contains', uid)),
  );
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

/** Ana pede a sessão ao Bruno e o Bruno aceita. Devolve os dois IDs. */
async function agendarSessao(ana: string, bruno: string): Promise<{ requestId: string; sessionId: string }> {
  await entrarComo(CONTAS.aluna);
  const requestId = await sendSessionRequest(ana, bruno, DADOS_DA_SESSAO);

  const pedido: SessionRequest = {
    id: requestId,
    fromUid: ana,
    firstName: 'Ana',
    lastName: 'Aluna',
    subject: DADOS_DA_SESSAO.subject,
    date: DADOS_DA_SESSAO.date,
    time: DADOS_DA_SESSAO.time,
    modality: DADOS_DA_SESSAO.modality,
    message: DADOS_DA_SESSAO.message,
  };

  await entrarComo(CONTAS.alunoQueEnsina);
  await respondToSessionRequest(pedido, bruno, true);

  const sessao = (await sessoesDe(bruno))[0];
  return { requestId, sessionId: sessao.id };
}

/** Cenário completo até haver uma sessão terminada e por avaliar. */
async function sessaoTerminada(ana: string, bruno: string): Promise<string> {
  const { sessionId } = await agendarSessao(ana, bruno);
  await entrarComo(CONTAS.alunoQueEnsina);
  await completeSession(sessionId);
  return sessionId;
}

beforeEach(async () => {
  cenario = await criarCenario();
});

// Sem fechar estas ligações o processo nunca sai: o SDK do Firestore deixa canais gRPC abertos, e
// o `emulators:exec` que arranca os emuladores fica à espera do fim do script para sempre.
after(async () => {
  await Promise.all([terminate(db), signOut(auth).catch(() => undefined)]);
});

describe('criação de conta e entrada', () => {
  it('a criação guarda o "Lembrar" escolhido e o email que o Firebase autenticou', async () => {
    // O email leva uma maiúscula de propósito: o Auth normaliza-o para minúsculas e a regra de
    // `userAccounts` exige que o email gravado seja igual ao do token. Ao gravar a string do
    // formulário, a conta era criada no Auth e o documento era recusado pelas regras — a pessoa
    // ficava com uma conta sem perfil, e sem forma de a completar.
    await signOut(auth).catch(() => undefined);
    await signUp('Nova.Conta@alunos.iseclisboa.pt', SENHA_DE_TESTE, true);

    const uid = auth.currentUser?.uid;
    assert.ok(uid, 'o signUp devia ter deixado alguém com sessão');

    const conta = await lerDocumento(`userAccounts/${uid}`);
    assert.equal(conta?.email, 'nova.conta@alunos.iseclisboa.pt');
    assert.equal(conta?.role, 'student');
    assert.equal(conta?.rememberSession, true);
    assert.equal((await lerDocumento(`users/${uid}`))?.profileCompleted, false);
  });

  it('cada entrada regrava o "Lembrar" escolhido', async () => {
    await signIn(CONTAS.aluna, SENHA_DE_TESTE, true);
    assert.equal((await lerDocumento(`userAccounts/${cenario.ana}`))?.rememberSession, true);

    await signIn(CONTAS.aluna, SENHA_DE_TESTE, false);
    assert.equal((await lerDocumento(`userAccounts/${cenario.ana}`))?.rememberSession, false);
  });
});

describe('pedido de conexão', () => {
  it('chega ao mentor com o perfil de quem o enviou', async () => {
    await entrarComo(CONTAS.aluna);
    await sendConnectionRequest(cenario.ana, cenario.bruno);

    await entrarComo(CONTAS.alunoQueEnsina);
    const pedidos = await esperarPor<ConnectionRequest[]>(
      (emitir) => subscribePendingConnectionRequests(cenario.bruno, emitir),
      (lista) => lista.length === 1,
      'o pedido de conexão a chegar ao mentor',
    );

    assert.equal(pedidos[0].fromUid, cenario.ana);
    assert.equal(pedidos[0].candidate.firstName, 'Ana');
    // Ana só aprende, por isso o papel que lhe cabe é o de tutoranda.
    assert.equal(pedidos[0].candidate.role, pt.roles.tutee);
  });

  it('aceitar cria a conversa e marca o pedido como aceite', async () => {
    const requestId = await ligar(cenario.ana, cenario.bruno);

    const pedido = await lerDocumento(`connectionRequests/${requestId}`);
    assert.equal(pedido?.status, 'accepted');

    const conversa = await lerDocumento(`conversations/${matchId(cenario.ana, cenario.bruno)}`);
    assert.deepEqual(conversa?.participants, [cenario.ana, cenario.bruno].sort());
  });

  it('a conversa passa a existir para os dois lados', async () => {
    await ligar(cenario.ana, cenario.bruno);

    assert.equal(await conversationExists(cenario.ana, cenario.bruno), true);
    assert.equal(await conversationExists(cenario.bruno, cenario.ana), true);
  });

  it('recusar não deixa conversa nenhuma', async () => {
    // O `batch` só cria a conversa quando se aceita; recusar tem de deixar o par sem conversa.
    await entrarComo(CONTAS.aluna);
    await sendConnectionRequest(cenario.ana, cenario.bruno);

    await entrarComo(CONTAS.alunoQueEnsina);
    await respondToConnectionRequest(connectionRequestId(cenario.ana, cenario.bruno), cenario.ana, cenario.bruno, false);

    assert.equal((await lerDocumento(`connectionRequests/${connectionRequestId(cenario.ana, cenario.bruno)}`))?.status, 'declined');
    assert.equal(await conversationExists(cenario.ana, cenario.bruno), false);
  });

  it('quem envia o pedido não o pode aceitar por si', async () => {
    await entrarComo(CONTAS.aluna);
    await sendConnectionRequest(cenario.ana, cenario.bruno);

    await assert.rejects(
      () => respondToConnectionRequest(connectionRequestId(cenario.ana, cenario.bruno), cenario.ana, cenario.bruno, true),
      semPermissao,
    );
  });

  it('um terceiro não lê a conversa dos outros dois', async () => {
    await ligar(cenario.ana, cenario.bruno);

    await entrarComo(CONTAS.intruso);
    await assert.rejects(
      () => getDoc(doc(db, 'conversations', matchId(cenario.ana, cenario.bruno))),
      semPermissao,
    );
  });
});

describe('mensagens', () => {
  let conversaId: string;

  beforeEach(async () => {
    await ligar(cenario.ana, cenario.bruno);
    conversaId = matchId(cenario.ana, cenario.bruno);
  });

  it('enviar uma mensagem atualiza a pré-visualização e marca-a por ler para o outro', async () => {
    await entrarComo(CONTAS.aluna);
    await sendMessage(conversaId, cenario.ana, cenario.bruno, 'Olá, podes ajudar-me?');

    const conversa = await lerDocumento(`conversations/${conversaId}`);
    assert.equal(conversa?.lastMessage, 'Olá, podes ajudar-me?');
    assert.deepEqual(conversa?.unreadFor, [cenario.bruno]);
  });

  it('um anexo aparece na pré-visualização com o nome do ficheiro', async () => {
    await entrarComo(CONTAS.aluna);
    await sendMessage(conversaId, cenario.ana, cenario.bruno, 'Deixo aqui os apontamentos', {
      fileName: 'derivadas.pdf',
      fileUrl: 'https://exemplo.pt/derivadas.pdf',
    });

    assert.equal((await lerDocumento(`conversations/${conversaId}`))?.lastMessage, '📎 derivadas.pdf');
  });

  it('marcar como lida tira o aviso de não lida', async () => {
    await entrarComo(CONTAS.aluna);
    await sendMessage(conversaId, cenario.ana, cenario.bruno, 'Olá!');

    await entrarComo(CONTAS.alunoQueEnsina);
    await markConversationRead(conversaId, cenario.bruno);

    assert.deepEqual((await lerDocumento(`conversations/${conversaId}`))?.unreadFor, []);
  });

  it('um terceiro não escreve na conversa dos outros dois', async () => {
    await entrarComo(CONTAS.intruso);

    await assert.rejects(
      () => sendMessage(conversaId, cenario.diogo, cenario.ana, 'Intrometido'),
      recusadaPelasRegras,
    );
  });

  it('ninguém escreve uma mensagem em nome de outra pessoa', async () => {
    await entrarComo(CONTAS.aluna);

    await assert.rejects(
      () => sendMessage(conversaId, cenario.bruno, cenario.ana, 'A passar-me pelo Bruno'),
      semPermissao,
    );
  });
});

describe('pedido de sessão', () => {
  it('só se pode pedir sessão a uma ligação já aceite', async () => {
    // Ana e a Carla nunca aceitaram nada uma à outra.
    await entrarComo(CONTAS.aluna);

    await assert.rejects(
      () => sendSessionRequest(cenario.ana, cenario.carla, DADOS_DA_SESSAO),
      semPermissao,
    );
  });

  it('aceitar cria a sessão com quem pediu como tutorando e quem aceitou como mentor', async () => {
    await ligar(cenario.ana, cenario.bruno);
    const { requestId, sessionId } = await agendarSessao(cenario.ana, cenario.bruno);

    const sessao = await lerDocumento(`sessions/${sessionId}`);
    assert.equal(sessao?.studentUid, cenario.ana);
    assert.equal(sessao?.mentorUid, cenario.bruno);
    assert.equal(sessao?.sessionRequestId, requestId);
    assert.equal(sessao?.status, 'scheduled');
    assert.equal(sessao?.subject, DADOS_DA_SESSAO.subject);
    assert.equal(sessao?.date, DADOS_DA_SESSAO.date);
    assert.equal(sessao?.time, DADOS_DA_SESSAO.time);

    assert.equal((await lerDocumento(`sessionRequests/${requestId}`))?.status, 'accepted');
  });

  it('só o mentor termina a sessão', async () => {
    await ligar(cenario.ana, cenario.bruno);
    const { sessionId } = await agendarSessao(cenario.ana, cenario.bruno);

    await entrarComo(CONTAS.aluna);
    await assert.rejects(() => completeSession(sessionId), semPermissao);

    await entrarComo(CONTAS.alunoQueEnsina);
    await completeSession(sessionId);

    assert.equal((await lerDocumento(`sessions/${sessionId}`))?.status, 'completed');
  });

  it('cada lado vê a sua própria posição na agenda', async () => {
    await ligar(cenario.ana, cenario.bruno);
    await agendarSessao(cenario.ana, cenario.bruno);

    await entrarComo(CONTAS.alunoQueEnsina);
    const doMentor = await esperarPor<AgendaSession[]>(
      (emitir) => subscribeToSessions(cenario.bruno, emitir),
      (sessoes) => sessoes.length === 1,
      'a sessão a aparecer na agenda do mentor',
    );

    assert.equal(doMentor[0].role, 'mentor');
    assert.equal(doMentor[0].otherUid, cenario.ana);
    assert.equal(doMentor[0].firstName, 'Ana');
    assert.equal(doMentor[0].status, 'scheduled');

    await entrarComo(CONTAS.aluna);
    const daTutoranda = await esperarPor<AgendaSession[]>(
      (emitir) => subscribeToSessions(cenario.ana, emitir),
      (sessoes) => sessoes.length === 1,
      'a sessão a aparecer na agenda do tutorando',
    );

    assert.equal(daTutoranda[0].role, 'student');
  });
});

describe('avaliações', () => {
  it('o tutorando avalia a sessão terminada', async () => {
    await ligar(cenario.ana, cenario.bruno);
    const sessionId = await sessaoTerminada(cenario.ana, cenario.bruno);

    await entrarComo(CONTAS.aluna);
    await submitRating(sessionId, cenario.bruno, DADOS_DA_AVALIACAO);

    const avaliacao = await lerDocumento(`ratings/${sessionId}`);
    assert.equal(avaliacao?.rating, 5);
    assert.equal(avaliacao?.mentorUid, cenario.bruno);
    assert.equal(await hasRatingForSession(sessionId), true);
  });

  it('a avaliação não guarda quem a escreveu', async () => {
    // É o que torna o anonimato real e não só cosmético: a regra confirma quem escreve através da
    // sessão, sem persistir essa ligação. Se algum dia aparecer aqui um campo com quem avaliou,
    // este teste cai.
    await ligar(cenario.ana, cenario.bruno);
    const sessionId = await sessaoTerminada(cenario.ana, cenario.bruno);

    await entrarComo(CONTAS.aluna);
    await submitRating(sessionId, cenario.bruno, DADOS_DA_AVALIACAO);

    const avaliacao = await lerDocumento(`ratings/${sessionId}`);
    const identificadores = ['studentUid', 'from', 'fromUid', 'raterUid', 'authorUid', 'uid'];
    for (const campo of identificadores) {
      assert.ok(!(campo in (avaliacao ?? {})), `a avaliação não pode guardar ${campo}`);
    }
    assert.ok(!Object.values(avaliacao ?? {}).includes(cenario.ana));
  });

  it('o mentor não se avalia a si próprio', async () => {
    await ligar(cenario.ana, cenario.bruno);
    const sessionId = await sessaoTerminada(cenario.ana, cenario.bruno);

    await entrarComo(CONTAS.alunoQueEnsina);
    await assert.rejects(() => submitRating(sessionId, cenario.bruno, DADOS_DA_AVALIACAO), semPermissao);
  });

  it('um terceiro não avalia a sessão de outros dois', async () => {
    await ligar(cenario.ana, cenario.bruno);
    const sessionId = await sessaoTerminada(cenario.ana, cenario.bruno);

    await entrarComo(CONTAS.intruso);
    await assert.rejects(() => submitRating(sessionId, cenario.bruno, DADOS_DA_AVALIACAO), semPermissao);
  });

  it('não se avalia com o mentor de outra sessão', async () => {
    await ligar(cenario.ana, cenario.bruno);
    const sessionId = await sessaoTerminada(cenario.ana, cenario.bruno);

    await entrarComo(CONTAS.aluna);
    await assert.rejects(() => submitRating(sessionId, cenario.carla, DADOS_DA_AVALIACAO), semPermissao);
  });

  it('não se avalia duas vezes a mesma sessão', async () => {
    await ligar(cenario.ana, cenario.bruno);
    const sessionId = await sessaoTerminada(cenario.ana, cenario.bruno);

    await entrarComo(CONTAS.aluna);
    await submitRating(sessionId, cenario.bruno, DADOS_DA_AVALIACAO);

    // ratings só permite create: uma segunda escrita é um update, e as regras recusam-no.
    await assert.rejects(() => submitRating(sessionId, cenario.bruno, DADOS_DA_AVALIACAO), semPermissao);
  });

  it('não aceita uma nota fora da escala', async () => {
    await ligar(cenario.ana, cenario.bruno);
    const sessionId = await sessaoTerminada(cenario.ana, cenario.bruno);

    await entrarComo(CONTAS.aluna);
    await assert.rejects(
      () => submitRating(sessionId, cenario.bruno, { ...DADOS_DA_AVALIACAO, rating: 9 }),
      semPermissao,
    );
  });
});

describe('descoberta de mentores', () => {
  it('só devolve quem pode ensinar, sem o próprio e por ordem de disciplinas em comum', async () => {
    await entrarComo(CONTAS.aluna);
    const candidatos = await fetchMentorCandidates({
      currentUid: cenario.ana,
      learningSubjects: ['Matemática'],
    });

    const ids = candidatos.map((candidato) => candidato.id);
    assert.deepEqual(ids, [cenario.bruno, cenario.carla]);

    // O Diogo só aprende, por isso não é candidato; a Ana está fora por ser ela própria.
    assert.ok(!ids.includes(cenario.diogo));
    assert.ok(!ids.includes(cenario.ana));

    // O Bruno ensina Matemática (a disciplina que a Ana quer aprender) e a Carla ensina Física,
    // por isso o Bruno vem primeiro.
    assert.equal(candidatos[0].subjects[0], 'Matemática');
  });
});
