/**
 * Testes do `RetryNotice` - o aviso de uma leitura que falhou, com uma segunda tentativa.
 *
 * O que se fixa aqui é a única coisa que ele tem de fazer: dizer o que falhou e dar uma saída. Sem
 * o botão, o aviso é um beco sem saída (um `onSnapshot` que falha não volta sozinho); sem a
 * mensagem, um botão sem razão.
 *
 * O texto do botão vem do dicionário (`common.tryAgain`), e não do ecrã: é a mesma frase que a Home
 * e os Matches já usavam para o mesmo gesto.
 */
import { fireEvent, render } from '@testing-library/react-native';

import { RetryNotice } from '@/components/ui/RetryNotice';
import { pt } from '@/i18n/pt';
import { useLocaleStore } from '@/i18n/store';

beforeEach(() => {
  useLocaleStore.getState().setLocale('pt');
});

describe('<RetryNotice />', () => {
  it('diz o que é que falhou', async () => {
    const { getByText } = await render(
      <RetryNotice message={pt.requests.loadError} onRetry={jest.fn()} />,
    );

    expect(getByText(pt.requests.loadError)).toBeTruthy();
  });

  it('dá uma segunda tentativa', async () => {
    const onRetry = jest.fn();
    const { getByLabelText } = await render(
      <RetryNotice message={pt.requests.loadError} onRetry={onRetry} />,
    );

    await fireEvent.press(getByLabelText(pt.common.tryAgain));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('a mensagem mudou em inglês', async () => {
    useLocaleStore.getState().setLocale('en');
    const { getByText, queryByText } = await render(
      <RetryNotice message={pt.requests.loadError} onRetry={jest.fn()} />,
    );

    // A mensagem é do ecrã (passada por prop); o botão é do dicionário, e tem de acompanhar o
    // idioma escolhido.
    expect(queryByText(pt.common.tryAgain)).toBeNull();
    expect(getByText('Try again')).toBeTruthy();
  });
});
