import {
    BottomSheetBackdrop,
    BottomSheetModal,
    BottomSheetScrollView,
    type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { forwardRef, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { TextField } from '@/components/ui/TextField';
import { ThemedText } from '@/components/ui/ThemedText';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import {
  DocumentTooLargeError,
  MAX_DOCUMENT_BYTES,
  pickDocument,
  type PickedDocument,
} from '@/lib/attachments';
import { formatFileSize } from '@/lib/attachment-chunks';
import { isHttpUrl } from '@/lib/url';
import type { ChatAttachment } from '@/types/chat';

type AttachMode = 'file' | 'link';

export interface AttachFileSheetProps {
  /** Anexo por link (o caminho que já existia). */
  onSubmit: (data: ChatAttachment) => void | Promise<void>;
  /** Documento escolhido do telemóvel: guardar e enviar (ver src/lib/attachments.ts). */
  onSubmitDocument: (document: PickedDocument) => void | Promise<void>;
}

const MAX_SIZE_LABEL = `${MAX_DOCUMENT_BYTES / (1024 * 1024)} MB`;

/**
 * Bottom sheet para anexar um material ao chat, de duas maneiras: um **documento** escolhido do
 * telemóvel (guardado no Firestore, ver src/lib/attachments.ts) ou um **link** http/https.
 *
 * O limite é 10 MB, repartido por vários documentos do Firestore (ver src/lib/attachments.ts);
 * o próprio texto do formulário diz o limite em vez de deixar o utilizador descobrir com um erro
 * depois de esperar pelo envio. Acima disso, o caminho continua a ser o link.
 */
export const AttachFileSheet = forwardRef<BottomSheetModal, AttachFileSheetProps>(function AttachFileSheet(
  { onSubmit, onSubmitDocument },
  ref,
) {
  const theme = useTheme();
  const i18n = useI18n();
  const snapPoints = useMemo(() => ['68%'], []);

  const [mode, setMode] = useState<AttachMode>('file');
  const [picked, setPicked] = useState<PickedDocument | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [picking, setPicking] = useState(false);

  // Um material só pode ser partilhado como link http/https - ver src/lib/url.ts.
  const linkInvalid = fileUrl.trim().length > 0 && !isHttpUrl(fileUrl);
  const canSubmit =
    !submitting &&
    !!fileName.trim() &&
    (mode === 'file' ? !!picked : isHttpUrl(fileUrl));

  const reset = () => {
    setPicked(null);
    setFileName('');
    setFileUrl('');
    setError(null);
  };

  const handlePick = async () => {
    setPicking(true);
    setError(null);
    try {
      const document = await pickDocument();
      if (!document) return;
      setPicked(document);
      setFileName(document.fileName);
    } catch (pickError) {
      setError(
        pickError instanceof DocumentTooLargeError
          ? i18n.attachFile.fileTooLarge(MAX_SIZE_LABEL)
          : i18n.attachFile.fileReadError,
      );
    } finally {
      setPicking(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || (mode === 'file' && !picked)) return;

    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'file' && picked) {
        await onSubmitDocument({ ...picked, fileName: fileName.trim() });
      } else {
        await onSubmit({ fileName: fileName.trim(), fileUrl: fileUrl.trim() });
      }
      reset();
    } catch {
      setError(mode === 'file' ? i18n.attachFile.fileUploadError : i18n.attachFile.sendError);
    } finally {
      setSubmitting(false);
    }
  };

  const modeLabel = mode === 'file' ? i18n.attachFile.fileTab : i18n.attachFile.linkTab;
  const fileSizeLabel = picked ? formatFileSize(picked.size) : '';

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: theme.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.border }}
      backdropComponent={(props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      )}>
      <BottomSheetScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="subtitle">{i18n.attachFile.title}</ThemedText>
        <ThemedText type="small" themeColor="textMuted">
          {i18n.attachFile.description}
        </ThemedText>

        <ChipGroup
          options={[i18n.attachFile.fileTab, i18n.attachFile.linkTab]}
          selected={[modeLabel]}
          onChange={(next) => {
            if (!next[0]) return;
            setMode(next[0] === i18n.attachFile.linkTab ? 'link' : 'file');
            setError(null);
          }}
          multiple={false}
        />

        {mode === 'file' ? (
          <>
            <Button
              label={
                picking
                  ? i18n.attachFile.fileLoading
                  : picked
                    ? i18n.attachFile.changeFile
                    : i18n.attachFile.chooseFile
              }
              variant="secondary"
              onPress={handlePick}
              disabled={picking || submitting}
            />

            {picked ? (
              <>
                <TextField
                  label={i18n.attachFile.fileNameLabel}
                  variant="filled"
                  value={fileName}
                  onChangeText={setFileName}
                />
                <ThemedText type="small" themeColor="textMuted">
                  {fileSizeLabel} · {i18n.attachFile.fileHint(MAX_SIZE_LABEL)}
                </ThemedText>
              </>
            ) : (
              <ThemedText type="small" themeColor="textMuted">
                {i18n.attachFile.noFile}
              </ThemedText>
            )}
          </>
        ) : (
          <>
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
          </>
        )}

        {error && (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        )}

        <Button
          label={submitting ? i18n.attachFile.sending : i18n.attachFile.send}
          variant="primary"
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={styles.submit}
        />
      </BottomSheetScrollView>
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
