/**
 * Testes de integração de `src/lib/activity.ts` - o histórico "Recentes" do ecrã de notificações.
 *
 * Este módulo é o que mais depende de consultas ao Firestore, e é onde estavam os piores problemas
 * de leitura: lia a lista completa de pedidos aceites e *todas* as sessões do utilizador para
 * depois mostrar oito linhas. Passou a ser ordenado e limitado no servidor, o que só se verifica a
 * correr as consultas contra uma base de dados a sério - no emulador, com o `firestore.rules`
 * verdadeiro pelo meio.
 *
 * Nada disto toca em dados de produção - ver o guarda em tests/data/emulator.mts.
 *
 * Como correr (arranca os dois emuladores, corre e desliga):
 *   npm run test:data
 *
 * ATENÇÃO - o que estes testes NÃO provam: o emulador do Firestore não aplica os índices
 * compostos, por isso as consultas com `where` + `orderBy` passam aqui mesmo que o
 * firestore.indexes.json deixe de as cobrir. Em produção dariam `The query requires an index`. Os
 * três formatos usados pelo activity.ts (connectionRequests e sessionRequests por
 * from+status+respondedAt, e sessions por participants+date) estão declarados naquele ficheiro -
 * quem mexer nas consultas tem de confirmar isso à mão.
 */
import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { signOut } from 'firebase/auth';
import { terminate } from 'firebase/firestore';

import { pt } from '@/i18n/pt';
import { fetchRecentActivity } from '@/lib/activity';
import { auth, db } from '@/lib/firebase';
import { connectionRequestId, sendConnectionRequest } from '@/lib/matching';
import { respondToConnectionRequest } from '@/lib/requests';
import { respondToSessionRequest, sendSessionRequest } from '@/lib/sessions';
import { toDateKey } from '@/lib/time';
import type { ActivityItem } from '@/types/activity';

import { CONTAS, criarCenario, entrarComo, type Cenario } from './emulator.mts';

const DISCIPLINA = 'Matemática';
const HORA = '15:00';

let cenario: Cenario;

beforeEach(async () => {
  cenario = await criarCenario();
});

// Sem fechar estas ligações o processo nunca sai: o SDK do Firestore deixa canais gRPC abertos, e
// o `emulators:exec` que arranca os emuladores fica à espera do fim do script para sempre.
after(async () => {
  await Promise.all([terminate(db), signOut(auth).catch(() => undefined)]);
});

/** Amanhã, no formato de data que a agenda e as sessões usam no Firestore. */
function amanha(): string {
  return toDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000));
}

/** A outra data qualquer, longe o suficiente para não ser confundida com amanhã. */
function daquiA(quantosDias: number): string {
  return toDateKey(new Date(Date.now() + quantosDias * 24 * 60 * 60 * 1000));
}

/** A Ana pede conexão a outra pessoa, que aceita. Devolve o ID do pedido. */
async function ligarCom(pessoa: { email: string; uid: string }): Promise<string> {
  await entrarComo(CONTAS.aluna);
  await sendConnectionRequest(cenario.ana, pessoa.uid);

  const requestId = connectionRequestId(cenario.ana, pessoa.uid);
  await entrarComo(pessoa.email);
  await respondToConnectionRequest(requestId, cenario.ana, pessoa.uid, true);

  return requestId;
}

/** A Ana pede uma sessão ao Bruno (com a ligação já aceite). Devolve o ID do pedido de sessão. */
async function pedirSessao(date: string): Promise<string> {
  await entrarComo(CONTAS.aluna);
  return sendSessionRequest(cenario.ana, cenario.bruno, {
    subject: DISCIPLINA,
    date,
    time: HORA,
    modality: 'Online',
    message: '',
  });
}

