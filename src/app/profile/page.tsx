
"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../../components/ui/select";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '../../firebase/index';
import { doc, collection, query, where, documentId } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '../../firebase/non-blocking-updates';
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  ShieldCheck, 
  Copy, 
  CheckCircle2, 
  Edit3, 
  Save, 
  X,
  Settings2,
  Globe,
  Palette,
  Sparkles,
  Zap,
  Loader2,
  Lock,
  Unlock,
  Bookmark,
  Heart,
  Eye,
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useLanguage } from '../../components/providers/LanguageContext';
import { useTheme } from '../../components/providers/ThemeContext';
import { Badge } from '../../components/ui/badge';
import { usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { useSearchParams } from 'next/navigation';
import { AnimeCard } from '../../components/anime/AnimeCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

function PayPalButton({ onApprove }: { onApprove: () => void }) {
  const [{ isResolved }] = usePayPalScriptReducer();
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    if (isResolved && containerRef.current && !renderedRef.current) {
      const paypal = (window as any).paypal;
      if (paypal && paypal.HostedButtons) {
        paypal.HostedButtons({
          hostedButtonId: "X3C6F5887MPCG",
        }).render(containerRef.current)
          .then(() => {
            renderedRef.current = true;
          })
          .catch((err: any) => {
            console.error("PayPal Hosted Button render error:", err);
          });
      }
    }
  }, [isResolved]);

  return (
    <div className="space-y-4">
      <div ref={containerRef} id="paypal-container-X3C6F5887MPCG" className="min-h-[150px]" />
      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full text-[10px] text-muted-foreground hover:bg-transparent"
        onClick={onApprove}
      >
        Click here if Premium doesn't activate after payment
      </Button>
    </div>
  );
}

