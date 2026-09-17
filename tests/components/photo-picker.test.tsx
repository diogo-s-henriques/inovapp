/**
 * Testes do `PhotoPicker` - o avatar que se toca para escolher a fotografia.
 *
 * Duas coisas se fixam aqui, e as duas vieram de queixas concretas:
 *
 * - **um toque, uma ação.** O toque abria a fotografia **em grande**, e era o "Alterar" dentro dessa
 *   vista que ia ao seletor. Custava um toque a mais (trocar de fotografia é o que se quer fazer
 *   quase sempre) e a espera pela animação de fecho do modal antes de o seletor poder arrancar. O
 *   que este teste prende é que o toque chega ao seletor **directamente**, com fotografia como sem
 *   ela - e que o `onPress` é chamado uma vez por toque, nem zero nem duas.
 * - **a espera mostra-se quando é longa.** Abrir a galeria é do sistema e demora; o avatar diz que
 *   está a caminho em vez de parecer um botão avariado, e volta ao normal quando a fotografia chega
 *   (ou quando a leitura falha).
 *
 * O caminho de fora - a galeria do sistema, o `expo-image-manipulator` - não se testa aqui: não é
 * render, é nativo. O que se pode prender é o contrato com o ecrã, que é `onPress`.
 */
import { act, fireEvent, render } from '@testing-library/react-native';

import { PhotoPicker } from '@/components/ui/PhotoPicker';
import { reportError } from '@/lib/error-reporting';
import { pt } from '@/i18n/pt';
import { useLocaleStore } from '@/i18n/store';

// O erro não se pode perder (é o que diz que a galeria falhou sem deixar a app presa), mas também
// não se quer a consola cheia de avisos de um erro que é de propósito: o relatório é um duplo, e
// assim o teste pode perguntar se ele foi chamado.
jest.mock('@/lib/error-reporting', () => ({ reportError: jest.fn() }));

const relatar = reportError as jest.Mock;

beforeEach(() => {
  useLocaleStore.getState().setLocale('pt');
  // A espera visível é temporizada (ver o componente): com timers falsos é quem testa que decide
  // quando ela aparece, em vez de dormir à espera que ela passe.
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

const PHOTO = 'data:image/jpeg;base64,AAAA';

/** Um pedido que fica pendente até o teste o mandar chegar - é assim que se olha para a espera. */
function pedidoPendente() {
  let resolver: (() => void) | undefined;
  let rejeitar: ((erro: unknown) => void) | undefined;
  const onPress = jest.fn(
    () =>
      new Promise<void>((resolve, reject) => {
        resolver = () => resolve();
        rejeitar = reject;
      }),
  );

  return { onPress, resolver: () => resolver?.(), rejeitar: (erro: unknown) => rejeitar?.(erro) };
}

/** A espera visível só aparece depois do atraso que a separa de um pedido rápido. */
async function esperarPeloIndicador() {
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
}

describe('<PhotoPicker />', () => {
  it('o toque vai direito ao seletor, com fotografia ou sem ela', async () => {
    const onPress = jest.fn();

    const semFoto = await render(<PhotoPicker initials="AH" onPress={onPress} />);
    await fireEvent.press(semFoto.getByLabelText(pt.common.addPhoto));
    expect(onPress).toHaveBeenCalledTimes(1);

    // A legenda "Alterar fotografia" é a mesma ação do avatar: quem já tem fotografia continua a
    // tocar no mesmo sítio, sem passar por vista nenhuma pelo meio.
    const comFoto = await render(<PhotoPicker uri={PHOTO} onPress={onPress} label={pt.profileEdit.changePhoto} />);
    await fireEvent.press(comFoto.getByLabelText(pt.profileEdit.changePhoto));
    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it('a espera longa mostra-se, e some quando a fotografia chega', async () => {
    const { onPress, resolver } = pedidoPendente();
    const { getByLabelText, getByText, queryByText } = await render(
      <PhotoPicker initials="AH" onPress={onPress} />,
    );

    await fireEvent.press(getByLabelText(pt.common.addPhoto));

    // Os primeiros instantes não se anunciam: um indicador a piscar não informa ninguém.
    expect(queryByText(pt.common.loadingPhoto)).toBeNull();

    await esperarPeloIndicador();
    expect(getByText(pt.common.loadingPhoto)).toBeTruthy();

    // Quem sabe quando a fotografia chegou é quem a foi buscar - a espera acaba quando ele resolve,
    // e não num tempo que nós decidíssemos.
    await act(async () => {
      resolver();
    });
    expect(queryByText(pt.common.loadingPhoto)).toBeNull();
  });

  it('um segundo toque durante a espera não abre duas galerias', async () => {
    const { onPress, resolver } = pedidoPendente();
    const { getByLabelText } = await render(<PhotoPicker initials="AH" onPress={onPress} />);

    // O travão é do pedido, não do indicador: segura o segundo toque desde o primeiro instante, e
    // não só a partir do momento em que a espera começa a ver-se.
    await fireEvent.press(getByLabelText(pt.common.addPhoto));
    await fireEvent.press(getByLabelText(pt.common.addPhoto));
    expect(onPress).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolver();
    });

    // Depois de o pedido acabar, o avatar volta a responder.
    await fireEvent.press(getByLabelText(pt.common.addPhoto));
    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it('uma leitura que falhou é relatada e o avatar volta ao normal', async () => {
    const { onPress, rejeitar } = pedidoPendente();
    const { getByLabelText, getByText, queryByText } = await render(
      <PhotoPicker initials="AH" onPress={onPress} />,
    );

    await fireEvent.press(getByLabelText(pt.common.addPhoto));
    await esperarPeloIndicador();
    expect(getByText(pt.common.loadingPhoto)).toBeTruthy();

    await act(async () => {
      rejeitar(new Error('a galeria falhou'));
    });

    expect(queryByText(pt.common.loadingPhoto)).toBeNull();
    expect(relatar).toHaveBeenCalledWith(expect.any(Error), 'fotografia');
  });

  it('o avatar diz para que serve a quem ainda não tem fotografia', async () => {
    const { getByLabelText, getByText, queryByText } = await render(<PhotoPicker initials="AH" onPress={jest.fn()} />);

    expect(getByLabelText(pt.common.addPhoto)).toBeTruthy();
    expect(getByText(pt.common.addPhoto)).toBeTruthy();
    expect(queryByText(pt.common.loadingPhoto)).toBeNull();
  });
});
