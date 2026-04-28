
"use client";

import { Navbar } from '../../components/layout/Navbar';
import { AnimeCard } from '../../components/anime/AnimeCard';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '../../firebase/index';
import { doc, collection, query, where, documentId, orderBy } from 'firebase/firestore';
import { useLanguage } from '../../components/providers/LanguageContext';
import { Loader2, Bookmark, Heart, History, PlayCircle, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '../../components/ui/card';

export default function WatchlistPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { t, language } = useLanguage();

  const profileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);

  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef);

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

  const { data: watchlistAnime, isLoading: isWatchlistLoading } = useCollection(watchlistQuery);
  const { data: favoritesAnime, isLoading: isFavoritesLoading } = useCollection(favoritesQuery);
  const { data: completedAnime, isLoading: isCompletedLoading } = useCollection(completedQuery);
  const { data: watchHistory, isLoading: isHistoryLoading } = useCollection(historyQuery);

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

        <Tabs defaultValue="watchlist" className="w-full">
          <TabsList className="mb-8 flex w-full max-w-xl overflow-x-auto rounded-xl bg-secondary p-1">
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
          </TabsList>

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
        </Tabs>
      </main>
    </div>
  );
}
