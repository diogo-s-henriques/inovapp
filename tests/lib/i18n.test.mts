/**
 * Testes de `src/i18n/store.ts` e dos dicionários.
 *
 * A tipagem (`Translations`) já garante em tempo de compilação que o `pt` e o `en` têm as mesmas
 * chaves. O que ela não apanha é o resto: valores vazios, funções que ignoram os argumentos e a
 * chave de persistência a mudar sem ninguém dar por isso (o que apagaria silenciosamente a
 * escolha de idioma de quem já tinha a app instalada).
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { en } from '@/i18n/en';
import { pt } from '@/i18n/pt';
import {
  getLocale,
  getTranslations,
  LOCALE_STORAGE_KEY,
  TRANSLATIONS,
  useLocaleStore,
  type Locale,
} from '@/i18n/store';
import type { Translations } from '@/i18n/translations';

/** Percorre o dicionário e devolve cada folha com o caminho que levou até ela. */
function folhas(value: unknown, caminho = ''): Array<[string, unknown]> {
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([chave, valor]) =>
      folhas(valor, caminho ? `${caminho}.${chave}` : chave),
    );
  }
  return [[caminho, value]];
}

const DICIONARIOS: Array<[Locale, Translations]> = [
  ['pt', pt],
  ['en', en],
];

describe('estado do idioma', () => {
  beforeEach(() => {
    useLocaleStore.getState().setLocale('pt');
  });

  it('começa em português', () => {
    assert.equal(useLocaleStore.getState().locale, 'pt');
    assert.equal(getLocale(), 'pt');
  });

  it('mantém a chave de armazenamento documentada', () => {
    // Mudar esta chave faz com que a escolha guardada no dispositivo deixe de ser encontrada:
    // quem tinha inglês volta a português no arranque seguinte, sem aviso.
    assert.equal(LOCALE_STORAGE_KEY, 'inovapp:locale');
  });

  it('devolve o dicionário português por omissão', () => {
    assert.equal(getTranslations(), pt);
  });

  it('troca o dicionário ao mudar o idioma', () => {
    useLocaleStore.getState().setLocale('en');
    assert.equal(getLocale(), 'en');
    assert.equal(getTranslations(), en);
  });

  it('getTranslations e getLocale lêem o mesmo estado', () => {
    useLocaleStore.getState().setLocale('en');
    assert.equal(getTranslations(), TRANSLATIONS[getLocale()]);
  });

  it('tem um dicionário para cada idioma suportado', () => {
    assert.deepEqual(Object.keys(TRANSLATIONS).sort(), ['en', 'pt']);
    assert.equal(TRANSLATIONS.pt, pt);
    assert.equal(TRANSLATIONS.en, en);
  });
});

describe('dicionários', () => {
  for (const [nome, dicionario] of DICIONARIOS) {
    it(`${nome}: nenhuma tradução vazia`, () => {
      const vazias = folhas(dicionario)
        .filter(([, valor]) => typeof valor === 'string' && valor.trim() === '')
        .map(([caminho]) => caminho);

      assert.deepEqual(vazias, [], `${nome} tem traduções vazias: ${vazias.join(', ')}`);
    });

    it(`${nome}: nenhuma tradução por preencher`, () => {
      const emFalta = folhas(dicionario)
        .filter(([, valor]) => valor === undefined || valor === null)
        .map(([caminho]) => caminho);

      assert.deepEqual(emFalta, [], `${nome} tem traduções em falta: ${emFalta.join(', ')}`);
    });

    it(`${nome}: todas as folhas são texto ou função`, () => {
      const inesperadas = folhas(dicionario)
        .filter(([, valor]) => typeof valor !== 'string' && typeof valor !== 'function')
        .map(([caminho, valor]) => `${caminho} (${typeof valor})`);

      assert.deepEqual(inesperadas, []);
    });

    it(`${nome}: as funções usam os argumentos que recebem`, () => {
      assert.ok(
        dicionario.roles.withTutee('ETIQUETA').includes('ETIQUETA'),
        `${nome}.roles.withTutee ignora a etiqueta que recebe`,
      );
      assert.ok(
        dicionario.common.starRating(7).includes('7'),
        `${nome}.common.starRating ignora o número que recebe`,
      );
    });
  }

  it('pt e en têm exatamente a mesma estrutura de chaves', () => {
    const caminhosPt = folhas(pt).map(([caminho]) => caminho).sort();
    const caminhosEn = folhas(en).map(([caminho]) => caminho).sort();

    assert.deepEqual(caminhosEn, caminhosPt);
  });

  it('o dicionário inglês está mesmo traduzido', () => {
    // Uma cópia do pt para o en passaria todas as verificações estruturais acima. Esta apanha-a:
    // numa tradução a sério, a esmagadora maioria das entradas é diferente (as coincidências são
    // siglas e nomes próprios).
    const textos = (dicionario: Translations) =>
      new Map(
        folhas(dicionario)
          .filter(([, valor]) => typeof valor === 'string')
          .map(([caminho, valor]) => [caminho, valor as string]),
      );

    const textosPt = textos(pt);
    const textosEn = textos(en);
    const iguais = [...textosPt.keys()].filter((caminho) => textosPt.get(caminho) === textosEn.get(caminho));
    const proporcao = iguais.length / textosPt.size;

    assert.ok(
      proporcao < 0.1,
      `${iguais.length} de ${textosPt.size} entradas são iguais nos dois idiomas: ${iguais.slice(0, 12).join(', ')}`,
    );
  });
});
