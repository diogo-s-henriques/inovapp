/**
 * Testes de `PasswordModal` — a confirmação por palavra-passe que precede apagar a conta.
 *
 * É a última coisa que a pessoa vê antes de uma operação irreversível, e por isso o que aqui se
 * fixa são as três guardas que a tornam difícil de fazer por engano: não se confirma com o campo
 * vazio, o botão diz o que está a acontecer enquanto corre, e fechar esquece a palavra-passe que
 * ficou escrita.
 */
import { fireEvent, render } from '@testing-library/react-native';

import { PasswordModal } from '@/components/ui/PasswordModal';
import { pt } from '@/i18n/pt';
import { useLocaleStore } from '@/i18n/store';

beforeEach(() => {
  useLocaleStore.getState().setLocale('pt');
});

const PROPS = {
  title: pt.settings.deleteAccountPasswordTitle,
  description: pt.settings.deleteAccountPasswordDescription,
  passwordLabel: pt.settings.deleteAccountPasswordLabel,
  confirmLabel: pt.settings.deleteAccountConfirm,
  workingLabel: pt.settings.deleteAccountWorking,
  cancelLabel: pt.common.cancel,
};

describe('<PasswordModal />', () => {
  it('não deixa confirmar com o campo vazio', async () => {
    const onConfirm = jest.fn();
    const { getByLabelText } = await render(
      <PasswordModal {...PROPS} visible onConfirm={onConfirm} onCancel={jest.fn()} />,
    );

    await fireEvent.press(getByLabelText(pt.settings.deleteAccountConfirm));

    expect(getByLabelText(pt.settings.deleteAccountConfirm)).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('devolve a palavra-passe escrita, e só quando se confirma', async () => {
    const onConfirm = jest.fn();
    const { getByLabelText } = await render(
      <PasswordModal {...PROPS} visible onConfirm={onConfirm} onCancel={jest.fn()} />,
    );

    await fireEvent.changeText(getByLabelText(pt.settings.deleteAccountPasswordLabel), 'Segredo1!');
    expect(onConfirm).not.toHaveBeenCalled();

    await fireEvent.press(getByLabelText(pt.settings.deleteAccountConfirm));
    expect(onConfirm).toHaveBeenCalledWith('Segredo1!');
  });

  it('mostra o erro da tentativa anterior', async () => {
    const { getByText } = await render(
      <PasswordModal
        {...PROPS}
        visible
        error={pt.auth.errorWrongCredentials}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(getByText(pt.auth.errorWrongCredentials)).toBeOnTheScreen();
  });

  it('enquanto corre, o botão diz o que está a acontecer e não se carrega duas vezes', async () => {
    const onConfirm = jest.fn();
    const { getByLabelText, getByText, queryByText } = await render(
      <PasswordModal {...PROPS} visible submitting onConfirm={onConfirm} onCancel={jest.fn()} />,
    );

    // Duas escritas seguidas da mesma palavra-passe chegariam a apagar duas vezes o que é de um só:
    // o botão fica ocupado e o nome dele muda, para o silêncio não parecer que não fez nada.
    expect(getByText(pt.settings.deleteAccountWorking)).toBeOnTheScreen();
    expect(queryByText(pt.settings.deleteAccountConfirm)).toBeNull();

    await fireEvent.press(getByLabelText(pt.settings.deleteAccountWorking));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('fechar esquece a palavra-passe escrita', async () => {
    const onCancel = jest.fn();
    const { getByLabelText, rerender } = await render(
      <PasswordModal {...PROPS} visible onConfirm={jest.fn()} onCancel={onCancel} />,
    );

    await fireEvent.changeText(getByLabelText(pt.settings.deleteAccountPasswordLabel), 'Segredo1!');
    await fireEvent.press(getByLabelText(pt.common.cancel));

    expect(onCancel).toHaveBeenCalled();

    // A palavra-passe é escrita, usada e esquecida: reabrir o modal não a traz de volta.
    await rerender(
      <PasswordModal {...PROPS} visible={false} onConfirm={jest.fn()} onCancel={onCancel} />,
    );
    await rerender(
      <PasswordModal {...PROPS} visible onConfirm={jest.fn()} onCancel={onCancel} />,
    );

    expect(getByLabelText(pt.settings.deleteAccountPasswordLabel).props.value).toBe('');
  });
});
