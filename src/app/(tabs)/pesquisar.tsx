import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { ScreenHero } from '@/components/domain/ScreenHero';
import { SearchBar } from '@/components/domain/SearchBar';
import { StudentCard } from '@/components/domain/StudentCard';
import type { FilterGroup, Student } from '@/types/student';

const RECENT_SAVE_DELAY_MS = 800;
const RECENT_SAVE_MIN_LENGTH = 2;

/**
 * Pesquisa de mentores com filtros, pesquisas recentes e resultados filtrados localmente.
 *
 * O ecrã tem um esqueleto só para quatro estados (recentes, a ler, erro e resultados): o bloco do
 * cabeçalho, o campo de pesquisa e o que o estado tiver a dizer são o **cabeçalho da lista**, e a
 * lista é sempre a mesma — com resultados ou vazia. Antes eram quatro ramos no JSX, e o campo de
 * pesquisa ficava preso ao topo enquanto o bloco do cabeçalho rolava por baixo dele.
 */
export default function SearchScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const insets = useSafeAreaInsets();
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
  const [loadError, setLoadError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const isSearching = query.trim().length > 0 || selectedTags.length > 0 || !!selectedCourse;
  // `mentors === null` sozinho não chega para dizer "a carregar": quando a leitura falha ele fica
  // a null para sempre, e o ecrã passava a rodar sem fim — a pior das falhas, porque não parece uma.
  const loading = isSearching && mentors === null && !loadError;

  useEffect(() => {
    getRecentSearches().then(setRecentSearches);
  }, []);

  // Só carrega mentores do Firestore quando há de facto uma pesquisa ativa (texto ou filtro),
  // não ao abrir o ecrã, para evitar leituras desnecessárias.
  useEffect(() => {
    if (!user || !isSearching || mentors !== null) return;
    let cancelled = false;

    (async () => {
      try {
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
        setLoadError(false);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearching, mentors, user?.uid, reloadToken]);

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

  const handleRetryLoad = () => {
    setLoadError(false);
    setReloadToken((token) => token + 1);
  };

  // Só há resultados quando há uma pesquisa ativa e ela já respondeu — nos outros estados a lista
  // está vazia e o cabeçalho é que fala.
  const showResults = isSearching && !loading && !loadError;

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={showResults ? results : []}
        keyExtractor={(mentor) => mentor.id}
        // A cor por trás da lista é a do topo do gradiente (ver o mesmo raciocínio na Home, nos
        // Matches e no Chat): é o que aparece na faixa revelada ao puxar o conteúdo para baixo.
        style={[styles.scroll, { backgroundColor: theme.heroTop }]}
        contentContainerStyle={[styles.list, { backgroundColor: theme.background }]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <ScreenHero style={styles.hero} topInset={insets.top} title={i18n.search.title} />

            <View style={styles.searchBar}>
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
            ) : loadError ? (
              <View style={styles.state}>
                <ThemedText themeColor="textMuted">{i18n.search.error}</ThemedText>
                <Button label={i18n.search.retry} variant="primary" onPress={handleRetryLoad} />
              </View>
            ) : loading ? (
              <View style={styles.state}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          showResults ? (
            <ThemedText themeColor="textMuted" style={styles.empty}>
              {i18n.search.empty}
            </ThemedText>
          ) : null
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
  scroll: {
    flex: 1,
  },
  // O bloco é de fora a fora: o conteúdo tem 24 px de margem, e o gradiente tem de os desfazer
  // para chegar às bordas.
  hero: {
    marginHorizontal: -Spacing.five,
  },
  searchBar: {
    paddingTop: Spacing.five,
  },
  addError: {
    paddingTop: Spacing.two,
  },
  // Os estados do meio (a ler, erro) não enchem o ecrã: vivem no cabeçalho da lista, e um
  // `flex: 1` aqui não teria altura para se espalhar.
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.six,
  },
  recent: {
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
    flexGrow: 1,
    paddingHorizontal: Spacing.five,
    paddingTop: 0,
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
