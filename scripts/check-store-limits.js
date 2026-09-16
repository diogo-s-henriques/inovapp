#!/usr/bin/env node
/**
 * Confere os limites de caracteres da ficha das lojas (STORE.md).
 *
 * As lojas contam os caracteres e recusam o texto inteiro quando um campo passa do limite - e um
 * subtítulo de 31 caracteres não se vê a olho, sobretudo depois de o texto ser editado. Aqui, cada
 * campo é declarado no cabeçalho que o precede (`**Subtítulo (App Store, máx. 30)**`) e o bloco
 * seguinte é o que se copia: o script mede exatamente esse bloco.
 *
 * Os blocos sem limite no cabeçalho (as notas para a revisão, o formulário da Play) são ignorados
 * de propósito: não são campos de loja com limite nenhum.
 *
 * Uso: node scripts/check-store-limits.js   (ou `npm run store:check`)
 */
const fs = require('node:fs');
const path = require('node:path');

const FICHEIRO = path.join(__dirname, '..', 'STORE.md');
const linhas = fs.readFileSync(FICHEIRO, 'utf8').split('\n');

/** @type {{ campo: string, limite: number, usado: number, linha: number }[]} */
const campos = [];
let limite = null;
let campo = '';
let dentroDoBloco = false;
let conteudo = [];

linhas.forEach((linha, indice) => {
  const declaracao = /máx\.\s*(\d+)/.exec(linha);
  if (declaracao) {
    limite = Number(declaracao[1]);
    // O nome do campo é o que vem antes dos parênteses: "Subtítulo (App Store, máx. 30)" → Subtítulo.
    campo = linha.replace(/\*\*/g, '').replace(/\(.*$/, '').trim();
  }

  if (linha.trim().startsWith('```')) {
    if (dentroDoBloco) {
      dentroDoBloco = false;
      if (limite !== null) {
        // O comprimento é o do texto todo, incluindo as quebras de linha e os espaços: é assim que
        // qualquer contador de caracteres conta, e é assim que a loja o recebe.
        const usado = conteudo.join('\n').trim().length;
        campos.push({ campo, limite, usado, linha: indice + 1 });
        limite = null;
      }
    } else {
      dentroDoBloco = true;
      conteudo = [];
    }
    return;
  }

  if (dentroDoBloco) conteudo.push(linha);
});

if (campos.length === 0) {
  console.error('Não encontrei nenhum campo com limite em STORE.md - o formato do ficheiro mudou?');
  process.exit(1);
}

let falhas = 0;
for (const { campo: nome, limite: max, usado, linha } of campos) {
  const folga = max - usado;
  const estado = folga < 0 ? 'PASSOU' : 'ok';
  if (folga < 0) falhas += 1;
  console.log(
    `${estado.padEnd(7)} ${String(usado).padStart(4)}/${max}  ${folga >= 0 ? `${folga} de folga` : `${-folga} A MAIS`}  ${nome} (linha ${linha})`,
  );
}

console.log(`\n${campos.length} campos · ${falhas} fora do limite`);
process.exit(falhas === 0 ? 0 : 1);
