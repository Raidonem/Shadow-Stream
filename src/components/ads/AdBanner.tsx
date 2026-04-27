
"use client";

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase/index'index';
import { doc } from 'firebase/firestore';

interface AdBannerProps {
  dataAdSlot: string;
  dataAdFormat?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
  fullWidthResponsive?: boolean;
  className?: string;
  hideLabel?: boolean;
}

/**
 * A reusable Google AdSense Banner component.
 * Optimized with IntersectionObserver and physical dimension checks.
 * Automatically hides if the user has a premium subscription or is an administrator.
 */
export function AdBanner({ 
  dataAdSlot, 
  dataAdFormat = 'auto', 
  fullWidthResponsive = true,
  className,
  hideLabel = false
}: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const hasPushed = useRef(false);
  
  const { user } = useUser();
  const db = useFirestore();

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

  const isPremium = profile?.isPremium === true;
  const isAdmin = !!adminDoc;
  const shouldHideAds = isPremium || isAdmin;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !adRef.current || hasPushed.current || shouldHideAds) return;

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      
      if (entry.isIntersecting && adRef.current && adRef.current.offsetWidth > 0 && !hasPushed.current) {
        try {
          // @ts-ignore
          if (typeof window !== 'undefined' && window.adsbygoogle) {
            // @ts-ignore
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            hasPushed.current = true;
            observer.disconnect();
          }
        } catch (err) {
          // Silently catch errors
        }
      }
    }, { 
      threshold: 0.1,
      rootMargin: '50px' 
    });

    observer.observe(adRef.current);

    return () => observer.disconnect();
  }, [isMounted, dataAdSlot, shouldHideAds]);

  // If user is premium or admin, don't render the ad slot at all
  if (shouldHideAds) {
    return null;
  }

  return (
    <div 
      ref={adRef}
      className={cn(
        "overflow-hidden rounded-2xl bg-secondary/5 p-4 text-center transition-all",
        dataAdFormat === 'vertical' ? "h-full flex flex-col items-center" : "my-6",
        className
      )}
    >
      {!hideLabel && (
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30">
          Advertisement
        </div>
      )}
      <div className={cn(
        "min-h-[100px] w-full",
        dataAdFormat === 'vertical' ? "flex-1" : ""
      )}>
        {isMounted ? (
          <ins
            className="adsbygoogle"
            style={{ 
              display: 'block', 
              height: dataAdFormat === 'vertical' ? '100%' : 'auto',
              minWidth: '100px',
              minHeight: '100px'
            }}
            data-ad-client="ca-pub-9229134067523856"
            data-ad-slot={dataAdSlot}
            data-ad-format={dataAdFormat}
            data-full-width-responsive={fullWidthResponsive.toString()}
          />
        ) : (
          <div className="min-h-[100px] w-full animate-pulse bg-secondary/10 rounded-xl" />
        )}
      </div>
    </div>
  );
}
