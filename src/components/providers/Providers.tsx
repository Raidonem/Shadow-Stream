
"use client";

import { LanguageProvider } from './LanguageContext';
import { ThemeProvider } from './ThemeContext';
import { Toaster } from '../ui/toaster';
import { FirebaseClientProvider } from '../../firebase/index';
import { useUser, useFirestore } from '../../firebase/index';
import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { Button } from '../ui/button';
import { signOut } from 'firebase/auth';
import { useAuth } from '../../firebase/index';

/**
 * Generates a random display name for legacy accounts missing it.
 */
function generateRandomDisplayName() {
  const prefixes = ['Shadow', 'User', 'Neko', 'Kira', 'Mecha', 'Spirit'];
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${prefixes[Math.floor(Math.random() * prefixes.length)]}${randomSuffix}`.substring(0, 10);
}

/**
 * Syncs the user's Auth state with their Firestore UserProfile document.
 * Sets default role to 'user'.
 */
function UserProfileSync({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    async function syncAndCheck() {
      if (user && db && !isUserLoading) {
        // 1. Redirection for Email Verification
        const publicPaths = ['/login', '/verify-email', '/forgot-password'];
        if (!user.emailVerified && !publicPaths.some(p => pathname.startsWith(p))) {
          router.push('/verify-email');
        }

        // 2. Profile Sync
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          const pendingUsername = localStorage.getItem('pendingUsername') || user.email?.split('@')[0] || 'User';
          const pendingDisplayName = localStorage.getItem('pendingDisplayName') || pendingUsername;
          
          await setDoc(userRef, {
            id: user.uid,
            externalAuthId: user.uid,
            username: pendingUsername,
            displayName: pendingDisplayName,
            email: user.email || '',
            role: 'user', 
            languagePreference: localStorage.getItem('lang') || 'en',
            themePreference: localStorage.getItem('theme') || 'dark',
            watchlistAnimeIds: [],
            currentlyWatchingAnimeIds: [],
            favoriteAnimeIds: [],
            completedAnimeIds: [],
            favoriteEpisodeIds: [],
            blockedUserIds: [],
            isPremium: false,
            isPublic: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          const data = userSnap.data();
          // Migration for older users
          const updates: any = {};
          if (!data.displayName) updates.displayName = generateRandomDisplayName();
          if (Object.keys(updates).length > 0) await updateDoc(userRef, updates);
        }
      }
    }

    syncAndCheck();
  }, [user, db, isUserLoading, pathname, router]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <UserProfileSync>
        <ThemeProvider>
          <LanguageProvider>
            <PayPalScriptProvider options={{ 
              "client-id": "AY1-CQWyy-g4R8IHJx8_QJnGRiH2s9m713ZoRZg5vQkWXdX8NW7njEDqzL-r_E4BnIiGJUZ6APzvBW6W",
              currency: "USD",
              components: "hosted-buttons",
              "disable-funding": "venmo"
            }}>
              {children}
              <Toaster />
            </PayPalScriptProvider>
          </LanguageProvider>
        </ThemeProvider>
      </UserProfileSync>
    </FirebaseClientProvider>
  );
}
