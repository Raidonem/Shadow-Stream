
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
  ShieldAlert,
  Save,
  Loader2,
  Check,
  Edit2,
  Trash2,
  X,
  Server,
  Eye,
  Bell
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
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
  }, [user, db]);

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
    const data = { ...animeData, alternativeTitles: alternativeTitlesArr, genres: selectedGenres, releaseYear: parseInt(animeData.releaseYear), views: parseInt(animeData.views) || 0, updatedAt: serverTimestamp() };
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
        
        // Notification logic: Create a global notification
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
                <h1 className="font-headline text-3xl font-bold">Content Manager</h1>
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
                        <Input placeholder="Cover URL" value={animeData.coverImage} onChange={(e) => setAnimeData({...animeData, coverImage: e.target.value})} required />
                        <Input placeholder="Banner URL" value={animeData.bannerImage} onChange={(e) => setAnimeData({...animeData, bannerImage: e.target.value})} required />
                      </div>
                      <div className="grid gap-6 md:grid-cols-3">
                        <Input type="number" placeholder="Year" value={animeData.releaseYear} onChange={(e) => setAnimeData({...animeData, releaseYear: e.target.value})} />
                        <Input type="number" placeholder="Views" value={animeData.views} onChange={(e) => setAnimeData({...animeData, views: e.target.value})} />
                        <Select value={animeData.status} onValueChange={(val: any) => setAnimeData({...animeData, status: val})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="Airing">Airing</SelectItem><SelectItem value="Finished">Finished</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full">{editingAnimeId ? 'Update' : 'Publish'}</Button>
                    </form>
                  </CardContent>
                </Card>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {allAnime?.map(anime => (
                    <Card key={anime.id} className="overflow-hidden">
                      <div className="relative aspect-video">
                        <Image src={(anime.bannerImage || anime.coverImage || '').trim()} alt={anime.titleEn} fill className="object-cover" />
                      </div>
                      <CardContent className="p-4 flex justify-between">
                        <span className="font-bold">{anime.titleEn}</span>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditAnime(anime)}><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteAnime(anime.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="episodes" className="space-y-8">
                <Card className="rounded-2xl border-none bg-card shadow-xl">
                  <CardHeader><CardTitle>{editingEpisodeId ? 'Edit Episode' : 'Upload Episode'}</CardTitle></CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddEpisode} className="space-y-6">
                      <Select value={episodeData.animeId} onValueChange={(val) => setEpisodeData({...episodeData, animeId: val})}>
                        <SelectTrigger><SelectValue placeholder="Choose series" /></SelectTrigger>
                        <SelectContent>{allAnime?.map(anime => <SelectItem key={anime.id} value={anime.id}>{anime.titleEn}</SelectItem>)}</SelectContent>
                      </Select>
                      <div className="grid gap-6 md:grid-cols-2">
                        <Input placeholder="Ep Title EN" value={episodeData.titleEn} onChange={(e) => setEpisodeData({...episodeData, titleEn: e.target.value})} required />
                        <Input dir="rtl" className="text-right" placeholder="العنوان AR" value={episodeData.titleAr} onChange={(e) => setEpisodeData({...episodeData, titleAr: e.target.value})} required />
                      </div>
                      <div className="grid gap-6 md:grid-cols-2">
                        <Input type="number" placeholder="Ep Number" value={episodeData.episodeNumber} onChange={(e) => setEpisodeData({...episodeData, episodeNumber: e.target.value})} required />
                        <Input placeholder="Duration (MM:SS)" value={episodeData.duration} onChange={(e) => setEpisodeData({...episodeData, duration: e.target.value})} />
                      </div>
                      <Card className="p-4 bg-secondary/20">
                        <Label className="mb-4 block font-bold flex items-center gap-2"><Server className="h-4 w-4" /> Servers</Label>
                        <div className="grid gap-4 sm:grid-cols-[120px_1fr_1fr_auto]">
                          <Select value={newServer.lang} onValueChange={(val: any) => setNewServer({...newServer, lang: val})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="ar">AR</SelectItem><SelectItem value="en">EN</SelectItem></SelectContent>
                          </Select>
                          <Input placeholder="Name" value={newServer.name} onChange={(e) => setNewServer({...newServer, name: e.target.value})} />
                          <Input placeholder="URL" value={newServer.url} onChange={(e) => setNewServer({...newServer, url: e.target.value})} />
                          <Button type="button" size="icon" onClick={addServer}><Plus className="h-4 w-4" /></Button>
                        </div>
                        <div className="space-y-2 mt-4">
                          {episodeData.servers.map((s, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-background rounded">
                              <span>{s.lang.toUpperCase()} - {s.name}</span>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeServer(i)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          ))}
                        </div>
                      </Card>
                      <Button type="submit" className="w-full gap-2">
                        <Bell className="h-4 w-4" />
                        {editingEpisodeId ? 'Update Episode' : 'Publish & Notify'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
