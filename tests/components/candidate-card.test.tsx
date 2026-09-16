/**
 * Testes do `CandidateCard` - a linha de cada candidato na lista dos Matches.
 *
 * Três toques vivem neste cartão e fazem coisas muito diferentes: tocar no cartão abre o perfil,
 * "Passar" esconde a pessoa para sempre (é gravado no dispositivo, não há como voltar atrás) e
 * "Conectar" envia-lhe um pedido de ligação - que não se pode desfazer, porque as regras do
 * Firestore não deixam apagar um pedido enviado. Trocá-los entre si era um erro silencioso e caro,
 * e é exatamente o que um teste de componente consegue fixar.
 *
 * Fica também fixado que, com o pedido deste candidato a caminho (`busy`), nenhum dos dois botões
 * responde: dois toques depressa seriam dois pedidos.
 */
import { fireEvent, render } from '@testing-library/react-native';

import { CandidateCard } from '@/components/domain/CandidateCard';

const BASE = {
  firstName: 'Ana',
  lastName: 'Aluna',
  course: 'Licenciatura em Engenharia',
  year: '2º ano',
  subjects: ['Análise Matemática', 'Física', 'Programação'],
  passLabel: 'Passar',
  connectLabel: 'Conectar',
};

describe('<CandidateCard /> - quem é', () => {
  it('mostra o nome, o curso com o ano e as disciplinas', async () => {
    const { getByText } = await render(
      <CandidateCard {...BASE} onPass={jest.fn()} onConnect={jest.fn()} onPressProfile={jest.fn()} />,
    );

    expect(getByText('Ana Aluna')).toBeTruthy();
    expect(getByText('Licenciatura em Engenharia · 2º ano')).toBeTruthy();
    expect(getByText('Análise Matemática')).toBeTruthy();
    expect(getByText('Física')).toBeTruthy();
  });

  it('resume as disciplinas que não cabem, em vez de as cortar', async () => {
    const { getByText } = await render(
      <CandidateCard {...BASE} onPass={jest.fn()} onConnect={jest.fn()} onPressProfile={jest.fn()} />,
    );

    // Duas etiquetas e o resto num "+N": a terceira disciplina não se perde, conta-se.
    expect(getByText('+1')).toBeTruthy();
  });
});

describe('<CandidateCard /> - os três toques', () => {
  it('tocar no cartão abre o perfil', async () => {
    const onPressProfile = jest.fn();
    const { getAllByLabelText } = await render(
      <CandidateCard {...BASE} onPass={jest.fn()} onConnect={jest.fn()} onPressProfile={onPressProfile} />,
    );

    // Dois elementos anunciam o nome: o cartão inteiro e a fotografia lá dentro. O primeiro na
    // ordem da árvore é o cartão - é ele o alvo deste toque.
    const [cartao] = getAllByLabelText('Ana Aluna');

    await fireEvent.press(cartao);

    expect(onPressProfile).toHaveBeenCalledTimes(1);
  });

  it('"Passar" passa a pessoa e não lhe pede nada', async () => {
    const onPass = jest.fn();
    const onConnect = jest.fn();
    const { getByLabelText } = await render(
      <CandidateCard {...BASE} onPass={onPass} onConnect={onConnect} onPressProfile={jest.fn()} />,
    );

    await fireEvent.press(getByLabelText('Passar'));

    expect(onPass).toHaveBeenCalledTimes(1);
    expect(onConnect).not.toHaveBeenCalled();
  });

  it('"Conectar" pede a ligação e não passa a pessoa', async () => {
    const onPass = jest.fn();
    const onConnect = jest.fn();
    const { getByLabelText } = await render(
      <CandidateCard {...BASE} onPass={onPass} onConnect={onConnect} onPressProfile={jest.fn()} />,
    );

    await fireEvent.press(getByLabelText('Conectar'));

    expect(onConnect).toHaveBeenCalledTimes(1);
    expect(onPass).not.toHaveBeenCalled();
  });

  it('com um pedido a caminho, os botões não disparam outra vez', async () => {
    const onPass = jest.fn();
    const onConnect = jest.fn();
    const { getByLabelText } = await render(
      <CandidateCard {...BASE} busy onPass={onPass} onConnect={onConnect} onPressProfile={jest.fn()} />,
    );

    await fireEvent.press(getByLabelText('Passar'));
    await fireEvent.press(getByLabelText('Conectar'));

    expect(onPass).not.toHaveBeenCalled();
    expect(onConnect).not.toHaveBeenCalled();
  });
});
