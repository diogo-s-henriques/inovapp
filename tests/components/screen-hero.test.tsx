/**
 * Testes do `ScreenHero` - o bloco em gradiente que abre os cinco separadores.
 *
 * O que se fixa aqui, e porque:
 *
 * 1. **A forma da fotografia** (quadrada de cantos arredondados, com o raio proporcional ao lado).
 *    Um raio fixo dava um círculo e um quadrado em tamanhos diferentes - o tipo de diferença que
 *    ninguém procura.
 * 2. **O que o ecrã põe na linha do papel** (`subtitleAction`, o botão de editar do Perfil). É a
 *    única coisa que distingue o bloco do Perfil do bloco da Home, e é por isso que ela existe:
 *    o Perfil chegou a trazer uma identidade inteira desenhada à parte, e as duas cópias
 *    divergiram (fotografia de 96 contra 80, nome de 20 contra 22).
 * 2b. **A linha do papel não impõe altura nenhuma** - quem a mede é o texto. É o que faz os dois
 *    cabeçalhos - o da Home e o do Perfil - terem a mesma altura, e é a garantia que se perde sem
 *    se ver: a fotografia e o ícone do canto estão centrados no bloco, por isso uma linha mais alta
 *    num ecrã empurra-os para baixo só nesse ecrã. Já aconteceu duas vezes (o "Editar" viveu por
 *    baixo das linhas, e depois numa pastilha mais alta do que a linha) e é o tipo de desalinhamento
 *    que se procura sem se saber onde. A outra metade da garantia está no `profile-edit-button`:
 *    o botão que lá pode sentar-se é do tamanho do texto.
 * 3. **O título do ecrã não é gritado** (`textTransform: 'none'`): o `ThemedText` põe tudo em
 *    maiúsculas por omissão, e "MATCHES" era um aviso a gritar por um nome de separador.
 * 4. **A linha de cima (a saudação) é opcional.** Só a Home a passa; se ela aparecesse em todos os
 *    blocos, o Matches dizia "Boa tarde," por cima do nome.
 * 5. **A identidade inteira é opcional.** O Matches, o Chat e o Pesquisar levam só o título: se a
 *    identidade voltasse a ser desenhada sempre, esses três separadores passavam a mostrar outra
 *    vez o nome de quem já está na app - e um bloco de 150 px para dizer "Chat".
 * 6. **A segunda linha cabe numa linha, por omissão.** É o que a Home quer (o papel é uma palavra
 *    fixa); o Perfil pede duas, porque lá a linha é o curso escolhido pela pessoa.
 *
 * Nota: a partir do `@testing-library/react-native` v14, `render` é assíncrono.
 */
import { render } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { HERO_AVATAR_SIZE, ScreenHero } from '@/components/domain/ScreenHero';

const IDENTIDADE = { name: 'Ana Silva', subtitle: 'Tutorando', initials: 'AS' };

function estiloDe(element: { props: { style?: unknown } }) {
  return StyleSheet.flatten(element.props.style) as {
    width?: number;
    borderRadius?: number;
    textTransform?: string;
    marginTop?: number;
    minHeight?: number;
    height?: number;
    justifyContent?: string;
    flexDirection?: string;
  };
}

describe('<ScreenHero /> - a identidade', () => {
  it('mostra o nome e o papel', async () => {
    const { getByText } = await render(<ScreenHero {...IDENTIDADE} />);

    expect(getByText('Ana Silva')).toBeTruthy();
    expect(getByText('Tutorando')).toBeTruthy();
  });

  it('a saudação aparece quando é dada (a Home)', async () => {
    const { getByText } = await render(<ScreenHero {...IDENTIDADE} eyebrow="Boa tarde," />);

    expect(getByText('Boa tarde,')).toBeTruthy();
  });

  it('sem saudação, o bloco não desenha a linha (o que os separadores usam)', async () => {
    const { queryByText } = await render(<ScreenHero {...IDENTIDADE} />);

    expect(queryByText('Boa tarde,')).toBeNull();
  });

  it('a fotografia é quadrada de cantos arredondados, com o raio proporcional ao lado', async () => {
    const { getByLabelText } = await render(<ScreenHero {...IDENTIDADE} />);

    const estilo = estiloDe(getByLabelText('Ana Silva'));

    expect(estilo.width).toBe(HERO_AVATAR_SIZE);
    // Metade do lado seria um círculo - a forma que isto veio substituir.
    expect(estilo.borderRadius).toBeLessThan(HERO_AVATAR_SIZE / 2);
    expect(estilo.borderRadius).toBeGreaterThan(0);
  });

  it('a segunda linha fica presa a uma linha (o caso da Home)', async () => {
    const { getByText } = await render(<ScreenHero {...IDENTIDADE} />);

    expect(getByText('Tutorando').props.numberOfLines).toBe(1);
  });

  it('o ecrã pode pedir duas linhas para a segunda linha (o curso do Perfil)', async () => {
    const { getByText } = await render(
      <ScreenHero {...IDENTIDADE} subtitleLines={2} />,
    );

    expect(getByText('Tutorando').props.numberOfLines).toBe(2);
  });
});

