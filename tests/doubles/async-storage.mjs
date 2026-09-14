/**
 * Double do `@react-native-async-storage/async-storage`. O pacote real depende do runtime do
 * React Native, por isso não carrega num processo de Node. Guarda tudo em memória, no mesmo
 * formato (valores string), e expõe `__reset()` para cada teste partir de um estado limpo.
 */
const store = new Map();

const AsyncStorage = {
  async getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  async setItem(key, value) {
    store.set(key, String(value));
  },
  async removeItem(key) {
    store.delete(key);
  },
  async clear() {
    store.clear();
  },
  /** Só para os testes: esvazia o armazenamento entre casos. */
  __reset() {
    store.clear();
  },
  /** Só para os testes: o conteúdo atual, para verificar o que foi mesmo gravado. */
  __entries() {
    return [...store.entries()];
  },
};

export default AsyncStorage;
