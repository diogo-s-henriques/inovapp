/**
 * Testes de `src/lib/matching.ts`.
 *
 * Três coisas aqui valem mais do que parecem:
 *
 * 1. O formato dos IDs. `firestore.rules` exige que o ID de um pedido de conexão seja
 *    literalmente `from + '_' + to`, e que o ID da conversa junte os dois UIDs por ordem. Se
 *    alguém mudar estas funções, a app deixa de conseguir escrever — e as regras são o único
 *    sítio onde isso se nota, em produção.
 * 2. A cache de perfis, cujo tempo de vida é o de UMA subscrição (ver o comentário no código).
 * 3. A tradução dos campos: foi um bug corrigido, o de os rótulos ("Mentor", "Utilizador") estarem
 *    escritos em português dentro da camada de dados e ficarem em português no modo inglês.
 * 4. `matchesView`, a decisão de qual vista o ecrã dos Matches mostra. O primeiro caso aqui em
 *    baixo é um ecrã que ficou preso a girar: quem só ensina não carrega lista nenhuma, o efeito
 *    saía sem terminar o carregamento, e os pedidos de conexão que a pessoa tinha por decidir
 *    ficavam escondidos atrás do indicador.
 *
 * Não há rede nem base de dados: `tests/doubles/firebase-firestore.mjs` responde às leituras e
 * `tests/doubles/async-storage.mjs` guarda os candidatos passados em memória.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { en } from '@/i18n/en';
import { pt } from '@/i18n/pt';
import { useLocaleStore } from '@/i18n/store';
import {
  connectionRequestId,
  createProfileResolver,
  getPassedCandidateIds,
  matchId,
  matchesView,
  passCandidate,
} from '@/lib/matching';
import type { MatchCandidate } from '@/types/match';
import AsyncStorage from '../doubles/async-storage.mjs';
import { __reset as resetFirestore, __setSnapshot, firestoreCalls } from '../doubles/firebase-firestore.mjs';

function definirPerfil(perfil: Record<string, unknown>): void {
  __setSnapshot({ exists: () => true, data: () => perfil });
}

function definirPerfilInexistente(): void {
  __setSnapshot({ exists: () => false, data: () => undefined });
}

/** Passa pelo caminho real (fetchCandidateById + toCandidate) com um resolver novo. */
async function candidatoDe(perfil: Record<string, unknown>): Promise<MatchCandidate | null> {
  definirPerfil(perfil);
  return createProfileResolver()('uid-do-perfil');
}

beforeEach(() => {
  useLocaleStore.getState().setLocale('pt');
  resetFirestore();
  AsyncStorage.__reset();
});

describe('connectionRequestId — formato que as regras de segurança exigem', () => {
  it('junta o remetente e o destinatário por esta ordem', () => {
    // firestore.rules: requestId == request.resource.data.from + '_' + request.resource.data.to
    assert.equal(connectionRequestId('aluno-1', 'mentor-2'), 'aluno-1_mentor-2');
  });

  it('é direcional: a ordem dos argumentos muda o ID', () => {
    // Ao contrário da conversa, um pedido de conexão tem sentido: o Tutorando é sempre o `from`.
    // Se esta função passasse a ser simétrica, `to` e `from` trocavam-se e a regra de autorização
    // ("só o destinatário aceita") passaria a apontar para a pessoa errada.
    assert.notEqual(connectionRequestId('a', 'b'), connectionRequestId('b', 'a'));
    assert.equal(connectionRequestId('a', 'b'), 'a_b');
    assert.equal(connectionRequestId('b', 'a'), 'b_a');
  });
});

