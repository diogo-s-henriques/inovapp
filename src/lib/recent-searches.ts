import AsyncStorage from '@react-native-async-storage/async-storage';

// Pesquisas recentes guardadas só no dispositivo (AsyncStorage), nunca no Firestore.
const STORAGE_KEY = 'inovapp:recentSearches';
const MAX_RECENT = 8;

export async function getRecentSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function addRecentSearch(term: string): Promise<string[]> {
  const trimmed = term.trim();
  if (!trimmed) return getRecentSearches();

  const current = await getRecentSearches();
  const next = [
    trimmed,
    ...current.filter((existing) => existing.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, MAX_RECENT);

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function clearRecentSearches(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
