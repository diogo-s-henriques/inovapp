/**
 * Testes do `ConfirmModal` - a caixa que pergunta o que não se pode perguntar depois de fazer.
 *
 * O que se fixa aqui, e porque:
 *
 * 1. **O ícone é o da ação**, e não um símbolo genérico. Era um "?" fixo nas quatro confirmações da
 *    app - o mesmo ponto de interrogação para "Terminar sessão?" e para "Apagar conta?", quando a
 *    pergunta já está escrita por baixo dele. O teste compara o que é desenhado com dois ícones
 *    diferentes: se o componente ignorasse o que lhe dão, os dois saíam iguais.
 * 2. **A descrição é opcional** e, sem ela, não fica uma linha vazia a ocupar o lugar dela no
 *    cartão. Foi o que aconteceu ao "Terminar sessão?", que explicava "Vais precisar de entrar outra
 *    vez com o teu email institucional." a quem já entrou com ele.
 * 3. **A cor é do peso da decisão** (`tone`), e não do ecrã: é o que separa o que se desfaz
 *    (terminar sessão) do que não se desfaz (apagar a conta, bloquear alguém).
 * 4. **As duas saídas não se confundem**: cancelar e confirmar chegam a sítios diferentes - um modal
 *    de confirmação em que os dois botões fazem o mesmo não confirma nada.
 *
 * Nota: a partir do `@testing-library/react-native` v14, `render` e `fireEvent` são assíncronos, e
 * as consultas por tipo (`UNSAFE_getByType`) já não existem - a árvore lê-se pelos filhos.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Colors, IconSize } from '@/constants/theme';
import { pt } from '@/i18n/pt';
import { useLocaleStore } from '@/i18n/store';

beforeEach(() => {
  useLocaleStore.getState().setLocale('pt');
});

/** O caso do "Sair", que é o que não tem descrição. */
const BASE = {
  visible: true,
  title: pt.myProfile.signOutConfirmTitle,
  icon: 'log-out-outline' as const,
  confirmLabel: pt.myProfile.signOutConfirm,
  cancelLabel: pt.common.cancel,
};

interface NoDesenhado {
  props?: { style?: unknown };
  children?: unknown[];
}

function filho(pai: unknown, indice: number): NoDesenhado {
  const filhos = (pai as NoDesenhado | undefined)?.children;
  return (Array.isArray(filhos) ? filhos[indice] : undefined) as NoDesenhado;
}

/**
 * O cartão, o círculo e o símbolo, a partir do título: o título é o que se vê e o que se procura, e
 * é por ele que se chega ao resto. O círculo é o primeiro filho do cartão (o ícone vem sempre
 * primeiro) e o símbolo é o que está dentro dele.
 */
function iconeDe(titulo: { parent?: unknown }) {
  const cartao = titulo.parent as NoDesenhado;
  const circulo = filho(cartao, 0);
  const simbolo = filho(circulo, 0);

  return {
    cartao,
    circulo,
    simbolo,
    estiloDoCirculo: StyleSheet.flatten(circulo.props?.style) as { backgroundColor?: string },
    estiloDoSimbolo: StyleSheet.flatten(simbolo.props?.style) as {
      color?: string;
      fontSize?: number;
    },
    /** O carácter desenhado (o nome do ícone já foi traduzido por quem o desenha). */
    glifo: filho(simbolo, 0),
  };
}

const desenhar = (props: Record<string, unknown> = {}) =>
  render(<ConfirmModal {...BASE} onConfirm={jest.fn()} onCancel={jest.fn()} {...props} />);

describe('<ConfirmModal />', () => {
  it('diz o que vai acontecer e pede as duas saídas', async () => {
    const { getByText } = await desenhar();

    expect(getByText(pt.myProfile.signOutConfirmTitle)).toBeOnTheScreen();
    expect(getByText(pt.myProfile.signOutConfirm)).toBeOnTheScreen();
    expect(getByText(pt.common.cancel)).toBeOnTheScreen();
  });

  it('mostra a explicação quando o ecrã tem uma para dar', async () => {
    const { getByText } = await desenhar({
      description: pt.otherProfile.blockConfirmDescription('Ana'),
    });

    expect(getByText(pt.otherProfile.blockConfirmDescription('Ana'))).toBeOnTheScreen();
  });

  it('sem explicação, o cartão não fica com uma linha vazia a ocupar o lugar dela', async () => {
    const { getByText } = await desenhar();

    // O cartão é o ícone, o título e as ações. Com descrição seriam quatro - e a diferença entre
    // três e quatro é a altura que a caixa ganha (ou não) por uma frase.
    expect(iconeDe(getByText(pt.myProfile.signOutConfirmTitle)).cartao.children).toHaveLength(3);
  });

  it('desenha o ícone que o ecrã escolheu, e não um que esteja aqui fixo', async () => {
    const saida = await desenhar({ icon: 'log-out-outline' });
    const apagar = await desenhar({ icon: 'trash-outline' });

    const glifoDaSaida = iconeDe(saida.getByText(pt.myProfile.signOutConfirmTitle)).glifo;
    const glifoDoApagar = iconeDe(apagar.getByText(pt.myProfile.signOutConfirmTitle)).glifo;

    // O nome do ícone não sobrevive ao desenho (é traduzido num carácter), por isso o que se
    // compara é o carácter: dois ícones diferentes desenham, por definição, coisas diferentes.
    expect(glifoDaSaida).not.toEqual(glifoDoApagar);
  });

  it('o ícone é do tamanho dos ícones de estado, num círculo de 64', async () => {
    const { getByText } = await desenhar();

    expect(iconeDe(getByText(pt.myProfile.signOutConfirmTitle)).estiloDoSimbolo.fontSize).toBe(
      IconSize.state,
    );
  });

  it('o vermelho é do que não se desfaz, e o acento é do resto', async () => {
    const perigoso = iconeDe(
      (await desenhar({ tone: 'danger', icon: 'trash-outline' })).getByText(
        pt.myProfile.signOutConfirmTitle,
      ),
    );
    const normal = iconeDe((await desenhar()).getByText(pt.myProfile.signOutConfirmTitle));

    expect(perigoso.estiloDoCirculo.backgroundColor).toBe(Colors.dangerSoft);
    expect(perigoso.estiloDoSimbolo.color).toBe(Colors.danger);

    // Terminar sessão desfaz-se entrando outra vez: não leva o vermelho do que é definitivo.
    expect(normal.estiloDoCirculo.backgroundColor).toBe(Colors.primarySoft);
    expect(normal.estiloDoSimbolo.color).toBe(Colors.primary);
  });

  it('cancelar e confirmar chegam ao ecrã, cada um ao seu', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    const { getByLabelText } = await desenhar({ onConfirm, onCancel });

    await fireEvent.press(getByLabelText(pt.common.cancel));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();

    await fireEvent.press(getByLabelText(pt.myProfile.signOutConfirm));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
