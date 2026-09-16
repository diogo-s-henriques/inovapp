/**
 * Testes de `src/lib/auth-gate.ts` - que ecrãs a app mostra.
 *
 * Estes ecrãs excluem-se uns aos outros, e uma guarda trocada não dá erro nenhum: dá um ecrã
 * errado. Dois casos aqui valem mais do que os outros: **quem não confirmou o email não pode
 * chegar ao perfil** (é o que impede alguém de se registar com o email de outra pessoa e escrever
 * um perfil com o nome dela) e **quem ainda não tem resposta sobre o perfil não vê o ecrã errado**
 * (mostrar a configuração de perfil a quem já a tem, ou a app a quem não tem, é mostrar o ecrã
 * errado por um instante).
 *
 * A espera pelo perfil tem dois nomes, e é isso que os primeiros testes fixam. No **arranque** ela
 * é `loading` - não há ecrã nenhum para mostrar, e é o splash que tapa tudo. Depois de um
 * **"Entrar"** ela é `signing-in`, e o ecrã de entrada mantém-se: foi por esta espera não ter nome
 * próprio que a app desmontava a navegação toda naquele intervalo, apagava o ecrã de entrada e
 * mostrava um vazio até a Home existir (ver o comentário longo em src/lib/auth-gate.ts).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { authStage } from '@/lib/auth-gate';
import type { AppUser } from '@/types/auth';

/** A app ainda não mostrou ecrã nenhum: estamos no arranque. */
const ARRANQUE = { bootstrapped: false };
/** A app já está a correr: qualquer espera a partir daqui tem um ecrã à frente. */
const A_CORRER = { bootstrapped: true };

const SEM_SESSAO = { initializing: false, user: null, profileCompleted: null, ...A_CORRER };

const CONFIRMADO: AppUser = { uid: 'u1', email: 'aluno@alunos.iseclisboa.pt', emailVerified: true };
const POR_CONFIRMAR: AppUser = { ...CONFIRMADO, emailVerified: false };

describe('authStage - que ecrãs a app mostra', () => {
  it('enquanto o Firebase não disse se há sessão, não se mostra nada', () => {
    assert.equal(authStage({ ...SEM_SESSAO, initializing: true }), 'loading');
  });

  it('sem sessão, mostra os ecrãs de entrada', () => {
    assert.equal(authStage(SEM_SESSAO), 'signed-out');
  });

  it('no arranque, uma sessão sem resposta sobre o perfil continua a carregar', () => {
    // Uma subscrição ao perfil que ainda não respondeu não é um perfil a menos - e no arranque
    // ninguém tem nada para ver: quem está à espera é o splash.
    assert.equal(
      authStage({ initializing: false, user: CONFIRMADO, profileCompleted: null, ...ARRANQUE }),
      'loading',
    );
  });

  it('depois de um "Entrar", a mesma espera acontece no ecrã de entrada', () => {
    // O que mudou para isto existir: a app já mostrou o formulário, e é ele que tem de ficar - não
    // um ecrã vazio - até a Home poder aparecer.
    assert.equal(
      authStage({ initializing: false, user: CONFIRMADO, profileCompleted: null, ...A_CORRER }),
      'signing-in',
    );
  });

  it('com o email por confirmar, o ecrã é o da confirmação - mesmo com o perfil já completo', () => {
    assert.equal(authStage({ initializing: false, user: POR_CONFIRMAR, profileCompleted: true, ...A_CORRER }), 'verify-email');
  });

  it('com o email por confirmar e sem perfil, o ecrã continua a ser o da confirmação', () => {
    // A ordem importa: se o perfil fosse primeiro, quem se registou com o email de outra pessoa
    // escrevia um perfil antes de provar que aquele email é seu.
    assert.equal(authStage({ initializing: false, user: POR_CONFIRMAR, profileCompleted: false, ...A_CORRER }), 'verify-email');
  });

  it('a confirmação do email vem antes da espera pelo perfil - também a seguir a um "Entrar"', () => {
    // O `signing-in` é o **último** recurso da espera. Se fosse avaliado antes disto, quem entrasse
    // com um email por confirmar ficava no formulário em vez de ir ao ecrã que explica o que fazer.
    assert.equal(
      authStage({ initializing: false, user: POR_CONFIRMAR, profileCompleted: null, ...A_CORRER }),
      'verify-email',
    );
  });

  it('confirmado mas com o perfil por preencher, o ecrã é o da configuração', () => {
    assert.equal(authStage({ initializing: false, user: CONFIRMADO, profileCompleted: false, ...A_CORRER }), 'profile-setup');
  });

  it('confirmado e com perfil, a app', () => {
    assert.equal(authStage({ initializing: false, user: CONFIRMADO, profileCompleted: true, ...A_CORRER }), 'app');
  });

  it('o ecrã da confirmação não espera pela leitura do perfil', () => {
    // O caso que trava o arranque: se o `verify-email` viesse depois da leitura do perfil, e uma
    // leitura falhada deixasse o `profileCompleted` a `null`, a app ficava presa no splash para
    // sempre - o próprio ecrã que explica o que fazer nunca chegava a aparecer. Saber se o email
    // está confirmado não precisa do Firestore: vem do token.
    assert.equal(
      authStage({ initializing: false, user: POR_CONFIRMAR, profileCompleted: null, ...ARRANQUE }),
      'verify-email',
    );
  });

  it('sair da conta volta aos ecrãs de entrada, e não a uma espera', () => {
    assert.equal(authStage({ initializing: false, user: null, profileCompleted: null, ...A_CORRER }), 'signed-out');
  });
});
