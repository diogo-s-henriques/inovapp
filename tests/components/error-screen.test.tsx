/**
 * Testes do `ErrorScreen` - o ecrã que substitui o que rebentou.
 *
 * O que se fixa é que ele faz **duas** coisas: diz o que aconteceu e dá por onde sair. Sem a
 * segunda, é um beco sem saída (é o que a app era antes: um erro em produção fechava-a); sem a
 * primeira, um botão sem razão.
 *
 * A mensagem técnica do erro é a única que não se fixa em produção: em desenvolvimento aparece
 * (é o que se lê primeiro quando algo rebenta), em produção não (não serve a quem usa a app e pode
 * conter dados internos).
 */
import { fireEvent, render } from '@testing-library/react-native';

import { ErrorScreen } from '@/components/domain/ErrorScreen';
import { pt } from '@/i18n/pt';
import { useLocaleStore } from '@/i18n/store';

beforeEach(() => {
  useLocaleStore.getState().setLocale('pt');
});

describe('<ErrorScreen />', () => {
  it('diz o que aconteceu', async () => {
    const { getByText } = await render(<ErrorScreen onRetry={jest.fn()} />);

    expect(getByText(pt.common.errorTitle)).toBeTruthy();
    expect(getByText(pt.common.errorBody)).toBeTruthy();
  });

  it('dá uma segunda tentativa', async () => {
    const onRetry = jest.fn();
    const { getByLabelText } = await render(<ErrorScreen onRetry={onRetry} />);

    await fireEvent.press(getByLabelText(pt.common.tryAgain));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('mostra o detalhe técnico em desenvolvimento e não o inventa quando não há erro', async () => {
    const comErro = await render(<ErrorScreen error={new Error('x is not a function')} onRetry={jest.fn()} />);
    const semErro = await render(<ErrorScreen onRetry={jest.fn()} />);

    expect(comErro.getByText('x is not a function')).toBeTruthy();
    // Um `retry` sem erro nenhum tem de continuar a desenhar o mesmo ecrã - e não uma linha vazia.
    expect(semErro.queryByText('x is not a function')).toBeNull();
  });

  it('aguenta um erro que não é um Error (um `throw` de texto)', async () => {
    const { getByText } = await render(<ErrorScreen error="rebentou" onRetry={jest.fn()} />);

    expect(getByText('rebentou')).toBeTruthy();
  });

  it('o texto acompanha o idioma escolhido', async () => {
    useLocaleStore.getState().setLocale('en');
    const { getByText, queryByText } = await render(<ErrorScreen onRetry={jest.fn()} />);

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(queryByText(pt.common.errorTitle)).toBeNull();
  });
});
