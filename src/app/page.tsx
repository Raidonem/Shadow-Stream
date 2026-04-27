"use client";

import { Navbar } from "../components/layout/Navbar";
import { AnimeCard } from "../components/anime/AnimeCard";
import { Button } from "../components/ui/button";
import { Play, Info, ChevronRight, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase } from '../firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useLanguage } from "../components/providers/LanguageContext";
import { translations } from "../lib/i18n";
import { AdBanner } from "../components/ads/AdBanner";

export default function Home() {
  const db = useFirestore();
  const { language, t } = useLanguage();

  const animeQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'anime'), orderBy('createdAt', 'desc'));
  }, [db]);

  const { data: animeList, isLoading } = useCollection(animeQuery);

  const heroAnime = animeList?.[0];
  const trending = animeList?.slice(0, 6);
  const tTags = translations[language].tags;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {heroAnime ? (
        <section className="relative h-[80vh] w-full overflow-hidden">
          <Image
            src={heroAnime.bannerImage}
            alt={(language === 'ar' ? heroAnime.titleAr : heroAnime.titleEn) || 'Anime Banner'}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          
          <div className="container relative mx-auto flex h-full flex-col justify-center px-4 md:px-8">
            <div className="max-w-2xl space-y-6">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-accent px-2 py-1 text-xs font-bold uppercase text-accent-foreground">
                  {language === 'ar' ? 'أحدث إصدار' : 'Newest Release'}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {heroAnime.genres?.map(g => tTags[g as keyof typeof tTags]).join(' • ')}
                </span>
              </div>
              
              <h1 className="font-headline text-5xl font-bold tracking-tight md:text-7xl">
                {language === 'ar' ? heroAnime.titleAr : heroAnime.titleEn}
              </h1>
              
              <p className="line-clamp-3 text-lg text-muted-foreground md:text-xl">
                {language === 'ar' ? heroAnime.descriptionAr : heroAnime.descriptionEn}
              </p>
              
              <div className="flex flex-wrap gap-4 pt-4">
                <Link href={`/anime/${heroAnime.id}`}>
                  <Button size="lg" className="h-14 gap-2 rounded-xl bg-accent px-8 text-lg font-bold text-accent-foreground hover:bg-accent/90">
                    <Play className="h-6 w-6 fill-current" />
                    {language === 'ar' ? 'شاهد الآن' : 'Watch Now'}
                  </Button>
                </Link>
                <Link href={`/anime/${heroAnime.id}`}>
                  <Button size="lg" variant="secondary" className="h-14 gap-2 rounded-xl px-8 text-lg font-bold">
                    <Info className="h-6 w-6" />
                    {language === 'ar' ? 'مزيد من التفاصيل' : 'More Details'}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="flex h-[40vh] items-center justify-center">
          <p className="text-muted-foreground">No anime found. Check back later!</p>
        </div>
      )}

      <main className="container mx-auto space-y-16 px-4 py-12 md:px-8">
        
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-3xl font-bold">{t('trending')}</h2>
            <Button variant="link" className="text-accent gap-1">
              {language === 'ar' ? 'عرض الكل' : 'View All'} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {trending?.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        </section>

        <div className="max-w-5xl mx-auto">
          <AdBanner dataAdSlot="1234567890" />
        </div>

        <section className="rounded-3xl bg-primary/10 p-8 md:p-12">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
              <h2 className="font-headline text-4xl font-bold lg:text-5xl">
                {language === 'ar' ? 'اكتشف شغفك القادم' : 'Discover Your Next Obsession'}
              </h2>
              <p className="text-lg text-muted-foreground">
                {language === 'ar' 
                  ? 'يتم تحديث مكتبتنا يومياً بأحدث المغامرات والرحلات العاطفية. انضم إلى مجتمع ShadowStream اليوم.'
                  : 'Our library is updated daily with the latest adventures and emotional journeys. Join the ShadowStream community today.'}
              </p>
              <Button size="lg" className="rounded-xl bg-primary px-8 font-bold text-primary-foreground hover:bg-primary/90">
                {language === 'ar' ? 'استكشاف الكل' : 'Explore All'}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {animeList?.slice(0, 4).map((anime) => (
                <Link key={anime.id} href={`/anime/${anime.id}`} className="relative aspect-video overflow-hidden rounded-xl group">
                  <Image
                    src={anime.bannerImage}
                    alt={(language === 'ar' ? anime.titleAr : anime.titleEn) || 'Anime Banner'}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white font-bold text-center px-2">
                      {language === 'ar' ? anime.titleAr : anime.titleEn}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-20 border-t bg-card py-12">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="flex flex-col gap-2">
              <Link href="/" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="font-headline font-bold text-primary-foreground">S</span>
                </div>
                <span className="font-headline text-xl font-bold tracking-tight">
                  ShadowStream
                </span>
              </Link>
              <p className="text-sm text-muted-foreground max-w-xs">
                {language === 'ar' ? 'الوجهة النهائية لمشاهدة الأنمي الغامرة.' : 'The ultimate destination for immersive anime streaming.'}
              </p>
            </div>
            <div className="flex gap-8 text-sm font-medium">
              <Link href="#" className="hover:text-accent">Terms</Link>
              <Link href="#" className="hover:text-accent">Privacy</Link>
              <Link href="#" className="hover:text-accent">About</Link>
              <Link href="#" className="hover:text-accent">Contact</Link>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2024 ShadowStream. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
