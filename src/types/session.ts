export type SessionModality = 'Online' | 'Presencial';

// Pedido de sessão ainda pendente de aceitação, enviado por outro utilizador.
export interface SessionRequest {
  id: string;
  fromUid: string;
  firstName: string;
  lastName: string;
  image?: string;
  subject: string;
  date: string;
  time: string;
  modality: SessionModality;
  message: string;
  createdAt?: Date;
}

export type SessionStatus = 'scheduled' | 'completed';

/** Papel do utilizador atual numa sessão concreta: quem pediu é 'student', quem aceitou é
 * 'mentor'. É isto - e não o texto do rótulo - que decide quem vê o botão de terminar. */
export type SessionRole = 'student' | 'mentor';

// Sessão já confirmada e presente na agenda do utilizador.
export interface AgendaSession {
  id: string;
  otherUid: string;
  firstName: string;
  lastName: string;
  image?: string;
  subject: string;
  date: string;
  time: string;
  modality: SessionModality;
  // Papel do utilizador atual nesta sessão específica (pode variar de sessão para sessão).
  role: SessionRole;
  status: SessionStatus;
}
