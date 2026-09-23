/**
 * Testes do logótipo do parceiro nos ecrãs de entrada (o crédito "powered by INOVEDU").
 *
 * Existe pela mesma razão que `tests/lib/app-icon.test.mts`: um logótipo não é código, e nada parte
 * quando ele fica errado - o que se descobre é tarde e do lado de fora, com a app já a mostrar uma
 * tarja branca a quem a abre. E este defeito já aconteceu **duas vezes**, sempre com a mesma forma:
 * o ficheiro que chega é um WebP **VP8 sem canal alfa**, ou seja um retângulo com o fundo branco
 * colado ao desenho. Sobre o cinzento-claro destes ecrãs isso vê-se logo. Foi assim com a faixa dos
 * parceiros (`assets/Parceiros/parceiros.png`) e foi assim com este logótipo.
 *
 * O que fica fixado, e porquê:
 *
 * 1. **O componente usa o PNG tratado, não o WebP que chegou** - trocar de volta é a forma de
 *    reintroduzir o defeito, e é uma troca de uma linha que nenhum outro teste veria;
 * 2. **A moldura do PNG é transparente** - se lhe colarem outro fundo, vê-se aqui antes de a app o
 *    mostrar a alguém;
 * 3. **A tinta existe e não é clara** - um PNG todo transparente passava (1) e (2) sem mostrar nada,
 *    e um logótipo quase branco passava os três sem se ler;
 * 4. **A altura do logótipo do crédito é a do logótipo da INOVAPP** - não é um número escolhido a
 *    esmo: é o que faz as duas marcas lerem-se ao mesmo nível. Sozinho em `login.tsx`, é um valor
 *    que se muda sem ninguém dar por isso.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** O leitor de PNG do `scripts/png-transparent-background.js` - o mesmo que tirou o fundo. */
const { decodePng } = createRequire(import.meta.url)(path.join(RAIZ, 'scripts/png-transparent-background.js'));

interface Bitmap {
  width: number;
  height: number;
  pixels: Buffer;
}

const COMPONENTE = 'src/components/domain/PoweredBy/index.tsx';
/** O PNG tratado, e o WebP de origem (que fica no repositório como fonte do primeiro). */
const LOGOTIPO = 'assets/Parceiros/inovedu-2c475acd.png';
const ORIGEM = 'assets/Parceiros/inovedu-2c475acd.webp';

function ler(caminhoRelativo: string): Bitmap {
  return decodePng(readFileSync(path.join(RAIZ, caminhoRelativo)));
}

/** Um pixel em RGBA, a partir do buffer de 4 canais que o descodificador devolve. */
function pixel(imagem: Bitmap, x: number, y: number): [number, number, number, number] {
  const i = (y * imagem.width + x) * 4;
  return [imagem.pixels[i], imagem.pixels[i + 1], imagem.pixels[i + 2], imagem.pixels[i + 3]];
}

/** A largura da moldura que se inspeciona, em pixels. */
const MOLDURA = 2;

describe('logótipo do parceiro (powered by)', () => {
  it('o componente exige o PNG tratado, e não o WebP de origem', () => {
    const fonte = readFileSync(path.join(RAIZ, COMPONENTE), 'utf8');

    assert.ok(
      fonte.includes('inovedu-2c475acd.png'),
      'o componente devia exigir o PNG com o fundo tirado - ver o topo deste ficheiro',
    );
    assert.ok(
      !/require\([^)]*inovedu-2c475acd\.webp\s*\)/.test(fonte),
      'o componente não pode exigir o WebP: é um VP8 sem canal alfa, e traz o fundo branco colado',
    );
    assert.ok(
      readFileSync(path.join(RAIZ, ORIGEM)).length > 0,
      'o WebP de origem devia continuar no repositório - é de onde o PNG tratado se volta a gerar',
    );
  });

  it('a moldura do PNG é toda transparente - não há fundo colado', () => {
    const imagem = ler(LOGOTIPO);
    const comFundo: string[] = [];

    for (let y = 0; y < imagem.height; y += 1) {
      for (let x = 0; x < imagem.width; x += 1) {
        const naMoldura =
          x < MOLDURA || y < MOLDURA || x >= imagem.width - MOLDURA || y >= imagem.height - MOLDURA;
        if (!naMoldura) continue;
        if (pixel(imagem, x, y)[3] !== 0) comFundo.push(`${x},${y}`);
      }
    }

    assert.equal(
      comFundo.length,
      0,
      `a moldura do logótipo tem ${comFundo.length} pixéis opacos (ex.: ${comFundo.slice(0, 5).join(' ')}) - ` +
        'é o fundo que ficou colado; volta a correr `node scripts/png-transparent-background.js`',
    );
  });

  it('o crédito usa a altura do logótipo da INOVAPP, não um valor solto', () => {
    const ecrã = readFileSync(path.join(RAIZ, 'src/app/login.tsx'), 'utf8');
    const logotipoDaApp = readFileSync(path.join(RAIZ, 'src/components/ui/Logo/index.tsx'), 'utf8');

    const credito = /const POWERED_BY_HEIGHT = (\d+);/.exec(ecrã);
    const alturaDaApp = /height = (\d+)/.exec(logotipoDaApp);

    assert.ok(credito, 'esperava `POWERED_BY_HEIGHT` em src/app/login.tsx');
    assert.ok(alturaDaApp, 'esperava a altura por omissão em src/components/ui/Logo/index.tsx');
    assert.equal(
      Number(credito[1]),
      Number(alturaDaApp[1]),
      'o logótipo do crédito (POWERED_BY_HEIGHT) devia ter a altura do logótipo da INOVAPP (Logo)',
    );
  });

  it('tem tinta suficiente, e escura o bastante para se ler sobre o fundo claro', () => {
    const imagem = ler(LOGOTIPO);
    let visiveis = 0;
    let somaDoCanalMaisEscuro = 0;

    for (let y = 0; y < imagem.height; y += 1) {
      for (let x = 0; x < imagem.width; x += 1) {
        const [r, g, b, a] = pixel(imagem, x, y);
        // Abaixo disto é a borda suavizada do logótipo, não o desenho.
        if (a < 40) continue;
        visiveis += 1;
        somaDoCanalMaisEscuro += Math.min(r, g, b);
      }
    }

    assert.ok(visiveis > 500, `o logótipo quase não tem tinta: ${visiveis} pixéis visíveis`);
    // O canal mais escuro de cada pixel é o que decide se ele se distingue de um fundo claro: um
    // logótipo amarelo passa, um pastel não - e este ecrã é quase branco.
    const media = somaDoCanalMaisEscuro / visiveis;
    assert.ok(
      media < 180,
      `a tinta do logótipo é clara demais (canal médio ${media.toFixed(0)}): desaparece sobre o fundo do ecrã`,
    );
  });
});
