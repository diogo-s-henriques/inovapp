/**
 * Testes de `ConnectionRequestsSection` - a lista onde os pedidos de conexão se aceitam/recusam.
 *
 * A lista tem dois anfitriões: a aba dos Matches e o ecrã `connection-requests` (que existe para a
 * linha da Home e o aviso das Notificações deixarem de dar para uma aba, onde não há gesto de
 * voltar). O que aqui se fixa é a ligação entre cada botão e a decisão que ele representa - trocar
 * os dois (aceitar a recusar) seria um erro silencioso e caro, porque fecha pedidos que a pessoa
 * queria aceitar e abre conversas que ninguém pediu - e que o anfitrião pode calar a etiqueta da
 * secção quando o próprio ecrã já tem título (`showHeader`), sem perder os cartões.
 */
import { fireEvent, render } from '@testing-library/react-native';

import { ConnectionRequestsSection } from '@/components/domain/ConnectionRequestsSection';
import { pt } from '@/i18n/pt';
import { useLocaleStore } from '@/i18n/store';
import type { ConnectionRequest } from '@/lib/requests';

function pedido(fromUid: string, firstName: string, id: string): ConnectionRequest {
  return {
    id,
    fromUid,
    candidate: {
      id: fromUid,
      firstName,
      lastName: 'Aluna',
      role: pt.roles.tutee,
      course: 'Licenciatura em Engenharia',
      year: '2º ano',
      subjects: [],
      availability: '',
      availabilityPeriods: [],
      availabilityModality: [],
      description: '',
      sessionsGiven: 0,
      responseTime: '',
    },
    createdAt: new Date('2026-09-14T15:00:00Z'),
  };
}

const ANA = pedido('ana', 'Ana', 'ana_bruno');
const CARLA = pedido('carla', 'Carla', 'carla_bruno');

beforeEach(() => {
  useLocaleStore.getState().setLocale('pt');
});

describe('lista de pedidos de conexão', () => {
  it('sem pedidos não desenha nada', async () => {
    const { toJSON } = await render(
      <ConnectionRequestsSection requests={[]} onAccept={jest.fn()} onDecline={jest.fn()} />,
    );

    expect(toJSON()).toBeNull();
  });

  it('mostra quem pediu, com o papel e o curso, e quantos pedidos há', async () => {
    const { getByText } = await render(
      <ConnectionRequestsSection requests={[ANA]} onAccept={jest.fn()} onDecline={jest.fn()} />,
    );

    expect(getByText(pt.requests.connectionLabel)).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
    expect(getByText('Ana Aluna')).toBeTruthy();
    expect(getByText(`${pt.roles.tutee} · Licenciatura em Engenharia`)).toBeTruthy();
  });

  it('com showHeader=false cala a etiqueta, mas não os pedidos', async () => {
    const { queryByText, getByText, getByLabelText } = await render(
      <ConnectionRequestsSection requests={[ANA]} showHeader={false} onAccept={jest.fn()} onDecline={jest.fn()} />,
    );

    expect(queryByText(pt.requests.connectionLabel)).toBeNull();
    expect(getByText('Ana Aluna')).toBeTruthy();
    expect(getByLabelText(pt.requestCard.accept)).toBeTruthy();
  });
});

describe('decidir um pedido', () => {
  it('aceitar responde ao pedido que está naquele cartão', async () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    const { getByLabelText } = await render(
      <ConnectionRequestsSection requests={[ANA]} onAccept={onAccept} onDecline={onDecline} />,
    );

    await fireEvent.press(getByLabelText(pt.requestCard.accept));

    expect(onAccept).toHaveBeenCalledWith(ANA);
    expect(onDecline).not.toHaveBeenCalled();
  });

  it('recusar responde ao pedido que está naquele cartão', async () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    const { getByLabelText } = await render(
      <ConnectionRequestsSection requests={[ANA]} onAccept={onAccept} onDecline={onDecline} />,
    );

    await fireEvent.press(getByLabelText(pt.requestCard.decline));

    expect(onDecline).toHaveBeenCalledWith(ANA);
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('com dois pedidos, cada cartão decide o seu', async () => {
    const onAccept = jest.fn();
    const { getAllByLabelText, getByText } = await render(
      <ConnectionRequestsSection requests={[ANA, CARLA]} onAccept={onAccept} onDecline={jest.fn()} />,
    );

    expect(getByText('2')).toBeTruthy();

    // O segundo botão "Aceitar" pertence ao segundo cartão - é o que garante que a lista não
    // está a responder sempre ao mesmo pedido.
    await fireEvent.press(getAllByLabelText(pt.requestCard.accept)[1]);

    expect(onAccept).toHaveBeenCalledWith(CARLA);
  });

  it('enquanto um pedido está a ser respondido, os botões dele não disparam', async () => {
    const onAccept = jest.fn();
    const { getByLabelText } = await render(
      <ConnectionRequestsSection requests={[ANA]} busyId={ANA.id} onAccept={onAccept} onDecline={jest.fn()} />,
    );

    await fireEvent.press(getByLabelText(pt.requestCard.accept));

    expect(onAccept).not.toHaveBeenCalled();
  });

  it('mostra a mensagem de erro quando responder falhou', async () => {
    const { getByText } = await render(
      <ConnectionRequestsSection
        requests={[ANA]}
        errorMessage={pt.requests.respondError}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
      />,
    );

    expect(getByText(pt.requests.respondError)).toBeTruthy();
  });
});
