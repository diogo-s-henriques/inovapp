import type * as ObserveModule from 'expo-observe';

type ObserveApi = typeof ObserveModule;

/**
 * O `expo-observe` é uma dependência **nativa**, e isso é uma armadilha que já nos apanhou.
 *
 * O JavaScript importa-o, mas quem tem de existir dentro da app instalada é o módulo
 * `ExpoAppMetrics`, que só está lá se a build o tiver compilado. Numa build que não o tenha - o
 * Expo Go, sempre (a documentação do `expo-observe` diz que a biblioteca não existe lá), ou um
 * development client anterior a este pacote ter entrado no projeto - o `import` rebenta quando o
 * ficheiro é avaliado, ou seja **antes de haver ecrã**: a app abre e fecha logo a seguir, sem nada
 * a dizer porquê. Foi exatamente isso que aconteceu (ver "Cannot find native module
 * 'ExpoAppMetrics'" em src/app/_layout.tsx:4).
 *
 * Um serviço de diagnóstico não pode deitar abaixo a app que devia diagnosticar. Por isso o módulo
 * é carregado aqui, à mão, com a falha apanhada: sem ele a app corre como sempre e perde-se o
 * painel de erros - que é o preço certo a pagar por continuar a haver app.
 */
function load(): ObserveApi | null {
  try {
    // `require` e não `import` de propósito: é a única forma de apanhar uma falha que acontece no
    // momento em que o módulo é avaliado. Um `import` no topo de um ficheiro não se pode envolver
    // em `try`, e é por isso que um módulo nativo em falta fechava a app inteira.
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- é o que permite apanhar a falha
    return require('expo-observe') as ObserveApi;
  } catch (error) {
    if (__DEV__) {
      console.warn('[observe] sem módulo nativo nesta build: sem métricas nem erros reportados', error);
    }
    return null;
  }
}

/** O `expo-observe`, ou `null` quando esta build não trouxe o módulo nativo. */
export const observe = load();

/** O mesmo contrato de `useObserve()` para quando não há módulo nenhum. */
const inertMarker = () => ({ markInteractive: () => {} });

/**
 * `useObserve().markInteractive`, ou um marcador que não faz nada.
 *
 * Existe porque um hook não se pode chamar condicionalmente: a escolha entre o hook verdadeiro e o
 * inerte tem de ser feita onde não pareça uma chamada de hook, e é constante durante toda a vida da
 * app (o módulo ou está lá desde o arranque ou não está), por isso a ordem dos hooks nunca muda.
 */
export function useMarkInteractive(): () => void {
  const marker = observe?.useObserve ?? inertMarker;
  return marker().markInteractive;
}
