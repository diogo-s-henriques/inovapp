/**
 * Testes de `SessionListItem` - a linha de sessão na agenda.
 *
 * O que aqui se fixa é uma regra de domínio que já foi um bug: só quem é Mentor/Tutor *nessa*
 * sessão pode terminá-la. A decisão era tomada comparando o texto de um rótulo ('Tutorando'),
 * o que partia assim que a interface fosse traduzida - hoje é o campo `role` tipado
 * (ver src/types/session.ts) e o botão é escolhido a partir dele.
 *
 * A app não faz chamadas: a linha de sessão só tem a ação de terminar (e só para o mentor).
 *
 * Nota sobre a API: a partir do `@testing-library/react-native` v14, `render`, `fireEvent` e
 * `unmount` são assíncronos (o React 19 deixou de suportar o `react-test-renderer`, que era
 * síncrono). Daí o `await` em cada um.
 */
import { fireEvent, render } from '@testing-library/react-native';

import { SessionListItem, type SessionListItemProps } from '@/components/domain/SessionListItem';
import { en } from '@/i18n/en';
import { pt } from '@/i18n/pt';
import { useLocaleStore } from '@/i18n/store';

const BASE: Omit<SessionListItemProps, 'sessionRole'> = {
  time: '15:00',
  firstName: 'Ana',
  lastName: 'Silva',
  subject: 'Matemática',
  modality: 'Online',
  status: 'scheduled',
};

beforeEach(() => {
  useLocaleStore.getState().setLocale('pt');
});

describe('conteúdo da linha', () => {
  it('mostra a hora, o nome, a disciplina e a modalidade', async () => {
    const { getByText } = await render(<SessionListItem {...BASE} sessionRole="student" />);

    expect(getByText('15:00')).toBeTruthy();
    expect(getByText('Ana Silva')).toBeTruthy();
    expect(getByText('Matemática · Online')).toBeTruthy();
  });

  it('mostra o nome do outro participante, não os do utilizador', async () => {
    const { queryByText } = await render(
      <SessionListItem {...BASE} firstName="Bruno" lastName="Costa" sessionRole="mentor" />,
    );

    expect(queryByText('Bruno Costa')).toBeTruthy();
    expect(queryByText('Ana Silva')).toBeNull();
  });
});

describe('papel do utilizador na sessão', () => {
  it('quem é tutorando aparece como tutorando', async () => {
    const { getByText } = await render(<SessionListItem {...BASE} sessionRole="student" />);

    expect(getByText(pt.sessions.asRole(pt.roles.tutee))).toBeTruthy();
  });

  it('quem é mentor aparece como mentor', async () => {
    const { getByText } = await render(<SessionListItem {...BASE} sessionRole="mentor" />);

    expect(getByText(pt.sessions.asRole(pt.roles.mentor))).toBeTruthy();
  });

  it('o rótulo do papel segue o idioma escolhido', async () => {
    useLocaleStore.getState().setLocale('en');

    const { getByText, queryByText } = await render(<SessionListItem {...BASE} sessionRole="student" />);

    expect(getByText(en.sessions.asRole(en.roles.tutee))).toBeTruthy();
    expect(queryByText(pt.sessions.asRole(pt.roles.tutee))).toBeNull();
  });
});

describe('quem pode terminar a sessão', () => {
  it('o mentor vê "Terminar" e o botão avisa o ecrã', async () => {
    const onPressComplete = jest.fn();
    const { getByLabelText } = await render(
      <SessionListItem {...BASE} sessionRole="mentor" onPressComplete={onPressComplete} />,
    );

    await fireEvent.press(getByLabelText(pt.sessions.complete));

    expect(onPressComplete).toHaveBeenCalledTimes(1);
  });

  it('o tutorando não vê "Terminar" mesmo que lhe passem um handler', async () => {
    // É esta a salvaguarda: o papel manda, não a existência do callback. Sem isto, bastava um
    // ecrã passar `onPressComplete` a toda a gente para o tutorando poder fechar a sessão.
    const onPressComplete = jest.fn();
    const { queryByLabelText } = await render(
      <SessionListItem {...BASE} sessionRole="student" onPressComplete={onPressComplete} />,
    );

    expect(queryByLabelText(pt.sessions.complete)).toBeNull();
    expect(onPressComplete).not.toHaveBeenCalled();
  });

  it('o mentor sem handler de terminar não mostra ação nenhuma', async () => {
    const { queryByLabelText } = await render(<SessionListItem {...BASE} sessionRole="mentor" />);

    expect(queryByLabelText(pt.sessions.complete)).toBeNull();
  });

  it('uma sessão concluída não mostra nenhum botão', async () => {
    const { getByText, queryByLabelText } = await render(
      <SessionListItem {...BASE} status="completed" sessionRole="mentor" onPressComplete={jest.fn()} />,
    );

    expect(getByText(pt.sessions.completed)).toBeTruthy();
    expect(queryByLabelText(pt.sessions.complete)).toBeNull();
  });

  it('enquanto termina, o botão deixa de mostrar o texto', async () => {
    const { queryByText, getByLabelText } = await render(
      <SessionListItem {...BASE} sessionRole="mentor" completing onPressComplete={jest.fn()} />,
    );

    expect(queryByText(pt.sessions.complete)).toBeNull();
    // O botão continua lá (desativado, com o indicador de progresso) para o toque não cair no vazio.
    expect(getByLabelText(pt.sessions.complete)).toBeTruthy();
  });
});
