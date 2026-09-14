import type { useRouter } from 'expo-router';

type AppRouter = ReturnType<typeof useRouter>;

/** Volta ao ecrã anterior se houver histórico; caso contrário substitui pelo destino de recurso.
 * Sem isto, abrir um ecrã diretamente (ex.: refresh da página no web) e carregar em "Voltar"
 * dispara o aviso "GO_BACK not handled by any navigator", porque não há nada para desempilhar. */
export function goBack(router: AppRouter, fallbackHref: Parameters<AppRouter['replace']>[0] = '/'): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallbackHref);
  }
}
