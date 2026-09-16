import { Observe } from 'expo-observe';

/**
 * Por onde passam os erros que a app **apanha** - os que, sem isto, morrem num `catch` e não deixam
 * rasto nenhum.
 *
 * A app tem uma dúzia de `catch { setError(true) }` e um ecrã de erro para o que rebenta a desenhar
 * (`ErrorScreen`); os dois passam por aqui, para não haver dois sítios onde ligar um serviço de
 * erros. O serviço é o **EAS Observe** (`expo-observe`, SDK 57): regista os erros de JavaScript e os
 * crashes nativos na página *Errors* do projeto no Expo, com 100 000 eventos por mês no plano
 * gratuito.
 *
 * **Onde entra na app**: o `expo-observe` já instala um gestor global de erros quando é importado
 * (por isso uma exceção não apanhada é registada sozinha) e o `ObserveRoot` em `src/app/_layout.tsx`
 * põe um limite de erro à volta de tudo, que regista o erro **com a stack de componentes React**. O
 * que falta é o que ninguém apanha: os erros que a app decide tratar - uma leitura negada, uma
 * escrita que falhou - chegam nem ao gestor global nem ao limite, porque são apanhados primeiro.
 * Esses são os que este `reportError` manda.
 *
 * **O contexto vai no início da mensagem** (`[chat] …`), porque o dashboard agrupa os erros por
 * nome e mensagem: sem ele, o mesmo `TypeError` vindo de sítios diferentes era uma linha só, e o
 * "quantas pessoas foram afectadas" contava coisas que não são a mesma coisa. A stack do erro
 * original é preservada para a dashboard a conseguir mapear ao ficheiro de origem (é preciso
 * `uploadSourceMaps: true` no perfil de produção do `eas.json`).
 *
 * **Nada de dados pessoais.** O que aqui entra é enviado para fora do dispositivo e fica visível
 * nessa página: nomes, emails e ids de utilizadores não podem aparecer no texto do erro.
 */
export function reportError(error: unknown, context: string): void {
  // Em desenvolvimento escreve também na consola: quem está a programar olha para o terminal, e no
  // Expo Go (onde o `expo-observe` não existe) isto é o único rasto que aparece.
  if (__DEV__) console.warn(`[${context}]`, error);

  Observe.reportError(withContext(error, context));
}

/**
 * Põe o contexto na mensagem sem perder a stack original.
 *
 * Devolve um `Error` **novo** (e não mexe no que lhe foi dado): quem chamou pode estar a usá-lo
 * para outra coisa, e um erro que muda de nome ao passar por aqui era uma surpresa difícil de
 * encontrar. Um valor que não é `Error` (um `throw 'x'`) é transformado em `Error`, que é o que a
 * API espera.
 */
function withContext(error: unknown, context: string): Error {
  const original = error instanceof Error ? error : null;
  const detail = original ? original.message || original.name : String(error);
  const wrapped = new Error(`[${context}] ${detail}`);

  if (original?.stack) wrapped.stack = original.stack;
  return wrapped;
}
