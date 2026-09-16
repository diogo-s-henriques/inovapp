import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/auth/store';
import { signOutUser } from '@/auth/actions';
import { SESSION_MAX_AGE_MS_DEFAULT, SESSION_MAX_AGE_MS_REMEMBER } from '@/constants/auth';

// setTimeout usa um inteiro de 32 bits: qualquer atraso acima de ~24.8 dias transborda e
// dispara de imediato, por isso expirações longas (30 dias) têm de ser feitas em blocos.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

function scheduleAfter(delayMs: number, callback: () => void): () => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  const run = (remaining: number) => {
    if (remaining > MAX_TIMEOUT_MS) {
      timeoutId = setTimeout(() => run(remaining - MAX_TIMEOUT_MS), MAX_TIMEOUT_MS);
    } else {
      timeoutId = setTimeout(callback, remaining);
    }
  };

  run(delayMs);
  return () => clearTimeout(timeoutId);
}

/** Liga o estado de autenticação (Firebase Auth) aos documentos do utilizador no Firestore:
 * o perfil (`users/{uid}`, partilhado com a comunidade) e os dados privados da conta
 * (`userAccounts/{uid}`, só do próprio - email, última entrada, sessão prolongada), a partir
 * dos quais se faz o logout automático quando a sessão expira. */
export function useAuthSync(): void {
  const { setInitializing, setUser, setProfile, setProfileCompleted, setBootstrapped } = useAuthStore();

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let unsubscribeAccount: (() => void) | null = null;
    let cancelExpiry: (() => void) | null = null;

    const clearExpiryTimeout = () => {
      cancelExpiry?.();
      cancelExpiry = null;
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      unsubscribeProfile?.();
      unsubscribeProfile = null;
      unsubscribeAccount?.();
      unsubscribeAccount = null;
      clearExpiryTimeout();

      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setProfileCompleted(null);
        setInitializing(false);
        // "Não há sessão" é uma resposta, e é a primeira que muita gente recebe: a partir daqui
        // qualquer espera tem um ecrã à frente (ver `bootstrapped` na loja).
        setBootstrapped(true);
        return;
      }

      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        // O `reload()` que confirma o email escreve **neste mesmo objeto**, por isso voltar a
        // subscrever não é preciso para isto ficar atual - basta voltar a lê-lo (ver
        // `refreshEmailVerified` em src/auth/actions.ts).
        emailVerified: firebaseUser.emailVerified,
      });

      // A expiração da sessão depende de lastLoginAt/rememberSession, que vivem no documento
      // privado da conta (ver src/auth/actions.ts e firestore.rules).
      unsubscribeAccount = onSnapshot(doc(db, 'userAccounts', firebaseUser.uid), (snapshot) => {
        clearExpiryTimeout();
        const data = snapshot.data();

        const lastLoginAt = data?.lastLoginAt?.toDate?.() as Date | undefined;
        if (!lastLoginAt) return;

        const maxAgeMs = data?.rememberSession === true ? SESSION_MAX_AGE_MS_REMEMBER : SESSION_MAX_AGE_MS_DEFAULT;
        const remainingMs = maxAgeMs - (Date.now() - lastLoginAt.getTime());
        if (remainingMs <= 0) {
          signOutUser();
          return;
        }
        cancelExpiry = scheduleAfter(remainingMs, () => signOutUser());
      });

      unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (snapshot) => {
        const data = snapshot.data();

        setProfileCompleted(data?.profileCompleted === true);
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified,
          fullName: data?.fullName,
          photoUri: data?.photoUri,
          role: data?.role,
        });
        setProfile(
          data
            ? {
                fullName: data.fullName ?? '',
                role: data.role,
                course: data.course,
                year: data.year,
                about: data.about ?? '',
                photoUri: data.photoUri,
                participationMode: data.participationMode,
                teachingSubjects: data.teachingSubjects ?? [],
                learningSubjects: data.learningSubjects ?? [],
                availabilityPeriods: data.availabilityPeriods ?? [],
                availabilityModality: data.availabilityModality ?? [],
              }
            : null,
        );
        setInitializing(false);
        setBootstrapped(true);
      });
    });

    return () => {
      unsubscribeProfile?.();
      unsubscribeAccount?.();
      clearExpiryTimeout();
      unsubscribeAuth();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
