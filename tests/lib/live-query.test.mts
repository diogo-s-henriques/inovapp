/**
 * Testes de `src/lib/live-query.ts` - a leitura viva partilhada.
 *
 * Esta peça existe por duas razões, e as duas estão aqui testadas sem Firestore nenhum: o módulo
 * recebe a função que abre a leitura (ver `open`), por isso um duplo de dez linhas chega para fazer
 * o que a base de dados faria - publicar valores e falhar.
 *
 * 1. **A partilha.** Três ecrãs a ouvir a mesma coisa abriam três subscrições: a mesma pergunta
 *    feita três vezes, e cada alteração contada três vezes. Aqui mede-se isso - `open` é chamado
 *    **uma vez** com três interessados, e os três recebem o mesmo.
 * 2. **O que se paga de leitura por gesto.** O último a sair fecha a subscrição, e quem entra
 *    depois recebe o que já se sabe sem esperar pela próxima alteração no servidor.
 *
 * Fica também fixada a parte que já se pagou uma vez na app a sério: **o erro tem de ser um
 * estado**. Uma leitura negada deixava a lista como estava, indistinguível de "não há nada"; e um
 * `onSnapshot` que falha não volta sozinho, por isso `retry` tem de fechar e abrir de novo.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createLiveQuery } from '@/lib/live-query';

interface Estado {
  value: number;
  error: boolean;
}

/**
 * Um duplo da leitura: guarda os interessados que a base de dados teria, e deixa o teste publicar
 * um valor ou falhar. Conta as aberturas e os fechos - é isso que prova a partilha.
 */
function criarDuplo(inicial = 0) {
  let onValue: (value: number) => void = () => {};
  let onError: () => void = () => {};
  const duplo = {
    aberturas: 0,
    fechos: 0,
    uidDaAbertura: null as string | null,
    recebido: [] as Estado[],
  };

  const live = createLiveQuery<number>({
    initial: inicial,
    open: (uid, aoReceber, aoFalhar) => {
      duplo.aberturas += 1;
      duplo.uidDaAbertura = uid;
      onValue = aoReceber;
      onError = aoFalhar;
      return () => {
        duplo.fechos += 1;
      };
    },
  });

  return {
    duplo,
    live,
    /** O que a base de dados faria. */
    publicar: (value: number) => onValue(value),
    falhar: () => onError(),
    ouvir: (uid: string) => {
      const estado: Estado = { value: -1, error: false };
      const unsubscribe = live.subscribe(uid, (proximo) => {
        estado.value = proximo.value;
        estado.error = proximo.error;
        duplo.recebido.push({ ...proximo });
      });
      return { estado, unsubscribe };
    },
  };
}

describe('leitura viva - a partilha', () => {
  it('três interessados, uma só leitura', () => {
    const { live, duplo, ouvir } = criarDuplo();

    const primeiro = ouvir('ana');
    const segundo = ouvir('ana');
    const terceiro = ouvir('ana');

    assert.equal(duplo.aberturas, 1, 'a mesma pergunta não pode ser feita três vezes à base de dados');

    primeiro.unsubscribe();
    segundo.unsubscribe();
    assert.equal(duplo.fechos, 0, 'com alguém a ver, a leitura continua aberta');

    terceiro.unsubscribe();
    assert.equal(duplo.fechos, 1, 'o último a sair fecha a leitura');
  });

  it('quem chega depois recebe o que já se sabe, sem esperar pelo servidor', () => {
    const { publicar, ouvir } = criarDuplo();

    const primeiro = ouvir('ana');
    publicar(7);
    const segundo = ouvir('ana');

    assert.equal(primeiro.estado.value, 7);
    assert.equal(segundo.estado.value, 7, 'o segundo interessado não podia começar do zero');
  });

  it('todos os interessados recebem o mesmo valor', () => {
    const { publicar, ouvir } = criarDuplo();

    const primeiro = ouvir('ana');
    const segundo = ouvir('ana');
    publicar(42);

    assert.equal(primeiro.estado.value, 42);
    assert.equal(segundo.estado.value, 42);
  });

  it('fechar a última leitura limpa o que estava à vista', () => {
    const { publicar, ouvir } = criarDuplo();

    const primeiro = ouvir('ana');
    publicar(9);
    primeiro.unsubscribe();

    // Ninguém a ver: a próxima leitura começa do inicial e não do valor antigo (que pode ser de
    // outra conta, ou já não valer).
    const segundo = ouvir('ana');
    assert.equal(segundo.estado.value, 0);
  });

  it('trocar de conta fecha a leitura antiga e recomeça', () => {
    const { publicar, ouvir, duplo } = criarDuplo();

    const ana = ouvir('ana');
    publicar(3);
    const bruno = ouvir('bruno');

    assert.equal(duplo.fechos, 1, 'a leitura da Ana não pode continuar aberta');
    assert.equal(duplo.aberturas, 2);
    assert.equal(duplo.uidDaAbertura, 'bruno');
    assert.equal(ana.estado.value, 0, 'a Ana vê a lista limpar, e não os dados do Bruno');
    assert.equal(bruno.estado.value, 0);
  });
});

describe('leitura viva - o erro é um estado', () => {
  it('uma leitura que falha marca o estado sem apagar o que estava', () => {
    const { publicar, falhar, ouvir } = criarDuplo();

    const interessado = ouvir('ana');
    publicar(5);
    falhar();

    assert.equal(interessado.estado.error, true);
    assert.equal(interessado.estado.value, 5, 'o ecrã mostra o que tinha e diz que a leitura falhou');
  });

  it('uma leitura que volta a correr bem limpa o erro', () => {
    const { publicar, falhar, ouvir } = criarDuplo();

    const interessado = ouvir('ana');
    falhar();
    assert.equal(interessado.estado.error, true);

    publicar(1);
    assert.equal(interessado.estado.error, false);
  });

  it('quem chega depois de uma falha vê o erro que já existe', () => {
    const { falhar, ouvir } = criarDuplo();

    ouvir('ana');
    falhar();
    const atrasado = ouvir('ana');

    assert.equal(atrasado.estado.error, true);
  });

  it('a segunda tentativa fecha e abre de novo, e limpa o erro', () => {
    const { falhar, live, ouvir, duplo } = criarDuplo();

    const interessado = ouvir('ana');
    falhar();

    live.retry();

    // Um `onSnapshot` que falha não volta sozinho: sem fechar e abrir, o erro ficava para sempre.
    assert.equal(duplo.fechos, 1);
    assert.equal(duplo.aberturas, 2);
    assert.equal(interessado.estado.error, false);
  });

  it('sem ninguém a ver, a segunda tentativa não abre nada', () => {
    const { live, duplo } = criarDuplo();

    live.retry();

    assert.equal(duplo.aberturas, 0, 'não há nada a tentar outra vez quando ninguém está a ver');
  });
});
