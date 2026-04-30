
"use client";

import React, { useState, useMemo } from 'react';
import { Bell, PlayCircle, Loader2, MessageSquare, UserPlus, Users, AtSign, ThumbsUp, ThumbsDown, ShieldAlert } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '../../firebase/index';
import { collection, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
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
import { translations } from '../../lib/i18n';
import Link from 'next/link';
import { GlobalNotification, UserNotification } from '../../lib/types';
import { Badge } from '../ui/badge';

export function NotificationBell() {
  const { user } = useUser();
  const db = useFirestore();
  const { language, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  // Global Notifications (New Episodes)
  const globalQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'global_notifications'), orderBy('createdAt', 'desc'), limit(10));
  }, [db]);

  // Personal Notifications (Friend Requests, Replies, Likes, Mentions, Warnings)
  const personalQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc'), limit(15));
  }, [db, user]);

  const { data: globals, isLoading: isGlobalsLoading } = useCollection<GlobalNotification>(globalQuery);
  const { data: personals, isLoading: isPersonalsLoading } = useCollection<UserNotification>(personalQuery);

  const profileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);

  const { data: profile } = useDoc(profileRef);

  // Merge and sort notifications
  const allNotifications = useMemo(() => {
    const merged = [
      ...(globals || []).map(n => ({ ...n, category: 'global' as const })),
      ...(personals || []).map(n => ({ ...n, category: 'personal' as const }))
    ];
    return merged.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    }).slice(0, 20);
  }, [globals, personals]);

  const unreadCount = useMemo(() => {
    const lastSeen = parseInt(localStorage.getItem('last_notif_seen') || '0');
    return allNotifications.filter(n => (n.createdAt?.seconds || 0) > lastSeen).length;
  }, [allNotifications]);

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (allNotifications.length > 0) {
      localStorage.setItem('last_notif_seen', allNotifications[0].createdAt?.seconds.toString() || '0');
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
      case 'warning': return <ShieldAlert className="h-4 w-4 text-destructive" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const isLoading = isGlobalsLoading || isPersonalsLoading;

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpen}>
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
        
        {isLoading ? (
          <div className="flex p-4 justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : allNotifications.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            {allNotifications.map((n: any) => {
              if (n.category === 'global') {
                const isWatching = profile?.currentlyWatchingAnimeIds?.includes(n.animeId);
                const title = language === 'ar' ? n.animeTitleAr : n.animeTitleEn;
                return (
                  <DropdownMenuItem key={n.id} asChild className="cursor-pointer p-0">
                    <Link href={`/watch/${n.episodeId}?animeId=${n.animeId}`} className="flex flex-col gap-1 p-3 hover:bg-secondary/50">
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
                        {isWatching && (
                          <Badge variant="outline" className="text-[9px] border-accent text-accent uppercase px-1 py-0 h-4">
                            {t('watching')}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground ml-6">
                        {n.createdAt?.toDate?.()?.toLocaleString() || 'Recently'}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                );
              } else {
                return (
                  <DropdownMenuItem key={n.id} asChild className="cursor-pointer p-0">
                    <Link href={n.link} className="flex flex-col gap-1 p-3 hover:bg-secondary/50">
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
