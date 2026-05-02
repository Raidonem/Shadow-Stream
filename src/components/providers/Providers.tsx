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
import { ShieldAlert, LogOut, Loader2 } from 'lucide-react';
import { UserProfile } from '../../lib/types';

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
 * Checks for account suspension.
 */
function UserProfileSync({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    async function syncAndCheck() {
      if (user && db && !isUserLoading) {
        setIsLoadingProfile(true);
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          const pendingUsername = localStorage.getItem('pendingUsername') || user.email?.split('@')[0] || 'User';
          const pendingDisplayName = localStorage.getItem('pendingDisplayName') || pendingUsername;
          
          const newProfile = {
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
          };
          await setDoc(userRef, newProfile);
          setProfileData(newProfile as any);
        } else {
          const data = userSnap.data() as UserProfile;
          setProfileData(data);
          
          const updates: any = {};
          if (!data.displayName) updates.displayName = generateRandomDisplayName();
          if (Object.keys(updates).length > 0) await updateDoc(userRef, updates);
        }
        
        // Redirection for Email Verification
        const publicPaths = ['/login', '/verify-email', '/forgot-password'];
        if (!user.emailVerified && !publicPaths.some(p => pathname.startsWith(p))) {
          router.push('/verify-email');
        }
        setIsLoadingProfile(false);
      } else {
        setIsLoadingProfile(false);
      }
    }

    syncAndCheck();
  }, [user, db, isUserLoading, pathname, router]);

  // Global Suspension Enforcement
  const isSuspended = profileData?.suspendedUntil && profileData.suspendedUntil.toDate() > new Date();

  if (user && isSuspended && !pathname.startsWith('/warning')) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-6" />
        <h1 className="text-3xl font-bold mb-2">Account Suspended</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Your access to ShadowStream has been restricted due to violations of our community standards.
        </p>
        <div className="bg-secondary/30 p-6 rounded-2xl border border-destructive/20 mb-8 max-w-lg w-full text-left">
          <p className="text-sm font-bold uppercase text-muted-foreground mb-2">Duration</p>
          <p className="text-lg font-medium mb-4">Until {profileData.suspendedUntil.toDate().toLocaleString()}</p>
          <Button variant="outline" className="w-full rounded-xl gap-2 text-accent border-accent hover:bg-accent/10" onClick={() => router.push(`/warning/${user.uid}`)}>
            View Official Details
          </Button>
        </div>
        <Button variant="ghost" onClick={() => signOut(auth)} className="gap-2 text-muted-foreground hover:text-destructive">
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>
    );
  }

  if (isUserLoading || (user && isLoadingProfile)) {
    return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
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
