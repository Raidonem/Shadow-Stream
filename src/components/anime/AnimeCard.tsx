"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Anime } from '../../lib/types';
import { Star, PlayCircle } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { useLanguage } from '../../components/providers/LanguageContext';
import { translations } from '../../lib/i18n';

interface AnimeCardProps {
  anime: Anime;
}

export function AnimeCard({ anime }: AnimeCardProps) {
  const { language } = useLanguage();
  const title = (language === 'ar' ? anime.titleAr : anime.titleEn) || 'Anime Cover';
  const tTags = translations[language].tags;

  return (
    <Link href={`/anime/${anime.id}`} className="group relative block w-full overflow-hidden rounded-xl bg-card anime-card-hover">
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        <Image
          src={anime.coverImage}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center opacity-0 transition-all duration-300 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0">
          <div className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-foreground shadow-lg">
            <PlayCircle className="h-4 w-4" />
            {language === 'ar' ? 'شاهد الآن' : 'Watch Now'}
          </div>
        </div>

        <div className="absolute right-2 top-2">
          <Badge variant="secondary" className="flex items-center gap-1 bg-black/60 text-white backdrop-blur-sm border-none">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {anime.rating?.toFixed(1) || '0.0'}
          </Badge>
        </div>
      </div>
      
      <div className="p-3">
        <h3 className="line-clamp-1 font-headline text-base font-bold transition-colors group-hover:text-accent">
          {title}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {anime.releaseYear} • {anime.genres?.slice(0, 2).map(g => tTags[g as keyof typeof tTags]).join(', ')}
        </p>
      </div>
    </Link>
  );
}