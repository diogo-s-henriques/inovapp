import type { Locale } from '@/i18n/store';

/** Tag de locale do Intl/toLocaleDateString correspondente ao idioma da app. */
export function dateLocaleTag(locale: Locale): string {
  return locale === 'en' ? 'en-US' : 'pt-PT';
}

/** Devolve o rótulo de "agora" (passado pelo chamador, já traduzido), "Xm", "Xh" ou "Xd"
 * consoante a distância até ao momento atual. */
export function formatTimeAgo(date: Date, nowLabel: string): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return nowLabel;
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  return `${days}d`;
}
