/**
 * Testes do `BackButton` e do `StackHeader` - o cabeçalho dos ecrãs empilhados.
 *
 * O que aqui se fixa é a inconsistência que isto veio desfazer: os ecrãs empilhados andaram com
 * **três** botões de voltar diferentes (um chevron de 22 px nu, um círculo de 36 com contorno, um
 * círculo de 36 sobre a fotografia) para a mesma ação. O tamanho é o único que não se vê num teste
 * de conteúdo - um botão estreito continua a voltar para trás -, por isso é ele que se mede: é um
 * **limite** (≥ 36 px de lado, o do valor de hoje), para o próximo ecrã não voltar a desenhá-lo
 * mais pequeno sem ninguém dar por isso.
 *
 * O rótulo é a outra metade: é um ícone sem texto, e sem `label` não há nada que um leitor de ecrã
 * anuncie nem forma de o teste lhe chegar.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { BackButton, BACK_BUTTON_SIZE } from '@/components/ui/BackButton';
import { StackHeader } from '@/components/domain/StackHeader';
import { Colors } from '@/constants/theme';
import { pt } from '@/i18n/pt';
import { useLocaleStore } from '@/i18n/store';

beforeEach(() => {
  useLocaleStore.getState().setLocale('pt');
});

/** O estilo achatado do elemento que carrega o rótulo (o `Pressable` do botão). */
function estiloDoBotao(no: { props: { style?: unknown } }): Record<string, unknown> {
  return StyleSheet.flatten(no.props.style as never) as Record<string, unknown>;
}

describe('<BackButton />', () => {
  it('volta, e anuncia-se a quem não vê o ícone', async () => {
    const onPress = jest.fn();
    const { getByLabelText } = await render(<BackButton label={pt.sessions.back} onPress={onPress} />);

    await fireEvent.press(getByLabelText(pt.sessions.back));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('o alvo do toque é do tamanho do tema, e não do símbolo', async () => {
    const { getByLabelText } = await render(<BackButton label="Voltar" onPress={jest.fn()} />);

    const estilo = estiloDoBotao(getByLabelText('Voltar'));

    // O símbolo tem 22 px; o botão tem de ser maior do que isso, senão o toque fica do tamanho do
    // desenho. Foi a diferença entre os três botões antigos que este teste veio impedir.
    expect(estilo.width).toBe(BACK_BUTTON_SIZE);
    expect(estilo.height).toBe(BACK_BUTTON_SIZE);
    expect(BACK_BUTTON_SIZE).toBeGreaterThanOrEqual(36);
    expect(estilo.width as number).toBeGreaterThan(22);
  });

  it('sobre uma fotografia leva fundo próprio; sobre o fundo do ecrã não', async () => {
    const sobreFoto = await render(<BackButton label="Voltar" onPress={jest.fn()} variant="surface" />);
    const semFundo = await render(<BackButton label="Voltar" onPress={jest.fn()} />);

    expect(estiloDoBotao(sobreFoto.getByLabelText('Voltar')).backgroundColor).toBe(Colors.surface);
    // `plain`: sem fundo nenhum, para o chevron assentar diretamente sobre o cinzento do ecrã.
    expect(estiloDoBotao(semFundo.getByLabelText('Voltar')).backgroundColor).toBeUndefined();
  });
});

describe('<StackHeader />', () => {
  it('diz o nome do ecrã', async () => {
    const { getByText } = await render(
      <StackHeader title={pt.sessions.title} backLabel={pt.sessions.back} onBack={jest.fn()} />,
    );

    expect(getByText(pt.sessions.title)).toBeTruthy();
  });

  it('a seta volta atrás', async () => {
    const onBack = jest.fn();
    const { getByLabelText } = await render(
      <StackHeader title={pt.sessions.title} backLabel={pt.sessions.back} onBack={onBack} />,
    );

    await fireEvent.press(getByLabelText(pt.sessions.back));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('o botão de voltar vive dentro do cabeçalho, não em cada ecrã', async () => {
    // É o que faz com que seis ecrãs não possam divergir outra vez: quem quiser mudar o botão tem
    // de o mudar aqui. Se ele voltasse a ser desenhado pelo ecrã, o rótulo continuaria a existir
    // mas este `render` (só com o cabeçalho) deixava de o encontrar.
    const { getByLabelText } = await render(
      <StackHeader title={pt.materials.title} backLabel={pt.materials.back} onBack={jest.fn()} />,
    );

    expect(getByLabelText(pt.materials.back)).toBeTruthy();
  });

  it('desenha a ação do canto quando o ecrã tem uma', async () => {
    const { getByText } = await render(
      <StackHeader
        title={pt.materials.title}
        backLabel={pt.materials.back}
        onBack={jest.fn()}
        rightAction={<Text>Filtro</Text>}
      />,
    );

    expect(getByText('Filtro')).toBeTruthy();
  });
});
