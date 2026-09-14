import { createRequire } from 'node:module';

/**
 * Double de `src/constants/courses.json`.
 *
 * Em Node, importar um JSON como módulo ESM exige `with { type: 'json' }`, coisa que o Metro não
 * pede — e a app não deve ser alterada só para agradar aos testes. Aqui carrega-se o ficheiro a
 * sério, por `require`, que trata JSON nativamente: os testes vêem os dados reais e continuam a
 * detectar um ficheiro inválido.
 */
const require = createRequire(import.meta.url);

export default require('../../src/constants/courses.json');
