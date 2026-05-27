'use client';
import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export default function MobileBackButton() {
  useEffect(() => {
    // Check if the user is actually inside the Android app
    if (Capacitor.isNativePlatform()) {
      App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          // If they have browsing history, just go to the previous webpage
          window.history.back();
        } else {
          // If they are on the home page with no history, close the app normally
          App.exitApp();
        }
      });
    }
  }, []);

  // This component is completely invisible
  return null; 
}
