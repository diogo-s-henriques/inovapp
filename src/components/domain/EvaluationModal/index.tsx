import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { ProfilePicCard } from '@/components/ui/ProfilePicCard';
import { StarRatingInput } from '@/components/ui/StarRatingInput';
import { TextField } from '@/components/ui/TextField';
import { ThemedText } from '@/components/ui/ThemedText';
import { RATING_LABELS, RATING_TAGS } from '@/constants/rating';
import { IconSize, MaxContentWidth, Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import type { NewRatingData } from '@/types/rating';

export interface EvaluationModalProps {
  visible: boolean;
  mentorFirstName: string;
  mentorLastName: string;
  mentorImage?: string;
  subject: string;
  scheduleLabel: string;
  onSubmit: (data: NewRatingData) => void | Promise<void>;
  onSkip: () => void;
}

/** Sem estado persistido entre sessões diferentes de propósito - o chamador deve montar uma
 * instância nova (ex. via `key={session.id}`) por cada sessão a avaliar. */
export function EvaluationModal({
  visible,
  mentorFirstName,
  mentorLastName,
  mentorImage,
  subject,
  scheduleLabel,
  onSubmit,
  onSkip,
}: EvaluationModalProps) {
  const theme = useTheme();
  const i18n = useI18n();
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ rating, subject, tags, comment: comment.trim() });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Pressable
            onPress={onSkip}
            accessibilityRole="button"
            accessibilityLabel={i18n.evaluation.close}
            style={styles.close}
            hitSlop={8}>
            <Ionicons name="close-outline" size={IconSize.ui} color={theme.textPrimary} />
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <ProfilePicCard
              firstName={mentorFirstName}
              lastName={mentorLastName}
              image={mentorImage}
              size="lg"
              style={styles.avatar}
            />

            <ThemedText type="subtitle" style={styles.question}>
              {i18n.evaluation.question(mentorFirstName)}
            </ThemedText>
            <ThemedText type="small" themeColor="textMuted" style={styles.schedule}>
              {subject} · {scheduleLabel}
            </ThemedText>

            <StarRatingInput value={rating} onChange={setRating} style={styles.stars} />
            {rating > 0 && (
              <ThemedText type="smallBold" themeColor="rating" style={styles.ratingLabel}>
                {RATING_LABELS[rating]}
              </ThemedText>
            )}

            <View style={styles.section}>
              <ThemedText type="small" themeColor="textMuted" style={styles.sectionLabel}>
                {i18n.evaluation.whatWentWell}
              </ThemedText>
              <ChipGroup options={RATING_TAGS} selected={tags} onChange={setTags} />
            </View>

            <TextField
              label={i18n.evaluation.commentLabel}
              variant="filled"
              multiline
              maxLength={200}
              placeholder={i18n.evaluation.commentPlaceholder(mentorFirstName)}
              value={comment}
              onChangeText={setComment}
            />

            <Button
              label={submitting ? i18n.evaluation.submitting : i18n.evaluation.submit}
              variant="primary"
              onPress={handleSubmit}
              disabled={!rating || submitting}
              style={styles.submit}
            />
            <Button label={i18n.evaluation.skip} variant="link" onPress={onSkip} style={styles.skip} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    backgroundColor: 'rgba(26, 26, 26, 0.5)',
  },
  card: {
    width: '100%',
    maxWidth: MaxContentWidth,
    maxHeight: '88%',
    borderRadius: Spacing.five,
  },
  close: {
    alignSelf: 'flex-end',
    padding: Spacing.four,
  },
  content: {
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.six,
    gap: Spacing.one,
  },
  avatar: {
    alignSelf: 'center',
    marginBottom: Spacing.two,
  },
  question: {
    textAlign: 'center',
  },
  schedule: {
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  stars: {
    alignSelf: 'center',
    marginTop: Spacing.two,
  },
  ratingLabel: {
    alignSelf: 'center',
    marginTop: Spacing.one,
  },
  section: {
    alignSelf: 'stretch',
    gap: Spacing.two,
    marginTop: Spacing.five,
    marginBottom: Spacing.four,
  },
  sectionLabel: {
    letterSpacing: 0.5,
  },
  submit: {
    alignSelf: 'stretch',
    marginTop: Spacing.five,
  },
  skip: {
    marginTop: Spacing.one,
  },
});