describe('<ScreenHero /> - o ar entre as três linhas', () => {
  it('a saudação, o nome e o papel não estão encostados uns aos outros', async () => {
    const { getByText } = await render(<ScreenHero {...IDENTIDADE} eyebrow="Boa tarde," />);

    expect(estiloDe(getByText('Ana Silva')).marginTop).toBeGreaterThan(0);
    // O papel não traz margem própria: quem a tem é a linha que o segura.
    expect(estiloDe(getByText('Tutorando').parent!).marginTop).toBeGreaterThan(0);
  });

  it('o papel leva mais ar do que o nome - é outra linha, e não a mesma frase', async () => {
    const { getByText } = await render(<ScreenHero {...IDENTIDADE} eyebrow="Boa tarde," />);

    const nome = estiloDe(getByText('Ana Silva')).marginTop ?? 0;
    const papel = estiloDe(getByText('Tutorando').parent!).marginTop ?? 0;

    expect(papel).toBeGreaterThan(nome);
  });
});

describe('<ScreenHero /> - a ação do canto', () => {
  it('é centrada na fotografia, e não na altura do bloco', async () => {
    const { getByText } = await render(
      <ScreenHero {...IDENTIDADE} rightAction={<Text>campainha</Text>} />,
    );

    // O bloco pode ser mais alto do que a cara (o curso de um aluno, em duas linhas): se a ação
    // fosse centrada nele, o sino descia no Perfil e ficava no sítio na Home.
    const coluna = getByText('campainha').parent;

    expect(coluna).not.toBeNull();
    expect(estiloDe(coluna!)).toMatchObject({ height: HERO_AVATAR_SIZE, justifyContent: 'center' });
  });
});

describe('<ScreenHero /> - a ação da linha do papel', () => {
  it('aparece dentro da identidade', async () => {
    const { getByText } = await render(
      <ScreenHero {...IDENTIDADE} subtitleAction={<Text>botão de editar</Text>} />,
    );

    expect(getByText('botão de editar')).toBeTruthy();
  });

  it('divide a linha com o papel, em vez de ficar por baixo dele', async () => {
    const { getByText } = await render(
      <ScreenHero {...IDENTIDADE} subtitleAction={<Text>botão de editar</Text>} />,
    );

    // O papel e a ação são os dois filhos da mesma linha, e é isso que os põe lado a lado
    // ("Tutorando  Editar") sem acrescentar altura ao bloco.
    const linha = getByText('Tutorando').parent;

    expect(linha).not.toBeNull();
    expect(estiloDe(linha!).flexDirection).toBe('row');
    expect(getByText('botão de editar').parent).toBe(linha);
  });

  it('a linha do papel não impõe altura nenhuma - é o texto que a mede', async () => {
    const comAcao = await render(
      <ScreenHero {...IDENTIDADE} subtitleAction={<Text>botão de editar</Text>} />,
    );
    const semAcao = await render(<ScreenHero {...IDENTIDADE} />);

    // Uma altura fixa aqui (mesmo a mesma nos dois casos) era uma linha mais alta do que o texto,
    // e a altura do bloco passava a depender do que cada ecrã lá põe - é o que desalinha a
    // fotografia e o ícone do canto entre a Home e o Perfil.
    expect(estiloDe(comAcao.getByText('Tutorando').parent!).minHeight).toBeUndefined();
    expect(estiloDe(semAcao.getByText('Tutorando').parent!).minHeight).toBeUndefined();
  });

  it('sem identidade, não é desenhada - não há linha do papel onde caiba', async () => {
    const { getByText, queryByText } = await render(
      <ScreenHero title="Chat" subtitleAction={<Text>botão de editar</Text>} />,
    );

    expect(getByText('Chat')).toBeTruthy();
    expect(queryByText('botão de editar')).toBeNull();
  });
});

describe('<ScreenHero /> - o título', () => {
  it('aparece por baixo da identidade', async () => {
    const { getByText } = await render(<ScreenHero {...IDENTIDADE} title="Matches" />);

    expect(getByText('Matches')).toBeTruthy();
  });

  it('não é escrito em maiúsculas', async () => {
    const { getByText } = await render(<ScreenHero {...IDENTIDADE} title="Matches" />);

    expect(estiloDe(getByText('Matches')).textTransform).toBe('none');
  });

  it('sem título, o bloco é só identidade (o caso da Home)', async () => {
    const { queryByText } = await render(<ScreenHero {...IDENTIDADE} />);

    expect(queryByText('Matches')).toBeNull();
  });
});

describe('<ScreenHero /> - só o título (Matches, Chat, Pesquisar)', () => {
  it('sem nome, não desenha a identidade - nem a ação do canto que ela segura', async () => {
    const { getByText, queryByText } = await render(
      <ScreenHero title="Chat" rightAction={<Text>campainha</Text>} />,
    );

    expect(getByText('Chat')).toBeTruthy();
    // A ação do canto vive na linha da identidade (é ali que fica alinhada com a fotografia):
    // sem identidade, não há linha, e é isso que mantém o sino fora destes três separadores.
    expect(queryByText('campainha')).toBeNull();
  });

  it('o título sobe para o lugar da identidade, sem o intervalo que o separava dela', async () => {
    const { getByText } = await render(<ScreenHero title="Chat" />);

    expect(estiloDe(getByText('Chat')).marginTop).toBe(0);
  });

  it('com identidade, o título fica por baixo dela', async () => {
    const { getByText } = await render(<ScreenHero {...IDENTIDADE} title="Perfil" />);

    expect(estiloDe(getByText('Perfil')).marginTop).toBeGreaterThan(0);
  });
});
