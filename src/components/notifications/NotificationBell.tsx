
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Bell, PlayCircle, Loader2, MessageSquare, UserPlus, Users, AtSign, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '../../firebase/index';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from '../ui/button';
import { useLanguage } from '../providers/LanguageContext';
import Link from 'next/link';
import { GlobalNotification, UserNotification, UserProfile } from '../../lib/types';
import { Badge } from '../ui/badge';

const RECENT_THRESHOLD_SECONDS = 7 * 24 * 60 * 60; // 7 days

export function NotificationBell() {
  const { user } = useUser();
  const db = useFirestore();
  const { language, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState(0);

  // Load last seen notification timestamp from local storage on mount to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const val = localStorage.getItem('last_notif_seen');
      if (val) setLastSeen(parseInt(val));
    }
  }, []);

  // Global Notifications (New Episodes)
  const globalQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'global_notifications'), orderBy('createdAt', 'desc'), limit(50));
  }, [db]);

  // Personal Notifications (Friend Requests, Replies, Likes, Mentions)
  const personalQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc'), limit(20));
  }, [db, user]);

  const { data: globals, isLoading: isGlobalsLoading } = useCollection<GlobalNotification>(globalQuery);
  const { data: personals, isLoading: isPersonalsLoading } = useCollection<UserNotification>(personalQuery);

  const profileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user?.uid, db]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(profileRef);

  // Merge and sort notifications
  const allNotifications = useMemo(() => {
    // If profile is still loading, we don't know what they follow.
    if (!profile) {
      return (personals || []).map(n => ({ ...n, category: 'personal' as const }));
    }

    const followedAnimeIds = new Set([
      ...(profile.watchlistAnimeIds || []),
      ...(profile.currentlyWatchingAnimeIds || []),
      ...(profile.favoriteAnimeIds || []),
      ...(profile.completedAnimeIds || [])
    ]);

    const nowSeconds = Math.floor(Date.now() / 1000);
    const userJoinTime = profile.createdAt?.seconds || 0;

    // 1. FILTER: Only global notifications for anime in user's library,
    // created after the user joined, and within a recent window (7 days).
    let filteredGlobals = (globals || []).filter(n => {
      const createdAt = n.createdAt?.seconds || 0;
      const isFollowed = n.type === 'new_episode' && n.animeId && followedAnimeIds.has(n.animeId);
      const isAfterJoin = createdAt >= userJoinTime;
      const isRecent = createdAt >= (nowSeconds - RECENT_THRESHOLD_SECONDS);
      
      return isFollowed && isAfterJoin && isRecent;
    });

    // 2. DEDUPLICATE: Only show the LATEST episode notification per anime.
    // This prevents "Notification Spam" when a user follows a show with many recent updates.
    const latestPerAnime = new Map<string, GlobalNotification>();
    filteredGlobals.forEach(n => {
      if (!n.animeId) return;
      const existing = latestPerAnime.get(n.animeId);
      if (!existing || (n.createdAt?.seconds || 0) > (existing.createdAt?.seconds || 0)) {
        latestPerAnime.set(n.animeId, n);
      }
    });

    filteredGlobals = Array.from(latestPerAnime.values());

    const merged = [
      ...filteredGlobals.map(n => ({ ...n, category: 'global' as const })),
      ...(personals || []).map(n => ({ ...n, category: 'personal' as const }))
    ];

    return merged.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    }).slice(0, 20);
  }, [globals, personals, profile]);

  const unreadCount = useMemo(() => {
    return allNotifications.filter(n => (n.createdAt?.seconds || 0) > lastSeen).length;
  }, [allNotifications, lastSeen]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && allNotifications.length > 0) {
      const latestTime = allNotifications[0].createdAt?.seconds || 0;
      setLastSeen(latestTime);
      localStorage.setItem('last_notif_seen', latestTime.toString());
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_episode': return <PlayCircle className="h-4 w-4 text-accent" />;
      case 'comment_reply': return <MessageSquare className="h-4 w-4 text-primary" />;
      case 'comment_mention': return <AtSign className="h-4 w-4 text-yellow-500" />;
      case 'comment_like': return <ThumbsUp className="h-4 w-4 text-accent" />;
      case 'comment_dislike': return <ThumbsDown className="h-4 w-4 text-destructive" />;
      case 'friend_request': return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'friend_accepted': return <Users className="h-4 w-4 text-accent" />;
      case 'warning':
      case 'restriction':
      case 'suspension': return <Bell className="h-4 w-4 text-destructive" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const isLoading = isGlobalsLoading || isPersonalsLoading || isProfileLoading;

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 h-3 w-3 rounded-full bg-accent ring-2 ring-background border-none" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          {t('notifications')}
          {unreadCount > 0 && <Badge variant="secondary" className="bg-accent text-accent-foreground">{unreadCount}</Badge>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isLoading && allNotifications.length === 0 ? (
          <div className="flex p-8 justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : allNotifications.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            {allNotifications.map((n: any) => {
              if (n.category === 'global') {
                const title = language === 'ar' ? n.animeTitleAr : n.animeTitleEn;
                return (
                  <DropdownMenuItem key={n.id} asChild className="cursor-pointer p-0 focus:bg-secondary/50">
                    <Link href={`/watch/${n.episodeId}?animeId=${n.animeId}`} className="flex flex-col gap-1 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getIcon(n.type)}
                          <div className="flex-1">
                            <p className="text-sm font-bold leading-none">{title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('newEpisodeOut')} ({t('episodes')} {n.episodeNumber})
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[9px] border-accent text-accent uppercase px-1 py-0 h-4">
                          {profile?.currentlyWatchingAnimeIds?.includes(n.animeId) ? t('watching') : 'Followed'}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground ml-6">
                        {n.createdAt?.toDate?.()?.toLocaleString() || 'Recently'}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                );
              } else {
                return (
                  <DropdownMenuItem key={n.id} asChild className="cursor-pointer p-0 focus:bg-secondary/50">
                    <Link href={n.link} className="flex flex-col gap-1 p-3">
                      <div className="flex items-start gap-2">
                        {getIcon(n.type)}
                        <div className="flex-1">
                          <p className="text-sm font-bold leading-none">
                            {language === 'ar' ? n.messageAr : n.messageEn}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground ml-6">
                        {n.createdAt?.toDate?.()?.toLocaleString() || 'Recently'}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                );
              }
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground italic">
            No notifications yet.
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
