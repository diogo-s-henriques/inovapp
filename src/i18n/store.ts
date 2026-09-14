import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { en } from '@/i18n/en';
import { pt } from '@/i18n/pt';
import type { Translations } from '@/i18n/translations';

export type Locale = 'pt' | 'en';

export const LOCALE_STORAGE_KEY = 'inovapp:locale';

// Mapa de todos os dicionários de tradução disponíveis, indexados por idioma.
export const TRANSLATIONS: Record<Locale, Translations> = { pt, en };

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

// Estado global do idioma da aplicação, persistido no dispositivo (AsyncStorage) para a escolha
// sobreviver a reinícios da app. Ao alterar `locale`, qualquer componente que use `useI18n`
// re-renderiza com o dicionário correspondente.
export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'pt',
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: LOCALE_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/**
 * Dicionário do idioma atual, para código que corre fora de React (sem hooks) — mesmo padrão já
 * usado em src/auth/actions.ts. Dentro de componentes usa-se `useI18n`, que reage à mudança de
 * idioma; aqui lê-se o valor no momento da chamada.
 */
export function getTranslations(): Translations {
  return TRANSLATIONS[useLocaleStore.getState().locale];
}

/** Idioma atual, para código fora de React que precise de formatar datas/horas. */
export function getLocale(): Locale {
  return useLocaleStore.getState().locale;
}
