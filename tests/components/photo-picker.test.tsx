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

/**
 * O `Modal` do React Native não deixa o elemento do sistema na árvore de teste (só o conteúdo
 * dele), e é no elemento do sistema que o `onDismiss` vive - o `Modal` passa-o ao
 * `RCTModalHostView`, que o chama quando a apresentação acaba (ver Modal.js). Este duplo põe-no
 * lá, e é o que permite ao teste fazer a pergunta que interessa depois desta mudança: **o
 * componente entrega mesmo este aviso ao Modal?** Foi ele que substituiu a espera adivinhada, e um
 * nome de prop trocado era a única forma de esta correção passar despercebida.
 */
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const React = require('react');
  const { View } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({ visible, onDismiss, children }: { visible?: boolean; onDismiss?: () => void; children?: unknown }) =>
      visible ? React.createElement(View, { onDismiss }, children) : null,
  };
});

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

/** O mínimo que se precisa de um nó da árvore para o encontrar por uma das suas props. */
interface NoDaArvore {
  props: { onDismiss?: () => void };
  children?: unknown[];
}

/** Procura na árvore o primeiro nó que responda ao predicado (as consultas não chegam para isto). */
function procurar(no: unknown, predicado: (candidato: NoDaArvore) => boolean): NoDaArvore | undefined {
  if (no === null || typeof no !== 'object') return undefined;

  const candidato = no as NoDaArvore;
  if (typeof candidato.props !== 'object' || candidato.props === null) return undefined;
  if (predicado(candidato)) return candidato;

  for (const filho of Array.isArray(candidato.children) ? candidato.children : []) {
    const encontrado = procurar(filho, predicado);
    if (encontrado) return encontrado;
  }

  return undefined;
}

/**
 * O `onDismiss` do modal, tal como **o sistema** o chama.
 *
 * Chamá-lo é o mais perto que um teste chega do iOS a fechar a vista - e é isso que se quer fixar:
 * **quando ele chega, o seletor abre na hora**, sem esperar pelo temporizador.
 *
 * Procura-se a partir do **contentor** (e não do `root`) porque o modal é irmão do avatar, não seu
 * filho: o `root` é o primeiro elemento desenhado, e a vista vive ao lado dele.
 */
function avisoDeQueOModalDesapareceu(contentor: unknown): () => void {
  const modal = procurar(contentor, (candidato) => typeof candidato.props.onDismiss === 'function');

  if (!modal?.props.onDismiss) throw new Error('o modal não está na árvore');
  return modal.props.onDismiss;
}

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

  it('o aviso de que a vista desapareceu abre o seletor no mesmo instante', async () => {
    const onPress = jest.fn();
    const { getByLabelText, container } = await render(<PhotoPicker uri={PHOTO} onPress={onPress} />);

    await fireEvent.press(getByLabelText(pt.common.viewPhoto));
    // O aviso é apanhado com a vista ainda aberta: é o sistema que o dispara **enquanto** a fecha,
    // e a partir daí o modal já saiu da árvore.
    const desapareceu = avisoDeQueOModalDesapareceu(container);
    await fireEvent.press(getByLabelText(pt.common.change));

    // Sem tempo nenhum a passar: é o sinal exato ("o modal desapareceu") que manda, e não a
    // estimativa que aqui estava. Era esta a lentidão do botão - a espera somava-se à animação de
    // fecho em vez de esperar por ela.
    desapareceu();

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('e o temporizador que fica por baixo não volta a abri-lo', async () => {
    const onPress = jest.fn();
    const { getByLabelText, container } = await render(<PhotoPicker uri={PHOTO} onPress={onPress} />);

    await fireEvent.press(getByLabelText(pt.common.viewPhoto));
    const desapareceu = avisoDeQueOModalDesapareceu(container);
    await fireEvent.press(getByLabelText(pt.common.change));
    desapareceu();

    // Os dois caminhos chegam ao mesmo sítio; quem chega primeiro anula o outro.
    jest.advanceTimersByTime(1000);
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
