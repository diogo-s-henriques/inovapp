import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where, writeBatch } from 'firebase/firestore';
import { Linking } from 'react-native';

import { db } from '@/lib/firebase';
import { DOCUMENT_CHUNK_SIZE, MAX_DOCUMENT_BYTES, splitBase64 } from '@/lib/attachment-chunks';
import { isHttpUrl } from '@/lib/url';
import type { ChatAttachment } from '@/types/chat';

export { MAX_DOCUMENT_BYTES };

/**
 * Anexos de documentos nas conversas.
 *
 * **Porque é que o ficheiro vai para o Firestore e não para o Firebase Storage.** O Storage exige o
 * plano Blaze, e este projeto corre no plano gratuito (é a mesma razão pela qual as fotografias de
 * perfil são data URIs - ver src/lib/storage.ts). Um documento é guardado na subcoleção
 * `conversations/{id}/attachments`, em base64, e a mensagem só leva os metadados: se o base64 fosse
 * para dentro da mensagem, o ecrã de Materiais - que lê as últimas mensagens de todas as conversas -
 * passava a descarregar megabytes por linha da lista.
 *
 * **O limite é 10 MB, mas não cabe num documento só.** O Firestore limita cada documento a 1 MiB.
 * O ficheiro é por isso dividido em blocos de `DOCUMENT_CHUNK_SIZE` caracteres: o documento com o
 * nome e o tamanho do anexo fica sem conteúdo, e cada bloco é outro documento da mesma subcoleção
 * com `attachmentId` e `chunkIndex`. Abrir o anexo volta a juntar os blocos pela ordem. O limite
 * antigo de 600 KB continua aceite nas regras para não quebrar instalações antigas.
 */
export const DOCUMENT_CHUNKS_PER_BATCH = 8;

/** O utilizador escolheu um documento maior do que o limite - não é uma falha de leitura. */
export class DocumentTooLargeError extends Error {
  constructor(readonly sizeBytes: number) {
    super('document-too-large');
    this.name = 'DocumentTooLargeError';
  }
}

/** Um documento já lido do telemóvel, pronto a guardar. */
export interface PickedDocument {
  fileName: string;
  mimeType: string;
  size: number;
  contentBase64: string;
}

function assetByteSize(asset: DocumentPicker.DocumentPickerAsset, contentBase64: string): number {
  if (asset.size && asset.size > 0) return asset.size;
  // base64 tem 4 caracteres por cada 3 bytes (o `=` final é padding).
  return Math.floor((contentBase64.length * 3) / 4);
}

/**
 * Abre o seletor de documentos do sistema e lê o ficheiro escolhido.
 *
 * `copyToCacheDirectory: true` é obrigatório, e não um detalhe: sem ele o ficheiro pode estar num
 * sítio que o `expo-file-system` ainda não consegue ler no instante a seguir à escolha (é o aviso
 * explícito da documentação do expo-document-picker).
 */
export async function pickDocument(): Promise<PickedDocument | undefined> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return undefined;

  const asset = result.assets[0];
  if (asset.size && asset.size > MAX_DOCUMENT_BYTES) {
    throw new DocumentTooLargeError(asset.size);
  }

  const contentBase64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const size = assetByteSize(asset, contentBase64);
  if (size > MAX_DOCUMENT_BYTES) throw new DocumentTooLargeError(size);

  return {
    fileName: asset.name,
    mimeType: asset.mimeType || 'application/octet-stream',
    size,
    contentBase64,
  };
}

/**
 * Guarda o documento e devolve o anexo que a mensagem leva.
 *
 * O documento e a mensagem são duas escritas, e não uma: se a segunda falhar, fica um anexo
 * inalcançável, não um anexo em falta numa mensagem. É o lado certo para falhar.
 */
