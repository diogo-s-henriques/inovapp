/**
 * Testes do `AttentionCard` — a faixa "Precisa de ti" no topo da Home.
 *
 * O que se fixa aqui é a ligação entre cada linha e o ecrã que ela abre. Trocar os destinos é um
 * erro que não rebenta nada: quem carrega em "2 pedidos de conexão" vai parar às notificações, os
 * pedidos continuam por decidir e a faixa continua a dizer a mesma coisa. Um aviso que leva ao
 * sítio errado é pior do que não existir.
 *
 * O título e a contagem da secção **não** vivem aqui: subiram para o `SectionHeader` que fica por
 * cima (ver tests/components/… e o uso em `(tabs)/index.tsx`). Este cartão é só as linhas.
 *
 * O texto de cada linha já traz a contagem, por isso o plural também é testado — "1 pedidos de
 * conexão" denuncia-se sozinho no ecrã, mas passa por qualquer verificação que só conte linhas.
 */
import { fireEvent, render } from '@testing-library/react-native';

import { AttentionCard } from '@/components/domain/AttentionCard';
import { pt } from '@/i18n/pt';
import { useLocaleStore } from '@/i18n/store';

beforeEach(() => {
  useLocaleStore.getState().setLocale('pt');
});

describe('faixa de pendências', () => {
  it('sem pendências não desenha nada', async () => {
    const { toJSON } = await render(<AttentionCard items={[]} onPressItem={jest.fn()} />);

    expect(toJSON()).toBeNull();
  });

  it('diz o que está à espera de resposta, com a contagem', async () => {
    const { getByText } = await render(
      <AttentionCard
        items={[
          { kind: 'connections', count: 2 },
          { kind: 'messages', count: 3 },
        ]}
        onPressItem={jest.fn()}
      />,
    );

    expect(getByText(pt.home.attentionConnections(2))).toBeTruthy();
    expect(getByText(pt.home.attentionMessages(3))).toBeTruthy();
  });

  it('uma só pendência diz-se no singular', async () => {
    const { getByText, queryByText } = await render(
      <AttentionCard items={[{ kind: 'sessions', count: 1 }]} onPressItem={jest.fn()} />,
    );

    expect(getByText(pt.home.attentionSessions(1))).toBeTruthy();
    expect(queryByText(pt.home.attentionSessions(3))).toBeNull();
  });

  it('cada linha devolve o seu tipo, não o do vizinho', async () => {
    const onPressItem = jest.fn();
    const { getByLabelText } = await render(
      <AttentionCard
        items={[
          { kind: 'connections', count: 1 },
          { kind: 'messages', count: 1 },
        ]}
        onPressItem={onPressItem}
      />,
    );

    await fireEvent.press(getByLabelText(pt.home.attentionMessages(1)));

    expect(onPressItem).toHaveBeenCalledWith('messages');
    expect(onPressItem).not.toHaveBeenCalledWith('connections');
  });
});
