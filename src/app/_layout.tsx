import { useEffect, useState } from 'react';
import { Keyboard, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SplashScreen, Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthStore } from '@/auth/store';
import { useAuthSync } from '@/auth/listener';
import { useLocaleStore } from '@/i18n/store';

SplashScreen.preventAutoHideAsync();

/**
 * Entrar e sair da app é uma troca de ecrã inteira, não um "avançar dentro" dela — por isso um
 * `fade` (o ecrã de entrada dissolve-se e o outro aparece), em vez do deslize lateral por omissão,
 * que sugere navegação entre ecrãs irmãos. Os ecrãs de detalhe (chat, perfil, agenda, materiais…)
 * ficam com a animação por omissão, que é a certa para eles.
 */
const AUTH_SCREEN_ANIMATION = { animation: 'fade' } as const;

/** Raiz da app: aguarda o estado de autenticação/perfil antes de decidir que rotas mostrar. */
export default function RootLayout() {
  useAuthSync();
  const { initializing, user, profileCompleted } = useAuthStore();
  // O idioma guardado no dispositivo é lido de AsyncStorage de forma assíncrona; esperar pela
  // hidratação evita mostrar a app em português a quem a escolheu em inglês.
  const [localeReady, setLocaleReady] = useState(() => useLocaleStore.persist.hasHydrated());

  // O valor inicial já cobre o caso de a hidratação ter terminado antes do primeiro render;
  // este listener apanha a que ainda esteja a decorrer.
  useEffect(() => useLocaleStore.persist.onFinishHydration(() => setLocaleReady(true)), []);

  // Só se considera "pronto" depois de saber se há utilizador e, a existir, se o perfil está
  // completo — evita mostrar por instantes o ecrã errado (ex.: login antes de saber que já
  // está autenticado).
  const isReady = localeReady && !initializing && (user === null || profileCompleted !== null);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hide();
    }
  }, [isReady]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/*
         * Tocar fora de um campo fecha o teclado, em qualquer ecrã.
         *
         * Fica aqui, e não em cada ecrã, por dois motivos: os ecrãs que são só `View` (login,
         * criar conta, esqueceu-se) não têm `ScrollView` nenhum para herdar
         * `keyboardShouldPersistTaps`, e repetir isto em cada ecrã novo era uma coisa a mais de
         * que era fácil esquecer-se. `accessible={false}` impede que isto apareça como um
         * elemento a mais para leitores de ecrã; um toque num botão continua a ser do botão —
         * este só apanha o toque que ninguém quis.
         */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.root}>
            <BottomSheetModalProvider>
              {isReady && (
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Protected guard={!user}>
                    <Stack.Screen name="login" options={AUTH_SCREEN_ANIMATION} />
                    <Stack.Screen name="create-account" options={AUTH_SCREEN_ANIMATION} />
                    <Stack.Screen name="forgot-password" options={AUTH_SCREEN_ANIMATION} />
                  </Stack.Protected>

                  <Stack.Protected guard={!!user && profileCompleted === false}>
                    <Stack.Screen name="profile-setup" options={AUTH_SCREEN_ANIMATION} />
                  </Stack.Protected>

                  <Stack.Protected guard={!!user && profileCompleted === true}>
                    <Stack.Screen name="(tabs)" options={AUTH_SCREEN_ANIMATION} />
                    <Stack.Screen name="chat/[id]" />
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
        </TouchableWithoutFeedback>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
