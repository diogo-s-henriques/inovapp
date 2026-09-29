/**
 * Texto normalizado para pesquisa.
 *
 * Quem escreve "gestao" ou "ótica" tem de encontrar "Gestão" e "Ótica": a comparação é feita sem
 * acentos e sem maiúsculas, nos dois lados. Estava escrito duas vezes (no seletor de curso e no de
 * disciplinas) e ia ser escrito uma terceira no filtro da pesquisa - o mesmo `normalize('NFD')` com
 * a mesma expressão para tirar os sinais, que é precisamente a parte em que é fácil enganar-se.
 */
export function normalizeForSearch(value: string): string {
  return (
    value
      // 'NFD' separa cada letra acentuada na letra + o sinal, e é o sinal que se apaga a seguir.
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  );
}
