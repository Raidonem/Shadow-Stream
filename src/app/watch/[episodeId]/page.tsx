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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../../../components/ui/select";
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
  MoreVertical,
  AlertTriangle,
  Flag,
  X,
  Trophy,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser } from '../../../firebase/index';
import { doc, collection, query, orderBy, serverTimestamp, increment, where, getDocs, updateDoc, limit, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useToast } from '../../../hooks/use-toast';
import { addDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '../../../firebase/non-blocking-updates';
import { useLanguage } from '../../../components/providers/LanguageContext';
import { translations } from '../../../lib/i18n';
import { EpisodeServer, Comment, UserProfile, AvatarItem, Episode, Anime, Rating } from '../../../lib/types';
import { cn, normalizeSearchString, ensureAbsoluteUrl } from '../../../lib/utils';
import { AdBanner } from '../../../components/ads/AdBanner';
import { AnimeCard } from '../../../components/anime/AnimeCard';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "../../../components/ui/dialog";
import { errorEmitter } from '../../../firebase/error-emitter';
import { FirestorePermissionError } from '../../../firebase/errors';

const COMMENT_LIMIT = 100;

function EpisodeRatingSystem({ animeId, episodeId, episodeDoc, userRatingDoc }: { 
  animeId: string; 
  episodeId: string; 
  episodeDoc: Episode | null;
  userRatingDoc: Rating | null;
}) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [isRating, setIsRating] = useState(false);
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);

  const currentAvg = useMemo(() => {
    if (!episodeDoc) return 0;
    if (episodeDoc.ratingCount && episodeDoc.ratingCount > 0) {
      const avg = (episodeDoc.totalRatingSum || 0) / episodeDoc.ratingCount;
      return Math.min(10, Math.max(0, avg));
    }
    return episodeDoc.rating || 0;
  }, [episodeDoc]);

  const handleRate = async (value: number) => {
    if (!user || !db || !animeId || !episodeDoc) {
      toast({ title: "Login Required", description: "Sign in to rate episodes." });
      return;
    }

    setIsRating(true);
    const ratingId = `${user.uid}_${episodeId}`;
    const ratingRef = doc(db, 'ratings', ratingId);
    const episodeRef = doc(db, 'anime', animeId, 'episodes', episodeId);
    const animeRef = doc(db, 'anime', animeId);

    try {
      const oldValue = userRatingDoc?.value || 0;
      const isUpdate = !!userRatingDoc;

      setDocumentNonBlocking(ratingRef, {
        id: ratingId,
        userId: user.uid,
        targetId: episodeId,
        targetType: 'episode',
        value: value,
        createdAt: serverTimestamp()
      }, { merge: true });

      const deltaSum = value - oldValue;
      const deltaCount = isUpdate ? 0 : 1;

      const newEpSum = (episodeDoc.totalRatingSum || 0) + deltaSum;
      const newEpCount = (episodeDoc.ratingCount || 0) + deltaCount;
      const newEpRating = newEpCount > 0 ? newEpSum / newEpCount : 0;

      updateDocumentNonBlocking(episodeRef, {
        ratingCount: increment(deltaCount),
        totalRatingSum: increment(deltaSum),
        rating: newEpRating,
        updatedAt: serverTimestamp()
      });

      const epsColRef = collection(db, 'anime', animeId, 'episodes');
      const epsSnapshot = await getDocs(epsColRef).catch(async (serverError) => {
        if (serverError.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: epsColRef.path,
            operation: 'list',
          });
          errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
      });

      const allEps = epsSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Episode));
      
      let totalSum = 0;
      let count = 0;
      allEps.forEach(ep => {
        const epSum = ep.id === episodeId ? (episodeDoc.totalRatingSum || 0) + deltaSum : (ep.totalRatingSum || 0);
        const epCount = ep.id === episodeId ? (episodeDoc.ratingCount || 0) + deltaCount : (ep.ratingCount || 0);
        
        if (epCount > 0) {
          totalSum += (epSum / epCount);
          count++;
        }
      });

      const newAnimeRating = count > 0 ? totalSum / count : 0;
      updateDocumentNonBlocking(animeRef, {
        rating: newAnimeRating,
        updatedAt: serverTimestamp()
      });

      toast({ 
        title: language === 'ar' ? 'تم التقييم' : "Rating Saved", 
        description: (language === 'ar' ? `لقد قيمت الحلقة بـ ${value}/10` : `You rated this episode ${value}/10`) 
      });
    } catch (err: any) {
      if (err.code !== 'permission-denied') {
        toast({ title: "Error", description: "Could not save rating.", variant: "destructive" });
      }
    } finally {
      setIsRating(false);
    }
  };

  const displayAvg = currentAvg > 0 ? currentAvg.toFixed(1) : (language === 'ar' ? '٠.٠' : '0.0');

  return (
    <div className="bg-secondary/20 rounded-2xl p-4 sm:p-6 border border-accent/10 overflow-hidden w-full max-w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <h3 className="font-bold text-lg">{language === 'ar' ? 'قيم هذه الحلقة' : 'Rate this Episode'}</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {language === 'ar' ? 'تقييمك يساعد في تحديد الترتيب العام للأنمي.' : 'Your rating helps determine the overall ranking of this anime.'}
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 w-full max-w-sm md:max-w-md">
          <div className="flex flex-wrap justify-center items-center gap-1 sm:gap-1.5">
            {[...Array(10)].map((_, i) => {
              const val = i + 1;
              const isActive = (hoveredValue !== null ? val <= hoveredValue : val <= (userRatingDoc?.value || 0));
              return (
                <button
                  key={val}
                  onMouseEnter={() => setHoveredValue(val)}
                  onMouseLeave={() => setHoveredValue(null)}
                  onClick={() => handleRate(val)}
                  disabled={isRating}
                  className={cn(
                    "w-5 h-5 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all shrink-0",
                    isActive ? "bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.4)] scale-110" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  )}
                >
                  <span className="text-[10px] sm:text-xs font-bold">{val}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between w-full px-1 text-[10px] font-bold uppercase text-muted-foreground">
            <span>{language === 'ar' ? 'سيء' : 'Poor'}</span>
            <span className="text-accent">
              {userRatingDoc ? (language === 'ar' ? `تقييمك: ${userRatingDoc.value}` : `Your Score: ${userRatingDoc.value}`) : ''}
            </span>
            <span>{language === 'ar' ? 'أسطوري' : 'Masterpiece'}</span>
          </div>
        </div>

        <div className="bg-background/40 rounded-xl px-4 py-3 border flex flex-col items-center min-w-[100px]">
          <span className="text-[10px] font-bold uppercase text-muted-foreground mb-1">{language === 'ar' ? 'متوسط الحلقة' : 'EP Average'}</span>
          <div className="flex items-center gap-1 text-2xl font-black text-accent">
            <Star className="h-5 w-5 fill-current" />
            {displayAvg}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ 
  comment, 
  user, 
  profile, 
  isAdminUser, 
  onVote, 
  onReply, 
  onReport,
  replies, 
  allComments,
  language,
  t,
  userVotes,
  officialAvatars
}: { 
  comment: Comment; 
  user: any; 
  profile: any; 
  isAdminUser: boolean; 
  onVote: (commentId: string, direction: 'up' | 'down') => void;
  onReply: (parentId: string, text: string) => Promise<void>;
  onReport: (comment: Comment) => void;
  replies?: Comment[];
  allComments?: Comment[];
  language: string;
  t: (key: any) => string;
  userVotes?: any[];
  officialAvatars?: AvatarItem[];
}) {
  const router = useRouter();
  const db = useFirestore();
  const [visibleRange, setVisibleRange] = useState<{ start: number; end: number } | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingSubmittingReply] = useState(false);
  
  const isOwnComment = user && comment.userId === user.uid;
  const currentDisplayName = isOwnComment ? (profile?.displayName || comment.userDisplayName) : (comment.userDisplayName || 'User');
  const currentUserName = isOwnComment ? (profile?.username || comment.userName) : (comment.userName || 'user');
  
  const currentVote = userVotes?.find(v => v.commentId === comment.id)?.type;

  const commentUserProfileRef = useMemoFirebase(() => {
    if (!db || !comment.userId) return null;
    return doc(db, 'users', comment.userId);
  }, [db, comment.userId]);
  const { data: commentUserProfile } = useDoc<UserProfile>(commentUserProfileRef);

  const resolvedAvatar = useMemo(() => {
    if (!commentUserProfile?.avatarId || !officialAvatars) return null;
    return officialAvatars.find(a => a.id === commentUserProfile.avatarId)?.url || null;
  }, [commentUserProfile?.avatarId, officialAvatars]);

  const sortedReplies = useMemo(() => {
    if (!replies) return [];
    return [...replies].sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
  }, [replies]);

  useEffect(() => {
    if (!sortedReplies.length) return;
    const start = Math.max(0, sortedReplies.length - 3);
    setVisibleRange({ start, end: sortedReplies.length });
  }, [sortedReplies.length]);

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

  const handleSubmitReply = async () => {
    if (!replyText.trim() || isSubmittingReply) return;
    setIsSubmittingSubmittingReply(true);
    try {
      await onReply(comment.id, replyText.trim());
      setReplyText('');
      setIsReplying(false);
    } finally {
      setIsSubmittingSubmittingReply(false);
    }
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
            {resolvedAvatar && <AvatarImage src={ensureAbsoluteUrl(resolvedAvatar)} />}
            <AvatarFallback className="bg-primary/10 text-primary font-bold">{currentDisplayName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
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
                  {!isOwnComment && (
                    <DropdownMenuItem 
                      className="text-destructive gap-2 cursor-pointer" 
                      onSelect={() => onReport(comment)}
                    >
                      <Flag className="h-4 w-4" />
                      {t('reportComment')}
                    </DropdownMenuItem>
                  )}
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
                onClick={() => setIsReplying(!isReplying)}
                className="text-xs text-muted-foreground hover:text-accent flex items-center gap-1 font-medium transition-colors"
              >
                <ReplyIcon className="h-3.5 w-3.5" />
                {language === 'ar' ? 'رد' : 'Reply'}
              </button>
            )}
          </div>

          {isReplying && (
            <div className="pt-2 animate-in fade-in slide-in-from-top-1">
              <div className="flex gap-2">
                <Textarea 
                  placeholder={language === 'ar' ? 'اكتب رداً...' : 'Write a reply...'}
                  className="min-h-[60px] bg-secondary/30 border-none rounded-xl text-sm"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  maxLength={COMMENT_LIMIT}
                />
                <div className="flex flex-col gap-2">
                  <Button size="icon" className="rounded-xl h-full px-4" onClick={handleSubmitReply} disabled={!replyText.trim() || isSubmittingReply}>
                    {isSubmittingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setIsReplying(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
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
              onReport={onReport}
              language={language}
              t={t}
              userVotes={userVotes}
              replies={allComments?.filter(r => r.parentId === reply.id)}
              allComments={allComments}
              officialAvatars={officialAvatars}
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
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  
  const [reportingComment, setReportingComment] = useState<Comment | null>(null);
  const [commentReportReason, setCommentReportReason] = useState('');
  const [isCommentReportDialogOpen, setIsCommentReportDialogOpen] = useState(false);
  
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

  const allAnimeQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'anime'), limit(100));
  }, [db]);

  const { data: episode, isLoading: isEpLoading } = useDoc<Episode>(episodeRef);
  const { data: anime, isLoading: isAnimeLoading } = useDoc<Anime>(animeRef);
  const { data: episodes } = useCollection<Episode>(allEpisodesQuery);
  const { data: allAnime } = useCollection<Anime>(allAnimeQuery);

  const userRatingRef = useMemoFirebase(() => {
    if (!db || !user || !episodeId) return null;
    return doc(db, 'ratings', `${user.uid}_${episodeId}`);
  }, [db, user?.uid, episodeId]);
  const { data: userRatingDoc } = useDoc<Rating>(userRatingRef);

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
  const { data: profile } = useDoc<UserProfile>(profileRef);

  const adminRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'admins', user.uid);
  }, [user, db]);
  const { data: adminDoc } = useDoc(adminRef);
  const isAdminUser = !!adminDoc;

  const avatarsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'avatars'), orderBy('createdAt', 'desc'));
  }, [db]);
  const { data: officialAvatars } = useCollection<AvatarItem>(avatarsQuery);

  const isRestricted = profile?.restrictedUntil && profile.restrictedUntil.toDate() > new Date();

  const animeTitle = language === 'ar' ? anime?.titleAr : anime?.titleEn;
  const epTitle = language === 'ar' ? episode?.titleAr : episode?.titleEn;

  const topLevelComments = useMemo(() => {
    return comments?.filter(c => !c.parentId) || [];
  }, [comments]);

  const getEpisodeThumbnail = (targetEp: Episode) => {
    const banner = ensureAbsoluteUrl((anime?.bannerImage || '').trim());
    const cover = ensureAbsoluteUrl((anime?.coverImage || '').trim());
    const fallback = banner !== '' ? banner : (cover !== '' ? cover : 'https://picsum.photos/seed/placeholder/400/600');

    if (!targetEp) return fallback;
    if (targetEp.thumbnail && targetEp.thumbnail.trim() !== '') return ensureAbsoluteUrl(targetEp.thumbnail);
    
    if (!episodes || episodes.length === 0) return fallback;

    const sorted = [...episodes].sort((a, b) => a.episodeNumber - b.episodeNumber);
    
    const prev = sorted
      .filter(e => e.episodeNumber < targetEp.episodeNumber && e.thumbnail && e.thumbnail.trim() !== '')
      .reverse()[0];
    
    if (prev) return ensureAbsoluteUrl(prev.thumbnail);

    const next = sorted
      .find(e => e.episodeNumber > targetEp.episodeNumber && e.thumbnail && e.thumbnail.trim() !== '');
    
    if (next) return ensureAbsoluteUrl(next.thumbnail);

    return fallback;
  };

  // Save to history when watching an episode
  useEffect(() => {
    if (user && db && anime && episode && animeId) {
      const historyRef = doc(db, 'users', user.uid, 'history', animeId);
      const thumbnail = getEpisodeThumbnail(episode);
      
      setDocumentNonBlocking(historyRef, {
        id: animeId,
        userId: user.uid,
        animeId: animeId,
        episodeId: episode.id,
        animeTitleEn: anime.titleEn,
        animeTitleAr: anime.titleAr,
        episodeTitleEn: episode.titleEn,
        episodeTitleAr: episode.titleAr,
        episodeNumber: episode.episodeNumber,
        thumbnail: thumbnail,
        watchedAt: serverTimestamp()
      }, { merge: true });
    }
  }, [user?.uid, db, anime?.id, episode?.id, animeId]);

  // Automatic watch tracking (independent system)
  useEffect(() => {
    if (user && db && episodeId && profileRef && profile && !profile.watchedEpisodeIds?.includes(episodeId)) {
      updateDocumentNonBlocking(profileRef, {
        watchedEpisodeIds: arrayUnion(episodeId)
      });
    }
  }, [user?.uid, db, episodeId, !!profile, !!profileRef]);

  useEffect(() => {
    if (episode?.servers?.length && (loadedEpisodeId.current !== episode.id || !isManualServerSelection)) {
      const preferred = episode.servers.find((s: EpisodeServer) => s.lang === language) || episode.servers[0];
      setActiveServer(preferred);
      loadedEpisodeId.current = episode.id;
    }
  }, [episode, language, isManualServerSelection]);

  useEffect(() => {
    if (!isReportDialogOpen && !isCommentReportDialogOpen) {
      document.body.style.pointerEvents = 'auto';
    }
  }, [isReportDialogOpen, isCommentReportDialogOpen]);

  // Auto-scroll the episode list to the current episode when it changes
  useEffect(() => {
    if (episodeId && episodes?.length) {
      const timer = setTimeout(() => {
        // Find all possible scrollable containers (desktop and mobile)
        const ids = [`ep-item-${episodeId}`, `ep-item-mobile-${episodeId}`];
        
        ids.forEach(id => {
          const element = document.getElementById(id);
          if (element) {
            const viewport = element.closest('[data-radix-scroll-area-viewport]');
            if (viewport) {
              // Only scroll the container that is currently visible to the user
              const rect = viewport.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                viewport.scrollTo({
                  top: element.offsetTop - 12,
                  behavior: 'smooth'
                });
              }
            }
          }
        });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [episodeId, !!episodes]);

  const suggestions = useMemo(() => {
    if (!allAnime || !anime) return [];
    
    const currentName = (anime.titleEn + ' ' + anime.titleAr).toLowerCase();
    const currentNameWords = currentName.split(/\W+/).filter(w => w.length > 2);
    const currentGenres = new Set(anime.genres || []);

    return allAnime
      .filter(a => a.id !== animeId)
      .map(a => {
        const targetName = (a.titleEn + ' ' + a.titleAr).toLowerCase();
        const targetNameWords = targetName.split(/\W+/).filter(w => w.length > 2);
        
        let nameMatches = 0;
        targetNameWords.forEach(w => {
          if (currentNameWords.includes(w)) nameMatches++;
        });

        const genreMatches = (a.genres || []).filter(g => currentGenres.has(g)).length;
        const score = (nameMatches * 100) + genreMatches;
        
        return { anime: a, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.anime);
  }, [allAnime, anime, animeId]);

  const handlePostComment = async (parentId?: string, text?: string) => {
    if (!user || !animeId || !episodeId || !profile || !db) return;
    
    if (isRestricted) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: t('restrictedUntil').replace('{date}', profile.restrictedUntil.toDate().toLocaleString())
      });
      return;
    }

    const finalText = text !== undefined ? text : commentText;
    if (!finalText.trim() || finalText.length > COMMENT_LIMIT) return;

    const commentsRef = collection(db, 'anime', animeId, 'episodes', episodeId, 'comments');
    addDocumentNonBlocking(commentsRef, {
      userId: user.uid,
      userName: profile.username,
      userDisplayName: profile.displayName || profile.username,
      episodeId,
      text: finalText.trim(),
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
    
    const voteId = `${user.uid}_comment_vote_${commentId}`;
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

  const handleSendReport = async () => {
    if (!user || !db || !animeId || !episodeId || !reportReason.trim()) return;
    setIsReporting(true);

    try {
      addDocumentNonBlocking(collection(db, 'reports'), {
        type: 'episode_server',
        userId: user.uid,
        userName: profile?.username || 'user',
        animeId,
        episodeId,
        animeTitleEn: anime?.titleEn,
        episodeNumber: episode?.episodeNumber,
        reason: reportReason.trim(),
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast({ title: t('reportSent') });
      setReportReason('');
      setIsReportDialogOpen(false);
    } finally {
      setIsReporting(false);
    }
  };

  const handleReportComment = async () => {
    if (!user || !db || !animeId || !episodeId || !reportingComment || !commentReportReason.trim()) return;
    setIsReporting(true);

    try {
      addDocumentNonBlocking(collection(db, 'reports'), {
        type: 'comment',
        userId: user.uid,
        userName: profile?.username || 'user',
        animeId,
        episodeId,
        animeTitleEn: anime?.titleEn,
        episodeNumber: episode?.episodeNumber,
        commentId: reportingComment.id,
        commentText: reportingComment.text,
        reportedUserId: reportingComment.userId,
        reportedUserName: reportingComment.userName,
        reason: commentReportReason.trim(),
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast({ title: t('reportSent') });
      setCommentReportReason('');
      setReportingComment(null);
      setIsCommentReportDialogOpen(false);
    } finally {
      setIsReporting(false);
    }
  };

  const openReportCommentDialog = (comment: Comment) => {
    setTimeout(() => {
      setReportingComment(comment);
      setIsCommentReportDialogOpen(true);
    }, 100);
  };

  const handleToggleWatched = (e: React.MouseEvent, epId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !profileRef || !profile) return;

    const isWatched = profile.watchedEpisodeIds?.includes(epId);
    updateDocumentNonBlocking(profileRef, {
      watchedEpisodeIds: isWatched ? arrayRemove(epId) : arrayUnion(epId)
    });
  };

  if (isEpLoading || isAnimeLoading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!episode || !anime || !animeId) return <div className="text-center py-20 font-headline text-2xl">Episode not found.</div>;

  const currentIdx = episodes?.findIndex(e => e.id === episodeId) ?? -1;
  const prevEp = currentIdx > 0 ? episodes?.[currentIdx - 1] : null;
  const nextEp = episodes && currentIdx < episodes.length - 1 ? episodes[currentIdx + 1] : null;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <main className="container mx-auto px-4 py-8 md:px-8 max-w-full overflow-hidden">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
          <div className="space-y-6 min-w-0 w-full max-w-full overflow-hidden">
            <div className="w-full max-w-full">
              <StreamPlayer url={activeServer?.url || ""} title={`${animeTitle} - ${language === 'ar' ? 'الحلقة' : 'Episode'} ${episode.episodeNumber}`} />
            </div>
            
            <div className="flex items-center justify-between gap-2 sm:gap-4 w-full max-w-full overflow-hidden px-1">
              <Button asChild variant="secondary" disabled={!prevEp} className="rounded-xl flex-1 max-w-[140px] px-2 sm:px-4">
                {prevEp ? (
                  <Link href={`/watch/${prevEp.id}?animeId=${animeId}`}>
                    <ChevronLeft className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm hidden sm:inline">{language === 'ar' ? 'السابق' : 'Previous'}</span>
                    <span className="text-xs sm:hidden">{language === 'ar' ? 'السابق' : 'Prev'}</span>
                  </Link>
                ) : (
                  <span className="opacity-50 flex items-center">
                    <ChevronLeft className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm hidden sm:inline">{language === 'ar' ? 'السابق' : 'Previous'}</span>
                    <span className="text-xs sm:hidden">{language === 'ar' ? 'السابق' : 'Prev'}</span>
                  </span>
                )}
              </Button>
              <div className="text-[10px] sm:text-sm font-bold bg-secondary/50 px-2 sm:px-4 py-2 rounded-xl whitespace-nowrap shrink-0">
                {language === 'ar' ? 'الحلقة' : 'Episode'} {episode.episodeNumber}
              </div>
              <Button asChild variant="secondary" disabled={!nextEp} className="rounded-xl flex-1 max-w-[140px] px-2 sm:px-4">
                {nextEp ? (
                  <Link href={`/watch/${nextEp.id}?animeId=${animeId}`}>
                    <span className="text-xs sm:text-sm hidden sm:inline">{language === 'ar' ? 'التالي' : 'Next'}</span>
                    <span className="text-xs sm:hidden">{language === 'ar' ? 'التالي' : 'Next'}</span>
                    <ChevronRight className="h-4 w-4 ml-1 sm:mr-2" />
                  </Link>
                ) : (
                  <span className="opacity-50 flex items-center">
                    <span className="text-xs sm:text-sm hidden sm:inline">{language === 'ar' ? 'التالي' : 'Next'}</span>
                    <span className="text-xs sm:hidden">{language === 'ar' ? 'التالي' : 'Next'}</span>
                    <ChevronRight className="h-4 w-4 ml-1 sm:mr-2" />
                  </span>
                )}
              </Button>
            </div>

            <div className="w-full max-w-full overflow-hidden">
              <EpisodeRatingSystem 
                animeId={animeId} 
                episodeId={episodeId} 
                episodeDoc={episode}
                userRatingDoc={userRatingDoc || null}
              />
            </div>

            <div className="space-y-4 rounded-2xl bg-secondary/30 p-4 border w-full max-w-full overflow-hidden">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-accent" />
                  <h3 className="font-bold text-sm uppercase tracking-wider">{language === 'ar' ? 'اختر السيرفر' : 'Select Server'}</h3>
                </div>

                {user && (
                  <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 text-muted-foreground hover:text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        {t('reportIssue')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-none">
                      <DialogHeader>
                        <DialogTitle>{t('serverIssue')}</DialogTitle>
                        <DialogDescription>
                          {language === 'ar' ? 'أخبرنا بمشكلة هذا السيرفر وسنتحقق منها قريباً.' : 'Tell us what is wrong with this server and we will investigate it shortly.'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Select value={reportReason} onValueChange={reportReason => setReportReason(reportReason)}>
                          <SelectTrigger className="rounded-xl bg-secondary/50 border-none">
                            <SelectValue placeholder={t('reportReason')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Video not loading">Video not loading</SelectItem>
                            <SelectItem value="Wrong episode">Wrong episode</SelectItem>
                            <SelectItem value="Bad quality">Bad quality</SelectItem>
                            <SelectItem value="Broken link">Broken link</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <Button className="rounded-xl gap-2" onClick={handleSendReport} disabled={!reportReason || isReporting}>
                          {isReporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          {language === 'ar' ? 'إرسال البلاغ' : 'Send Report'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              <div className="space-y-4 overflow-hidden">
                {Object.entries(episode.servers?.reduce((acc: any, s: any) => { (acc[s.lang] = acc[s.lang] || []).push(s); return acc; }, {}) || {}).map(([lang, servers]: any) => (
                  <div key={lang} className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground flex items-center gap-2"><Globe className="h-3 w-3" />{lang === 'ar' ? 'العربية' : 'English'}</p>
                    <div className="flex flex-wrap gap-2">{servers.map((server: any, idx: number) => <Button key={idx} size="sm" variant={activeServer?.url === server.url ? "default" : "secondary"} className="rounded-lg font-bold px-4" onClick={() => { setActiveServer(server); setIsManualServerSelection(true); }}>{server.name}</Button>)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-6 w-full max-w-full overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <h1 className="font-headline text-2xl font-bold md:text-3xl break-words">{epTitle}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                    <Link href={`/anime/${anime.id}`} className="text-accent hover:underline font-bold truncate max-w-[200px]">{animeTitle}</Link>
                    <div className="flex items-center gap-1 text-yellow-400"><Star className="h-4 w-4 fill-current" /><span className="text-sm font-bold">{anime.rating?.toFixed(1) || '0.0'}</span></div>
                  </div>
                </div>
              </div>
            </div>

            <section className="space-y-6 pt-8 w-full max-w-full overflow-hidden">
              <div className="flex items-center gap-2"><MessageSquare className="h-6 w-6 text-accent" /><h2 className="font-headline text-2xl font-bold">{t('comments')} ({comments?.length || 0})</h2></div>
              
              {isRestricted && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                  <p className="text-sm font-medium text-destructive">
                    {t('restrictedUntil').replace('{date}', profile.restrictedUntil.toDate().toLocaleString())}
                  </p>
                </div>
              )}

              {user && !isRestricted ? (
                <div className="flex gap-4 w-full max-w-full">
                  <Avatar className="h-10 w-10 shrink-0">
                    {profile?.avatarId && officialAvatars?.find(a => a.id === profile.avatarId) ? (
                      <AvatarImage src={ensureAbsoluteUrl(officialAvatars.find(a => a.id === profile.avatarId)!.url)} />
                    ) : (
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">{(profile?.displayName || profile?.username || 'U')[0]}</AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 space-y-2 min-w-0">
                    <Textarea 
                      placeholder={language === 'ar' ? 'انضم إلى المناقشة...' : "Join the discussion..."} 
                      className="min-h-[80px] rounded-xl bg-secondary/30 focus:ring-accent border-none w-full" 
                      value={commentText} 
                      onChange={(e) => setCommentText(e.target.value)} 
                      maxLength={COMMENT_LIMIT} 
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">{commentText.length}/{COMMENT_LIMIT}</span>
                      <Button onClick={() => handlePostComment()} disabled={!commentText.trim()} className="gap-2 rounded-xl bg-accent px-4 sm:px-6 font-bold text-accent-foreground text-xs sm:text-sm"><Send className="h-4 w-4" />{t('postComment')}</Button>
                    </div>
                  </div>
                </div>
              ) : !user && (
                <div className="rounded-xl bg-secondary/30 p-8 text-center"><p className="text-muted-foreground mb-4">{language === 'ar' ? 'يجب عليك تسجيل الدخول للتعليق.' : "You must be logged in to comment."}</p><Button asChild variant="outline"><Link href="/login">{t('login')}</Link></Button></div>
              )}

              <div className="space-y-8 pt-4 overflow-hidden">
                {topLevelComments.map((c) => (
                  <div key={c.id} className="space-y-4">
                    <CommentItem 
                      comment={c} 
                      user={user} 
                      profile={profile} 
                      isAdminUser={isAdminUser} 
                      onVote={handleVote}
                      onReply={(pid, text) => handlePostComment(pid, text)}
                      onReport={openReportCommentDialog}
                      language={language}
                      t={t}
                      userVotes={userVotes}
                      replies={comments?.filter(r => r.parentId === c.id)}
                      allComments={comments || []}
                      officialAvatars={officialAvatars}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Episode List (Mobile Only) - Displayed above suggestions on thin screens */}
            <section className="lg:hidden space-y-4 w-full pt-12 border-t mt-12 overflow-hidden">
              <h3 className="font-headline text-xl font-bold px-1">{t('episodes')}</h3>
              <ScrollArea className="h-[400px] w-full">
                <div className="space-y-3 p-3 pr-4">
                  {episodes?.sort((a,b) => a.episodeNumber - b.episodeNumber).map(ep => {
                    const rating = (ep.ratingCount && ep.ratingCount > 0) 
                      ? (ep.totalRatingSum || 0) / ep.ratingCount 
                      : (ep.rating || 0);
                    const epAvg = rating > 0 ? rating.toFixed(1) : (language === 'ar' ? '٠.٠' : '0.0');
                    const thumbnail = getEpisodeThumbnail(ep);
                    const isWatched = profile?.watchedEpisodeIds?.includes(ep.id);
                    
                    const title = language === 'ar' ? ep.titleAr : ep.titleEn;

                    return (
                      <div key={ep.id} className="flex items-center gap-2 group w-full relative min-w-0 overflow-hidden bg-transparent">
                        <Link 
                          id={`ep-item-mobile-${ep.id}`}
                          href={`/watch/${ep.id}?animeId=${animeId}`} 
                          className={cn(
                            "flex flex-1 min-w-0 max-w-full items-center gap-3 p-2 rounded-xl transition-all duration-300",
                            ep.id === episodeId 
                              ? "bg-transparent border border-accent/20" 
                              : "bg-transparent hover:bg-secondary/40"
                          )}
                        >
                          <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                            <Image src={ensureAbsoluteUrl(thumbnail)} alt={language === 'ar' ? ep.titleAr : ep.titleEn} fill className="object-cover" />
                          </div>
                          <div className="flex-1 min-w-0 pr-8">
                            <p className="text-[10px] font-black text-accent uppercase truncate">EP {ep.episodeNumber}</p>
                            <h4 className="text-sm font-bold leading-tight break-words">
                              {title}
                            </h4>
                            <div className="flex items-center gap-1 text-[10px] text-yellow-500 font-bold">
                              <Star className="h-2 w-2 fill-current" />
                              {epAvg}
                            </div>
                          </div>
                        </Link>
                        
                        <div className="shrink-0 flex items-center justify-center p-1 rounded-xl bg-transparent">
                          {user && (
                            <button
                              onClick={(e) => handleToggleWatched(e, ep.id)}
                              className={cn(
                                "p-2 rounded-full transition-all hover:bg-secondary/80 pointer-events-auto",
                                isWatched 
                                  ? "text-primary drop-shadow-[0_0_12px_hsl(var(--accent))]" 
                                  : "text-muted-foreground/20 hover:text-muted-foreground/60"
                              )}
                            >
                              <Eye className={cn("h-4 w-4", isWatched && "fill-current")} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </section>

            {suggestions.length > 0 && (
              <section className="space-y-6 pt-12 border-t mt-12 w-full max-w-full overflow-hidden">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-accent" />
                  <h2 className="font-headline text-2xl font-bold">{t('recommended')}</h2>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {suggestions.map((anime) => (
                    <AnimeCard key={anime.id} anime={anime} />
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-8 w-full max-w-full min-w-0 overflow-hidden">
            <section className="hidden lg:block space-y-4 w-full min-w-0 overflow-hidden">
              <h3 className="font-headline text-xl font-bold px-1">{t('episodes')}</h3>
              <ScrollArea className="h-[600px] w-full border rounded-2xl bg-card/50 shadow-inner">
                <div className="space-y-3 p-3 pr-4">
                  {episodes?.sort((a,b) => a.episodeNumber - b.episodeNumber).map(ep => {
                    const rating = (ep.ratingCount && ep.ratingCount > 0) 
                      ? (ep.totalRatingSum || 0) / ep.ratingCount 
                      : (ep.rating || 0);
                    const epAvg = rating > 0 ? rating.toFixed(1) : (language === 'ar' ? '٠.٠' : '0.0');
                    const thumbnail = getEpisodeThumbnail(ep);
                    const isWatched = profile?.watchedEpisodeIds?.includes(ep.id);
                    
                    const title = language === 'ar' ? ep.titleAr : ep.titleEn;

                    return (
                      <div key={ep.id} className="flex items-center gap-2 group w-full relative min-w-0 overflow-hidden bg-transparent">
                        <Link 
                          id={`ep-item-${ep.id}`}
                          href={`/watch/${ep.id}?animeId=${animeId}`} 
                          className={cn(
                            "flex flex-1 min-w-0 max-w-full items-center gap-3 p-2 rounded-xl transition-all duration-300",
                            ep.id === episodeId 
                              ? "bg-transparent border border-accent/20" 
                              : "bg-transparent hover:bg-secondary/40"
                          )}
                        >
                          <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                            <Image src={ensureAbsoluteUrl(thumbnail)} alt={language === 'ar' ? ep.titleAr : ep.titleEn} fill className="object-cover" />
                          </div>
                          <div className="flex-1 min-w-0 pr-8">
                            <p className="text-[10px] font-black text-accent uppercase truncate">EP {ep.episodeNumber}</p>
                            <h4 className="text-sm font-bold leading-tight break-words">
                              {title}
                            </h4>
                            <div className="flex items-center gap-1 text-[10px] text-yellow-500 font-bold">
                              <Star className="h-2 w-2 fill-current" />
                              {epAvg}
                            </div>
                          </div>
                        </Link>
                        
                        <div className="shrink-0 flex items-center justify-center p-1 rounded-xl bg-transparent">
                          {user && (
                            <button
                              onClick={(e) => handleToggleWatched(e, ep.id)}
                              className={cn(
                                "p-2 rounded-full transition-all hover:bg-secondary/80 pointer-events-auto",
                                isWatched 
                                  ? "text-primary drop-shadow-[0_0_12px_hsl(var(--accent))]" 
                                  : "text-muted-foreground/20 hover:text-muted-foreground/60"
                              )}
                            >
                              <Eye className={cn("h-4 w-4", isWatched && "fill-current")} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </section>
            <div className="w-full overflow-hidden">
              <AdBanner dataAdSlot="0987654321" />
            </div>
          </aside>
        </div>
      </main>

      <Dialog open={isCommentReportDialogOpen} onOpenChange={setIsCommentReportDialogOpen}>
        <DialogContent className="bg-card border-none">
          <DialogHeader>
            <DialogTitle>{t('reportComment')}</DialogTitle>
            <DialogDescription>
              {language === 'ar' ? 'لماذا تبلغ عن هذا التعليق؟' : 'Why are you reporting this comment?'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-secondary/30 p-3 border text-sm italic text-muted-foreground">
              "{reportingComment?.text}"
            </div>
            <Select value={commentReportReason} onValueChange={commentReportReason => setCommentReportReason(commentReportReason)}>
              <SelectTrigger className="rounded-xl bg-secondary/50 border-none">
                <SelectValue placeholder={t('reportReason')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Spam">Spam</SelectItem>
                <SelectItem value="Harassment">Harassment</SelectItem>
                <SelectItem value="Hate Speech">Hate Speech</SelectItem>
                <SelectItem value="Spoilers">Spoilers</SelectItem>
                <SelectItem value="Inappropriate Content">Inappropriate Content</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button className="rounded-xl gap-2" onClick={handleReportComment} disabled={!commentReportReason || isReporting}>
              {isReporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
              {language === 'ar' ? 'إرسال البلاغ' : 'Send Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function WatchPage({ params }: { params: Promise<{ episodeId: string }> }) {
  const { episodeId } = use(params);
  return <Suspense fallback={<div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}><WatchContent episodeId={episodeId} /></Suspense>;
}
