import type { Locale } from '@/i18n/store';

/**
 * Chave de data no formato 'YYYY-MM-DD', o formato que as datas das sessões usam no Firestore e
 * que as comparações de calendário (`minDate`, `markedDates`) esperam.
 *
 * Usa os getters locais de propósito: `toISOString()` converte para UTC e, em Portugal depois das
 * 00:00 de verão, uma data da noite anterior cairia no dia seguinte — o que faria a agenda marcar
 * o dia errado. O formato é o mesmo de `Date.toJSON()`, portanto continua a ordenar
 * alfabeticamente pela ordem cronológica.
 */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
