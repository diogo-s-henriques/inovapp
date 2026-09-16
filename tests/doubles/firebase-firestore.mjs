/**
 * Double de `firebase/firestore` para os testes de Node.
 *
 * As funções de `src/lib/matching.ts` que aqui se testam não falam com a base de dados, mas o
 * módulo importa estes símbolos no topo. O double existe para (a) não abrir nenhuma ligação e
 * (b) dar controlo sobre o que uma leitura devolve, que é o que permite verificar a cache de
 * perfis de `createProfileResolver()` sem emulador.
 *
 * As escritas que o `push.ts` usa (setDoc/deleteDoc) são **registadas** em vez de atiradas, porque
 * o que importa provar sobre elas é onde escrevem: o caminho `users/{uid}/devices/{id}` tem de
 * bater com o que as regras exigem, e isso só se vê no que foi chamado. As restantes funções de
 * escrita/consulta continuam a atirar de propósito: se algum teste lhes tocar, isso é um caminho
 * que estes testes não deviam estar a exercitar (e o erro diz exatamente qual).
 */
/**
 * @type {{
 *   getDoc: string[],
 *   setDoc: { path: string, data: Record<string, unknown> }[],
 *   deleteDoc: string[],
 * }}
 */
export const firestoreCalls = { getDoc: [], setDoc: [], deleteDoc: [] };

const SEM_DOCUMENTO = { exists: () => false, data: () => undefined };
let nextSnapshot = SEM_DOCUMENTO;

/** Define o que a próxima leitura devolve. */
export function __setSnapshot(snapshot) {
  nextSnapshot = snapshot;
}

/** Limpa as chamadas registadas e volta ao estado "documento inexistente". */
export function __reset() {
  firestoreCalls.getDoc.length = 0;
  firestoreCalls.setDoc.length = 0;
  firestoreCalls.deleteDoc.length = 0;
  nextSnapshot = SEM_DOCUMENTO;
}

/** O primeiro argumento é a instância da base de dados (ver src/lib/firebase.ts). */
export function doc(...pathSegments) {
  return { path: pathSegments.slice(1).join('/') };
}

export async function getDoc(reference) {
  firestoreCalls.getDoc.push(reference?.path ?? 'referência desconhecida');
  return nextSnapshot;
}

export async function setDoc(reference, data) {
  firestoreCalls.setDoc.push({ path: reference?.path ?? 'referência desconhecida', data });
}

export async function deleteDoc(reference) {
  firestoreCalls.deleteDoc.push(reference?.path ?? 'referência desconhecida');
}

/**
 * Devolve uma marca em vez de um `Timestamp` a sério: os testes não têm relógio do servidor, e o
 * que se verifica é a presença da marca de tempo, não o valor dela.
 */
export function serverTimestamp() {
  return { __serverTimestamp: true };
}

function naoUsadoNestesTestes(nome) {
  return () => {
    throw new Error(`firestore double: ${nome}() não é usado pelos testes de lógica pura.`);
  };
}

/**
 * Só existe porque `src/lib/*.ts` a importa como valor (o `blocking.ts` também a usa como tipo);
 * nenhum teste de lógica pura a instancia. Exportar a classe evita o erro de "does not provide an
 * export named 'FirestoreError'" quando um destes módulos passa a ser carregado por um teste.
 */
export class FirestoreError extends Error {}

/**
 * O `Timestamp` é importado como valor pelo `sessions.ts`, mas só é usado como tipo. O Node
 * retira os tipos ao carregar um `.ts` sem tocar nos `import`, por isso o nome tem de existir
 * como export - ver o comentário do `FirestoreError` acima.
 */
export class Timestamp {}

export const addDoc = naoUsadoNestesTestes('addDoc');
export const collection = naoUsadoNestesTestes('collection');
export const getDocs = naoUsadoNestesTestes('getDocs');
export const updateDoc = naoUsadoNestesTestes('updateDoc');
export const writeBatch = naoUsadoNestesTestes('writeBatch');
export const onSnapshot = naoUsadoNestesTestes('onSnapshot');
export const limit = naoUsadoNestesTestes('limit');
export const query = naoUsadoNestesTestes('query');
export const where = naoUsadoNestesTestes('where');
