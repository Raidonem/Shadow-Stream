
"use client";

import { useState, use, useEffect, Suspense, useRef, useMemo } from 'react';
import { Navbar } from '../../../components/layout/Navbar';
import { StreamPlayer } from '../../../components/anime/StreamPlayer';
import { Button } from '../../../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { 
  MessageSquare,
  Send,
  Loader2,
  Star,
  Server,
  Globe,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Reply as ReplyIcon,
  ChevronDown,
  ChevronUp,
  MoreVertical
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser } from '../../../firebase/index';
import { doc, collection, query, orderBy, serverTimestamp, increment, where } from 'firebase/firestore';
import { useToast } from '../../../hooks/use-toast';
import { addDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '../../../firebase/non-blocking-updates';
import { useLanguage } from '../../../components/providers/LanguageContext';
import { translations } from '../../../lib/i18n';
import { EpisodeServer, Comment } from '../../../lib/types';
import { cn } from '../../../lib/utils';
import { AdBanner } from '../../../components/ads/AdBanner';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";

const COMMENT_LIMIT = 100;

function CommentItem({ 
  comment, 
  user, 
  profile, 
  isAdminUser, 
  onVote, 
  onReply, 
  replies, 
  language,
  t,
  userVotes
}: { 
  comment: Comment; 
  user: any; 
  profile: any; 
  isAdminUser: boolean; 
  onVote: (commentId: string, direction: 'up' | 'down') => void;
  onReply: (parentId: string, targetUserName: string, isReply: boolean) => void;
  replies?: Comment[];
  language: string;
  t: (key: any) => string;
  userVotes?: any[];
}) {
  const router = useRouter();
  const [visibleRange, setVisibleRange] = useState<{ start: number; end: number } | null>(null);
  
  const isOwnComment = user && comment.userId === user.uid;
  const currentDisplayName = isOwnComment ? (profile?.displayName || comment.userDisplayName) : (comment.userDisplayName || 'User');
  const currentUserName = isOwnComment ? (profile?.username || comment.userName) : (comment.userName || 'user');
  
  const currentVote = userVotes?.find(v => v.commentId === comment.id)?.type;

  const sortedReplies = useMemo(() => {
    if (!replies) return [];
    return [...replies].sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
  }, [replies]);

  useEffect(() => {
    if (!sortedReplies.length) return;
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const targetId = hash.replace('#comment-', '');
    const targetIndex = sortedReplies.findIndex(r => r.id === targetId);

    if (targetIndex !== -1 && !visibleRange) {
      setVisibleRange({ start: targetIndex, end: targetIndex + 1 });
    } else if (!visibleRange) {
      const start = Math.max(0, sortedReplies.length - 3);
      setVisibleRange({ start, end: sortedReplies.length });
    }
  }, [sortedReplies, visibleRange]);

  const showPrevious = () => {
    if (!visibleRange) return;
    setVisibleRange({
      start: Math.max(0, visibleRange.start - 5),
      end: visibleRange.end
    });
  };

  const showMore = () => {
    if (!visibleRange) return;
    setVisibleRange({
      start: visibleRange.start,
      end: Math.min(sortedReplies.length, visibleRange.end + 5)
    });
  };

  const displayedReplies = visibleRange 
    ? sortedReplies.slice(visibleRange.start, visibleRange.end) 
    : [];
  
  const hasPrevious = (visibleRange?.start || 0) > 0;
  const hasMore = (visibleRange?.end || 0) < sortedReplies.length;

  return (
    <div className="space-y-4" id={`comment-${comment.id}`}>
      <div className="flex gap-4">
        <button 
          onClick={() => router.push(`/profile?uid=${comment.userId}`)}
          className="h-10 w-10 shrink-0 hover:opacity-80 transition-opacity"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={`https://picsum.photos/seed/${comment.userId}/100`} />
            <AvatarFallback>{currentDisplayName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <button 
                onClick={() => router.push(`/profile?uid=${comment.userId}`)}
                className="font-bold text-sm md:text-base hover:text-accent transition-colors"
              >
                {currentDisplayName}
              </button>
              <span className="text-xs text-muted-foreground font-medium">@{currentUserName}</span>
              {comment.isAdmin && (
                <Badge className="bg-primary/20 text-primary border-none gap-1 px-2 py-0 h-5 text-[10px] font-bold">
                  <ShieldCheck className="h-3 w-3" />
                  ADMIN
                </Badge>
              )}
              {comment.isPremium && (
                <Badge className="bg-accent text-accent-foreground border-none gap-1 px-2 py-0 h-5 text-[10px] font-bold">
                  <Sparkles className="h-3 w-3" />
                  PREMIUM
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground ml-2">
                {comment.createdAt?.toDate?.()?.toLocaleDateString() || 'Just now'}
              </span>
            </div>
            
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-none shadow-xl">
                  {/* Reporting option removed as requested */}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">{comment.text}</p>
          
          <div className="flex items-center gap-4 pt-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-secondary/30 rounded-full px-2 py-0.5">
                <button 
                  onClick={() => onVote(comment.id, 'up')}
                  className={cn(
                    "hover:text-accent transition-colors p-1",
                    currentVote === 'up' && "text-accent"
                  )}
                  disabled={!user}
                >
                  <ThumbsUp className={cn("h-4 w-4", currentVote === 'up' && "fill-current")} />
                </button>
                <span className="text-xs font-bold min-w-[12px] text-center">
                  {comment.upvotes || 0}
                </span>
              </div>

              <div className="flex items-center gap-1 bg-secondary/30 rounded-full px-2 py-0.5">
                <button 
                  onClick={() => onVote(comment.id, 'down')}
                  className={cn(
                    "hover:text-destructive transition-colors p-1",
                    currentVote === 'down' && "text-destructive"
                  )}
                  disabled={!user}
                >
                  <ThumbsDown className={cn("h-4 w-4", currentVote === 'down' && "fill-current")} />
                </button>
                <span className="text-xs font-bold min-w-[12px] text-center">
                  {comment.downvotes || 0}
                </span>
              </div>
            </div>
            
            {user && (
              <button 
                onClick={() => onReply(comment.parentId || comment.id, comment.userName, !!comment.parentId)}
                className="text-xs text-muted-foreground hover:text-accent flex items-center gap-1 font-medium transition-colors"
              >
                <ReplyIcon className="h-3.5 w-3.5" />
                {language === 'ar' ? 'رد' : 'Reply'}
              </button>
            )}
          </div>
        </div>
      </div>

      {replies && replies.length > 0 && (
        <div className={cn(
          "space-y-4 pt-2 border-l-2",
          language === 'ar' ? "mr-6 pr-6 ml-0 border-r-2 border-l-0" : "ml-6 pl-6"
        )}>
          {hasPrevious && (
            <button 
              onClick={showPrevious}
              className="text-xs font-bold text-accent hover:underline flex items-center gap-2 py-2"
            >
              <ChevronUp className="h-3 w-3" />
              {language === 'ar' ? 'عرض 5 ردود سابقة' : 'Show 5 previous replies'}
            </button>
          )}

          {displayedReplies.map(reply => (
            <CommentItem 
              key={reply.id} 
              comment={reply} 
              user={user} 
              profile={profile} 
              isAdminUser={isAdminUser} 
              onVote={onVote}
              onReply={onReply}
              language={language}
              t={t}
              userVotes={userVotes}
            />
          ))}

          {hasMore && (
            <button 
              onClick={showMore}
              className="text-xs font-bold text-accent hover:underline flex items-center gap-2 py-2"
            >
              <ChevronDown className="h-3 w-3" />
              {language === 'ar' ? 'عرض 5 ردود تالية' : 'Show 5 more replies'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function WatchContent({ episodeId }: { episodeId: string }) {
  const searchParams = useSearchParams();
  const animeId = searchParams.get('animeId');
  
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { language, t } = useLanguage();

  const [commentText, setCommentText] = useState('');
  const [activeServer, setActiveServer] = useState<EpisodeServer | null>(null);
  const [isManualServerSelection, setIsManualServerSelection] = useState(false);
  
  const loadedEpisodeId = useRef<string | null>(null);

  const episodeRef = useMemoFirebase(() => {
    if (!db || !animeId || !episodeId) return null;
    return doc(db, 'anime', animeId, 'episodes', episodeId);
  }, [db, animeId, episodeId]);

  const animeRef = useMemoFirebase(() => {
    if (!db || !animeId) return null;
    return doc(db, 'anime', animeId);
  }, [db, animeId]);

  const allEpisodesQuery = useMemoFirebase(() => {
    if (!db || !animeId) return null;
    return query(collection(db, 'anime', animeId, 'episodes'), orderBy('episodeNumber', 'asc'));
  }, [db, animeId]);

  const { data: episode, isLoading: isEpLoading } = useDoc(episodeRef);
  const { data: anime, isLoading: isAnimeLoading } = useDoc(animeRef);
  const { data: episodes } = useCollection(allEpisodesQuery);

  const commentsQuery = useMemoFirebase(() => {
    if (!db || !animeId || !episodeId) return null;
    return query(collection(db, 'anime', animeId, 'episodes', episodeId, 'comments'), orderBy('createdAt', 'desc'));
  }, [db, animeId, episodeId]);
  const { data: comments } = useCollection<Comment>(commentsQuery);

  const userVotesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'comment_votes'), where('userId', '==', user.uid));
  }, [db, user]);
  const { data: userVotes } = useCollection(userVotesQuery);

  const profileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);
  const { data: profile } = useDoc(profileRef);

  const adminRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'admins', user.uid);
  }, [user, db]);
  const { data: adminDoc } = useDoc(adminRef);
  const isAdminUser = !!adminDoc;

  const animeTitle = language === 'ar' ? anime?.titleAr : anime?.titleEn;
  const epTitle = language === 'ar' ? episode?.titleAr : episode?.titleEn;

  const topLevelComments = useMemo(() => {
    return comments?.filter(c => !c.parentId) || [];
  }, [comments]);

  const getReplies = (parentId: string) => {
    return comments?.filter(c => c.parentId === parentId) || [];
  };

  useEffect(() => {
    if (episode?.servers?.length && (loadedEpisodeId.current !== episode.id || !isManualServerSelection)) {
      const preferred = episode.servers.find((s: EpisodeServer) => s.lang === language) || episode.servers[0];
      setActiveServer(preferred);
      loadedEpisodeId.current = episode.id;
    }
  }, [episode, language, isManualServerSelection]);

  const handlePostComment = async (parentId?: string) => {
    if (!user || !animeId || !episodeId || !profile || !db) return;
    
    // Removed restriction check as part of system removal
    const text = parentId ? '' : commentText;
    if (!text.trim() || text.length > COMMENT_LIMIT) return;

    const commentsRef = collection(db, 'anime', animeId, 'episodes', episodeId, 'comments');
    await addDocumentNonBlocking(commentsRef, {
      userId: user.uid,
      userName: profile.username,
      userDisplayName: profile.displayName || profile.username,
      episodeId,
      text: text.trim(),
      parentId: parentId || null,
      upvotes: 0,
      downvotes: 0,
      isAdmin: isAdminUser,
      isPremium: profile?.isPremium || false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    if (!parentId) {
      setCommentText('');
    }
  };

  const handleVote = async (commentId: string, direction: 'up' | 'down') => {
    if (!user || !db || !animeId || !episodeId) return;
    
    const voteId = `${user.uid}_${commentId}`;
    const voteRef = doc(db, 'comment_votes', voteId);
    const existingVote = userVotes?.find(v => v.commentId === commentId);
    const commentDocRef = doc(db, 'anime', animeId, 'episodes', episodeId, 'comments', commentId);

    if (existingVote) {
      if (existingVote.type === direction) {
        deleteDocumentNonBlocking(voteRef);
        updateDocumentNonBlocking(commentDocRef, {
          [direction === 'up' ? 'upvotes' : 'downvotes']: increment(-1),
          updatedAt: serverTimestamp()
        });
      } else {
        updateDocumentNonBlocking(voteRef, { type: direction, updatedAt: serverTimestamp() });
        updateDocumentNonBlocking(commentDocRef, {
          [existingVote.type === 'up' ? 'upvotes' : 'downvotes']: increment(-1),
          [direction === 'up' ? 'upvotes' : 'downvotes']: increment(1),
          updatedAt: serverTimestamp()
        });
      }
    } else {
      setDocumentNonBlocking(voteRef, {
        id: voteId,
        userId: user.uid,
        commentId,
        type: direction,
        createdAt: serverTimestamp()
      }, { merge: true });
      updateDocumentNonBlocking(commentDocRef, {
        [direction === 'up' ? 'upvotes' : 'downvotes']: increment(1),
        updatedAt: serverTimestamp()
      });
    }
  };

  if (isEpLoading || isAnimeLoading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!episode || !anime) return <div className="text-center py-20 font-headline text-2xl">Episode not found.</div>;

  const currentIdx = episodes?.findIndex(e => e.id === episodeId) ?? -1;
  const prevEp = currentIdx > 0 ? episodes?.[currentIdx - 1] : null;
  const nextEp = episodes && currentIdx < episodes.length - 1 ? episodes[currentIdx + 1] : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 md:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            <StreamPlayer url={activeServer?.url || ""} title={`${animeTitle} - ${language === 'ar' ? 'الحلقة' : 'Episode'} ${episode.episodeNumber}`} />
            
            <div className="flex items-center justify-between gap-4">
              <Button asChild variant="secondary" disabled={!prevEp} className="rounded-xl">
                {prevEp ? <Link href={`/watch/${prevEp.id}?animeId=${animeId}`}><ChevronLeft className="h-4 w-4 mr-2" />{language === 'ar' ? 'السابق' : 'Previous'}</Link> : <span className="opacity-50 flex items-center"><ChevronLeft className="h-4 w-4 mr-2" />{language === 'ar' ? 'السابق' : 'Previous'}</span>}
              </Button>
              <div className="text-sm font-bold bg-secondary/50 px-4 py-2 rounded-xl">{language === 'ar' ? 'الحلقة' : 'Episode'} {episode.episodeNumber}</div>
              <Button asChild variant="secondary" disabled={!nextEp} className="rounded-xl">
                {nextEp ? <Link href={`/watch/${nextEp.id}?animeId=${animeId}`}>{language === 'ar' ? 'التالي' : 'Next'}<ChevronRight className="h-4 w-4 ml-2" /></Link> : <span className="opacity-50 flex items-center">{language === 'ar' ? 'التالي' : 'Next'}<ChevronRight className="h-4 w-4 ml-2" /></span>}
              </Button>
            </div>

            <div className="space-y-4 rounded-2xl bg-secondary/30 p-4 border">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-accent" />
                  <h3 className="font-bold text-sm uppercase tracking-wider">{language === 'ar' ? 'اختر السيرفر' : 'Select Server'}</h3>
                </div>
              </div>
              <div className="space-y-4">
                {Object.entries(episode.servers?.reduce((acc: any, s: any) => { (acc[s.lang] = acc[s.lang] || []).push(s); return acc; }, {}) || {}).map(([lang, servers]: any) => (
                  <div key={lang} className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground flex items-center gap-2"><Globe className="h-3 w-3" />{lang === 'ar' ? 'العربية' : 'English'}</p>
                    <div className="flex flex-wrap gap-2">{servers.map((server: any, idx: number) => <Button key={idx} size="sm" variant={activeServer?.url === server.url ? "default" : "secondary"} className="rounded-lg font-bold px-4" onClick={() => { setActiveServer(server); setIsManualServerSelection(true); }}>{server.name}</Button>)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="font-headline text-2xl font-bold md:text-3xl">{epTitle}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                    <Link href={`/anime/${anime.id}`} className="text-accent hover:underline font-bold">{animeTitle}</Link>
                    <div className="flex items-center gap-1 text-yellow-400"><Star className="h-4 w-4 fill-current" /><span className="text-sm font-bold">{anime.rating?.toFixed(1) || '0.0'}</span></div>
                  </div>
                </div>
              </div>
            </div>

            <section className="space-y-6 pt-8">
              <div className="flex items-center gap-2"><MessageSquare className="h-6 w-6 text-accent" /><h2 className="font-headline text-2xl font-bold">{t('comments')} ({comments?.length || 0})</h2></div>
              {user ? (
                <div className="flex gap-4">
                  <Avatar className="h-10 w-10 shrink-0"><AvatarFallback>{(profile?.displayName || profile?.username || 'U')[0]}</AvatarFallback></Avatar>
                  <div className="flex-1 space-y-2 relative">
                    <Textarea 
                      placeholder={language === 'ar' ? 'انضم إلى المناقشة...' : "Join the discussion..."} 
                      className="min-h-[80px] rounded-xl bg-secondary/30 focus:ring-accent border-none" 
                      value={commentText} 
                      onChange={(e) => setCommentText(e.target.value)} 
                      maxLength={COMMENT_LIMIT} 
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{commentText.length}/{COMMENT_LIMIT}</span>
                      <Button onClick={() => handlePostComment()} disabled={!commentText.trim()} className="gap-2 rounded-xl bg-accent px-6 font-bold text-accent-foreground"><Send className="h-4 w-4" />{t('postComment')}</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-secondary/30 p-8 text-center"><p className="text-muted-foreground mb-4">{language === 'ar' ? 'يجب عليك تسجيل الدخول للتعليق.' : "You must be logged in to comment."}</p><Button asChild variant="outline"><Link href="/login">{t('login')}</Link></Button></div>
              )}

              <div className="space-y-8 pt-4">
                {topLevelComments.map((c) => (
                  <div key={c.id} className="space-y-4">
                    <CommentItem 
                      comment={c} 
                      user={user} 
                      profile={profile} 
                      isAdminUser={isAdminUser} 
                      onVote={handleVote}
                      onReply={(pid, name, isReply) => { /* Reply handling code if needed */ }}
                      language={language}
                      t={t}
                      userVotes={userVotes}
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-8">
            <section className="space-y-4">
              <h3 className="font-headline text-xl font-bold">{t('episodes')}</h3>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-2">
                  {episodes?.sort((a,b) => a.episodeNumber - b.episodeNumber).map(ep => (
                    <Link key={ep.id} href={`/watch/${ep.id}?animeId=${animeId}`} className={cn("flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-secondary/50", ep.id === episodeId ? "bg-accent/10 border border-accent/20" : "")}>
                      <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image src={(ep.thumbnail || anime.coverImage).trim()} alt={language === 'ar' ? ep.titleAr : ep.titleEn} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-accent uppercase">EP {ep.episodeNumber}</p>
                        <h4 className="text-sm font-bold truncate">{language === 'ar' ? ep.titleAr : ep.titleEn}</h4>
                      </div>
                    </Link>
                  ))}
                </div>
              </ScrollArea>
            </section>
            <AdBanner dataAdSlot="0987654321" />
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function WatchPage({ params }: { params: Promise<{ episodeId: string }> }) {
  const { episodeId } = use(params);
  return <Suspense fallback={<div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}><WatchContent episodeId={episodeId} /></Suspense>;
}
