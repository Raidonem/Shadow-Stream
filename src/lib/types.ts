
export type GenreKey = 'action' | 'adventure' | 'fantasy' | 'sci-fi' | 'romance' | 'slice-of-life' | 'mystery' | 'shonen' | 'seinen' | 'drama' | 'comedy';

export interface Anime {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  coverImage: string;
  bannerImage: string;
  genres: GenreKey[];
  rating: number;
  releaseYear: number;
  status: 'Airing' | 'Finished';
  createdAt: any;
  updatedAt: any;
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
  createdAt: any;
  updatedAt: any;
}

export interface Comment {
  id: string;
  episodeId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: any;
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
