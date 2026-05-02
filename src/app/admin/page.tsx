
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from "../../components/layout/Navbar";
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../../components/ui/select";
import { 
  Plus, 
  LayoutDashboard, 
  Loader2,
  Edit2,
  Trash2,
  X,
  Server,
  Bell,
  CheckCircle,
  Shield,
  MessageSquare,
  Flag,
  User as UserIcon,
  Ban,
  Slash,
  AlertTriangle,
  ImageIcon,
  PlayCircle,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useToast } from '../../hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '../../firebase/index';
import { doc, collection, serverTimestamp, query, orderBy, limit, Firestore } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '../../firebase/non-blocking-updates';
import { translations } from '../../lib/i18n';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import { GenreKey, EpisodeServer, AnimeType, AnimeSeason, Anime, Report, AvatarItem, Episode } from '../../lib/types';
import Image from 'next/image';
import { addDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "../../components/ui/dialog";
import { ScrollArea } from "../../components/ui/scroll-area";
import { useLanguage } from '../../components/providers/LanguageContext';

function EpisodeManager({ anime, db }: { anime: Anime; db: Firestore }) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);
  const [newEpisode, setNewEpisode] = useState({
    titleEn: '',
    titleAr: '',
    episodeNumber: '',
    thumbnail: '',
    duration: '24:00'
  });

  const [servers, setServers] = useState<EpisodeServer[]>([]);
  const [newServer, setNewServer] = useState<EpisodeServer>({ name: '', url: '', lang: 'en' });

  const episodesQuery = useMemoFirebase(() => {
    if (!db || !anime.id) return null;
    return query(collection(db, 'anime', anime.id, 'episodes'), orderBy('episodeNumber', 'asc'));
  }, [db, anime.id]);
  const { data: episodes, isLoading } = useCollection<Episode>(episodesQuery);

  const handleAddServer = () => {
    if (!newServer.name || !newServer.url) return;
    setServers([...servers, newServer]);
    setNewServer({ name: '', url: '', lang: 'en' });
  };

  const handleRemoveServer = (index: number) => {
    setServers(servers.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setNewEpisode({ titleEn: '', titleAr: '', episodeNumber: '', thumbnail: '', duration: '24:00' });
    setServers([]);
    setEditingEpisodeId(null);
    setNewServer({ name: '', url: '', lang: 'en' });
  };

  const handleEditEpisode = (ep: Episode) => {
    setEditingEpisodeId(ep.id);
    setNewEpisode({
      titleEn: ep.titleEn,
      titleAr: ep.titleAr,
      episodeNumber: ep.episodeNumber.toString(),
      thumbnail: ep.thumbnail || '',
      duration: ep.duration
    });
    setServers(ep.servers || []);
  };

  const handleAddEpisode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !anime.id) return;
    
    if (servers.length === 0) {
      toast({ title: "Error", description: "Add at least one server.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);

    const epNum = parseInt(newEpisode.episodeNumber);
    const epDocRef = editingEpisodeId 
      ? doc(db, 'anime', anime.id, 'episodes', editingEpisodeId) 
      : doc(collection(db, 'anime', anime.id, 'episodes'));
    
    const episodeData = {
      ...newEpisode,
      id: epDocRef.id,
      episodeNumber: epNum,
      animeId: anime.id,
      servers,
      updatedAt: serverTimestamp()
    };

    if (!editingEpisodeId) {
      (episodeData as any).createdAt = serverTimestamp();
    }

    setDocumentNonBlocking(epDocRef, episodeData, { merge: true });
    
    updateDocumentNonBlocking(doc(db, 'anime', anime.id), {
      lastEpisodeNumber: epNum,
      updatedAt: serverTimestamp()
    });

    if (!editingEpisodeId) {
      const notifRef = doc(collection(db, 'global_notifications'));
      setDocumentNonBlocking(notifRef, {
        id: notifRef.id,
        type: 'new_episode',
        animeId: anime.id,
        episodeId: epDocRef.id,
        animeTitleEn: anime.titleEn,
        animeTitleAr: anime.titleAr,
        episodeNumber: epNum,
        createdAt: serverTimestamp()
      }, { merge: true });
    }

    toast({ title: editingEpisodeId ? "Episode Updated" : "Episode Added Successfully" });
    resetForm();
    setIsSubmitting(false);
  };

  const handleDeleteEpisode = (id: string) => {
    if (!db || !anime.id || !id) return;
    
    // Use non-blocking delete immediately
    const epRef = doc(db, 'anime', anime.id, 'episodes', id);
    deleteDocumentNonBlocking(epRef);
    toast({ title: "Episode Deleted" });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-6">
        <h3 className="font-bold flex items-center gap-2 text-lg">
          {editingEpisodeId ? <Edit2 className="h-5 w-5 text-accent" /> : <Plus className="h-5 w-5 text-accent" />}
          {editingEpisodeId ? 'Edit Episode' : 'Add Episode'}
        </h3>
        <form onSubmit={handleAddEpisode} className="space-y-4 bg-secondary/20 p-6 rounded-2xl border">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Episode Number</Label>
              <Input type="number" value={newEpisode.episodeNumber} onChange={e => setNewEpisode({...newEpisode, episodeNumber: e.target.value})} required className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Duration (MM:SS)</Label>
              <Input value={newEpisode.duration} onChange={e => setNewEpisode({...newEpisode, duration: e.target.value})} required className="rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title (English)</Label>
              <Input value={newEpisode.titleEn} onChange={e => setNewEpisode({...newEpisode, titleEn: e.target.value})} required className="rounded-xl" />
            </div>
            <div className="space-y-2 text-right">
              <Label>العنوان (العربية)</Label>
              <Input dir="rtl" value={newEpisode.titleAr} onChange={e => setNewEpisode({...newEpisode, titleAr: e.target.value})} required className="rounded-xl text-right" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Thumbnail URL (Optional)</Label>
            <Input value={newEpisode.thumbnail} onChange={e => setNewEpisode({...newEpisode, thumbnail: e.target.value})} placeholder="https://..." className="rounded-xl" />
          </div>

          <div className="p-4 rounded-xl bg-background/50 space-y-4 border border-dashed border-accent/20">
            <Label className="font-bold flex items-center gap-2"><Server className="h-4 w-4" /> Streaming Servers</Label>
            <div className="flex gap-2">
              <Input placeholder="Server Name" value={newServer.name} onChange={e => setNewServer({...newServer, name: e.target.value})} className="rounded-xl" />
              <Select value={newServer.lang} onValueChange={(v: any) => setNewServer({...newServer, lang: v})}>
                <SelectTrigger className="w-32 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input placeholder="Direct URL or Iframe URL" value={newServer.url} onChange={e => setNewServer({...newServer, url: e.target.value})} className="rounded-xl" />
              <Button type="button" onClick={handleAddServer} size="icon" className="rounded-xl bg-accent"><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2">
              {servers.map((s, i) => (
                <div key={i} className="flex items-center justify-between bg-secondary p-3 rounded-xl border">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="uppercase text-[10px]">{s.lang}</Badge>
                    <span className="text-sm font-medium">{s.name}</span>
                  </div>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveServer(i)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            {editingEpisodeId && (
              <Button type="button" variant="outline" onClick={resetForm} className="flex-1 rounded-xl h-12 font-bold">
                Cancel
              </Button>
            )}
            <Button type="submit" className="flex-[2] rounded-xl h-12 font-bold text-lg" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : editingEpisodeId ? "Update Episode" : "Save Episode"}
            </Button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold flex items-center gap-2 text-lg"><PlayCircle className="h-5 w-5 text-accent" /> Published Episodes</h3>
        <ScrollArea className="h-[600px] rounded-2xl border p-4 bg-secondary/10">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-10 w-10 animate-spin text-accent/50" /></div>
          ) : episodes?.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground italic">No episodes have been published yet.</div>
          ) : (
            <div className="space-y-3">
              {episodes?.map(ep => (
                <div key={ep.id} className="flex items-center justify-between p-4 rounded-xl bg-card border shadow-sm group">
                  <div className="min-w-0">
                    <p className="font-bold text-base flex items-center gap-2">
                      <span className="text-accent">EP {ep.episodeNumber}</span>
                      <span className="truncate">{ep.titleEn}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{ep.servers?.length || 0} Servers • {ep.duration}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-10 w-10 text-accent hover:bg-accent/10" onClick={() => handleEditEpisode(ep)}>
                      <Edit2 className="h-5 w-5" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-10 w-10 text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteEpisode(ep.id);
                      }}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<GenreKey[]>([]);
  const [editingAnimeId, setEditingAnimeId] = useState<string | null>(null);

  const [activeActionReport, setActiveActionReport] = useState<Report | null>(null);
  const [actionType, setActionType] = useState<'warning' | 'restriction' | 'suspension'>('warning');
  const [actionReason, setActionReason] = useState('');
  const [actionDuration, setActionDuration] = useState('1');
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);

  const [managingEpisodesAnime, setManagingEpisodesAnime] = useState<Anime | null>(null);

  const [animeData, setAnimeData] = useState({
    titleEn: '',
    titleAr: '',
    alternativeTitles: '',
    descriptionEn: '',
    descriptionAr: '',
    coverImage: '',
    bannerImage: '',
    releaseYear: new Date().getFullYear().toString(),
    status: 'Airing' as 'Airing' | 'Finished',
    type: 'tv' as AnimeType,
    season: 'fall' as AnimeSeason,
    views: '0'
  });

  const [avatarUrl, setAvatarUrl] = useState('');

  const adminRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'admins', user.uid);
  }, [user?.uid, db]);

  const { data: adminDoc, isLoading: isAdminChecking } = useDoc(adminRef);
  
  const animeQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'anime'), orderBy('updatedAt', 'desc'));
  }, [db]);
  const { data: allAnime } = useCollection<Anime>(animeQuery);

  const reportsQuery = useMemoFirebase(() => {
    if (!db || isAdminChecking || !adminDoc) return null;
    return query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(50));
  }, [db, isAdminChecking, !!adminDoc]);
  const { data: reports, isLoading: isReportsLoading } = useCollection<Report>(reportsQuery);

  const avatarsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'avatars'), orderBy('createdAt', 'desc'));
  }, [db]);
  const { data: allAvatars } = useCollection<AvatarItem>(avatarsQuery);

  const availableTags = Object.keys(translations.en.tags) as GenreKey[];

  useEffect(() => {
    if (!isUserLoading && !isAdminChecking) {
      if (!user) {
        router.push('/login');
      } else if (!adminDoc) {
        toast({ title: "Access Denied", description: "Administrative privileges are required for this area.", variant: "destructive" });
        router.push('/');
      }
    }
  }, [user, isUserLoading, adminDoc, isAdminChecking, router, toast]);

  const toggleGenre = (genre: GenreKey) => {
    setSelectedGenres(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]);
  };

  const resetAnimeForm = () => {
    setAnimeData({ 
      titleEn: '', titleAr: '', alternativeTitles: '', descriptionEn: '', descriptionAr: '', 
      coverImage: '', bannerImage: '', releaseYear: new Date().getFullYear().toString(), 
      status: 'Airing', type: 'tv', season: 'fall', views: '0'
    });
    setSelectedGenres([]);
    setEditingAnimeId(null);
  };

  const handleAddAnime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    if (selectedGenres.length === 0) {
      toast({ title: "Error", description: "Please select at least one genre.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const alternativeTitlesArr = animeData.alternativeTitles.split(',').map(t => t.trim()).filter(t => t !== '');
    const data = { 
      ...animeData, 
      alternativeTitles: alternativeTitlesArr, 
      genres: selectedGenres, 
      releaseYear: parseInt(animeData.releaseYear), 
      views: parseInt(animeData.views) || 0, 
      updatedAt: serverTimestamp() 
    };
    if (editingAnimeId) {
      updateDocumentNonBlocking(doc(db, 'anime', editingAnimeId), data);
      toast({ title: "Anime Updated Successfully" });
      resetAnimeForm();
      setIsSubmitting(false);
    } else {
      addDocumentNonBlocking(collection(db, 'anime'), { ...data, rating: 0, createdAt: serverTimestamp() }).then(() => {
        toast({ title: "Anime Published Successfully" });
        resetAnimeForm();
        setIsSubmitting(false);
      });
    }
  };

  const handleEditAnime = (anime: Anime) => {
    setEditingAnimeId(anime.id);
    setAnimeData({
      titleEn: anime.titleEn, titleAr: anime.titleAr, alternativeTitles: (anime.alternativeTitles || []).join(', '),
      descriptionEn: anime.descriptionEn, descriptionAr: anime.descriptionAr, coverImage: anime.coverImage || '',
      bannerImage: anime.bannerImage || '', releaseYear: (anime.releaseYear || new Date().getFullYear()).toString(),
      status: anime.status || 'Airing', type: anime.type || 'tv', season: anime.season || 'fall', views: (anime.views || 0).toString()
    });
    setSelectedGenres(anime.genres || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteAnime = (id: string) => {
    if (!db) return;
    deleteDocumentNonBlocking(doc(db, 'anime', id));
    toast({ title: "Anime Deleted" });
  };

  const handleAddAvatar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !avatarUrl.trim()) return;
    setIsSubmitting(true);
    addDocumentNonBlocking(collection(db, 'avatars'), {
      url: avatarUrl.trim(),
      createdAt: serverTimestamp()
    }).then(() => {
      toast({ title: "Avatar option added" });
      setAvatarUrl('');
      setIsSubmitting(false);
    });
  };

  const handleDeleteAvatar = (id: string) => {
    if (!db) return;
    deleteDocumentNonBlocking(doc(db, 'avatars', id));
    toast({ title: "Avatar deleted" });
  };

  const handleResolveReport = (reportId: string) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, 'reports', reportId), { status: 'resolved' });
    toast({ title: "Report Resolved" });
  };

  const handleDeleteReport = (reportId: string) => {
    if (!db) return;
    deleteDocumentNonBlocking(doc(db, 'reports', reportId));
    toast({ title: "Report Deleted" });
  };

  const handleExecuteAction = async () => {
    if (!db || !activeActionReport || !actionReason.trim() || !user) return;
    setIsSubmitting(true);

    const targetUid = activeActionReport.type === 'comment' ? activeActionReport.reportedUserId! : activeActionReport.userId;
    
    try {
      const userRef = doc(db, 'users', targetUid);
      const logRef = collection(db, 'users', targetUid, 'moderation_logs');
      const notifCol = collection(db, 'users', targetUid, 'notifications');

      let expiryDate: Date | null = null;
      if (actionType !== 'warning') {
        if (actionDuration === 'forever') {
          expiryDate = new Date(2100, 0, 1);
        } else {
          expiryDate = addDays(new Date(), parseInt(actionDuration));
        }
      }

      if (actionType === 'restriction') {
        updateDocumentNonBlocking(userRef, { restrictedUntil: expiryDate });
      } else if (actionType === 'suspension') {
        updateDocumentNonBlocking(userRef, { suspendedUntil: expiryDate });
      }

      addDocumentNonBlocking(logRef, {
        adminId: user.uid,
        adminName: adminDoc?.username || 'Admin',
        targetUserId: targetUid,
        action: actionType,
        duration: actionDuration === 'forever' ? 'Forever' : `${actionDuration} days`,
        reason: actionReason.trim(),
        createdAt: serverTimestamp()
      });

      const messageEn = actionType === 'warning' 
        ? "Official Warning: Please review community guidelines." 
        : `Account Status: ${actionType.toUpperCase()} applied for ${actionDuration === 'forever' ? 'forever' : actionDuration + ' days'}.`;

      const newNotifDoc = doc(notifCol);
      setDocumentNonBlocking(newNotifDoc, {
        id: newNotifDoc.id,
        type: actionType,
        fromId: user.uid,
        fromName: "System Administrator",
        messageEn,
        messageAr: "إجراء إداري: تم تطبيق قيود على حسابك.",
        customMessage: actionReason.trim(),
        link: `/warning/${newNotifDoc.id}`,
        read: false,
        createdAt: serverTimestamp()
      }, { merge: true });

      handleResolveReport(activeActionReport.id);

      toast({ title: "Moderation action executed" });
      setIsActionDialogOpen(false);
      setActionReason('');
      setActiveActionReport(null);
    } catch (err: any) {
      toast({ title: "Operation failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || isAdminChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !adminDoc) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 md:px-8">
        <div className="flex flex-col gap-8 md:flex-row">
          <aside className="w-full shrink-0 space-y-4 md:w-64">
            <div className="p-6 rounded-2xl bg-primary text-primary-foreground shadow-lg flex items-center gap-3">
              <LayoutDashboard className="h-6 w-6" />
              <span className="font-bold text-lg">Admin Central</span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest px-2">System Status</p>
            <div className="p-4 rounded-xl bg-secondary/50 border space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Admin:</span>
                <span className="font-bold">@{adminDoc?.username}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Region:</span>
                <span className="font-bold">Global (ME/EN)</span>
              </div>
            </div>
          </aside>

          <div className="flex-1 space-y-8">
            <Tabs defaultValue="anime" className="w-full">
              <TabsList className="mb-8 grid w-full max-w-2xl grid-cols-4 rounded-xl bg-secondary p-1 h-12">
                <TabsTrigger value="anime" className="rounded-lg font-bold">Catalog</TabsTrigger>
                <TabsTrigger value="reports" className="rounded-lg font-bold">Reports</TabsTrigger>
                <TabsTrigger value="moderation" className="rounded-lg font-bold">Rules</TabsTrigger>
                <TabsTrigger value="avatars" className="rounded-lg font-bold">Assets</TabsTrigger>
              </TabsList>

              <TabsContent value="anime" className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <Card className="rounded-2xl border-none bg-card shadow-xl overflow-hidden">
                  <div className="h-1.5 bg-accent" />
                  <CardHeader>
                    <CardTitle className="font-headline text-2xl flex items-center justify-between">
                      {editingAnimeId ? 'Edit Series Metadata' : 'Publish New Series'}
                      {editingAnimeId && (
                        <Button variant="ghost" size="sm" onClick={resetAnimeForm} className="rounded-full text-muted-foreground">
                          <X className="h-4 w-4 mr-1" /> Discard Changes
                        </Button>
                      )}
                    </CardTitle>
                    <CardDescription>Enter primary information for the anime listing.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddAnime} className="space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Series Title (English)</Label>
                          <Input value={animeData.titleEn} onChange={(e) => setAnimeData({...animeData, titleEn: e.target.value})} required className="rounded-xl h-11" />
                        </div>
                        <div className="space-y-2 text-right">
                          <Label>العنوان (العربية)</Label>
                          <Input dir="rtl" className="text-right rounded-xl h-11" value={animeData.titleAr} onChange={(e) => setAnimeData({...animeData, titleAr: e.target.value})} required />
                        </div>
                      </div>
                      
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Cover Image URL (Portrait)</Label>
                          <Input placeholder="https://..." value={animeData.coverImage} onChange={(e) => setAnimeData({...animeData, coverImage: e.target.value})} required className="rounded-xl h-11" />
                        </div>
                        <div className="space-y-2">
                          <Label>Banner Image URL (Landscape)</Label>
                          <Input placeholder="https://..." value={animeData.bannerImage} onChange={(e) => setAnimeData({...animeData, bannerImage: e.target.value})} required className="rounded-xl h-11" />
                        </div>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Synopsis (English)</Label>
                          <Textarea placeholder="Plot summary..." value={animeData.descriptionEn} onChange={(e) => setAnimeData({...animeData, descriptionEn: e.target.value})} required className="rounded-xl min-h-[120px]" />
                        </div>
                        <div className="space-y-2 text-right">
                          <Label>القصة (العربية)</Label>
                          <Textarea dir="rtl" className="text-right rounded-xl min-h-[120px]" placeholder="ملخص القصة..." value={animeData.descriptionAr} onChange={(e) => setAnimeData({...animeData, descriptionAr: e.target.value})} required />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <Label className="font-bold flex items-center gap-2"><Settings className="h-4 w-4" /> Categorization</Label>
                        <div className="flex flex-wrap gap-2 p-4 rounded-xl bg-secondary/30 border border-dashed">
                          {availableTags.map(tag => (
                            <Badge 
                              key={tag} 
                              variant={selectedGenres.includes(tag) ? "default" : "secondary"} 
                              className={cn(
                                "cursor-pointer px-3 py-1 rounded-lg transition-all",
                                selectedGenres.includes(tag) ? "bg-primary" : "hover:bg-primary/20"
                              )} 
                              onClick={() => toggleGenre(tag)}
                            >
                              {translations.en.tags[tag]}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-6 grid-cols-2 md:grid-cols-5 bg-secondary/20 p-6 rounded-2xl border">
                        <div className="space-y-2">
                          <Label>Release Year</Label>
                          <Input type="number" value={animeData.releaseYear} onChange={(e) => setAnimeData({...animeData, releaseYear: e.target.value})} className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label>Air Status</Label>
                          <Select value={animeData.status} onValueChange={(val: any) => setAnimeData({...animeData, status: val})}>
                            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Airing">Airing</SelectItem>
                              <SelectItem value="Finished">Finished</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Format Type</Label>
                          <Select value={animeData.type} onValueChange={(val: any) => setAnimeData({...animeData, type: val})}>
                            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(translations.en.animeTypes).map(([k,v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Seasonal Release</Label>
                          <Select value={animeData.season} onValueChange={(val: any) => setAnimeData({...animeData, season: val})}>
                            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(translations.en.animeSeasons).map(([k,v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Initial Views</Label>
                          <Input type="number" value={animeData.views} onChange={(e) => setAnimeData({...animeData, views: e.target.value})} className="rounded-xl" />
                        </div>
                      </div>

                      <Button type="submit" className="w-full h-14 rounded-xl text-lg font-bold shadow-lg bg-accent text-accent-foreground hover:bg-accent/90 transition-transform active:scale-[0.98]" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : editingAnimeId ? 'Update Library Item' : 'Publish Series to Catalog'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {allAnime?.map(anime => (
                    <Card key={anime.id} className="overflow-hidden bg-card border-none shadow-md hover:shadow-xl transition-all group">
                      <div className="relative aspect-video">
                        <Image src={(anime.bannerImage || anime.coverImage || '').trim() || 'https://picsum.photos/seed/placeholder/400/225'} alt={anime.titleEn} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-3 flex gap-2">
                          <Badge className="bg-accent text-accent-foreground uppercase text-[10px] font-bold">{anime.type}</Badge>
                          <Badge variant="secondary" className="bg-black/40 text-white backdrop-blur-sm text-[10px] uppercase font-bold">{anime.season} {anime.releaseYear}</Badge>
                        </div>
                      </div>
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-bold block truncate text-lg">{anime.titleEn}</span>
                            <span className="text-xs text-muted-foreground block truncate">{anime.titleAr}</span>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" onClick={() => handleEditAnime(anime)} className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary"><Edit2 className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10" onClick={() => handleDeleteAnime(anime.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                        <Button variant="outline" className="w-full rounded-xl h-10 text-sm gap-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => setManagingEpisodesAnime(anime)}>
                          <PlayCircle className="h-5 w-5" />
                          Manage Episodes
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="reports" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-headline text-2xl font-bold flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6 text-accent" />
                    Community Reports
                  </h2>
                </div>

                {isReportsLoading ? (
                  <div className="flex py-20 justify-center"><Loader2 className="h-10 w-10 animate-spin text-accent/20" /></div>
                ) : reports && reports.length > 0 ? (
                  <div className="grid gap-4">
                    {reports.map((report) => (
                      <Card key={report.id} className="border-none bg-card shadow-md">
                        <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <Badge variant={report.status === 'resolved' ? 'secondary' : 'default'} className={cn(report.status === 'pending' && "bg-accent")}>
                                {report.type === 'comment' ? <MessageSquare className="h-3 w-3 mr-1" /> : <Server className="h-3 w-3 mr-1" />}
                                {report.type.toUpperCase()}
                              </Badge>
                              <span className="text-xs font-medium text-muted-foreground">
                                {report.createdAt?.toDate?.()?.toLocaleString() || 'Recently'}
                              </span>
                            </div>

                            {report.type === 'comment' ? (
                              <div className="space-y-2">
                                <h3 className="font-bold text-lg text-accent">Comment Reported</h3>
                                <p className="text-sm font-medium bg-secondary/50 p-4 rounded-xl border italic text-muted-foreground">
                                  "{report.commentText}"
                                </p>
                                <div className="flex items-center gap-2">
                                  <Button variant="link" className="p-0 h-auto text-xs font-bold text-primary" onClick={() => router.push(`/profile?uid=${report.reportedUserId}`)}>
                                    <UserIcon className="h-3 w-3 mr-1" />
                                    Reported User: @{report.reportedUserName}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <h3 className="font-bold text-lg">
                                {report.animeTitleEn} - EP {report.episodeNumber}
                              </h3>
                            )}

                            <div className="flex items-start gap-2 bg-secondary/30 p-4 rounded-xl border border-dashed">
                               <Flag className="h-4 w-4 text-muted-foreground mt-0.5" />
                               <p className="text-sm text-muted-foreground">
                                <span className="font-bold text-foreground">Reason:</span> {report.reason}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2 shrink-0">
                            {report.status === 'pending' && (
                              <>
                                <Button variant="default" size="sm" className="rounded-xl bg-accent h-10 px-4" onClick={() => { setActiveActionReport(report); setIsActionDialogOpen(true); }}>
                                  <Shield className="h-4 w-4 mr-2" />
                                  Moderate
                                </Button>
                                <Button variant="outline" size="sm" className="rounded-xl border-accent text-accent h-10 px-4 hover:bg-accent hover:text-accent-foreground" onClick={() => handleResolveReport(report.id)}>
                                  Resolve
                                </Button>
                              </>
                            )}
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteReport(report.id)}>
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-32 bg-secondary/10 rounded-3xl border border-dashed flex flex-col items-center gap-4">
                    <CheckCircle className="h-12 w-12 text-green-500/50" />
                    <p className="text-muted-foreground text-lg italic">All clear! No pending community reports.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="avatars" className="space-y-8 animate-in fade-in zoom-in-95">
                <Card className="rounded-2xl border-none bg-card shadow-xl overflow-hidden">
                  <div className="h-1.5 bg-accent" />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-6 w-6 text-accent" />
                      Avatar Management
                    </CardTitle>
                    <CardDescription>Add new portrait URLs for users to choose as their profile picture.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddAvatar} className="flex gap-4">
                      <div className="flex-1">
                        <Input 
                          placeholder="Portrait URL (https://...)" 
                          value={avatarUrl} 
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          required
                          className="rounded-xl h-11"
                        />
                      </div>
                      <Button type="submit" className="rounded-xl h-11 px-6 font-bold" disabled={isSubmitting || !avatarUrl.trim()}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                        Add Asset
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                  {allAvatars?.map(avatar => (
                    <Card key={avatar.id} className="group relative aspect-square overflow-hidden bg-secondary border-none shadow-md hover:ring-2 ring-accent transition-all">
                      <Image 
                        src={avatar.url} 
                        alt="Avatar Option" 
                        fill 
                        className="object-cover transition-transform group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="h-9 w-9 rounded-full shadow-lg"
                          onClick={() => handleDeleteAvatar(avatar.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Moderation Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent className="bg-card border-none max-w-lg rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Shield className="h-6 w-6 text-accent" />
              Administrative Action
            </DialogTitle>
            <DialogDescription>
              Select the corrective measure for this report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="font-bold">Action Severity</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button variant={actionType === 'warning' ? 'default' : 'outline'} className="rounded-xl h-11" onClick={() => setActionType('warning')}>
                  <Bell className="h-4 w-4 mr-2" /> Warning
                </Button>
                <Button variant={actionType === 'restriction' ? 'default' : 'outline'} className="rounded-xl h-11" onClick={() => setActionType('restriction')}>
                  <Slash className="h-4 w-4 mr-2" /> Restrict
                </Button>
                <Button variant={actionType === 'suspension' ? 'default' : 'outline'} className="rounded-xl h-11" onClick={() => setActionType('suspension')}>
                  <Ban className="h-4 w-4 mr-2" /> Suspend
                </Button>
              </div>
            </div>

            {actionType !== 'warning' && (
              <div className="space-y-3">
                <Label className="font-bold">Timeframe</Label>
                <Select value={actionDuration} onValueChange={setActionDuration}>
                  <SelectTrigger className="rounded-xl border-none bg-secondary h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Day</SelectItem>
                    <SelectItem value="3">3 Days</SelectItem>
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                    {actionType === 'suspension' && (
                      <>
                        <SelectItem value="365">1 Year</SelectItem>
                        <SelectItem value="forever">Permanent</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-3">
              <Label className="font-bold">Formal Justification (Public)</Label>
              <Textarea 
                placeholder="Explain the reason for this action. This will be visible to the user." 
                value={actionReason} 
                onChange={(e) => setActionReason(e.target.value)}
                className="rounded-2xl bg-secondary border-none min-h-[140px] focus:ring-accent"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl h-12 px-6" onClick={() => setIsActionDialogOpen(false)}>Cancel</Button>
            <Button className="rounded-xl bg-accent text-accent-foreground h-12 px-8 font-bold" disabled={!actionReason.trim() || isSubmitting} onClick={handleExecuteAction}>
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle className="h-5 w-5 mr-2" />}
              Apply Sanction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Episode Management Dialog */}
      <Dialog open={!!managingEpisodesAnime} onOpenChange={(open) => !open && setManagingEpisodesAnime(null)}>
        <DialogContent className="max-w-6xl bg-card border-none max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden p-0">
          <div className="h-2 bg-accent w-full" />
          <DialogHeader className="p-8 pb-0">
            <DialogTitle className="flex items-center gap-3 text-3xl font-headline">
              <Settings className="h-8 w-8 text-accent animate-spin-slow" />
              Manage Episodes: <span className="text-accent">{managingEpisodesAnime?.titleEn}</span>
            </DialogTitle>
            <DialogDescription className="text-lg">
              Publish new episodes and update streaming infrastructure for this series.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-8 pt-6">
            {managingEpisodesAnime && db && (
              <EpisodeManager anime={managingEpisodesAnime} db={db} />
            )}
          </div>

          <DialogFooter className="border-t p-6 bg-secondary/10">
            <Button variant="outline" className="rounded-xl h-11 px-8 border-accent text-accent hover:bg-accent hover:text-accent-foreground font-bold" onClick={() => setManagingEpisodesAnime(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
