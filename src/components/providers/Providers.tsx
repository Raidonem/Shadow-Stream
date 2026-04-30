
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
import { AlertCircle, ShieldAlert } from 'lucide-react';
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
 * Sets default role to 'user' and checks for suspensions.
 */
function UserProfileSync({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspensionDate, setSuspensionDate] = useState<string | null>(null);

  useEffect(() => {
    async function syncAndCheck() {
      if (user && db && !isUserLoading) {
        // 1. Redirection for Email Verification
        const publicPaths = ['/login', '/verify-email', '/forgot-password', '/warning'];
        if (!user.emailVerified && !publicPaths.some(p => pathname.startsWith(p))) {
          router.push('/verify-email');
        }

        // 2. Profile Sync & Suspension Check
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
          
          // Check for suspension
          if (data.suspensionUntil) {
            const until = new Date(data.suspensionUntil);
            if (until > new Date()) {
              setIsSuspended(true);
              setSuspensionDate(until.toLocaleString());
            }
          }

          // Migration for older users
          const updates: any = {};
          if (!data.displayName) updates.displayName = generateRandomDisplayName();
          if (Object.keys(updates).length > 0) await updateDoc(userRef, updates);
        }
      }
    }

    syncAndCheck();
  }, [user, db, isUserLoading, pathname, router]);

  if (isSuspended) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-6 text-center space-y-6">
        <ShieldAlert className="h-20 w-20 text-destructive animate-pulse" />
        <h1 className="text-4xl font-bold">Account Suspended</h1>
        <p className="max-w-md text-muted-foreground text-lg">
          Your access to ShadowStream has been suspended for violating our community guidelines.
        </p>
        <div className="rounded-xl bg-secondary/50 p-4 border border-destructive/20">
          <p className="font-bold text-destructive">
            Suspension ends: {suspensionDate}
          </p>
        </div>
        <Button onClick={() => signOut(auth)} variant="outline" className="rounded-xl px-8">
          Sign Out
        </Button>
      </div>
    );
  }

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
