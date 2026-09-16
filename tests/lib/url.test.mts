/**
 * Testes de `src/lib/url.ts` - a validação que a app faz antes de `Linking.openURL`.
 *
 * O URL vem de outro utilizador (anexo de conversa ou material), por isso este é o ponto onde um
 * link malicioso (`intent://`, `file://`, …) deixaria de lançar outra aplicação no dispositivo.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isHttpUrl } from '@/lib/url';

describe('isHttpUrl - aceita', () => {
  const aceites = [
    'http://exemplo.pt',
    'https://exemplo.pt',
    'https://exemplo.pt/caminho?query=1&outro=2#ancora',
    'https://drive.google.com/file/d/abc123/view',
    'https://youtu.be/dQw4w9WgXcQ',
    'HTTP://EXEMPLO.PT',
    'HtTpS://Exemplo.PT/Caminho',
    '  https://exemplo.pt  ',
    'https://exemplo.pt/pasta/ficheiro%20com%20espacos.pdf',
  ];

  for (const valor of aceites) {
    it(`aceita ${JSON.stringify(valor)}`, () => {
      assert.equal(isHttpUrl(valor), true);
    });
  }
});

describe('isHttpUrl - recusa', () => {
  const recusados: Array<[string, string]> = [
    ['file:///etc/passwd', 'esquema local'],
    ['file:///sdcard/Download/foto.jpg', 'ficheiro no dispositivo'],
    ['intent://scan/#Intent;scheme=zxing;end', 'lançaria outra app no Android'],
    ['javascript:alert(1)', 'execução de código'],
    ['data:text/html;base64,PHNjcmlwdD4=', 'conteúdo embutido'],
    ['mailto:alguem@exemplo.pt', 'não é um link web'],
    ['ftp://exemplo.pt/ficheiro.txt', 'esquema não suportado'],
    ['www.exemplo.pt', 'sem esquema'],
    ['exemplo.pt/caminho', 'sem esquema'],
    ['https://', 'sem destino'],
    ['http://', 'sem destino'],
    ['https://exemplo.pt com espaço', 'tem espaço a meio'],
    ['https://exemplo.pt\nhttps://outro.pt', 'dois links'],
    ['', 'vazio'],
    ['   ', 'só espaços'],
    ['http//exemplo.pt', 'esquema mal formado'],
  ];

  for (const [valor, motivo] of recusados) {
    it(`recusa ${JSON.stringify(valor)} (${motivo})`, () => {
      assert.equal(isHttpUrl(valor), false);
    });
  }
});

describe('isHttpUrl - normalização', () => {
  it('aceita o mesmo link com espaços à volta', () => {
    assert.equal(isHttpUrl('   https://exemplo.pt   '), true);
  });

  it('recusa um link que só fica válido depois de tirar espaços interiores', () => {
    assert.equal(isHttpUrl('https://exemplo .pt'), false);
  });
});
