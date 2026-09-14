/**
 * Testes de `NextSessionCard` — o destaque da próxima sessão no ecrã inicial.
 *
 * O botão "Entrar" deste cartão esteve ligado a um handler vazio (`onPressJoin={() => {}}`):
 * carregar nele não fazia absolutamente nada, sem nenhum feedback. Não há videochamada nesta
 * versão, por isso o ecrã passa-lhe um aviso a explicar isso. O que aqui se fixa é o contrato do
 * componente: o toque tem de chegar ao handler que o ecrã lhe der. (Que o ecrã lhe dê mesmo um
 * handler, e não um vazio, só se verifica ao ler o ecrã — não há testes de ecrãs.)
 *
 * Nota sobre a API: a partir do `@testing-library/react-native` v14, `render` e `fireEvent` são
 * assíncronos (o React 19 deixou de suportar o `react-test-renderer`, que era síncrono).
 */
import { fireEvent, render } from '@testing-library/react-native';

import { NextSessionCard } from '@/components/domain/NextSessionCard';
import { en } from '@/i18n/en';
import { pt } from '@/i18n/pt';
import { useLocaleStore } from '@/i18n/store';

const BASE = {
  tutorName: 'Bruno Costa',
  subject: 'Matemática',
  schedule: 'Hoje, 15:00',
};

beforeEach(() => {
  useLocaleStore.getState().setLocale('pt');
});

describe('<NextSessionCard /> — conteúdo', () => {
  it('mostra o nome de quem dá a sessão, a disciplina e o horário', async () => {
    const { getByText } = await render(<NextSessionCard {...BASE} onPressJoin={jest.fn()} />);

    expect(getByText(pt.home.nextSession)).toBeTruthy();
    expect(getByText('Bruno Costa')).toBeTruthy();
    expect(getByText('Matemática · Hoje, 15:00')).toBeTruthy();
  });
});

describe('<NextSessionCard /> — o botão "Entrar"', () => {
  it('o toque chega ao handler do ecrã', async () => {
    const onPressJoin = jest.fn();
    const { getByLabelText } = await render(<NextSessionCard {...BASE} onPressJoin={onPressJoin} />);

    await fireEvent.press(getByLabelText(pt.home.join));

    expect(onPressJoin).toHaveBeenCalledTimes(1);
  });

  it('o rótulo segue o idioma escolhido', async () => {
    useLocaleStore.getState().setLocale('en');

    const { getByLabelText, queryByLabelText } = await render(
      <NextSessionCard {...BASE} onPressJoin={jest.fn()} />,
    );

    expect(getByLabelText(en.home.join)).toBeTruthy();
    expect(queryByLabelText(pt.home.join)).toBeNull();
  });
});
