
"use client";

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '../../components/layout/Navbar';
import { AnimeCard } from '../../components/anime/AnimeCard';
import { useFirestore, useCollection, useMemoFirebase } from '../../firebase/index';
import { collection, query, orderBy } from 'firebase/firestore';
import { useLanguage } from '../../components/providers/LanguageContext';
import { Loader2, SearchX } from 'lucide-react';
import { normalizeSearchString } from '../../lib/utils';

function SearchResults() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const db = useFirestore();
  const { language } = useLanguage();

  const animeQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'anime'), orderBy('createdAt', 'desc'));
  }, [db]);

  const { data: animeList, isLoading } = useCollection(animeQuery);

  const filteredAnime = useMemo(() => {
    if (!animeList || !queryParam) return animeList || [];
    
    const normalizedQuery = normalizeSearchString(queryParam);
    
    return animeList.filter(anime => {
      const normalizedTitleEn = normalizeSearchString(anime.titleEn);
      const normalizedTitleAr = normalizeSearchString(anime.titleAr);
      
      return (
        normalizedTitleEn.includes(normalizedQuery) || 
        normalizedTitleAr.includes(normalizedQuery)
      );
    });
  }, [animeList, queryParam]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-headline text-3xl font-bold">
          {language === 'ar' ? 'نتائج البحث عن: ' : 'Search results for: '}
          <span className="text-accent">"{queryParam}"</span>
        </h1>
        <p className="text-muted-foreground">
          {filteredAnime.length} {language === 'ar' ? 'نتائج وجدت' : 'results found'}
        </p>
      </div>

      {filteredAnime.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredAnime.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-full bg-secondary/30 p-6">
            <SearchX className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold">
            {language === 'ar' ? 'لم يتم العثور على نتائج' : 'No results found'}
          </h2>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'جرّب البحث بكلمات مختلفة أو تحقق من الإملاء.' 
              : 'Try searching for different keywords or check your spelling.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 md:px-8">
        <Suspense fallback={
          <div className="flex h-[60vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }>
          <SearchResults />
        </Suspense>
      </main>
    </div>
  );
}
