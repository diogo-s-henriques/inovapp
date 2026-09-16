/**
 * Testes do `reportError` - a costura entre a app e o serviço de erros (EAS Observe).
 *
 * O que se fixa é que um erro apanhado **chega mesmo** ao serviço e chega identificável: o dashboard
 * agrupa os erros pela mensagem, por isso o contexto (o sítio de onde veio) tem de ir à frente -
 * sem ele, o mesmo `TypeError` vindo de dois ecrãs era uma linha só, e o número de pessoas afectadas
 * contava duas coisas diferentes como se fossem uma.
 *
 * Vivem em `tests/components/` e não em `tests/lib/`: precisam do `jest.mock`, e o `expo-observe` é
 * um módulo nativo (não carrega fora da app). Não renderizam nada - é o único sítio onde este
 * ficheiro podia estar, dado o `testMatch` do Jest.
 */
jest.mock('expo-observe', () => ({ Observe: { reportError: jest.fn() } }));

import { Observe } from 'expo-observe';

import { reportError } from '@/lib/error-reporting';

const enviados = () => (Observe.reportError as jest.Mock).mock.calls;
const ultimoEnviado = (): Error => enviados().at(-1)?.[0] as Error;

beforeEach(() => {
  (Observe.reportError as jest.Mock).mockClear();
  // O aviso da consola é do desenvolvimento; aqui só fazia ruído.
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('reportError', () => {
  it('manda o erro para o serviço, uma vez por erro', () => {
    reportError(new Error('falhou a ler'), 'chat');

    expect(enviados()).toHaveLength(1);
  });

  it('põe o contexto à frente da mensagem', () => {
    reportError(new Error('falhou a ler'), 'chat');

    expect(ultimoEnviado().message).toBe('[chat] falhou a ler');
  });

  it('guarda a stack original, para o dashboard a mapear ao código', () => {
    const original = new Error('falhou a ler');
    reportError(original, 'chat');

    expect(ultimoEnviado().stack).toBe(original.stack);
  });

  it('não mexe no erro que lhe foi dado', () => {
    const original = new Error('falhou a ler');
    const stackAntes = original.stack;

    reportError(original, 'chat');

    expect(original.message).toBe('falhou a ler');
    expect(original.stack).toBe(stackAntes);
  });

  it('aceita um valor que não é Error (`throw \"x\"`)', () => {
    reportError('rebentou', 'sessões');

    expect(ultimoEnviado()).toBeInstanceOf(Error);
    expect(ultimoEnviado().message).toBe('[sessões] rebentou');
  });
});
