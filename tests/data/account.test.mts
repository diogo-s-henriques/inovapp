/**
 * Testes de **apagar a conta** (`src/lib/account.ts` e `src/auth/actions.ts`) contra os emuladores.
 *
 * É a operação mais destrutiva da app, e a única que apaga a sério - por isso não chega testá-la
 * contra um duplo que regista chamadas: o que pode correr mal aqui é a regra recusar um dos deletes
 * (e a conta ficar a meio, com dados órfãos que ninguém pode remover) ou a operação levar atrás
 * aquilo que não é dela. As duas coisas só se veem com o `firestore.rules` verdadeiro pelo meio, e
 * é isso que este ficheiro faz.
 *
 * O que se fixa:
 *
 * 1. **Sai tudo o que é da conta**: perfil, dados privados, registos dos avisos, bloqueios que ela
 *    fez, pedidos de conexão e de sessão, sessões, conversas e as mensagens que ela escreveu.
 * 2. **O que é de outra pessoa fica**: o bloqueio que outro lhe fez e a avaliação anónima que
 *    recebeu (esta última fica inalcançável, por não haver sessão nenhuma para a mostrar).
 * 3. **A conta do Auth desaparece no fim** - e é por isso que a ordem importa: apagada primeiro, o
 *    cliente perdia o direito de apagar o resto (ver o comentário de src/lib/account.ts).
 * 4. **A palavra-passe errada não apaga nada**: é o que a reautenticação à frente de tudo compra.
 *
 * Nada disto toca em dados de produção - ver o guarda em tests/data/emulator.mts.
 *
 * Como correr (arranca os dois emuladores, corre e desliga):
 *   npm run test:data
 */
import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, terminate, where } from 'firebase/firestore';

import { deleteAccount } from '@/auth/actions';
import { blockId, blockUser } from '@/lib/blocking';
import { conversationExists, sendMessage } from '@/lib/chat';
import { deleteAccountData } from '@/lib/account';
import { auth, db } from '@/lib/firebase';
import { connectionRequestId, matchId, sendConnectionRequest } from '@/lib/matching';
import { registerDevice } from '@/lib/push';
import { submitRating } from '@/lib/ratings';
import { respondToConnectionRequest } from '@/lib/requests';
import { completeSession, respondToSessionRequest, sendSessionRequest } from '@/lib/sessions';
import type { SessionRequest } from '@/types/session';

import { CONTAS, SENHA_DE_TESTE, criarCenario, entrarComo, lerDocumento, type Cenario } from './emulator.mts';

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

const PROJETO = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'inovapp-68021';

let cenario: Cenario;

/**
 * Se o documento já não existe - ou já não é legível, que dá no mesmo depois de a conta ir.
 *
 * A distinção é do Firestore e não é óbvia: apagar um documento que a regra lê (`resource.data.from`,
 * por exemplo) deixa o `resource` a nulo, e a regra **rebenta** em vez de dizer "não" - o cliente
 * recebe um `permission-denied` no lugar de um documento inexistente. É o mesmo caso que o
 * `hasBlocked` já traduz em src/lib/blocking.ts.
 */
async function estaApagado(caminho: string): Promise<boolean> {
  try {
    return (await lerDocumento(caminho)) === null;
  } catch {
    return true;
  }
}

/** As sessões do utilizador com sessão iniciada (leitura sujeita às regras). */
async function sessoesDe(): Promise<Array<Record<string, unknown> & { id: string }>> {
  const snapshot = await getDocs(
    query(collection(db, 'sessions'), where('participants', 'array-contains', auth.currentUser?.uid)),
  );
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

/**
 * Quantos documentos existem **no emulador** por baixo de um caminho, sem regras pelo meio.
 *
 * Serve para responder à pergunta que o SDK não deixa responder: o que ficou na base de dados
 * depois de a conta desaparecer. Depois de a conta ir, ninguém tem permissão para ler aquilo - e é
 * essa a razão de ser desta função em vez de um `getDocs`: a API REST do emulador responde sem
 * autenticação (é o mesmo caminho que o `limparEmulador()` usa para apagar tudo), o que aqui faz o
 * papel de acesso de administrador.
 */
async function documentosNoEmulador(caminho: string): Promise<number> {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host) throw new Error('Sem FIRESTORE_EMULATOR_HOST: estes testes só correm contra emuladores.');

  const resposta = await fetch(
    `http://${host}/v1/projects/${PROJETO}/databases/(default)/documents/${caminho}`,
    // `Bearer owner` é a forma de o emulador reconhecer um pedido de administrador - é o mesmo
    // truque que o `confirmarEmailNoEmulador()` usa no emulador do Auth.
    { headers: { Authorization: 'Bearer owner' } },
  );

  // Um documento que já não existe dá 404 (e não uma lista vazia): para o que aqui se pergunta -
  // "sobrou alguma coisa?" - um 404 é a resposta certa, com o mesmo significado de zero.
  if (resposta.status === 404) return 0;
  if (!resposta.ok) {
    throw new Error(`O emulador recusou a leitura de "${caminho}" (HTTP ${resposta.status}).`);
  }

  const corpo = (await resposta.json()) as { documents?: unknown[] };
  return corpo.documents?.length ?? 0;
}

