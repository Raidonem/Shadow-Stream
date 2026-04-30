
export type GenreKey = 'action' | 'adventure' | 'fantasy' | 'sci-fi' | 'romance' | 'slice-of-life' | 'mystery' | 'shonen' | 'seinen' | 'drama' | 'comedy' | 'ecchi' | 'games' | 'kids' | 'thriller' | 'dementia' | 'historical' | 'police' | 'isekai' | 'supernatural' | 'harem' | 'josei' | 'horror' | 'cars' | 'magic' | 'samurai' | 'sports' | 'shojo' | 'space' | 'military' | 'demons' | 'super-power' | 'martial-arts' | 'vampires' | 'school' | 'parody' | 'psychological' | 'mecha' | 'music';

export type AnimeType = 'tv' | 'movie' | 'ova' | 'ona' | 'special';
export type AnimeSeason = 'spring' | 'summer' | 'fall' | 'winter';

export interface Anime {
  id: string;
  titleEn: string;
  titleAr: string;
  alternativeTitles?: string[];
  descriptionEn: string;
  descriptionAr: string;
  coverImage: string;
  bannerImage: string;
  genres: GenreKey[];
  rating: number;
  views: number;
  lastEpisodeNumber?: number;
  status: 'Airing' | 'Finished';
  type: AnimeType;
  season: AnimeSeason;
  createdAt: any;
  updatedAt: any;
}

export interface UserProfile {
  id: string;
  externalAuthId: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
  isPremium: boolean;
  isPublic: boolean;
  languagePreference: string;
  themePreference: string;
  watchlistAnimeIds: string[];
  currentlyWatchingAnimeIds: string[];
  favoriteAnimeIds: string[];
  completedAnimeIds: string[];
  favoriteEpisodeIds: string[];
  blockedUserIds: string[];
  createdAt: any;
  updatedAt: any;
}

export interface Friendship {
  id: string;
  userIds: string[];
  createdAt: any;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
}

export interface EpisodeServer {
  lang: 'ar' | 'en';
  name: string;
  url: string;
}

export interface Episode {
  id: string;
  animeId: string;
  episodeNumber: number;
  titleEn: string;
  titleAr: string;
  servers: EpisodeServer[];
  thumbnail: string;
  duration: string;
  rating?: number;
  createdAt: any;
  updatedAt: any;
}

export interface GlobalNotification {
  id: string;
  type: 'new_episode';
  animeId: string;
  episodeId: string;
  animeTitleEn?: string;
  animeTitleAr?: string;
  episodeNumber?: number;
  createdAt: any;
}

export interface UserNotification {
  id: string;
  type: 'friend_request' | 'friend_accepted' | 'comment_reply';
  fromId: string;
  fromName: string;
  messageEn: string;
  messageAr: string;
  link: string;
  read: boolean;
  createdAt: any;
}

export interface Comment {
  id: string;
  episodeId: string;
  userId: string;
  userName: string;
  userDisplayName: string;
  text: string;
  parentId?: string;
  upvotes?: number;
  downvotes?: number;
  isAdmin?: boolean;
  isPremium?: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface WatchHistory {
  id: string;
  userId: string;
  animeId: string;
  episodeId: string;
  animeTitleEn: string;
  animeTitleAr: string;
  episodeTitleEn: string;
  episodeTitleAr: string;
  episodeNumber: number;
  thumbnail: string;
  watchedAt: any;
}

export type Language = 'en' | 'ar';
