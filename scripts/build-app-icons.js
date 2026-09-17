#!/usr/bin/env node
/**
 * Gera os ícones da app a partir do logótipo da marca.
 *
 * Existe porque o projeto chegou às lojas com o **ícone do template do Expo** (o chevron branco
 * sobre azul) em quatro sítios ao mesmo tempo - o ícone do iOS, o do Android, o ecrã de arranque e o
 * favicon - e ninguém deu por isso: são ficheiros, não código, e nenhum teste os olha. Aqui a marca
 * é **um** ficheiro de entrada e os quatro saem dele, com os números todos no mesmo sítio (o
 * tamanho da palavra dentro do quadrado é o único que muda de plataforma para plataforma, pela
 * razão que está escrita em baixo).
 *
 * A fonte é `assets/resized-512x512.png`: a palavra **INOVAPP** a preto sobre branco. A marca não
 * tem símbolo nenhum - é um logótipo-palavra -, por isso o ícone é o quadrado com a palavra dentro,
 * e não um símbolo inventado.
 *
 * **Porque é que a palavra muda de tamanho conforme a plataforma:**
 * - No iOS o desenho é o quadrado inteiro: o sistema arredonda-lhe os cantos e não corta nada, e por
 *   isso a palavra pode ocupar 80% da largura (a margem que sobra é a que a Apple pede para o
 *   conteúdo não encostar ao canto).
 * - No Android o ícone é um **adaptive icon**: o sistema mostra apenas o miolo de um quadrado maior
 *   (a "zona segura", ~60%), porque é ele que escolhe a máscara (círculo, gota, quadrado) e pode
 *   animar a peça. Palavra a 80% ali era palavra cortada nas pontas - logo, 60%.
 * - No favicon (48 px) a palavra é uma mancha; o que fica legível é a **forma do quadrado**. Sai a
 *   mesma composição do iOS reduzida, que é o que qualquer navegador mostra numa miniatura.
 *
 * O que sai:
 *   assets/images/icon.png                     1024x1024, sem alfa (a App Store recusa alfa no ícone)
 *   assets/images/android-icon-foreground.png   512x512, transparente, palavra na zona segura
 *   assets/images/android-icon-monochrome.png   512x512, transparente, branco (ícones temáticos)
 *   assets/images/android-icon-notification.png 512x512, transparente, a letra A (notificações)
 *   assets/images/favicon.png                    48x48, a letra I (a palavra não se lê a este tamanho)
 *
 * Uso: node scripts/build-app-icons.js   (ou `npm run icons:build`)
 *
 * O leitor/escritor de PNG é o de `scripts/png-transparent-background.js` - o mesmo que já tira o
 * fundo à faixa dos parceiros. Não há aqui nenhuma dependência nova.
 */
const fs = require('node:fs');
const path = require('node:path');

const { decodePng, encodePng } = require('./png-transparent-background.js');

const RAIZ = path.join(__dirname, '..');
const FONTE = path.join(RAIZ, 'assets', 'resized-512x512.png');

/** Lado do ícone do iOS (e da loja). É o único tamanho que a App Store aceita como ficheiro de marketing. */
const TILE = 1024;
/** Lado da imagem do adaptive icon do Android. O sistema trata-a como 108dp e mostra os 72dp do meio. */
const ADAPTIVE = 512;
/** Lado do favicon (é o que o `web.favicon` do `app.json` pede). */
const FAVICON = 48;

/** Quanto da largura do quadrado a palavra ocupa no iOS: cheia, com a margem que a Apple pede. */
const PALAVRA_NO_TILE = 0.8;
/**
 * Quanto da largura do canvas a palavra ocupa no Android.
 *
 * O que decide não é a largura, são os **cantos**: a zona segura é um **círculo** de 66dp dentro dos
 * 108dp (61,1%), e a palavra é larga e baixa, por isso são os cantos do retângulo que a podem
 * trespassar. Com 60% da largura os cantos caíam 0,3 px dentro do círculo - dentro, mas sem folga
 * nenhuma; com 58% ficam ~5 px lá dentro, que é a folga que a antialiasing das letras come.
 * (É por isso que a zona segura do Android se mede com um círculo e não com uma margem.)
 */
