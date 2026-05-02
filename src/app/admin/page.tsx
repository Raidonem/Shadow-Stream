
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
  Clapperboard
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useToast } from '../../hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '../../firebase/index';
import { doc, collection, serverTimestamp, query, orderBy, getDoc } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '../../firebase/non-blocking-updates';
import { translations } from '../../lib/i18n';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import { GenreKey, EpisodeServer, AnimeType, AnimeSeason, Anime } from '../../lib/types';
import Image from 'next/image';

export default function AdminPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<GenreKey[]>([]);
  const [editingAnimeId, setEditingAnimeId] = useState<string | null>(null);
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);

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

  const [episodeData, setEpisodeData] = useState({
    animeId: '',
    episodeNumber: '',
    titleEn: '',
    titleAr: '',
    servers: [] as EpisodeServer[],
    thumbnail: '',
    duration: '24:00'
  });

  const [newServer, setNewServer] = useState<EpisodeServer>({
    lang: 'en',
    name: '',
    url: ''
  });

  const adminRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'admins', user.uid);
  }, [user?.uid, db]);

  const { data: adminDoc, isLoading: isAdminChecking } = useDoc(adminRef);
  
  const animeQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'anime'), orderBy('updatedAt', 'desc'));
  }, [db]);
  const { data: allAnime } = useCollection(animeQuery);

  const episodesQuery = useMemoFirebase(() => {
    if (!db || !episodeData.animeId) return null;
    return query(collection(db, 'anime', episodeData.animeId, 'episodes'), orderBy('episodeNumber', 'asc'));
  }, [db, episodeData.animeId]);
  const { data: currentEpisodes } = useCollection(episodesQuery);

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

  const resetEpisodeForm = () => {
    setEpisodeData({ ...episodeData, episodeNumber: '', titleEn: '', titleAr: '', servers: [], thumbnail: '', duration: '24:00' });
    setEditingEpisodeId(null);
    setNewServer({ lang: 'en', name: '', url: '' });
  };

  const addServer = () => {
    if (!newServer.name || !newServer.url) {
      toast({ title: "Error", description: "Server name and URL are required.", variant: "destructive" });
      return;
    }
    setEpisodeData({ ...episodeData, servers: [...episodeData.servers, newServer] });
    setNewServer({ lang: 'en', name: '', url: '' });
  };

  const removeServer = (index: number) => {
    setEpisodeData({ ...episodeData, servers: episodeData.servers.filter((_, i) => i !== index) });
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

  const handleAddEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !episodeData.animeId) return;
    if (episodeData.servers.length === 0) {
      toast({ title: "Error", description: "Please add at least one server.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const episodeNum = parseInt(episodeData.episodeNumber);
    const data = { ...episodeData, episodeNumber: episodeNum, updatedAt: serverTimestamp() };

    const animeRef = doc(db, 'anime', episodeData.animeId);
    const animeSnap = await getDoc(animeRef);
    const animeNameEn = animeSnap.data()?.titleEn;
    const animeNameAr = animeSnap.data()?.titleAr;

    if (editingEpisodeId) {
      updateDocumentNonBlocking(doc(db, 'anime', episodeData.animeId, 'episodes', editingEpisodeId), data);
      updateDocumentNonBlocking(animeRef, { updatedAt: serverTimestamp(), lastEpisodeNumber: Math.max(animeSnap.data()?.lastEpisodeNumber || 0, episodeNum) });
      toast({ title: "Episode Updated" });
      resetEpisodeForm();
      setIsSubmitting(false);
    } else {
      const epRef = collection(db, 'anime', episodeData.animeId, 'episodes');
      addDocumentNonBlocking(epRef, { ...data, createdAt: serverTimestamp() }).then(async (newEp) => {
        updateDocumentNonBlocking(animeRef, { updatedAt: serverTimestamp(), lastEpisodeNumber: Math.max(animeSnap.data()?.lastEpisodeNumber || 0, episodeNum) });
        
        addDocumentNonBlocking(collection(db, 'global_notifications'), {
          type: 'new_episode',
          animeId: episodeData.animeId,
          episodeId: newEp?.id || '',
          animeTitleEn: animeNameEn,
          animeTitleAr: animeNameAr,
          episodeNumber: episodeNum,
          createdAt: serverTimestamp()
        });

        toast({ title: "Episode Added & Notification Sent" });
        resetEpisodeForm();
        setIsSubmitting(false);
      });
    }
  };

  const handleEditEpisode = (episode: any) => {
    setEditingEpisodeId(episode.id);
    setEpisodeData({
      animeId: episode.animeId, episodeNumber: episode.episodeNumber.toString(), titleEn: episode.titleEn,
      titleAr: episode.titleAr, servers: episode.servers || [], thumbnail: episode.thumbnail || '', duration: episode.duration || '24:00'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteEpisode = (id: string) => {
    if (!db || !episodeData.animeId || !confirm("Delete?")) return;
    deleteDocumentNonBlocking(doc(db, 'anime', episodeData.animeId, 'episodes', id));
    toast({ title: "Deleted" });
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
              <TabsList className="mb-8 grid w-full max-w-md grid-cols-2 rounded-xl bg-secondary p-1">
                <TabsTrigger value="anime" className="rounded-lg">Anime Catalog</TabsTrigger>
                <TabsTrigger value="episodes" className="rounded-lg">Episode Manager</TabsTrigger>
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
                      <div className="space-y-2">
                        <Label>Alternative Titles (csv)</Label>
                        <Input value={animeData.alternativeTitles} onChange={(e) => setAnimeData({...animeData, alternativeTitles: e.target.value})} />
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
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Cover Image URL</Label>
                          <Input value={animeData.coverImage} onChange={(e) => setAnimeData({...animeData, coverImage: e.target.value})} required />
                        </div>
                        <div className="space-y-2">
                          <Label>Banner Image URL</Label>
                          <Input value={animeData.bannerImage} onChange={(e) => setAnimeData({...animeData, bannerImage: e.target.value})} required />
                        </div>
                      </div>
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                        <div className="space-y-2">
                          <Label>Year</Label>
                          <Input type="number" value={animeData.releaseYear} onChange={(e) => setAnimeData({...animeData, releaseYear: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Views</Label>
                          <Input type="number" value={animeData.views} onChange={(e) => setAnimeData({...animeData, views: e.target.value})} />
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
                              {Object.entries(translations.en.animeTypes).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Season</Label>
                          <Select value={animeData.season} onValueChange={(val: any) => setAnimeData({...animeData, season: val})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(translations.en.animeSeasons).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                        <Image src={(anime.bannerImage || anime.coverImage || '').trim()} alt={anime.titleEn} fill className="object-cover" />
                      </div>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="min-w-0">
                          <span className="font-bold block truncate">{anime.titleEn}</span>
                          <span className="text-xs text-muted-foreground">{anime.releaseYear} • {translations.en.animeTypes[anime.type]}</span>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => handleEditAnime(anime)} className="h-8 w-8"><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteAnime(anime.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="episodes" className="space-y-8">
                <Card className="rounded-2xl border-none bg-card shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {editingEpisodeId ? 'Edit Episode' : 'Upload Episode'}
                      {editingEpisodeId && (
                        <Button variant="ghost" size="sm" onClick={resetEpisodeForm} className="rounded-full">
                          <X className="h-4 w-4 mr-1" /> Cancel Edit
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddEpisode} className="space-y-6">
                      <div className="space-y-2">
                        <Label>Select Series</Label>
                        <Select value={episodeData.animeId} onValueChange={(val) => setEpisodeData({...episodeData, animeId: val})}>
                          <SelectTrigger><SelectValue placeholder="Choose series" /></SelectTrigger>
                          <SelectContent>{allAnime?.map(anime => <SelectItem key={anime.id} value={anime.id}>{anime.titleEn}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Episode Title (EN)</Label>
                          <Input placeholder="Ep Title EN" value={episodeData.titleEn} onChange={(e) => setEpisodeData({...episodeData, titleEn: e.target.value})} required />
                        </div>
                        <div className="space-y-2 text-right">
                          <Label>العنوان (AR)</Label>
                          <Input dir="rtl" className="text-right" placeholder="العنوان AR" value={episodeData.titleAr} onChange={(e) => setEpisodeData({...episodeData, titleAr: e.target.value})} required />
                        </div>
                      </div>
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Episode Number</Label>
                          <Input type="number" placeholder="Ep Number" value={episodeData.episodeNumber} onChange={(e) => setEpisodeData({...episodeData, episodeNumber: e.target.value})} required />
                        </div>
                        <div className="space-y-2">
                          <Label>Duration (MM:SS)</Label>
                          <Input placeholder="Duration (MM:SS)" value={episodeData.duration} onChange={(e) => setEpisodeData({...episodeData, duration: e.target.value})} />
                        </div>
                      </div>
                      <Card className="p-4 bg-secondary/20">
                        <Label className="mb-4 block font-bold flex items-center gap-2"><Server className="h-4 w-4" /> Servers</Label>
                        <div className="grid gap-4 sm:grid-cols-[120px_1fr_1fr_auto]">
                          <Select value={newServer.lang} onValueChange={(val: any) => setNewServer({...newServer, lang: val})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="ar">AR</SelectItem><SelectItem value="en">EN</SelectItem></SelectContent>
                          </Select>
                          <Input placeholder="Server Name (e.g. Fembed)" value={newServer.name} onChange={(e) => setNewServer({...newServer, name: e.target.value})} />
                          <Input placeholder="Video URL" value={newServer.url} onChange={(e) => setNewServer({...newServer, url: e.target.value})} />
                          <Button type="button" size="icon" onClick={addServer}><Plus className="h-4 w-4" /></Button>
                        </div>
                        <div className="space-y-2 mt-4">
                          {episodeData.servers.map((s, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-background rounded-lg border">
                              <span className="text-sm font-medium">{s.lang.toUpperCase()} - {s.name}</span>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeServer(i)} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          ))}
                        </div>
                      </Card>
                      <Button type="submit" className="w-full h-12 gap-2 rounded-xl text-lg font-bold" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bell className="h-5 w-5" />}
                        {editingEpisodeId ? 'Update Episode' : 'Publish & Notify'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {episodeData.animeId && currentEpisodes && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-headline text-2xl font-bold flex items-center gap-2">
                        <Clapperboard className="h-6 w-6 text-primary" />
                        Existing Episodes ({currentEpisodes.length})
                      </h2>
                    </div>
                    {currentEpisodes.length === 0 ? (
                      <div className="text-center py-12 bg-secondary/10 rounded-2xl border border-dashed">
                        <p className="text-muted-foreground italic">No episodes found for this series.</p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {currentEpisodes.map((ep) => (
                          <Card key={ep.id} className={cn(
                            "group overflow-hidden bg-card border-none shadow-sm hover:shadow-md transition-all",
                            editingEpisodeId === ep.id && "ring-2 ring-primary"
                          )}>
                            <CardContent className="p-3 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-4 min-w-0">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">
                                  {ep.episodeNumber}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold truncate">{ep.titleEn}</p>
                                  <p className="text-xs text-muted-foreground truncate" dir="rtl">{ep.titleAr}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="hidden sm:flex gap-1 mr-4">
                                  {ep.servers?.map((s: any, idx: number) => (
                                    <Badge key={idx} variant="outline" className="text-[10px] px-1 h-5">{s.lang.toUpperCase()}</Badge>
                                  ))}
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleEditEpisode(ep)} className="h-9 w-9">
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteEpisode(ep.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
