
"use client";

import React, { useState } from 'react';
import { Bell, PlayCircle, Loader2 } from 'lucide-react';
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
import { translations } from '../../lib/i18n';
import Link from 'next/link';
import { GlobalNotification } from '../../lib/types';
import { Badge } from '../ui/badge';

export function NotificationBell() {
  const { user } = useUser();
  const db = useFirestore();
  const { language, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const notificationsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'global_notifications'), orderBy('createdAt', 'desc'), limit(10));
  }, [db]);

  const { data: notifications, isLoading } = useCollection<GlobalNotification>(notificationsQuery);

  const profileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);

  const { data: profile } = useDoc(profileRef);

  const unreadCount = notifications?.filter(n => {
    // Basic unread logic based on local storage of last seen timestamp
    const lastSeen = localStorage.getItem('last_notif_seen') || '0';
    return (n.createdAt?.seconds || 0) > parseInt(lastSeen);
  }).length || 0;

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (notifications && notifications.length > 0) {
      localStorage.setItem('last_notif_seen', notifications[0].createdAt?.seconds.toString() || '0');
    }
  };

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
        ) : notifications && notifications.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((n) => {
              const isWatching = profile?.currentlyWatchingAnimeIds?.includes(n.animeId);
              const title = language === 'ar' ? n.animeTitleAr : n.animeTitleEn;
              
              return (
                <DropdownMenuItem key={n.id} asChild className="cursor-pointer p-0">
                  <Link href={`/watch/${n.episodeId}?animeId=${n.animeId}`} className="flex flex-col gap-1 p-3 hover:bg-secondary/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-bold leading-none">
                          {title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('newEpisodeOut')} ({t('episodes')} {n.episodeNumber})
                        </p>
                      </div>
                      {isWatching && (
                        <Badge variant="outline" className="text-[9px] border-accent text-accent uppercase px-1 py-0 h-4">
                          {t('watching')}
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {n.createdAt?.toDate?.()?.toLocaleString() || 'Recently'}
                    </span>
                  </Link>
                </DropdownMenuItem>
              );
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