export async function storeDocument(
  conversationId: string,
  senderId: string,
  document: PickedDocument,
): Promise<ChatAttachment> {
  const chunks = splitBase64(document.contentBase64, DOCUMENT_CHUNK_SIZE);
  if (chunks.length === 0) throw new Error('empty-document');

  const attachments = collection(db, 'conversations', conversationId, 'attachments');
  // O cabeçalho só é escrito no fim: se um bloco falhar, não fica um anexo a apontar para um
  // ficheiro incompleto. Os blocos órfãos são apagados com a conta (todos levam `senderId`).
  const header = doc(attachments);
  const chunkRefs = chunks.map(() => doc(attachments));

  for (let start = 0; start < chunks.length; start += DOCUMENT_CHUNKS_PER_BATCH) {
    const batch = writeBatch(db);
    const end = Math.min(start + DOCUMENT_CHUNKS_PER_BATCH, chunks.length);

    for (let index = start; index < end; index += 1) {
      batch.set(chunkRefs[index], {
        senderId,
        attachmentId: header.id,
        chunkIndex: index,
        contentBase64: chunks[index],
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
  }

  await setDoc(header, {
    senderId,
    fileName: document.fileName,
    mimeType: document.mimeType,
    size: document.size,
    chunkCount: chunks.length,
    createdAt: serverTimestamp(),
  });

  return {
    fileName: document.fileName,
    attachmentId: header.id,
    mimeType: document.mimeType,
    size: document.size,
  };
}

/** Nome seguro para o ficheiro em cache: o nome vem de outra pessoa e não pode escrever fora da pasta. */
function safeCacheName(attachmentId: string, fileName: string): string {
  const base = fileName.replace(/[^A-Za-z0-9._-]/g, '_').replace(/^\.+/, '') || 'documento';
  return `inovapp-${attachmentId}-${base}`;
}

/**
 * Abre um anexo de uma conversa: um link no browser, ou um documento guardado no Firestore.
 *
 * O documento guardado é escrito na pasta de cache e entregue ao menu de partilha do sistema - é o
 * caminho do iOS e do Android para "abrir com" uma app que saiba ler o ficheiro. Só depois de o
 * utilizador escolher a app é que o ficheiro sai da app.
 *
 * Lança em caso de falha; quem chama mostra a mensagem (o ecrã de Materiais e o chat têm a sua).
 */
export async function openAttachment(
  conversationId: string,
  attachment: ChatAttachment,
): Promise<void> {
  if (attachment.fileUrl) {
    // O URL foi escrito por outro utilizador: só http/https (ver src/lib/url.ts).
    if (!isHttpUrl(attachment.fileUrl)) throw new Error('invalid-link');
    await Linking.openURL(attachment.fileUrl);
    return;
  }

  if (!attachment.attachmentId) throw new Error('missing-attachment');

  const snapshot = await getDoc(
    doc(db, 'conversations', conversationId, 'attachments', attachment.attachmentId),
  );
  if (!snapshot.exists()) throw new Error('missing-attachment');

  const data = snapshot.data() as {
    contentBase64?: string;
    fileName?: string;
    mimeType?: string;
    chunkCount?: number;
  };

  let contentBase64 = data.contentBase64;
  if (!contentBase64) {
    const chunkCount = data.chunkCount;
    if (!chunkCount) throw new Error('missing-attachment');

    // Mesma coleção dos anexos: cada bloco tem `attachmentId` e `chunkIndex`. A consulta não usa
    // orderBy porque só um campo é filtrado; a ordem é reposta no cliente pelo índice.
    const chunksSnapshot = await getDocs(
      query(
        collection(db, 'conversations', conversationId, 'attachments'),
        where('attachmentId', '==', attachment.attachmentId),
      ),
    );
    const chunks = chunksSnapshot.docs
      .map((chunk) => {
        const chunkData = chunk.data() as { chunkIndex?: number; contentBase64?: string };
        return { index: chunkData.chunkIndex, content: chunkData.contentBase64 };
      })
      .filter(
        (chunk): chunk is { index: number; content: string } =>
          typeof chunk.index === 'number' && typeof chunk.content === 'string',
      )
      .sort((a, b) => a.index - b.index);

    if (chunks.length !== chunkCount || chunks.some((chunk, index) => chunk.index !== index)) {
      throw new Error('missing-attachment');
    }
    contentBase64 = chunks.map((chunk) => chunk.content).join('');
  }
  if (!contentBase64) throw new Error('missing-attachment');

  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) throw new Error('no-cache-directory');

  const uri = `${cacheDirectory}${safeCacheName(attachment.attachmentId, attachment.fileName)}`;
  await FileSystem.writeAsStringAsync(uri, contentBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (!(await Sharing.isAvailableAsync())) throw new Error('sharing-unavailable');
  await Sharing.shareAsync(uri, {
    mimeType: attachment.mimeType ?? data.mimeType ?? 'application/octet-stream',
    dialogTitle: attachment.fileName,
  });
}
