/**
 * Regras de divisão dos documentos em blocos.
 *
 * O Firestore limita cada documento a 1 MiB. Um ficheiro de 10 MB em base64 ocupa ~13,3 MB, por
 * isso não cabe num documento só: é dividido em blocos de texto e cada bloco é um documento da
 * mesma subcoleção. Este módulo não toca no Firestore nem no `expo-document-picker` de propósito,
 * para a divisão poder ser testada sem telemóvel (ver tests/lib/attachment-chunks.test.mts).
 */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/**
 * ~700 KB de texto por bloco. O documento do Firestore aceita 1 MiB, e o limite das regras é
 * 720 000 caracteres - o suficiente para o bloco e os restantes campos, com margem.
 */
export const DOCUMENT_CHUNK_SIZE = 700_000;

/**
 * Teto de blocos. 10 MB dão 20 blocos; 32 deixa margem para o base64 e para uma futura subida
 * pequena do limite sem ter de mexer nas regras.
 */
export const MAX_DOCUMENT_CHUNKS = 32;

/** Divide um base64 em pedaços de `chunkSize` caracteres, pela ordem do ficheiro. */
export function splitBase64(contentBase64: string, chunkSize: number = DOCUMENT_CHUNK_SIZE): string[] {
  if (chunkSize <= 0) throw new Error('invalid-chunk-size');
  if (contentBase64.length === 0) return [];

  const chunks: string[] = [];
  for (let offset = 0; offset < contentBase64.length; offset += chunkSize) {
    chunks.push(contentBase64.slice(offset, offset + chunkSize));
  }
  return chunks;
}

/** Tamanho legível para a folha de anexos: KB até 1 MB, depois MB com uma casa decimal. */
export function formatFileSize(sizeBytes: number): string {
  if (sizeBytes >= 1024 * 1024) {
    const megabytes = sizeBytes / (1024 * 1024);
    return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
  }
  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}
