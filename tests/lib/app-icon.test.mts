/**
 * Testes dos ícones da app - o que está em `app.json` e o que está em `assets/images`.
 *
 * Este ficheiro existe por uma razão concreta: a app foi construída, testada e enviada para as duas
 * lojas com o **ícone do template do Expo** (o chevron branco sobre azul) em quatro sítios ao mesmo
 * tempo - o ícone do iOS, o do Android, o ecrã de arranque e o favicon. Nenhum teste olhava para
 * eles, porque nenhum deles é código: são ficheiros referidos por uma chave de configuração, e nada
 * acontece quando ficam errados. O que se descobre é tarde e do lado de fora (uma recusa na
 * submissão, um ícone alheio no ecrã de quem instala a app).
 *
 * Três regras, que são as três que as lojas verificam e que uma troca de ficheiro quebra sem avisar:
 *
 * 1. **O ícone do iOS não pode ter canal alfa.** A Apple recusa o ficheiro inteiro por isso, e a
 *    recusa só aparece na submissão.
 * 2. **A tinta do ícone do Android tem de caber na zona segura**, que é um **círculo** de 66dp dentro
 *    dos 108dp do adaptive icon. É aqui que uma imagem aparentemente folgada falha: a palavra é
 *    larga e baixa, e são os **cantos** do retângulo que trespassam o círculo, não os lados.
 * 3. **A cor de um símbolo de uma cor só vai no RGB e a cobertura vai no alfa** (o monochrome
 *    branco, o foreground preto). Misturar as duas coisas dá letras acinzentadas onde a app espera
 *    uma silhueta que o sistema pinta.
 *
 * Os ficheiros não são gerados aqui - são os que estão no repositório, que é o que a build vai
 * empacotar. `npm run icons:build` volta a gerá-los a partir do logótipo da marca.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** O leitor de PNG do `scripts/png-transparent-background.js` - o mesmo que gera os ícones. */
const { decodePng } = createRequire(import.meta.url)(path.join(RAIZ, 'scripts/png-transparent-background.js'));

interface Bitmap {
  width: number;
  height: number;
  pixels: Buffer;
}

const ICOD = 'assets/images/icon.png';
const FOREGROUND = 'assets/images/android-icon-foreground.png';
const MONOCHROME = 'assets/images/android-icon-monochrome.png';
const NOTIFICACAO = 'assets/images/android-icon-notification.png';
const FAVICON = 'assets/images/favicon.png';

/** A fonte da marca, de onde o gerador recorta as letras. */
const FONTE = 'assets/resized-512x512.png';

function ler(caminhoRelativo: string): Bitmap {
  return decodePng(readFileSync(path.join(RAIZ, caminhoRelativo)));
}

/** O `colorType` do IHDR (2 = RGB, 6 = RGBA) - o alfa do ficheiro, e não o dos pixéis. */
function colorType(caminhoRelativo: string): number {
  const cabecalho = readFileSync(path.join(RAIZ, caminhoRelativo)).subarray(0, 26);
  return cabecalho.readUInt8(25);
}

/** Um pixel em RGBA, a partir do buffer de 4 canais que o descodificador devolve. */
function pixel(imagem: Bitmap, x: number, y: number): [number, number, number, number] {
  const i = (y * imagem.width + x) * 4;
  return [imagem.pixels[i], imagem.pixels[i + 1], imagem.pixels[i + 2], imagem.pixels[i + 3]];
}

