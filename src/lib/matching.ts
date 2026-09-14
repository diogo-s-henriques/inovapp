import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore';

import { getTranslations } from '@/i18n/store';
import { db } from '@/lib/firebase';
import type { AccountRole } from '@/constants/auth';
import { canLearn, canTeach } from '@/constants/profile';
import type { CourseSelection, ParticipationMode } from '@/types/profile';
import type { MatchCandidate } from '@/types/match';

const PLACEHOLDER_SESSIONS_GIVEN = 0;
const PASSED_STORAGE_KEY = 'inovapp:passedCandidates';

/**
 * Teto de perfis lidos de uma vez. Antes não havia limite: cada pesquisa ou abertura do deck de
 * Matches lia a coleção `users` inteira. Com este teto, a ordem passa a ser a dos IDs — o que
 * também quer dizer que, a partir de `CANDIDATE_POOL_LIMIT` perfis completos, a pesquisa deixa de
 * ver toda a gente (filtra este conjunto no cliente). Resolver isso a sério é fazer a pesquisa no
 * servidor, e é trabalho à parte; aqui o objetivo é só parar de ler a coleção toda.
 */
const CANDIDATE_POOL_LIMIT = 100;

interface MentorProfileDoc {
  fullName?: string;
  photoUri?: string;
  role?: AccountRole;
  course?: CourseSelection;
  year?: string;
  about?: string;
  participationMode?: ParticipationMode;
  teachingSubjects?: string[];
  availabilityPeriods?: string[];
  availabilityModality?: string[];
}

// "Mentor" é sempre um aluno (@alunos...) a ensinar outro aluno; um professor (@iseclisboa.pt,
// role determinado pelo domínio do email — ver src/constants/auth.ts) nunca é "Mentor", é
// "Tutor". Um tutorando a contactar outro aluno é sempre para esse aluno ser mentor dele.
function roleLabelFor(mode: ParticipationMode | undefined, accountRole: AccountRole | undefined): string {
  const { roles } = getTranslations();
  const teachLabel = accountRole === 'professor' ? roles.tutor : roles.mentor;
  if (canTeach(mode) && canLearn(mode)) return roles.withTutee(teachLabel);
  if (canTeach(mode)) return teachLabel;
  return roles.tutee;
}

function toCandidate(uid: string, data: MentorProfileDoc): MatchCandidate {
  const i18n = getTranslations();
  const [firstName, ...rest] = (data.fullName ?? '').trim().split(' ');
  return {
    id: uid,
    firstName: firstName || i18n.common.user,
    lastName: rest.join(' '),
    role: roleLabelFor(data.participationMode, data.role),
    course: data.course?.name ?? '',
    year: data.year ?? '',
    subjects: data.teachingSubjects ?? [],
    availability: [...(data.availabilityPeriods ?? []), ...(data.availabilityModality ?? [])].join(' · '),
    availabilityPeriods: data.availabilityPeriods ?? [],
    availabilityModality: data.availabilityModality ?? [],
    description: data.about ?? '',
    sessionsGiven: PLACEHOLDER_SESSIONS_GIVEN,
    responseTime: i18n.common.new,
    image: data.photoUri,
  };
}

function overlapScore(candidate: MatchCandidate, learningSubjects: string[]): number {
  return candidate.subjects.filter((subject) => learningSubjects.includes(subject)).length;
}

/** Mentores (participationMode 'teach' ou 'both') com perfil completo, excluindo o próprio utilizador. */
export async function fetchMentorCandidates(params: {
  currentUid: string;
  learningSubjects: string[];
  excludeIds?: Set<string>;
}): Promise<MatchCandidate[]> {
  const snapshot = await getDocs(
    query(
      collection(db, 'users'),
      where('profileCompleted', '==', true),
      limit(CANDIDATE_POOL_LIMIT),
    ),
  );

  const candidates = snapshot.docs
    .filter((docSnap) => docSnap.id !== params.currentUid && !params.excludeIds?.has(docSnap.id))
    .map((docSnap) => ({ uid: docSnap.id, data: docSnap.data() as MentorProfileDoc }))
    .filter(({ data }) => canTeach(data.participationMode))
    .map(({ uid, data }) => toCandidate(uid, data));

  return candidates.sort((a, b) => overlapScore(b, params.learningSubjects) - overlapScore(a, params.learningSubjects));
}

export async function fetchCandidateById(uid: string): Promise<MatchCandidate | null> {
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (!snapshot.exists()) return null;
  return toCandidate(uid, snapshot.data() as MentorProfileDoc);
}

/** Mentores com quem o utilizador (Tutorando) já tem uma conexão aceite — usados na secção
 * "Mentores para ti" da home, distinta do deck de descoberta em Matches. */
export async function fetchConnectedMentors(uid: string): Promise<MatchCandidate[]> {
  const snapshot = await getDocs(
    query(collection(db, 'connectionRequests'), where('from', '==', uid), where('status', '==', 'accepted')),
  );
  const candidates = await Promise.all(snapshot.docs.map((docSnap) => fetchCandidateById(docSnap.data().to as string)));
  return candidates.filter((candidate): candidate is MatchCandidate => candidate !== null);
}

/**
 * Cache de perfis com o tempo de vida de UMA subscrição (ex.: enquanto o ecrã de chat/agenda/
 * notificações está montado), não da app inteira — cada chamada a subscribeTo... deve criar a
 * sua própria instância, para que reabrir o ecrã volte a ler perfis entretanto editados.
 */
export function createProfileResolver() {
  const cache = new Map<string, MatchCandidate | null>();
  return async function resolveCandidate(uid: string): Promise<MatchCandidate | null> {
    if (!cache.has(uid)) {
      cache.set(uid, await fetchCandidateById(uid));
    }
    return cache.get(uid) ?? null;
  };
}

export function connectionRequestId(fromUid: string, toUid: string): string {
  return `${fromUid}_${toUid}`;
}

/** ID determinístico e simétrico da conversa entre dois utilizadores (IDs ordenados). */
export function matchId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

/** Envia um pedido de conexão (Tutorando -> Mentor/Tutor). O mentor aceita/recusa nas notificações. */
export async function sendConnectionRequest(fromUid: string, toUid: string): Promise<void> {
  await setDoc(doc(db, 'connectionRequests', connectionRequestId(fromUid, toUid)), {
    from: fromUid,
    to: toUid,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

/** Exclui do deck de swipe quem já foi pedido (pendente, aceite ou recusado). */
export async function fetchExcludedCandidateIds(uid: string): Promise<Set<string>> {
  const snapshot = await getDocs(query(collection(db, 'connectionRequests'), where('from', '==', uid)));
  const ids = new Set<string>();
  snapshot.forEach((docSnap) => ids.add(docSnap.data().to as string));
  return ids;
}

/** IDs de candidatos que o utilizador já "passou" no deck de Matches — guardado só no
 * dispositivo (nunca no Firestore, ao contrário de connectionRequests): passar não é uma decisão
 * que precise de ficar visível ao outro lado, só de não voltar a aparecer neste dispositivo. */
export async function getPassedCandidateIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(PASSED_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function passCandidate(candidateId: string): Promise<void> {
  const current = await getPassedCandidateIds();
  if (current.includes(candidateId)) return;
  await AsyncStorage.setItem(PASSED_STORAGE_KEY, JSON.stringify([...current, candidateId]));
}