const PALAVRA_NO_ADAPTIVE = 0.58;

/**
 * Quanto da altura do canvas a letra do ícone pequeno ocupa.
 *
 * Ao contrário do ícone do lançador, o ícone pequeno das notificações **não leva máscara nenhuma**
 * - o sistema desenha-o num quadrado de 24dp - por isso não há zona segura redonda a respeitar: a
 * letra pode encher o ficheiro, e é o que se quer, porque 24dp é pouco (a palavra inteira ali vira
 * uma nódoa cinzenta, e é por isso que aqui vai uma letra).
 */
const ALTURA_DA_LETRA = 0.78;

/** A letra que vai para o ícone pequeno das notificações: o **A**, a quinta das sete de "INOVAPP". */
const LETRA_DAS_NOTIFICACOES = 4;

/** A letra que vai para o favicon: o **I**, a primeira - o que se lê a 16 px é a forma. */
const LETRA_DO_FAVICON = 0;

/** A partir daqui o pixel é o fundo: no branco puro (255) a cobertura é 0. */
const LIMITE_DE_TINTA = 12;

/**
 * Filtro Catmull-Rom (bicúbico) - o que dá contornos menos moles do que o bilinear ao aumentar uma
 * imagem para o dobro, que é o caso aqui (a fonte é 512 e o ícone do iOS é 1024).
 */
function bicubico(t) {
  const a = -0.5;
  const x = Math.abs(t);
  if (x < 1) return ((a + 2) * x - (a + 3)) * x * x + 1;
  if (x < 2) return (((x - 5) * x + 8) * x - 4) * a;
  return 0;
}

/**
 * Pesos de uma passagem do filtro, por pixel de destino.
 *
 * Com um destino **maior** do que a origem o kernel tem o tamanho normal (2 px). Com um destino
 * **menor** ele é alargado na proporção (`scale`): sem isso, encolher 1024 para 48 leria só 4 pixéis
 * por cada um de destino e o que ficava de fora era simplesmente ignorado - a palavra aparecia com
 * buracos em vez de cinzenta.
 */
function pesos(srcLen, dstLen) {
  const scale = dstLen / srcLen;
  const largura = scale < 1 ? scale : 1;
  const suporte = 2 * largura;
  const linhas = [];

  for (let i = 0; i < dstLen; i += 1) {
    const centro = (i + 0.5) / scale - 0.5;
    const list = [];
    let soma = 0;

    for (let j = Math.ceil(centro - suporte); j <= Math.floor(centro + suporte); j += 1) {
      const peso = bicubico((j - centro) / largura);
      if (peso === 0) continue;
      const origem = Math.min(srcLen - 1, Math.max(0, j));
      soma += peso;
      list.push([origem, peso]);
    }

    linhas.push(list.map(([origem, peso]) => [origem, peso / soma]));
  }

  return linhas;
}

/** Redimensiona uma máscara de cobertura (0..1 por pixel), primeiro na horizontal e depois na vertical. */
function redimensionar(mascara, largura, altura, novaLargura, novaAltura) {
  const horizontal = new Float32Array(novaLargura * altura);
  const pesosX = pesos(largura, novaLargura);
  for (let y = 0; y < altura; y += 1) {
    for (let x = 0; x < novaLargura; x += 1) {
      let soma = 0;
      for (const [origem, peso] of pesosX[x]) soma += mascara[y * largura + origem] * peso;
      horizontal[y * novaLargura + x] = soma;
    }
  }

  const saida = new Float32Array(novaLargura * novaAltura);
  const pesosY = pesos(altura, novaAltura);
  for (let y = 0; y < novaAltura; y += 1) {
    for (let x = 0; x < novaLargura; x += 1) {
      let soma = 0;
      for (const [origem, peso] of pesosY[y]) soma += horizontal[origem * novaLargura + x] * peso;
      saida[y * novaLargura + x] = Math.min(1, Math.max(0, soma));
    }
  }

  return saida;
}

