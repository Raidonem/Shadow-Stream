
"use client";

import { useState, use, useEffect, Suspense, useRef, useMemo } from 'react';
import { Navbar } from '../../../components/layout/Navbar';
import { StreamPlayer } from '../../../components/anime/StreamPlayer';
import { AnimeCard } from '../../../components/anime/AnimeCard';
import { Button } from '../../../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { 
  Heart, 
  MessageSquare,
  Send,
  Loader2,
  Star,
  AlertCircle,
  Server,
  Globe,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Layers,
  ThumbsUp,
  ThumbsDown,
  Reply as ReplyIcon,
  AtSign,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser } from '../../../firebase/index';
import { doc, collection, query, orderBy, serverTimestamp, updateDoc, arrayUnion, arrayRemove, where, getDocs, increment, deleteDoc, documentId, limit } from 'firebase/firestore';
import { useToast } from '../../../hooks/use-toast';
import { addDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '../../../firebase/non-blocking-updates';
import { useLanguage } from '../../../components/providers/LanguageContext';
import { translations } from '../../../lib/i18n';
import { EpisodeServer, Anime, Comment, UserProfile, UserNotification } from '../../../lib/types';
import { cn, normalizeSearchString } from '../../../lib/utils';
import { AdBanner } from '../../../components/ads/AdBanner';
import Image from 'next/image';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";

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
    
    // Check for deep link mention
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const targetId = hash.replace('#comment-', '');
    const targetIndex = sortedReplies.findIndex(r => r.id === targetId);

    if (targetIndex !== -1 && !visibleRange) {
      // Focus on the specific mentioned reply
      setVisibleRange({ start: targetIndex, end: targetIndex + 1 });
    } else if (!visibleRange) {
      // Default view: last 3 replies
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
  const [replyText, setReplyText] = useState('');
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [activeServer, setActiveServer] = useState<EpisodeServer | null>(null);
  const [isManualServerSelection, setIsManualServerSelection] = useState(false);
  const [showTagSuggestions, setShowTagSuggestions] = useState<string | null>(null); 
  const loadedEpisodeId = useRef<string | null>(null);
  const incrementedViews = useRef<string | null>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

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

  const commentsRef = useMemoFirebase(() => {
    if (!db || !animeId || !episodeId) return null;
    return collection(db, 'anime', animeId, 'episodes', episodeId, 'comments');
  }, [db, animeId, episodeId]);

  const commentsQuery = useMemoFirebase(() => {
    if (!commentsRef) return null;
    return query(commentsRef, orderBy('createdAt', 'desc'));
  }, [commentsRef]);

  const episodeRatingRef = useMemoFirebase(() => {
    if (!user || !db || !animeId || !episodeId) return null;
    return doc(db, 'ratings', `${user.uid}_${episodeId}`);
  }, [user, db, animeId, episodeId]);

  const allAnimeQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'anime'));
  }, [db]);

  const userVotesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'comment_votes'), where('userId', '==', user.uid));
  }, [db, user]);

  const friendshipsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'friendships'), where('userIds', 'array-contains', user.uid));
  }, [db, user]);

  const { data: episode, isLoading: isEpLoading } = useDoc(episodeRef);
  const { data: anime, isLoading: isAnimeLoading } = useDoc(animeRef);
  const { data: episodes } = useCollection(allEpisodesQuery);
  const { data: comments } = useCollection<Comment>(commentsQuery);
  const { data: existingRating } = useDoc(episodeRatingRef);
  const { data: allAnime } = useCollection<Anime>(allAnimeQuery);
  const { data: userVotes } = useCollection(userVotesQuery);
  const { data: friendships } = useCollection(friendshipsQuery);

  const friendIds = useMemo(() => {
    return friendships?.map(f => f.userIds.find(id => id !== user?.uid)).filter(Boolean) as string[] || [];
  }, [friendships, user?.uid]);

  const friendsProfilesQuery = useMemoFirebase(() => {
    if (!db || !friendIds.length) return null;
    return query(collection(db, 'users'), where(documentId(), 'in', friendIds.slice(0, 10)));
  }, [db, (friendIds || []).sort().join(',')]);

  const { data: friendProfiles } = useCollection<UserProfile>(friendsProfilesQuery);

  const profileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);

  const adminRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'admins', user.uid);
  }, [user, db]);

  const { data: profile } = useDoc(profileRef);
  const { data: adminDoc } = useDoc(adminRef);

  const isAnimeInWatchlist = profile?.watchlistAnimeIds?.includes(animeId || '');
  const isAnimeFavorite = profile?.favoriteAnimeIds?.includes(animeId || '');
  const isAdminUser = !!adminDoc;

  const animeTitle = language === 'ar' ? anime?.titleAr : anime?.titleEn;
  const epTitle = language === 'ar' ? episode?.titleAr : episode?.titleEn;
  const tTags = translations[language].tags;

  const topLevelComments = useMemo(() => {
    return comments?.filter(c => !c.parentId) || [];
  }, [comments]);

  const getReplies = (parentId: string) => {
    return comments?.filter(c => c.parentId === parentId) || [];
  };

  const getEpisodeThumbnail = (targetEp: any) => {
    const banner = (anime?.bannerImage || '').trim();
    const cover = (anime?.coverImage || '').trim();
    const fallback = banner !== '' ? banner : (cover !== '' ? cover : 'https://picsum.photos/seed/placeholder/400/600');

    if (!targetEp) return fallback;
    if (targetEp.thumbnail && targetEp.thumbnail.trim() !== '') return targetEp.thumbnail;
    if (!episodes || episodes.length === 0) return fallback;

    const sorted = [...episodes].sort((a, b) => a.episodeNumber - b.episodeNumber);
    const prev = sorted.filter(e => e.episodeNumber < targetEp.episodeNumber && e.thumbnail && e.thumbnail.trim() !== '').reverse()[0];
    if (prev) return prev.thumbnail;
    const next = sorted.find(e => e.episodeNumber > targetEp.episodeNumber && e.thumbnail && e.thumbnail.trim() !== '');
    if (next) return next.thumbnail;
    return fallback;
  };

  const suggestedAnime = useMemo(() => {
    if (!allAnime || !anime) return [];
    return allAnime
      .filter(a => a.id !== anime.id)
      .filter(a => {
        const normalizedA = normalizeSearchString(a.titleEn);
        const normalizedCurrent = normalizeSearchString(anime.titleEn);
        const hasSimilarName = normalizedA.includes(normalizedCurrent) || normalizedCurrent.includes(normalizedA);
        const hasCommonGenre = a.genres?.some(g => anime.genres?.includes(g));
        return hasSimilarName || hasCommonGenre;
      })
      .sort((a, b) => {
        const aNameSim = normalizeSearchString(a.titleEn).includes(normalizeSearchString(anime.titleEn)) ? 1 : 0;
        const bNameSim = normalizeSearchString(b.titleEn).includes(normalizeSearchString(anime.titleEn)) ? 1 : 0;
        return bNameSim - aNameSim;
      })
      .slice(0, 6);
  }, [allAnime, anime]);

  useEffect(() => {
    if (episode?.servers?.length && (loadedEpisodeId.current !== episode.id || !isManualServerSelection)) {
      const preferred = episode.servers.find((s: EpisodeServer) => s.lang === language) || episode.servers[0];
      setActiveServer(preferred);
      loadedEpisodeId.current = episode.id;
    }
  }, [episode, language, isManualServerSelection]);

  useEffect(() => {
    if (user && db && anime && episode && incrementedViews.current !== episode.id) {
      const finalThumbnail = getEpisodeThumbnail(episode);
      const historyRef = doc(db, 'users', user.uid, 'history', episodeId);
      setDocumentNonBlocking(historyRef, {
        id: episodeId,
        userId: user.uid,
        animeId: anime.id,
        episodeId: episodeId,
        animeTitleEn: anime.titleEn,
        animeTitleAr: anime.titleAr,
        episodeTitleEn: episode.titleEn,
        episodeTitleAr: episode.titleAr,
        episodeNumber: episode.episodeNumber,
        thumbnail: finalThumbnail,
        watchedAt: serverTimestamp()
      }, { merge: true });

      const viewKey = `ss_viewed_${user.uid}_${episodeId}`;
      const hasViewed = typeof window !== 'undefined' ? localStorage.getItem(viewKey) : null;
      if (!hasViewed && !isAdminUser) {
        const animeDocRef = doc(db, 'anime', anime.id);
        updateDocumentNonBlocking(animeDocRef, {
          views: increment(1),
          updatedAt: serverTimestamp()
        });
        if (typeof window !== 'undefined') localStorage.setItem(viewKey, 'true');
      }
      incrementedViews.current = episode.id;
    }
  }, [user, db, anime, episode, episodeId, isAdminUser, episodes]);

  const handlePostComment = async (parentId?: string) => {
    if (!user || !commentsRef || !episodeId || !profile || !db) {
      toast({ title: "Please wait", description: "Loading profile data..." });
      return;
    }
    const text = parentId ? replyText : commentText;
    if (!text.trim() || text.length > COMMENT_LIMIT) return;

    const finalUserName = profile.username;
    const finalDisplayName = profile.displayName || profile.username;

    const newDoc = await addDocumentNonBlocking(commentsRef, {
      userId: user.uid,
      userName: finalUserName,
      userDisplayName: finalDisplayName,
      episodeId: episodeId,
      text: text.trim(),
      parentId: parentId || null,
      upvotes: 0,
      downvotes: 0,
      isAdmin: isAdminUser,
      isPremium: profile?.isPremium || false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const mentionRegex = /@(\w+)/g;
    const mentions = text.match(mentionRegex);
    if (mentions) {
      const uniqueMentions = Array.from(new Set(mentions.map(m => m.substring(1).toLowerCase())));
      uniqueMentions.forEach(username => {
        const targetFriend = friendProfiles?.find(f => f.username.toLowerCase() === username);
        if (targetFriend && targetFriend.id !== user.uid) {
          addDocumentNonBlocking(collection(db, 'users', targetFriend.id, 'notifications'), {
            type: 'comment_mention',
            fromId: user.uid,
            fromName: finalDisplayName,
            link: `/watch/${episodeId}?animeId=${animeId}#comment-${newDoc?.id || parentId || ''}`,
            messageEn: `${finalDisplayName} tagged you in a comment.`,
            messageAr: `قام ${finalDisplayName} بذكرك في تعليق.`,
            read: false,
            createdAt: serverTimestamp()
          });
        }
      });
    }

    if (parentId) {
      const parentComment = comments?.find(c => c.id === parentId);
      if (parentComment && parentComment.userId !== user.uid) {
        addDocumentNonBlocking(collection(db, 'users', parentComment.userId, 'notifications'), {
          type: 'comment_reply',
          fromId: user.uid,
          fromName: finalDisplayName,
          link: `/watch/${episodeId}?animeId=${animeId}#comment-${parentId}`,
          messageEn: `${finalDisplayName} replied to your comment.`,
          messageAr: `قام ${finalDisplayName} بالرد على تعليقك.`,
          read: false,
          createdAt: serverTimestamp()
        });
      }
    }

    if (parentId) {
      setReplyText('');
      setActiveReplyId(null);
    } else {
      setCommentText('');
    }
    toast({ title: parentId ? (language === 'ar' ? 'تم الرد' : 'Reply posted') : t('postComment') });
  };

  const handleVote = async (commentId: string, direction: 'up' | 'down') => {
    if (!user || !db || !animeId || !episodeId || !profile) return;
    
    const voteId = `${user.uid}_${commentId}`;
    const voteRef = doc(db, 'comment_votes', voteId);
    const existingVote = userVotes?.find(v => v.commentId === commentId);
    const commentDocRef = doc(db, 'anime', animeId, 'episodes', episodeId, 'comments', commentId);
    const comment = comments?.find(c => c.id === commentId);

    if (!comment) return;

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

      // Aggregated Notification Logic
      if (comment.userId !== user.uid) {
        const notifType = direction === 'up' ? 'comment_like' : 'comment_dislike';
        const link = `/watch/${episodeId}?animeId=${animeId}#comment-${commentId}`;
        const notificationsRef = collection(db, 'users', comment.userId, 'notifications');
        
        const q = query(
          notificationsRef, 
          where('type', '==', notifType), 
          where('link', '==', link),
          limit(1)
        );
        
        const notifSnapshot = await getDocs(q);
        const reactorsCount = (direction === 'up' ? comment.upvotes : comment.downvotes) || 0;
        const totalReactors = reactorsCount + 1;
        
        let messageEn = '';
        let messageAr = '';

        if (totalReactors === 1) {
          messageEn = `${profile.displayName || profile.username} ${direction === 'up' ? 'liked' : 'disliked'} your comment.`;
          messageAr = `${direction === 'up' ? 'أعجب' : 'لم يعجب'} ${profile.displayName || profile.username} بتعليقك.`;
        } else if (totalReactors === 2) {
          const oldReactorName = notifSnapshot.empty ? 'someone' : notifSnapshot.docs[0].data().fromName;
          messageEn = `${profile.displayName || profile.username} and ${oldReactorName} ${direction === 'up' ? 'liked' : 'disliked'} your comment.`;
          messageAr = `${direction === 'up' ? 'أعجب' : 'لم يعجب'} ${profile.displayName || profile.username} و ${oldReactorName} بتعليقك.`;
        } else {
          const oldReactorName = notifSnapshot.empty ? 'someone' : notifSnapshot.docs[0].data().fromName;
          messageEn = `${profile.displayName || profile.username}, ${oldReactorName}, and ${totalReactors - 2} others ${direction === 'up' ? 'liked' : 'disliked'} your comment.`;
          messageAr = `${direction === 'up' ? 'أعجب' : 'لم يعجب'} ${profile.displayName || profile.username}، ${oldReactorName}، و ${totalReactors - 2} آخرين بتعليقك.`;
        }

        if (!notifSnapshot.empty) {
          updateDocumentNonBlocking(notifSnapshot.docs[0].ref, {
            fromId: user.uid,
            fromName: profile.displayName || profile.username,
            messageEn,
            messageAr,
            read: false,
            createdAt: serverTimestamp()
          });
        } else {
          addDocumentNonBlocking(notificationsRef, {
            type: notifType,
            fromId: user.uid,
            fromName: profile.displayName || profile.username,
            messageEn,
            messageAr,
            link,
            read: false,
            createdAt: serverTimestamp()
          });
        }
      }
    }
  };

  const handleRate = (rating: number) => {
    if (!user || !db || !animeId || !episodeRatingRef || !episodeId) {
      toast({ title: t('login'), description: "Sign in to rate this episode." });
      return;
    }
    const ratingData = {
      userId: user.uid, animeId: animeId, episodeId: episodeId, value: rating,
      updatedAt: serverTimestamp(), createdAt: existingRating ? existingRating.createdAt : serverTimestamp()
    };
    setDocumentNonBlocking(episodeRatingRef, ratingData, { merge: true });
    getDocs(query(collection(db, 'ratings'), where('episodeId', '==', episodeId))).then((snapshot) => {
      const episodeRatings = snapshot.docs.filter(d => d.id !== episodeRatingRef.id).map(d => d.data().value as number);
      episodeRatings.push(rating);
      updateDocumentNonBlocking(doc(db, 'anime', animeId, 'episodes', episodeId), {
        rating: episodeRatings.reduce((acc, val) => acc + val, 0) / episodeRatings.length,
        updatedAt: serverTimestamp()
      });
    });
    getDocs(query(collection(db, 'ratings'), where('animeId', '==', animeId))).then((snapshot) => {
      const animeRatings = snapshot.docs.filter(d => d.id !== episodeRatingRef.id).map(d => d.data().value as number);
      animeRatings.push(rating);
      updateDocumentNonBlocking(doc(db, 'anime', animeId), {
        rating: animeRatings.reduce((acc, val) => acc + val, 0) / animeRatings.length,
        updatedAt: serverTimestamp()
      });
    });
    toast({ title: t('rating'), description: `You rated this episode ${rating} stars!` });
  };

  const toggleAnimeWatchlist = async () => {
    if (!user || !profileRef || !animeId) return;
    updateDocumentNonBlocking(profileRef, { watchlistAnimeIds: isAnimeInWatchlist ? arrayRemove(animeId) : arrayUnion(animeId) });
    toast({ title: isAnimeInWatchlist ? "Removed from Watch Later" : "Added to Watch Later" });
  };

  const toggleAnimeFavorite = async () => {
    if (!user || !profileRef || !animeId) return;
    updateDocumentNonBlocking(profileRef, { favoriteAnimeIds: isAnimeFavorite ? arrayRemove(animeId) : arrayUnion(animeId) });
    toast({ title: isAnimeFavorite ? "Removed from Favorites" : "Added to Favorites" });
  };

  const onTextChange = (val: string, type: 'main' | string) => {
    if (type === 'main') setCommentText(val);
    else setReplyText(val);

    const lastChar = val[val.length - 1];
    if (lastChar === '@') {
      setShowTagSuggestions(type);
    } else {
      setShowTagSuggestions(null);
    }
  };

  const handleTagFriend = (friend: UserProfile, type: 'main' | string) => {
    if (type === 'main') {
      setCommentText(prev => prev + friend.username + ' ');
    } else {
      setReplyText(prev => prev + friend.username + ' ');
    }
    setShowTagSuggestions(null);
  };

  const handleReplyInitiation = (parentId: string, targetUserName: string, isReply: boolean) => {
    setActiveReplyId(parentId);
    setReplyText(isReply ? `@${targetUserName} ` : "");
    setTimeout(() => {
      replyTextareaRef.current?.focus();
    }, 50);
  };

  if (!animeId) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold">Invalid Navigation</h1>
        <p className="text-muted-foreground">Anime identifier is missing.</p>
        <Button asChild className="mt-6 rounded-xl"><Link href="/">Back to Home</Link></Button>
      </div>
    );
  }

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
              <div className="flex items-center gap-2 mb-2"><Server className="h-4 w-4 text-accent" /><h3 className="font-bold text-sm uppercase tracking-wider">{language === 'ar' ? 'اختر السيرفر' : 'Select Server'}</h3></div>
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
                <div className="flex flex-wrap gap-2">
                  <Button variant={isAnimeFavorite ? "default" : "secondary"} className="gap-2 rounded-xl" onClick={toggleAnimeFavorite}><Heart className={`h-5 w-5 ${isAnimeFavorite ? "fill-current text-destructive" : ""}`} />{t('favorite')}</Button>
                  <Button variant={isAnimeInWatchlist ? "default" : "secondary"} className="gap-2 rounded-xl" onClick={toggleAnimeWatchlist}><Bookmark className={`h-5 w-5 ${isAnimeInWatchlist ? "fill-current text-accent" : ""}`} />{t('watchlist')}</Button>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-secondary/20 p-4 rounded-2xl">
                <span className="text-sm font-bold text-muted-foreground uppercase">{language === 'ar' ? 'قيم هذه الحلقة' : 'Rate this Episode'}</span>
                <div className="flex items-center gap-1">{[1, 2, 3, 4, 5].map((star) => <button key={star} onClick={() => handleRate(star)} className="transition-transform active:scale-90"><Star className={`h-6 w-6 ${ (existingRating?.value || 0) >= star ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} /></button>)}</div>
              </div>
            </div>

            <section className="space-y-6 pt-8">
              <div className="flex items-center gap-2"><MessageSquare className="h-6 w-6 text-accent" /><h2 className="font-headline text-2xl font-bold">{t('comments')} ({comments?.length || 0})</h2></div>
              {user ? (
                <div className="flex gap-4">
                  <Avatar className="h-10 w-10 shrink-0"><AvatarImage src={`https://picsum.photos/seed/${user.uid}/100`} /><AvatarFallback>{(profile?.displayName || profile?.username || 'U')[0]}</AvatarFallback></Avatar>
                  <div className="flex-1 space-y-2 relative">
                    <Textarea placeholder={language === 'ar' ? 'انضم إلى المناقشة... (استخدم @ لمنشن صديق)' : "Join the discussion... (Use @ to tag a friend)"} className="min-h-[80px] rounded-xl bg-secondary/30 focus:ring-accent border-none" value={commentText} onChange={(e) => onTextChange(e.target.value, 'main')} maxLength={COMMENT_LIMIT} />
                    
                    {showTagSuggestions === 'main' && friendProfiles && friendProfiles.length > 0 && (
                      <div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-xl border bg-card p-1 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-2 text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2"><AtSign className="h-3 w-3" /> Tag a Friend</div>
                        <ScrollArea className="h-40">
                          {friendProfiles.map(friend => (
                            <button key={friend.id} className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-secondary/50 transition-colors" onClick={() => handleTagFriend(friend, 'main')}>
                              <Avatar className="h-6 w-6"><AvatarFallback className="bg-primary/20 text-[10px] font-bold">{(friend.displayName || friend.username)[0]}</AvatarFallback></Avatar>
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate">{friend.displayName || friend.username}</p>
                                <p className="text-[10px] text-accent">@{friend.username}</p>
                              </div>
                            </button>
                          ))}
                        </ScrollArea>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className={cn("text-xs font-medium", commentText.length >= COMMENT_LIMIT ? "text-destructive" : "text-muted-foreground")}>{commentText.length}/{COMMENT_LIMIT}</span>
                      <Button onClick={() => handlePostComment()} disabled={!commentText.trim() || commentText.length > COMMENT_LIMIT} className="gap-2 rounded-xl bg-accent px-6 font-bold text-accent-foreground"><Send className="h-4 w-4" />{t('postComment')}</Button>
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
                      onReply={handleReplyInitiation}
                      replies={getReplies(c.id)}
                      language={language}
                      t={t}
                      userVotes={userVotes}
                    />
                    
                    {activeReplyId === c.id && (
                      <div className={cn("flex gap-3 pt-2 relative", language === 'ar' ? "mr-12" : "ml-12")}>
                        <Avatar className="h-8 w-8 shrink-0"><AvatarImage src={`https://picsum.photos/seed/${user?.uid}/100`} /><AvatarFallback>{(profile?.displayName || profile?.username || 'U')[0]}</AvatarFallback></Avatar>
                        <div className="flex-1 space-y-2">
                          <Textarea 
                            ref={replyTextareaRef}
                            placeholder={language === 'ar' ? 'اكتب رداً...' : "Write a reply..."} 
                            className="min-h-[60px] text-sm rounded-xl bg-secondary/30 focus:ring-accent border-none" 
                            value={replyText} 
                            onChange={(e) => onTextChange(e.target.value, c.id)} 
                            maxLength={COMMENT_LIMIT} 
                          />
                          
                          {showTagSuggestions === c.id && friendProfiles && friendProfiles.length > 0 && (
                            <div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-xl border bg-card p-1 shadow-2xl">
                              <div className="p-2 text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2"><AtSign className="h-3 w-3" /> Tag a Friend</div>
                              <ScrollArea className="h-32">
                                {friendProfiles.map(friend => (
                                  <button key={friend.id} className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-secondary/50" onClick={() => handleTagFriend(friend, c.id)}>
                                    <Avatar className="h-5 w-5"><AvatarFallback className="bg-primary/20 text-[10px] font-bold">{(friend.displayName || friend.username)[0]}</AvatarFallback></Avatar>
                                    <div className="min-w-0">
                                      <p className="text-[10px] font-bold truncate">{friend.displayName || friend.username}</p>
                                      <p className="text-[8px] text-accent">@{friend.username}</p>
                                    </div>
                                  </button>
                                ))}
                              </ScrollArea>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className={cn("text-[10px] font-medium", replyText.length >= COMMENT_LIMIT ? "text-destructive" : "text-muted-foreground")}>{replyText.length}/{COMMENT_LIMIT}</span>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs" onClick={() => setActiveReplyId(null)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
                              <Button size="sm" onClick={() => handlePostComment(c.id)} disabled={!replyText.trim() || replyText.length > COMMENT_LIMIT} className="h-8 gap-2 rounded-lg bg-accent px-4 text-xs font-bold text-accent-foreground"><Send className="h-3 w-3" />{language === 'ar' ? 'رد' : 'Reply'}</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {suggestedAnime.length > 0 && (
              <section className="space-y-6 pt-12 border-t mt-12"><div className="flex items-center gap-2"><Layers className="h-6 w-6 text-accent" /><h2 className="font-headline text-2xl font-bold">{language === 'ar' ? 'أعمال مقترحة' : 'Suggested Works'}</h2></div><div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{suggestedAnime.map((a) => <AnimeCard key={a.id} anime={a} />)}</div></section>
            )}
          </div>

          <aside className="space-y-8">
            <section className="rounded-2xl border bg-card p-6"><h3 className="mb-4 font-headline text-xl font-bold">{language === 'ar' ? 'مزيد من المعلومات' : 'More Info'}</h3><div className="space-y-4"><div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('year')}</span><span className="font-bold">{anime.releaseYear}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">{language === 'ar' ? 'التصنيفات' : 'Genres'}</span><span className="font-bold truncate max-w-[150px]">{anime.genres?.map(g => tTags[g as keyof typeof tTags]).join(', ')}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('status')}</span><Badge variant="outline" className="text-accent border-accent">{anime.status}</Badge></div></div></section>
            
            <section className="space-y-4">
              <h3 className="font-headline text-xl font-bold">{t('episodes')}</h3>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-2">
                  {episodes?.sort((a,b) => a.episodeNumber - b.episodeNumber).map(ep => (
                    <Link key={ep.id} href={`/watch/${ep.id}?animeId=${animeId}`} className={cn("flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-secondary/50", ep.id === episodeId ? "bg-accent/10 border border-accent/20" : "")}>
                      <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image src={getEpisodeThumbnail(ep).trim()} alt={language === 'ar' ? ep.titleAr : ep.titleEn} fill className="object-cover" />
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
