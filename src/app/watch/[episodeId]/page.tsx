
"use client";

import { useState, use, useEffect, Suspense, useRef, useMemo } from 'react';
import { Navbar } from '../../../components/layout/Navbar';
import { StreamPlayer } from '../../../components/anime/StreamPlayer';
import { AnimeCard } from '../../../components/anime/AnimeCard';
import { Button } from '../../../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { 
  Heart, 
  MessageSquare,
  Send,
  Loader2,
  Star,
  AlertCircle,
  Server,
  Globe,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Layers
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser } from '../../../firebase/index';
import { doc, collection, query, orderBy, serverTimestamp, updateDoc, arrayUnion, arrayRemove, where, getDocs, increment } from 'firebase/firestore';
import { useToast } from '../../../hooks/use-toast';
import { addDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking } from '../../../firebase/non-blocking-updates';
import { useLanguage } from '../../../components/providers/LanguageContext';
import { translations } from '../../../lib/i18n';
import { EpisodeServer, Anime } from '../../../lib/types';
import { cn, normalizeSearchString } from '../../../lib/utils';
import { AdBanner } from '../../../components/ads/AdBanner';

function WatchContent({ episodeId }: { episodeId: string }) {
  const searchParams = useSearchParams();
  const animeId = searchParams.get('animeId');
  
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { language, t } = useLanguage();

  const [commentText, setCommentText] = useState('');
  const [activeServer, setActiveServer] = useState<EpisodeServer | null>(null);
  const [isManualServerSelection, setIsManualServerSelection] = useState(false);
  const loadedEpisodeId = useRef<string | null>(null);
  const incrementedViews = useRef<string | null>(null);

  const episodeRef = useMemoFirebase(() => {
    if (!db || !animeId || !episodeId) return null;
    return doc(db, 'anime', animeId, 'episodes', episodeId);
  }, [db, animeId, episodeId]);

  const animeRef = useMemoFirebase(() => {
    if (!db || !animeId) return null;
    return doc(db, 'anime', animeId);
  }, [db, animeId]);

  const allEpisodesQuery = useMemoFirebase(() => {
    if (!db || !animeId) return null;
    return query(collection(db, 'anime', animeId, 'episodes'), orderBy('episodeNumber', 'asc'));
  }, [db, animeId]);

  const commentsRef = useMemoFirebase(() => {
    if (!db || !animeId || !episodeId) return null;
    return collection(db, 'anime', animeId, 'episodes', episodeId, 'comments');
  }, [db, animeId, episodeId]);

  const commentsQuery = useMemoFirebase(() => {
    if (!commentsRef) return null;
    return query(commentsRef, orderBy('createdAt', 'desc'));
  }, [commentsRef]);

  const episodeRatingRef = useMemoFirebase(() => {
    if (!user || !db || !animeId || !episodeId) return null;
    return doc(db, 'ratings', `${user.uid}_${episodeId}`);
  }, [user, db, animeId, episodeId]);

  const allAnimeQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'anime'));
  }, [db]);

  const { data: episode, isLoading: isEpLoading } = useDoc(episodeRef);
  const { data: anime, isLoading: isAnimeLoading } = useDoc(animeRef);
  const { data: episodes } = useCollection(allEpisodesQuery);
  const { data: comments } = useCollection(commentsQuery);
  const { data: existingRating } = useDoc(episodeRatingRef);
  const { data: allAnime } = useCollection<Anime>(allAnimeQuery);

  const profileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);

  const adminRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'admins', user.uid);
  }, [user, db]);

  const { data: profile } = useDoc(profileRef);
  const { data: adminDoc } = useDoc(adminRef);

  const isAnimeInWatchlist = profile?.watchlistAnimeIds?.includes(animeId || '');
  const isAnimeFavorite = profile?.favoriteAnimeIds?.includes(animeId || '');
  const isAdminUser = !!adminDoc;

  const animeTitle = language === 'ar' ? anime?.titleAr : anime?.titleEn;
  const epTitle = language === 'ar' ? episode?.titleAr : episode?.titleEn;
  const tTags = translations[language].tags;

  // Suggested works logic
  const suggestedAnime = useMemo(() => {
    if (!anime || !allAnime) return [];

    const normalizedCurrentTitle = normalizeSearchString(animeTitle || '');
    const currentGenres = new Set(anime.genres || []);

    return allAnime
      .filter(a => a.id !== anime.id)
      .map(a => {
        let score = 0;
        
        // Name similarity (Priority)
        const aTitleEn = normalizeSearchString(a.titleEn || '');
        const aTitleAr = normalizeSearchString(a.titleAr || '');
        const aAltTitles = (a.alternativeTitles || []).map(t => normalizeSearchString(t));

        if (aTitleEn.includes(normalizedCurrentTitle) || normalizedCurrentTitle.includes(aTitleEn)) score += 10;
        if (aTitleAr.includes(normalizedCurrentTitle) || normalizedCurrentTitle.includes(aTitleAr)) score += 10;
        if (aAltTitles.some(t => t.includes(normalizedCurrentTitle) || normalizedCurrentTitle.includes(t))) score += 10;

        // Shared genres
        const sharedGenres = (a.genres || []).filter(g => currentGenres.has(g)).length;
        score += sharedGenres * 2;

        return { anime: a, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(item => item.anime);
  }, [anime, allAnime, animeTitle]);

  useEffect(() => {
    if (episode?.servers?.length && (loadedEpisodeId.current !== episode.id || !isManualServerSelection)) {
      const preferred = episode.servers.find((s: EpisodeServer) => s.lang === language) || episode.servers[0];
      setActiveServer(preferred);
      loadedEpisodeId.current = episode.id;
    }
  }, [episode, language, isManualServerSelection]);

  useEffect(() => {
    if (user && db && anime && episode && incrementedViews.current !== episode.id) {
      const historyRef = doc(db, 'users', user.uid, 'history', episodeId);
      setDocumentNonBlocking(historyRef, {
        id: episodeId,
        userId: user.uid,
        animeId: anime.id,
        episodeId: episodeId,
        animeTitleEn: anime.titleEn,
        animeTitleAr: anime.titleAr,
        episodeTitleEn: episode.titleEn,
        episodeTitleAr: episode.titleAr,
        episodeNumber: episode.episodeNumber,
        thumbnail: episode.thumbnail,
        watchedAt: serverTimestamp()
      }, { merge: true });

      const viewKey = `ss_viewed_${user.uid}_${episodeId}`;
      const hasViewed = typeof window !== 'undefined' ? localStorage.getItem(viewKey) : null;

      if (!hasViewed && !isAdminUser) {
        const animeDocRef = doc(db, 'anime', anime.id);
        updateDocumentNonBlocking(animeDocRef, {
          views: increment(1),
          updatedAt: serverTimestamp()
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem(viewKey, 'true');
        }
      }

      incrementedViews.current = episode.id;
    }
  }, [user, db, anime, episode, episodeId, isAdminUser]);

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !commentsRef || !commentText.trim() || !episodeId) return;

    addDocumentNonBlocking(commentsRef, {
      userId: user.uid,
      userName: profile?.username || user.displayName || 'User',
      episodeId: episodeId,
      text: commentText,
      isAdmin: isAdminUser,
      isPremium: profile?.isPremium || false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    setCommentText('');
    toast({ title: t('postComment') });
  };

  const handleRate = (rating: number) => {
    if (!user || !db || !animeId || !episodeRatingRef || !episodeId) {
      toast({ title: t('login'), description: "Sign in to rate this episode." });
      return;
    }
    
    const ratingData = {
      userId: user.uid,
      animeId: animeId,
      episodeId: episodeId,
      value: rating,
      updatedAt: serverTimestamp(),
      createdAt: existingRating ? existingRating.createdAt : serverTimestamp()
    };

    setDocumentNonBlocking(episodeRatingRef, ratingData, { merge: true });
    
    const ratingsRef = collection(db, 'ratings');
    
    // Update Episode Average
    getDocs(query(ratingsRef, where('episodeId', '==', episodeId)))
      .then((snapshot) => {
        const episodeRatings = snapshot.docs
          .filter(d => d.id !== episodeRatingRef.id)
          .map(d => d.data().value as number);
        
        episodeRatings.push(rating);
        const epSum = episodeRatings.reduce((acc, val) => acc + val, 0);
        const epAverage = epSum / episodeRatings.length;

        updateDocumentNonBlocking(doc(db, 'anime', animeId, 'episodes', episodeId), {
          rating: epAverage,
          updatedAt: serverTimestamp()
        });
      });

    // Update Anime Average (based on all ratings across all episodes)
    getDocs(query(ratingsRef, where('animeId', '==', animeId)))
      .then((snapshot) => {
        const animeRatings = snapshot.docs
          .filter(d => d.id !== episodeRatingRef.id)
          .map(d => d.data().value as number);
        
        animeRatings.push(rating);
        const sum = animeRatings.reduce((acc, val) => acc + val, 0);
        const newAverage = sum / animeRatings.length;

        updateDocumentNonBlocking(doc(db, 'anime', animeId), {
          rating: newAverage,
          updatedAt: serverTimestamp()
        });
      });
    
    toast({ title: t('rating'), description: `You rated this episode ${rating} stars!` });
  };

  const toggleAnimeWatchlist = async () => {
    if (!user || !profileRef || !animeId) return;
    try {
      await updateDoc(profileRef, {
        watchlistAnimeIds: isAnimeInWatchlist ? arrayRemove(animeId) : arrayUnion(animeId)
      });
      toast({ title: isAnimeInWatchlist ? "Removed from Watch Later" : "Added to Watch Later" });
    } catch (e) { console.error(e); }
  };

  const toggleAnimeFavorite = async () => {
    if (!user || !profileRef || !animeId) return;
    try {
      await updateDoc(profileRef, {
        favoriteAnimeIds: isAnimeFavorite ? arrayRemove(animeId) : arrayUnion(animeId)
      });
      toast({ title: isAnimeFavorite ? "Removed from Favorites" : "Added to Favorites" });
    } catch (e) { console.error(e); }
  };

  if (!animeId) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold">Invalid Navigation</h1>
        <p className="text-muted-foreground">Anime identifier is missing. Please return to the catalog.</p>
        <Button asChild className="mt-6 rounded-xl">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  if (isEpLoading || isAnimeLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!episode || !anime) return <div className="text-center py-20 font-headline text-2xl">Episode not found.</div>;

  const currentIdx = episodes?.findIndex(e => e.id === episodeId) ?? -1;
  const prevEp = currentIdx > 0 ? episodes?.[currentIdx - 1] : null;
  const nextEp = episodes && currentIdx < episodes.length - 1 ? episodes[currentIdx + 1] : null;

  const serversByLang = episode.servers?.reduce((acc: Record<string, EpisodeServer[]>, server: EpisodeServer) => {
    if (!acc[server.lang]) acc[server.lang] = [];
    acc[server.lang].push(server);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 md:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            <StreamPlayer 
              url={activeServer?.url || null} 
              title={`${animeTitle} - ${language === 'ar' ? 'الحلقة' : 'Episode'} ${episode.episodeNumber} (${activeServer?.name || ''})`} 
            />
            
            <div className="flex items-center justify-between gap-4">
              <Button asChild variant="secondary" disabled={!prevEp} className="rounded-xl">
                {prevEp ? (
                  <Link href={`/watch/${prevEp.id}?animeId=${animeId}`}>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'السابق' : 'Previous'}
                  </Link>
                ) : <span className="opacity-50 flex items-center"><ChevronLeft className="h-4 w-4 mr-2" /> {language === 'ar' ? 'السابق' : 'Previous'}</span>}
              </Button>
              <div className="text-sm font-bold bg-secondary/50 px-4 py-2 rounded-xl">
                {language === 'ar' ? 'الحلقة' : 'Episode'} {episode.episodeNumber}
              </div>
              <Button asChild variant="secondary" disabled={!nextEp} className="rounded-xl">
                {nextEp ? (
                  <Link href={`/watch/${nextEp.id}?animeId=${animeId}`}>
                    {language === 'ar' ? 'التالي' : 'Next'}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Link>
                ) : <span className="opacity-50 flex items-center">{language === 'ar' ? 'التالي' : 'Next'} <ChevronRight className="h-4 w-4 ml-2" /></span>}
              </Button>
            </div>

            <div className="space-y-4 rounded-2xl bg-secondary/30 p-4 border">
              <div className="flex items-center gap-2 mb-2">
                <Server className="h-4 w-4 text-accent" />
                <h3 className="font-bold text-sm uppercase tracking-wider">{language === 'ar' ? 'اختر السيرفر' : 'Select Server'}</h3>
              </div>
              <div className="space-y-4">
                {Object.entries(serversByLang || {}).map(([lang, servers]) => (
                  <div key={lang} className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                      <Globe className="h-3 w-3" />
                      {lang === 'ar' ? 'العربية' : 'English'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(servers as EpisodeServer[]).map((server, idx) => {
                        const isActive = activeServer?.url === server.url && activeServer?.name === server.name;
                        return (
                          <Button
                            key={`${lang}-${idx}`}
                            size="sm"
                            variant={isActive ? "default" : "secondary"}
                            className={cn(
                              "rounded-lg font-bold px-4",
                              isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/10"
                            )}
                            onClick={() => {
                              setActiveServer(server);
                              setIsManualServerSelection(true);
                            }}
                          >
                            {server.name}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="font-headline text-2xl font-bold md:text-3xl">
                    {epTitle}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                    <Link href={`/anime/${anime.id}`} className="text-accent hover:underline font-bold">
                      {animeTitle}
                    </Link>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="text-sm font-bold">{anime.rating?.toFixed(1) || '0.0'} <span className="text-xs text-muted-foreground font-normal">({language === 'ar' ? 'تقييم العمل' : 'Series Rating'})</span></span>
                      </div>
                      {episode.rating !== undefined && (
                        <div className="flex items-center gap-1 text-accent">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="text-sm font-bold">{episode.rating.toFixed(1)} <span className="text-xs text-muted-foreground font-normal">({language === 'ar' ? 'تقييم الحلقة' : 'Episode Rating'})</span></span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant={isAnimeFavorite ? "default" : "secondary"} 
                    className="gap-2 rounded-xl"
                    onClick={toggleAnimeFavorite}
                  >
                    <Heart className={`h-5 w-5 ${isAnimeFavorite ? "fill-current text-destructive" : ""}`} />
                    {isAnimeFavorite ? t('favorites') : t('favorite')}
                  </Button>
                  <Button 
                    variant={isAnimeInWatchlist ? "default" : "secondary"} 
                    className="gap-2 rounded-xl"
                    onClick={toggleAnimeWatchlist}
                  >
                    <Bookmark className={`h-5 w-5 ${isAnimeInWatchlist ? "fill-current text-accent" : ""}`} />
                    {t('watchlist')}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-secondary/20 p-4 rounded-2xl">
                <span className="text-sm font-bold text-muted-foreground uppercase">{language === 'ar' ? 'قيم هذه الحلقة' : 'Rate this Episode'}</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star} 
                      onClick={() => handleRate(star)}
                      className="transition-transform active:scale-90"
                    >
                      <Star 
                        className={`h-6 w-6 ${ (existingRating?.value || 0) >= star ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} 
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <section className="space-y-6 pt-8">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-accent" />
                <h2 className="font-headline text-2xl font-bold">{t('comments')} ({comments?.length || 0})</h2>
              </div>
              
              {user ? (
                <div className="flex gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={`https://picsum.photos/seed/${user.uid}/100`} />
                    <AvatarFallback>{profile?.username?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-4">
                    <Textarea 
                      placeholder={language === 'ar' ? 'انضم إلى المناقشة...' : "Join the discussion..."} 
                      className="min-h-[100px] resize-none rounded-xl bg-secondary/30 focus:ring-accent border-none"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button 
                        onClick={handlePostComment}
                        className="gap-2 rounded-xl bg-accent px-6 font-bold text-accent-foreground"
                        disabled={!commentText.trim()}
                      >
                        <span className="flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          {t('postComment')}
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-secondary/30 p-8 text-center">
                  <p className="text-muted-foreground mb-4">{language === 'ar' ? 'يجب عليك تسجيل الدخول للتعليق.' : "You must be logged in to comment."}</p>
                  <Button asChild variant="outline">
                    <Link href="/login">{t('login')}</Link>
                  </Button>
                </div>
              )}

              <div className="space-y-8 pt-4">
                {comments?.map((c) => (
                  <div key={c.id} className="flex gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`https://picsum.photos/seed/${c.userId}/100`} />
                      <AvatarFallback>{c.userName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{c.userName}</span>
                          {c.isAdmin && (
                            <Badge className="bg-primary/20 text-primary border-none gap-1 px-2 py-0 h-5 text-[10px] font-bold">
                              <ShieldCheck className="h-3 w-3" />
                              ADMIN
                            </Badge>
                          )}
                          {c.isPremium && (
                            <Badge className="bg-accent text-accent-foreground border-none gap-1 px-2 py-0 h-5 text-[10px] font-bold">
                              <Sparkles className="h-3 w-3" />
                              PREMIUM
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground ml-2">
                            {c.createdAt?.toDate?.()?.toLocaleDateString() || 'Just now'}
                          </span>
                        </div>
                      </div>
                      <p className="text-muted-foreground">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Suggested Works Section */}
            {suggestedAnime.length > 0 && (
              <section className="space-y-6 pt-12 border-t mt-12">
                <div className="flex items-center gap-2">
                  <Layers className="h-6 w-6 text-accent" />
                  <h2 className="font-headline text-2xl font-bold">
                    {language === 'ar' ? 'أعمال مقترحة' : 'Suggested Works'}
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {suggestedAnime.map((a) => (
                    <AnimeCard key={a.id} anime={a} />
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-8">
            <section className="rounded-2xl border bg-card p-6">
              <h3 className="mb-4 font-headline text-xl font-bold">{language === 'ar' ? 'مزيد من المعلومات' : 'More Info'}</h3>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('year')}</span>
                  <span className="font-bold">{anime.releaseYear}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{language === 'ar' ? 'التصنيفات' : 'Genres'}</span>
                  <span className="font-bold">{anime.genres?.map(g => tTags[g as keyof typeof tTags]).join(', ')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('status')}</span>
                  <Badge variant="outline" className="text-accent border-accent">{anime.status}</Badge>
                </div>
              </div>
            </section>

            <AdBanner dataAdSlot="0987654321" />

            <section className="rounded-2xl bg-accent/10 p-6">
              <div className="space-y-4">
                <h3 className="font-headline text-xl font-bold text-accent">Enjoying ShadowStream?</h3>
                <p className="text-sm text-muted-foreground">
                  Support the platform and get exclusive badges, ad-free streaming, and early access to episodes.
                </p>
                <Button className="w-full rounded-xl bg-accent font-bold text-accent-foreground hover:bg-accent/90">
                  Join Premium
                </Button>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function WatchPage({ params }: { params: Promise<{ episodeId: string }> }) {
  const { episodeId } = use(params);
  
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <WatchContent episodeId={episodeId} />
    </Suspense>
  );
}
