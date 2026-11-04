// Material partilhado como anexo numa conversa (ver AttachFileSheet): um link ou um documento
// guardado na subcoleção da conversa. Não existe uma coleção "materials" à parte; este ecrã só
// agrega anexos já trocados nas conversas.
export interface SharedMaterial {
  id: string;
  conversationId: string;
  fileName: string;
  /** Link http/https, quando o material foi partilhado por link. */
  fileUrl?: string;
  /** Documento guardado no Firestore, quando foi anexado do telemóvel. */
  attachmentId?: string;
  mimeType?: string;
  size?: number;
  otherFirstName: string;
  otherLastName: string;
  otherImage?: string;
  fromMe: boolean;
  createdAt?: Date;
}
