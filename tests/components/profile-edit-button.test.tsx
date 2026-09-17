/**
 * Testes do `EditButton` - o botão de editar dentro do bloco da identidade do Perfil.
 *
 * Duas coisas que se perdem sem se ver: o **rótulo do botão** ("Editar") não diz o que vai ser
 * editado, e o que o diz é a descrição para leitores de ecrã - que é também o que os testes usam
 * para o encontrar, porque no ecrã há mais do que um sítio onde se toca. E o **destino**: um botão
 * que não faz nada é indistinguível de um botão que abre o ecrã errado.
 *
 * Estes testes eram do `ProfileHeader`, que deixou de existir: o Perfil passou a usar o mesmo bloco
 * de identidade da Home (`ScreenHero`), e o que ele traz de diferente - este botão - ficou sozinho.
 *
 * A terceira coisa é o **tamanho**: o botão vive na linha do papel do cabeçalho, e é do tamanho do
 * texto dessa linha (a mesma letra, e nenhuma caixa à volta - `HERO_SUBTITLE_FONT_SIZE`, ver o
 * `ScreenHero`). Se fosse mais alto do que a linha que o segura, era ele a mandar na altura dela -
 * e os dois cabeçalhos (o da Home e o do Perfil) deixavam de medir o mesmo.
 *
 * Nota: a partir do `@testing-library/react-native` v14, `render` e `fireEvent` são assíncronos.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { EditButton } from '@/components/domain/Profile/EditButton';
import { HERO_SUBTITLE_FONT_SIZE } from '@/components/domain/ScreenHero';
import { pt } from '@/i18n/pt';
import { useLocaleStore } from '@/i18n/store';

beforeEach(() => {
  useLocaleStore.getState().setLocale('pt');
});

const BASE = {
  label: pt.myProfile.edit,
  accessibilityLabel: pt.myProfile.editProfile,
};

describe('<EditButton />', () => {
  it('diz "Editar", e não "Editar Perfil"', async () => {
    const { getByText } = await render(<EditButton {...BASE} />);

    expect(getByText(pt.myProfile.edit)).toBeTruthy();
  });

  it('anuncia o que edita a quem não vê o ecrã', async () => {
    // O botão diz "Editar"; o que ele edita é o perfil.
    const { getByLabelText } = await render(<EditButton {...BASE} />);

    expect(getByLabelText(pt.myProfile.editProfile)).toBeTruthy();
  });

  it('o toque chega ao ecrã', async () => {
    const onPress = jest.fn();
    const { getByLabelText } = await render(<EditButton {...BASE} onPress={onPress} />);

    await fireEvent.press(getByLabelText(pt.myProfile.editProfile));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('escreve a palavra do tamanho do papel que ela acompanha', async () => {
    const { getByText } = await render(<EditButton {...BASE} />);

    const estilo = StyleSheet.flatten(getByText(pt.myProfile.edit).props.style) as {
      fontSize?: number;
    };

    expect(estilo.fontSize).toBe(HERO_SUBTITLE_FONT_SIZE);
  });

  it('não tem caixa própria - senão era ele a mandar na altura da linha do papel', async () => {
    const { getByLabelText } = await render(<EditButton {...BASE} />);

    // Um fundo, um contorno ou uma altura fixa faziam deste botão uma pastilha mais alta do que o
    // texto ao lado, e a linha do cabeçalho crescia só no Perfil.
    const estilo = StyleSheet.flatten(getByLabelText(pt.myProfile.editProfile).props.style) as {
      height?: number;
      backgroundColor?: string;
      borderWidth?: number;
    };

    expect(estilo.height).toBeUndefined();
    expect(estilo.backgroundColor).toBeUndefined();
    expect(estilo.borderWidth).toBeUndefined();
  });
});
