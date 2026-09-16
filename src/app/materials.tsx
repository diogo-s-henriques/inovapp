import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useAuthStore } from '@/auth/store';
import { subscribeToSharedMaterials } from '@/lib/materials';
import { goBack } from '@/lib/navigation';
import { dateLocaleTag } from '@/lib/time';
import { isHttpUrl } from '@/lib/url';
import { useLocaleStore } from '@/i18n/store';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { ThemedText } from '@/components/ui/ThemedText';
import { MaterialListItem } from '@/components/domain/MaterialListItem';
import { StackHeader } from '@/components/domain/StackHeader';
import type { SharedMaterial } from '@/types/material';

type FilterOption = 'all' | 'sent' | 'received';
const FILTER_OPTIONS: FilterOption[] = ['all', 'sent', 'received'];

function formatDateShort(date: Date | undefined, locale: 'pt' | 'en'): string {
  if (!date) return '';
  return date.toLocaleDateString(dateLocaleTag(locale), { day: '2-digit', month: 'short' });
}

// Só vê os materiais (anexos) já trocados nas conversas do utilizador — não há partilha
// "para todos" nem upload real (ver src/lib/materials.ts).
export default function MaterialsScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const locale = useLocaleStore((state) => state.locale);
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const filterLabels: Record<FilterOption, string> = {
    all: i18n.materials.filterAll,
    sent: i18n.materials.filterSent,
    received: i18n.materials.filterReceived,
  };
  const filterLabelToOption = useMemo(
    () => Object.fromEntries(FILTER_OPTIONS.map((option) => [filterLabels[option], option])) as Record<string, FilterOption>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [i18n],
  );

  const [materials, setMaterials] = useState<SharedMaterial[]>([]);
  const [filter, setFilter] = useState<FilterOption>('all');

  useEffect(() => {
    if (!user) return;
    return subscribeToSharedMaterials(user.uid, setMaterials);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const filtered = useMemo(() => {
    if (filter === 'sent') return materials.filter((material) => material.fromMe);
    if (filter === 'received') return materials.filter((material) => !material.fromMe);
    return materials;
  }, [materials, filter]);

  // Só abre links http/https: o URL foi escrito por outro utilizador (ver src/lib/url.ts).
  const handleOpen = (material: SharedMaterial) => {
    if (!isHttpUrl(material.fileUrl)) {
      Alert.alert(i18n.materials.invalidLink);
      return;
    }
    Linking.openURL(material.fileUrl).catch(() => Alert.alert(i18n.materials.invalidLink));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StackHeader title={i18n.materials.title} backLabel={i18n.materials.back} onBack={() => goBack(router)} />

      <View style={styles.filterRow}>
        <ChipGroup
          options={FILTER_OPTIONS.map((option) => filterLabels[option])}
          selected={[filterLabels[filter]]}
          onChange={(next) => next[0] && setFilter(filterLabelToOption[next[0]])}
          multiple={false}
        />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {filtered.length > 0 ? (
          filtered.map((material) => (
            <MaterialListItem
              key={material.id}
              title={material.fileName}
              subtitle={`${material.fromMe ? i18n.materials.sentTo : i18n.materials.receivedFrom} ${material.otherFirstName} ${material.otherLastName} · ${formatDateShort(material.createdAt, locale)}`}
              onPressOpen={() => handleOpen(material)}
              style={styles.item}
            />
          ))
        ) : (
          <ThemedText themeColor="textMuted" style={styles.empty}>
            {i18n.materials.empty}
          </ThemedText>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterRow: {
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.three,
  },
  list: {
    paddingHorizontal: Spacing.five,
    paddingBottom: 120,
  },
  item: {
    marginBottom: Spacing.two,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.six,
  },
});
