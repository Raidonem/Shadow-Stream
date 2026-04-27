
import { Anime, Episode, Comment } from './types';
import { PlaceHolderImages } from './placeholder-images';

export const MOCK_ANIME: Anime[] = [
  {
    id: '1',
    title: 'Shadow Vanguard',
    description: 'In a world consumed by twilight, a lone warrior must navigate the shifting shadows to protect the last spark of light.',
    coverImage: 'https://picsum.photos/seed/sv1/400/600',
    bannerImage: 'https://picsum.photos/seed/sv2/1200/600',
    genres: ['Action', 'Fantasy', 'Seinen'],
    rating: 4.8,
    releaseYear: 2024,
    status: 'Airing'
  },
  {
    id: '2',
    title: 'Cyber Drift',
    description: 'Neon-soaked streets and high-speed pursuits define the life of Kael, a rogue pilot in the megacity of Zenith.',
    coverImage: 'https://picsum.photos/seed/cd1/400/600',
    bannerImage: 'https://picsum.photos/seed/cd2/1200/600',
    genres: ['Sci-Fi', 'Action'],
    rating: 4.5,
    releaseYear: 2023,
    status: 'Finished'
  },
  {
    id: '3',
    title: 'Echoes of Eternity',
    description: 'A young girl discovers she can hear the memories of the earth, leading her on a quest to solve an ancient mystery.',
    coverImage: 'https://picsum.photos/seed/ee1/400/600',
    bannerImage: 'https://picsum.photos/seed/ee2/1200/600',
    genres: ['Mystery', 'Adventure', 'Fantasy'],
    rating: 4.9,
    releaseYear: 2024,
    status: 'Airing'
  },
  {
    id: '4',
    title: 'Starlight Waltz',
    description: 'Two aspiring musicians find their paths intertwined during a magical summer at a remote island academy.',
    coverImage: 'https://picsum.photos/seed/sw1/400/600',
    bannerImage: 'https://picsum.photos/seed/sw2/1200/600',
    genres: ['Romance', 'Slice of Life'],
    rating: 4.2,
    releaseYear: 2022,
    status: 'Finished'
  },
  {
    id: '5',
    title: 'Grimoire Noir',
    description: 'Dark magic returns to the kingdom, and only those with forbidden knowledge can stand against the rising tide.',
    coverImage: 'https://picsum.photos/seed/gn1/400/600',
    bannerImage: 'https://picsum.photos/seed/gn2/1200/600',
    genres: ['Fantasy', 'Shonen', 'Action'],
    rating: 4.7,
    releaseYear: 2024,
    status: 'Airing'
  }
];

export const MOCK_EPISODES: Episode[] = [
  {
    id: 'e1',
    animeId: '1',
    episodeNumber: 1,
    title: 'The First Shadow',
    serverUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    thumbnail: 'https://picsum.photos/seed/ep1/320/180',
    duration: '24:00'
  },
  {
    id: 'e2',
    animeId: '1',
    episodeNumber: 2,
    title: 'Echoes in the Dark',
    serverUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    thumbnail: 'https://picsum.photos/seed/ep2/320/180',
    duration: '23:45'
  }
];

export const MOCK_COMMENTS: Comment[] = [
  {
    id: 'c1',
    episodeId: 'e1',
    userId: 'u1',
    userName: 'Kaze_Kun',
    content: 'Wow, the animation in the opening scene was incredible!',
    createdAt: '2024-03-20T10:00:00Z'
  },
  {
    id: 'c2',
    episodeId: 'e1',
    userId: 'u2',
    userName: 'Nightshade',
    content: 'I love the dark atmosphere of this show. Definitely adding to my watchlist.',
    createdAt: '2024-03-20T11:30:00Z'
  }
];
