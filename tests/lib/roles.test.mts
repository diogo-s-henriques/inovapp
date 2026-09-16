/**
 * Testes de `roleLabel` (src/lib/roles.ts).
 *
 * O rótulo do papel é a única coisa que diz a alguém com quem está a falar — aparece por baixo do
 * nome na Home e nos cartões de descoberta. Duas assimetrias perdem-se com facilidade: **um
 * professor nunca é "Mentor"** (é "Tutor"), e quem ensina *e* aprende diz os dois papéis em vez de
 * escolher um. Nenhuma das duas rebenta nada se for trocada: só diz a coisa errada à pessoa errada.
 *
 * A função recebe o dicionário de propósito, por isso os testes usam o `pt` e o `en` fixos, sem
 * depender do idioma guardado no dispositivo.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { en } from '@/i18n/en';
import { pt } from '@/i18n/pt';
import { roleLabel } from '@/lib/roles';

describe('roleLabel — estudantes', () => {
  it('quem só aprende é Tutorando', () => {
    assert.equal(roleLabel('learn', 'student', pt), pt.roles.tutee);
  });

  it('quem só ensina é Mentor', () => {
    assert.equal(roleLabel('teach', 'student', pt), pt.roles.mentor);
  });

  it('quem ensina e aprende diz os dois papéis', () => {
    assert.equal(roleLabel('both', 'student', pt), pt.roles.withTutee(pt.roles.mentor));
  });

  it('sem modo definido, cai em Tutorando', () => {
    assert.equal(roleLabel(undefined, 'student', pt), pt.roles.tutee);
  });
});

describe('roleLabel — professores', () => {
  it('um professor que ensina é Tutor, nunca Mentor', () => {
    assert.equal(roleLabel('teach', 'professor', pt), pt.roles.tutor);
    assert.notEqual(roleLabel('teach', 'professor', pt), pt.roles.mentor);
  });

  it('um professor que ensina e aprende é Tutor e Tutorando', () => {
    assert.equal(roleLabel('both', 'professor', pt), pt.roles.withTutee(pt.roles.tutor));
  });

  it('um professor que só aprende continua a ser Tutorando', () => {
    assert.equal(roleLabel('learn', 'professor', pt), pt.roles.tutee);
  });
});

describe('roleLabel — idioma', () => {
  it('usa o dicionário que recebe, não o que está no dispositivo', () => {
    // A comparação usa o rótulo de Tutorando: "Mentor" escreve-se igual nos dois idiomas, por
    // isso não serviria para distinguir de que dicionário veio o texto.
    assert.equal(roleLabel('learn', 'student', en), en.roles.tutee);
    assert.notEqual(roleLabel('learn', 'student', en), pt.roles.tutee);
  });
});
