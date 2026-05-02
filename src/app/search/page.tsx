"use client";

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '../../components/layout/Navbar';
import { AnimeCard } from '../../components/anime/AnimeCard';
import { useFirestore, useCollection, useMemoFirebase } from '../../firebase/index';
import { collection, query, where, limit, orderBy } from 'firebase/firestore';
import { useLanguage } from '../../components/providers/LanguageContext';
import { 
  Loader2, 
  SearchX, 
  SortAsc, 
  Calendar, 
  Clock, 
  Type, 
  Filter, 
  FilterX, 
  User as UserIcon, 
  Tv 
} from 'lucide-react';
import { normalizeSearchString, cn } from '../../lib/utils';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../../components/ui/select";
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { translations } from '../../lib/i18n';
import { Anime, GenreKey, UserProfile, AvatarItem } from '../../lib/types';
import { Card, CardContent } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';

type SortOption = 'name' | 'added_desc' | 'added_asc' | 'release_desc' | 'release_asc';
type SearchType = 'anime' | 'users';

function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryParam = searchParams.get('q') || '';
  const db = useFirestore();
  const { language, t } = useLanguage();
  
  const [searchType, setSearchType] = useState<SearchType>('anime');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [selectedGenres, setSelectedGenres] = useState<GenreKey[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);

  // Anime Query
  const animeQuery = useMemoFirebase(() => {
    if (!db || searchType !== 'anime') return null;
    return query(collection(db, 'anime'));
  }, [db, searchType]);

  // Users Query
  const usersQuery = useMemoFirebase(() => {
    if (!db || searchType !== 'users') return null;
    return query(collection(db, 'users'), where('isPublic', '==', true), limit(50));
  }, [db, searchType]);

  // Avatars Query for resolution
  const avatarsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'avatars'), orderBy('createdAt', 'desc'));
  }, [db]);

  const { data: animeList, isLoading: isAnimeLoading } = useCollection<Anime>(animeQuery);
  const { data: usersList, isLoading: isUsersLoading } = useCollection<UserProfile>(usersQuery);
  const { data: officialAvatars } = useCollection<AvatarItem>(avatarsQuery);

  const availableYears = useMemo(() => {
    if (!animeList) return [];
    const years = Array.from(new Set(animeList.map(a => a.releaseYear)));
    return (years as number[]).sort((a, b) => b - a);
  }, [animeList]);

  const allGenres = Object.keys(translations.en.tags) as GenreKey[];

  const processedAnime = useMemo(() => {
    if (!animeList || searchType !== 'anime') return [];
    
    let filtered = [...animeList];

    if (queryParam) {
      const normalizedQuery = normalizeSearchString(queryParam);
      filtered = filtered.filter(anime => {
        const normalizedTitleEn = normalizeSearchString(anime.titleEn || '');
        const normalizedTitleAr = normalizeSearchString(anime.titleAr || '');
        const altTitles = anime.alternativeTitles || [];
        const matchesAlternative = altTitles.some(title => 
          normalizeSearchString(title).includes(normalizedQuery)
        );
        return normalizedTitleEn.includes(normalizedQuery) || normalizedTitleAr.includes(normalizedQuery) || matchesAlternative;
      });
    }

    if (selectedGenres.length > 0) {
      filtered = filtered.filter(anime => 
        selectedGenres.every(g => anime.genres?.includes(g))
      );
    }

    if (selectedYears.length > 0) {
      filtered = filtered.filter(anime => 
        selectedYears.includes(anime.releaseYear)
      );
    }

    return filtered.sort((a, b) => {
      if (sortBy === 'name') {
        const titleA = (language === 'ar' ? a.titleAr : a.titleEn) || '';
        const titleB = (language === 'ar' ? b.titleAr : b.titleEn) || '';
        return titleA.localeCompare(titleB);
      }
      if (sortBy === 'added_desc') return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      if (sortBy === 'added_asc') return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
      if (sortBy === 'release_desc') return (b.releaseYear || 0) - (a.releaseYear || 0);
      if (sortBy === 'release_asc') return (a.releaseYear || 0) - (b.releaseYear || 0);
      return 0;
    });
  }, [animeList, queryParam, sortBy, language, selectedGenres, selectedYears, searchType]);

  const processedUsers = useMemo(() => {
    if (!usersList || searchType !== 'users') return [];
    
    let filtered = [...usersList];

    if (queryParam) {
      const normalizedQuery = normalizeSearchString(queryParam);
      filtered = filtered.filter(user => 
        normalizeSearchString(user.username || '').includes(normalizedQuery)
      );
    }

    return filtered;
  }, [usersList, queryParam, searchType]);

  const toggleGenre = (genre: GenreKey) => {
    setSelectedGenres(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]);
  };

  const toggleYear = (year: number) => {
    setSelectedYears(prev => prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]);
  };

  const clearFilters = () => {
    setSelectedGenres([]);
    setSelectedYears([]);
  };

  const resolveAvatar = (user: UserProfile) => {
    if (!user.avatarId || !officialAvatars) return null;
    return officialAvatars.find(a => a.id === user.avatarId)?.url || null;
  };

  const isLoading = isAnimeLoading || isUsersLoading;

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <aside className={cn(
        "w-full shrink-0 transition-all duration-300 lg:w-64",
        searchType === 'users' && "lg:w-0 lg:opacity-0 lg:pointer-events-none"
      )}>
        <div className="sticky top-24 space-y-8 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-headline text-lg font-bold">
              <Filter className="h-4 w-4" />
              {language === 'ar' ? 'الفلاتر' : 'Filters'}
            </h2>
            {(selectedGenres.length > 0 || selectedYears.length > 0) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10">
                <FilterX className="mr-1 h-3 w-3" />
                {language === 'ar' ? 'مسح' : 'Clear'}
              </Button>
            )}
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-muted-foreground">{language === 'ar' ? 'التصنيفات' : 'Genres'}</h3>
              <div className="flex flex-wrap gap-1.5">
                {allGenres.map(genre => (
                  <Badge
                    key={genre}
                    variant={selectedGenres.includes(genre) ? "default" : "secondary"}
                    className={cn("cursor-pointer px-2 py-0.5 text-[10px] transition-all", selectedGenres.includes(genre) ? "bg-accent text-accent-foreground" : "hover:bg-accent/20")}
                    onClick={() => toggleGenre(genre)}
                  >
                    {translations[language].tags[genre]}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-muted-foreground">{language === 'ar' ? 'سنة الإصدار' : 'Release Year'}</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {availableYears.map(year => (
                  <Button key={year} variant={selectedYears.includes(year) ? "default" : "outline"} size="sm" className={cn("h-8 text-xs rounded-lg", selectedYears.includes(year) ? "bg-accent text-accent-foreground border-accent" : "")} onClick={() => toggleYear(year)}>
                    {year}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 space-y-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <h1 className="font-headline text-3xl font-bold">
                {queryParam ? (
                  <>
                    {language === 'ar' ? 'نتائج البحث عن: ' : 'Search results for: '}
                    <span className="text-accent">"{queryParam}"</span>
                  </>
                ) : (
                  <>{language === 'ar' ? 'استكشاف' : 'Explore'}</>
                )}
              </h1>
            </div>

            <div className="flex bg-secondary/50 p-1 rounded-xl w-fit">
              <Button 
                variant={searchType === 'anime' ? "default" : "ghost"} 
                size="sm" 
                className="rounded-lg gap-2"
                onClick={() => setSearchType('anime')}
              >
                <Tv className="h-4 w-4" />
                {t('filterAnime')}
              </Button>
              <Button 
                variant={searchType === 'users' ? "default" : "ghost"} 
                size="sm" 
                className="rounded-lg gap-2"
                onClick={() => setSearchType('users')}
              >
                <UserIcon className="h-4 w-4" />
                {t('filterUsers')}
              </Button>
            </div>
          </div>

          {searchType === 'anime' && (
            <div className="flex flex-col gap-2 min-w-[200px]">
              <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                <SortAsc className="h-3 w-3" />
                {language === 'ar' ? 'ترتيب حسب' : 'Sort By'}
              </label>
              <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
                <SelectTrigger className="rounded-xl border-none bg-secondary/50 shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name"><div className="flex items-center gap-2"><Type className="h-4 w-4" />{language === 'ar' ? 'الاسم' : 'Name (A-Z)'}</div></SelectItem>
                  <SelectItem value="added_desc"><div className="flex items-center gap-2"><Clock className="h-4 w-4" />{language === 'ar' ? 'المضاف حديثاً' : 'Newly Added'}</div></SelectItem>
                  <SelectItem value="release_desc"><div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{language === 'ar' ? 'تاريخ الإصدار (الأحدث)' : 'Release Year'}</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : searchType === 'anime' ? (
          processedAnime.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {processedAnime.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl bg-secondary/10">
              <SearchX className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold">{language === 'ar' ? 'لم يتم العثور على أنمي' : 'No anime found'}</h2>
              <Button variant="outline" className="mt-6 rounded-xl" onClick={clearFilters}>Reset Filters</Button>
            </div>
          )
        ) : (
          processedUsers.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {processedUsers.map((user) => {
                const avatarUrl = resolveAvatar(user);
                return (
                  <Card key={user.id} className="overflow-hidden bg-card border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/profile?uid=${user.id}`)}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        {avatarUrl && <AvatarImage src={avatarUrl} />}
                        <AvatarFallback className="bg-primary/20 text-primary font-bold">
                          {(user.displayName || user.username || 'U')[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold truncate">{user.displayName || user.username}</h3>
                        <p className="text-xs text-accent">@{user.username}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                          {user.isPremium && <Badge variant="secondary" className="h-4 text-[8px] bg-accent text-accent-foreground px-1">PREMIUM</Badge>}
                          <span>{user.favoriteAnimeIds?.length || 0} Favorites</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl bg-secondary/10">
              <UserIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold">{t('noPublicUsers')}</h2>
            </div>
          )}
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
        <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
          <SearchResults />
        </Suspense>
      </main>
    </div>
  );
}
