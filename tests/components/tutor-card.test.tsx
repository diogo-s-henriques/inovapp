/**
 * Testes do `TutorCard` - a pessoa nas listas de ligações da Home.
 *
 * O que vale a pena fixar é o botão de dentro. O cartão inteiro abre o perfil, e o botão é uma
 * segunda ação **dentro** dele: se o toque no botão escapar para o cartão, carregar em "Marcar
 * sessão" abre o perfil - e o utilizador fica a olhar para outra coisa, convencido de que a app
 * não fez nada. É o tipo de erro que só se vê a usar.
 *
 * E o botão é opcional por uma razão de domínio: quem já é teu contacto pode receber um pedido de
 * sessão daqui, mas uma sugestão de alguém com quem nunca falaste não pode (primeiro há a ligação,
 * e essa decide-se nos Matches). Sem rótulo, não há botão.
 */
import { fireEvent, render } from '@testing-library/react-native';

import { TutorCard } from '@/components/domain/TutorCard';

const BASE = {
  firstName: 'Ana',
  lastName: 'Silva',
  course: 'LEIC',
  year: '3.º ano',
};

describe('<TutorCard /> - a pessoa', () => {
  it('mostra o nome e o curso com o ano', async () => {
    const { getByText, queryByText } = await render(<TutorCard {...BASE} onPress={jest.fn()} />);

    expect(getByText('Ana Silva')).toBeTruthy();
    expect(getByText('LEIC · 3.º ano')).toBeTruthy();
    // O separador é o ponto médio, não uma vírgula: é o mesmo que o perfil usa para juntar os dois.
    expect(queryByText('LEIC, 3.º ano')).toBeNull();
  });

  it('o nome e o curso ficam presos a uma linha cada', async () => {
    const { getByText } = await render(<TutorCard {...BASE} onPress={jest.fn()} />);

    expect(getByText('Ana Silva').props.numberOfLines).toBe(1);
    expect(getByText('LEIC · 3.º ano').props.numberOfLines).toBe(1);
  });

  it('o toque no cartão abre o perfil', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<TutorCard {...BASE} onPress={onPress} />);

    await fireEvent.press(getByText('Ana Silva'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('<TutorCard /> - o botão de dentro', () => {
  it('sem rótulo não há botão nenhum', async () => {
    const { queryByLabelText } = await render(<TutorCard {...BASE} onPress={jest.fn()} />);

    expect(queryByLabelText('Marcar sessão')).toBeNull();
  });

  it('com rótulo, o toque é do botão e não do cartão', async () => {
    const onPress = jest.fn();
    const onPressAction = jest.fn();
    const { getByLabelText } = await render(
      <TutorCard {...BASE} onPress={onPress} actionLabel="Marcar sessão" onPressAction={onPressAction} />,
    );

    await fireEvent.press(getByLabelText('Marcar sessão'));

    expect(onPressAction).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });
});
