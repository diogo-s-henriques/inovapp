/**
 * Testes de `summarizeSessions` (src/lib/sessions.ts).
 *
 * O perfil mostrava "Sessões dadas: 0" e "Sessões recebidas: 0" escritos no código. Agora são
 * contados, e o que vale a pena fixar aqui é a **fronteira entre os três números**, não a soma:
 * uma sessão marcada para a semana que vem não é uma sessão dada, e uma sessão de ontem que
 * ninguém fechou não é uma sessão por vir. Uma contagem que somasse tudo em todos os números
 * passaria num teste que só verificasse "conta 3 sessões".
 *
 * Não há base de dados: a função é pura e recebe os documentos já lidos.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { summarizeSessions } from '@/lib/sessions';
import type { CountableSession, SessionStats } from '@/lib/sessions';

const EU = 'eu';
const OUTRO = 'outro';

/** "Agora" fixo: sem isto, um teste com datas à volta do momento real falharia à meia-noite. */
const AGORA = '2026-09-14T18:00';

/** Uma sessão, com o que interessa à contagem; cada teste troca só o que quer testar. */
function sessao(campos: Partial<CountableSession> = {}): CountableSession {
  return {
    studentUid: OUTRO,
    mentorUid: EU,
    status: 'scheduled',
    date: '2026-09-20',
    time: '10:00',
    ...campos,
  };
}

function contar(sessoes: CountableSession[]): SessionStats {
  return summarizeSessions(sessoes, EU, AGORA);
}

describe('summarizeSessions - sessões dadas e recebidas', () => {
  it('conta como dada uma sessão concluída em que eu era o mentor', () => {
    assert.deepEqual(contar([sessao({ status: 'completed', date: '2026-09-01', time: '10:00' })]), {
      given: 1,
      received: 0,
      upcoming: 0,
    });
  });

  it('conta como recebida uma sessão concluída em que eu era o tutorando', () => {
    const recebida = sessao({ status: 'completed', studentUid: EU, mentorUid: OUTRO, date: '2026-09-01' });
    assert.deepEqual(contar([recebida]), { given: 0, received: 1, upcoming: 0 });
  });

  it('não confunde os dois sentidos na mesma lista', () => {
    // O caso que apanha uma troca de `mentorUid` por `studentUid` dentro da contagem: com uma
    // sessão de cada lado, somar os dois sentidos no mesmo número dá 2 onde tem de dar 1 e 1.
    const dadas = [sessao({ status: 'completed', date: '2026-09-01' })];
    const recebidas = [sessao({ status: 'completed', studentUid: EU, mentorUid: OUTRO, date: '2026-09-02' })];

    assert.deepEqual(contar([...dadas, ...recebidas]), { given: 1, received: 1, upcoming: 0 });
  });

  it('não conta sessões de que não faço parte', () => {
    const alheia = sessao({ status: 'completed', studentUid: 'alguem', mentorUid: 'outro-alguem' });
    assert.deepEqual(contar([alheia]), { given: 0, received: 0, upcoming: 0 });
  });
});

describe('summarizeSessions - o que está por vir', () => {
  it('conta como por vir uma sessão marcada para o futuro, e não como dada', () => {
    assert.deepEqual(contar([sessao({ date: '2026-09-20', time: '10:00' })]), {
      given: 0,
      received: 0,
      upcoming: 1,
    });
  });

  it('conta uma sessão marcada para agora mesmo como por vir', () => {
    // A comparação é `>=`: uma sessão à hora certa ainda não aconteceu. Com `>` este caso
    // desaparecia dos três números e nunca mais era vista em lado nenhum.
    const agoraMesmo = sessao({ date: '2026-09-14', time: '18:00' });
    assert.deepEqual(contar([agoraMesmo]), { given: 0, received: 0, upcoming: 1 });
  });

  it('não conta como por vir uma sessão cuja hora já passou', () => {
    // Fica a zero de propósito: ninguém a concluiu, por isso não é dada; e já não está por vir.
    // Quem a pode fechar é o mentor (ver `completeSession`), e é isso que a tira daqui.
    const passada = sessao({ date: '2026-09-14', time: '17:59' });
    assert.deepEqual(contar([passada]), { given: 0, received: 0, upcoming: 0 });
  });

  it('não conta como por vir uma sessão de ontem, mesmo à mesma hora', () => {
    assert.deepEqual(contar([sessao({ date: '2026-09-13', time: '18:00' })]), {
      given: 0,
      received: 0,
      upcoming: 0,
    });
  });
});

describe('summarizeSessions - sessões antigas e listas', () => {
  it('trata uma sessão sem `status` como marcada (sessões anteriores ao campo existir)', () => {
    const semStatus = sessao({ status: undefined, date: '2026-09-20' });
    assert.deepEqual(contar([semStatus]), { given: 0, received: 0, upcoming: 1 });
  });

  it('devolve zeros para uma lista vazia', () => {
    assert.deepEqual(contar([]), { given: 0, received: 0, upcoming: 0 });
  });

  it('conta os três números na mesma lista', () => {
    const sessoes = [
      sessao({ status: 'completed', date: '2026-09-01' }),
      sessao({ status: 'completed', date: '2026-09-02' }),
      sessao({ status: 'completed', studentUid: EU, mentorUid: OUTRO, date: '2026-09-03' }),
      sessao({ date: '2026-09-20' }),
      sessao({ date: '2026-09-21' }),
      sessao({ date: '2026-09-10' }),
    ];

    assert.deepEqual(contar(sessoes), { given: 2, received: 1, upcoming: 2 });
  });
});


