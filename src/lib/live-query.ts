/**
 * Uma leitura viva **partilhada**: uma só subscrição ao Firestore, com quantos interessados houver,
 * e uma conta de quantos estão a ver para a fechar quando o último sair.
 *
 * O problema que isto resolve é o dos ecrãs que ouvem a mesma coisa. Os pedidos de conexão
 * pendentes eram ouvidos em três sítios ao mesmo tempo — a barra de baixo (a bolinha), a Home (a
 * contagem) e a aba dos Matches (a lista) — e cada um abria a sua subscrição: a mesma pergunta feita
 * três vezes à mesma base de dados, e cada alteração contada (e paga) três vezes. Aqui a pergunta é
 * feita uma vez; quem chega depois recebe o que já se sabe.
 *
 * A segunda coisa que resolve é **o silêncio**. Uma subscrição ao Firestore tem dois canais: o dos
 * dados e o do erro. Sem o segundo, uma leitura negada pelas regras não é um estado — é uma lista
 * que fica como estava, indistinguível de "não há nada" (foi assim que faltas de regras no Firebase
 * passaram meses por "ecrã sem dados"). Aqui o erro é um campo do estado, e há uma segunda
 * tentativa: um `onSnapshot` que falha não volta sozinho, por isso `retry` fecha a subscrição e
 * abre outra.
 *
 * O `uid` faz parte da chave: sair e entrar com outra conta fecha o que estava aberto e recomeça do
 * zero, em vez de deixar os dados de um utilizador à vista do seguinte.
 *
 * Não sabe nada do Firestore de propósito — recebe a função que abre a leitura (`open`). É o que
 * permite testar a partilha, o erro e a segunda tentativa sem base de dados nenhuma (ver
 * tests/lib/live-query.test.mts).
 */

export interface LiveState<T> {
  /** O último valor que chegou; o inicial enquanto não houver nenhum. */
  value: T;
  /** true quando a última leitura falhou (regras negadas, rede em baixo). */
  error: boolean;
}

export interface LiveQuery<T> {
  /**
   * Junta um interessado. Devolve a função que o tira; o último a sair fecha a leitura.
   *
   * Quem entra recebe **logo** o estado atual (mesmo antes de haver dados), para não ficar à espera
   * da próxima alteração no Firestore para desenhar o que já se sabe.
   */
  subscribe(uid: string, listener: (state: LiveState<T>) => void): () => void;
  /** Fecha e volta a abrir a leitura, limpando o erro — a segunda tentativa da interface. */
  retry(): void;
}

export interface LiveQueryConfig<T> {
  /** O que se mostra antes do primeiro snapshot (uma lista vazia, um zero). */
  initial: T;
  /** Abre a leitura e devolve a função que a fecha. */
  open(uid: string, onValue: (value: T) => void, onError: () => void): () => void;
}

export function createLiveQuery<T>({ initial, open }: LiveQueryConfig<T>): LiveQuery<T> {
  let uid: string | null = null;
  let close: (() => void) | null = null;
  let state: LiveState<T> = { value: initial, error: false };
  const listeners = new Set<(state: LiveState<T>) => void>();

  const publish = () => {
    // Copiar antes de percorrer: um interessado pode sair (desmontar) a meio da notificação.
    for (const listener of [...listeners]) listener(state);
  };

  const stop = () => {
    close?.();
    close = null;
    state = { value: initial, error: false };
  };

  const start = (currentUid: string) => {
    close = open(
      currentUid,
      (value) => {
        state = { value, error: false };
        publish();
      },
      () => {
        // O valor fica como estava: o ecrã mostra o que tinha **e** diz que a leitura falhou.
        state = { value: state.value, error: true };
        publish();
      },
    );
  };

  return {
    subscribe(currentUid, listener) {
      if (uid !== currentUid) {
        stop();
        uid = currentUid;
        // Quem estava a ver a conta anterior vê a lista limpar, em vez de ficar com os dados dela.
        publish();
      }

      listeners.add(listener);
      listener(state);

      if (!close) start(currentUid);

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) stop();
      };
    },

    retry() {
      if (!uid || listeners.size === 0) return;
      stop();
      start(uid);
      // Sem isto, quem está à espera ficava com o erro no ecrã até ao próximo snapshot.
      publish();
    },
  };
}