describe('matchId — ID da conversa', () => {
  it('é simétrico: os dois lados chegam ao mesmo ID', () => {
    assert.equal(matchId('a', 'b'), matchId('b', 'a'));
  });

  it('ordena os UIDs', () => {
    assert.equal(matchId('z', 'a'), 'a_z');
    assert.equal(matchId('a', 'z'), 'a_z');
  });

  it('não confunde UIDs diferentes', () => {
    assert.notEqual(matchId('a', 'b'), matchId('a', 'c'));
  });

  it('não produz o mesmo ID que um pedido de conexão do sentido inverso', () => {
    // matchId('b','a') é 'a_b' e connectionRequestId('b','a') é 'b_a': as duas funções usam o
    // mesmo separador mas regras de ordenação diferentes, e é por isso que as coleções não se
    // cruzam.
    assert.equal(matchId('b', 'a'), 'a_b');
    assert.equal(connectionRequestId('b', 'a'), 'b_a');
  });
});

describe('createProfileResolver — cache com o tempo de vida de uma subscrição', () => {
  it('lê cada perfil uma só vez', async () => {
    definirPerfil({ fullName: 'Ana Silva' });
    const resolver = createProfileResolver();

    await resolver('u1');
    await resolver('u1');
    await resolver('u1');

    assert.deepEqual(firestoreCalls.getDoc, ['users/u1']);
  });

  it('lê perfis diferentes separadamente', async () => {
    definirPerfil({ fullName: 'Ana Silva' });
    const resolver = createProfileResolver();

    await resolver('u1');
    await resolver('u2');

    assert.deepEqual(firestoreCalls.getDoc, ['users/u1', 'users/u2']);
  });

  it('devolve o perfil lido', async () => {
    definirPerfil({ fullName: 'Ana Silva', course: { name: 'Engenharia Informática' } });

    const candidato = await createProfileResolver()('u1');

    assert.equal(candidato?.firstName, 'Ana');
    assert.equal(candidato?.course, 'Engenharia Informática');
  });

  it('também guarda em cache o resultado vazio', async () => {
    // Sem isto, um perfil apagado era relido a cada mensagem da conversa.
    definirPerfilInexistente();
    const resolver = createProfileResolver();

    assert.equal(await resolver('u1'), null);
    assert.equal(await resolver('u1'), null);

    assert.deepEqual(firestoreCalls.getDoc, ['users/u1']);
  });

  it('cada resolver tem a sua própria cache', async () => {
    // O contrato documentado: a cache dura o tempo de uma subscrição, para que reabrir o ecrã
    // volte a ler perfis entretanto editados. Não pode ser partilhada entre ecrãs.
    definirPerfil({ fullName: 'Ana Silva' });

    await createProfileResolver()('u1');
    await createProfileResolver()('u1');

    assert.deepEqual(firestoreCalls.getDoc, ['users/u1', 'users/u1']);
  });

  it('não confunde o resultado de um perfil com o de outro', async () => {
    const resolver = createProfileResolver();

    definirPerfil({ fullName: 'Ana Silva' });
    const primeiro = await resolver('u1');

    definirPerfil({ fullName: 'Bruno Costa' });
    const segundo = await resolver('u2');

    assert.equal(primeiro?.firstName, 'Ana');
    assert.equal(segundo?.firstName, 'Bruno');

    // E o primeiro continua a vir da cache, não do que o double passou a devolver.
    assert.equal((await resolver('u1'))?.firstName, 'Ana');
  });
});

