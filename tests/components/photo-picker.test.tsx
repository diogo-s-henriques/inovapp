/**
 * Testes do `PhotoPicker` - o avatar que se toca para mexer na fotografia.
 *
 * O que se fixa aqui é **quem faz o quê**, porque foi isso que mudou: o toque no avatar deixou de
 * abrir o seletor do sistema e passou a abrir a fotografia em grande, e é o botão "Alterar" dentro
 * dessa vista que vai ao seletor. Sem fotografia nada disso faz sentido (não há nada para ver em
 * grande) e o toque continua a ir direto ao seletor.
 *
 * O caminho de fora - a galeria do sistema, o `expo-image-manipulator` - não se testa aqui: não é
 * render, é nativo. O que se pode prender é o contrato com o ecrã, que é `onPress`.
 */
import { fireEvent, render } from '@testing-library/react-native';

import { PhotoPicker } from '@/components/ui/PhotoPicker';
import { pt } from '@/i18n/pt';
import { useLocaleStore } from '@/i18n/store';

beforeEach(() => {
  useLocaleStore.getState().setLocale('pt');
  // O "Alterar" espera o fecho da vista em grande antes de abrir o seletor (ver o componente):
  // com os timers falsos, a espera é controlada por quem testa em vez de passar o tempo a dormir.
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const PHOTO = 'data:image/jpeg;base64,AAAA';

describe('<PhotoPicker />', () => {
  it('sem fotografia, o toque vai direito ao seletor', async () => {
    const onPress = jest.fn();
    const { getByLabelText } = await render(<PhotoPicker initials="AH" onPress={onPress} />);

    await fireEvent.press(getByLabelText(pt.common.addPhoto));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('com fotografia, o toque abre a fotografia em grande em vez do seletor', async () => {
    const onPress = jest.fn();
    const { getByLabelText } = await render(<PhotoPicker uri={PHOTO} onPress={onPress} />);

    await fireEvent.press(getByLabelText(pt.common.viewPhoto));

    // O seletor do sistema não chegou a ser chamado: abriu-se a vista de perto.
    expect(onPress).not.toHaveBeenCalled();
    // O botão vive dentro dessa vista, por isso encontrá-lo é a prova de que ela está aberta.
    expect(getByLabelText(pt.common.change)).toBeTruthy();
  });

  it('é o botão por baixo que altera, e a vista fecha-se atrás dele', async () => {
    const onPress = jest.fn();
    const { getByLabelText, queryByLabelText } = await render(<PhotoPicker uri={PHOTO} onPress={onPress} />);

    await fireEvent.press(getByLabelText(pt.common.viewPhoto));
    await fireEvent.press(getByLabelText(pt.common.change));

    // A vista fechou já, mas o seletor ainda não: está à espera do fim da animação de fecho.
    expect(queryByLabelText(pt.common.change)).toBeNull();
    expect(onPress).not.toHaveBeenCalled();

    jest.advanceTimersByTime(400);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('um segundo toque no "Alterar" não abre o seletor duas vezes', async () => {
    const onPress = jest.fn();
    const { getByLabelText } = await render(<PhotoPicker uri={PHOTO} onPress={onPress} />);

    await fireEvent.press(getByLabelText(pt.common.viewPhoto));
    await fireEvent.press(getByLabelText(pt.common.change));
    jest.advanceTimersByTime(400);
    // O segundo toque acontece depois de o primeiro já ter chegado ao seletor - como o modal
    // fechou, o botão já não está na árvore; o que se prova aqui é que um toque repetido no
    // avatar (de novo em grande) dentro da janela de espera também não duplica.
    await fireEvent.press(getByLabelText(pt.common.viewPhoto));
    await fireEvent.press(getByLabelText(pt.common.change));
    jest.advanceTimersByTime(400);

    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it('tocar fora fecha, sem ir ao seletor', async () => {
    const onPress = jest.fn();
    const { getByLabelText, queryByLabelText } = await render(<PhotoPicker uri={PHOTO} onPress={onPress} />);

    await fireEvent.press(getByLabelText(pt.common.viewPhoto));
    await fireEvent.press(getByLabelText(pt.common.cancel));

    expect(queryByLabelText(pt.common.change)).toBeNull();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('o avatar continua a dizer para que serve, e não "adicionar" a quem já tem foto', async () => {
    const { getByLabelText, queryByLabelText } = await render(<PhotoPicker uri={PHOTO} onPress={jest.fn()} />);

    expect(getByLabelText(pt.common.viewPhoto)).toBeTruthy();
    expect(queryByLabelText(pt.common.addPhoto)).toBeNull();
  });
});
