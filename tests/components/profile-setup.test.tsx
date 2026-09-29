/**
 * Testes do assistente de configuração de perfil (`src/app/profile-setup.tsx`) - o que cada papel
 * vê pelo caminho e o que fica escrito no fim.
 *
 * É onde a regra nova dos papéis mais se nota: um **aluno** tem dois passos (o perfil e os objetivos
 * de aprendizagem) e um **docente** tem três (o perfil, as disciplinas que ensina e a
 * disponibilidade). Antes desta versão havia um terceiro passo em que se escolhia o modo de
 * participação (`learn` / `teach` / `both`) - e é exatamente ele que já não pode aparecer a
 * ninguém. O outro lado da moeda está aqui também: o que o assistente **escreve** (não há
 * `participationMode`, e um aluno não leva disciplinas que ensina).
 *
 * O que está substituído, e porquê: as ações do Firebase (`completeProfileSetup`), a escolha da
 * fotografia (que abre a galeria do sistema), os dois seletores de folha nativa (curso e
 * disciplinas) e o vídeo do passo final - nenhum deles é o que este ficheiro testa, e todos
 * precisam de um runtime nativo que o ambiente de testes não tem. O caminho a sério - contra o
 * emulador, com as regras do Firestore pelo meio - está em `tests/data/papeis.test.mts`.
 */
import { fireEvent, render } from '@testing-library/react-native';

import ProfileSetupScreen from '@/app/profile-setup';
import { completeProfileSetup } from '@/auth/actions';
import { useAuthStore } from '@/auth/store';
import { pt } from '@/i18n/pt';
import { useLocaleStore } from '@/i18n/store';
import type { ProfileSetupData } from '@/types/profile';

const mockReplace = jest.fn();

jest.mock('@/auth/actions', () => ({
  completeProfileSetup: jest.fn(),
}));

