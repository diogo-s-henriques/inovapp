import type { Locale } from '@/i18n/store';

/**
 * Chave de data no formato 'YYYY-MM-DD', o formato que as datas das sessões usam no Firestore e
 * que as comparações de calendário (`minDate`, `markedDates`) esperam.
 *
 * Usa os getters locais de propósito: `toISOString()` converte para UTC e, em Portugal depois das
 * 00:00 de verão, uma data da noite anterior cairia no dia seguinte - o que faria a agenda marcar
 * o dia errado. O formato é o mesmo de `Date.toJSON()`, portanto continua a ordenar
 * alfabeticamente pela ordem cronológica.
 */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** O inverso de `toDateKey`: a data local que corresponde a uma chave 'YYYY-MM-DD'. */
export function fromDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Diz se uma string é uma chave de data a sério.
 *
 * Existe para o que entra **de fora do código**: um parâmetro de rota é texto livre -
 * `/sessions?date=amanhã` é uma coisa que se pode escrever à mão, e é isto que separa "um dia" de
 * "uma string" antes de ela virar o mês de um calendário. Valida as duas coisas: a forma
 * ('YYYY-MM-DD' com dois dígitos em cada campo) e o calendário - '2026-02-31' tem a forma certa e
 * não existe, e um `Date` construído a partir dela dava 3 de março sem avisar ninguém.
 */
export function isDateKey(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = fromDateKey(value);
  return toDateKey(date) === value;
}

/**
 * Chave de comparação de uma data com hora: 'YYYY-MM-DDTHH:mm', o formato que os campos `date` e
 * `time` das sessões usam no Firestore. Compara-se como texto e ordena-se como cronologicamente
 * (mesmo princípio de `toDateKey`), o que é o que permite responder a "esta sessão já passou?"
 * sem construir um `Date` a partir de dois campos separados - e sem tropeçar nos fusos horários,
 * que é onde essa construção costuma correr mal.
 */
export function toSessionKey(date: Date = new Date()): string {
  return `${toDateKey(date)}T${date.toTimeString().slice(0, 5)}`;
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
