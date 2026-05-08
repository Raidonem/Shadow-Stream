
"use client";

import Link from 'next/link';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/button';
import { Ghost, Home, Search } from 'lucide-react';
import { useLanguage } from '../components/providers/LanguageContext';

export default function NotFound() {
  const { language, t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-4 text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 animate-pulse bg-accent/20 blur-3xl rounded-full" />
          <Ghost className="relative h-24 w-24 text-accent/50" />
        </div>
        
        <h1 className="font-headline text-5xl font-bold md:text-7xl mb-4">404</h1>
        <h2 className="font-headline text-2xl font-bold md:text-3xl mb-6">
          {language === 'ar' ? 'لقد ضعت في الظلال' : 'Lost in the Shadows'}
        </h2>
        
        <p className="max-w-md text-lg text-muted-foreground mb-12">
          {language === 'ar' 
            ? 'الصفحة التي تبحث عنها قد تم نقلها أو حذفها أو أنها لم تكن موجودة أبداً.' 
            : "The page you're looking for has moved, been deleted, or never existed in this realm."}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild size="lg" className="rounded-xl h-14 px-8 font-bold gap-2">
            <Link href="/">
              <Home className="h-5 w-5" />
              {t('home')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-xl h-14 px-8 font-bold gap-2 border-accent text-accent hover:bg-accent/10">
            <Link href="/search">
              <Search className="h-5 w-5" />
              {language === 'ar' ? 'استكشاف الأنمي' : 'Explore Anime'}
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
