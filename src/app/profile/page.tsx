
"use client";

import { useState, useEffect, Suspense, useMemo } from 'react';
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
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection, useAuth } from '../../firebase/index';
import { doc, collection, query, where, documentId, getDocs, serverTimestamp, arrayUnion, orderBy } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '../../firebase/non-blocking-updates';
import { updateUserPassword } from '../../firebase/non-blocking-login';
import { 
  User as UserIcon, 
  Shield, 
  ShieldCheck, 
  Copy, 
  Edit3, 
  Save, 
  Settings2,
  Sparkles,
  Loader2,
  Bookmark,
  Heart,
  Eye,
  Clock,
  History,
  Bell,
  Slash,
  Ban,
  ImageIcon,
  AtSign
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useLanguage } from '../../components/providers/LanguageContext';
import { useTheme } from '../../components/providers/ThemeContext';
import { Badge } from '../../components/ui/badge';
import { useSearchParams } from 'next/navigation';
import { AnimeCard } from '../../components/anime/AnimeCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { differenceInDays } from 'date-fns';
import { ModerationLog, UserProfile, AvatarItem } from '../../lib/types';
import { cn } from '../../lib/utils';
import Image from 'next/image';

function ProfileContent() {
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  
  const targetUid = searchParams.get('uid') || authUser?.uid;
  const isOwnProfile = !searchParams.get('uid') || searchParams.get('uid') === authUser?.uid;

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  const [editData, setEditData] = useState({
    username: '',
    displayName: '',
    languagePreference: 'en',
    themePreference: 'dark',
    isPublic: false,
    avatarId: ''
  });

  const [passwordData, setPasswordData] = useState({
    current: '',
    new: ''
  });

  const profileRef = useMemoFirebase(() => {
    if (!targetUid || !db) return null;
    return doc(db, 'users', targetUid);
  }, [targetUid, db]);

  const authProfileRef = useMemoFirebase(() => {
    if (!authUser || !db) return null;
    return doc(db, 'users', authUser.uid);
  }, [authUser?.uid, db]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(profileRef);
  const { data: authProfile } = useDoc<UserProfile>(authProfileRef);

  const avatarsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'avatars'), orderBy('createdAt', 'desc'));
  }, [db]);
  const { data: officialAvatars } = useCollection<AvatarItem>(avatarsQuery);

  const isAdminSession = authProfile?.role === 'admin';

  const moderationLogsQuery = useMemoFirebase(() => {
    if (!db || !targetUid || !isAdminSession) return null;
    return query(collection(db, 'users', targetUid, 'moderation_logs'), orderBy('createdAt', 'desc'));
  }, [db, targetUid, isAdminSession]);

  const { data: moderationLogs } = useCollection<ModerationLog>(moderationLogsQuery);

  const watchingQuery = useMemoFirebase(() => {
    if (!db || !profile?.currentlyWatchingAnimeIds?.length) return null;
    return query(collection(db, 'anime'), where(documentId(), 'in', profile.currentlyWatchingAnimeIds.slice(0, 10)));
  }, [db, profile?.currentlyWatchingAnimeIds?.join(',')]);

  const watchlistQuery = useMemoFirebase(() => {
    if (!db || !profile?.watchlistAnimeIds?.length) return null;
    return query(collection(db, 'anime'), where(documentId(), 'in', profile.watchlistAnimeIds.slice(0, 10)));
  }, [db, profile?.watchlistAnimeIds?.join(',')]);

  const favoritesQuery = useMemoFirebase(() => {
    if (!db || !profile?.favoriteAnimeIds?.length) return null;
    return query(collection(db, 'anime'), where(documentId(), 'in', profile.favoriteAnimeIds.slice(0, 10)));
  }, [db, profile?.favoriteAnimeIds?.join(',')]);

  const { data: watchingAnime } = useCollection(watchingQuery);
  const { data: watchlistAnime } = useCollection(watchlistQuery);
  const { data: favoritesAnime } = useCollection(favoritesQuery);

  const isAdmin = profile?.role === 'admin';
  const isPremium = profile?.isPremium === true;

  useEffect(() => {
    if (profile && isOwnProfile) {
      setEditData({
        username: profile.username || '',
        displayName: profile.displayName || profile.username || '',
        languagePreference: profile.languagePreference || 'en',
        themePreference: profile.themePreference || 'dark',
        isPublic: profile.isPublic || false,
        avatarId: profile.avatarId || ''
      });
    }
  }, [profile, isOwnProfile]);

  const handleSave = async () => {
    if (!profileRef || !db || !targetUid || !editData.displayName.trim() || !editData.username.trim()) {
      toast({
        title: "Error",
        description: "Display Name and Username cannot be empty.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      const usernameChanged = editData.username.toLowerCase() !== profile?.username?.toLowerCase();
      
      if (usernameChanged) {
        const lastChange = profile?.lastUsernameChange?.toDate?.() || new Date(0);
        const now = new Date();
        const daysSinceLastChange = differenceInDays(now, lastChange);
        const requiredCooldown = isPremium ? 2 : 30;

        if (daysSinceLastChange < requiredCooldown) {
          const errorMsg = isPremium 
            ? t('usernamePremiumCooldown') 
            : t('usernameCooldown').replace('{days}', '30');
          toast({ title: "Cooldown Active", description: errorMsg, variant: "destructive" });
          setIsSaving(false);
          return;
        }

        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', editData.username.toLowerCase()));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          toast({ title: "Error", description: t('usernameTaken'), variant: "destructive" });
          setIsSaving(false);
          return;
        }
      }

      const profileUpdate: any = {
        displayName: editData.displayName,
        languagePreference: editData.languagePreference,
        themePreference: editData.themePreference,
        isPublic: editData.isPublic,
        avatarId: editData.avatarId,
        updatedAt: serverTimestamp()
      };

      if (usernameChanged) {
        profileUpdate.username = editData.username.toLowerCase();
        profileUpdate.lastUsernameChange = serverTimestamp();
      }

      updateDocumentNonBlocking(profileRef, profileUpdate);

      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: usernameChanged ? t('usernameChanged') : "Your settings have been synced successfully."
      });
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err.message || "Something went wrong while saving your profile.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.current || !passwordData.new) {
      toast({ title: "Error", description: "All password fields are required.", variant: "destructive" });
      return;
    }
    if (passwordData.new.length < 6) {
      toast({ title: "Error", description: "New password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updateUserPassword(auth, passwordData.current, passwordData.new);
      toast({ title: t('passwordChangeSuccess') });
      setPasswordData({ current: '', new: '' });
    } catch (error: any) {
      toast({ 
        title: "Update Failed", 
        description: error.code === 'auth/wrong-password' ? "Invalid current password." : error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const copyUid = () => {
    if (!targetUid) return;
    navigator.clipboard.writeText(targetUid);
    toast({ title: "Copied to clipboard" });
  };

  if (isAuthLoading || isProfileLoading) {
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const userInitial = (profile?.displayName || profile?.username || 'U')[0];
  const resolvedAvatar = officialAvatars?.find(a => a.id === profile?.avatarId)?.url;

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
        <div className="relative">
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/20 text-4xl font-bold text-primary ring-4 ring-background shadow-xl overflow-hidden">
            {resolvedAvatar ? (
              <Image src={resolvedAvatar} alt={profile?.displayName || ''} fill className="object-cover" />
            ) : (
              userInitial.toUpperCase()
            )}
          </div>
          {isPremium && (
            <div className="absolute -bottom-2 -right-2 rounded-full bg-accent p-2 text-accent-foreground shadow-lg">
              <Sparkles className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="font-headline text-4xl font-bold">{profile?.displayName || profile?.username}</h1>
            {isAdmin && <ShieldCheck className="h-6 w-6 text-accent" />}
          </div>
          <p className="text-accent font-medium text-lg">@{profile?.username}</p>
        </div>
        {isOwnProfile && (
          <Button variant={isEditing ? "outline" : "default"} onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </Button>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {isEditing && isOwnProfile ? (
          <div className="md:col-span-2 space-y-8">
            <Card className="rounded-2xl border-none bg-card shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-accent" />
                  General Settings
                </CardTitle>
                <CardDescription>Update your public identity and preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Choose Profile Picture
                  </Label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                    <button 
                      onClick={() => setEditData({...editData, avatarId: ''})}
                      className={cn(
                        "aspect-square rounded-xl bg-secondary flex items-center justify-center border-2 transition-all",
                        editData.avatarId === '' ? "border-accent ring-2 ring-accent/20" : "border-transparent hover:border-accent/50"
                      )}
                    >
                      <UserIcon className="h-6 w-6 text-muted-foreground" />
                    </button>
                    {officialAvatars?.map((avatar) => (
                      <button 
                        key={avatar.id}
                        onClick={() => setEditData({...editData, avatarId: avatar.id})}
                        className={cn(
                          "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                          editData.avatarId === avatar.id ? "border-accent ring-2 ring-accent/20 scale-105" : "border-transparent hover:border-accent/50"
                        )}
                      >
                        <Image src={avatar.url} alt="Official Avatar" fill className="object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-displayName">Display Name</Label>
                    <Input id="edit-displayName" value={editData.displayName} onChange={(e) => setEditData({...editData, displayName: e.target.value})} className="rounded-xl border-none bg-secondary/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-username">Username</Label>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="edit-username" value={editData.username} onChange={(e) => setEditData({...editData, username: e.target.value})} className="rounded-xl border-none bg-secondary/50 pl-10" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-dashed">
                  <div className="space-y-0.5">
                    <Label className="text-base font-bold">Public Profile</Label>
                    <p className="text-xs text-muted-foreground">Allow others to see your library and activity.</p>
                  </div>
                  <Switch checked={editData.isPublic} onCheckedChange={(val) => setEditData({...editData, isPublic: val})} />
                </div>
              </CardContent>
              <CardFooter className="justify-end border-t pt-6">
                <Button onClick={handleSave} disabled={isSaving} className="rounded-xl bg-accent gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </CardFooter>
            </Card>

            <Card className="rounded-2xl border-none bg-card shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Security & Access
                </CardTitle>
                <CardDescription>Manage your authentication details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Change Password</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Current Password</Label>
                      <Input type="password" value={passwordData.current} onChange={(e) => setPasswordData({...passwordData, current: e.target.value})} className="rounded-xl border-none bg-secondary/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>New Password</Label>
                      <Input type="password" value={passwordData.new} onChange={(e) => setPasswordData({...passwordData, new: e.target.value})} className="rounded-xl border-none bg-secondary/50" />
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleChangePassword} disabled={isUpdatingPassword} className="w-full md:w-auto rounded-xl">
                    {isUpdatingPassword && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Update Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {isAdminSession && moderationLogs && moderationLogs.length > 0 && (
              <Card className="rounded-2xl border-none bg-destructive/5 shadow-xl md:col-span-2">
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2 text-destructive">
                    <History className="h-5 w-5" />
                    {t('actionLogs')}
                  </CardTitle>
                  <CardDescription>Administrative actions taken against this user.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {moderationLogs.map(log => (
                      <div key={log.id} className="flex items-start justify-between p-4 rounded-xl bg-background/50 border border-destructive/10">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="uppercase font-bold text-[10px]">
                              {log.action === 'warning' ? <Bell className="h-3 w-3 mr-1" /> : log.action === 'restriction' ? <Slash className="h-3 w-3 mr-1" /> : <Ban className="h-3 w-3 mr-1" />}
                              {log.action}
                            </Badge>
                            <span className="text-xs font-bold text-muted-foreground">{log.createdAt?.toDate?.()?.toLocaleString()}</span>
                          </div>
                          <p className="text-sm font-medium">{log.reason}</p>
                          <p className="text-[10px] text-muted-foreground">Admin: {log.adminName} ({log.duration})</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="rounded-2xl border-none bg-card shadow-xl">
              <CardHeader><CardTitle>Account Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase text-muted-foreground">User ID</span>
                  <div className="flex items-center gap-2 bg-secondary/30 p-2 rounded-lg">
                    <code className="text-xs truncate flex-1">{profile?.id}</code>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyUid}><Copy className="h-4 w-4" /></Button>
                  </div>
                </div>
                {(profile?.restrictedUntil || profile?.suspendedUntil) && (
                  <div className="space-y-2 pt-2">
                    {profile?.restrictedUntil && profile.restrictedUntil.toDate() > new Date() && (
                      <Badge variant="outline" className="w-full justify-start py-2 px-3 border-destructive/20 text-destructive gap-2">
                        <Slash className="h-4 w-4" />
                        {t('restrictedUntil').replace('{date}', profile.restrictedUntil.toDate().toLocaleDateString())}
                      </Badge>
                    )}
                    {profile?.suspendedUntil && profile.suspendedUntil.toDate() > new Date() && (
                      <Badge variant="destructive" className="w-full justify-start py-2 px-3 gap-2">
                        <Ban className="h-4 w-4" />
                        {t('suspendedUntil').replace('{date}', profile.suspendedUntil.toDate().toLocaleDateString())}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="md:col-span-2">
              <h2 className="font-headline text-2xl font-bold mb-6 flex items-center gap-2">
                <Bookmark className="h-6 w-6 text-accent" />
                {isOwnProfile ? t('watchlist') : t('userLibrary')}
              </h2>
              
              <Tabs defaultValue="watching" className="w-full">
                <TabsList className="mb-6 flex w-full max-w-2xl overflow-x-auto rounded-xl bg-secondary p-1">
                  <TabsTrigger value="watching" className="rounded-lg gap-2 flex-1">
                    <Eye className="h-4 w-4" />
                    {t('currentlyWatching')}
                  </TabsTrigger>
                  <TabsTrigger value="watchlist" className="rounded-lg gap-2 flex-1">
                    <Bookmark className="h-4 w-4" />
                    {t('watchLater')}
                  </TabsTrigger>
                  <TabsTrigger value="favorites" className="rounded-lg gap-2 flex-1">
                    <Heart className="h-4 w-4" />
                    {t('myFavorites')}
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
                    <div className="text-center py-12 bg-secondary/20 rounded-2xl border border-dashed">
                      <p className="text-muted-foreground italic">No currently watching anime found.</p>
                    </div>
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
                    <div className="text-center py-12 bg-secondary/20 rounded-2xl border border-dashed">
                      <p className="text-muted-foreground italic">No watch later items found.</p>
                    </div>
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
                    <div className="text-center py-12 bg-secondary/20 rounded-2xl border border-dashed">
                      <p className="text-muted-foreground italic">No favorite anime found.</p>
                    </div>
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