/**
 * A cobertura da tinta (0 = fundo, 1 = tinta cheia) e a caixa onde ela está.
 *
 * A tinta é **preta sobre branco**, por isso a cobertura é o quanto o pixel se afastou do branco, e
 * é o canal mais claro que decide: num pixel de borda (um cinzento) é o cinzento que diz quanto da
 * letra ali está; num pixel de tinta cheia os três canais estão no mínimo.
 */
function lerFonte(imagem) {
  const { width, height, pixels } = imagem;
  const cobertura = new Float32Array(width * height);

  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const claro = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
      if (255 - claro < LIMITE_DE_TINTA) continue;

      cobertura[y * width + x] = (255 - claro) / 255;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }

  if (x1 < 0) throw new Error(`${FONTE}: não encontrei tinta nenhuma (a imagem é branca?)`);
  if (x0 === 0 || y0 === 0 || x1 === width - 1 || y1 === height - 1) {
    throw new Error(
      `${FONTE}: a tinta encosta à borda - o ficheiro da marca está cortado e a margem do ícone não se pode calcular`,
    );
  }

  // A tinta recortada, já sem a moldura branca toda: é daqui que saem todas as escalas, para não
  // haver duas reamostragens seguidas (o que amolecia as letras duas vezes).
  const largura = x1 - x0 + 1;
  const altura = y1 - y0 + 1;
  const recorte = new Float32Array(largura * altura);
  for (let y = 0; y < altura; y += 1) {
    for (let x = 0; x < largura; x += 1) recorte[y * largura + x] = cobertura[(y + y0) * width + (x + x0)];
  }

  return { largura, altura, tinta: recorte };
}

/** A palavra escalada para uma largura de destino, mantendo a forma. */
function escalar(tinta, largura, altura, larguraDestino) {
  const novaAltura = Math.max(1, Math.round((altura * larguraDestino) / largura));
  return { largura: larguraDestino, altura: novaAltura, tinta: redimensionar(tinta, largura, altura, larguraDestino, novaAltura) };
}

/** O mesmo, mas a mandar na altura - é o que serve quando o que se quer é uma letra grande. */
function escalarPorAltura(tinta, largura, altura, alturaDestino) {
  const novaLargura = Math.max(1, Math.round((largura * alturaDestino) / altura));
  return { largura: novaLargura, altura: alturaDestino, tinta: redimensionar(tinta, largura, altura, novaLargura, alturaDestino) };
}

/**
 * As letras do logótipo, separadas pelas **colunas sem tinta**.
 *
 * Existe para o ícone pequeno poder ser uma letra da própria marca (o **A**, desenhado por quem
 * desenhou o logótipo) em vez de uma letra inventada por mim noutro sítio qualquer. Se a marca
 * mudar - outra palavra, outra tipografia, outro espaçamento - o que muda é isto: ou continua a
 * haver sete letras e a quinta é o A, ou o script pára e diz para se olhar para o ficheiro.
 */
function separarLetras({ tinta, largura, altura }) {
  const corridas = [];
  let inicio = -1;

  for (let x = 0; x < largura; x += 1) {
    let temTinta = false;
    for (let y = 0; y < altura; y += 1) {
      if (tinta[y * largura + x] === 0) continue;
      temTinta = true;
      break;
    }

    if (temTinta) {
      if (inicio < 0) inicio = x;
    } else if (inicio >= 0) {
      corridas.push([inicio, x - 1]);
      inicio = -1;
    }
  }
  if (inicio >= 0) corridas.push([inicio, largura - 1]);

  return corridas.map(([a, b]) => {
    let y0 = altura;
    let y1 = -1;
    for (let y = 0; y < altura; y += 1) {
      for (let x = a; x <= b; x += 1) {
        if (tinta[y * largura + x] === 0) continue;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        break;
      }
    }

    const letraLargura = b - a + 1;
    const letraAltura = y1 - y0 + 1;
    const recorte = new Float32Array(letraLargura * letraAltura);
    for (let y = 0; y < letraAltura; y += 1) {
      for (let x = 0; x < letraLargura; x += 1) {
        recorte[y * letraLargura + x] = tinta[(y + y0) * largura + (x + a)];
      }
    }

    return { x: a, largura: letraLargura, altura: letraAltura, tinta: recorte };
  });
}

