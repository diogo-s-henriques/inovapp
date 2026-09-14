/**
 * Testes de `src/lib/time.ts`.
 *
 * `formatTimeAgo` recebe o rótulo de "agora" já traduzido em vez de o fixar em português — foi
 * essa a correcção que tirou os dados do i18n hardcoded. Os testes verificam as fronteiras entre
 * minutos/horas/dias e que o rótulo passa mesmo pelo parâmetro.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dateLocaleTag, formatTimeAgo } from '@/lib/time';

const SEGUNDO = 1_000;
const MINUTO = 60 * SEGUNDO;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/** Um instante no passado, à distância pedida. O tempo real só pode aumentar a distância, e é
 * por isso que os valores escolhidos ficam sempre dentro do intervalo que se quer testar. */
function haQuantoTempo(ms: number): Date {
  return new Date(Date.now() - ms);
}

describe('dateLocaleTag', () => {
  it('devolve pt-PT para português', () => {
    assert.equal(dateLocaleTag('pt'), 'pt-PT');
  });

  it('devolve en-US para inglês', () => {
    assert.equal(dateLocaleTag('en'), 'en-US');
  });
});

describe('formatTimeAgo — intervalos', () => {
  const casos: Array<[number, string, string]> = [
    [30 * SEGUNDO, 'agora mesmo', 'menos de um minuto'],
    [59 * SEGUNDO, 'agora mesmo', 'uma distância que continua a arredondar para zero minutos'],
    [60 * SEGUNDO, '1m', 'exatamente um minuto'],
    [90 * SEGUNDO, '1m', 'minuto e meio arredonda para baixo'],
    [59 * MINUTO, '59m', 'último minuto antes da hora'],
    [60 * MINUTO, '1h', 'exatamente uma hora'],
    [119 * MINUTO, '1h', 'quase duas horas'],
    [23 * HORA, '23h', 'última hora antes do dia'],
    [24 * HORA, '1d', 'exatamente um dia'],
    [10 * DIA, '10d', 'mais de uma semana'],
  ];

  for (const [distancia, esperado, motivo] of casos) {
    it(`${distancia} ms → ${esperado} (${motivo})`, () => {
      assert.equal(formatTimeAgo(haQuantoTempo(distancia), 'agora mesmo'), esperado);
    });
  }
});

describe('formatTimeAgo — o rótulo de "agora" vem do chamador', () => {
  it('usa o rótulo em português', () => {
    assert.equal(formatTimeAgo(haQuantoTempo(0), 'agora'), 'agora');
  });

  it('usa o rótulo em inglês, sem texto português escondido', () => {
    assert.equal(formatTimeAgo(haQuantoTempo(0), 'just now'), 'just now');
  });

  it('passa o rótulo recebido mesmo quando está vazio', () => {
    assert.equal(formatTimeAgo(haQuantoTempo(0), ''), '');
  });
});

describe('formatTimeAgo — sufixos', () => {
  it('não distingue idiomas nos sufixos (é o mesmo formato para todos)', () => {
    for (const distancia of [MINUTO, HORA, DIA]) {
      const resultado = formatTimeAgo(haQuantoTempo(distancia), 'agora');
      assert.match(resultado, /^\d+[mhd]$/);
    }
  });
});
