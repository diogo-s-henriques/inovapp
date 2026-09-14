import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { NewRatingData } from '@/types/rating';

const DISMISSED_STORAGE_KEY = 'inovapp:dismissedRatings';

/** Documento em ratings/{sessionId} — nunca guarda quem avaliou, só a sessão e a nota. */
export async function hasRatingForSession(sessionId: string): Promise<boolean> {
  const snapshot = await getDoc(doc(db, 'ratings', sessionId));
  return snapshot.exists();
}

export async function submitRating(sessionId: string, mentorUid: string, data: NewRatingData): Promise<void> {
  await setDoc(doc(db, 'ratings', sessionId), {
    mentorUid,
    ...data,
    createdAt: serverTimestamp(),
  });
}

/** "Saltar" fica só guardado localmente (nunca no Firestore) para não deixar rasto de quem
 * dispensou a avaliação, evitando voltar a incomodar com a mesma sessão. */
export async function getDismissedSessionIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(DISMISSED_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function dismissSessionRating(sessionId: string): Promise<void> {
  const current = await getDismissedSessionIds();
  if (current.includes(sessionId)) return;
  await AsyncStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify([...current, sessionId]));
}
