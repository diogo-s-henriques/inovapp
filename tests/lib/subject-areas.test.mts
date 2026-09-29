/**
 * Testes da lista de disciplinas por área (src/constants/profile.ts).
 *
 * A lista deixou de ser doze nomes soltos para ser doze áreas com ~80 disciplinas, e é usada em
 * cinco sítios ao mesmo tempo (chips do setup, seletor, filtro da pesquisa, pedido de sessão e o
 * match). Três invariantes é que a seguram:
 *
 * 1. **Ninguém perde o que já tinha escolhido.** As doze disciplinas antigas continuam na lista -
 *    as contas de demonstração ensinam "Programação" e "Matemática" e os perfis em produção têm
 *    disciplinas gravadas que o seletor só mostra se cá estiverem.
 * 2. **Uma disciplina pertence a uma só área.** É isto que torna `SUBJECT_OPTIONS` derivável (sem
 *    duplicados) e que dá sentido a contar áreas no match.
 * 3. **Disciplina desconhecida não tem área.** Perfis antigos podem ter nomes que já saíram da
 *    lista: continuam a contar para a disciplina e não podem rebentar nada.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SUBJECT_AREAS, SUBJECT_OPTIONS, subjectAreaOf } from '@/constants/profile';

/** As doze disciplinas que existiam antes das áreas - nenhuma pode desaparecer. */
const DISCIPLINAS_ANTIGAS = [
  'Matemática',
  'Física',
  'Química',
  'Programação',
  'Inglês',
  'Estatística',
  'Contabilidade',
  'Direito',
  'Biologia',
  'Cálculo',
  'Redação',
  'Economia',
];

describe('SUBJECT_AREAS - a lista agrupada', () => {
  it('todas as disciplinas de antes continuam lá', () => {
    // Se uma sair, quem a tinha escolhida deixa de a ver marcada no seletor e pode continuar a
    // ensiná-la sem aparecer na pesquisa por disciplina.
    DISCIPLINAS_ANTIGAS.forEach((subject) => {
      assert.ok(SUBJECT_OPTIONS.includes(subject), `a disciplina "${subject}" desapareceu da lista`);
    });
  });

  it('não tem áreas vazias nem rótulos em branco', () => {
    SUBJECT_AREAS.forEach((area) => {
      assert.ok(area.subjects.length > 0, `a área "${area.label}" está vazia`);
      assert.ok(area.label.trim().length > 0, `há uma área com o id "${area.id}" sem rótulo`);
    });
  });

  it('não repete disciplinas', () => {
    assert.equal(new Set(SUBJECT_OPTIONS).size, SUBJECT_OPTIONS.length);
  });

  it('não repete áreas', () => {
    const ids = SUBJECT_AREAS.map((area) => area.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('a lista achatada é exatamente as áreas somadas, pela ordem delas', () => {
    assert.deepEqual(
      SUBJECT_OPTIONS,
      SUBJECT_AREAS.flatMap((area) => area.subjects),
    );
  });

  it('continua a ser uma lista curta de propósito', () => {
    // O limite não é decorativo: foi o tamanho da lista que decidiu que o campo das disciplinas
    // deixava de caber todo num ecrã e passava a ter pesquisa. Uma lista a crescer para centenas
    // volta a partir isso - e é bom que se note aqui, e não no ecrã.
    assert.ok(SUBJECT_OPTIONS.length <= 90, `a lista tem ${SUBJECT_OPTIONS.length} disciplinas`);
  });
});

describe('subjectAreaOf - a área de uma disciplina', () => {
  it('encontra a área de uma disciplina conhecida', () => {
    assert.equal(subjectAreaOf('Programação')?.label, 'Programação e Dados');
    assert.equal(subjectAreaOf('Ótica e Optometria')?.label, 'Saúde');
  });

  it('cada disciplina pertence a uma só área', () => {
    SUBJECT_OPTIONS.forEach((subject) => {
      const areas = SUBJECT_AREAS.filter((area) => area.subjects.includes(subject));
      assert.equal(areas.length, 1, `"${subject}" está em ${areas.length} áreas`);
    });
  });

  it('uma disciplina que já não está na lista não tem área', () => {
    // Perfis antigos podem ter nomes que saíram: contam para a disciplina, não para a área.
    assert.equal(subjectAreaOf('Investigação Operacional'), undefined);
    assert.equal(subjectAreaOf(''), undefined);
  });
});
