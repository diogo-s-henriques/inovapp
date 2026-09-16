import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { Button } from '@/components/ui/Button';
import { PersonalCardInfo } from '@/components/ui/PersonalCardInfo';
import { ProfilePicCard } from '@/components/ui/ProfilePicCard';
import { TagProfile } from '@/components/ui/TagProfile';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface CandidateCardProps extends ViewProps {
  firstName: string;
  lastName: string;
  course: string;
  year: string;
  subjects: string[];
  image?: string;
  /** Rótulo do botão de decisão (\"Passar\"), já traduzido. */
  passLabel: string;
  /** Rótulo do botão de pedido de ligação (\"Conectar\"), já traduzido. */
  connectLabel: string;
  /** Desativa os botões enquanto o pedido deste candidato está a ser enviado. */
  busy?: boolean;
  onPass: () => void;
  onConnect: () => void;
  onPressProfile: () => void;
}

/**
 * Candidato na lista dos Matches: fotografia, nome, curso e as disciplinas em que ensina, com as
 * duas decisões em botões.
 *
 * É o mesmo desenho da linha de resultados da pesquisa (`StudentCard`) - cartão branco, fotografia
 * à esquerda, informação no meio - porque fazem a mesma pergunta à mesma pessoa: "esta interessa-me?".
 * Antes isto era um cartão de ecrã inteiro com a fotografia em fundo e uma bandeja de botões fixa
 * em baixo, e o ecrã não se parecia com nenhum dos outros.
 *
 * O que se perdeu nesta passagem: a **descrição** e a **disponibilidade** do candidato, que o
 * cartão grande mostrava. Continuam no perfil dele (basta tocar no cartão) e é lá que se decide se
 * vale a pena pedir a ligação; num cartão de lista, eram quatro linhas de texto a competir com o
 * nome de quem ainda não se conhece.
 */
export function CandidateCard({
  firstName,
  lastName,
  course,
  year,
  subjects,
  image,
  passLabel,
  connectLabel,
  busy,
  onPass,
  onConnect,
  onPressProfile,
  style,
  ...rest
}: CandidateCardProps) {
  const theme = useTheme();
  const name = `${firstName} ${lastName}`;
  const visibleSubjects = subjects.slice(0, 2);
  const overflow = subjects.length - visibleSubjects.length;

  return (
    <Pressable
      onPress={onPressProfile}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}
      {...rest}>
      <View style={styles.identity}>
        <ProfilePicCard firstName={firstName} lastName={lastName} image={image} size="md" />
        <View style={styles.info}>
          <PersonalCardInfo name={name} course={course} year={year} />
          {subjects.length > 0 && (
            <View style={styles.tags}>
              {visibleSubjects.map((subject, index) => (
                <TagProfile
                  key={`${subject}-${index}`}
                  title={subject}
                  interactive={false}
                  style={styles.tag}
                />
              ))}
              {overflow > 0 && (
                <TagProfile title={`+${overflow}`} interactive={false} style={styles.overflowTag} />
              )}
            </View>
          )}
        </View>
      </View>

      {/* As duas decisões dentro do cartão, e não numa bandeja fixa ao fundo do ecrã: o que se
          decide é a pessoa que está a ser lida, e um botão longe dela obrigava a ligar as duas
          coisas de cabeça. */}
      <View style={styles.actions}>
        <Button
          label={passLabel}
          icon="close-outline"
          variant="secondary"
          tone="neutral"
          onPress={onPass}
          disabled={busy}
          style={styles.action}
        />
        <Button
          label={connectLabel}
          icon="heart-outline"
          variant="primary"
          tone="neutral"
          onPress={onConnect}
          disabled={busy}
          style={styles.action}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  info: {
    flex: 1,
    gap: Spacing.two,
  },
  tags: {
    flexDirection: 'row',
    // Como no `StudentCard`: sem envolvimento, as etiquetas encolhem em vez de esticarem o cartão
    // numa segunda linha (os nomes das disciplinas são compridos).
    flexWrap: 'nowrap',
    overflow: 'hidden',
    gap: Spacing.one,
  },
  tag: {
    flexShrink: 1,
  },
  overflowTag: {
    flexShrink: 0,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    flex: 1,
  },
});
