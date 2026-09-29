/**
 * Testes de `normalizeForSearch` (src/lib/text.ts).
 *
 * É a função que faz "gestao" encontrar "Gestão": quem procura uma disciplina escreve sem acentos e
 * em minúsculas, e as opções estão escritas com acentos e maiúsculas. Está partilhada pelos três
 * sítios com pesquisa (seletor de curso, seletor de disciplinas e filtro da pesquisa) precisamente
 * porque a parte que se engana com facilidade é a expressão que apaga os sinais.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeForSearch } from '@/lib/text';

describe('normalizeForSearch', () => {
  it('tira os acentos', () => {
    assert.equal(normalizeForSearch('Ótica'), 'otica');
    assert.equal(normalizeForSearch('Álgebra Linear'), 'algebra linear');
    assert.equal(normalizeForSearch('Educação de Infância'), 'educacao de infancia');
  });

  it('passa tudo a minúsculas', () => {
    assert.equal(normalizeForSearch('PROGRAMAÇÃO'), 'programacao');
  });

  it('deixa passar quem escreve sem acentos pelo que está acentuado', () => {
    assert.ok(normalizeForSearch('Ótica e Optometria').includes(normalizeForSearch('otica')));
    assert.ok(normalizeForSearch('Estatística').includes(normalizeForSearch('estatistica')));
  });

  it('não estraga o que não tem acentos nem o que está vazio', () => {
    assert.equal(normalizeForSearch('Programação'), 'programacao');
    assert.equal(normalizeForSearch('Matemática'), 'matematica');
    assert.equal(normalizeForSearch(''), '');
  });
});
