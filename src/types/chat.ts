export interface ChatAttachment {
  fileName: string;
  /** Link http/https. Um anexo tem `fileUrl` **ou** `attachmentId`, nunca os dois. */
  fileUrl?: string;
  /** Documento guardado em `conversations/{id}/attachments` (ver src/lib/attachments.ts). */
  attachmentId?: string;
  mimeType?: string;
  size?: number;
}

export interface ChatSessionRequestInfo {
  requestId: string;
  /** Opcional: os pedidos novos já não perguntam a disciplina. Fica para os pedidos antigos. */
  subject?: string;
  date: string;
  time: string;
  modality: string;
  message?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  fromMe: boolean;
  time: string;
  attachment?: ChatAttachment;
  sessionRequest?: ChatSessionRequestInfo;
}

export type PresenceStatus = 'online' | 'meeting' | 'unavailable' | 'away';

export interface Conversation {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  subject: string;
  // Ausente quando o estado de presença do outro utilizador é desconhecido.
  status?: PresenceStatus;
  lastMessage: string;
  timeLabel: string;
  unread?: boolean;
  image?: string;
}
