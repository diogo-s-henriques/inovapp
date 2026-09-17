import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { formatCourseAndYear } from '@/constants/profile';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/auth/store';
import { getInitials } from '@/lib/initials';
import { greetingLabel, greetingPeriod } from '@/lib/home';
import { roleLabel } from '@/lib/roles';
import { subscribeToSessionStats } from '@/lib/sessions';
import type { SessionStats } from '@/lib/sessions';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { HeroActionButton } from '@/components/ui/HeroActionButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { ThemedText } from '@/components/ui/ThemedText';
import { ScreenHero } from '@/components/domain/ScreenHero';
import { StatsRow } from '@/components/domain/StatsRow';
import { EditButton } from '@/components/domain/Profile/EditButton';
import { TagList } from '@/components/domain/Profile/TagList';
import { signOutUser } from '@/auth/actions';

/** Antes de a subscrição responder, e no caso raro de ela falhar, os números são zero - que é a
 * verdade para quem ainda não tem sessões. */
const NO_SESSIONS: SessionStats = { given: 0, received: 0, upcoming: 0 };

/**
 * Perfil do próprio utilizador.
 *
 * O ecrã foi apertado para caber sem deslizar num telemóvel normal: a identidade em cima, os três
 * números, os interesses e o "sobre", e as duas únicas ações (editar, no cabeçalho; sair, no fim)
 * separadas do resto. Saiu daqui a secção da disponibilidade - é a única informação que se repete
 * na marcação de sessões, e era a que fazia o ecrã passar de uma altura de ecrã.
 */
