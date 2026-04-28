
"use client";

import React, { useRef, useEffect, useMemo } from 'react';

interface StreamPlayerProps {
  url: string;
  title: string;
}

type PlaybackMode = 
  | { type: 'none' }
  | { type: 'youtube'; src: string }
  | { type: 'video'; src: string }
  | { type: 'iframe'; src: string };

export function StreamPlayer({ url, title }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Helper to determine the best playback method
  const playbackMode = useMemo((): PlaybackMode => {
    if (!url || typeof url !== 'string' || url.trim() === '') return { type: 'none' };
    
    // 1. Check for YouTube
    const youtubeRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const ytMatch = url.match(youtubeRegExp);
    if (ytMatch && ytMatch[2].length === 11) {
      return { type: 'youtube', src: `https://www.youtube.com/embed/${ytMatch[2]}?autoplay=0&rel=0` };
    }

    // 2. Check if it looks like a direct video file (ends in .mp4, .webm, .m4v, .ogv)
    const isDirectVideo = /\.(mp4|webm|m4v|ogv|mov)(\?.*)?$/i.test(url);
    if (isDirectVideo) {
      return { type: 'video', src: url };
    }

    // 3. Fallback: If it's a URL but doesn't look like a direct file, it's likely an embeddable page
    return { type: 'iframe', src: url };
  }, [url]);

  useEffect(() => {
    if (videoRef.current && playbackMode.type === 'video') {
      videoRef.current.load();
    }
  }, [playbackMode]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
      {playbackMode.type === 'youtube' || playbackMode.type === 'iframe' ? (
        <iframe
          key={playbackMode.src}
          src={playbackMode.src}
          title={title}
          className="h-full w-full border-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : playbackMode.type === 'video' ? (
        <video
          ref={videoRef}
          key={playbackMode.src}
          className="h-full w-full"
          controls
          playsInline
          preload="auto"
          src={playbackMode.src}
        >
          Your browser does not support direct video playback.
        </video>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          No video source selected
        </div>
      )}
      
      <div className="absolute left-4 top-4 pointer-events-none rounded-lg bg-black/60 px-3 py-1 text-sm font-medium text-white backdrop-blur-md">
        {title}
      </div>
    </div>
  );
}
