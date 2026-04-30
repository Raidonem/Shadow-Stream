
"use client";

import { Navbar } from '../../components/layout/Navbar';
import { AnimeCard } from '../../components/anime/AnimeCard';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '../../firebase/index';
import { doc, collection, query, where, documentId, orderBy, serverTimestamp } from 'firebase/firestore';
import { deleteDocumentNonBlocking, setDocumentNonBlocking, addDocumentNonBlocking } from '../../firebase/non-blocking-updates';
import { useLanguage } from '../../components/providers/LanguageContext';
import { Loader2, Bookmark, Heart, History, PlayCircle, CheckCircle2, Eye, Users, UserPlus, UserMinus, Check, X, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '../../components/ui/card';
import { Avatar as UIAvatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';

export default function WatchlistPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();

  const profileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);

  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef);

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

  const completedQuery = useMemoFirebase(() => {
    if (!db || !profile?.completedAnimeIds?.length) return null;
    return query(collection(db, 'anime'), where(documentId(), 'in', profile.completedAnimeIds.slice(0, 10)));
  }, [db, profile?.completedAnimeIds]);

  const historyQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'history'), orderBy('watchedAt', 'desc'));
  }, [db, user]);

  const friendshipsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'friendships'), where('userIds', 'array-contains', user.uid));
  }, [db, user]);

  const incomingRequestsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'friend_requests'), where('receiverId', '==', user.uid), where('status', '==', 'pending'));
  }, [db, user]);

  const { data: watchingAnime, isLoading: isWatchingLoading } = useCollection(watchingQuery);
  const { data: watchlistAnime, isLoading: isWatchlistLoading } = useCollection(watchlistQuery);
  const { data: favoritesAnime, isLoading: isFavoritesLoading } = useCollection(favoritesQuery);
  const { data: completedAnime, isLoading: isCompletedLoading } = useCollection(completedQuery);
  const { data: watchHistory, isLoading: isHistoryLoading } = useCollection(historyQuery);
  const { data: friendships, isLoading: isFriendsLoading } = useCollection(friendshipsQuery);
  const { data: incomingRequests } = useCollection(incomingRequestsQuery);

  const friendIds = friendships?.map(f => f.userIds.find(id => id !== user?.uid)).filter(Boolean) as string[] || [];
  
  const friendsProfilesQuery = useMemoFirebase(() => {
    if (!db || !friendIds.length) return null;
    return query(collection(db, 'users'), where(documentId(), 'in', friendIds.slice(0, 10)));
  }, [db, friendIds]);
  
  const { data: friendProfiles } = useCollection(friendsProfilesQuery);

  const requesterIds = incomingRequests?.map(r => r.senderId) || [];
  const requesterProfilesQuery = useMemoFirebase(() => {
    if (!db || !requesterIds.length) return null;
    return query(collection(db, 'users'), where(documentId(), 'in', requesterIds.slice(0, 10)));
  }, [db, requesterIds]);

  const { data: requesterProfiles } = useCollection(requesterProfilesQuery);

  const handleAccept = (senderId: string) => {
    if (!db || !user) return;
    const friendshipId = user.uid < senderId ? `${user.uid}_${senderId}` : `${senderId}_${user.uid}`;
    const requestId = `${senderId}_${user.uid}`;

    setDocumentNonBlocking(doc(db, 'friendships', friendshipId), {
      id: friendshipId,
      userIds: [user.uid, senderId].sort(),
      createdAt: serverTimestamp()
    }, { merge: true });

    deleteDocumentNonBlocking(doc(db, 'friend_requests', requestId));

    // Send notification to sender
    addDocumentNonBlocking(collection(db, 'users', senderId, 'notifications'), {
      type: 'friend_accepted',
      fromId: user.uid,
      fromName: profile?.displayName || profile?.username,
      link: `/profile?uid=${user.uid}`,
      messageEn: `${profile?.displayName || profile?.username} accepted your friend request.`,
      messageAr: `قبول ${profile?.displayName || profile?.username} طلب الصداقة الخاص بك.`,
      read: false,
      createdAt: serverTimestamp()
    });

    toast({ title: "Friend Request Accepted!" });
  };

  const handleDecline = (senderId: string) => {
    if (!db || !user) return;
    const requestId = `${senderId}_${user.uid}`;
    deleteDocumentNonBlocking(doc(db, 'friend_requests', requestId));
    toast({ title: "Friend Request Declined." });
  };

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">{language === 'ar' ? 'يرجى تسجيل الدخول' : 'Please Login'}</h1>
          <Link href="/login" className="text-accent hover:underline">{t('login')}</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12 md:px-8">
        <div className="mb-12 space-y-2">
          <h1 className="font-headline text-4xl font-bold">{language === 'ar' ? 'مجموعتي' : 'My Library'}</h1>
          <p className="text-muted-foreground">{language === 'ar' ? 'أفلامك ومسلسلاتك المفضلة والمحفوظة' : 'Your favorited and saved anime collection'}</p>
        </div>

        <Tabs defaultValue="watching" className="w-full">
          <TabsList className="mb-8 flex w-full max-w-4xl overflow-x-auto rounded-xl bg-secondary p-1">
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
            <TabsTrigger value="completed" className="rounded-lg gap-2 flex-1">
              <CheckCircle2 className="h-4 w-4" />
              {t('completed')}
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg gap-2 flex-1">
              <History className="h-4 w-4" />
              {t('history')}
            </TabsTrigger>
            <TabsTrigger value="friends" className="rounded-lg gap-2 flex-1">
              <Users className="h-4 w-4" />
              {language === 'ar' ? 'الأصدقاء' : 'Friends'}
              {(incomingRequests?.length || 0) > 0 && <span className="ml-1 flex h-2 w-2 rounded-full bg-accent" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="watching">
            {isWatchingLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : watchingAnime && watchingAnime.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {watchingAnime.map(anime => (
                  <AnimeCard key={anime.id} anime={anime} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-secondary/20 rounded-3xl border border-dashed">
                <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">{language === 'ar' ? 'لا توجد عناصر تشاهدها حالياً' : 'No items in your currently watching list'}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="watchlist">
            {isWatchlistLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : watchlistAnime && watchlistAnime.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {watchlistAnime.map(anime => (
                  <AnimeCard key={anime.id} anime={anime} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-secondary/20 rounded-3xl border border-dashed">
                <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">{language === 'ar' ? 'لا توجد عناصر في قائمة المشاهدة لاحقاً' : 'No items in your watch later list'}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites">
            {isFavoritesLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : favoritesAnime && favoritesAnime.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {favoritesAnime.map(anime => (
                  <AnimeCard key={anime.id} anime={anime} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-secondary/20 rounded-3xl border border-dashed">
                <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">{language === 'ar' ? 'لا توجد عناصر في المفضلة' : 'No items in your favorites'}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {isCompletedLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : completedAnime && completedAnime.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {completedAnime.map(anime => (
                  <AnimeCard key={anime.id} anime={anime} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-secondary/20 rounded-3xl border border-dashed">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">{language === 'ar' ? 'لا توجد أنميات مكتملة بعد' : 'No completed anime yet'}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            {isHistoryLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : watchHistory && watchHistory.length > 0 ? (
              <div className="grid gap-4">
                {watchHistory.map(entry => {
                  const thumbnail = (entry.thumbnail || '').trim() !== '' ? entry.thumbnail : 'https://picsum.photos/seed/placeholder/320/180';
                  return (
                    <Link key={entry.id} href={`/watch/${entry.episodeId}?animeId=${entry.animeId}`}>
                      <Card className="overflow-hidden border-none bg-secondary/30 transition-colors hover:bg-secondary/50">
                        <CardContent className="flex items-center gap-4 p-3">
                          <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg">
                            <Image src={thumbnail} alt={entry.episodeTitleEn} fill className="object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                              <PlayCircle className="h-10 w-10 text-white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-accent uppercase tracking-wider">
                              {language === 'ar' ? entry.animeTitleAr : entry.animeTitleEn}
                            </p>
                            <h4 className="font-bold truncate text-lg">
                              {language === 'ar' ? 'الحلقة' : 'Episode'} {entry.episodeNumber}: {language === 'ar' ? entry.episodeTitleAr : entry.episodeTitleEn}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {entry.watchedAt?.toDate?.()?.toLocaleString() || 'Recently'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-secondary/20 rounded-3xl border border-dashed">
                <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">{language === 'ar' ? 'لم يتم العثور على سجل مشاهدة' : 'No watch history found'}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="friends" className="space-y-12">
            {requesterProfiles && requesterProfiles.length > 0 && (
              <div className="space-y-4">
                <h2 className="flex items-center gap-2 font-headline text-xl font-bold">
                  <Clock className="h-5 w-5 text-accent" />
                  {language === 'ar' ? 'طلبات الصداقة المعلقة' : 'Pending Invites'}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {requesterProfiles.map(requester => (
                    <Card key={requester.id} className="overflow-hidden bg-accent/5 border border-accent/20">
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <UIAvatar className="h-10 w-10">
                            <AvatarFallback className="bg-accent/20 text-accent font-bold">
                              {(requester.displayName || requester.username || 'U')[0]?.toUpperCase()}
                            </AvatarFallback>
                          </UIAvatar>
                          <div className="min-w-0">
                            <h3 className="font-bold truncate text-sm">{requester.displayName || requester.username}</h3>
                            <p className="text-xs text-muted-foreground">@{requester.username}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button size="icon" className="h-8 w-8 rounded-full bg-accent hover:bg-accent/90" onClick={() => handleAccept(requester.id)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-destructive" onClick={() => handleDecline(requester.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h2 className="flex items-center gap-2 font-headline text-xl font-bold">
                <Users className="h-5 w-5 text-primary" />
                {language === 'ar' ? 'الأصدقاء' : 'My Friends'}
              </h2>
              {isFriendsLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : friendProfiles && friendProfiles.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {friendProfiles.map(friend => (
                    <Card key={friend.id} className="overflow-hidden bg-card border-none shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => router.push(`/profile?uid=${friend.id}`)}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <UIAvatar className="h-12 w-12 ring-2 ring-primary/20">
                          <AvatarFallback className="bg-primary/20 text-primary font-bold">
                            {(friend.displayName || friend.username || 'U')[0]?.toUpperCase()}
                          </AvatarFallback>
                        </UIAvatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold truncate">{friend.displayName || friend.username}</h3>
                          <p className="text-xs text-accent">@{friend.username}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                            <Users className="h-3 w-3" /> Friend
                            {friend.isPremium && <Badge variant="secondary" className="h-4 text-[8px] bg-accent text-accent-foreground px-1">PREMIUM</Badge>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-secondary/20 rounded-3xl border border-dashed">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">{language === 'ar' ? 'ليس لديك أصدقاء بعد' : 'You have no friends added yet'}</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
