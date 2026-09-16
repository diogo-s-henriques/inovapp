export type ActivityKind = 'connection-accepted' | 'session-accepted' | 'session-tomorrow' | 'material-received';

// Entrada do histórico "Recentes" nas notificações - nunca guardada como tal no Firestore,
// é sempre derivada de dados já existentes (ver src/lib/activity.ts).
export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  description: string;
  timestamp: Date;
}
