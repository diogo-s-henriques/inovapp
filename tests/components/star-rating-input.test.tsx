/**
 * Testes de `StarRatingInput` - o input de avaliação usado no ecrã de avaliação de sessão.
 *
 * O que interessa aqui é a correspondência entre a estrela tocada e o valor devolvido (é fácil
 * ficar com um desvio de um) e o facto de o número de estrelas ser configurável.
 */
import { fireEvent, render } from '@testing-library/react-native';

import { StarRatingInput } from '@/components/ui/StarRatingInput';
import { pt } from '@/i18n/pt';
import { useLocaleStore } from '@/i18n/store';

beforeEach(() => {
  useLocaleStore.getState().setLocale('pt');
});

describe('<StarRatingInput />', () => {
  it('mostra cinco estrelas por omissão', async () => {
    const { getByLabelText } = await render(<StarRatingInput value={0} onChange={jest.fn()} />);

    for (const estrela of [1, 2, 3, 4, 5]) {
      expect(getByLabelText(pt.common.starRating(estrela))).toBeTruthy();
    }
  });

  it('devolve o número da estrela tocada, e não a sua posição', async () => {
    const onChange = jest.fn();
    const { getByLabelText } = await render(<StarRatingInput value={0} onChange={onChange} />);

    await fireEvent.press(getByLabelText(pt.common.starRating(3)));

    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('a primeira estrela vale 1 e não 0', async () => {
    const onChange = jest.fn();
    const { getByLabelText } = await render(<StarRatingInput value={0} onChange={onChange} />);

    await fireEvent.press(getByLabelText(pt.common.starRating(1)));

    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('permite mudar de ideias e voltar a tocar noutra estrela', async () => {
    const onChange = jest.fn();
    const { getByLabelText } = await render(<StarRatingInput value={2} onChange={onChange} />);

    await fireEvent.press(getByLabelText(pt.common.starRating(5)));

    expect(onChange).toHaveBeenLastCalledWith(5);
  });

  it('respeita um máximo diferente de cinco', async () => {
    const { getByLabelText, queryByLabelText } = await render(
      <StarRatingInput value={0} onChange={jest.fn()} maxRating={3} />,
    );

    expect(getByLabelText(pt.common.starRating(3))).toBeTruthy();
    expect(queryByLabelText(pt.common.starRating(4))).toBeNull();
  });

  it('o rótulo de cada estrela identifica o valor', async () => {
    const { getByLabelText } = await render(<StarRatingInput value={0} onChange={jest.fn()} />);

    // Sem isto, um leitor de ecrã anunciaria cinco botões iguais.
    expect(getByLabelText(pt.common.starRating(4))).toBeTruthy();
    expect(pt.common.starRating(4)).not.toEqual(pt.common.starRating(5));
  });
});
