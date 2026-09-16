/**
 * Testes do que acontece quando o módulo nativo do EAS Observe **não existe** na build.
 *
 * O caso não é teórico: foi assim que a app passou a abrir e a fechar-se logo a seguir, sem ecrã
 * nenhum - o JavaScript importava `expo-observe`, o módulo `ExpoAppMetrics` não estava dentro do
 * binário (o Expo Go, sempre; e qualquer build anterior a este pacote entrar no projeto) e a falha
 * acontecia **antes** de haver ecrã para a mostrar.
 *
 * O que se fixa aqui é o contrato: sem o módulo, a app continua a funcionar e um erro apanhado
 * continua a poder ser reportado (só não sai do dispositivo).
 *
 * A fábrica do `jest.mock` **lança**, de propósito: é a forma de reproduzir a falha do módulo nativo
 * sem uma build a sério pelo meio.
 */
jest.mock('expo-observe', () => {
  throw new Error("Cannot find native module 'ExpoAppMetrics'");
});

import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';

import { reportError } from '@/lib/error-reporting';
import { observe, useMarkInteractive } from '@/lib/observe';

beforeEach(() => {
  // O aviso da consola é do desenvolvimento; aqui só fazia ruído.
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('sem módulo nativo do EAS Observe', () => {
  it('não há módulo nenhum para usar', () => {
    expect(observe).toBeNull();
  });

  it('reportar um erro não rebenta', () => {
    expect(() => reportError(new Error('falhou a ler'), 'chat')).not.toThrow();
  });

  it('o ecrã que marca a app como utilizável desenha-se na mesma', async () => {
    // O `markInteractive` do EAS Observe é chamado no arranque, a seguir ao splash. Sem módulo tem
    // de ser um nada que não rebente - e não um `undefined` que só falha em execução.
    function Arranque() {
      const markInteractive = useMarkInteractive();
      useEffect(() => markInteractive(), [markInteractive]);
      return (
        <View>
          <Text>a app desenhou-se</Text>
        </View>
      );
    }

    const { getByText } = await render(<Arranque />);

    expect(getByText('a app desenhou-se')).toBeTruthy();
  });
});
