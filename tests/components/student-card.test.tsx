/**
 * Testes do `StudentCard` - a linha de cada resultado na pesquisa de mentores.
 *
 * É o mesmo desenho do `CandidateCard`, mas com outro trabalho em cima: mostrar as etiquetas que
 * cabem e resumir as restantes num "+N" (nunca envolver para uma segunda linha, senão os cartões da
 * lista ficavam todos de alturas diferentes).
 *
 * O destaque é novo e é a parte que interessa fixar: as etiquetas que coincidem com o que eu procuro
 * aprender ficam **à frente** das outras. Sem isso, quem procura Matemática podia ver só as duas
 * primeiras etiquetas do perfil dele - que podem ser justamente as que não lhe dizem nada.
 */
import { render } from '@testing-library/react-native';

import { StudentCard } from '@/components/domain/StudentCard';

const BASE = {
  firstName: 'Bruno',
  lastName: 'Costa',
  course: 'Licenciatura em Gestão',
  year: '3º ano',
};

describe('<StudentCard /> - as etiquetas que cabem', () => {
  it('mostra as primeiras e conta as que sobram', async () => {
    const { getByText } = await render(
      <StudentCard {...BASE} tags={['Matemática', 'Física', 'Programação']} />,
    );

    expect(getByText('Bruno Costa')).toBeTruthy();
    expect(getByText('Licenciatura em Gestão · 3º ano')).toBeTruthy();
    expect(getByText('Matemática')).toBeTruthy();
    expect(getByText('Física')).toBeTruthy();
    expect(getByText('+1')).toBeTruthy();
  });

  it('não mostra "+0" quando as etiquetas cabem todas', async () => {
    const { getByText, queryByText } = await render(<StudentCard {...BASE} tags={['Matemática']} />);

    expect(getByText('Matemática')).toBeTruthy();
    expect(queryByText('+0')).toBeNull();
  });
});

describe('<StudentCard /> - o que tem a ver comigo', () => {
  const COM_TERCEIRA = { ...BASE, tags: ['Física', 'Programação', 'Matemática'] };

  it('põe à frente as etiquetas que eu procuro', async () => {
    const { getByText, queryByText } = await render(<StudentCard {...COM_TERCEIRA} highlight={['Matemática']} />);

    expect(getByText('Matemática')).toBeTruthy();
    expect(getByText('Física')).toBeTruthy();
    expect(getByText('+1')).toBeTruthy();
    expect(queryByText('Programação')).toBeNull();
  });

  it('sem nada em comum, mantém a ordem do perfil', async () => {
    const { getByText, queryByText } = await render(<StudentCard {...COM_TERCEIRA} />);

    expect(getByText('Física')).toBeTruthy();
    expect(getByText('Programação')).toBeTruthy();
    expect(queryByText('Matemática')).toBeNull();
  });
});
