#!/usr/bin/env node

/**
 * Tira o fundo branco de um logótipo, deixando-o transparente.
 *
 * Existe porque as imagens que recebemos (a faixa dos parceiros, por exemplo) chegam com fundo
 * branco colado — o que num ecrã cinzento-claro se vê logo como uma tira branca por baixo do
 * logótipo. Com o fundo transparente, a imagem assenta em qualquer fundo.
 *
 * **O que faz, e porque não é só "apagar o branco":** começa nas bordas da imagem e alarga-se
 * apenas para os pixéis muito claros **ligados à borda**. Isso é o que distingue fundo de branco
 * *de dentro* do logótipo: um "P" branco dentro de um quadrado azul é branco, mas não está ligado
 * à borda, e por isso fica onde está. Apagar todos os pixéis brancos da imagem, em vez disto,
 * abria buracos em todo o texto branco dos logótipos.
 *
 * Nas bordas suavizadas (onde o logótipo se mistura com o branco) o pixel fica com **alpha
 * parcial** em vez de ser cortado a direito: é o que evita o contorno duro à volta das letras.
 *
 * Uso:
 *   node scripts/png-transparent-background.js entrada.png saida.png
 *   node scripts/png-transparent-background.js entrada.png saida.png --floor=210 --white=245
 *
 * Só aceita PNG de 8 bits por canal, sem paleta e sem entrelaçamento (que é o que sai da consola
 * do Firebase, do Figma e de qualquer exportador normal).
 *
 * As funções estão exportadas para poderem ser usadas noutro sítio (por exemplo, para conferir um
 * ficheiro já processado); o `main` só corre quando o ficheiro é chamado como script.
 */
const fs = require('fs');
const zlib = require('zlib');

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * A partir daqui o pixel entra no fundo: é o canal mais escuro dele que decide, e o valor por
 * omissão (210) é conservador de propósito — um logótipo claro (um amarelo pálido, por exemplo)
 * perde-se com um limite mais alto.
 */
const DEFAULT_FLOOR = 210;
/** A partir daqui é branco mesmo, sem mistura nenhuma: fica com alpha 0 (não com alpha parcial). */
const DEFAULT_WHITE = 245;

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/** Lê os pedaços do PNG e devolve-os por tipo, com o IHDR já interpretado. */
function readChunks(buffer) {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('não é um PNG (assinatura em falta)');
  }

  const chunks = { IDAT: [] };
  let offset = 8;

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);

    if (type === 'IHDR') {
      chunks.IHDR = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12],
      };
    } else if (type === 'IDAT') {
      chunks.IDAT.push(data);
    }

    offset += 12 + length;
  }

  if (!chunks.IHDR) throw new Error('PNG sem IHDR');
  return chunks;
}

/** O `colorType` do PNG diz quantos canais tem cada pixel. */
function channelsFor(colorType) {
  if (colorType === 2) return 3; // RGB
  if (colorType === 6) return 4; // RGBA
  throw new Error(`colorType ${colorType} não suportado (só 2 = RGB e 6 = RGBA)`);
}

/**
 * Desfaz os filtros por linha (a parte chata do PNG) e devolve os pixéis em RGBA.
 *
 * Cada linha vem precedida do filtro que lhe foi aplicado; o PNG existe à custa disto, e sem
 * desfazer todos os filtros não há imagem nenhuma para ler.
 */
