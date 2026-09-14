import { TRANSLATIONS, useLocaleStore } from '@/i18n/store';
import type { Translations } from '@/i18n/translations';

/** Devolve o dicionário de traduções correspondente ao idioma atualmente selecionado. */
export function useI18n(): Translations {
  const locale = useLocaleStore((state) => state.locale);
  return TRANSLATIONS[locale];
}