/** O Bruno aceita o pedido de sessão, o que cria a sessão na agenda de ambos. */
async function aceitarSessao(requestId: string, date: string): Promise<void> {
  await entrarComo(CONTAS.alunoQueEnsina);
  await respondToSessionRequest(
    {
      id: requestId,
      fromUid: cenario.ana,
      firstName: 'Ana',
      lastName: 'Aluna',
      subject: DISCIPLINA,
      date,
      time: HORA,
      modality: 'Online',
      message: '',
    },
    cenario.bruno,
    true,
  );
}

/** A atividade que a Ana vê (a pessoa que pede é quem recebe estas entradas - ver o teste sobre
 * a assimetria dos dois lados). */
async function atividadeDaAna(): Promise<ActivityItem[]> {
  await entrarComo(CONTAS.aluna);
  return fetchRecentActivity(cenario.ana, pt);
}

describe('activity - o histórico só tem o que aconteceu', () => {
  it('sem nada feito, o histórico está vazio', async () => {
    assert.deepEqual(await atividadeDaAna(), []);
  });

  it('um pedido de conexão ainda pendente não aparece', async () => {
    await entrarComo(CONTAS.aluna);
    await sendConnectionRequest(cenario.ana, cenario.bruno);

    assert.deepEqual(await atividadeDaAna(), []);
  });

  it('um pedido de conexão recusado não aparece', async () => {
    await entrarComo(CONTAS.aluna);
    await sendConnectionRequest(cenario.ana, cenario.bruno);

    const requestId = connectionRequestId(cenario.ana, cenario.bruno);
    await entrarComo(CONTAS.alunoQueEnsina);
    await respondToConnectionRequest(requestId, cenario.ana, cenario.bruno, false);

    assert.deepEqual(await atividadeDaAna(), []);
  });

  it('um pedido de conexão aceite aparece, com quem aceitou e uma data válida', async () => {
    await ligarCom({ email: CONTAS.alunoQueEnsina, uid: cenario.bruno });

    const itens = await atividadeDaAna();
    assert.equal(itens.length, 1);
    assert.equal(itens[0].kind, 'connection-accepted');
    assert.equal(itens[0].title, pt.notifications.requestAcceptedTitle);
    assert.equal(itens[0].description, pt.notifications.connectionAccepted('Bruno'));
    // Asserção independente do texto traduzido: o nome de quem aceitou tem de lá estar.
    assert.match(itens[0].description, /Bruno/);

    // `respondedAt` é um serverTimestamp: se a consulta devolvesse o documento antes de o campo
    // existir, a entrada sairia com uma data inválida - e o ecrã mostraria "NaN".
    assert.ok(itens[0].timestamp instanceof Date);
    assert.ok(Number.isFinite(itens[0].timestamp.getTime()));
  });

  it('um pedido de sessão aceite aparece, com a disciplina', async () => {
    await ligarCom({ email: CONTAS.alunoQueEnsina, uid: cenario.bruno });
    const requestId = await pedirSessao(amanha());
    await aceitarSessao(requestId, amanha());

    const tipos = (await atividadeDaAna()).map((item) => item.kind);
    assert.deepEqual(tipos.sort(), ['connection-accepted', 'session-accepted', 'session-tomorrow']);

    const aceite = (await atividadeDaAna()).find((item) => item.kind === 'session-accepted');
    assert.ok(aceite);
    assert.equal(aceite.description, pt.notifications.sessionAccepted('Bruno', DISCIPLINA));
  });
});

