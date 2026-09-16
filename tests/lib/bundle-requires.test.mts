/**
 * O Metro recolhe as dependências a **ler o código**: um `require()` cujo argumento não esteja
 * escrito no próprio ficheiro não lhe diz o que empacotar. Em desenvolvimento ele limita-se a avisar
 * e a app corre normalmente; no bundle de produção (`--dev false`) recusa o **ficheiro inteiro**:
 *
 * ```
 * SyntaxError: src/lib/app-check.ts: Invalid call at line 78: require(name)
 * ```
 *
 * Foi assim que a primeira AAB de produção falhou, na fase `EAGER_BUNDLE` do EAS - e o erro só
 * aparece lá: o Metro que se corre em desenvolvimento aceita o que o de produção recusa, por isso
 * nenhuma verificação local o teria apanhado. Este teste faz a pergunta que faltava na altura: há
 * algum `require` que o Metro não possa resolver a ler o ficheiro?
 *
 * A exceção legítima é o `require` com o **nome literal** (`require('expo-observe')`), que é como os
 * serviços nativos opcionais são carregados à mão para lhes apanhar a falha - esse caso é o que os
 * testes `observe-fallback` e `app-check-fallback` fixam.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../../src', import.meta.url));
const RAIZ = fileURLToPath(new URL('../../', import.meta.url));

/** `require(` seguido de algo que não abre uma string. */
const REQUIRES_DINAMICOS = /require\(\s*(?![`'"])./g;

/**
 * Os comentários apagados, com as linhas deles preservadas.
 *
 * Sem isto, a prosa deste repositório (que fala de `require(nome)` a explicar o problema) acusava
 * ela própria; e apagá-los sem deixar as linhas no sítio trocava os números de linha das mensagens.
 */
function semComentarios(source: string): string {
  const apagarSemMexerNasLinhas = (bloco: string) => bloco.replace(/[^\n]/g, ' ');
  return source
    .replace(/\/\*[\s\S]*?\*\//g, apagarSemMexerNasLinhas)
    .replace(/(^|\s)\/\/[^\n]*/g, apagarSemMexerNasLinhas);
}

function ficheirosDeCodigo(diretoria: string): string[] {
  return readdirSync(diretoria, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(diretoria, entrada.name);
    if (entrada.isDirectory()) return ficheirosDeCodigo(caminho);
    return /\.(ts|tsx)$/.test(entrada.name) ? [caminho] : [];
  });
}

const ficheiros = ficheirosDeCodigo(SRC);

/** Cada violação como `src/lib/exemplo.ts:12  require(nome)`. */
function violacoesDe(ficheiro: string): string[] {
  const linhas = readFileSync(ficheiro, 'utf8').split('\n');
  const fonte = semComentarios(linhas.join('\n'));

  return [...fonte.matchAll(REQUIRES_DINAMICOS)].map((encontro) => {
    const linha = fonte.slice(0, encontro.index).split('\n').length;
    return `${relative(RAIZ, ficheiro).replace(/\\/g, '/')}:${linha}  ${linhas[linha - 1].trim()}`;
  });
}

describe('requires que o Metro tem de resolver sozinho', () => {
  it('a varredura chega ao src todo', () => {
    // Se a pasta deixar de ser encontrada (ou o teste correr de outro sítio), o resto deste ficheiro
    // passava por não haver nada para acusar - que é o pior resultado possível num teste destes.
    assert.ok(ficheiros.length > 50, `esperava muitos ficheiros em src, encontrei ${ficheiros.length}`);
  });

  for (const ficheiro of ficheiros) {
    const violacoes = violacoesDe(ficheiro);
    if (violacoes.length === 0) continue;

    it(`${relative(RAIZ, ficheiro).replace(/\\/g, '/')} não tem requires dinâmicos`, () => {
      assert.fail(
        `O Metro não resolve estes sozinho e o bundle de produção recusa o ficheiro:\n  ${violacoes.join('\n  ')}`,
      );
    });
  }
});
