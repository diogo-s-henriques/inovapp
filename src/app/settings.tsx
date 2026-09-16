import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useAuthStore } from '@/auth/store';
import { deleteAccount, getAuthErrorMessage } from '@/auth/actions';
import { unblockUser } from '@/lib/blocking';
import { fetchBlockedUsers } from '@/lib/matching';
import { goBack } from '@/lib/navigation';
import { openSystemSettings, refreshPushState, setPushEnabled } from '@/push/actions';
import { usePushStore } from '@/push/store';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PasswordModal } from '@/components/ui/PasswordModal';
import { ProfilePicCard } from '@/components/ui/ProfilePicCard';
import { SectionCard } from '@/components/ui/SectionCard';
import { ThemedText } from '@/components/ui/ThemedText';
import { LanguageSwitcher } from '@/components/domain/LanguageSwitcher';
import { StackHeader } from '@/components/domain/StackHeader';
import type { MatchCandidate } from '@/types/match';

/** Contacto mostrado em "Ajuda ou feedback". */
const FEEDBACK_EMAIL = 'diogo.henriques@iseclisboa.pt';
const FEEDBACK_SUBJECT = 'INOVAPP';

// Definições: idioma, pessoas bloqueadas e ajuda. Não tem separador próprio — chega-se por uma
// linha discreta no fim do perfil, porque é sítio para arrumar coisas, não para usar todos os dias.
export default function SettingsScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const permission = usePushStore((state) => state.permission);
  const optedOut = usePushStore((state) => state.optedOut);
  const registered = usePushStore((state) => state.registered);
  const [blockedUsers, setBlockedUsers] = useState<MatchCandidate[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // Apagar a conta são dois passos, porque são duas perguntas: "queres mesmo?" e "és quem dizes
  // que és?" — a segunda é do Firebase, que recusa a operação a uma sessão antiga.
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'password'>('idle');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // O estado que o sistema dá pode ter mudado desde o arranque da app (as definições do telemóvel
  // não passam por aqui) — por isso volta a ler-se ao abrir este ecrã, em vez de se confiar no que
  // o registo do arranque deixou no estado.
  useEffect(() => {
    void refreshPushState();
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    fetchBlockedUsers(user.uid)
      .then((users) => {
        if (!cancelled) setBlockedUsers(users);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const handleUnblock = async (blockedUid: string) => {
    if (!user) return;

    // A linha sai já da lista e só volta se a escrita falhar: desbloquear não é uma operação que
    // valha a pena fazer esperar por um indicador de progresso.
    setBlockedUsers((current) => current?.filter((candidate) => candidate.id !== blockedUid) ?? current);
    try {
      await unblockUser(user.uid, blockedUid);
    } catch {
      setLoadFailed(true);
      setBlockedUsers(await fetchBlockedUsers(user.uid).catch(() => null));
      setLoadFailed(false);
    }
  };

  const handleFeedback = () => {
    Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(FEEDBACK_SUBJECT)}`);
  };

  /**
   * O último passo: a palavra-passe confirma a intenção e, ao mesmo tempo, torna a sessão recente
   * outra vez (é isso que o Firebase exige para apagar uma conta).
   *
   * Não há nada depois do `await`: quando corre bem, a conta deixa de existir, o listener da sessão
   * vê-a desaparecer e a app volta ao ecrã de entrada sozinha. Um erro — palavra-passe errada, quase
   * sempre — fica no próprio modal, que continua aberto a pedir outra vez.
   */
  const handleDeleteAccount = async (password: string) => {
    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteAccount(password);
    } catch (error) {
      setDeleteError(getAuthErrorMessage(error));
      setDeleting(false);
    }
  };

  // Três caminhos, um botão: a permissão recusada só se resolve nas definições do telemóvel (o
  // sistema não volta a perguntar), e nos outros dois o mesmo botão liga ou desliga.
  const pushBlocked = permission === 'denied';
  const pushOn = permission === 'granted' && !optedOut;
  // Permissão dada mas registo que não chegou a acontecer (sem token, ver src/push/actions.ts):
  // dizer "recebes um aviso" aqui era prometer o que não há.
  const pushUnregistered = pushOn && registered === false;

  const pushMessage = pushBlocked
    ? i18n.settings.notificationsBlocked
    : pushUnregistered
      ? i18n.settings.notificationsFailed
      : permission === 'granted'
        ? optedOut
          ? i18n.settings.notificationsOff
          : i18n.settings.notificationsOn
        : i18n.settings.notificationsUndecided;

  const handlePushAction = () => {
    if (pushBlocked) {
      void openSystemSettings();
      return;
    }

    if (user) void setPushEnabled(user.uid, !pushOn);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StackHeader
        title={i18n.settings.title}
        backLabel={i18n.settings.back}
        onBack={() => goBack(router, '/perfil')}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionCard label={i18n.settings.languageLabel}>
          <LanguageSwitcher />
        </SectionCard>

        {/* Sem estado não se mostra nada: `null` é "não se conseguiu saber" (numa build sem o
            módulo nativo dos avisos) e uma secção a dizer "ativar" que não faz nada era pior. */}
        {permission !== null && (
          <SectionCard label={i18n.settings.notificationsLabel}>
            <ThemedText type="body" themeColor="textMuted">
              {pushMessage}
            </ThemedText>
            <Button
              label={
                pushBlocked
                  ? i18n.settings.notificationsOpenSettings
                  : pushOn
                    ? i18n.settings.notificationsDisable
                    : i18n.settings.notificationsEnable
              }
              icon={pushBlocked ? 'settings-outline' : pushOn ? 'notifications-off-outline' : 'notifications-outline'}
              variant="secondary"
              onPress={handlePushAction}
            />
          </SectionCard>
        )}

        <SectionCard label={i18n.settings.blockedLabel}>
          {loadFailed ? (
            <ThemedText type="body" themeColor="danger">
              {i18n.settings.loadError}
            </ThemedText>
          ) : blockedUsers === null ? (
            <ActivityIndicator color={theme.primary} />
          ) : blockedUsers.length === 0 ? (
            <ThemedText type="body" themeColor="textMuted">
              {i18n.settings.blockedEmpty}
            </ThemedText>
          ) : (
            blockedUsers.map((blocked) => (
              <View key={blocked.id} style={styles.blockedRow}>
                <ProfilePicCard
                  firstName={blocked.firstName}
                  lastName={blocked.lastName}
                  image={blocked.image}
                  size="sm"
                />
                <ThemedText type="body" style={styles.blockedName} numberOfLines={1}>
                  {blocked.firstName} {blocked.lastName}
                </ThemedText>
                <Button
                  label={i18n.settings.unblock}
                  variant="link"
                  onPress={() => handleUnblock(blocked.id)}
                />
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard label={i18n.settings.helpLabel}>
          <ThemedText type="body" themeColor="textMuted">
            {i18n.settings.helpDescription}
          </ThemedText>
          <Button
            label={i18n.settings.helpAction}
            icon="mail-outline"
            variant="secondary"
            onPress={handleFeedback}
          />
        </SectionCard>

        {/* Em último, e é onde tem de estar: é a única coisa deste ecrã que não se desfaz, e uma
            ação dessas não se põe ao lado do "Idioma" — quem cá vem mudar a língua não deve
            atravessá-la com o polegar. */}
        <SectionCard label={i18n.settings.accountLabel}>
          <ThemedText type="body" themeColor="textMuted">
            {i18n.settings.deleteAccountDescription}
          </ThemedText>
          <Button
            label={i18n.settings.deleteAccount}
            icon="trash-outline"
            variant="dangerStrong"
            onPress={() => setDeleteStep('confirm')}
          />
        </SectionCard>
      </ScrollView>

      <ConfirmModal
        visible={deleteStep === 'confirm'}
        onRequestClose={() => setDeleteStep('idle')}
        tone="danger"
        title={i18n.settings.deleteAccountConfirmTitle}
        description={i18n.settings.deleteAccountConfirmDescription}
        confirmLabel={i18n.settings.deleteAccountConfirm}
        cancelLabel={i18n.common.cancel}
        onConfirm={() => {
          setDeleteError(null);
          setDeleteStep('password');
        }}
        onCancel={() => setDeleteStep('idle')}
      />

      <PasswordModal
        visible={deleteStep === 'password'}
        // Enquanto a conta está a ser apagada, o modal não se fecha: os dados já estão a meio, e
        // fechar aqui só servia para deixar a operação a correr sem nada a dizer o que se passa.
        onRequestClose={() => !deleting && setDeleteStep('idle')}
        title={i18n.settings.deleteAccountPasswordTitle}
        description={i18n.settings.deleteAccountPasswordDescription}
        passwordLabel={i18n.settings.deleteAccountPasswordLabel}
        confirmLabel={i18n.settings.deleteAccountConfirm}
        workingLabel={i18n.settings.deleteAccountWorking}
        cancelLabel={i18n.common.cancel}
        error={deleteError}
        submitting={deleting}
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteStep('idle')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: Spacing.five,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
    paddingBottom: 120,
  },
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  blockedName: {
    flex: 1,
  },
});
