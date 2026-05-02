
"use client";

import { useState, useEffect, useMemo } from 'react';
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
  ShieldAlert,
  Loader2,
  Edit2,
  Trash2,
  X,
  Server,
  Bell,
  Clapperboard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  MessageSquare,
  Flag,
  User as UserIcon,
  Ban,
  Slash,
  AlertCircle,
  ImageIcon,
  PlayCircle,
  Globe,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useToast } from '../../hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '../../firebase/index';
import { doc, collection, serverTimestamp, query, orderBy, getDoc, limit, addDoc } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '../../firebase/non-blocking-updates';
import { translations } from '../../lib/i18n';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import { GenreKey, EpisodeServer, AnimeType, AnimeSeason, Anime, Report, UserProfile, AvatarItem, Episode } from '../../lib/types';
import Image from 'next/image';
import { addDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from "../../components/ui/dialog";
import { ScrollArea } from "../../components/ui/scroll-area";
import { useLanguage } from '../../components/providers/LanguageContext';

function EpisodeManager({ anime, db }: { anime: Anime; db: any }) {
  const { toast } = useToast();
  const { language } = useLanguage();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleAddEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !anime.id || servers.length === 0) {
      toast({ title: "Error", description: "Add at least one server.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const epNum = parseInt(newEpisode.episodeNumber);
    const episodeData = {
      ...newEpisode,
      episodeNumber: epNum,
      animeId: anime.id,
      servers,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await addDocumentNonBlocking(collection(db, 'anime', anime.id, 'episodes'), episodeData);
      
      updateDocumentNonBlocking(doc(db, 'anime', anime.id), {
        lastEpisodeNumber: epNum,
        updatedAt: serverTimestamp()
      });

      addDocumentNonBlocking(collection(db, 'global_notifications'), {
        type: 'new_episode',
        animeId: anime.id,
        animeTitleEn: anime.titleEn,
        animeTitleAr: anime.titleAr,
        episodeNumber: epNum,
        createdAt: serverTimestamp()
      });

      toast({ title: "Episode Added" });
      setNewEpisode({ titleEn: '', titleAr: '', episodeNumber: '', thumbnail: '', duration: '24:00' });
      setServers([]);
    } catch (err: any) {
      toast({ title: "Failed to add", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEpisode = (id: string) => {
    if (!confirm("Delete this episode?")) return;
    deleteDocumentNonBlocking(doc(db, 'anime', anime.id, 'episodes', id));
    toast({ title: "Episode Deleted" });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-6">
        <h3 className="font-bold flex items-center gap-2"><Plus className="h-4 w-4" /> Add Episode</h3>
        <form onSubmit={handleAddEpisode} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Number</Label>
              <Input type="number" value={newEpisode.episodeNumber} onChange={e => setNewEpisode({...newEpisode, episodeNumber: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Input value={newEpisode.duration} onChange={e => setNewEpisode({...newEpisode, duration: e.target.value})} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title (EN)</Label>
              <Input value={newEpisode.titleEn} onChange={e => setNewEpisode({...newEpisode, titleEn: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>العنوان (AR)</Label>
              <Input dir="rtl" value={newEpisode.titleAr} onChange={e => setNewEpisode({...newEpisode, titleAr: e.target.value})} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Thumbnail URL</Label>
            <Input value={newEpisode.thumbnail} onChange={e => setNewEpisode({...newEpisode, thumbnail: e.target.value})} placeholder="https://..." />
          </div>

          <div className="p-4 rounded-xl bg-secondary/50 space-y-4">
            <Label className="font-bold">Streaming Servers</Label>
            <div className="flex gap-2">
              <Input placeholder="Server Name" value={newServer.name} onChange={e => setNewServer({...newServer, name: e.target.value})} />
              <Select value={newServer.lang} onValueChange={(v: any) => setNewServer({...newServer, lang: v})}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="en">EN</SelectItem><SelectItem value="ar">AR</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input placeholder="URL" value={newServer.url} onChange={e => setNewServer({...newServer, url: e.target.value})} />
              <Button type="button" onClick={handleAddServer} size="icon" variant="secondary"><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-1">
              {servers.map((s, i) => (
                <div key={i} className="flex items-center justify-between bg-background p-2 rounded-lg border text-xs">
                  <span>{s.name} ({s.lang.toUpperCase()})</span>
                  <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleRemoveServer(i)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full rounded-xl" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Episode"}
          </Button>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold flex items-center gap-2"><PlayCircle className="h-4 w-4" /> Existing Episodes</h3>
        <ScrollArea className="h-[400px] rounded-xl border p-4 bg-secondary/10">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin opacity-20" /></div>
          ) : episodes?.length === 0 ? (
            <p className="text-center text-muted-foreground italic p-8">No episodes found.</p>
          ) : (
            <div className="space-y-2">
              {episodes?.map(ep => (
                <div key={ep.id} className="flex items-center justify-between p-3 rounded-lg bg-card border shadow-sm">
                  <div className="min-w-0">
                    <p className="font-bold text-sm">EP {ep.episodeNumber}: {ep.titleEn}</p>
                    <p className="text-[10px] text-muted-foreground">{ep.servers.length} Servers • {ep.duration}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteEpisode(ep.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
        toast({ title: "Access Revoked", description: "You no longer have administrative privileges.", variant: "destructive" });
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
      toast({ title: "Anime Updated" });
      resetAnimeForm();
      setIsSubmitting(false);
    } else {
      addDocumentNonBlocking(collection(db, 'anime'), { ...data, rating: 0, createdAt: serverTimestamp() }).then(() => {
        toast({ title: "Anime Published" });
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
    if (!db || !confirm("Delete this anime?")) return;
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
      toast({ title: "Avatar added successfully" });
      setAvatarUrl('');
      setIsSubmitting(false);
    });
  };

  const handleDeleteAvatar = (id: string) => {
    if (!db || !confirm("Delete this avatar? Users using this will revert to default.")) return;
    deleteDocumentNonBlocking(doc(db, 'avatars', id));
    toast({ title: "Avatar deleted" });
  };

  const handleResolveReport = (reportId: string) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, 'reports', reportId), { status: 'resolved' });
    toast({ title: "Report Resolved" });
  };

  const handleDeleteReport = (reportId: string) => {
    if (!db || !confirm("Delete report?")) return;
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
        ? "You have received an official warning." 
        : `Your account has been ${actionType}ed for ${actionDuration === 'forever' ? 'forever' : actionDuration + ' days'}.`;

      const newNotifDoc = doc(notifCol);
      setDocumentNonBlocking(newNotifDoc, {
        id: newNotifDoc.id,
        type: actionType,
        fromId: user.uid,
        fromName: "System Administrator",
        messageEn,
        messageAr: "لقد تلقيت إجراءً إدارياً رسمياً.",
        customMessage: actionReason.trim(),
        link: `/warning/${newNotifDoc.id}`,
        read: false,
        createdAt: serverTimestamp()
      }, { merge: true });

      handleResolveReport(activeActionReport.id);

      toast({ title: "Action executed successfully" });
      setIsActionDialogOpen(false);
      setActionReason('');
      setActiveActionReport(null);
    } catch (err: any) {
      toast({ title: "Execution failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || isAdminChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !adminDoc) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 md:px-8">
        <div className="flex flex-col gap-8 md:flex-row">
          <aside className="w-full shrink-0 space-y-2 md:w-64">
            <Button variant="secondary" className="w-full justify-start gap-3 rounded-xl bg-primary text-primary-foreground">
              <LayoutDashboard className="h-5 w-5" />
              Management
            </Button>
          </aside>
          <div className="flex-1 space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="font-headline text-3xl font-bold">Admin Central</h1>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-accent" />
                  Authenticated as System Administrator
                </p>
              </div>
            </div>
            <Tabs defaultValue="anime" className="w-full">
              <TabsList className="mb-8 grid w-full max-w-4xl grid-cols-4 rounded-xl bg-secondary p-1">
                <TabsTrigger value="anime" className="rounded-lg">Anime Catalog</TabsTrigger>
                <TabsTrigger value="reports" className="rounded-lg">Reports</TabsTrigger>
                <TabsTrigger value="moderation" className="rounded-lg">Moderation</TabsTrigger>
                <TabsTrigger value="avatars" className="rounded-lg">Avatars</TabsTrigger>
              </TabsList>

              <TabsContent value="anime" className="space-y-8">
                <Card className="rounded-2xl border-none bg-card shadow-xl">
                  <CardHeader>
                    <CardTitle className="font-headline flex items-center justify-between">
                      {editingAnimeId ? 'Edit Anime' : 'Publish New Anime'}
                      {editingAnimeId && (
                        <Button variant="ghost" size="sm" onClick={resetAnimeForm} className="rounded-full">
                          <X className="h-4 w-4 mr-1" /> Cancel Edit
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddAnime} className="space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Title (EN)</Label>
                          <Input value={animeData.titleEn} onChange={(e) => setAnimeData({...animeData, titleEn: e.target.value})} required />
                        </div>
                        <div className="space-y-2 text-right">
                          <Label>العنوان (AR)</Label>
                          <Input dir="rtl" className="text-right" value={animeData.titleAr} onChange={(e) => setAnimeData({...animeData, titleAr: e.target.value})} required />
                        </div>
                      </div>
                      
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Cover Image URL</Label>
                          <Input placeholder="https://..." value={animeData.coverImage} onChange={(e) => setAnimeData({...animeData, coverImage: e.target.value})} required />
                        </div>
                        <div className="space-y-2">
                          <Label>Banner Image URL</Label>
                          <Input placeholder="https://..." value={animeData.bannerImage} onChange={(e) => setAnimeData({...animeData, bannerImage: e.target.value})} required />
                        </div>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <Textarea placeholder="Description EN" value={animeData.descriptionEn} onChange={(e) => setAnimeData({...animeData, descriptionEn: e.target.value})} required />
                        <Textarea dir="rtl" className="text-right" placeholder="الوصف بالعربية" value={animeData.descriptionAr} onChange={(e) => setAnimeData({...animeData, descriptionAr: e.target.value})} required />
                      </div>
                      
                      <div className="space-y-3">
                        <Label>Genres</Label>
                        <div className="flex flex-wrap gap-2">
                          {availableTags.map(tag => (
                            <Badge key={tag} variant={selectedGenres.includes(tag) ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggleGenre(tag)}>
                              {translations.en.tags[tag]}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-6 grid-cols-2 md:grid-cols-5">
                        <div className="space-y-2">
                          <Label>Year</Label>
                          <Input type="number" value={animeData.releaseYear} onChange={(e) => setAnimeData({...animeData, releaseYear: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select value={animeData.status} onValueChange={(val: any) => setAnimeData({...animeData, status: val})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Airing">Airing</SelectItem>
                              <SelectItem value="Finished">Finished</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select value={animeData.type} onValueChange={(val: any) => setAnimeData({...animeData, type: val})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(translations.en.animeTypes).map(([k,v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Season</Label>
                          <Select value={animeData.season} onValueChange={(val: any) => setAnimeData({...animeData, season: val})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(translations.en.animeSeasons).map(([k,v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Starting Views</Label>
                          <Input type="number" value={animeData.views} onChange={(e) => setAnimeData({...animeData, views: e.target.value})} />
                        </div>
                      </div>

                      <Button type="submit" className="w-full h-12 rounded-xl text-lg font-bold" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : editingAnimeId ? 'Update Anime' : 'Publish Anime'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {allAnime?.map(anime => (
                    <Card key={anime.id} className="overflow-hidden bg-card border-none shadow-sm hover:shadow-md transition-all">
                      <div className="relative aspect-video">
                        <Image src={(anime.bannerImage || anime.coverImage || '').trim() || 'https://picsum.photos/seed/placeholder/400/225'} alt={anime.titleEn} fill className="object-cover" />
                      </div>
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <span className="font-bold block truncate">{anime.titleEn}</span>
                            <span className="text-xs text-muted-foreground">{anime.releaseYear} • {translations.en.animeTypes[anime.type]}</span>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" onClick={() => handleEditAnime(anime)} className="h-8 w-8"><Edit2 className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteAnime(anime.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                        <Button variant="outline" className="w-full rounded-xl h-9 text-xs gap-2" onClick={() => setManagingEpisodesAnime(anime)}>
                          <PlayCircle className="h-4 w-4" />
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
                  <div className="flex py-12 justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : reports && reports.length > 0 ? (
                  <div className="grid gap-4">
                    {reports.map((report) => (
                      <Card key={report.id} className="border-none bg-card shadow-md">
                        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <Badge variant={report.status === 'resolved' ? 'secondary' : 'default'} className={cn(report.status === 'pending' && "bg-accent")}>
                                {report.type === 'comment' ? <MessageSquare className="h-3 w-3 mr-1" /> : <Server className="h-3 w-3 mr-1" />}
                                {report.type.toUpperCase()}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {report.createdAt?.toDate?.()?.toLocaleString() || 'Recently'}
                              </span>
                            </div>

                            {report.type === 'comment' ? (
                              <div className="space-y-2">
                                <h3 className="font-bold text-lg text-accent">Comment Reported</h3>
                                <p className="text-sm font-medium bg-secondary/50 p-3 rounded-lg border italic">
                                  "{report.commentText}"
                                </p>
                                <div className="flex items-center gap-2">
                                  <Button variant="link" className="p-0 h-auto text-xs font-bold text-primary" onClick={() => router.push(`/profile?uid=${report.reportedUserId}`)}>
                                    <UserIcon className="h-3 w-3 mr-1" />
                                    View Reported User: @{report.reportedUserName}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <h3 className="font-bold text-lg">
                                {report.animeTitleEn} - EP {report.episodeNumber}
                              </h3>
                            )}

                            <p className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-lg border border-dashed">
                              <span className="font-bold mr-2">Reason:</span> {report.reason}
                            </p>
                          </div>

                          <div className="flex gap-2 shrink-0">
                            {report.status === 'pending' && (
                              <>
                                <Button variant="default" size="sm" className="rounded-xl bg-accent" onClick={() => { setActiveActionReport(report); setIsActionDialogOpen(true); }}>
                                  <Shield className="h-4 w-4 mr-2" />
                                  Moderate
                                </Button>
                                <Button variant="outline" size="sm" className="rounded-xl border-accent text-accent" onClick={() => handleResolveReport(report.id)}>
                                  Resolve
                                </Button>
                              </>
                            )}
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteReport(report.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-secondary/20 rounded-3xl border border-dashed">
                    <p className="text-muted-foreground italic">No reports found.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="avatars" className="space-y-8">
                <Card className="rounded-2xl border-none bg-card shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-accent" />
                      Avatar Management
                    </CardTitle>
                    <CardDescription>Add new URLs for users to choose as their profile picture.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddAvatar} className="flex gap-4">
                      <div className="flex-1 space-y-2">
                        <Input 
                          placeholder="https://example.com/avatar.png" 
                          value={avatarUrl} 
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" disabled={isSubmitting || !avatarUrl.trim()}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                        Add Avatar
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                  {allAvatars?.map(avatar => (
                    <Card key={avatar.id} className="group relative aspect-square overflow-hidden bg-secondary border-none">
                      <Image 
                        src={avatar.url} 
                        alt="Avatar Option" 
                        fill 
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="h-8 w-8 rounded-full"
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

      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent className="bg-card border-none max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent" />
              Administrative Action
            </DialogTitle>
            <DialogDescription>
              Choose an action to take against the reported user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Action Type</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button variant={actionType === 'warning' ? 'default' : 'outline'} className="rounded-xl" onClick={() => setActionType('warning')}>
                  <Bell className="h-4 w-4 mr-2" /> Warning
                </Button>
                <Button variant={actionType === 'restriction' ? 'default' : 'outline'} className="rounded-xl" onClick={() => setActionType('restriction')}>
                  <Slash className="h-4 w-4 mr-2" /> Restrict
                </Button>
                <Button variant={actionType === 'suspension' ? 'default' : 'outline'} className="rounded-xl" onClick={() => setActionType('suspension')}>
                  <Ban className="h-4 w-4 mr-2" /> Suspend
                </Button>
              </div>
            </div>

            {actionType !== 'warning' && (
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={actionDuration} onValueChange={setActionDuration}>
                  <SelectTrigger className="rounded-xl border-none bg-secondary/50">
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
                        <SelectItem value="forever">Forever</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Reason (Custom Message for User)</Label>
              <Textarea 
                placeholder="Explain the reason for this action. This will be shown to the user." 
                value={actionReason} 
                onChange={(e) => setActionReason(e.target.value)}
                className="rounded-xl bg-secondary/50 border-none min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsActionDialogOpen(false)}>Cancel</Button>
            <Button className="rounded-xl bg-accent" disabled={!actionReason.trim() || isSubmitting} onClick={handleExecuteAction}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Execute Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!managingEpisodesAnime} onOpenChange={(open) => !open && setManagingEpisodesAnime(null)}>
        <DialogContent className="max-w-4xl bg-card border-none max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-accent" />
              Manage Episodes: {managingEpisodesAnime?.titleEn}
            </DialogTitle>
            <DialogDescription>
              Add servers and manage episodes for this series.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden py-4">
            {managingEpisodesAnime && db && (
              <EpisodeManager anime={managingEpisodesAnime} db={db} />
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" className="rounded-xl" onClick={() => setManagingEpisodesAnime(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
