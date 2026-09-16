/**
 * Testes do **plano** de eliminação de conta (`src/lib/account.ts`).
 *
 * Aqui não se apaga nada: a eliminação a sério - com as regras pelo meio - é exercitada contra os
 * emuladores em `tests/data/account.test.mts`. O que se fixa neste ficheiro é a parte que se
 * estraga em silêncio, porque não falha: uma coleção que ficou de fora da lista, um dos sentidos de
 * um pedido que ninguém se lembrou de procurar, a ordem dos documentos do dono trocada.
 *
 * É por isso que a lista das coleções partilhadas é **dados** (uma constante exportada) e não uma
 * série de `getDocs` espalhados por dentro da função: um plano que se pode ler é um plano que se
 * pode testar.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DELETION_BATCH_SIZE,
  SHARED_ACCOUNT_QUERIES,
  ownedCollectionPaths,
  ownedDocumentPaths,
} from '@/lib/account';

const UID = 'utilizador-1';

/** Os sentidos em que uma coleção é procurada (ex.: `from` e `to` nos pedidos). */
function camposDe(path: string): string[] {
  return SHARED_ACCOUNT_QUERIES.filter((query) => query.path === path)
    .map((query) => query.field)
    .sort();
}

describe('SHARED_ACCOUNT_QUERIES - onde a conta aparece junto de outras pessoas', () => {
  it('procura os pedidos de conexão nos dois sentidos', () => {
    // Um só sentido deixava metade deles: os documentos são `from` → `to`, e quem apaga a conta
    // tanto pode ser quem pediu como quem foi pedido.
    assert.deepEqual(camposDe('connectionRequests'), ['from', 'to']);
  });

  it('procura os pedidos de sessão nos dois sentidos', () => {
    assert.deepEqual(camposDe('sessionRequests'), ['from', 'to']);
  });

  it('encontra as sessões por pertença à lista de participantes', () => {
    // As sessões não têm `from`/`to` como os pedidos: o que as identifica é a lista
    // `participants`, e é por ela que as regras as deixam ler.
    assert.deepEqual(SHARED_ACCOUNT_QUERIES.filter((query) => query.path === 'sessions'), [
      { path: 'sessions', field: 'participants', mode: 'contains' },
    ]);
  });

  it('encontra as conversas por pertença à lista de participantes', () => {
    assert.deepEqual(SHARED_ACCOUNT_QUERIES.filter((query) => query.path === 'conversations'), [
      { path: 'conversations', field: 'participants', mode: 'contains' },
    ]);
  });

  it('não repete a mesma coleção e campo', () => {
    const chaves = SHARED_ACCOUNT_QUERIES.map((query) => `${query.path}.${query.field}`);
    assert.equal(new Set(chaves).size, chaves.length, 'há uma consulta repetida no plano');
  });

  it('não leva as avaliações - o anonimato depende de não se poder apagá-las', () => {
    // Uma avaliação vive em `ratings/{sessionId}`, tem só a nota e o mentor, e não guarda quem a
    // escreveu. Levá-la atrás da conta era dar a um mentor a possibilidade de apagar as notas más
    // que recebeu - e nenhuma regra conseguiria distinguir um caso do outro.
    assert.equal(SHARED_ACCOUNT_QUERIES.some((query) => query.path === 'ratings'), false);
  });
});

describe('documentos do dono', () => {
  it('varre a subcoleção dos registos de avisos por inteiro', () => {
    // Um token por dispositivo, com um ID que não se sabe de antemão: não há aqui um documento
    // único para apagar, é a subcoleção toda.
    assert.deepEqual(ownedCollectionPaths(UID), [`users/${UID}/devices`]);
  });

  it('apaga o perfil em último', () => {
    // Se a operação parar a meio, o que fica é uma conta a que faltam dados - e não uma app que não
    // sabe o que mostrar, porque é do perfil que vem o `profileCompleted`.
    const caminhos = ownedDocumentPaths(UID);
    assert.equal(caminhos.at(-1), `users/${UID}`);
    assert.deepEqual(caminhos, [`userAccounts/${UID}`, `users/${UID}`]);
  });

  it('não apaga o perfil de outra pessoa', () => {
    assert.equal(ownedDocumentPaths(UID).some((caminho) => caminho.includes('outro-uid')), false);
  });
});

describe('lotes de eliminação', () => {
  it('fica abaixo do limite de um writeBatch', () => {
    // O limite do Firestore são 500 operações por lote, e um `delete` conta como uma.
    assert.ok(DELETION_BATCH_SIZE > 0 && DELETION_BATCH_SIZE <= 500, `${DELETION_BATCH_SIZE} não cabe num lote`);
  });
});
