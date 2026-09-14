export interface ChatAttachment {
  fileName: string;
  fileUrl: string;
}

export interface ChatSessionRequestInfo {
  requestId: string;
  subject: string;
  date: string;
  time: string;
  modality: string;
  message?: string;
  // Nome de quem recebeu o pedido (não de quem vê a mensagem — ver ChatSessionRequestCard).
  toFirstName: string;
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
