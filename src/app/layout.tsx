import type {Metadata} from 'next';
import './globals.css';
import { Providers } from '../components/providers/Providers';
import { ADSENSE_PUBLISHER_ID } from '../components/ads/AdBanner';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'ShadowStream | Immersive Anime Streaming',
  description: 'Experience anime like never before in a mysterious, gloomy atmosphere.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#1B171D" />
        <Script 
          id="adsense-init"
          async 
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="font-body antialiased selection:bg-accent selection:text-accent-foreground">
        <Providers>
          <div className="relative min-h-screen">
            {/* Left Skyscraper Ad */}
            <div className="hidden 2xl:block fixed left-4 top-24 bottom-24 w-[160px] min-h-[600px] z-40">
              <div className="h-full my-0 rounded-2xl bg-secondary/5 border border-dashed border-primary/20 flex items-center justify-center italic text-[10px] text-muted-foreground/30 uppercase tracking-widest text-center px-4">
                Advertisement Slot
              </div>
            </div>
            
            {/* Right Skyscraper Ad */}
            <div className="hidden 2xl:block fixed right-4 top-24 bottom-24 w-[160px] min-h-[600px] z-40">
              <div className="h-full my-0 rounded-2xl bg-secondary/5 border border-dashed border-primary/20 flex items-center justify-center italic text-[10px] text-muted-foreground/30 uppercase tracking-widest text-center px-4">
                Advertisement Slot
              </div>
            </div>

            {/* Main Content Area */}
            <div className="2xl:mx-[200px]">
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
