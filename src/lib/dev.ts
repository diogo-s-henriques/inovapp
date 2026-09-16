/**
 * "Esta é uma build de desenvolvimento?", numa linha que também funciona fora do React Native.
 *
 * O `__DEV__` é uma global do React Native: o Metro substitui-a pelo valor certo em cada build. Num
 * processo de Node ela **não existe** - e há dois, os testes (`npm run test:lib` e `test:data`) -
 * por isso um `if (__DEV__)` ali é um `ReferenceError` no momento em que a linha corre.
 *
 * E corre precisamente nos sítios onde menos se espera: dentro de `catch`. Foi assim que apareceu -
 * a partir do momento em que o `src/lib/firebase.ts` passou a importar o serviço de erros (para
 * ativar o App Check), o `observe.ts` passou a ser carregado nos testes da camada de dados, e o
 * aviso de "não há módulo nativo" rebentava **exatamente quando** o módulo nativo não existia, que
 * em Node é sempre.
 *
 * Em Node, o equivalente é o `NODE_ENV` - que é o que o próprio Metro lê para decidir o valor de
 * `__DEV__` fora do React Native.
 */
export function isDev(): boolean {
  return typeof __DEV__ === 'undefined' ? process.env.NODE_ENV !== 'production' : __DEV__;
}
