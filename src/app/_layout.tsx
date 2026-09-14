import { useEffect, useState } from 'react';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SplashScreen, Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthStore } from '@/auth/store';
import { useAuthSync } from '@/auth/listener';
import { useLocaleStore } from '@/i18n/store';

SplashScreen.preventAutoHideAsync();

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
        <BottomSheetModalProvider>
          {isReady && (
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Protected guard={!user}>
                <Stack.Screen name="login" />
                <Stack.Screen name="create-account" />
                <Stack.Screen name="forgot-password" />
              </Stack.Protected>

              <Stack.Protected guard={!!user && profileCompleted === false}>
                <Stack.Screen name="profile-setup" />
              </Stack.Protected>

              <Stack.Protected guard={!!user && profileCompleted === true}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="chat/[id]" />
                <Stack.Screen name="profile/[id]" />
                <Stack.Screen name="profile-edit" />
                <Stack.Screen name="notifications" />
                <Stack.Screen name="sessions" />
                <Stack.Screen name="session-request" />
                <Stack.Screen name="materials" />
              </Stack.Protected>
            </Stack>
          )}
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
