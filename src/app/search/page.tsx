
"use client";

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '../../components/layout/Navbar';
import { AnimeCard } from '../../components/anime/AnimeCard';
import { useFirestore, useCollection, useMemoFirebase } from '../../firebase/index';
import { collection, query } from 'firebase/firestore';
import { useLanguage } from '../../components/providers/LanguageContext';
import { 
  Loader2, 
  SearchX, 
  SortAsc, 
  Calendar, 
  Clock, 
  Type, 
  Filter, 
  X, 
  ChevronDown,
  ChevronUp,
  FilterX
} from 'lucide-react';
import { normalizeSearchString } from '../../lib/utils';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../../components/ui/select";
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import { translations } from '../../lib/i18n';
import { Anime, GenreKey } from '../../lib/types';
import { cn } from '../../lib/utils';

type SortOption = 'name' | 'added_desc' | 'added_asc' | 'release_desc' | 'release_asc';

function SearchResults() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const db = useFirestore();
  const { language, t } = useLanguage();
  
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [selectedGenres, setSelectedGenres] = useState<GenreKey[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(true);

  const animeQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'anime'));
  }, [db]);

  const { data: animeList, isLoading } = useCollection<Anime>(animeQuery);

  const availableYears = useMemo(() => {
    if (!animeList) return [];
    const years = Array.from(new Set(animeList.map(a => a.releaseYear)));
    return years.sort((a, b) => b - a);
  }, [animeList]);

  const allGenres = Object.keys(translations.en.tags) as GenreKey[];

  const processedAnime = useMemo(() => {
    if (!animeList) return [];
    
    let filtered = [...animeList];

    // 1. Filter by search query
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

    // 2. Filter by Genres (AND logic - must have all selected genres)
    if (selectedGenres.length > 0) {
      filtered = filtered.filter(anime => 
        selectedGenres.every(g => anime.genres?.includes(g))
      );
    }

    // 3. Filter by Years (OR logic - can be any of selected years)
    if (selectedYears.length > 0) {
      filtered = filtered.filter(anime => 
        selectedYears.includes(anime.releaseYear)
      );
    }

    // 4. Sort results
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
  }, [animeList, queryParam, sortBy, language, selectedGenres, selectedYears]);

  const toggleGenre = (genre: GenreKey) => {
    setSelectedGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const toggleYear = (year: number) => {
    setSelectedYears(prev => 
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  const clearFilters = () => {
    setSelectedGenres([]);
    setSelectedYears([]);
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      {/* Filters Sidebar */}
      <aside className={cn(
        "w-full shrink-0 transition-all duration-300 lg:w-64",
        !showFilters && "lg:w-0 lg:opacity-0 lg:pointer-events-none"
      )}>
        <div className="sticky top-24 space-y-8 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-headline text-lg font-bold">
              <Filter className="h-4 w-4" />
              {language === 'ar' ? 'الفلاتر' : 'Filters'}
            </h2>
            {(selectedGenres.length > 0 || selectedYears.length > 0) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
              >
                <FilterX className="mr-1 h-3 w-3" />
                {language === 'ar' ? 'مسح' : 'Clear'}
              </Button>
            )}
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-muted-foreground">
                {language === 'ar' ? 'التصنيفات' : 'Genres'}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {allGenres.map(genre => (
                  <Badge
                    key={genre}
                    variant={selectedGenres.includes(genre) ? "default" : "secondary"}
                    className={cn(
                      "cursor-pointer px-2 py-0.5 text-[10px] transition-all",
                      selectedGenres.includes(genre) ? "bg-accent text-accent-foreground" : "hover:bg-accent/20"
                    )}
                    onClick={() => toggleGenre(genre)}
                  >
                    {translations[language].tags[genre]}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-muted-foreground">
                {language === 'ar' ? 'سنة الإصدار' : 'Release Year'}
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {availableYears.map(year => (
                  <Button
                    key={year}
                    variant={selectedYears.includes(year) ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-8 text-xs rounded-lg",
                      selectedYears.includes(year) ? "bg-accent text-accent-foreground border-accent" : ""
                    )}
                    onClick={() => toggleYear(year)}
                  >
                    {year}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Results Content */}
      <div className="flex-1 space-y-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
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
              <Button 
                variant="outline" 
                size="sm" 
                className="hidden lg:flex gap-2 rounded-xl h-8"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-3 w-3" />
                {showFilters ? (language === 'ar' ? 'إخفاء الفلاتر' : 'Hide Filters') : (language === 'ar' ? 'إظهار الفلاتر' : 'Show Filters')}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <p className="text-muted-foreground text-sm">
                {processedAnime.length} {language === 'ar' ? 'نتائج وجدت' : 'results found'}
              </p>
              {selectedGenres.length > 0 && (
                <div className="flex gap-1 ml-2">
                  {selectedGenres.map(g => (
                    <Badge key={g} variant="outline" className="text-[10px] bg-accent/10 border-accent/20">
                      {translations[language].tags[g]}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {processedAnime.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl bg-secondary/10">
            <div className="mb-4 rounded-full bg-secondary/30 p-6">
              <SearchX className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold">
              {language === 'ar' ? 'لم يتم العثور على نتائج' : 'No results found'}
            </h2>
            <p className="text-muted-foreground mt-2 max-w-md">
              {language === 'ar' 
                ? 'جرّب تغيير فلاتر البحث أو البحث بكلمات مختلفة.' 
                : 'Try changing your search filters or searching for different keywords.'}
            </p>
            <Button variant="outline" className="mt-6 rounded-xl" onClick={clearFilters}>
              {language === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset All Filters'}
            </Button>
          </div>
        )}
      </div>
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