export default function ProfileScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<SessionStats>(NO_SESSIONS);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  // Os números do perfil. Antes eram zeros escritos no código - a caixa dizia "0" mesmo a quem já
  // tinha dado aulas. Agora contam-se, e `subscribeToSessionStats` não resolve perfis de ninguém
  // (ao contrário da agenda) para isto custar uma leitura só.
  useEffect(() => {
    if (!user) return;
    return subscribeToSessionStats(user.uid, setStats);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  if (!profile) return null;

  const isProfessor = profile.role === 'professor';
  // "INTERESSES" é o que a pessoa quer aprender, não o que ensina - o que ensina já vive na
  // descoberta (é o que a faz aparecer nos Matches e na pesquisa) e é lá que faz sentido.
  // Um professor não tem este campo (não o edita - ver profile-edit.tsx), por isso a secção
  // desaparece em vez de ficar com uma etiqueta e nada por baixo.
  const interests = isProfessor ? [] : profile.learningSubjects;
  // A saudação da Home, aqui também: o bloco é o mesmo e a linha de cima é a mesma - ver
  // `greetingLabel` em src/lib/home.ts.
  const greeting = greetingLabel(greetingPeriod(new Date()), i18n);
  // A segunda linha do bloco: o **papel** para um professor ("Tutor" - em src/lib/roles.ts um
  // professor nunca é "Mentor") e o **curso com o ano** para um aluno.
  //
  // Foi ao contrário - a linha era sempre o curso, e um professor lia "Docente ISEC Lisboa" -, e a
  // troca não é só de palavras: o papel é uma palavra fixa (cabe numa linha, nunca trunca) e é o
  // que a Home mostra por baixo do mesmo nome. Duas linhas diferentes para a mesma pessoa no mesmo
  // cabeçalho é que não. O curso de um aluno fica, esse é escolhido por quem o tem e muda de pessoa
  // para pessoa - e o "Editar" está ao lado dele para quem o quiser corrigir.
  const subtitle = isProfessor
    ? roleLabel(profile.participationMode, profile.role, i18n)
    : formatCourseAndYear(profile.course, profile.year);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        // A cor por trás do conteúdo é a do topo do gradiente (ver o mesmo raciocínio na Home e
        // nos outros separadores): é o que aparece na faixa revelada ao puxar para baixo.
        style={[styles.scroll, { backgroundColor: theme.heroTop }]}
        contentContainerStyle={[styles.content, { backgroundColor: theme.background }]}
        showsVerticalScrollIndicator={false}
        // O gradiente do bloco tem de chegar ao topo do ecrã; sem isto, o iOS volta a empurrar o
        // conteúdo para baixo da barra de estado e sobra uma faixa clara por cima.
        contentInsetAdjustmentBehavior="never">
        {/* O bloco é o mesmo da Home - fotografia de 80, nome e uma segunda linha - com duas
            diferenças: a roda dentada no canto (que fica onde se procura uma definição em qualquer
            ecrã, em vez de no fundo do perfil) e o botão de editar por baixo das linhas.

            O **título** ("PERFIL") saiu daqui: o nome do ecrã repetido por baixo do nome de quem
            lá está não diz nada de novo - e o separador da barra de baixo já se chama Perfil.

            O que este bloco tem a mais do que o da Home é **um** botão, e ele vive na linha do
            papel (ver `subtitleAction`): por baixo das linhas, uma quarta linha tornava este
            cabeçalho mais alto do que o da Home e desalinhava a fotografia e a roda dentada dos
            dois. */}
        <ScreenHero
          style={styles.hero}
          topInset={insets.top}
          name={profile.fullName}
          eyebrow={greeting}
          subtitle={subtitle}
          // Duas linhas para o curso de um aluno: é escolhido pela pessoa e há cursos compridos. O
          // papel de um professor (e o da Home) fica numa só (ver `subtitleLines` no ScreenHero).
          subtitleLines={isProfessor ? 1 : 2}
          initials={getInitials(profile.fullName)}
          photoUri={profile.photoUri}
          subtitleAction={
            <EditButton
              label={i18n.myProfile.edit}
              accessibilityLabel={i18n.myProfile.editProfile}
              onPress={() => router.push('/profile-edit')}
            />
          }
          rightAction={
            <HeroActionButton
              icon="settings-outline"
              accessibilityLabel={i18n.myProfile.settings}
              onPress={() => router.push('/settings')}
            />
          }
        />

        <StatsRow
          items={[
            { value: stats.given, label: i18n.myProfile.sessionsGiven },
            { value: stats.received, label: i18n.myProfile.sessionsReceived },
            { value: stats.upcoming, label: i18n.myProfile.sessionsUpcoming },
          ]}
        />

        {interests.length > 0 && (
          <SectionCard label={i18n.myProfile.subjectsLabel}>
            <TagList items={interests} />
          </SectionCard>
        )}

        <SectionCard label={i18n.myProfile.aboutLabel}>
          <ThemedText type="body">{profile.about || i18n.myProfile.aboutEmpty}</ThemedText>
        </SectionCard>

        {/* Empurra as ações para o fundo quando o conteúdo é curto (o `flexGrow` do contentor dá
            a altura toda ao conjunto) e desaparece quando o conteúdo é alto - num ecrã pequeno o
            "Sair" desliza para baixo em vez de ficar fora de alcance. */}
        <View style={styles.spacer} />

        <Button
          label={i18n.myProfile.signOut}
          variant="danger"
          onPress={() => setConfirmingSignOut(true)}
        />
      </ScrollView>

      <ConfirmModal
        visible={confirmingSignOut}
        onRequestClose={() => setConfirmingSignOut(false)}
        title={i18n.myProfile.signOutConfirmTitle}
        // Sem descrição: a caixa é a pergunta e as duas saídas (ver `signOutConfirmTitle` no
        // dicionário). O ícone diz de que se trata antes de alguém ler a pergunta.
        icon="log-out-outline"
        confirmLabel={i18n.myProfile.signOutConfirm}
        cancelLabel={i18n.common.cancel}
        onConfirm={() => {
          setConfirmingSignOut(false);
          signOutUser();
        }}
        onCancel={() => setConfirmingSignOut(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    // `flexGrow` (e não `flex`) para o ecrã encher a altura toda quando há pouco conteúdo - é o
    // que dá ao `spacer` espaço para empurrar as ações para o fundo - e para o conteúdo claro
    // cobrir a cor que está por trás (o mesmo mecanismo dos outros separadores).
    flexGrow: 1,
    gap: Spacing.four,
    paddingHorizontal: Spacing.five,
    paddingTop: 0,
    paddingBottom: 110,
  },
  // O bloco é de fora a fora: o conteúdo tem 24 px de margem, e o gradiente tem de os desfazer
  // para chegar às bordas.
  hero: {
    marginHorizontal: -Spacing.five,
  },
  spacer: {
    flex: 1,
    minHeight: Spacing.four,
  },
});
