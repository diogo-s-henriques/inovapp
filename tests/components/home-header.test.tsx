/**
 * Testes do `HomeHeader` - o bloco azul que abre a Home: sino e identidade.
 *
 * O que se fixa aqui:
 *
 * 1. A fotografia é **quadrada de cantos arredondados** (raio 22 num lado de 80) e não redonda. O
 *    que distingue uma forma da outra é uma conta só - um círculo é um raio de metade do lado -
 *    por isso o teste verifica o raio, não uma cor ou um pixel. Um raio de volta a `size / 2`
 *    devolve-nos o círculo sem que nada se queixe.
 * 2. A saudação e o nome subiram de tamanho. O teste compara com os tamanhos das variantes do
 *    `ThemedText` (15 do `body`, 18 do `subtitle`) em vez de fixar números soltos: o que se quer
 *    garantir é que ficaram **acima** delas.
 * 3. A identidade são três linhas: a saudação, o **nome completo** e o **papel** (ver `roleLabel`
 *    em src/lib/roles.ts). O papel é o que diz a quem se está a falar - e o seu desaparecimento é
 *    silencioso, por isso está aqui. O curso e o ano já não vivem neste bloco.
 * 4. O sino vive neste bloco e tem de continuar a chegar ao ecrã - é a única porta para as
 *    notificações a partir da Home (o Definições está no Perfil). Ele assenta no **mesmo quadrado**
 *    dos outros ícones da página (`IconBoxSize`), e não num tamanho só dele: andou a 40 px de raio
 *    13 enquanto os atalhos eram 40 de raio 12, e a diferença lia-se como duas intenções.
 *
 * A escolha da saudação (bom dia / boa tarde / boa noite) vem do `period` que o ecrã calcula, e
 * uma troca entre "manhã" e "noite" é silenciosa - por isso também está aqui.
 *
 * Nota: a partir do `@testing-library/react-native` v14, `render` e `fireEvent` são assíncronos.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { HomeHeader } from '@/components/domain/HomeHeader';
import { IconBoxSize } from '@/constants/theme';
import { pt } from '@/i18n/pt';
import { useLocaleStore } from '@/i18n/store';

const FOTO = { tamanho: 80, raio: 22 };
/** Tamanhos das variantes do ThemedText, que a introdução tem de ultrapassar. */
const BODY = 15;
const SUBTITLE = 18;

const BASE = {
  name: 'Ana Silva',
  period: 'morning' as const,
  roleLabel: pt.roles.mentor,
};

beforeEach(() => {
  useLocaleStore.getState().setLocale('pt');
});

function estiloDe(element: { props: { style?: unknown } }) {
  return StyleSheet.flatten(element.props.style) as {
    fontSize?: number;
    borderRadius?: number;
    borderWidth?: number;
  };
}

describe('<HomeHeader /> - a saudação', () => {
  it('de manhã diz bom dia', async () => {
    const { getByText } = await render(<HomeHeader {...BASE} />);

    expect(getByText(pt.home.greetingMorning)).toBeTruthy();
  });

  it('à tarde diz boa tarde', async () => {
    const { getByText } = await render(<HomeHeader {...BASE} period="afternoon" />);

    expect(getByText(pt.home.greetingAfternoon)).toBeTruthy();
  });

  it('à noite diz boa noite', async () => {
    const { getByText } = await render(<HomeHeader {...BASE} period="evening" />);

    expect(getByText(pt.home.greetingEvening)).toBeTruthy();
  });
});

describe('<HomeHeader /> - a fotografia', () => {
  it('é quadrada de cantos arredondados, não redonda', async () => {
    const { getByLabelText } = await render(<HomeHeader {...BASE} />);

    const estilo = estiloDe(getByLabelText('Ana Silva'));

    expect(estilo.borderRadius).toBe(FOTO.raio);
    // Metade do lado seria um círculo - a forma que isto veio substituir.
    expect(estilo.borderRadius).toBeLessThan(FOTO.tamanho / 2);
  });

  it('é maior do que era', async () => {
    const { getByLabelText } = await render(<HomeHeader {...BASE} />);

    const estilo = StyleSheet.flatten(getByLabelText('Ana Silva').props.style) as { width?: number; height?: number };

    expect(estilo.width).toBe(FOTO.tamanho);
    expect(estilo.height).toBe(FOTO.tamanho);
  });

  it('tem contorno, para a cara acabar em algum sítio sobre o azul claro', async () => {
    const { getByLabelText } = await render(<HomeHeader {...BASE} />);

    expect(estiloDe(getByLabelText('Ana Silva')).borderWidth).toBeGreaterThan(0);
  });

  it('sem fotografia, cai nas iniciais em vez de ficar vazia', async () => {
    const { getByText } = await render(<HomeHeader {...BASE} />);

    // Sem iniciais explícitas, é a primeira letra do nome que fica.
    expect(getByText('A')).toBeTruthy();
  });
});

describe('<HomeHeader /> - a introdução', () => {
  it('a saudação e o nome são maiores do que o texto normal', async () => {
    const { getByText } = await render(<HomeHeader {...BASE} />);

    expect(estiloDe(getByText(pt.home.greetingMorning)).fontSize).toBeGreaterThan(BODY);
    expect(estiloDe(getByText('Ana Silva')).fontSize).toBeGreaterThan(SUBTITLE);
  });

  it('o nome não pode ocupar mais do que uma linha', async () => {
    const { getByText } = await render(<HomeHeader {...BASE} />);

    expect(getByText('Ana Silva').props.numberOfLines).toBe(1);
  });

  it('mostra o papel por baixo do nome, numa linha só', async () => {
    const { getByText } = await render(<HomeHeader {...BASE} roleLabel={pt.roles.tutee} />);

    expect(getByText(pt.roles.tutee)).toBeTruthy();
    expect(getByText(pt.roles.tutee).props.numberOfLines).toBe(1);
  });

  it('sem papel, a linha não é desenhada', async () => {
    const { queryByText } = await render(<HomeHeader {...BASE} roleLabel="" />);

    expect(queryByText(pt.roles.mentor)).toBeNull();
  });
});

describe('<HomeHeader /> - o sino', () => {
  it('o toque no sino chega ao ecrã', async () => {
    const onPressNotifications = jest.fn();
    const { getByLabelText } = await render(<HomeHeader {...BASE} onPressNotifications={onPressNotifications} />);

    await fireEvent.press(getByLabelText(pt.home.notifications));

    expect(onPressNotifications).toHaveBeenCalledTimes(1);
  });

  it('assenta no mesmo quadrado dos outros ícones da página', async () => {
    const { getByLabelText } = await render(<HomeHeader {...BASE} />);

    const estilo = StyleSheet.flatten(getByLabelText(pt.home.notifications).props.style) as {
      width?: number;
      height?: number;
    };

    expect(estilo.width).toBe(IconBoxSize);
    expect(estilo.height).toBe(IconBoxSize);
  });
});
