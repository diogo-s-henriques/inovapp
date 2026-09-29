/**
 * Testes dos **dois papéis** contra os emuladores do Firestore e Auth - o caminho todo, com o
 * `firestore.rules` verdadeiro pelo meio.
 *
 * O papel passou a ser o modelo da app inteira: vem do domínio do email (`getAccountRole`), decide
 * quem aparece na descoberta (`fetchTutorCandidates`) e já não é uma escolha feita no assistente de
 * perfil. Isso deixa três sítios onde pode correr mal, e são os três que este ficheiro fixa:
 *
 * 1. **O que a app escreve.** Um aluno não leva disciplinas que ensina nem disponibilidade; um
 *    docente leva as duas coisas. E o `participationMode` - que era o que dizia isto tudo até esta
 *    versão - deixou de ser escrito por qualquer um deles.
 * 2. **A descoberta.** Só docentes entram no deck, incluindo contra contas de aluno que guardam
 *    disciplinas de antes desta regra (dados antigos não se apagam sozinhos).
 * 3. **A sessão.** O pedido pode partir de qualquer lado de uma ligação, e o papel **nessa sessão**
 *    é de quem pede e de quem aceita - não do papel da conta. É por isso que um docente que pede
 *    uma sessão a um aluno aparece como "Tutorando" nela: comportamento conhecido, fixado aqui para
 *    não mudar sem se notar.
 *
 * Nada disto toca em dados de produção - ver o guarda em tests/data/emulator.mts.
 *
 * Como correr (arranca os dois emuladores, corre e desliga):
 *   npm run test:data
 */
import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { signOut } from 'firebase/auth';
import { terminate } from 'firebase/firestore';

import { canLearn, canTeach, getAccountRole } from '@/constants/auth';
import { auth, db } from '@/lib/firebase';
import { fetchCandidateById, fetchTutorCandidates, connectionRequestId, sendConnectionRequest } from '@/lib/matching';
import { respondToConnectionRequest } from '@/lib/requests';
import { completeSession, respondToSessionRequest, sendSessionRequest, subscribeToSessions } from '@/lib/sessions';
import type { AgendaSession, SessionRequest } from '@/types/session';

import {
  CONTAS,
  criarCenario,
  criarConta,
  configurarPerfil,
  entrarComo,
  esperarPor,
  lerDocumento,
  type Cenario,
} from './emulator.mts';

const DISCIPLINA = 'Matemática';

const DADOS_DA_SESSAO = {
  subject: DISCIPLINA,
  date: '2026-10-05',
  time: '15:00',
  modality: 'Online' as const,
  message: 'Podemos rever derivadas?',
};

let cenario: Cenario;

beforeEach(async () => {
  cenario = await criarCenario();
});

// Sem fechar estas ligações o processo nunca sai: o SDK do Firestore deixa canais gRPC abertos, e
// o `emulators:exec` que arranca os emuladores fica à espera do fim do script para sempre.
after(async () => {
  await Promise.all([terminate(db), signOut(auth).catch(() => undefined)]);
});

/** A recusa das regras, que em produção é sempre `permission-denied`. */
const recusadaPelasRegras = (erro: { code?: string }) => {
  assert.ok(
    erro.code === 'permission-denied' || erro.code === 'invalid-argument',
    `a escrita devia ter sido recusada pelas regras (código recebido: ${erro.code})`,
  );
  return true;
};

