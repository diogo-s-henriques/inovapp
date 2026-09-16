/**
 * Testes de `src/lib/time.ts`.
 *
 * `formatTimeAgo` recebe o rótulo de "agora" já traduzido em vez de o fixar em português - foi
 * essa a correcção que tirou os dados do i18n hardcoded. Os testes verificam as fronteiras entre
 * minutos/horas/dias e que o rótulo passa mesmo pelo parâmetro.
 *
 * `toDateKey` vivia dentro do componente `CalendarMonth` e mudou-se para aqui: é lógica pura, sem
 * React, e o `activity.ts` precisa dela para saber quais são as sessões de amanhã - enquanto
 * estivesse num ficheiro `.tsx`, a camada de dados ficava impossível de testar em Node.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dateLocaleTag, formatTimeAgo, fromDateKey, isDateKey, toDateKey, toSessionKey } from '@/lib/time';

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

describe('formatTimeAgo - intervalos', () => {
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

describe('formatTimeAgo - o rótulo de "agora" vem do chamador', () => {
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

describe('formatTimeAgo - sufixos', () => {
  it('não distingue idiomas nos sufixos (é o mesmo formato para todos)', () => {
    for (const distancia of [MINUTO, HORA, DIA]) {
      const resultado = formatTimeAgo(haQuantoTempo(distancia), 'agora');
      assert.match(resultado, /^\d+[mhd]$/);
    }
  });
});

describe('toDateKey', () => {
  it('põe zeros à esquerda no mês e no dia', () => {
    assert.equal(toDateKey(new Date(2026, 9, 5)), '2026-10-05');
    assert.equal(toDateKey(new Date(2026, 0, 9)), '2026-01-09');
  });

  it('não acrescenta zeros onde já não é preciso', () => {
    assert.equal(toDateKey(new Date(2026, 11, 31)), '2026-12-31');
  });

  it('ordena-se alfabeticamente como cronologicamente', () => {
    // É esta a propriedade que permite comparar dias com `<` em vez de os converter em Date -
    // ver o comentário do `isDisabled` em CalendarMonth.
    assert.ok(toDateKey(new Date(2026, 8, 30)) < toDateKey(new Date(2026, 9, 1)));
    assert.ok(toDateKey(new Date(2026, 11, 31)) < toDateKey(new Date(2027, 0, 1)));
  });

  it('usa a data local e não a data UTC', () => {
    // 00:30 locais. Com `toISOString()` (que converte para UTC), qualquer fuso a leste de
    // Greenwich devolveria aqui o dia anterior - e a agenda marcaria o dia errado. O teste nunca
    // falha num fuso a oeste, por isso não dá falsos positivos: só apanha a regressão.
    assert.equal(toDateKey(new Date(2026, 9, 5, 0, 30)), '2026-10-05');
  });

  it('atravessa corretamente a mudança de ano e de mês', () => {
    assert.equal(toDateKey(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
    assert.equal(toDateKey(new Date(2027, 0, 1, 0, 0)), '2027-01-01');
  });
});

describe('fromDateKey', () => {
  it('é o inverso de toDateKey', () => {
    assert.equal(toDateKey(fromDateKey('2026-10-05')), '2026-10-05');
    assert.equal(fromDateKey('2026-10-05').getDate(), 5);
  });

  it('constrói a data local, à meia-noite', () => {
    const data = fromDateKey('2026-10-05');

    assert.equal(data.getFullYear(), 2026);
    assert.equal(data.getMonth(), 9);
    assert.equal(data.getHours(), 0);
  });
});

describe('isDateKey', () => {
  it('aceita uma chave de data a sério', () => {
    assert.ok(isDateKey('2026-10-05'));
    // 2026 não é bissexto e fevereiro tem 28 dias.
    assert.ok(isDateKey('2026-02-28'));
  });

  it('recusa o que não tem a forma certa', () => {
    assert.ok(!isDateKey('amanhã'));
    assert.ok(!isDateKey('2026-10-5'));
    assert.ok(!isDateKey('05-10-2026'));
    assert.ok(!isDateKey('2026-10-05T09:00'));
    assert.ok(!isDateKey(''));
    assert.ok(!isDateKey(undefined));
    assert.ok(!isDateKey(null));
  });

  it('recusa um dia que não existe no calendário', () => {
    // Tem a forma certa e não existe: sem esta parte, o mês de um calendário era construído a
    // partir de uma data que o `Date` empurra para o dia 3 de março sem avisar ninguém.
    assert.ok(!isDateKey('2026-02-31'));
    assert.ok(!isDateKey('2026-13-01'));
    assert.ok(!isDateKey('2026-00-10'));
    assert.ok(!isDateKey('2026-04-31'));
  });
});

describe('toSessionKey', () => {
  it('junta o dia e a hora com um `T`, com zeros à esquerda', () => {
    // É o formato com que as sessões guardam `date` e `time` no Firestore; a hora vem de
    // `toTimeString()`, cujo início é sempre 'HH:mm' com dois dígitos.
    assert.equal(toSessionKey(new Date(2026, 8, 5, 9, 5)), '2026-09-05T09:05');
    assert.equal(toSessionKey(new Date(2026, 8, 14, 0, 0)), '2026-09-14T00:00');
  });

  it('compara-se como cronologicamente', () => {
    const manha = toSessionKey(new Date(2026, 8, 14, 9, 30));
    const tarde = toSessionKey(new Date(2026, 8, 14, 18, 0));
    const meiaHoraDepois = toSessionKey(new Date(2026, 8, 14, 18, 30));
    const amanha = toSessionKey(new Date(2026, 8, 15, 0, 0));

    assert.ok(manha < tarde);
    assert.ok(tarde < meiaHoraDepois);
    assert.ok(meiaHoraDepois < amanha);
  });

  it('atravessa corretamente a mudança de dia', () => {
    assert.ok(toSessionKey(new Date(2026, 8, 14, 23, 59)) < toSessionKey(new Date(2026, 8, 15, 0, 1)));
  });
});
