// Material partilhado como anexo numa conversa (ver AttachFileSheet) - não existe upload real
// nem uma coleção "materials" à parte; este ecrã só agrega anexos já trocados nas conversas.
export interface SharedMaterial {
  id: string;
  conversationId: string;
  fileName: string;
  fileUrl: string;
  otherFirstName: string;
  otherLastName: string;
  otherImage?: string;
  fromMe: boolean;
  createdAt?: Date;
}
