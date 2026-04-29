
"use client";

import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '../../firebase/index';
import { doc } from 'firebase/firestore';

export const ADSENSE_PUBLISHER_ID = "ca-pub-9229134067523856";

interface AdBannerProps {
  dataAdSlot: string;
  dataAdFormat?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
  fullWidthResponsive?: boolean;
  className?: string;
  hideLabel?: boolean;
}

export function AdBanner({ 
  dataAdSlot, 
  dataAdFormat = 'auto', 
  fullWidthResponsive = true,
  className,
  hideLabel = false
}: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);
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
    if (shouldHideAds || hasPushed.current) return;

    // Small delay to ensure the DOM is ready for AdSense
    const timer = setTimeout(() => {
      try {
        // @ts-ignore
        if (typeof window !== 'undefined' && window.adsbygoogle) {
          // @ts-ignore
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          hasPushed.current = true;
        }
      } catch (err) {
        console.warn("AdSense unit initialization failed:", err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [shouldHideAds, dataAdSlot]);

  if (shouldHideAds) {
    return null;
  }

  const isPlaceholder = dataAdSlot.includes("_SLOT") || dataAdSlot === "1234567890";

  return (
    <div 
      ref={adRef}
      className={cn(
        "overflow-hidden rounded-2xl bg-secondary/5 p-4 text-center transition-all min-h-[100px] w-full",
        dataAdFormat === 'vertical' ? "h-full min-h-[600px] flex flex-col items-center min-w-[160px]" : "my-6",
        className
      )}
    >
      {!hideLabel && (
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30">
          {isPlaceholder ? "Ad Unit Detected" : "Advertisement"}
        </div>
      )}
      <div className={cn(
        "min-h-[100px] w-full h-full",
        dataAdFormat === 'vertical' ? "flex-1 min-h-[600px]" : "",
        isPlaceholder ? "border border-dashed border-primary/20 flex items-center justify-center italic text-xs text-muted-foreground" : ""
      )}>
        <ins
          className="adsbygoogle"
          style={{ 
            display: 'block', 
            height: dataAdFormat === 'vertical' ? '100%' : 'auto',
            minWidth: dataAdFormat === 'vertical' ? '160px' : '250px',
            minHeight: dataAdFormat === 'vertical' ? '600px' : '100px'
          }}
          data-ad-client={ADSENSE_PUBLISHER_ID}
          data-ad-slot={dataAdSlot}
          data-ad-format={dataAdFormat}
          data-full-width-responsive={fullWidthResponsive.toString()}
        />
      </div>
    </div>
  );
}