describe('o papel de uma conta vem do email', () => {
  it('um email do ISEC fica docente; qualquer outro fica aluno', async () => {
    // Os dois documentos contam, e é o mesmo `getAccountRole` que escreve os dois (ver `signUp` em
    // src/auth/actions.ts): o perfil, visível à comunidade, e os dados privados da conta. Cada um lê
    // os seus - `userAccounts` é legível só pelo próprio, e é isso que este teste exercita pelo
    // caminho normal da app.
    await entrarComo(CONTAS.professor);
    assert.equal((await lerDocumento(`users/${cenario.bruno}`))?.role, 'professor');
    assert.equal((await lerDocumento(`userAccounts/${cenario.bruno}`))?.role, 'professor');

    await entrarComo(CONTAS.aluna);
    assert.equal((await lerDocumento(`users/${cenario.ana}`))?.role, 'student');
    assert.equal((await lerDocumento(`userAccounts/${cenario.ana}`))?.role, 'student');
  });

  it('o que a regra do cliente diz é o que o servidor guarda', async () => {
    // A mesma linha de código em dois sítios (src e firestore.rules) é a razão de ser deste teste:
    // se um dos dois mudar sozinho, a conta fica com um papel e as regras a exigirem outro.
    await entrarComo(CONTAS.aluna);
    const aluna = await lerDocumento(`users/${cenario.ana}`);
    assert.equal(getAccountRole(CONTAS.aluna), 'student');
    assert.equal(aluna?.role, getAccountRole(CONTAS.aluna));
    assert.equal(canLearn(aluna?.role as 'student'), true);
    assert.equal(canTeach(aluna?.role as 'student'), false);

    await entrarComo(CONTAS.professor);
    const docente = await lerDocumento(`users/${cenario.bruno}`);
    assert.equal(getAccountRole(CONTAS.professor), 'professor');
    assert.equal(docente?.role, getAccountRole(CONTAS.professor));
    assert.equal(canTeach(docente?.role as 'professor'), true);
    assert.equal(canLearn(docente?.role as 'professor'), false);
  });
});

describe('o que cada assistente escreve no perfil', () => {
  it('um aluno fica com os objetivos de aprendizagem e mais nada', async () => {
    const perfil = await lerDocumento(`users/${cenario.ana}`);

    assert.equal(perfil?.profileCompleted, true);
    assert.deepEqual(perfil?.learningSubjects, [DISCIPLINA]);
    assert.deepEqual(perfil?.teachingSubjects, []);
    // O modo de participação era o que decidia isto tudo até esta versão - e já não se escreve.
    assert.equal('participationMode' in (perfil ?? {}), false);
  });

  it('um docente fica com as disciplinas que ensina e a disponibilidade', async () => {
    const perfil = await lerDocumento(`users/${cenario.bruno}`);

    assert.equal(perfil?.profileCompleted, true);
    assert.deepEqual(perfil?.teachingSubjects, [DISCIPLINA]);
    assert.deepEqual(perfil?.learningSubjects, []);
    assert.deepEqual(perfil?.availabilityPeriods, ['Tardes']);
    assert.equal('participationMode' in (perfil ?? {}), false);
  });
});

describe('a descoberta só mostra quem pode ensinar', () => {
  it('um aluno não aparece no deck, mesmo com disciplinas no perfil', async () => {
    // É o caso dos dados antigos: contas de aluno que ensinavam outro aluno têm disciplinas
    // gravadas no Firestore, e nada as apaga sozinho.
    const antigo = await criarConta('legado.mentor@alunos.iseclisboa.pt');
    await configurarPerfil(antigo, {
      fullName: 'Aluno Antigo',
      teachingSubjects: [DISCIPLINA, 'Física'],
    });

    await entrarComo(CONTAS.aluna);
    const deck = await fetchTutorCandidates({ currentUid: cenario.ana, learningSubjects: [DISCIPLINA] });

    const ids = deck.map((candidato) => candidato.id);
    assert.deepEqual(ids, [cenario.bruno, cenario.carla]);
    assert.ok(!ids.includes(antigo), 'um aluno não entra no deck');
    assert.ok(!ids.includes(cenario.diogo), 'e um aluno que só aprende também não');

    // E o perfil dele também não anuncia nada do que ensinava: o que se mostra é o que o papel
    // permite, e não o que ficou escrito no documento.
    const candidato = await fetchCandidateById(antigo);
    assert.deepEqual(candidato?.subjects, []);
  });
});