/** A caixa da tinta (pixéis que não são fundo) e quantos são. */
function caixa(imagem: Bitmap, eTinta: (r: number, g: number, b: number, a: number) => boolean) {
  let x0 = imagem.width;
  let y0 = imagem.height;
  let x1 = -1;
  let y1 = -1;
  let total = 0;

  for (let y = 0; y < imagem.height; y += 1) {
    for (let x = 0; x < imagem.width; x += 1) {
      const [r, g, b, a] = pixel(imagem, x, y);
      if (!eTinta(r, g, b, a)) continue;
      total += 1;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }

  return { x0, y0, x1, y1, total, largura: x1 - x0 + 1, altura: y1 - y0 + 1 };
}

/** O pixel mais afastado do centro que ainda tem tinta visível, em pixels. */
function maisLonge(imagem: Bitmap, alphaMinimo = 16): number {
  const centroX = imagem.width / 2;
  const centroY = imagem.height / 2;
  let maior = 0;

  for (let y = 0; y < imagem.height; y += 1) {
    for (let x = 0; x < imagem.width; x += 1) {
      if (pixel(imagem, x, y)[3] < alphaMinimo) continue;
      maior = Math.max(maior, Math.hypot(x + 0.5 - centroX, y + 0.5 - centroY));
    }
  }

  return maior;
}

/** A zona segura do adaptive icon: o círculo de 66dp dentro dos 108dp, em pixéis. */
function raioDaZonaSegura(lado: number): number {
  return ((66 / 108) * lado) / 2;
}

describe('o ícone do iOS e da loja (`icon.png`)', () => {
  // O ficheiro é o que a App Store usa como ícone de marketing, e é o único sítio da app em que o
  // tamanho exato é uma regra da loja e não uma escolha de desenho.
  it('está em 1024x1024', () => {
    const imagem = ler(ICOD);
    assert.equal(imagem.width, 1024);
    assert.equal(imagem.height, 1024);
  });

  it('não tem canal alfa (a App Store recusa o ficheiro por causa disso)', () => {
    assert.equal(colorType(ICOD), 2, 'esperava RGB sem alfa (colorType 2)');
  });

  it('tem fundo branco - não é o azul do template do Expo', () => {
    const [r, g, b] = pixel(ler(ICOD), 0, 0);
    assert.deepEqual([r, g, b], [255, 255, 255]);
  });

  it('a palavra está ao centro e a 80% da largura', () => {
    const imagem = ler(ICOD);
    const tinta = caixa(imagem, (r, g, b) => Math.min(r, g, b) < 240);

    assert.ok(tinta.total > 0, 'não encontrei tinta nenhuma no ícone');
    const margemEsquerda = tinta.x0;
    const margemDireita = imagem.width - 1 - tinta.x1;
    assert.ok(
      Math.abs(margemEsquerda - margemDireita) <= 3,
      `a palavra não está centrada: ${margemEsquerda} px à esquerda, ${margemDireita} à direita`,
    );

    const parte = tinta.largura / imagem.width;
    assert.ok(parte >= 0.76 && parte <= 0.84, `a palavra ocupa ${(parte * 100).toFixed(1)}% da largura (esperava 80%)`);

    const centro = (tinta.y0 + tinta.y1) / 2;
    assert.ok(Math.abs(centro - imagem.height / 2) <= 3, `a palavra está a ${centro.toFixed(1)} px do topo`);
  });

  it('a tinta é uma palavra e não uma forma cheia', () => {
    // Um logótipo-palavra ocupa pouca área (traços finos); o chevron do template do Expo era um
    // bloco cheio. É este o número que distingue os dois sem se saber desenhar nenhum deles.
    const imagem = ler(ICOD);
    const tinta = caixa(imagem, (r, g, b) => Math.min(r, g, b) < 240);
    const parte = tinta.total / (imagem.width * imagem.height);
    assert.ok(parte > 0.02 && parte < 0.2, `a tinta ocupa ${(parte * 100).toFixed(1)}% do ícone`);
  });
});

describe('os ícones do Android (adaptive icon)', () => {
  const aTinta = (_r: number, _g: number, _b: number, a: number) => a >= 16;

  for (const [nome, ficheiro] of [
    ['o foreground', FOREGROUND],
    ['o monochrome', MONOCHROME],
  ] as const) {
    it(`${nome} cabe na zona segura (o círculo, não a margem)`, () => {
      const imagem = ler(ficheiro);
      const raio = raioDaZonaSegura(imagem.width);
      const longe = maisLonge(imagem);

      assert.ok(
        longe <= raio,
        `${nome}: a tinta chega a ${longe.toFixed(1)} px do centro e a zona segura só vai até ${raio.toFixed(1)} px`,
      );
    });
  }

  it('o foreground e o monochrome têm o mesmo tamanho e o mesmo desenho', () => {
    const esquerda = ler(FOREGROUND);
    const direita = ler(MONOCHROME);

    assert.equal(esquerda.width, esquerda.height);
    assert.equal(direita.width, direita.height);
    assert.equal(esquerda.width, direita.width);

    // A geometria é a mesma (é o mesmo alfabeto à mesma escala): o que muda é só a cor.
    const caixaEsquerda = caixa(esquerda, aTinta);
    const caixaDireita = caixa(direita, aTinta);
    assert.equal(caixaEsquerda.x0, caixaDireita.x0);
    assert.equal(caixaEsquerda.x1, caixaDireita.x1);
  });

  it('os temas do lançador continuam a ser a palavra', () => {
    // A palavra é **larga e baixa** (uma proporção de ~5:1); uma letra é quase quadrada. É esta a
    // diferença que o teste mede, para o temático não passar a ser outra coisa sem se dar por isso.
    const tinta = caixa(ler(MONOCHROME), aTinta);
    const proporcao = tinta.largura / tinta.altura;
    assert.ok(proporcao > 3, `o ícone temático tem proporção ${proporcao.toFixed(1)}:1 (esperava a palavra, >3:1)`);
  });

  it('a cobertura vai no alfa e a cor vai no RGB', () => {
    // Estes dois ficheiros são a **mesma** geometria a duas cores: o monochrome é a silhueta que o
    // Android pinta (ícones temáticos) e o foreground é a peça que ele compõe sobre o fundo branco.
    // Do primeiro o sistema só lê o alfa e pinta-o de uma cor; do segundo compõe a imagem. Se a cor
    // fosse misturada com a cobertura (um preto a 50% de alfa em vez de branco a 50%), os pixéis de
    // borda ficavam cinzentos e lia-se uma mancha em vez de uma letra.
    const cores = (imagem: Bitmap) => {
      let minimo = 255;
      let maximo = 0;
      for (let y = 0; y < imagem.height; y += 1) {
        for (let x = 0; x < imagem.width; x += 1) {
          const [r, g, b, a] = pixel(imagem, x, y);
          if (a < 241) continue;
          const canal = Math.min(r, g, b);
          minimo = Math.min(minimo, canal);
          maximo = Math.max(maximo, canal);
        }
      }
      return { minimo, maximo };
    };

    assert.deepEqual(cores(ler(MONOCHROME)), { minimo: 255, maximo: 255 }, 'o monochrome devia ser branco cheio');
    assert.deepEqual(cores(ler(FOREGROUND)), { minimo: 0, maximo: 0 }, 'o foreground devia ser preto cheio');
  });
});

/**
 * O ícone **pequeno** das notificações (a barra de estado do Android, 24dp).
 *
 * É o único sítio da app onde o logótipo não cabe: a palavra inteira a 24dp é uma nódoa cinzenta,
 * por isso ali vai uma **letra** - e a letra é recortada do próprio logótipo (a 5ª de "INOVAPP"),
 * não desenhada à parte.
 */
describe('o ícone pequeno das notificações', () => {
  it('é uma letra e não a palavra', () => {
    const imagem = ler(NOTIFICACAO);
    const tinta = caixa(imagem, (_r, _g, _b, a) => a >= 16);
    const proporcao = tinta.largura / tinta.altura;

    assert.ok(
      proporcao > 0.6 && proporcao < 1.6,
      `a tinta tem proporção ${proporcao.toFixed(2)}:1 (esperava uma letra, quase quadrada)`,
    );
    assert.ok(tinta.altura / imagem.height > 0.6, 'a letra devia encher a maior parte da altura do ficheiro');
  });

  it('a letra não está cortada', () => {
    const imagem = ler(NOTIFICACAO);
    const tinta = caixa(imagem, (_r, _g, _b, a) => a >= 16);

    assert.ok(tinta.x0 > 0 && tinta.y0 > 0, 'a tinta encosta à borda de cima ou da esquerda');
    assert.ok(
      tinta.x1 < imagem.width - 1 && tinta.y1 < imagem.height - 1,
      'a tinta encosta à borda de baixo ou da direita',
    );
  });

  it('é branco cheio sobre transparente (o Android pinta-o com o alfa)', () => {
    const imagem = ler(NOTIFICACAO);
    let opacos = 0;

    for (let y = 0; y < imagem.height; y += 1) {
      for (let x = 0; x < imagem.width; x += 1) {
        const [r, g, b, a] = pixel(imagem, x, y);
        if (a < 241) continue;
        opacos += 1;
        assert.deepEqual([r, g, b], [255, 255, 255], `pixel opaco em (${x}, ${y}) não é branco`);
      }
    }

    assert.ok(opacos > 0, 'não encontrei nenhum pixel opaco');
  });
});

describe('os caminhos de `app.json`', () => {
  const config = JSON.parse(readFileSync(path.join(RAIZ, 'app.json'), 'utf8')).expo;

  /** O `image`/`icon` de um plugin, pelo nome. */
  const doPlugin = (nome: string, chave: string): string | undefined => {
    const entrada = config.plugins.find(
      (plugin: unknown) => Array.isArray(plugin) && plugin[0] === nome,
    );
    return entrada?.[1]?.[chave];
  };

  it('aponta todos os ícones para ficheiros que existem', () => {
    const caminhos: Array<[string, string | undefined]> = [
      ['icon', config.icon],
      ['ios.icon', config.ios.icon],
      ['android.adaptiveIcon.foregroundImage', config.android.adaptiveIcon.foregroundImage],
      ['android.adaptiveIcon.monochromeImage', config.android.adaptiveIcon.monochromeImage],
      ['web.favicon', config.web.favicon],
      ['expo-splash-screen.image', doPlugin('expo-splash-screen', 'image')],
      ['expo-notifications.icon', doPlugin('expo-notifications', 'icon')],
    ];

    for (const [chave, caminho] of caminhos) {
      if (!caminho) continue;
      assert.ok(existsSync(path.join(RAIZ, caminho)), `${chave} aponta para ${caminho}, que não existe`);
    }

    // O ícone do Android tem de estar declarado: sem ele o sistema usa o do template.
    assert.ok(
      existsSync(path.join(RAIZ, FOREGROUND)) && existsSync(path.join(RAIZ, MONOCHROME)),
      'faltam os ficheiros do adaptive icon',
    );
  });

  it('o favicon é pequeno (é uma miniatura, não um ícone de loja)', () => {
    const imagem = ler(FAVICON);
    assert.equal(imagem.width, 48);
    assert.equal(imagem.height, 48);
  });
});

/**
 * As letras do logótipo, medidas na fonte - é daqui que sai o A das notificações e o I do favicon.
 *
 * O gerador identifica as letras pelas colunas sem tinta; estes testes confirmam que a letra que
 * cada ficheiro levou é a que se quer, medindo a **fonte** com o mesmo método. Se a marca mudar
 * (outra palavra, outra tipografia), os dois lados falham juntos em vez de um ícone mudar em
 * silêncio.
 */
describe('as letras recortadas do logótipo', () => {
  const cobertura = (imagem: Bitmap, x: number, y: number) => {
    const [r, g, b, a] = pixel(imagem, x, y);
    return (255 - Math.max(r, g, b)) / 255 * (a / 255);
  };

  /** As corridas de colunas com tinta - o mesmo que o `separarLetras` do gerador faz. */
  function letras(imagem: Bitmap) {
    const colunas: number[] = [];
    for (let x = 0; x < imagem.width; x += 1) {
      let temTinta = false;
      for (let y = 0; y < imagem.height; y += 1) {
        if (cobertura(imagem, x, y) >= 12 / 255) {
          temTinta = true;
          break;
        }
      }
      colunas.push(temTinta ? 1 : 0);
    }

    const corridas: Array<[number, number]> = [];
    let inicio = -1;
    for (let x = 0; x < imagem.width; x += 1) {
      if (colunas[x]) {
        if (inicio < 0) inicio = x;
      } else if (inicio >= 0) {
        corridas.push([inicio, x - 1]);
        inicio = -1;
      }
    }
    if (inicio >= 0) corridas.push([inicio, imagem.width - 1]);
    return corridas;
  }

  /** As proporções largura/altura de cada letra da fonte. */
  function proporcoes(imagem: Bitmap) {
    return letras(imagem).map(([a, b]) => {
      let y0 = imagem.height;
      let y1 = -1;
      for (let y = 0; y < imagem.height; y += 1) {
        for (let x = a; x <= b; x += 1) {
          if (cobertura(imagem, x, y) >= 12 / 255) {
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
            break;
          }
        }
      }
      return (b - a + 1) / (y1 - y0 + 1);
    });
  }

  it('a fonte tem as 7 letras de "INOVAPP" (é delas que saem o A e o I)', () => {
    assert.equal(letras(ler(FONTE)).length, 7);
  });

  it('o favicon levou a primeira letra (o I, estreita) e as notificações a quinta (o A, larga)', () => {
    const proporcoesDasLetras = proporcoes(ler(FONTE));

    // O I é a letra mais estreita da palavra (uma barra com serifa) e o A uma das mais largas.
    const i = Math.min(...proporcoesDasLetras);
    const a = Math.max(...proporcoesDasLetras);
    assert.ok(i < 0.5, `a letra mais estreita da fonte tem proporção ${i.toFixed(2)} (esperava o I, <0.5)`);
    assert.ok(a > 0.7, `a letra mais larga da fonte tem proporção ${a.toFixed(2)} (esperava o A, >0.7)`);

    const favicon = caixa(ler(FAVICON), (r, g, b) => Math.min(r, g, b) < 240);
    const notificacoes = caixa(ler(NOTIFICACAO), (_r, _g, _b, alfa) => alfa >= 16);
    const proporcaoFavicon = favicon.largura / favicon.altura;
    const proporcaoNotificacoes = notificacoes.largura / notificacoes.altura;

    assert.ok(
      Math.abs(proporcaoFavicon - i) < 0.15,
      `o favicon tem proporção ${proporcaoFavicon.toFixed(2)} e o I da fonte tem ${i.toFixed(2)}`,
    );
    assert.ok(
      Math.abs(proporcaoNotificacoes - a) < 0.15,
      `o ícone das notificações tem proporção ${proporcaoNotificacoes.toFixed(2)} e o A da fonte tem ${a.toFixed(2)}`,
    );
  });
});