jest.mock('@/lib/storage', () => ({
  pickPreparedProfilePhoto: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

// Os dois seletores abrem folhas nativas e o passo final é um vídeo: nenhum deles cabe num render.
jest.mock('@/components/domain/Profile/CourseField', () => ({ CourseField: () => null }));
jest.mock('@/components/domain/Profile/SubjectsField', () => ({ SubjectsField: () => null }));
jest.mock('@/components/domain/ProfileSetup/StepComplete', () => ({ StepComplete: () => null }));

/** Põe a conta com sessão no estado que o assistente lê: o papel do utilizador. */
function entrarComo(role: 'student' | 'professor') {
  useAuthStore.setState({
    initializing: false,
    profileCompleted: false,
    user: {
      uid: 'u1',
      email: role === 'professor' ? 'docente@iseclisboa.pt' : 'ana@alunos.iseclisboa.pt',
      emailVerified: true,
      role,
    },
  });
}

/** Os dados que o assistente passou ao `completeProfileSetup` (o último passo do fluxo). */
function dadosGuardados(): ProfileSetupData {
  const chamadas = (completeProfileSetup as jest.Mock).mock.calls;
  expect(chamadas).toHaveLength(1);
  expect(chamadas[0][0]).toBe('u1');
  return chamadas[0][1] as ProfileSetupData;
}

beforeEach(() => {
  jest.clearAllMocks();
  useLocaleStore.getState().setLocale('pt');
});

describe('<ProfileSetupScreen /> - o fluxo de um aluno', () => {
  it('passa em dois passos e acaba, sem nenhum passo de modo de participação', async () => {
    entrarComo('student');
    const { getByLabelText, getByPlaceholderText, getByText, queryByText } = await render(
      <ProfileSetupScreen />,
    );

    // Passo 1: o perfil, com curso e ano (é a única diferença do passo 1 de um docente).
    expect(getByText(pt.profileSetup.createProfileSubtitleStudent)).toBeTruthy();
    expect(queryByText(pt.profileSetup.learningGoalsTitle)).toBeNull();

    // Sem nome e sem ano não se avança: o ano é o que diz que a pessoa é aluna.
    await fireEvent.press(getByLabelText(pt.common.continue));
    expect(queryByText(pt.profileSetup.learningGoalsTitle)).toBeNull();

    await fireEvent.changeText(getByPlaceholderText(pt.profileSetup.fullNamePlaceholder), 'Ana Silva');
    await fireEvent.press(getByText('2º ano'));
    await fireEvent.press(getByLabelText(pt.common.continue));

    // Passo 2: os objetivos de aprendizagem, e é aqui que um aluno pode saltar.
    expect(getByText(pt.profileSetup.learningGoalsTitle)).toBeTruthy();
    expect(getByText(pt.profileSetup.skipForNow)).toBeTruthy();

    await fireEvent.press(getByLabelText(pt.common.continue));

    // Acabou: não há um terceiro passo para ninguém, e o de um docente também não aparece por engano.
    expect(queryByText(pt.profileSetup.professorSubjectsTitle)).toBeNull();
    expect(queryByText(pt.profileSetup.availabilityTitle)).toBeNull();

    await fireEvent.press(getByLabelText(pt.profileSetup.finish));

    const dados = dadosGuardados();
    expect(dados.fullName).toBe('Ana Silva');
    expect(dados.year).toBe('2º ano');
    expect(dados.learningSubjects).toEqual([]);
    // Um aluno não tem disciplinas que ensina nem disponibilidade no perfil de criação, e o modo de
    // participação deixou de existir de vez.
    expect(dados.teachingSubjects).toEqual([]);
    expect('participationMode' in dados).toBe(false);
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('o nome sozinho não chega - o ano é pedido a um aluno', async () => {
    entrarComo('student');
    const { getByLabelText, getByPlaceholderText, getByText, queryByText } = await render(
      <ProfileSetupScreen />,
    );

    await fireEvent.changeText(getByPlaceholderText(pt.profileSetup.fullNamePlaceholder), 'Ana Silva');
    await fireEvent.press(getByLabelText(pt.common.continue));

    expect(queryByText(pt.profileSetup.learningGoalsTitle)).toBeNull();

    await fireEvent.press(getByText('1º ano'));
    await fireEvent.press(getByLabelText(pt.common.continue));

    expect(getByText(pt.profileSetup.learningGoalsTitle)).toBeTruthy();
  });
});

describe('<ProfileSetupScreen /> - o fluxo de um docente', () => {
  it('passa em três passos, sem curso nem ano', async () => {
    entrarComo('professor');
    const { getByLabelText, getByPlaceholderText, getByText, queryByText } = await render(
      <ProfileSetupScreen />,
    );

    // Passo 1: o perfil de um docente - o subtítulo é outro e o ano não existe.
    expect(getByText(pt.profileSetup.createProfileSubtitleProfessor)).toBeTruthy();
    expect(queryByText(pt.profileSetup.yearLabel)).toBeNull();

    await fireEvent.changeText(getByPlaceholderText(pt.profileSetup.fullNamePlaceholder), 'Docente ISEC');
    await fireEvent.press(getByLabelText(pt.common.continue));

    // Passo 2: as disciplinas que ensina (é o que o põe na descoberta).
    expect(getByText(pt.profileSetup.professorSubjectsTitle)).toBeTruthy();

    await fireEvent.press(getByLabelText(pt.common.continue));

    // Passo 3: a disponibilidade.
    expect(getByText(pt.profileSetup.availabilityTitle)).toBeTruthy();
    expect(getByText(pt.profileSetup.professorAvailabilitySubtitle)).toBeTruthy();

    await fireEvent.press(getByLabelText(pt.common.continue));
    await fireEvent.press(getByLabelText(pt.profileSetup.finish));

    const dados = dadosGuardados();
    expect(dados.fullName).toBe('Docente ISEC');
    // Um docente não tem curso nem ano, nem objetivos de aprendizagem: o papel dele é o outro lado.
    expect(dados.course).toBeUndefined();
    expect(dados.year).toBeUndefined();
    expect(dados.learningSubjects).toEqual([]);
    expect('participationMode' in dados).toBe(false);
  });
});
