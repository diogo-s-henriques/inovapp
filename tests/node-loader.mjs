/**
 * Resolvedor usado pelos testes de Node (`npm run test:lib`).
 *
 * A app importa com o alias `@/...` (declarado no tsconfig e resolvido pelo Metro), que o Node
 * não conhece. Este loader traduz `@/x` para `src/x` e substitui por doubles os módulos que não
 * existem num processo de Node — o AsyncStorage (depende do runtime do React Native), o
 * `src/lib/firebase.ts` (inicializa a app a partir de variáveis EXPO_PUBLIC_*, que aqui não
 * existem) e o JSON de cursos (em Node um import de JSON exige `with { type: 'json' }`, coisa
 * que o Metro não pede).
 *
 * Os doubles só substituem importações vindas de dentro de `src/`. Quem importa de fora — os
 * próprios testes e as bibliotecas em node_modules — usa os pacotes a sério, para que por
 * exemplo os testes das regras continuem a falar com o Firebase verdadeiro.
 *
 * Com INOVAPP_TEST_REAL_FIREBASE=1 (ver tests/data/preload.mjs) os doubles do Firebase e do
 * `src/lib/firebase.ts` ficam desligados: é o que os testes da camada de dados precisam, para
 * exercitarem o SDK verdadeiro contra os emuladores, com as regras a sério pelo meio.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.dirname(testsDir);
const srcDir = path.join(rootDir, 'src');

const FIREBASE_REAL = process.env.INOVAPP_TEST_REAL_FIREBASE === '1';

const DOUBLES = new Map([
  ['@react-native-async-storage/async-storage', path.join(testsDir, 'doubles', 'async-storage.mjs')],
  ['@/constants/courses.json', path.join(testsDir, 'doubles', 'courses-json.mjs')],
]);

if (!FIREBASE_REAL) {
  DOUBLES.set('firebase/firestore', path.join(testsDir, 'doubles', 'firebase-firestore.mjs'));
  DOUBLES.set('@/lib/firebase', path.join(testsDir, 'doubles', 'lib-firebase.mjs'));
}

const EXTENSIONS = ['.ts', '.tsx', '.mts', '.js', '.mjs', '.json'];

function firstExistingFile(basePath) {
  const candidates = [
    basePath,
    ...EXTENSIONS.map((extension) => basePath + extension),
    ...EXTENSIONS.map((extension) => path.join(basePath, `index${extension}`)),
  ];

  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null;
}

function isInsideSrc(parentUrl) {
  if (!parentUrl?.startsWith('file:')) return false;
  const parentPath = fileURLToPath(parentUrl);
  return parentPath.startsWith(srcDir + path.sep);
}

export async function resolve(specifier, context, nextResolve) {
  const importedFromSrc = isInsideSrc(context.parentURL);

  if (importedFromSrc && DOUBLES.has(specifier)) {
    return { url: pathToFileURL(DOUBLES.get(specifier)).href, shortCircuit: true };
  }

  if (specifier.startsWith('@/')) {
    const resolved = firstExistingFile(path.join(srcDir, specifier.slice(2)));
    if (resolved) return { url: pathToFileURL(resolved).href, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}

/**
 * Os ficheiros de `src/` são TypeScript com sintaxe ESM, e o package.json não declara
 * `type: module`. `module-typescript` diz ao Node para os tratar como ESM depois de retirar os
 * tipos — sem isto, tentava interpretá-los como CommonJS e falhava nos `import`.
 */
export async function load(url, context, nextLoad) {
  if (url.startsWith('file:')) {
    const filePath = fileURLToPath(url);
    if (filePath.startsWith(srcDir + path.sep) && filePath.endsWith('.ts')) {
      return {
        format: 'module-typescript',
        source: readFileSync(filePath, 'utf8'),
        shortCircuit: true,
      };
    }
  }

  return nextLoad(url, context);
}
