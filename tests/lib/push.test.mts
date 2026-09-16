/**
 * Testes de `src/lib/push.ts` — a decisão de registo do dispositivo para notificações.
 *
 * O que aqui se prova não é o envio dos avisos (isso é do lado das Cloud Functions, ainda por
 * fazer), mas a parte que se pode estragar em silêncio:
 *
 * 1. **A decisão.** Desligado nas Definições, permissão recusada e token novo caem todos em
 *    caminhos diferentes, e o pior erro possível aqui é deixar um token registado para alguém que
 *    já não quer avisos.
 * 2. **Onde o token é escrito.** `users/{uid}` é legível por qualquer utilizador autenticado; o
 *    registo tem de ir para a subcoleção privada, e é o caminho da escrita que o garante.
 *
 * Não há telemóvel nem rede: `tests/doubles/firebase-firestore.mjs` regista as escritas e
 * `tests/doubles/async-storage.mjs` guarda o que fica no dispositivo.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import {
  fetchRegisteredToken,
  forgetDevice,
  getInstallationId,
  getPushOptOut,
  registerDevice,
  registrationAction,
  setPushOptOut,
} from '@/lib/push';
import AsyncStorage from '../doubles/async-storage.mjs';
import { __reset as resetFirestore, __setSnapshot, firestoreCalls } from '../doubles/firebase-firestore.mjs';

const UID = 'aluno-1';

beforeEach(() => {
  resetFirestore();
  AsyncStorage.__reset();
});

describe('registrationAction — o que fazer com o registo deste dispositivo', () => {
  it('regista quando a permissão foi dada e ainda não há token escrito', () => {
    assert.equal(
      registrationAction({ permission: 'granted', token: 'token-novo', storedToken: null, optedOut: false }),
      'register',
    );
  });

  it('regista quando o token mudou', () => {
    // A Expo emite um token novo de tempos a tempos; se este caso deixasse de escrever, os avisos
    // iam para o token velho e a pessoa deixava de os receber sem nada o dizer.
    assert.equal(
      registrationAction({
        permission: 'granted',
        token: 'token-novo',
        storedToken: 'token-velho',
        optedOut: false,
      }),
      'register',
    );
  });

  it('não escreve nada quando o token é o mesmo que já está registado', () => {
    // Uma escrita em cada arranque da app para não mudar nada é uma escrita a mais por
    // utilizador por arranque.
    assert.equal(
      registrationAction({
        permission: 'granted',
        token: 'token-igual',
        storedToken: 'token-igual',
        optedOut: false,
      }),
      'idle',
    );
  });

  it('não faz nada enquanto a permissão estiver por decidir', () => {
    assert.equal(
      registrationAction({ permission: 'undetermined', token: null, storedToken: null, optedOut: false }),
      'idle',
    );
  });

  it('apaga o registo quando a permissão é recusada', () => {
    // Recusar os avisos no sistema tira validade ao que estava escrito: deixá-lo lá era continuar
    // a enviar para um telemóvel que os recusa.
    assert.equal(
      registrationAction({ permission: 'denied', token: null, storedToken: 'token-antigo', optedOut: false }),
      'forget',
    );
  });

  it('apaga o registo quando a pessoa desliga os avisos nas Definições', () => {
    assert.equal(
      registrationAction({
        permission: 'granted',
        token: 'token-atual',
        storedToken: 'token-atual',
        optedOut: true,
      }),
      'forget',
    );
  });

  it('não apaga nada se já não houver registo', () => {
    assert.equal(
      registrationAction({ permission: 'denied', token: null, storedToken: null, optedOut: true }),
      'idle',
    );
  });

  it('não regista só porque há permissão: sem token não há para onde enviar', () => {
    // O caminho real disto: o `getExpoPushTokenAsync` falhou (credenciais FCM em falta, por
    // exemplo). Escrever aqui vazio deixava um documento sem token nenhum.
    assert.equal(
      registrationAction({ permission: 'granted', token: null, storedToken: null, optedOut: false }),
      'idle',
    );
  });
});

describe('getInstallationId — um dispositivo, um registo', () => {
  it('cria um identificador na primeira chamada e mantém-no depois', async () => {
    const primeiro = await getInstallationId();
    assert.match(primeiro, /^[a-z0-9]+$/);
    assert.equal(await getInstallationId(), primeiro);
  });

  it('sobrevive a uma nova leitura do dispositivo (é o que dispensa um documento por token)', async () => {
    const primeiro = await getInstallationId();
    // Mesma app, arranque seguinte: o valor tem de vir do dispositivo, não ser gerado outra vez —
    // senão cada arranque criava um documento novo e o antigo ficava a receber avisos.
    const entradas = AsyncStorage.__entries();
    assert.equal(entradas.length, 1);
    assert.equal(entradas[0][1], primeiro);
  });
});

describe('o registo do dispositivo no Firestore', () => {
  it('escreve em users/{uid}/devices/{id} e NUNCA no documento do perfil', async () => {
    await registerDevice(UID, 'dispositivo-1', 'ExponentPushToken[abc]', 'android');

    assert.equal(firestoreCalls.setDoc.length, 1);
    const [escrita] = firestoreCalls.setDoc;
    // O documento do perfil é legível por qualquer utilizador autenticado: um token lá dentro era
    // um token que qualquer pessoa podia usar para mandar avisos em nome da app.
    assert.equal(escrita.path, `users/${UID}/devices/dispositivo-1`);
    assert.notEqual(escrita.path, `users/${UID}`);
  });

  it('guarda o token, a plataforma e de quem é', async () => {
    await registerDevice(UID, 'dispositivo-1', 'ExponentPushToken[abc]', 'ios');

    const [escrita] = firestoreCalls.setDoc;
    assert.equal(escrita.data.token, 'ExponentPushToken[abc]');
    assert.equal(escrita.data.platform, 'ios');
    assert.equal(escrita.data.userId, UID);
    assert.ok(escrita.data.updatedAt, 'a marca de tempo diz quando aquele token foi visto');
  });

  it('lê o token já registado', async () => {
    __setSnapshot({ exists: () => true, data: () => ({ token: 'token-guardado' }) });
    assert.equal(await fetchRegisteredToken(UID, 'dispositivo-1'), 'token-guardado');
    assert.equal(firestoreCalls.getDoc[0], `users/${UID}/devices/dispositivo-1`);
  });

  it('devolve null quando não há registo', async () => {
    __setSnapshot({ exists: () => false, data: () => undefined });
    assert.equal(await fetchRegisteredToken(UID, 'dispositivo-1'), null);
  });

  it('devolve null quando o documento existe mas sem token utilizável', async () => {
    // Documento antigo ou corrompido: sem isto, o valor ia parar a `storedToken` e a decisão
    // comparava com um objeto em vez de com uma string.
    __setSnapshot({ exists: () => true, data: () => ({ token: 42 }) });
    assert.equal(await fetchRegisteredToken(UID, 'dispositivo-1'), null);
  });

  it('apaga exatamente o registo deste dispositivo', async () => {
    await forgetDevice(UID, 'dispositivo-1');

    assert.deepEqual(firestoreCalls.deleteDoc, [`users/${UID}/devices/dispositivo-1`]);
    // Nunca o documento do perfil: apagar o registo não pode levar o perfil atrás.
    assert.equal(firestoreCalls.setDoc.length, 0);
  });
});

describe('o "não quero avisos" fica no dispositivo', () => {
  it('começa desligado', async () => {
    assert.equal(await getPushOptOut(), false);
  });

  it('guarda e esquece a decisão', async () => {
    await setPushOptOut(true);
    assert.equal(await getPushOptOut(), true);

    await setPushOptOut(false);
    assert.equal(await getPushOptOut(), false);
  });
});