/** Um canvas RGBA com a palavra centrada. `fundo` a null = transparente. */
function desenhar(escalada, lado, { cor, fundo }) {
  const pixels = Buffer.alloc(lado * lado * 4);
  const x0 = Math.round((lado - escalada.largura) / 2);
  const y0 = Math.round((lado - escalada.altura) / 2);

  for (let y = 0; y < lado; y += 1) {
    for (let x = 0; x < lado; x += 1) {
      const i = (y * lado + x) * 4;
      const dentro =
        x >= x0 && x < x0 + escalada.largura && y >= y0 && y < y0 + escalada.altura
          ? escalada.tinta[(y - y0) * escalada.largura + (x - x0)]
          : 0;

      if (!fundo) {
        // Sem fundo, a tinta é **sempre a cor pedida** e é a cobertura que vai no alfa. É assim que
        // se entrega um símbolo de uma cor só: o Android pinta-o (ícones temáticos) e as notificações
        // só olham para o alfa. Misturar a cor com a cobertura (um preto a 50% de alfa em vez de
        // branco a 50%) dava letras acinzentadas em vez de letras suaves.
        pixels[i] = cor[0];
        pixels[i + 1] = cor[1];
        pixels[i + 2] = cor[2];
        pixels[i + 3] = Math.round(255 * dentro);
        continue;
      }

      // Com fundo (o quadrado branco do iOS), a palavra assenta nele: o resto do pixel é o fundo.
      const [fr, fg, fb] = fundo;
      pixels[i] = Math.round(cor[0] * dentro + fr * (1 - dentro));
      pixels[i + 1] = Math.round(cor[1] * dentro + fg * (1 - dentro));
      pixels[i + 2] = Math.round(cor[2] * dentro + fb * (1 - dentro));
      pixels[i + 3] = 255;
    }
  }

  return { width: lado, height: lado, pixels };
}

const PRETO = [0, 0, 0];
const BRANCO = [255, 255, 255];

function escrever(destino, imagem, { alpha, nota }) {
  fs.writeFileSync(destino, encodePng(imagem, { alpha }));
  const kb = (fs.statSync(destino).size / 1024).toFixed(1);
  console.log(
    `  ${path.relative(RAIZ, destino).replace(/\\/g, '/').padEnd(42)} ${imagem.width}x${imagem.height}  ${
      alpha ? 'RGBA' : 'RGB '
    }  ${kb.padStart(6)} KB   ${nota}`,
  );
}

