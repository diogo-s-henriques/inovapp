/**
 * Testes de `src/lib/auth-gate.ts` - que ecrãs a app mostra.
 *
 * Estes quatro ecrãs excluem-se uns aos outros, e uma guarda trocada não dá erro nenhum: dá um
 * ecrã errado. Dois casos aqui valem mais do que os outros: **quem não confirmou o email não pode
 * chegar ao perfil** (é o que impede alguém de se registar com o email de outra pessoa e escrever
 * um perfil com o nome dela) e **quem ainda não tem resposta sobre o perfil continua a carregar**
 * (mostrar a configuração de perfil a quem já a tem, ou a app a quem não tem, é mostrar o ecrã
 * errado por um instante).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { authStage } from '@/lib/auth-gate';
import type { AppUser } from '@/types/auth';

const SEM_SESSAO = { initializing: false, user: null, profileCompleted: null };

const CONFIRMADO: AppUser = { uid: 'u1', email: 'aluno@alunos.iseclisboa.pt', emailVerified: true };
const POR_CONFIRMAR: AppUser = { ...CONFIRMADO, emailVerified: false };

describe('authStage - que ecrãs a app mostra', () => {
  it('enquanto o Firebase não disse se há sessão, não se mostra nada', () => {
    assert.equal(authStage({ ...SEM_SESSAO, initializing: true }), 'loading');
  });

  it('sem sessão, mostra os ecrãs de entrada', () => {
    assert.equal(authStage(SEM_SESSAO), 'signed-out');
  });

  it('com sessão mas sem resposta sobre o perfil, continua a carregar', () => {
    // Uma subscrição ao perfil que ainda não respondeu não é um perfil a menos.
    assert.equal(authStage({ initializing: false, user: CONFIRMADO, profileCompleted: null }), 'loading');
  });

  it('com o email por confirmar, o ecrã é o da confirmação - mesmo com o perfil já completo', () => {
    assert.equal(authStage({ initializing: false, user: POR_CONFIRMAR, profileCompleted: true }), 'verify-email');
  });

  it('com o email por confirmar e sem perfil, o ecrã continua a ser o da confirmação', () => {
    // A ordem importa: se o perfil fosse primeiro, quem se registou com o email de outra pessoa
    // escrevia um perfil antes de provar que aquele email é seu.
    assert.equal(authStage({ initializing: false, user: POR_CONFIRMAR, profileCompleted: false }), 'verify-email');
  });

  it('confirmado mas com o perfil por preencher, o ecrã é o da configuração', () => {
    assert.equal(authStage({ initializing: false, user: CONFIRMADO, profileCompleted: false }), 'profile-setup');
  });

  it('confirmado e com perfil, a app', () => {
    assert.equal(authStage({ initializing: false, user: CONFIRMADO, profileCompleted: true }), 'app');
  });

  it('o ecrã da confirmação não espera pela leitura do perfil', () => {
    // O caso que trava o arranque: se o `verify-email` viesse depois da leitura do perfil, e uma
    // leitura falhada deixasse o `profileCompleted` a `null`, a app ficava presa no splash para
    // sempre - o próprio ecrã que explica o que fazer nunca chegava a aparecer. Saber se o email
    // está confirmado não precisa do Firestore: vem do token.
    assert.equal(authStage({ initializing: false, user: POR_CONFIRMAR, profileCompleted: null }), 'verify-email');
  });
});
