/**
 * Confirma que um link é http/https. É o único tipo de link que a app aceita em anexos de
 * conversa e materiais: `Linking.openURL` abre exatamente o que lhe derem, e esquemas
 * arbitrários (ex.: `intent://`, `file://`) seriam um caminho para lançar outra app no
 * dispositivo a partir de dados escritos por outro utilizador.
 */
export function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}