function main() {
  const fonte = lerFonte(decodePng(fs.readFileSync(FONTE)));
  console.log(`fonte: ${path.relative(RAIZ, FONTE).replace(/\\/g, '/')} · marca ${fonte.largura}x${fonte.altura} px`);

  // As letras, uma a uma: é daqui que sai o A do ícone pequeno (e é aqui que se vê se a marca
  // mudou de forma).
  const letras = separarLetras(fonte);
  console.log(
    `letras: ${letras.map((letra, i) => `${i}\u00ba ${letra.largura}x${letra.altura}`).join(' · ')}\n`,
  );
  if (letras.length !== 7) {
    throw new Error(
      `${FONTE}: esperava as 7 letras de "INOVAPP" e separei ${letras.length} - o ficheiro da marca mudou? Confirma o índice da letra do ícone pequeno antes de seguir.`,
    );
  }

  // iOS: quadrado cheio, palavra a preto sobre branco. **Sem canal alfa** - a App Store recusa o
  // ícone de marketing com transparência, e é o erro que mais se descobre já na submissão.
  const noTile = escalar(fonte.tinta, fonte.largura, fonte.altura, Math.round(TILE * PALAVRA_NO_TILE));
  escrever(path.join(RAIZ, 'assets/images/icon.png'), desenhar(noTile, TILE, { cor: PRETO, fundo: [255, 255, 255, 255] }), {
    alpha: false,
    nota: `palavra a ${Math.round(PALAVRA_NO_TILE * 100)}% da largura, sem alfa`,
  });

  // Android: a palavra na zona segura, sobre o fundo branco que o `app.json` declara
  // (`adaptiveIcon.backgroundColor`). Transparente porque o sistema compõe as duas peças.
  const noAdaptive = escalar(fonte.tinta, fonte.largura, fonte.altura, Math.round(ADAPTIVE * PALAVRA_NO_ADAPTIVE));
  escrever(
    path.join(RAIZ, 'assets/images/android-icon-foreground.png'),
    desenhar(noAdaptive, ADAPTIVE, { cor: PRETO, fundo: null }),
    { alpha: true, nota: `palavra a ${Math.round(PALAVRA_NO_ADAPTIVE * 100)}% (zona segura do adaptive icon)` },
  );

  // O mesmo desenho a branco: o Android pinta-o com uma cor só. Aqui a palavra fica, porque este
  // ficheiro é o ícone **do lançador** quando o sistema está em ícones temáticos - olhado ao lado do
  // ícone normal, deve dizer o mesmo.
  escrever(
    path.join(RAIZ, 'assets/images/android-icon-monochrome.png'),
    desenhar(noAdaptive, ADAPTIVE, { cor: BRANCO, fundo: null }),
    { alpha: true, nota: 'branco sobre transparente (ícones temáticos)' },
  );

  // O ícone **pequeno** das notificações é outro caso: o Android desenha-o a 24dp e a palavra
  // inteira ali não se lê. Vai a letra da própria marca, e sem máscara redonda pelo caminho.
  const letra = letras[LETRA_DAS_NOTIFICACOES];
  const noAviso = escalarPorAltura(
    letra.tinta,
    letra.largura,
    letra.altura,
    Math.round(ADAPTIVE * ALTURA_DA_LETRA),
  );
  escrever(
    path.join(RAIZ, 'assets/images/android-icon-notification.png'),
    desenhar(noAviso, ADAPTIVE, { cor: BRANCO, fundo: null }),
    {
      alpha: true,
      nota: `a ${LETRA_DAS_NOTIFICACOES + 1}ª letra ("INOVAPP"), branca sobre transparente, ${Math.round(
        ALTURA_DA_LETRA * 100,
      )}% da altura`,
    },
  );

  // O favicon é o outro sítio onde a palavra morre: 48 px, e é visto sobretudo a **16** (o tamanho
  // do separador do navegador). A 16 px o que se lê é a forma, e a forma de uma letra é essa - a
  // **primeira** da marca. Sem canal alfa, como o ícone do iOS: é um quadrado branco com tinta.
  const letraFavicon = letras[LETRA_DO_FAVICON];
  const noFavicon = escalarPorAltura(
    letraFavicon.tinta,
    letraFavicon.largura,
    letraFavicon.altura,
    Math.round(FAVICON * ALTURA_DA_LETRA),
  );
  escrever(path.join(RAIZ, 'assets/images/favicon.png'), desenhar(noFavicon, FAVICON, { cor: PRETO, fundo: [255, 255, 255, 255] }), {
    alpha: false,
    nota: `a ${LETRA_DO_FAVICON + 1}ª letra ("INOVAPP"), ${Math.round(ALTURA_DA_LETRA * 100)}% da altura`,
  });

  console.log('\nFalta lançar uma build: o ícone é empacotado pelo EAS, não vem por JavaScript.');
}

if (require.main === module) main();

module.exports = { lerFonte, pesos, redimensionar, escalar, escalarPorAltura, separarLetras, desenhar };
