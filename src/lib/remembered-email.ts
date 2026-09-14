import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Email da última entrada feita com "Lembrar-me" marcado, guardado só no dispositivo
 * (AsyncStorage), nunca no Firestore.
 *
 * Sair da conta apaga a sessão (é isso que `signOut` faz, e não há como voltar atrás aí), por isso
 * "Lembrar-me" não pode significar "não me peças credenciais outra vez". O que fica guardado é o
 * *email*: ao voltar ao ecrã de entrada, o campo vem preenchido e a pessoa só escreve a
 * palavra-passe. Desmarcar o checkbox na entrada seguinte esquece-o.
 */
const STORAGE_KEY = 'inovapp:rememberedEmail';

export async function getRememberedEmail(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** `null` esquece o email guardado (é o que desmarcar "Lembrar-me" faz). */
export async function setRememberedEmail(email: string | null): Promise<void> {
  if (email) {
    await AsyncStorage.setItem(STORAGE_KEY, email);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}

/** Só para os testes: confirma a chave que está mesmo a ser usada. */
export const REMEMBERED_EMAIL_STORAGE_KEY = STORAGE_KEY;
