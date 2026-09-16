/**
 * Testes do `HomeShortcuts` — os atalhos do ecrã inicial. Hoje é um só: os Materiais.
 *
 * O que se fixa aqui é a única coisa que o componente decide: a ligação entre o cartão que se vê e
 * o ecrã que ele abre. Um cartão que abre o sítio errado não rebenta nada — abre o sítio errado,
 * que é o tipo de erro que passa por qualquer verificação que só conte cartões.
 *
 * E fixa-se o que **saiu**: os atalhos das Mensagens e da Pesquisa deixaram de existir porque os
 * dois ecrãs já são separadores da barra de baixo, e o atalho das Sessões passou a ser o calendário
 * no corpo do ecrã (ver tests/components/agenda-card.test.tsx). Se algum voltar por acidente, este
 * teste apanha-o.
 */
import { fireEvent, render } from '@testing-library/react-native';

import { HomeShortcuts } from '@/components/domain/HomeShortcuts';
import { pt } from '@/i18n/pt';
import { useLocaleStore } from '@/i18n/store';

beforeEach(() => {
  useLocaleStore.getState().setLocale('pt');
});

/** O cartão anuncia-se pelo título e o subtítulo, juntos (ver IconTextCard). */
function atalho(title: string, subtitle: string): string {
  return `${title}, ${subtitle}`;
}

describe('atalhos da Home', () => {
  it('sobrou um, e é o dos materiais', async () => {
    const { getByLabelText } = await render(<HomeShortcuts />);

    expect(getByLabelText(atalho(pt.home.materialsTitle, pt.home.materialsExploreAll))).toBeTruthy();
  });

  it('não ficou nenhum atalho para o Chat nem para a Pesquisa', async () => {
    const { queryByText } = await render(<HomeShortcuts />);

    // Os dois ecrãs são separadores da barra de baixo: um segundo caminho no meio da Home era
    // espaço gasto no ecrã que tem menos.
    expect(queryByText('Mensagens')).toBeNull();
    expect(queryByText('Pesquisar')).toBeNull();
  });

  it('o toque abre os materiais', async () => {
    const onPressMaterials = jest.fn();
    const { getByLabelText } = await render(<HomeShortcuts onPressMaterials={onPressMaterials} />);

    await fireEvent.press(getByLabelText(atalho(pt.home.materialsTitle, pt.home.materialsExploreAll)));

    expect(onPressMaterials).toHaveBeenCalledTimes(1);
  });
});
