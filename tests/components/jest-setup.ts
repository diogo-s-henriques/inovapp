/**
 * Setup dos testes de componentes (ver a chave `jest` em package.json).
 *
 * O `@react-native-async-storage/async-storage` não carrega num ambiente de teste — depende do
 * runtime nativo. O próprio pacote traz um mock em memória, que é o que aqui se usa. É preciso
 * porque o store do idioma (`src/i18n/store.ts`) persiste a escolha lá, e qualquer componente que
 * use `useI18n` ou `useTheme` passa por ele.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
