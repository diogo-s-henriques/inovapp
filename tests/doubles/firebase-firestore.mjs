/**
 * Double de `firebase/firestore` para os testes de Node.
 *
 * As funções de `src/lib/matching.ts` que aqui se testam não falam com a base de dados, mas o
 * módulo importa estes símbolos no topo. O double existe para (a) não abrir nenhuma ligação e
 * (b) dar controlo sobre o que uma leitura devolve, que é o que permite verificar a cache de
 * perfis de `createProfileResolver()` sem emulador.
 *
 * As funções de escrita/consulta atiram de propósito: se algum teste lhes tocar, isso é um
 * caminho que estes testes não deviam estar a exercitar (e o erro diz exatamente qual).
 */
export const firestoreCalls = { getDoc: [] };

const SEM_DOCUMENTO = { exists: () => false, data: () => undefined };
let nextSnapshot = SEM_DOCUMENTO;

/** Define o que a próxima leitura devolve. */
export function __setSnapshot(snapshot) {
  nextSnapshot = snapshot;
}

/** Limpa as chamadas registadas e volta ao estado "documento inexistente". */
export function __reset() {
  firestoreCalls.getDoc.length = 0;
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

function naoUsadoNestesTestes(nome) {
  return () => {
    throw new Error(`firestore double: ${nome}() não é usado pelos testes de lógica pura.`);
  };
}

export const collection = naoUsadoNestesTestes('collection');
export const getDocs = naoUsadoNestesTestes('getDocs');
export const limit = naoUsadoNestesTestes('limit');
export const query = naoUsadoNestesTestes('query');
export const serverTimestamp = naoUsadoNestesTestes('serverTimestamp');
export const setDoc = naoUsadoNestesTestes('setDoc');
export const where = naoUsadoNestesTestes('where');