function ProfileContent() {
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const { toggleTheme } = useTheme();
  const searchParams = useSearchParams();
  
  const targetUid = searchParams.get('uid') || authUser?.uid;
  const isOwnProfile = !searchParams.get('uid') || searchParams.get('uid') === authUser?.uid;

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    username: '',
    languagePreference: 'en',
    themePreference: 'dark',
    isPublic: false
  });

  const profileRef = useMemoFirebase(() => {
    if (!targetUid || !db) return null;
    return doc(db, 'users', targetUid);
  }, [targetUid, db]);

  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef);

  // Fetch libraries for the profile being viewed
  const watchingQuery = useMemoFirebase(() => {
    if (!db || !profile?.currentlyWatchingAnimeIds?.length) return null;
    return query(collection(db, 'anime'), where(documentId(), 'in', profile.currentlyWatchingAnimeIds.slice(0, 10)));
  }, [db, profile?.currentlyWatchingAnimeIds]);

  const watchlistQuery = useMemoFirebase(() => {
    if (!db || !profile?.watchlistAnimeIds?.length) return null;
    return query(collection(db, 'anime'), where(documentId(), 'in', profile.watchlistAnimeIds.slice(0, 10)));
  }, [db, profile?.watchlistAnimeIds]);

  const favoritesQuery = useMemoFirebase(() => {
    if (!db || !profile?.favoriteAnimeIds?.length) return null;
    return query(collection(db, 'anime'), where(documentId(), 'in', profile.favoriteAnimeIds.slice(0, 10)));
  }, [db, profile?.favoriteAnimeIds]);

  const { data: watchingAnime } = useCollection(watchingQuery);
  const { data: watchlistAnime } = useCollection(watchlistQuery);
  const { data: favoritesAnime } = useCollection(favoritesQuery);

  const isAdmin = profile?.role === 'admin';
  const isPremium = profile?.isPremium === true;

  useEffect(() => {
    if (profile && isOwnProfile) {
      setEditData({
        username: profile.username || '',
        languagePreference: profile.languagePreference || 'en',
        themePreference: profile.themePreference || 'dark',
        isPublic: profile.isPublic || false
      });
    }
  }, [profile, isOwnProfile]);

  const handleSave = () => {
    if (!profileRef || !editData.username.trim()) {
      toast({
        title: "Error",
        description: "Username cannot be empty.",
        variant: "destructive"
      });
      return;
    }

    updateDocumentNonBlocking(profileRef, {
      username: editData.username,
      languagePreference: editData.languagePreference,
      themePreference: editData.themePreference,
      isPublic: editData.isPublic,
      updatedAt: new Date().toISOString()
    });

    if (editData.languagePreference !== language) {
      setLanguage(editData.languagePreference as any);
    }
    
    setIsEditing(false);
    toast({
      title: "Profile Updated",
      description: "Your changes have been saved successfully."
    });
  };

  const handleActivatePremium = () => {
    if (!profileRef) return;
    updateDocumentNonBlocking(profileRef, {
      isPremium: true,
      updatedAt: new Date().toISOString()
    });
    toast({
      title: "Premium Activated!",
      description: "Welcome to the elite side of ShadowStream. Enjoy your ad-free experience!",
    });
  };

  const copyUid = () => {
    if (!targetUid) return;
    navigator.clipboard.writeText(targetUid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isAuthLoading || isProfileLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold">This profile is private or does not exist.</h1>
        <Button variant="outline" asChild>
          <a href="/">Back to Home</a>
        </Button>
      </div>
    );
  }

  const userInitial = profile.username?.[0] || 'U';

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
        <div className="relative">
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/20 text-4xl font-bold text-primary ring-4 ring-background shadow-xl">
            {userInitial.toUpperCase()}
          </div>
          {isPremium && (
            <div className="absolute -bottom-2 -right-2 rounded-full bg-accent p-2 text-accent-foreground shadow-lg">
              <Sparkles className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-center gap-3 md:justify-start">
            <h1 className="font-headline text-4xl font-bold">{profile.username || 'User'}</h1>
            {isAdmin && <ShieldCheck className="h-6 w-6 text-accent" />}
            {isPremium && (
              <Badge className="bg-accent text-accent-foreground gap-1 px-3 py-1 font-bold">
                PREMIUM
              </Badge>
            )}
            {!isOwnProfile && (
              <Badge variant="outline" className="gap-1">
                {profile.isPublic ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {profile.isPublic ? t('publicProfile') : t('privateProfile')}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-muted-foreground md:justify-start">
            {isOwnProfile && (
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {profile.email}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              {isAdmin ? 'System Administrator' : 'Standard Account'}
            </span>
          </div>
        </div>
        {isOwnProfile && (
          <div className="flex gap-2">
            <Button 
              variant={isEditing ? "outline" : "default"} 
              className="rounded-xl gap-2"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {isEditing && isOwnProfile ? (
          <Card className="rounded-2xl border-none bg-card shadow-xl md:col-span-2">
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Edit Your Settings
              </CardTitle>
              <CardDescription>Update your public identity and app preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="username">Display Username</Label>
                  <Input 
                    id="username"
                    value={editData.username}
                    onChange={(e) => setEditData({...editData, username: e.target.value})}
                    className="rounded-xl border-none bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lang">Interface Language</Label>
                  <Select 
                    value={editData.languagePreference}
                    onValueChange={(val) => setEditData({...editData, languagePreference: val})}
                  >
                    <SelectTrigger className="rounded-xl border-none bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">العربية (Arabic)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between space-x-2 rounded-xl bg-secondary/30 p-4 md:col-span-2">
                  <div className="space-y-0.5">
                    <Label className="text-base">{t('publicProfile')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('profilePrivacyDesc')}
                    </p>
                  </div>
                  <Switch 
                    checked={editData.isPublic}
                    onCheckedChange={(val) => setEditData({...editData, isPublic: val})}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsEditing(false)}>Discard</Button>
              <Button className="rounded-xl gap-2 bg-accent text-accent-foreground" onClick={handleSave}>
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <>
            <Card className="rounded-2xl border-none bg-card shadow-xl">
              <CardHeader>
                <CardTitle className="font-headline">Account Details</CardTitle>
                <CardDescription>Status and identifier.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">User ID (UID)</label>
                  <div className="flex items-center gap-2 rounded-xl bg-secondary/50 p-3">
                    <code className="flex-1 truncate text-sm">{profile.id}</code>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyUid}>
                      {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase text-muted-foreground">Role</span>
                    <p className="font-medium capitalize">{profile.role || 'User'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase text-muted-foreground">Language</span>
                    <p className="font-medium">{profile.languagePreference === 'ar' ? 'Arabic' : 'English'}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase text-muted-foreground">Privacy Status</span>
                  <div className="flex items-center gap-2">
                    {profile.isPublic ? (
                      <Badge className="bg-green-500/10 text-green-500 border-green-500/20">{t('publicProfile')}</Badge>
                    ) : (
                      <Badge variant="secondary">{t('privateProfile')}</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {isOwnProfile && !isPremium && (
              <Card className="rounded-2xl border-none bg-accent/10 border-accent/20 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Zap className="h-24 w-24 text-accent fill-current" />
                </div>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-accent" />
                    Premium Subscription
                  </CardTitle>
                  <CardDescription>Remove all advertisements and support the platform.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">$0.49</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <PayPalButton onApprove={handleActivatePremium} />
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="md:col-span-2">
              <h2 className="font-headline text-2xl font-bold mb-6 flex items-center gap-2">
                <Bookmark className="h-6 w-6 text-accent" />
                {isOwnProfile ? t('watchlist') : t('userLibrary')}
              </h2>
              <Tabs defaultValue="watching" className="w-full">
                <TabsList className="mb-8 grid w-full max-w-md grid-cols-3 rounded-xl bg-secondary p-1">
                  <TabsTrigger value="watching" className="rounded-lg gap-2">
                    <Eye className="h-4 w-4" />
                    {t('watching')}
                  </TabsTrigger>
                  <TabsTrigger value="watchlist" className="rounded-lg gap-2">
                    <Bookmark className="h-4 w-4" />
                    {t('watchLater')}
                  </TabsTrigger>
                  <TabsTrigger value="favorites" className="rounded-lg gap-2">
                    <Heart className="h-4 w-4" />
                    {t('favorites')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="watching">
                  {watchingAnime && watchingAnime.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {watchingAnime.map(anime => (
                        <AnimeCard key={anime.id} anime={anime} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic py-12 text-center bg-secondary/10 rounded-2xl">No public items in this category.</p>
                  )}
                </TabsContent>

                <TabsContent value="watchlist">
                  {watchlistAnime && watchlistAnime.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {watchlistAnime.map(anime => (
                        <AnimeCard key={anime.id} anime={anime} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic py-12 text-center bg-secondary/10 rounded-2xl">No public items in this category.</p>
                  )}
                </TabsContent>

                <TabsContent value="favorites">
                  {favoritesAnime && favoritesAnime.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {favoritesAnime.map(anime => (
                        <AnimeCard key={anime.id} anime={anime} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic py-12 text-center bg-secondary/10 rounded-2xl">No public items in this category.</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 py-12">
        <Suspense fallback={<div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
          <ProfileContent />
        </Suspense>
      </main>
    </div>
  );
}
