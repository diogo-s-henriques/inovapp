/**
 * Testes de `src/lib/home.ts` - a saudação por hora do dia, o que conta como pendência e quando a
 * Home está vazia.
 *
 * O que interessa aqui são as fronteiras, porque é só nelas que estas funções decidem algo: a
 * saudação a mudar uma hora mais cedo, uma faixa de "0 pedidos" a aparecer no topo, ou o guia de
 * primeiros passos a tapar conteúdo real. Nenhum destes erros rebenta - todos se vêem no ecrã.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { greetingPeriod, isHomeEmpty, toAttentionItems } from '@/lib/home';

/** Uma hora local do dia em teste. Construída com componentes locais para o teste não depender do
 * fuso horário da máquina que o corre. */
function asHoras(hour: number, minute = 0): Date {
  return new Date(2026, 8, 15, hour, minute, 0);
}

describe('greetingPeriod', () => {
  const casos: Array<[number, string]> = [
    [0, 'morning'],
    [8, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [17, 'afternoon'],
    [19, 'afternoon'],
    [20, 'evening'],
    [23, 'evening'],
  ];

  for (const [hour, esperado] of casos) {
    it(`às ${hour}h diz "${esperado}"`, () => {
      assert.equal(greetingPeriod(asHoras(hour)), esperado);
    });
  }

  it('no último minuto da manhã ainda é manhã', () => {
    assert.equal(greetingPeriod(asHoras(11, 59)), 'morning');
  });

  it('no último minuto da tarde ainda é tarde', () => {
    assert.equal(greetingPeriod(asHoras(19, 59)), 'afternoon');
  });
});

describe('toAttentionItems', () => {
  it('sem nada pendente não devolve linha nenhuma', () => {
    assert.deepEqual(toAttentionItems({ connections: 0, sessions: 0, messages: 0 }), []);
  });

  it('uma contagem negativa conta como nada pendente', () => {
    assert.deepEqual(toAttentionItems({ connections: -1, sessions: 0, messages: 0 }), []);
  });

  it('traz só o que existe', () => {
    assert.deepEqual(toAttentionItems({ connections: 0, sessions: 0, messages: 3 }), [
      { kind: 'messages', count: 3 },
    ]);
  });

  it('ordena por prioridade, não pela ordem em que os dados chegam', () => {
    assert.deepEqual(toAttentionItems({ messages: 1, sessions: 2, connections: 3 }), [
      { kind: 'connections', count: 3 },
      { kind: 'sessions', count: 2 },
      { kind: 'messages', count: 1 },
    ]);
  });

  it('atravessa o que existe sem perder contagens', () => {
    assert.deepEqual(toAttentionItems({ connections: 2, sessions: 0, messages: 5 }), [
      { kind: 'connections', count: 2 },
      { kind: 'messages', count: 5 },
    ]);
  });
});

describe('isHomeEmpty', () => {
  it('sem sessões, sem ligações e sem pendências, a Home está vazia', () => {
    assert.equal(isHomeEmpty({ sessions: 0, connections: 0, attention: 0 }), true);
  });

  // Qualquer uma das três chega para haver conteúdo - é isto que impede o guia de primeiros passos
  // de aparecer a quem já tem vida na app.
  const comConteudo: Array<[string, { sessions: number; connections: number; attention: number }]> = [
    ['uma sessão marcada', { sessions: 1, connections: 0, attention: 0 }],
    ['uma ligação aceite', { sessions: 0, connections: 1, attention: 0 }],
    ['uma pendência', { sessions: 0, connections: 0, attention: 1 }],
  ];

  for (const [nome, estado] of comConteudo) {
    it(`com ${nome} a Home já não está vazia`, () => {
      assert.equal(isHomeEmpty(estado), false);
    });
  }
});
