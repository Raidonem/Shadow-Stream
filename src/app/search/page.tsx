
"use client";

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '../../components/layout/Navbar';
import { AnimeCard } from '../../components/anime/AnimeCard';
import { useFirestore, useCollection, useMemoFirebase } from '../../firebase/index';
import { collection, query, orderBy } from 'firebase/firestore';
import { useLanguage } from '../../components/providers/LanguageContext';
import { Loader2, SearchX, SortAsc, Calendar, Clock, Type } from 'lucide-react';
import { normalizeSearchString } from '../../lib/utils';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../../components/ui/select";
import { Anime } from '../../lib/types';

type SortOption = 'name' | 'added_desc' | 'added_asc' | 'release_desc' | 'release_asc';

function SearchResults() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const db = useFirestore();
  const { language } = useLanguage();
  const [sortBy, setSortBy] = useState<SortOption>('name');

  const animeQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'anime'));
  }, [db]);

  const { data: animeList, isLoading } = useCollection<Anime>(animeQuery);

  const processedAnime = useMemo(() => {
    if (!animeList) return [];
    
    // 1. Filter by search query
    let filtered = [...animeList];
    if (queryParam) {
      const normalizedQuery = normalizeSearchString(queryParam);
      filtered = filtered.filter(anime => {
        const normalizedTitleEn = normalizeSearchString(anime.titleEn);
        const normalizedTitleAr = normalizeSearchString(anime.titleAr);
        const matchesAlternative = (anime.alternativeTitles || []).some(title => 
          normalizeSearchString(title).includes(normalizedQuery)
        );

        return (
          normalizedTitleEn.includes(normalizedQuery) || 
          normalizedTitleAr.includes(normalizedQuery) ||
          matchesAlternative
        );
      });
    }

    // 2. Sort results
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          const titleA = (language === 'ar' ? a.titleAr : a.titleEn).toLowerCase();
          const titleB = (language === 'ar' ? b.titleAr : b.titleEn).toLowerCase();
          return titleA.localeCompare(titleB);
        case 'added_desc':
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        case 'added_asc':
          return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
        case 'release_desc':
          return b.releaseYear - a.releaseYear;
        case 'release_asc':
          return a.releaseYear - b.releaseYear;
        default:
          return 0;
      }
    });
  }, [animeList, queryParam, sortBy, language]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="font-headline text-3xl font-bold">
            {queryParam ? (
              <>
                {language === 'ar' ? 'نتائج البحث عن: ' : 'Search results for: '}
                <span className="text-accent">"{queryParam}"</span>
              </>
            ) : (
              <>{language === 'ar' ? 'جميع الأنميات' : 'All Anime Shows'}</>
            )}
          </h1>
          <p className="text-muted-foreground">
            {processedAnime.length} {language === 'ar' ? 'نتائج وجدت' : 'results found'}
          </p>
        </div>

        <div className="flex flex-col gap-2 min-w-[200px]">
          <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
            <SortAsc className="h-3 w-3" />
            {language === 'ar' ? 'ترتيب حسب' : 'Sort By'}
          </label>
          <Select value={sortBy} onValueChange={(val: SortOption) => setSortBy(val)}>
            <SelectTrigger className="rounded-xl border-none bg-secondary/50 shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  {language === 'ar' ? 'الاسم' : 'Name (A-Z)'}
                </div>
              </SelectItem>
              <SelectItem value="added_desc">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {language === 'ar' ? 'المضاف حديثاً' : 'Newly Added'}
                </div>
              </SelectItem>
              <SelectItem value="added_asc">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {language === 'ar' ? 'الأقدم إضافة' : 'Oldest Added'}
                </div>
              </SelectItem>
              <SelectItem value="release_desc">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {language === 'ar' ? 'تاريخ الإصدار (الأحدث)' : 'Release Year (Newest)'}
                </div>
              </SelectItem>
              <SelectItem value="release_asc">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {language === 'ar' ? 'تاريخ الإصدار (الأقدم)' : 'Release Year (Oldest)'}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {processedAnime.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {processedAnime.map((anime) => (
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
