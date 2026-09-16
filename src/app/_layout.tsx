import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SplashScreen, Stack, type ErrorBoundaryProps } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthStore } from '@/auth/store';
import { useAuthSync } from '@/auth/listener';
import { useLocaleStore } from '@/i18n/store';
import { authStage } from '@/lib/auth-gate';
import { useNotificationObserver, usePushSync } from '@/push/listener';
import { reportError } from '@/lib/error-reporting';
import { observe, useMarkInteractive } from '@/lib/observe';
import { ErrorScreen } from '@/components/domain/ErrorScreen';

SplashScreen.preventAutoHideAsync();

/**
 * Configuração do EAS Observe - tem de correr **antes de qualquer ecrã montar**, e é por isso que
 * está aqui no topo do ficheiro e não dentro de um componente (`Observe.configure` substitui a
 * configuração inteira, e ligar ou desligar uma integração depois de a app arrancar rebenta).
 *
 * As duas decisões:
 *
 * - **`'expo-router': true`** - sem isto o dashboard só tem números da app toda; com isto tem
 *   `cold_ttr`/`warm_ttr`/`tti` por ecrã, que é o que diz *qual* ecrã está lento;
 * - **`filteredParams`** - a integração exporta os parâmetros da rota no URL resolvido, e os
 *   nossos levam nomes, ids e disciplinas de pessoas (`firstName`, `toUid`, `id`…). O que aqui
 *   está é retirado antes de sair do dispositivo; a rota em si (o nome do ecrã) fica.
 *
 * **`dispatchInDebug: true` está ligado para se poder ver os primeiros eventos no desenvolvimento
 * build** (por omissão, uma build de debug não envia nada). **Tirar antes de publicar**: as
 * medições de uma build de debug estão distorcidas e sujam o dashboard.
 *
 * **Numa build sem o módulo nativo** (o Expo Go, por exemplo) `observe` é `null` e não há nada para
 * configurar - ver src/lib/observe.ts. A interrogação é o que impede que isto deite abaixo o
 * arranque da app.
 */
observe?.Observe.configure({
  dispatchInDebug: true,
  integrations: {
    'expo-router': {
      filteredParams: ['id', 'toUid', 'firstName', 'lastName', 'image', 'subject', 'role', 'date'],
    },
  },
});

/**
 * O que se vê quando um ecrã rebenta a desenhar.
 *
 * Sem isto, uma exceção num render, em produção, **fecha a app**: a pessoa fica sem o ecrã e sem
 * aviso nenhum - que foi o que aconteceu quando o Expo Go fechava sem dizer porquê. Com o limite,
 * o ecrã que falhou dá lugar a um aviso e a uma segunda tentativa, e o resto da app continua lá.
 *
 * Vive fora do `Stack` (é o limite da raiz) porque um erro no próprio layout não pode ser apanhado
 * por nada que ele desenhe. Os ecrãs têm o seu, configurado em `unstable_settings` - esse mantém a
 * navegação montada, para se poder sair do ecrã que falhou com o gesto de voltar.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  // Num efeito e não no corpo: o limite pode voltar a desenhar-se, e o corpo de um componente não é
  // sítio para efeitos secundários (reportar o mesmo erro três vezes não é reportar três erros).
  useEffect(() => {
    reportError(error, 'raiz');
  }, [error]);

  return <ErrorScreen error={error} onRetry={retry} />;
}

/**
 * O limite de cada **ecrã** do `Stack` da raiz (os separadores e os ecrãs empilhados).
 *
 * Diferente do de cima: este mantém a navegação montada, por isso um erro dentro do Definições não
 * fecha o ecrã todo - desenha o aviso **no lugar dele** e deixa o gesto de voltar funcionar. É a
 * diferença entre ficar preso e poder sair.
 */
function ScreenErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    reportError(error, 'ecrã');
  }, [error]);

  return <ErrorScreen error={error} onRetry={retry} />;
}

// Configuração do Expo Router (ver "Error handling" na documentação): o limite acima passa a valer
// para cada ecrã deste `Stack` e para os layouts aninhados que não definam o seu.
export const unstable_settings = { screenErrorBoundary: ScreenErrorBoundary };

