/**
 * Lê os píxeis de um PNG e diz o que interessa antes de acreditar nele: se o fundo está mesmo
 * transparente, de que cor é a tinta e quanta há.
 *
 * É o par do `png-transparent-background.js` - aquele tira o fundo, este confirma que o tirou e que
 * não levou o desenho atrás. Serve tanto para o resultado dele como para o PNG que sai do render do
 * Chrome quando a origem é um WebP (ver a secção "Imagens com fundo branco" do README).
 *
 * Uso: node scripts/png-inspect.js <ficheiro.png>
 */
const fs = require('fs');
const { decodePng } = require('./png-transparent-background.js');

const ficheiro = process.argv[2] ?? 'assets/Parceiros/inovedu-2c475acd.png';
const { width, height, pixels } = decodePng(fs.readFileSync(ficheiro));
console.log(`${ficheiro} — ${width}x${height}`);

const p = (x, y) => {
  const i = (y * width + x) * 4;
  return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
};

const amostras = {
  'canto sup-esq': p(0, 0),
  'canto sup-dir': p(width - 1, 0),
  'canto inf-esq': p(0, height - 1),
  'canto inf-dir': p(width - 1, height - 1),
  'meio': p(width >> 1, height >> 1),
};
for (const [nome, valor] of Object.entries(amostras)) {
  console.log(`  ${nome.padEnd(14)} rgba(${valor.join(', ')})`);
}

// Todos os píxeis da moldura de 2 px, contados por cor: se o fundo for uniforme, é uma cor só.
const contagem = new Map();
let transparentes = 0;
const moldura = (x, y) => x < 2 || y < 2 || x >= width - 2 || y >= height - 2;
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    if (!moldura(x, y)) continue;
    const [r, g, b, a] = p(x, y);
    if (a === 0) transparentes += 1;
    const chave = a === 0 ? 'transparente' : `rgb(${r},${g},${b}) a=${a}`;
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
}

const total = [...contagem.values()].reduce((soma, n) => soma + n, 0);
console.log('\n  moldura (2 px):');
for (const [cor, n] of [...contagem.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
  console.log(`    ${cor.padEnd(26)} ${n} px  (${((n / total) * 100).toFixed(1)}%)`);
}
console.log(`\n  píxeis transparentes na moldura: ${transparentes}`);
