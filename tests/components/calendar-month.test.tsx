/**
 * Testes de `CalendarMonth` - a grelha de datas usada no ecrã de pedido de sessão e na agenda.
 *
 * O que interessa aqui é a grelha em si (células, dias desativados, marcadores, seleção) e a
 * navegação de mês, que tem de atravessar a mudança de ano. A chave de data `toDateKey`, que a
 * grelha usa para comparar dias, vive agora em `src/lib/time.ts` e é testada sem React em
 * tests/lib/time.test.mts - aqui importa-se, não se testa.
 */
import { fireEvent, render } from '@testing-library/react-native';

import { CalendarMonth } from '@/components/domain/CalendarMonth';
import { pt } from '@/i18n/pt';
import { useLocaleStore } from '@/i18n/store';

const OUTUBRO_2026 = new Date(2026, 9, 1);

beforeEach(() => {
  useLocaleStore.getState().setLocale('pt');
});

describe('<CalendarMonth /> - grelha', () => {
  it('mostra o mês e o ano do mês recebido', async () => {
    const { getByText } = await render(
      <CalendarMonth month={OUTUBRO_2026} onChangeMonth={jest.fn()} onSelectDate={jest.fn()} />,
    );

    expect(getByText(`${pt.calendar.months[9]} 2026`)).toBeTruthy();
  });

  it('mostra os cabeçalhos dos dias da semana', async () => {
    const { getAllByText } = await render(
      <CalendarMonth month={OUTUBRO_2026} onChangeMonth={jest.fn()} onSelectDate={jest.fn()} />,
    );

    // Em português os dias da semana são letras soltas e repetem-se ('S', 'T'), por isso não se
    // pode pedir um elemento único: conta-se quantas vezes cada letra aparece no dicionário.
    const esperadas = new Map<string, number>();
    for (const dia of pt.calendar.weekdays) {
      esperadas.set(dia, (esperadas.get(dia) ?? 0) + 1);
    }

    expect(pt.calendar.weekdays).toHaveLength(7);
    for (const [dia, vezes] of esperadas) {
      expect(getAllByText(dia)).toHaveLength(vezes);
    }
  });

  it('tem uma célula por dia do mês, nem mais nem menos', async () => {
    const { getByLabelText, queryByLabelText } = await render(
      <CalendarMonth month={OUTUBRO_2026} onChangeMonth={jest.fn()} onSelectDate={jest.fn()} />,
    );

    // Outubro tem 31 dias; o dia 32 não pode existir como chave de data.
    expect(getByLabelText('2026-10-01')).toBeTruthy();
    expect(getByLabelText('2026-10-31')).toBeTruthy();
    expect(queryByLabelText('2026-11-01')).toBeNull();
  });
});

describe('<CalendarMonth /> - escolher um dia', () => {
  it('devolve a chave do dia tocado', async () => {
    const onSelectDate = jest.fn();
    const { getByLabelText } = await render(
      <CalendarMonth month={OUTUBRO_2026} onChangeMonth={jest.fn()} onSelectDate={onSelectDate} />,
    );

    await fireEvent.press(getByLabelText('2026-10-05'));

    expect(onSelectDate).toHaveBeenCalledWith('2026-10-05');
    expect(onSelectDate).toHaveBeenCalledTimes(1);
  });

  it('não deixa escolher um dia anterior ao mínimo', async () => {
    const onSelectDate = jest.fn();
    const { getByLabelText } = await render(
      <CalendarMonth
        month={OUTUBRO_2026}
        minDate="2026-10-10"
        onChangeMonth={jest.fn()}
        onSelectDate={onSelectDate}
      />,
    );

    await fireEvent.press(getByLabelText('2026-10-04'));

    expect(onSelectDate).not.toHaveBeenCalled();
  });

  it('o próprio dia mínimo já pode ser escolhido', async () => {
    const onSelectDate = jest.fn();
    const { getByLabelText } = await render(
      <CalendarMonth
        month={OUTUBRO_2026}
        minDate="2026-10-10"
        onChangeMonth={jest.fn()}
        onSelectDate={onSelectDate}
      />,
    );

    await fireEvent.press(getByLabelText('2026-10-10'));

    expect(onSelectDate).toHaveBeenCalledWith('2026-10-10');
  });
});

describe('<CalendarMonth /> - navegação de mês', () => {
  it('avança um mês mantendo o dia 1', async () => {
    const onChangeMonth = jest.fn();
    const { getByLabelText } = await render(
      <CalendarMonth month={OUTUBRO_2026} onChangeMonth={onChangeMonth} onSelectDate={jest.fn()} />,
    );

    await fireEvent.press(getByLabelText(pt.calendar.nextMonth));

    expect(onChangeMonth).toHaveBeenCalledTimes(1);
    const seguinte = onChangeMonth.mock.calls[0][0] as Date;
    expect(seguinte.getMonth()).toBe(10);
    expect(seguinte.getDate()).toBe(1);
  });

  it('recua para dezembro quando está em janeiro', async () => {
    const onChangeMonth = jest.fn();
    const { getByLabelText } = await render(
      <CalendarMonth month={new Date(2026, 0, 1)} onChangeMonth={onChangeMonth} onSelectDate={jest.fn()} />,
    );

    await fireEvent.press(getByLabelText(pt.calendar.previousMonth));

    const anterior = onChangeMonth.mock.calls[0][0] as Date;
    expect(anterior.getFullYear()).toBe(2025);
    expect(anterior.getMonth()).toBe(11);
  });
});