describe('a sessão entre os dois papéis', () => {
  /** Ana (aluna) e Bruno (docente) ficam ligados - é preciso uma ligação aceite para haver sessão. */
  async function ligar(): Promise<void> {
    await entrarComo(CONTAS.aluna);
    await sendConnectionRequest(cenario.ana, cenario.bruno);

    await entrarComo(CONTAS.professor);
    await respondToConnectionRequest(connectionRequestId(cenario.ana, cenario.bruno), cenario.ana, cenario.bruno, true);
  }

  it('o pedido da aluna cria a sessão com ela como tutoranda', async () => {
    await ligar();

    await entrarComo(CONTAS.aluna);
    const requestId = await sendSessionRequest(cenario.ana, cenario.bruno, DADOS_DA_SESSAO);

    const pedido: SessionRequest = {
      id: requestId,
      fromUid: cenario.ana,
      firstName: 'Ana',
      lastName: 'Aluna',
      ...DADOS_DA_SESSAO,
    };

    await entrarComo(CONTAS.professor);
    await respondToSessionRequest(pedido, cenario.bruno, true);

    const agenda = await esperarPor<AgendaSession[]>(
      (emitir) => subscribeToSessions(cenario.bruno, emitir),
      (sessoes) => sessoes.length === 1,
      'a sessão a aparecer na agenda do docente',
    );

    assert.equal(agenda[0].role, 'mentor');
    assert.equal(agenda[0].otherUid, cenario.ana);
  });

  it('um docente que pede a sessão passa a "Tutorando" nela - e quem aceita é quem a pode terminar', async () => {
    await ligar();

    // O lado de quem pede é que manda no papel desta sessão, e não o papel da conta: é o que a app
    // assume desde o início (ver src/lib/sessions.ts) e o que a regra das `sessions` impõe.
    await entrarComo(CONTAS.professor);
    const requestId = await sendSessionRequest(cenario.bruno, cenario.ana, DADOS_DA_SESSAO);

    const pedido: SessionRequest = {
      id: requestId,
      fromUid: cenario.bruno,
      firstName: 'Bruno',
      lastName: 'Professor',
      ...DADOS_DA_SESSAO,
    };

    await entrarComo(CONTAS.aluna);
    const agendaDaAluna = await esperarPor<AgendaSession[]>(
      (emitir) => subscribeToSessions(cenario.ana, emitir),
      () => true,
      'a agenda da aluna a abrir',
    );
    assert.deepEqual(agendaDaAluna, []);

    await respondToSessionRequest(pedido, cenario.ana, true);

    // Quem aceitou é a aluna: é ela quem fica do lado "mentor" da sessão (o campo histórico), e o
    // docente - o Tutor da app - aparece como tutorando nesta sessão concreta.
    const agendaDepois = await esperarPor<AgendaSession[]>(
      (emitir) => subscribeToSessions(cenario.ana, emitir),
      (sessoes) => sessoes.length === 1,
      'a sessão a aparecer na agenda de quem aceitou',
    );
    assert.equal(agendaDepois[0].role, 'mentor');
    assert.equal(agendaDepois[0].otherUid, cenario.bruno);

    const sessao = await lerDocumento(`sessions/${agendaDepois[0].id}`);
    assert.equal(sessao?.studentUid, cenario.bruno);
    assert.equal(sessao?.mentorUid, cenario.ana);
  });

  it('a sessão só é criada com um pedido aceite, e só quem aceitou a pode terminar', async () => {
    await ligar();

    await entrarComo(CONTAS.aluna);
    const requestId = await sendSessionRequest(cenario.ana, cenario.bruno, DADOS_DA_SESSAO);

    // Antes de o docente aceitar não há sessão nenhuma para ninguém.
    const antes = await esperarPor<AgendaSession[]>(
      (emitir) => subscribeToSessions(cenario.ana, emitir),
      () => true,
      'a agenda da aluna a abrir',
    );
    assert.deepEqual(antes, []);

    const pedido: SessionRequest = {
      id: requestId,
      fromUid: cenario.ana,
      firstName: 'Ana',
      lastName: 'Aluna',
      ...DADOS_DA_SESSAO,
    };

    await entrarComo(CONTAS.professor);
    await respondToSessionRequest(pedido, cenario.bruno, true);

    const agenda = await esperarPor<AgendaSession[]>(
      (emitir) => subscribeToSessions(cenario.bruno, emitir),
      (sessoes) => sessoes.length === 1,
      'a sessão a aparecer na agenda do docente',
    );

    // Só o lado que aceitou (o `mentorUid` do documento) a pode fechar - a aluna, que pediu, não.
    await entrarComo(CONTAS.aluna);
    await assert.rejects(() => completeSession(agenda[0].id), recusadaPelasRegras);
  });
});
