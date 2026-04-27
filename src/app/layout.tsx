
import type {Metadata} from 'next';
import './globals.css';
import { Providers } from '../components/providers/Providers';
import { AdBanner, ADSENSE_PUBLISHER_ID } from '../components/ads/AdBanner';
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
        {/* Google AdSense Script */}
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="font-body antialiased selection:bg-accent selection:text-accent-foreground">
        <Providers>
          <div className="relative min-h-screen">
            {/* Left SkyScraper Ad - Visible only on very large screens */}
            <div className="hidden 2xl:block fixed left-4 top-24 bottom-24 w-[160px] z-40">
              <AdBanner 
                dataAdSlot="SIDE_LEFT_SLOT" 
                dataAdFormat="vertical" 
                className="h-full my-0" 
              />
            </div>
            
            {/* Right SkyScraper Ad - Visible only on very large screens */}
            <div className="hidden 2xl:block fixed right-4 top-24 bottom-24 w-[160px] z-40">
              <AdBanner 
                dataAdSlot="SIDE_RIGHT_SLOT" 
                dataAdFormat="vertical" 
                className="h-full my-0" 
              />
            </div>

            {/* Main Content with padding on very large screens to accommodate fixed ads */}
            <div className="2xl:mx-[200px]">
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
