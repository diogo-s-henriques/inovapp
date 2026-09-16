/**
 * Testes do que acontece quando o módulo nativo do App Check **não existe** na build.
 *
 * Não é um caso teórico: uma build anterior à entrada deste pacote no projeto não o tem, e o Expo Go
 * não traz módulos nativos desta natureza. É o mesmo caminho que já apanhou o `expo-observe` (ver
 * observe-fallback.test.tsx), e a lição é a mesma: um serviço de segurança que não está disponível
 * não pode custar a app que devia proteger.
 *
 * A fábrica do `jest.mock` **lança**, de propósito: é a forma de reproduzir a falha do módulo
 * nativo sem uma build a sério pelo meio.
 */
jest.mock('@react-native-firebase/app-check', () => {
  throw new Error("Cannot find native module 'NativeRNFBTurboAppCheck'");
});

jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({ name: '[DEFAULT]' })) }));

// O SDK JavaScript do App Check não traz módulo nativo nenhum, mas aqui não é preciso carregá-lo.
jest.mock('firebase/app-check', () => ({ initializeAppCheck: jest.fn(), CustomProvider: class {} }));

import type { FirebaseApp } from 'firebase/app';

import { activateAppCheck } from '@/lib/app-check';

beforeEach(() => {
  // O aviso da consola é do desenvolvimento; aqui só fazia ruído.
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('sem módulo nativo do App Check', () => {
  it('ativação não faz nada e não rebenta', () => {
    expect(activateAppCheck({ name: 'inovapp' } as unknown as FirebaseApp)).toBeNull();
  });
});