describe('activity - a sessão de amanhã', () => {
  it('aparece com a disciplina, o outro participante e a hora', async () => {
    await ligarCom({ email: CONTAS.alunoQueEnsina, uid: cenario.bruno });
    const requestId = await pedirSessao(amanha());
    await aceitarSessao(requestId, amanha());

    const item = (await atividadeDaAna()).find((entrada) => entrada.kind === 'session-tomorrow');
    assert.ok(item, 'a sessão de amanhã devia aparecer no histórico');
    assert.equal(item.title, pt.notifications.sessionTomorrowTitle);
    assert.equal(item.description, pt.notifications.sessionTomorrow(DISCIPLINA, 'Bruno', HORA));
  });

  it('NÃO aparece se for para outro dia', async () => {
    // É esta a regressão da consulta: antes lia-se todas as sessões do utilizador e filtrava-se
    // as de amanhã no cliente; agora o filtro do dia vai na consulta. Se alguém tirar o
    // `where('date', '==', …)`, a sessão de outro dia volta a aparecer aqui.
    await ligarCom({ email: CONTAS.alunoQueEnsina, uid: cenario.bruno });
    const daquiATresDias = daquiA(3);
    const requestId = await pedirSessao(daquiATresDias);
    await aceitarSessao(requestId, daquiATresDias);

    const itens = await atividadeDaAna();
    assert.ok(
      !itens.some((item) => item.kind === 'session-tomorrow'),
      `nenhuma sessão de ${daquiATresDias} devia constar como "sessão amanhã"`,
    );
  });
});

describe('activity - limites e privacidade', () => {
  it('a atividade de outras pessoas não aparece', async () => {
    // O Bruno liga-se à Carla (duas contas sem nada a ver com a Ana) e aceitam.
    await entrarComo(CONTAS.alunoQueEnsina);
    await sendConnectionRequest(cenario.bruno, cenario.carla);

    const requestId = connectionRequestId(cenario.bruno, cenario.carla);
    await entrarComo(CONTAS.professora);
    await respondToConnectionRequest(requestId, cenario.bruno, cenario.carla, true);

    assert.deepEqual(await atividadeDaAna(), []);
  });

  it('quem aceitou não vê o pedido nos Recentes', async () => {
    // A consulta filtra por `from == uid`, por isso estas entradas são para quem PEDIU: quem
    // aceitou já sabe o que fez. É o contrato atual - se um dia passar a ser para os dois lados,
    // este teste é que tem de mudar.
    await ligarCom({ email: CONTAS.alunoQueEnsina, uid: cenario.bruno });

    await entrarComo(CONTAS.alunoQueEnsina);
    const doBruno = await fetchRecentActivity(cenario.bruno, pt);
    assert.ok(!doBruno.some((item) => item.kind === 'connection-accepted'));
  });

  it('nunca devolve mais de oito entradas', async () => {
    // Nove acontecimentos (três ligações aceites + seis sessões aceites) para exercitar o corte.
    await ligarCom({ email: CONTAS.alunoQueEnsina, uid: cenario.bruno });
    await ligarCom({ email: CONTAS.professora, uid: cenario.carla });
    await ligarCom({ email: CONTAS.intruso, uid: cenario.diogo });

    const pedidos: string[] = [];
    for (let index = 0; index < 6; index += 1) {
      pedidos.push(await pedirSessao(amanha()));
    }
    for (const requestId of pedidos) {
      await aceitarSessao(requestId, amanha());
    }

    const itens = await atividadeDaAna();
    assert.equal(itens.length, 8, 'o teto do histórico é oito entradas');
  });

  it('vem ordenado do mais recente para o mais antigo', async () => {
    await ligarCom({ email: CONTAS.alunoQueEnsina, uid: cenario.bruno });
    await ligarCom({ email: CONTAS.professora, uid: cenario.carla });
    const requestId = await pedirSessao(amanha());
    await aceitarSessao(requestId, amanha());

    const itens = await atividadeDaAna();
    assert.ok(itens.length >= 3);

    // Comparação com `>=` de propósito: dois acontecimentos da mesma passagem podem partilhar o
    // mesmo `serverTimestamp`, e um teste de ordem estrita seria intermitente.
    for (let index = 1; index < itens.length; index += 1) {
      assert.ok(
        itens[index - 1].timestamp.getTime() >= itens[index].timestamp.getTime(),
        `a entrada ${index} está mais recente do que a anterior: ${itens.map((item) => item.kind).join(' > ')}`,
      );
    }
  });
});