describe('perfil → candidato', () => {
  it('divide o nome completo no primeiro e último nome', async () => {
    const candidato = await candidatoDe({ fullName: 'Ana Maria Silva' });

    assert.equal(candidato?.firstName, 'Ana');
    assert.equal(candidato?.lastName, 'Maria Silva');
  });

  it('ignora espaços à volta do nome', async () => {
    const candidato = await candidatoDe({ fullName: '  Ana Silva  ' });

    assert.equal(candidato?.firstName, 'Ana');
    assert.equal(candidato?.lastName, 'Silva');
  });

  it('dá um nome traduzido a quem não tem nome', async () => {
    assert.equal((await candidatoDe({}))?.firstName, pt.common.user);
    assert.equal((await candidatoDe({ fullName: '   ' }))?.firstName, pt.common.user);
  });

  it('um aluno que ensina é Mentor', async () => {
    const candidato = await candidatoDe({ participationMode: 'teach', role: 'student' });

    assert.equal(candidato?.role, pt.roles.mentor);
    assert.notEqual(candidato?.role, pt.roles.tutor);
  });

  it('um professor que ensina é Tutor, não Mentor', async () => {
    // "Mentor" na app é sempre um aluno que ensina outro aluno; um docente é "Tutor".
    const candidato = await candidatoDe({ participationMode: 'teach', role: 'professor' });

    assert.equal(candidato?.role, pt.roles.tutor);
  });

  it('quem ensina e aprende junta os dois papéis', async () => {
    const aluno = await candidatoDe({ participationMode: 'both', role: 'student' });

    assert.equal(aluno?.role, pt.roles.withTutee(pt.roles.mentor));

    const professor = await candidatoDe({ participationMode: 'both', role: 'professor' });

    assert.equal(professor?.role, pt.roles.withTutee(pt.roles.tutor));
  });

  it('quem só aprende é Tutorando', async () => {
    assert.equal((await candidatoDe({ participationMode: 'learn' }))?.role, pt.roles.tutee);
  });

  it('sem modo de participação definido é Tutorando', async () => {
    assert.equal((await candidatoDe({}))?.role, pt.roles.tutee);
  });

  it('as disciplinas vêm das que ensina, não das que quer aprender', async () => {
    const candidato = await candidatoDe({
      teachingSubjects: ['Matemática', 'Física'],
      learningSubjects: ['Programação'],
    });

    assert.deepEqual(candidato?.subjects, ['Matemática', 'Física']);
  });

  it('junta períodos e modalidades numa só linha de disponibilidade', async () => {
    const candidato = await candidatoDe({
      availabilityPeriods: ['Manhãs', 'Tardes'],
      availabilityModality: ['Presencial'],
    });

    assert.equal(candidato?.availability, 'Manhãs · Tardes · Presencial');
    assert.deepEqual(candidato?.availabilityPeriods, ['Manhãs', 'Tardes']);
    assert.deepEqual(candidato?.availabilityModality, ['Presencial']);
  });

  it('não deixa campos de texto por definir', async () => {
    const candidato = await candidatoDe({});

    assert.equal(candidato?.course, '');
    assert.equal(candidato?.year, '');
    assert.equal(candidato?.description, '');
    assert.deepEqual(candidato?.subjects, []);
    assert.equal(candidato?.availability, '');
  });

  it('mostra as sessões dadas como zero, que é um valor por preencher', async () => {
    // Limitação conhecida, documentada no README: não há contagem real de sessões. Este teste
    // existe para que o valor não passe a ser apresentado como se fosse verdadeiro sem se notar.
    assert.equal((await candidatoDe({}))?.sessionsGiven, 0);
  });

  it('a etiqueta de tempo de resposta vem do i18n', async () => {
    assert.equal((await candidatoDe({}))?.responseTime, pt.common.new);
  });
});

describe('i18n na camada de dados', () => {
  it('os papéis seguem o idioma escolhido', async () => {
    // "Tutorando"/"Tutee" é o caso que mostra a mudança: "Mentor" escreve-se igual nos dois
    // idiomas, por isso serviria de teste sem provar nada.
    const emPortugues = await candidatoDe({ participationMode: 'learn' });

    useLocaleStore.getState().setLocale('en');
    const emIngles = await candidatoDe({ participationMode: 'learn' });

    assert.equal(emPortugues?.role, pt.roles.tutee);
    assert.equal(emIngles?.role, en.roles.tutee);
    assert.notEqual(pt.roles.tutee, en.roles.tutee);
  });

  it('a composição de dois papéis segue o idioma', async () => {
    const emPortugues = await candidatoDe({ participationMode: 'both', role: 'student' });

    useLocaleStore.getState().setLocale('en');
    const emIngles = await candidatoDe({ participationMode: 'both', role: 'student' });

    assert.equal(emPortugues?.role, pt.roles.withTutee(pt.roles.mentor));
    assert.equal(emIngles?.role, en.roles.withTutee(en.roles.mentor));
    assert.notEqual(emPortugues?.role, emIngles?.role);
  });

  it('a etiqueta de perfil novo segue o idioma', async () => {
    useLocaleStore.getState().setLocale('en');

    assert.equal((await candidatoDe({}))?.responseTime, en.common.new);
  });

  it('o nome em falta segue o idioma', async () => {
    useLocaleStore.getState().setLocale('en');

    assert.equal((await candidatoDe({}))?.firstName, en.common.user);
  });
});

