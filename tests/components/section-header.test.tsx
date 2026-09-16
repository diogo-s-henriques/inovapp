/**
 * Testes do `SectionHeader` — o título de uma secção da Home, com contagem e ação opcionais.
 *
 * A contagem tem uma regra que é fácil de perder: **zero não se mostra**. Uma secção que anuncia
 * "0" está a chamar a atenção para o facto de não haver nada, e as secções que usam isto (as
 * pendências, por exemplo) já não se desenham quando estão vazias. Um "0" que aparecesse seria o
 * dobro do mesmo erro.
 */
import { fireEvent, render } from '@testing-library/react-native';

import { SectionHeader } from '@/components/ui/SectionHeader';

describe('<SectionHeader /> — a contagem', () => {
  it('mostra o número quando há coisas', async () => {
    const { getByText } = await render(<SectionHeader title="Precisa de ti" badge={6} />);

    expect(getByText('6')).toBeTruthy();
  });

  it('uma só coisa também é uma contagem', async () => {
    // O limite é o zero, e não "mais do que um": uma coisa à espera é uma coisa à espera.
    const { getByText } = await render(<SectionHeader title="Precisa de ti" badge={1} />);

    expect(getByText('1')).toBeTruthy();
  });

  it('com zero não mostra nada', async () => {
    const { queryByText } = await render(<SectionHeader title="Precisa de ti" badge={0} />);

    expect(queryByText('0')).toBeNull();
  });

  it('sem contagem não mostra nada', async () => {
    const { queryByText } = await render(<SectionHeader title="Tutores para ti" />);

    expect(queryByText('0')).toBeNull();
  });

  it('o número não é o título: os dois aparecem', async () => {
    const { getByText } = await render(<SectionHeader title="Recentes" badge={2} />);

    expect(getByText('Recentes')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
  });
});

describe('<SectionHeader /> — a ação', () => {
  it('sem rótulo não há ação nenhuma', async () => {
    const { queryByLabelText } = await render(<SectionHeader title="Recentes" />);

    expect(queryByLabelText('Ver todos')).toBeNull();
  });

  it('com rótulo, o toque chega ao ecrã', async () => {
    const onPressAction = jest.fn();
    const { getByLabelText } = await render(
      <SectionHeader title="Recentes" actionLabel="Ver todos" onPressAction={onPressAction} />,
    );

    await fireEvent.press(getByLabelText('Ver todos'));

    expect(onPressAction).toHaveBeenCalledTimes(1);
  });
});
