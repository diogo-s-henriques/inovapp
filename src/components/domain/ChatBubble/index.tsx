import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ChatAttachment } from '@/types/chat';

export interface ChatBubbleProps {
  text: string;
  fromMe: boolean;
  attachment?: ChatAttachment;
}

/** Balão de mensagem de chat, alinhado à direita e com destaque quando enviado pelo próprio
 * utilizador. Quando há anexo (link, sem upload real), mostra-o como cartão tocável. */
export function ChatBubble({ text, fromMe, attachment }: ChatBubbleProps) {
  const theme = useTheme();
  const textColor = fromMe ? theme.onPrimary : theme.textPrimary;

  return (
    <View style={[styles.wrapper, fromMe ? styles.wrapperMe : styles.wrapperOther]}>
      <View
        style={[
          styles.bubble,
          fromMe
            ? [styles.bubbleMe, { backgroundColor: theme.primary }]
            : [styles.bubbleOther, { backgroundColor: theme.surface }],
        ]}>
        {attachment && (
          <Pressable
            onPress={() => Linking.openURL(attachment.fileUrl)}
            accessibilityRole="link"
            accessibilityLabel={`Abrir anexo ${attachment.fileName}`}
            style={[styles.attachment, { borderColor: fromMe ? theme.onPrimary : theme.border }]}>
            <Ionicons name="document-attach-outline" size={IconSize.ui} color={textColor} />
            <Text style={{ color: textColor, fontSize: 14, fontWeight: '600', flex: 1 }} numberOfLines={1}>
              {attachment.fileName}
            </Text>
          </Pressable>
        )}
        {text.length > 0 && <Text style={{ color: textColor, fontSize: 15 }}>{text}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
  },
  wrapperMe: {
    justifyContent: 'flex-end',
  },
  wrapperOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  bubbleMe: {
    borderBottomRightRadius: Spacing.half,
  },
  bubbleOther: {
    borderBottomLeftRadius: Spacing.half,
  },
});