/**
 * Uma conta com tudo o que ela deixa atrás: uma ligação aceite (e a conversa que nasce dela), uma
 * mensagem de cada lado, um pedido de sessão com a sessão e a avaliação do tutorando, o registo
 * dos avisos, um bloqueio feito por ela e outro feito por outra pessoa sobre ela.
 */
async function montarConta() {
  const { ana, bruno, carla, diogo } = cenario;
  const pedidoConexao = connectionRequestId(ana, bruno);
  const conversa = matchId(ana, bruno);

  await entrarComo(CONTAS.aluna);
  await sendConnectionRequest(ana, bruno);

  await entrarComo(CONTAS.alunoQueEnsina);
  await respondToConnectionRequest(pedidoConexao, ana, bruno, true);
  // A mensagem de quem fica: é ela que não pode desaparecer com a conta da outra pessoa.
  await sendMessage(conversa, bruno, ana, 'Olá, boa tarde.');

  await entrarComo(CONTAS.aluna);
  await sendMessage(conversa, ana, bruno, 'Combinado, obrigada!');
  const pedidoSessao = await sendSessionRequest(ana, bruno, DADOS_DA_SESSAO);

  const pedido: SessionRequest = {
    id: pedidoSessao,
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
  const sessao = (await sessoesDe())[0];
  await completeSession(sessao.id);

  // A avaliação é do tutorando e fica **sem nome**: é ela que se prova não ir atrás da conta.
  await entrarComo(CONTAS.aluna);
  await submitRating(sessao.id, bruno, DADOS_DA_AVALIACAO);

  await registerDevice(ana, 'telemovel-1', 'ExponentPushToken[ana]', 'ios');
  await blockUser(ana, carla);

  // E um bloqueio de outra pessoa sobre ela - esse não é dela, e fica onde está.
  await entrarComo(CONTAS.intruso);
  await blockUser(diogo, ana);

  await entrarComo(CONTAS.aluna);

  return { pedidoConexao, conversa, pedidoSessao, sessaoId: sessao.id };
}

beforeEach(async () => {
  cenario = await criarCenario();
});

// Sem fechar estas ligações o processo nunca sai (ver tests/data/flows.test.mts).
after(async () => {
  await Promise.all([terminate(db), signOut(auth).catch(() => undefined)]);
});

describe('apagar os dados da conta', () => {
  it('leva tudo o que é dela e deixa o que é dos outros', async () => {
    const { pedidoConexao, conversa, pedidoSessao, sessaoId } = await montarConta();
    const { ana, bruno, carla, diogo } = cenario;

    // Antes: a conversa existe mesmo, e a conta tem o que se vai apagar.
    assert.equal(await conversationExists(ana, bruno), true);
    assert.ok(await lerDocumento(`users/${ana}`));

    await deleteAccountData(ana);

    // --- Sai tudo o que é dela ---
    assert.ok(await estaApagado(`users/${ana}`), 'o perfil ficou');
    assert.ok(await estaApagado(`userAccounts/${ana}`), 'os dados privados da conta ficaram');
    assert.ok(await estaApagado(`users/${ana}/devices/telemovel-1`), 'o registo dos avisos ficou');
    assert.ok(await estaApagado(`connectionRequests/${pedidoConexao}`), 'o pedido de conexão ficou');
    assert.ok(await estaApagado(`sessionRequests/${pedidoSessao}`), 'o pedido de sessão ficou');
    assert.ok(await estaApagado(`sessions/${sessaoId}`), 'a sessão ficou');
    assert.ok(await estaApagado(`conversations/${conversa}`), 'a conversa ficou');
    assert.ok(await estaApagado(`blocks/${blockId(ana, carla)}`), 'o bloqueio dela ficou');

    // --- Fica o que é de outra pessoa ---
    assert.ok(
      await lerDocumento(`blocks/${blockId(diogo, ana)}`),
      'o bloqueio que outra pessoa fez foi apagado - não era dela para apagar',
    );
    assert.ok(
      await lerDocumento(`ratings/${sessaoId}`),
      'a avaliação foi apagada: o anonimato depende de ninguém a poder apagar',
    );
  });

  it('leva as mensagens que ela escreveu e não as que o outro escreveu', async () => {
    const { conversa } = await montarConta();
    const { ana, bruno } = cenario;

    // A contagem é feita no emulador, sem regras: depois de a conversa desaparecer, o SDK já não
    // consegue ler lá dentro - nem para quem fica, porque é a conversa que a regra vai buscar.
    assert.equal(await documentosNoEmulador(`conversations/${conversa}/messages`), 2);

    await deleteAccountData(ana);

    assert.equal(await documentosNoEmulador(`conversations/${conversa}/messages`), 1);
    assert.equal(await documentosNoEmulador(`conversations/${conversa}`), 0);

    // Do lado de quem fica, a conversa desapareceu da lista (é o que ele vê).
    await entrarComo(CONTAS.alunoQueEnsina);
    assert.equal(await conversationExists(bruno, ana), false);
  });

  it('deixa a base de dados sem nada da conta', async () => {
    await montarConta();
    const { ana } = cenario;

    await deleteAccountData(ana);

    // Uma varredura pelas coleções todas, pelo emulador: não é para conferir uma coleção em
    // concreto, é para apanhar a que ainda não existe - se amanhã nascer outra onde a conta
    // aparece, é este teste que falha (e não a pessoa que se lembrar de apagar a conta).
    const porColecao: Record<string, number> = {
      blocks: await documentosNoEmulador('blocks'),
      connectionRequests: await documentosNoEmulador('connectionRequests'),
      sessionRequests: await documentosNoEmulador('sessionRequests'),
      sessions: await documentosNoEmulador('sessions'),
      conversations: await documentosNoEmulador('conversations'),
      ratings: await documentosNoEmulador('ratings'),
      userAccounts: await documentosNoEmulador('userAccounts'),
      users: await documentosNoEmulador('users'),
    };

    assert.deepEqual(porColecao, {
      // O bloqueio que o Diogo fez sobre ela é a única coisa que sobra das coleções todas.
      blocks: 1,
      connectionRequests: 0,
      sessionRequests: 0,
      sessions: 0,
      conversations: 0,
      // A avaliação fica (anónima, e sem sessão nenhuma que a mostre).
      ratings: 1,
      // Os três que restam são as outras contas do cenário - a dela saiu de `users` e de
      // `userAccounts`, e nada ficou órfão a apontar para um UID que já não existe.
      userAccounts: 3,
      users: 3,
    });
  });
});

describe('apagar a conta (com a conta do Auth)', () => {
  it('apaga a conta do Firebase - já não se entra com ela', async () => {
    await montarConta();
    const { ana } = cenario;

    await deleteAccount(SENHA_DE_TESTE);

    assert.equal(auth.currentUser, null, 'a conta do Auth devia ter desaparecido');

    await assert.rejects(
      () => entrarComo(CONTAS.aluna),
      (erro: { code?: string }) => {
        assert.ok(
          erro.code === 'auth/user-not-found' || erro.code === 'auth/invalid-credential',
          `o emulador devolveu ${erro.code} ao entrar numa conta apagada`,
        );
        return true;
      },
      'ainda se entrava com uma conta apagada',
    );

    // E os dados também foram com ela.
    await entrarComo(CONTAS.alunoQueEnsina);
    assert.equal(await lerDocumento(`users/${ana}`), null);
    assert.equal(await conversationExists(cenario.bruno, ana), false);
  });

  it('a palavra-passe errada não apaga nada', async () => {
    await montarConta();
    const { ana } = cenario;

    await assert.rejects(() => deleteAccount('Palavra-Passe-Errada1!'));

    // Nada saiu do sítio: é o que a reautenticação à frente de tudo compra (e a razão por que ela
    // não está depois dos deletes, a apanhar o `auth/requires-recent-login` já com a conta vazia).
    assert.ok(auth.currentUser, 'a sessão devia continuar de pé');
    assert.ok(await lerDocumento(`users/${ana}`), 'o perfil devia continuar lá');
    assert.ok(await lerDocumento(`userAccounts/${ana}`), 'os dados da conta deviam continuar lá');
  });
});
