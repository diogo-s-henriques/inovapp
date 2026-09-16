/**
 * Testes de `StatsRow` — os três números do perfil.
 *
 * O que aqui se fixa é o contrato, não o desenho: cada número com o seu rótulo, valores diferentes
 * em caixas diferentes, e a linha a continuar visível quando os números são todos zero (é o perfil
 * de quem acabou de criar conta — se desaparecesse, o ecrã perdia a explicação do que ali podia vir
 * a estar).
 *
 * Nota sobre a API: a partir do `@testing-library/react-native` v14, `render` é assíncrono.
 */
import { render } from '@testing-library/react-native';

import { StatsRow } from '@/components/domain/StatsRow';

describe('<StatsRow /> — conteúdo', () => {
  it('mostra um número por caixa, com o respetivo rótulo', async () => {
    const { getByText } = await render(
      <StatsRow
        items={[
          { value: 3, label: 'Dadas' },
          { value: 1, label: 'Recebidas' },
          { value: 7, label: 'Agendadas' },
        ]}
      />,
    );

    // Valores diferentes de propósito: com o mesmo número nas três caixas, um erro de troca de
    // índice na renderização passaria despercebido.
    expect(getByText('3')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
    expect(getByText('7')).toBeTruthy();

    expect(getByText('Dadas')).toBeTruthy();
    expect(getByText('Recebidas')).toBeTruthy();
    expect(getByText('Agendadas')).toBeTruthy();
  });

  it('mostra os três rótulos mesmo quando os números são todos zero', async () => {
    const { getByText } = await render(
      <StatsRow
        items={[
          { value: 0, label: 'Dadas' },
          { value: 0, label: 'Recebidas' },
          { value: 0, label: 'Agendadas' },
        ]}
      />,
    );

    expect(getByText('Dadas')).toBeTruthy();
    expect(getByText('Recebidas')).toBeTruthy();
    expect(getByText('Agendadas')).toBeTruthy();
  });
});
