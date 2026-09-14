import { forwardRef, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { Spacing } from '@/constants/theme';
import { isHttpUrl } from '@/lib/url';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { ThemedText } from '@/components/ui/ThemedText';
import type { ChatAttachment } from '@/types/chat';

export interface AttachFileSheetProps {
  onSubmit: (data: ChatAttachment) => void | Promise<void>;
}

/** Bottom sheet para anexar um ficheiro ao chat por link (sem upload real — ver materiais). */
export const AttachFileSheet = forwardRef<BottomSheetModal, AttachFileSheetProps>(function AttachFileSheet(
  { onSubmit },
  ref,
) {
  const theme = useTheme();
  const i18n = useI18n();
  const snapPoints = useMemo(() => ['45%'], []);

  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Um material só pode ser partilhado como link http/https — ver src/lib/url.ts.
  const linkInvalid = fileUrl.trim().length > 0 && !isHttpUrl(fileUrl);
  const canSubmit = !!fileName.trim() && isHttpUrl(fileUrl) && !submitting;

  const reset = () => {
    setFileName('');
    setFileUrl('');
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit({ fileName: fileName.trim(), fileUrl: fileUrl.trim() });
      reset();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: theme.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.border }}
      backdropComponent={(props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      )}>
      <BottomSheetView style={styles.content}>
        <ThemedText type="subtitle">{i18n.attachFile.title}</ThemedText>
        <ThemedText type="small" themeColor="textMuted">
          {i18n.attachFile.description}
        </ThemedText>

        <TextField
          label={i18n.attachFile.fileNameLabel}
          variant="filled"
          placeholder={i18n.attachFile.fileNamePlaceholder}
          value={fileName}
          onChangeText={setFileName}
        />

        <TextField
          label={i18n.attachFile.linkLabel}
          variant="filled"
          placeholder="https://..."
          autoCapitalize="none"
          value={fileUrl}
          onChangeText={setFileUrl}
        />

        {linkInvalid && (
          <ThemedText type="small" themeColor="danger">
            {i18n.attachFile.invalidLink}
          </ThemedText>
        )}

        <Button
          label={submitting ? i18n.attachFile.sending : i18n.attachFile.send}
          variant="primary"
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={styles.submit}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  submit: {
    marginTop: Spacing.two,
  },
});
