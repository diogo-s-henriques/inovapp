/**
 * Testes de `roleLabel` (src/lib/roles.ts).
 *
 * O rótulo do papel é a única coisa que diz a alguém com quem está a falar - aparece por baixo do
 * nome na Home, no Perfil e nos cartões da descoberta. São dois, e a regra é uma linha: um
 * **docente** (@iseclisboa.pt) é "Tutor" e tudo o resto é "Tutorando". O que se fixa aqui é que não
 * há um terceiro rótulo, nem um caso em que o papel mude com o que a pessoa faz dentro da app.
 * Nenhuma dessas trocas rebenta nada se for feita: só diz a coisa errada à pessoa errada.
 *
 * A função recebe o dicionário de propósito, por isso os testes usam o `pt` e o `en` fixos, sem
 * depender do idioma guardado no dispositivo.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { en } from '@/i18n/en';
import { pt } from '@/i18n/pt';
import { roleLabel } from '@/lib/roles';

describe('roleLabel - alunos', () => {
  it('um aluno é Tutorando', () => {
    assert.equal(roleLabel('student', pt), pt.roles.tutee);
    assert.notEqual(roleLabel('student', pt), pt.roles.tutor);
  });

  it('um papel por chegar cai em Tutorando', () => {
    // Antes de o perfil chegar não se afirma que alguém é docente: o rótulo por omissão é o de quem
    // procura, que é o caso mais comum das duas contas possíveis.
    assert.equal(roleLabel(undefined, pt), pt.roles.tutee);
  });
});

describe('roleLabel - docentes', () => {
  it('um docente do ISEC é Tutor', () => {
    assert.equal(roleLabel('professor', pt), pt.roles.tutor);
  });

  it('o papel não depende do que a pessoa faz, só do email', () => {
    // Deixou de haver "Mentor" e "Mentor e Tutorando": quem é docente é sempre Tutor, e quem não é
    // é sempre Tutorando - é a mesma resposta em todos os ecrãs.
    assert.notEqual(roleLabel('professor', pt), roleLabel('student', pt));
    assert.equal(roleLabel('professor', pt), pt.roles.tutor);
    assert.equal(roleLabel('student', pt), pt.roles.tutee);
  });
});

describe('roleLabel - idioma', () => {
  it('usa o dicionário que recebe, não o que está no dispositivo', () => {
    // A comparação usa o rótulo de Tutorando: "Tutor" escreve-se igual nos dois idiomas, por isso
    // não serviria para distinguir de que dicionário veio o texto.
    assert.equal(roleLabel('student', en), en.roles.tutee);
    assert.notEqual(roleLabel('student', en), pt.roles.tutee);
  });
});
