/**
 * Testes do `EditButton` — o botão de editar dentro do bloco da identidade do Perfil.
 *
 * Duas coisas que se perdem sem se ver: o **rótulo do botão** ("Editar") não diz o que vai ser
 * editado, e o que o diz é a descrição para leitores de ecrã — que é também o que os testes usam
 * para o encontrar, porque no ecrã há mais do que um sítio onde se toca. E o **destino**: um botão
 * que não faz nada é indistinguível de um botão que abre o ecrã errado.
 *
 * Estes testes eram do `ProfileHeader`, que deixou de existir: o Perfil passou a usar o mesmo bloco
 * de identidade da Home (`ScreenHero`), e o que ele traz de diferente — este botão — ficou sozinho.
 *
 * Nota: a partir do `@testing-library/react-native` v14, `render` e `fireEvent` são assíncronos.
 */
import { fireEvent, render } from '@testing-library/react-native';

import { EditButton } from '@/components/domain/Profile/EditButton';
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
});
