
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
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
  Globe,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { translations } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { GenreKey, EpisodeServer } from '@/lib/types';
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

  // Form states
  const [animeData, setAnimeData] = useState({
    titleEn: '',
    titleAr: '',
    descriptionEn: '',
    descriptionAr: '',
    coverImage: '',
    bannerImage: '',
    releaseYear: new Date().getFullYear().toString(),
    status: 'Airing' as 'Airing' | 'Finished'
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

  // Server management state
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
    return query(collection(db, 'anime'), orderBy('createdAt', 'desc'));
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
        // This handles real-time revocation of admin status
        toast({
          title: "Access Revoked",
          description: "You no longer have administrative privileges.",
          variant: "destructive"
        });
        router.push('/');
      }
    }
  }, [user, isUserLoading, adminDoc, isAdminChecking, router, toast]);

  const toggleGenre = (genre: GenreKey) => {
    setSelectedGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const resetAnimeForm = () => {
    setAnimeData({ titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '', coverImage: '', bannerImage: '', releaseYear: '2024', status: 'Airing' });
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
    setEpisodeData({
      ...episodeData,
      servers: [...episodeData.servers, newServer]
    });
    setNewServer({ lang: 'en', name: '', url: '' });
  };

  const removeServer = (index: number) => {
    setEpisodeData({
      ...episodeData,
      servers: episodeData.servers.filter((_, i) => i !== index)
    });
  };

  const handleAddAnime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    if (selectedGenres.length === 0) {
      toast({ title: "Error", description: "Please select at least one genre.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const data = {
      ...animeData,
      genres: selectedGenres,
      releaseYear: parseInt(animeData.releaseYear),
      updatedAt: serverTimestamp(),
    };

    if (editingAnimeId) {
      const animeRef = doc(db, 'anime', editingAnimeId);
      updateDocumentNonBlocking(animeRef, data);
      toast({ title: "Anime Updated", description: `${animeData.titleEn} has been updated.` });
      resetAnimeForm();
      setIsSubmitting(false);
    } else {
      const animeRef = collection(db, 'anime');
      addDocumentNonBlocking(animeRef, {
        ...data,
        rating: 0,
        createdAt: serverTimestamp(),
      }).then(() => {
        toast({ title: "Anime Published", description: `${animeData.titleEn} is now live.` });
        resetAnimeForm();
        setIsSubmitting(false);
      });
    }
  };

  const handleEditAnime = (anime: any) => {
    setEditingAnimeId(anime.id);
    setAnimeData({
      titleEn: anime.titleEn,
      titleAr: anime.titleAr,
      descriptionEn: anime.descriptionEn,
      descriptionAr: anime.descriptionAr,
      coverImage: anime.coverImage,
      bannerImage: anime.bannerImage,
      releaseYear: anime.releaseYear.toString(),
      status: anime.status
    });
    setSelectedGenres(anime.genres || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteAnime = (id: string) => {
    if (!db || !confirm("Are you sure you want to delete this anime and all its episodes?")) return;
    const animeRef = doc(db, 'anime', id);
    deleteDocumentNonBlocking(animeRef);
    toast({ title: "Anime Deleted" });
  };

  const handleAddEpisode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !episodeData.animeId) return;
    if (episodeData.servers.length === 0) {
      toast({ title: "Error", description: "Please add at least one streaming server.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const data = {
      ...episodeData,
      episodeNumber: parseInt(episodeData.episodeNumber),
      updatedAt: serverTimestamp(),
    };

    if (editingEpisodeId) {
      const epRef = doc(db, 'anime', episodeData.animeId, 'episodes', editingEpisodeId);
      updateDocumentNonBlocking(epRef, data);
      toast({ title: "Episode Updated", description: `Episode ${episodeData.episodeNumber} updated.` });
      resetEpisodeForm();
      setIsSubmitting(false);
    } else {
      const epRef = collection(db, 'anime', episodeData.animeId, 'episodes');
      addDocumentNonBlocking(epRef, {
        ...data,
        createdAt: serverTimestamp(),
      }).then(() => {
        toast({ title: "Episode Added", description: `Episode ${episodeData.episodeNumber} published.` });
        resetEpisodeForm();
        setIsSubmitting(false);
      });
    }
  };

  const handleEditEpisode = (episode: any) => {
    setEditingEpisodeId(episode.id);
    setEpisodeData({
      animeId: episode.animeId,
      episodeNumber: episode.episodeNumber.toString(),
      titleEn: episode.titleEn,
      titleAr: episode.titleAr,
      servers: episode.servers || [],
      thumbnail: episode.thumbnail,
      duration: episode.duration
    });
  };

  const handleDeleteEpisode = (id: string) => {
    if (!db || !episodeData.animeId || !confirm("Delete this episode?")) return;
    const epRef = doc(db, 'anime', episodeData.animeId, 'episodes', id);
    deleteDocumentNonBlocking(epRef);
    toast({ title: "Episode Deleted" });
  };

  if (isUserLoading || isAdminChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Final safety check - the real-time redirect handles the rest
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
                    <CardDescription>Enter bilingual metadata to manage series.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddAnime} className="space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Series Title (English)</Label>
                          <Input 
                            placeholder="e.g. Shadow Vanguard" 
                            className="rounded-xl border-none bg-secondary/50"
                            value={animeData.titleEn}
                            onChange={(e) => setAnimeData({...animeData, titleEn: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-right block">العنوان (بالعربية)</Label>
                          <Input 
                            placeholder="مثال: طليعة الظل" 
                            dir="rtl"
                            className="rounded-xl border-none bg-secondary/50 text-right"
                            value={animeData.titleAr}
                            onChange={(e) => setAnimeData({...animeData, titleAr: e.target.value})}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Description (English)</Label>
                          <Textarea 
                            placeholder="A brief synopsis..." 
                            className="min-h-[100px] rounded-xl border-none bg-secondary/50"
                            value={animeData.descriptionEn}
                            onChange={(e) => setAnimeData({...animeData, descriptionEn: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-right block">الوصف (بالعربية)</Label>
                          <Textarea 
                            placeholder="نبذة عن العمل..." 
                            dir="rtl"
                            className="min-h-[100px] rounded-xl border-none bg-secondary/50 text-right"
                            value={animeData.descriptionAr}
                            onChange={(e) => setAnimeData({...animeData, descriptionAr: e.target.value})}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label>Select Genres</Label>
                        <div className="flex flex-wrap gap-2">
                          {availableTags.map(tag => (
                            <Badge 
                              key={tag}
                              variant={selectedGenres.includes(tag) ? "default" : "secondary"}
                              className={cn(
                                "cursor-pointer px-4 py-1.5 rounded-full transition-all",
                                selectedGenres.includes(tag) ? "bg-accent text-accent-foreground" : "hover:bg-accent/20"
                              )}
                              onClick={() => toggleGenre(tag)}
                            >
                              {selectedGenres.includes(tag) && <Check className="mr-1 h-3 w-3" />}
                              {translations.en.tags[tag as keyof typeof translations.en.tags]}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Cover Image URL (Portrait)</Label>
                          <Input 
                            placeholder="https://..." 
                            className="rounded-xl border-none bg-secondary/50"
                            value={animeData.coverImage}
                            onChange={(e) => setAnimeData({...animeData, coverImage: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Banner Image URL (Landscape)</Label>
                          <Input 
                            placeholder="https://..." 
                            className="rounded-xl border-none bg-secondary/50"
                            value={animeData.bannerImage}
                            onChange={(e) => setAnimeData({...animeData, bannerImage: e.target.value})}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Release Year</Label>
                          <Input 
                            type="number"
                            value={animeData.releaseYear}
                            onChange={(e) => setAnimeData({...animeData, releaseYear: e.target.value})}
                            className="rounded-xl border-none bg-secondary/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select 
                            value={animeData.status} 
                            onValueChange={(val: any) => setAnimeData({...animeData, status: val})}
                          >
                            <SelectTrigger className="rounded-xl border-none bg-secondary/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Airing">Airing</SelectItem>
                              <SelectItem value="Finished">Finished</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Button type="submit" disabled={isSubmitting} className="w-full gap-2 rounded-xl bg-accent font-bold text-accent-foreground">
                        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (editingAnimeId ? <Save className="h-5 w-5" /> : <Plus className="h-5 w-5" />)}
                        {editingAnimeId ? 'Update Anime' : 'Publish Anime'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <h2 className="font-headline text-2xl font-bold">Existing Anime</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {allAnime?.map(anime => (
                      <Card key={anime.id} className="overflow-hidden rounded-2xl border-none bg-card shadow-md">
                        <div className="relative aspect-video">
                          <Image src={anime.bannerImage} alt={anime.titleEn} fill className="object-cover" />
                          <div className="absolute inset-0 bg-black/40 p-4 flex flex-col justify-end">
                            <h3 className="font-bold text-white text-lg leading-tight">{anime.titleEn}</h3>
                          </div>
                        </div>
                        <CardContent className="p-4 flex justify-between items-center">
                          <p className="text-xs text-muted-foreground">{anime.status} • {anime.releaseYear}</p>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditAnime(anime)} className="h-8 w-8 rounded-full">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteAnime(anime.id)} className="h-8 w-8 rounded-full text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="episodes" className="space-y-8">
                <Card className="rounded-2xl border-none bg-card shadow-xl">
                  <CardHeader>
                    <CardTitle className="font-headline flex items-center justify-between">
                      {editingEpisodeId ? 'Edit Episode' : 'Upload Episode'}
                      {editingEpisodeId && (
                        <Button variant="ghost" size="sm" onClick={resetEpisodeForm} className="rounded-full">
                          <X className="h-4 w-4 mr-1" /> Cancel Edit
                        </Button>
                      )}
                    </CardTitle>
                    <CardDescription>Provide episode details and multiple servers for the selected series.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddEpisode} className="space-y-6">
                      <div className="space-y-2">
                        <Label>Select Anime</Label>
                        <Select 
                          value={episodeData.animeId} 
                          onValueChange={(val) => setEpisodeData({...episodeData, animeId: val})}
                        >
                          <SelectTrigger className="rounded-xl border-none bg-secondary/50">
                            <SelectValue placeholder="Choose a series" />
                          </SelectTrigger>
                          <SelectContent>
                            {allAnime?.map(anime => (
                              <SelectItem key={anime.id} value={anime.id}>{anime.titleEn}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Episode Title (English)</Label>
                          <Input 
                            placeholder="The Awakening" 
                            className="rounded-xl border-none bg-secondary/50"
                            value={episodeData.titleEn}
                            onChange={(e) => setEpisodeData({...episodeData, titleEn: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-right block">عنوان الحلقة (بالعربية)</Label>
                          <Input 
                            placeholder="الصحوة" 
                            dir="rtl"
                            className="rounded-xl border-none bg-secondary/50 text-right"
                            value={episodeData.titleAr}
                            onChange={(e) => setEpisodeData({...episodeData, titleAr: e.target.value})}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Episode Number</Label>
                          <Input 
                            type="number"
                            placeholder="1" 
                            className="rounded-xl border-none bg-secondary/50"
                            value={episodeData.episodeNumber}
                            onChange={(e) => setEpisodeData({...episodeData, episodeNumber: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Duration (MM:SS)</Label>
                          <Input 
                            placeholder="24:00" 
                            className="rounded-xl border-none bg-secondary/50"
                            value={episodeData.duration}
                            onChange={(e) => setEpisodeData({...episodeData, duration: e.target.value})}
                            required
                          />
                        </div>
                      </div>

                      <Card className="border border-dashed p-4 rounded-xl bg-secondary/20">
                        <Label className="mb-4 block font-bold flex items-center gap-2">
                          <Server className="h-4 w-4" /> Streaming Servers
                        </Label>
                        <div className="space-y-4">
                          <div className="grid gap-4 sm:grid-cols-[120px_1fr_1fr_auto]">
                            <Select 
                              value={newServer.lang} 
                              onValueChange={(val: 'ar' | 'en') => setNewServer({...newServer, lang: val})}
                            >
                              <SelectTrigger className="bg-background rounded-lg border-none shadow-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ar">Arabic</SelectItem>
                                <SelectItem value="en">English</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input 
                              placeholder="Server Name (e.g. Server 1)" 
                              className="bg-background rounded-lg border-none shadow-sm"
                              value={newServer.name}
                              onChange={(e) => setNewServer({...newServer, name: e.target.value})}
                            />
                            <Input 
                              placeholder="Direct Video URL (MP4)" 
                              className="bg-background rounded-lg border-none shadow-sm"
                              value={newServer.url}
                              onChange={(e) => setNewServer({...newServer, url: e.target.value})}
                            />
                            <Button type="button" size="icon" onClick={addServer} className="rounded-lg">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="space-y-2 mt-4">
                            {episodeData.servers.map((server, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-background rounded-xl shadow-sm">
                                <div className="flex items-center gap-4">
                                  <Badge variant="outline" className={cn(
                                    "px-2 py-0",
                                    server.lang === 'ar' ? "border-green-500 text-green-500" : "border-blue-500 text-blue-500"
                                  )}>
                                    {server.lang.toUpperCase()}
                                  </Badge>
                                  <span className="font-medium">{server.name}</span>
                                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">{server.url}</span>
                                </div>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => removeServer(idx)}
                                  className="h-8 w-8 text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            {episodeData.servers.length === 0 && (
                              <p className="text-center py-4 text-xs text-muted-foreground italic">No servers added. At least one is required.</p>
                            )}
                          </div>
                        </div>
                      </Card>

                      <div className="space-y-2">
                        <Label>Thumbnail URL</Label>
                        <Input 
                          placeholder="https://..." 
                          className="rounded-xl border-none bg-secondary/50"
                          value={episodeData.thumbnail}
                          onChange={(e) => setEpisodeData({...episodeData, thumbnail: e.target.value})}
                          required
                        />
                      </div>

                      <Button type="submit" disabled={isSubmitting || !episodeData.animeId} className="w-full gap-2 rounded-xl bg-primary font-bold text-primary-foreground">
                        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (editingEpisodeId ? <Save className="h-5 w-5" /> : <Save className="h-5 w-5" />)}
                        {editingEpisodeId ? 'Update Episode' : 'Add Episode'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {episodeData.animeId && (
                  <div className="space-y-4">
                    <h2 className="font-headline text-2xl font-bold">Episodes for {allAnime?.find(a => a.id === episodeData.animeId)?.titleEn}</h2>
                    <div className="grid gap-4">
                      {currentEpisodes?.map(ep => (
                        <Card key={ep.id} className="rounded-xl border-none bg-card shadow-sm overflow-hidden">
                          <div className="flex items-center gap-4 p-3">
                            <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg">
                              <Image src={ep.thumbnail} alt={ep.titleEn} fill className="object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-accent">EPISODE {ep.episodeNumber}</p>
                              <h4 className="font-bold truncate">{ep.titleEn}</h4>
                              <p className="text-xs text-muted-foreground">{ep.duration} • {ep.servers?.length || 0} Servers</p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditEpisode(ep)} className="h-8 w-8">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteEpisode(ep.id)} className="h-8 w-8 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                      {!currentEpisodes?.length && (
                        <div className="text-center py-12 border border-dashed rounded-2xl text-muted-foreground">
                          No episodes added yet.
                        </div>
                      )}
                    </div>
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
