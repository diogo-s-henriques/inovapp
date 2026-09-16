/**
 * Testes do `HeroActionButton` — o botão do canto do cabeçalho (o sino da Home, a roda dentada do
 * Perfil).
 *
 * A razão de existir destes testes é uma inconsistência que já aconteceu: o sino era um círculo
 * branco de 40 px com raio 13, enquanto os atalhos do mesmo ecrã eram quadrados cinzentos de 40 com
 * raio 12. O lado é fixado em `IconBoxSize` (o mesmo dos outros ícones) para não voltar a haver dois
 * tamanhos de quadrado na mesma página — a diferença de 1 px de raio não se testa, mas o lado sim.
 *
 * Nota: a partir do `@testing-library/react-native` v14, `render` e `fireEvent` são assíncronos.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { IconBoxSize } from '@/constants/theme';
import { HeroActionButton } from '@/components/ui/HeroActionButton';

const BASE = { icon: 'notifications-outline' as const, accessibilityLabel: 'Notificações' };

describe('<HeroActionButton />', () => {
  it('diz o que faz a quem não vê o ícone', async () => {
    const { getByLabelText } = await render(<HeroActionButton {...BASE} />);

    expect(getByLabelText('Notificações')).toBeTruthy();
  });

  it('o toque chega ao ecrã', async () => {
    const onPress = jest.fn();
    const { getByLabelText } = await render(<HeroActionButton {...BASE} onPress={onPress} />);

    await fireEvent.press(getByLabelText('Notificações'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('assenta no mesmo quadrado dos outros ícones da página', async () => {
    const { getByLabelText } = await render(<HeroActionButton {...BASE} />);

    const estilo = StyleSheet.flatten(getByLabelText('Notificações').props.style) as {
      width?: number;
      height?: number;
    };

    expect(estilo.width).toBe(IconBoxSize);
    expect(estilo.height).toBe(IconBoxSize);
  });
});
