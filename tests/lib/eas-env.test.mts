/**
 * As variáveis que a app lê têm de estar onde a **build de loja** as vê.
 *
 * O que este teste fixa é o buraco que chegou à revisão da App Store: a 1.0 (6) foi recusada com
 * "we were unable to review the app because it crashed on launch" (diretriz 2.1a), e a causa estava
 * numa linha que ninguém podia ver no código:
 *
 * ```
 * .env está no .gitignore, não há .easignore
 *   -> o EAS arquiva o projeto pelo .gitignore: o .env não sobe para o construtor
 *   -> o bundle sai com as seis EXPO_PUBLIC_FIREBASE_* a undefined
 *   -> src/lib/firebase.ts faz `export const auth = createAuth()` no topo do ficheiro
 *   -> o SDK do Firebase recusa a chave vazia ("auth/invalid-api-key") e o módulo rebenta
 *   -> um throw ao avaliar um módulo não tem ecrã por trás: a app fecha ao abrir
 * ```
 *
 * Em desenvolvimento nada disto se vê - o `expo start` lê o `.env` e um *development build* vai
 * buscar o JS ao Metro -, e foi por isso que a app funcionava em todos os telemóveis onde foi
 * testada e falhava exatamente onde não podia: no revisor.
 *
 * A verificação de que o problema ficou resolvido não cabe neste teste (obrigava a construir um
 * bundle); o que ele garante é que a **configuração** está completa e coerente. A outra metade,
 * a de que o valor chega mesmo ao bundle, faz-se com um `npx expo export` e um `grep` - está no
 * README, em "As variáveis que as lojas precisam".
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const SRC = join(RAIZ, 'src');

/** O que o código lê do ambiente: `process.env.EXPO_PUBLIC_ALGUMA_COISA`. */
const VARIAVEL = /process\.env\.(EXPO_PUBLIC_[A-Z0-9_]+)/g;

/** Os perfis que o EAS constrói. Os três têm de chegar às variáveis, direta ou indiretamente. */
const PERFIS = ['development', 'preview', 'production'];

/**
 * Os comentários apagados, com as linhas deles preservadas.
 *
 * A prosa deste repositório fala destas variáveis para explicar o problema (este ficheiro é o
 * exemplo mais óbvio), e sem isto o teste acusava os próprios comentários que o justificam - o
 * mesmo motivo pelo qual o `bundle-requires.test.mts` faz o mesmo.
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

/** As variáveis que o código lê, e em que ficheiro/linha - para a mensagem de falha ser útil. */
function variaveisLidas(): Map<string, string[]> {
  const encontradas = new Map<string, string[]>();
  for (const ficheiro of ficheirosDeCodigo(SRC)) {
    const linhas = readFileSync(ficheiro, 'utf8').split('\n');
    const fonte = semComentarios(linhas.join('\n'));
    for (const encontro of fonte.matchAll(VARIAVEL)) {
      const linha = fonte.slice(0, encontro.index).split('\n').length;
      const onde = `${relative(RAIZ, ficheiro).replace(/\\/g, '/')}:${linha}`;
      encontradas.set(encontro[1], [...(encontradas.get(encontro[1]) ?? []), onde]);
    }
  }
  return encontradas;
}

/** As variáveis que um ficheiro `CHAVE=valor` declara, com o valor - que **nunca** é impresso. */
function lerFicheiroDeAmbiente(conteudo: string): Map<string, string> {
  const valores = new Map<string, string>();
  for (const linha of conteudo.split(/\r?\n/)) {
    const encontro = /^\s*(EXPO_PUBLIC_[A-Z0-9_]+)\s*=\s*(.*)$/.exec(linha);
    if (encontro) valores.set(encontro[1], encontro[2].trim().replace(/^["']|["']$/g, ''));
  }
  return valores;
}

const lidas = variaveisLidas();
const eas = JSON.parse(readFileSync(join(RAIZ, 'eas.json'), 'utf8')) as {
  build: Record<string, { extends?: string; env?: Record<string, string> }>;
};
const noEas = eas.build.base?.env ?? {};
const exemplo = lerFicheiroDeAmbiente(readFileSync(join(RAIZ, '.env.example'), 'utf8'));
const caminhoDoEnv = join(RAIZ, '.env');
const noEnv = existsSync(caminhoDoEnv)
  ? lerFicheiroDeAmbiente(readFileSync(caminhoDoEnv, 'utf8'))
  : null;

describe('as variáveis de ambiente que o EAS tem de injetar', () => {
  it('a varredura chegou ao código', () => {
    // Sem isto, um erro no caminho do `src` deixava o resto do ficheiro a passar por não haver nada
    // para verificar - o pior resultado possível num teste que existe para impedir um silêncio.
    assert.ok(lidas.size > 0, 'não encontrei nenhum process.env.EXPO_PUBLIC_* em src');
    assert.ok(
      lidas.has('EXPO_PUBLIC_FIREBASE_API_KEY'),
      'a varredura não viu a variável que o Firebase lê - o teste está a olhar para o sítio errado',
    );
  });

  for (const [variavel, onde] of lidas) {
    it(`${variavel} está no eas.json`, () => {
      assert.ok(
        noEas[variavel] !== undefined,
        `A build de loja não define ${variavel} (lida em ${onde.join(', ')}). O .env não chega ao ` +
          'construtor do EAS: sem esta linha em eas.json (perfil `base`), o bundle sai sem ' +
          'configuração do Firebase e a app fecha no arranque.',
      );
      assert.ok(
        noEas[variavel] !== '',
        `${variavel} está no eas.json mas vazia - é o mesmo que não estar.`,
      );
    });

    it(`${variavel} está documentada no .env.example`, () => {
      assert.ok(
        exemplo.has(variavel),
        `${variavel} não está no .env.example: quem clonar o repositório não sabe que a tem de ` +
          'preencher, e a app fecha no arranque em vez de avisar.',
      );
    });
  }

  for (const perfil of PERFIS) {
    it(`o perfil "${perfil}" chega às variáveis`, () => {
      const definido = eas.build[perfil];
      assert.ok(definido, `eas.json não tem o perfil de build "${perfil}"`);
      const herda = definido.env?.['EXPO_PUBLIC_FIREBASE_API_KEY'] !== undefined;
      assert.ok(
        herda || definido.extends === 'base',
        `o perfil "${perfil}" não define as variáveis nem herda do perfil "base" - uma build com ` +
          'esta opção sairia sem configuração do Firebase.',
      );
    });
  }

  it('o .env e o eas.json apontam para o mesmo projeto', () => {
    // Se este falhar, um dos lados ficou para trás (uma chave rodada, um projeto trocado) - e a app
    // testada em desenvolvimento passava a ser uma app diferente da que vai para a loja. Os valores
    // não entram na mensagem de propósito: isto corre em logs de CI.
    if (!noEnv) return;
    for (const variavel of lidas.keys()) {
      assert.ok(noEnv.has(variavel), `o .env não tem ${variavel}`);
      assert.equal(
        noEnv.get(variavel),
        noEas[variavel],
        `${variavel}: o .env e o eas.json têm valores diferentes (não os mostro aqui - compara-os ` +
          'nos dois ficheiros).',
      );
    }
  });
});