function decodePng(buffer) {
  const { IHDR, IDAT } = readChunks(buffer);
  const { width, height, bitDepth, colorType, interlace } = IHDR;

  if (bitDepth !== 8) throw new Error(`bitDepth ${bitDepth} não suportado (só 8 bits por canal)`);
  if (interlace !== 0) throw new Error('PNG entrelaçado não é suportado');

  const channels = channelsFor(colorType);
  const stride = width * channels;
  const raw = zlib.inflateSync(Buffer.concat(IDAT));
  const pixels = Buffer.alloc(width * height * 4);
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = Buffer.alloc(stride);

    for (let i = 0; i < stride; i += 1) {
      const left = i >= channels ? row[i - channels] : 0;
      const up = previous[i];
      const upLeft = i >= channels ? previous[i - channels] : 0;
      const value = line[i];
      let result;

      if (filter === 0) result = value;
      else if (filter === 1) result = value + left;
      else if (filter === 2) result = value + up;
      else if (filter === 3) result = value + ((left + up) >> 1);
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        result = value + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
      } else {
        throw new Error(`filtro de linha ${filter} desconhecido`);
      }

      row[i] = result & 0xff;
    }

    for (let x = 0; x < width; x += 1) {
      const from = x * channels;
      const to = (y * width + x) * 4;
      pixels[to] = row[from];
      pixels[to + 1] = row[from + 1];
      pixels[to + 2] = row[from + 2];
      pixels[to + 3] = channels === 4 ? row[from + 3] : 255;
    }

    previous = row;
  }

  return { width, height, pixels };
}

function encodePng({ width, height, pixels }) {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));

  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // sem filtro: o `zlib` faz o trabalho de compressão
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits por canal
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const chunk = (type, data) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
    return Buffer.concat([head, data, crc]);
  };

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * O fundo passa a transparente. Devolve as contas do que fez, porque sem elas não se sabe se o
 * limite apanhado está certo (muitos pixéis "interiores" claros podem ser um logótipo claro a ser
 * comido, e não fundo).
 */
function removeBackground({ width, height, pixels }, { floor, white }) {
  const lightnessAt = (index) =>
    Math.min(pixels[index * 4], pixels[index * 4 + 1], pixels[index * 4 + 2]);

  const visited = new Uint8Array(width * height);
  const stack = [];
  const push = (index) => {
    if (index >= 0 && index < width * height) stack.push(index);
  };

  for (let x = 0; x < width; x += 1) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    push(y * width);
    push(y * width + width - 1);
  }

  let transparent = 0;
  let partial = 0;

  while (stack.length) {
    const index = stack.pop();
    if (visited[index]) continue;
    visited[index] = 1;

    const lightness = lightnessAt(index);
    if (lightness < floor) continue;

    if (lightness >= white) {
      pixels[index * 4 + 3] = 0;
      transparent += 1;
    } else {
      // Borda suavizada: quanto mais escuro o pixel, mais opaco — o que faz a letra "crescer" da
      // transparência em vez de aparecer com um contorno duro.
      pixels[index * 4 + 3] = Math.round((255 * (white - lightness)) / (white - floor));
      partial += 1;
    }

    const x = index % width;
    const y = (index - x) / width;
    if (x > 0) push(index - 1);
    if (x < width - 1) push(index + 1);
    push(index - width);
    push(index + width);
  }

  let enclosed = 0;
  for (let index = 0; index < width * height; index += 1) {
    if (!visited[index] && lightnessAt(index) >= white) enclosed += 1;
  }

  return { transparent, partial, enclosed };
}

function parseArgs(argv) {
  const paths = argv.filter((argument) => !argument.startsWith('--'));
  const option = (name, fallback) => {
    const found = argv.find((argument) => argument.startsWith(`--${name}=`));
    return found ? Number(found.split('=')[1]) : fallback;
  };

  if (paths.length !== 2) {
    console.error('Uso: node scripts/png-transparent-background.js <entrada.png> <saida.png>');
    console.error('     [--floor=210] [--white=245]');
    process.exit(1);
  }

  return { input: paths[0], output: paths[1], floor: option('floor', DEFAULT_FLOOR), white: option('white', DEFAULT_WHITE) };
}

function main(argv) {
  const { input, output, floor, white } = parseArgs(argv);
  const image = decodePng(fs.readFileSync(input));
  const { transparent, partial, enclosed } = removeBackground(image, { floor, white });

  fs.writeFileSync(output, encodePng(image));

  console.log(`${input} → ${output}`);
  console.log(
    `${image.width}x${image.height} · alpha 0: ${transparent} px · borda com alpha parcial: ${partial} px · claros por dentro (intactos): ${enclosed} px`,
  );
  console.log(`limites: fundo >= ${floor}, branco mesmo >= ${white}`);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { decodePng, encodePng, removeBackground };
