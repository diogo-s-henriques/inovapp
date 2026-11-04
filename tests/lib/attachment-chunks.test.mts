import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DOCUMENT_CHUNK_SIZE,
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENT_CHUNKS,
  formatFileSize,
  splitBase64,
} from '@/lib/attachment-chunks';

describe('attachment chunks - 10 MB em blocos do Firestore', () => {
  it('um ficheiro cabe em blocos abaixo do limite e do teto de blocos', () => {
    const content = 'A'.repeat(Math.ceil(MAX_DOCUMENT_BYTES * (4 / 3)));
    const chunks = splitBase64(content);

    assert.ok(chunks.length > 1);
    assert.ok(chunks.length <= MAX_DOCUMENT_CHUNKS);
    assert.ok(chunks.every((chunk) => chunk.length <= DOCUMENT_CHUNK_SIZE));
    assert.equal(chunks.join(''), content);
  });

  it('não inventa blocos num ficheiro vazio', () => {
    assert.deepEqual(splitBase64(''), []);
  });

  it('respeita um tamanho de bloco explícito', () => {
    assert.deepEqual(splitBase64('abcdefgh', 3), ['abc', 'def', 'gh']);
  });

  it('recusa um tamanho de bloco inválido', () => {
    assert.throws(() => splitBase64('abc', 0), /invalid-chunk-size/);
  });

  it('formata KB e MB para a folha do anexo', () => {
    assert.equal(formatFileSize(512), '1 KB');
    assert.equal(formatFileSize(2 * 1024 * 1024), '2.0 MB');
    assert.equal(formatFileSize(10 * 1024 * 1024), '10 MB');
  });
});