/**
 * Entrar e sair da app é uma troca de ecrã inteira, não um "avançar dentro" dela - por isso um
 * `fade` (o ecrã de entrada dissolve-se e o outro aparece), em vez do deslize lateral por omissão,
 * que sugere navegação entre ecrãs irmãos. Os ecrãs de detalhe (chat, perfil, agenda, materiais…)
 * ficam com a animação por omissão, que é a certa para eles.
 */
const AUTH_SCREEN_ANIMATION = { animation: 'fade' } as const;

/**
 * A app em si: aguarda o estado de autenticação/perfil antes de decidir que rotas mostrar.
 *
 * Não é o que o Expo Router exporta (`RootLayout`, no fim do ficheiro), porque por fora disto tem
 * de ficar o `ObserveRoot` - é ele que marca o primeiro render (a métrica de arranque) e que põe o
 * limite de erro mais externo de todos.
 */
function AppTree() {
  useAuthSync();
  // Registar o dispositivo para avisos e tratar do toque num aviso. Os dois precisam do estado
  // da sessão, e é por isso que estão aqui e não no `src/push/`: os hooks vivem do que já foi
  // carregado (ver src/push/listener.ts).
  usePushSync();
  const markInteractive = useMarkInteractive();
  const { initializing, user, profileCompleted, bootstrapped } = useAuthStore();
  // O idioma guardado no dispositivo é lido de AsyncStorage de forma assíncrona; esperar pela
  // hidratação evita mostrar a app em português a quem a escolheu em inglês.
  const [localeReady, setLocaleReady] = useState(() => useLocaleStore.persist.hasHydrated());
  // Se a app já ouviu a primeira resposta sobre a sessão: é o que separa a espera do arranque
  // (atrás do splash) da espera depois de um "Entrar" (com o ecrã de entrada à frente). Vive na
  // loja porque quem a sabe é o `useAuthSync`, no instante em que a resposta chega - e não este
  // layout, num efeito (que a equipa do React não deixa usar para escrever estado).
  const stage = authStage({ initializing, user, profileCompleted, bootstrapped });

  // O valor inicial já cobre o caso de a hidratação ter terminado antes do primeiro render;
  // este listener apanha a que ainda esteja a decorrer.
  useEffect(() => useLocaleStore.persist.onFinishHydration(() => setLocaleReady(true)), []);

  // Só se considera "pronto" depois de saber que ecrãs mostrar - evita mostrar por instantes o ecrã
  // errado (ex.: login antes de saber que já está autenticado). Quem decide isso é o `authStage`
  // (ver src/lib/auth-gate.ts), e não uma corrente de condições espalhada por aqui.
  //
  // **Enquanto isto for falso, o `Stack` não existe** - e é por isso que o intervalo a seguir a um
  // "Entrar" não pode voltar a ser `loading`: desmontar a navegação toda apagava o ecrã de entrada,
  // deixava o fundo à mostra até a resposta do perfil chegar, e a Home aparecia depois num corte
  // seco. Com o estágio `signing-in` o `Stack` fica de pé (é o ecrã de entrada que está lá dentro) e
  // a troca para os separadores passa pela animação - que é o `fade` que se queria desde o início.
  const isReady = localeReady && stage !== 'loading';

  // Um aviso tocado **abre a app**: até a app estar utilizável, o destino do toque não existe para
  // onde ir. Ver `useNotificationObserver`.
  useNotificationObserver(isReady && stage === 'app');

  // O "já está utilizável" do EAS Observe: é aqui que o trabalho por trás do splash acaba (idioma
  // lido do disco, sessão do Firebase, perfil). Chamado mais do que uma vez não faz mal - só a
  // primeira conta. Se ficasse a faltar, o `tti` (tempo até se poder usar a app) não existia.
  useEffect(() => {
    if (isReady) {
      SplashScreen.hide();
      markInteractive();
    }
  }, [isReady, markInteractive]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/*
         * Tocar fora de um campo fechar o teclado **não** se faz aqui.
         *
         * Esteve aqui um `TouchableWithoutFeedback` à volta de tudo, e um `Touchable` fica com todos
         * os toques que apanha: os gestos nativos do que está por dentro (o arrastar de um
         * `ScrollView`) deixam de lhes chegar. Passou para os ecrãs que dele precisam, de duas
         * formas - `keyboardDismissProps` nos que não rolam (src/components/ui/KeyboardDismiss) e
         * `keyboardShouldPersistTaps="handled"` nos que rolam, que é o comportamento nativo.
         */}
        <View style={styles.root}>
          <BottomSheetModalProvider>
            {isReady && (
              <Stack screenOptions={{ headerShown: false }}>
                {/* `signing-in` mostra os mesmos ecrãs: quem acabou de carregar em "Entrar" ainda
                    está no formulário, à espera de saber se já tem perfil - e é daí que a Home se
                    dissolve quando chega. */}
                <Stack.Protected guard={stage === 'signed-out' || stage === 'signing-in'}>
                  <Stack.Screen name="login" options={AUTH_SCREEN_ANIMATION} />
                  <Stack.Screen name="create-account" options={AUTH_SCREEN_ANIMATION} />
                  <Stack.Screen name="forgot-password" options={AUTH_SCREEN_ANIMATION} />
                </Stack.Protected>

                {/* Antes do perfil, e por isso antes de qualquer escrita a sério: as regras do
                    Firestore exigem o email confirmado para tudo o que não seja o próprio
                    documento (ver firestore.rules). */}
                <Stack.Protected guard={stage === 'verify-email'}>
                  <Stack.Screen name="verify-email" options={AUTH_SCREEN_ANIMATION} />
                </Stack.Protected>

                <Stack.Protected guard={stage === 'profile-setup'}>
                  <Stack.Screen name="profile-setup" options={AUTH_SCREEN_ANIMATION} />
                </Stack.Protected>

                <Stack.Protected guard={stage === 'app'}>
                  <Stack.Screen name="(tabs)" options={AUTH_SCREEN_ANIMATION} />
                  <Stack.Screen name="chat/[id]" />
                  {/* Ecrã empilhado, e não uma mudança de separador, de propósito: chega-se
                      aqui pela linha "N pedidos de conexão" da Home e pelo aviso das
                      Notificações, e estes têm de deixar algo por baixo para o gesto de voltar
                      (o deslize do iOS) ter o que desempilhar. */}
                  <Stack.Screen name="connection-requests" />
                  <Stack.Screen name="profile/[id]" />
                  <Stack.Screen name="profile-edit" />
                  <Stack.Screen name="settings" />
                  <Stack.Screen name="notifications" />
                  <Stack.Screen name="sessions" />
                  <Stack.Screen name="session-request" />
                  <Stack.Screen name="materials" />
                </Stack.Protected>
              </Stack>
            )}
          </BottomSheetModalProvider>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * A raiz que o Expo Router monta: o `ObserveRoot` por fora de tudo.
 *
 * Faz duas coisas que só ele pode fazer estando tão por fora: marca o **primeiro render** (a base
 * das métricas de arranque) e é o **último limite de erro** da app - o que apanha o que rebentar
 * antes de haver ecrã para o mostrar. Leva um `fallback` (o mesmo `ErrorScreen`) com a segunda
 * tentativa que ele próprio dá (`resetError`), porque sem `errorBoundaryFallback` **não é montado
 * limite nenhum** aqui e um erro nesta camada voltava a fechar a app em produção.
 *
 * O erro assim apanhado é registado no EAS Observe **com a stack de componentes React**, que é a
 * parte que nem o gestor global de erros consegue ver.
 *
 * **Sem módulo nativo não há `ObserveRoot` para montar** (ver src/lib/observe.ts) e o `AppTree` é a
 * raiz. Não se perde o tratamento de erros por isso: o limite de erro do Expo Router - o
 * `ErrorBoundary` acima, e o de cada ecrã em `unstable_settings` - continua a valer.
 */
export default function RootLayout() {
  const Root = observe?.ObserveRoot;

  if (!Root) return <AppTree />;

  return (
    <Root
      errorBoundaryFallback={({ error, resetError }) => (
        <ErrorScreen error={error} onRetry={resetError} />
      )}>
      <AppTree />
    </Root>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
