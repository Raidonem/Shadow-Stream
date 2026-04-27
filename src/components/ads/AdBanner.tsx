
"use client";

import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '../../firebase/index';
import { doc } from 'firebase/firestore';

// REPLACE THIS with your actual Publisher ID from AdSense
export const ADSENSE_PUBLISHER_ID = "ca-pub-9229134067523856";

interface AdBannerProps {
  dataAdSlot: string;
  dataAdFormat?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
  fullWidthResponsive?: boolean;
  className?: string;
  hideLabel?: boolean;
}

/**
 * A reusable Google AdSense Banner component.
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
      
      // Strict check for visibility and width to prevent "availableWidth=0" error
      if (entry.isIntersecting && adRef.current && adRef.current.clientWidth > 0 && !hasPushed.current) {
        // Use a small timeout to ensure the DOM layout is completely stable
        const timer = setTimeout(() => {
          try {
            // @ts-ignore
            if (typeof window !== 'undefined' && window.adsbygoogle && adRef.current && adRef.current.clientWidth > 0) {
              // @ts-ignore
              (window.adsbygoogle = window.adsbygoogle || []).push({});
              hasPushed.current = true;
              observer.disconnect();
            }
          } catch (err) {
            console.error("AdSense push error:", err);
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }, { 
      threshold: 0.1,
      rootMargin: '100px' // Load slightly before coming into view
    });

    observer.observe(adRef.current);

    return () => observer.disconnect();
  }, [isMounted, dataAdSlot, shouldHideAds]);

  if (shouldHideAds) {
    return null;
  }

  // To help you debug, we show a colored box in development if no numeric ID is provided
  const isPlaceholder = dataAdSlot.includes("_SLOT") || dataAdSlot === "1234567890";

  return (
    <div 
      ref={adRef}
      className={cn(
        "overflow-hidden rounded-2xl bg-secondary/5 p-4 text-center transition-all min-h-[100px] w-full",
        dataAdFormat === 'vertical' ? "h-full flex flex-col items-center min-w-[160px]" : "my-6",
        className
      )}
    >
      {!hideLabel && (
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30">
          {isPlaceholder ? "Ad Placeholder (Replace Slot ID)" : "Advertisement"}
        </div>
      )}
      <div className={cn(
        "min-h-[100px] w-full",
        dataAdFormat === 'vertical' ? "flex-1" : "",
        isPlaceholder ? "border border-dashed border-primary/20 flex items-center justify-center italic text-xs text-muted-foreground" : ""
      )}>
        {isMounted ? (
          <ins
            className="adsbygoogle"
            style={{ 
              display: 'block', 
              height: dataAdFormat === 'vertical' ? '100%' : 'auto',
              minWidth: '250px', // Minimum standard width for many ads
              minHeight: '100px'
            }}
            data-ad-client={ADSENSE_PUBLISHER_ID}
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