describe('candidatos passados — guardados só no dispositivo', () => {
  it('começa vazio', async () => {
    assert.deepEqual(await getPassedCandidateIds(), []);
  });

  it('acrescenta quem foi passado', async () => {
    await passCandidate('u1');

    assert.deepEqual(await getPassedCandidateIds(), ['u1']);
  });

  it('acumula candidatos diferentes', async () => {
    await passCandidate('u1');
    await passCandidate('u2');
    await passCandidate('u1');

    assert.deepEqual(await getPassedCandidateIds(), ['u1', 'u2']);
  });

  it('não rebenta com dados corrompidos no armazenamento', async () => {
    await AsyncStorage.setItem('inovapp:passedCandidates', 'isto não é JSON');

    assert.deepEqual(await getPassedCandidateIds(), []);
  });

  it('guarda no dispositivo e não no Firestore', async () => {
    // "Passar" não é uma decisão que tenha de ficar visível ao outro lado — só de não voltar a
    // aparecer neste dispositivo. Por isso não pode haver nenhuma escrita no Firestore.
    await passCandidate('u1');

    const chaves = AsyncStorage.__entries().map(([chave]) => chave);
    assert.deepEqual(chaves, ['inovapp:passedCandidates']);
    assert.deepEqual(firestoreCalls.getDoc, []);
  });
});

describe('matchesView — o que o ecrã dos Matches mostra', () => {
  /** Quem só ensina (não pode aprender): sem lista de candidatos para ler. */
  const SO_ENSINA = { canLearn: false };
  const APRENDE = { canLearn: true };

  it('quem só ensina e tem pedidos vê os pedidos, mesmo com o carregamento por terminar', () => {
    // O caso que falhou: `loading` ficava a true para sempre (o efeito não corre para quem não
    // tem lista), e o ecrã mostrava um indicador a girar em vez dos pedidos por decidir.
    assert.equal(
      matchesView({ ...SO_ENSINA, loading: true, loadError: false, requestCount: 2 }),
      'requests',
    );
  });

  it('quem só ensina e não tem pedidos vê a explicação, não a lista vazia', () => {
    assert.equal(matchesView({ ...SO_ENSINA, loading: true, loadError: false, requestCount: 0 }), 'blocked');
  });

  it('a ler, mostra o carregamento', () => {
    assert.equal(matchesView({ ...APRENDE, loading: true, loadError: false, requestCount: 0 }), 'loading');
  });

  it('uma leitura que falhou mostra o erro, e não uma lista vazia', () => {
    assert.equal(matchesView({ ...APRENDE, loading: false, loadError: true, requestCount: 0 }), 'error');
  });

  it('lida, mostra a lista', () => {
    assert.equal(matchesView({ ...APRENDE, loading: false, loadError: false, requestCount: 3 }), 'list');
  });

  it('enquanto lê, o erro de uma tentativa anterior não ganha', () => {
    // O "Tentar outra vez" põe os dois a true ao mesmo tempo: o que se está a ver é a leitura em
    // curso, e não o erro que já foi despachado.
    assert.equal(matchesView({ ...APRENDE, loading: true, loadError: true, requestCount: 0 }), 'loading');
  });
});
