/**
 * Testes das regras de preenchimento do perfil (src/lib/profile-form.ts) e do formato do par
 * curso/ano (src/constants/profile.ts → `joinCourseAndYear`).
 *
 * São todas decisões que não rebentam nada quando estão erradas - o botão fica só ativo a mais ou a
 * menos. É por isso que aqui ficam fixadas por escrito:
 *
 * 1. **O ano é obrigatório para estudantes** e não é decorativo: é o que diz que a pessoa é aluna
 *    da escola, e é o papel (docente do ISEC ou aluno) que decide de que lado da app ela fica.
 * 2. **O curso é opcional** nos dois sítios (criação e edição). Se alguém o tornar obrigatório por
 *    engano, o teste falha e obriga a decisão a ser consciente.
 * 3. **Um professor nunca tem ano nem curso** - o fluxo dele nem mostra esses campos, por isso
 *    exigi-los seria um botão morto no ecrã.
 * 4. `joinCourseAndYear` não deixa um separador órfão quando falta um dos dois valores: era o
 *    `", "` que aparecia por baixo do nome de um tutor.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { joinCourseAndYear } from '@/constants/profile';
import { canContinueSetup, canSaveProfile, setupSteps } from '@/lib/profile-form';

/** Um estudante no passo 1, com nome e ano preenchidos. Cada teste muda só o que testa. */
const ALUNO_PASSO_1 = { isProfessor: false, step: 1, fullName: 'Ana Silva', year: '2º ano' };

describe('canContinueSetup - assistente de criação de perfil', () => {
  it('no passo 1 basta o nome para um professor', () => {
    assert.equal(canContinueSetup({ ...ALUNO_PASSO_1, isProfessor: true, year: undefined }), true);
  });

  it('no passo 1 um estudante precisa do nome e do ano', () => {
    assert.equal(canContinueSetup(ALUNO_PASSO_1), true);
    assert.equal(canContinueSetup({ ...ALUNO_PASSO_1, year: undefined }), false);
    assert.equal(canContinueSetup({ ...ALUNO_PASSO_1, fullName: '' }), false);
  });

  it('o curso não é exigido para avançar', () => {
    // O pedido é explícito: o curso é opcional. Só o ano entra na validação do passo 1.
    assert.equal(canContinueSetup({ ...ALUNO_PASSO_1, year: '1º ano' }), true);
  });

  it('um nome só com espaços não conta como preenchido', () => {
    assert.equal(canContinueSetup({ ...ALUNO_PASSO_1, fullName: '   ' }), false);
  });

  it('no passo 2 não se pede nada - há "Saltar por agora"', () => {
    assert.equal(canContinueSetup({ isProfessor: false, step: 2, fullName: 'Ana Silva' }), true);
  });

  it('a partir do passo 2 não se pede nada - nem ao aluno nem ao professor', () => {
    // Um aluno tem dois passos (perfil e objetivos) e um professor três (perfil, disciplinas e
    // disponibilidade); nenhum dos seguintes tem campos obrigatórios.
    assert.equal(canContinueSetup({ isProfessor: false, step: 2, fullName: 'Ana Silva', year: '2º ano' }), true);
    assert.equal(canContinueSetup({ isProfessor: true, step: 2, fullName: 'Docente' }), true);
    assert.equal(canContinueSetup({ isProfessor: true, step: 3, fullName: 'Docente' }), true);
  });

  it('no ecrã final o botão "Concluir" está sempre ativo', () => {
    // `step` acima do total (3) é o ecrã de conclusão, que usa o mesmo botão que os passos.
    assert.equal(canContinueSetup({ isProfessor: false, step: 4, fullName: 'Ana Silva' }), true);
    assert.equal(canContinueSetup({ isProfessor: true, step: 4, fullName: 'Docente' }), true);
  });
});

describe('setupSteps - quantos passos tem o assistente', () => {
  it('um aluno tem dois passos: o perfil e os objetivos', () => {
    assert.equal(setupSteps(false), 2);
  });

  it('um docente tem três: o perfil, as disciplinas e a disponibilidade', () => {
    assert.equal(setupSteps(true), 3);
  });

  it('não há passos a mais para ninguém', () => {
    // O passo do modo de participação (aprender/ensinar/ambos) saiu com a regra do papel: quem
    // mostrava três passos a um aluno estava a pedir-lhe uma escolha que ele já não tem.
    assert.ok(setupSteps(false) < setupSteps(true));
  });
});

describe('canSaveProfile - guardar na edição do perfil', () => {
  const ALUNO = { saving: false, isProfessor: false, fullName: 'Ana Silva', year: '2º ano', hasChanges: true };

  it('um estudante com nome, ano e alterações pode guardar', () => {
    assert.equal(canSaveProfile(ALUNO), true);
  });

  it('sem ano, um estudante não guarda - nem uma conta antiga que nunca o preencheu', () => {
    assert.equal(canSaveProfile({ ...ALUNO, year: undefined }), false);
  });

  it('um professor não tem ano e guarda à mesma', () => {
    assert.equal(canSaveProfile({ ...ALUNO, isProfessor: true, year: undefined }), true);
  });

  it('o curso continua a não ser pedido', () => {
    assert.equal(canSaveProfile({ ...ALUNO, year: '1º ano' }), true);
  });

  it('não guarda sem nome, sem alterações, ou com um guardado a decorrer', () => {
    assert.equal(canSaveProfile({ ...ALUNO, fullName: '  ' }), false);
    assert.equal(canSaveProfile({ ...ALUNO, hasChanges: false }), false);
    assert.equal(canSaveProfile({ ...ALUNO, saving: true }), false);
  });
});

describe('joinCourseAndYear - o par curso/ano numa linha', () => {
  it('junta os dois com o separador do resto da app', () => {
    assert.equal(joinCourseAndYear('Engenharia Informática', '2º ano'), 'Engenharia Informática · 2º ano');
  });

  it('sem ano, mostra só o curso - sem separador pendurado', () => {
    assert.equal(joinCourseAndYear('Engenharia Informática', ''), 'Engenharia Informática');
  });

  it('sem curso, mostra só o ano', () => {
    assert.equal(joinCourseAndYear(undefined, '2º ano'), '2º ano');
  });

  it('sem curso nem ano (um professor) devolve vazio, para a linha não existir', () => {
    // É este vazio que o ecrã do perfil usa para não desenhar a linha: era aqui que aparecia o ", ".
    assert.equal(joinCourseAndYear(undefined, undefined), '');
    assert.equal(joinCourseAndYear('', ''), '');
  });
});
