
"use client";

import { use } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Star, Play, Heart, Plus, Calendar, Loader2, Bookmark } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { doc, collection, arrayUnion, arrayRemove, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/components/providers/LanguageContext';
import { translations } from '@/lib/i18n';

export default function AnimeDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { language, t } = useLanguage();

  const animeRef = useMemoFirebase(() => {
    if (!db) return null;
    return doc(db, 'anime', id);
  }, [db, id]);

  const episodesRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'anime', id, 'episodes');
  }, [db, id]);

  const { data: anime, isLoading: isAnimeLoading } = useDoc(animeRef);
  const { data: episodes, isLoading: isEpisodesLoading } = useCollection(episodesRef);

  const profileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);

  const { data: profile } = useDoc(profileRef);
  const isInWatchlist = profile?.watchlistAnimeIds?.includes(id);
  const isFavorite = profile?.favoriteAnimeIds?.includes(id);

  const title = (language === 'ar' ? anime?.titleAr : anime?.titleEn) || '';
  const description = (language === 'ar' ? anime?.descriptionAr : anime?.descriptionEn) || '';
  const tTags = translations[language].tags;

  const toggleWatchlist = async () => {
    if (!user || !profileRef) {
      toast({ title: t('login'), description: "Sign in to manage your watchlist." });
      return;
    }

    try {
      await updateDoc(profileRef, {
        watchlistAnimeIds: isInWatchlist ? arrayRemove(id) : arrayUnion(id)
      });
      toast({ 
        title: isInWatchlist ? (language === 'ar' ? 'تمت الإزالة من المشاهدة لاحقاً' : "Removed from Watch Later") : (language === 'ar' ? 'تمت الإضافة إلى المشاهدة لاحقاً' : "Added to Watch Later"),
        description: title 
      });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFavorite = async () => {
    if (!user || !profileRef) {
      toast({ title: t('login'), description: "Sign in to favorite this series." });
      return;
    }

    try {
      await updateDoc(profileRef, {
        favoriteAnimeIds: isFavorite ? arrayRemove(id) : arrayUnion(id)
      });
      toast({ 
        title: isFavorite ? (language === 'ar' ? 'تمت الإزالة من المفضلة' : "Removed from Favorites") : (language === 'ar' ? 'تمت الإضافة إلى المفضلة' : "Added to Favorites"),
        description: title 
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (isAnimeLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!anime) return <div className="text-center py-20">Anime not found.</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header / Backdrop */}
      <div className="relative h-[60vh] w-full">
        <Image
          src={anime.bannerImage}
          alt={title || 'Anime Banner'}
          fill
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        <div className="container relative mx-auto flex h-full items-end px-4 pb-12 md:px-8">
          <div className="flex flex-col gap-8 md:flex-row w-full">
            <div className="relative hidden aspect-[2/3] w-64 shrink-0 overflow-hidden rounded-2xl shadow-2xl md:block">
              <Image
                src={anime.coverImage}
                alt={title || 'Anime Cover'}
                fill
                className="object-cover"
              />
            </div>
            
            <div className="space-y-6 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                {anime.genres?.map(genre => (
                  <Badge key={genre} variant="secondary" className="bg-primary/20 hover:bg-primary/30 border-none px-3">
                    {tTags[genre as keyof typeof tTags]}
                  </Badge>
                ))}
              </div>
              
              <h1 className="font-headline text-4xl font-bold md:text-6xl">{title}</h1>
              
              <div className="flex flex-wrap items-center gap-6 text-sm font-medium">
                <div className="flex items-center gap-1 text-yellow-400">
                  <Star className="h-5 w-5 fill-current" />
                  <span className="text-lg font-bold">{anime.rating?.toFixed(1) || '0.0'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {anime.releaseYear}
                </div>
                <Badge variant="outline" className="text-accent border-accent">
                  {anime.status}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-4">
                {episodes && episodes.length > 0 ? (
                  <Link href={`/watch/${episodes[0].id}?animeId=${id}`}>
                    <Button size="lg" className="h-14 gap-2 rounded-xl bg-accent px-8 text-lg font-bold text-accent-foreground hover:bg-accent/90">
                      <Play className="h-6 w-6 fill-current" />
                      {language === 'ar' ? 'ابدأ المشاهدة' : 'Start Watching'}
                    </Button>
                  </Link>
                ) : (
                  <Button size="lg" disabled className="h-14 gap-2 rounded-xl px-8 text-lg font-bold">
                    {language === 'ar' ? 'قريباً' : 'Coming Soon'}
                  </Button>
                )}
                <Button 
                  size="lg" 
                  variant={isFavorite ? "default" : "secondary"} 
                  className="h-14 gap-2 rounded-xl px-6 text-lg font-bold"
                  onClick={toggleFavorite}
                >
                  <Heart className={`h-6 w-6 ${isFavorite ? 'fill-destructive text-destructive' : ''}`} />
                  {t('favorite')}
                </Button>
                <Button 
                  size="lg" 
                  variant={isInWatchlist ? "default" : "secondary"} 
                  className="h-14 gap-2 rounded-xl px-6 text-lg font-bold"
                  onClick={toggleWatchlist}
                >
                  <Bookmark className={`h-6 w-6 ${isInWatchlist ? 'fill-accent text-accent' : ''}`} />
                  {t('watchLater')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-12 md:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_350px]">
          <div className="space-y-12">
            <section className="space-y-4">
              <h2 className="font-headline text-2xl font-bold">{language === 'ar' ? 'القصة' : 'Synopsis'}</h2>
              <p className="text-lg leading-relaxed text-muted-foreground">
                {description}
              </p>
            </section>

            <section className="space-y-6">
              <Tabs defaultValue="episodes" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl bg-secondary p-1">
                  <TabsTrigger value="episodes" className="rounded-lg">{t('episodes')}</TabsTrigger>
                  <TabsTrigger value="details" className="rounded-lg">{language === 'ar' ? 'تفاصيل' : 'Details'}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="episodes" className="mt-8 space-y-4">
                  {episodes?.sort((a, b) => a.episodeNumber - b.episodeNumber).map((ep) => (
                    <Link key={ep.id} href={`/watch/${ep.id}?animeId=${id}`} className="group flex items-center gap-4 rounded-xl border bg-card p-3 transition-colors hover:border-accent hover:bg-accent/5">
                      <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={ep.thumbnail}
                          alt={(language === 'ar' ? ep.titleAr : ep.titleEn) || 'Episode Thumbnail'}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 bg-black/40">
                          <Play className="h-8 w-8 text-white fill-current" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <span className="text-xs font-bold text-accent">{language === 'ar' ? 'الحلقة' : 'EPISODE'} {ep.episodeNumber}</span>
                        <h3 className="font-bold">{language === 'ar' ? ep.titleAr : ep.titleEn}</h3>
                        <p className="text-xs text-muted-foreground">{ep.duration}</p>
                      </div>
                    </Link>
                  ))}
                  {!isEpisodesLoading && (!episodes || episodes.length === 0) && (
                    <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
                      {language === 'ar' ? 'حلقات جديدة قادمة قريباً!' : 'New episodes coming soon!'}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="details" className="mt-8">
                  <div className="grid grid-cols-2 gap-8 rounded-2xl bg-secondary/30 p-8">
                    <div>
                      <span className="text-xs font-bold uppercase text-muted-foreground">{t('status')}</span>
                      <p className="font-medium">{anime.status}</p>
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase text-muted-foreground">{t('year')}</span>
                      <p className="font-medium">{anime.releaseYear}</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </section>
          </div>

          <aside className="space-y-8">
            {/* Top Members section removed */}
          </aside>
        </div>
      </main>
    </div>
  );
}
