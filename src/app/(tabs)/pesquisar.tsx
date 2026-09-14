import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

import { Spacing } from '@/constants/theme';
import { SUBJECT_OPTIONS } from '@/constants/profile';
import { useAuthStore } from '@/auth/store';
import { fetchExcludedCandidateIds, fetchMentorCandidates, sendConnectionRequest } from '@/lib/matching';
import { addRecentSearch, clearRecentSearches, getRecentSearches } from '@/lib/recent-searches';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/Button';
import { SuggestionChip } from '@/components/ui/SuggestionChip';
import { ThemedText } from '@/components/ui/ThemedText';
import { FilterSheet } from '@/components/domain/FilterSheet';
import { SearchBar } from '@/components/domain/SearchBar';
import { StudentCard } from '@/components/domain/StudentCard';
import type { FilterGroup, Student } from '@/types/student';

const RECENT_SAVE_DELAY_MS = 800;
const RECENT_SAVE_MIN_LENGTH = 2;

// Pesquisa de mentores com filtros, pesquisas recentes e resultados filtrados localmente.
export default function SearchScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const filterSheetRef = useRef<BottomSheetModal>(null);
  const user = useAuthStore((state) => state.user);
  const learningSubjects = useAuthStore((state) => state.profile?.learningSubjects ?? []);

  const filterGroups = useMemo<FilterGroup[]>(
    () => [{ id: 'subjects', title: i18n.filterSheet.subjectsGroupTitle, options: SUBJECT_OPTIONS }],
    [i18n],
  );

  const [mentors, setMentors] = useState<Student[] | null>(null);
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>();
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [addError, setAddError] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const isSearching = query.trim().length > 0 || selectedTags.length > 0 || !!selectedCourse;
  const loading = isSearching && mentors === null;

  useEffect(() => {
    getRecentSearches().then(setRecentSearches);
  }, []);

  // Só carrega mentores do Firestore quando há de facto uma pesquisa ativa (texto ou filtro),
  // não ao abrir o ecrã, para evitar leituras desnecessárias.
  useEffect(() => {
    if (!user || !isSearching || mentors !== null) return;
    let cancelled = false;

    (async () => {
      // Quem já tem um pedido de conexão connosco (em qualquer sentido e estado) começa com o "+"
      // já marcado — não é possível pedir duas vezes a mesma ligação.
      const excludeIds = await fetchExcludedCandidateIds(user.uid);
      if (cancelled) return;
      setAddedIds((current) => Array.from(new Set([...current, ...excludeIds])));

      const candidates = await fetchMentorCandidates({ currentUid: user.uid, learningSubjects });
      if (cancelled) return;
      setMentors(
        candidates.map((candidate) => ({
          id: candidate.id,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          course: candidate.course,
          year: candidate.year,
          tags: candidate.subjects,
          image: candidate.image,
        })),
      );
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearching, mentors, user?.uid]);

  // Guarda a pesquisa como recente só depois de o utilizador parar de escrever.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < RECENT_SAVE_MIN_LENGTH) return;

    const handle = setTimeout(() => {
      addRecentSearch(trimmed).then(setRecentSearches);
    }, RECENT_SAVE_DELAY_MS);

    return () => clearTimeout(handle);
  }, [query]);

  const courses = useMemo(() => Array.from(new Set((mentors ?? []).map((mentor) => mentor.course))), [mentors]);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (mentors ?? []).filter((mentor) => {
      const matchesQuery = `${mentor.firstName} ${mentor.lastName}`.toLowerCase().includes(normalizedQuery);
      const matchesCourse = !selectedCourse || mentor.course === selectedCourse;
      const matchesTags = selectedTags.every((tag) => mentor.tags.includes(tag));
      return matchesQuery && matchesCourse && matchesTags;
    });
  }, [mentors, query, selectedCourse, selectedTags]);

  // Só trata o caso de "adicionar" — um pedido de conexão já enviado não pode ser desfeito
  // (allow delete: if false nas regras), por isso ignora tentativas de "remover".
  const handleToggleAdded = async (id: string, added: boolean) => {
    if (!user || !added || addedIds.includes(id)) return;
    setAddedIds((current) => [...current, id]);
    setAddError(false);
    try {
      await sendConnectionRequest(user.uid, id);
    } catch {
      setAddedIds((current) => current.filter((existing) => existing !== id));
      setAddError(true);
    }
  };

  const handleClearRecent = () => {
    clearRecentSearches().then(() => setRecentSearches([]));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={i18n.search.placeholder}
          onPressFilters={() => filterSheetRef.current?.present()}
          activeFilterCount={selectedTags.length + (selectedCourse ? 1 : 0)}
          activeFilters={selectedTags}
          onRemoveFilter={(tag) => setSelectedTags((current) => current.filter((existing) => existing !== tag))}
          resultsLabel={isSearching ? i18n.search.resultsCount(results.length) : undefined}
        />
      </View>

      {addError && (
        <ThemedText type="small" themeColor="danger" style={styles.addError}>
          {i18n.search.addError}
        </ThemedText>
      )}

      {!isSearching ? (
        <View style={styles.recent}>
          <View style={styles.recentHeader}>
            <ThemedText type="smallBold" themeColor="textMuted">
              {i18n.search.recentTitle}
            </ThemedText>
            {recentSearches.length > 0 && (
              <Button label={i18n.search.recentClear} variant="link" onPress={handleClearRecent} />
            )}
          </View>

          {recentSearches.length > 0 ? (
            <View style={styles.recentChips}>
              {recentSearches.map((term) => (
                <SuggestionChip key={term} label={term} tone="muted" onPress={() => setQuery(term)} />
              ))}
            </View>
          ) : (
            <ThemedText themeColor="textMuted" style={styles.empty}>
              {i18n.search.recentEmpty}
            </ThemedText>
          )}
        </View>
      ) : loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(mentor) => mentor.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <ThemedText themeColor="textMuted" style={styles.empty}>
              {i18n.search.empty}
            </ThemedText>
          }
          renderItem={({ item }) => (
            <StudentCard
              firstName={item.firstName}
              lastName={item.lastName}
              course={item.course}
              year={item.year}
              tags={item.tags}
              image={item.image}
              added={addedIds.includes(item.id)}
              onToggleAdded={(added) => handleToggleAdded(item.id, added)}
            />
          )}
        />
      )}

      <FilterSheet
        ref={filterSheetRef}
        groups={filterGroups}
        courses={courses}
        selectedTags={selectedTags}
        selectedCourse={selectedCourse}
        onChangeSelectedTags={setSelectedTags}
        onChangeSelectedCourse={setSelectedCourse}
        onApply={() => filterSheetRef.current?.dismiss()}
        onClear={() => {
          setSelectedTags([]);
          setSelectedCourse(undefined);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
  },
  addError: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.two,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recent: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.five,
    gap: Spacing.three,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  list: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
    paddingBottom: 120,
  },
  separator: {
    height: Spacing.two,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.six,
  },
});
