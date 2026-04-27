"use client";

import { LanguageProvider } from './LanguageContext';
import { ThemeProvider } from './ThemeContext';
import { Toaster } from '../ui/toaster';
import { FirebaseClientProvider } from '../../firebase/index';
import { useUser, useFirestore } from '../../firebase/index';
import { useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Syncs the user's Auth state with their Firestore UserProfile document.
 * Sets default role to 'user' and does NOT automatically grant admin status.
 */
function UserProfileSync({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    async function syncAndCheckVerification() {
      if (user && db && !isUserLoading) {
        // 1. Redirection for Email Verification
        // Allow access to verify-email, login, and static/public paths
        const publicPaths = ['/login', '/verify-email'];
        if (!user.emailVerified && !publicPaths.includes(pathname)) {
          router.push('/verify-email');
        }

        // 2. Profile Sync
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          const pendingUsername = localStorage.getItem('pendingUsername') || user.displayName || user.email?.split('@')[0] || 'User';
          
          await setDoc(userRef, {
            id: user.uid,
            externalAuthId: user.uid,
            username: pendingUsername,
            email: user.email || '',
            role: 'user', 
            languagePreference: localStorage.getItem('lang') || 'en',
            themePreference: localStorage.getItem('theme') || 'dark',
            watchlistAnimeIds: [],
            favoriteAnimeIds: [],
            favoriteEpisodeIds: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          
          localStorage.removeItem('pendingUsername');
        } else {
          const data = userSnap.data();
          if (data.favoriteAnimeIds === undefined || data.favoriteEpisodeIds === undefined) {
            await setDoc(userRef, {
              favoriteAnimeIds: data.favoriteAnimeIds || [],
              favoriteEpisodeIds: data.favoriteEpisodeIds || [],
            }, { merge: true });
          }
        }
      }
    }

    syncAndCheckVerification();
  }, [user, db, isUserLoading, pathname, router]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <UserProfileSync>
        <ThemeProvider>
          <LanguageProvider>
            {children}
            <Toaster />
          </LanguageProvider>
        </ThemeProvider>
      </UserProfileSync>
    </FirebaseClientProvider>
  );
}