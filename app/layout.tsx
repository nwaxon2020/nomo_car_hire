import type { Metadata } from "next";
import "./globals.css";

// ✅ Correct Geist imports
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

import Nav from "@/ui/nav";
import Footer from "@/ui/footer";

export const metadata: Metadata = {
  title: "Nomo Cars | Premium Car Rental Service",
  description: "Experience luxury travel with Nomo Cars. Rent premium vehicles with seamless booking, flexible plans, and exceptional service. Your journey, elevated.",
  keywords: ["car rental", "luxury cars", "premium vehicles", "car hire", "rent a car", "Nomo Cars"],
  authors: [{ name: "Nomo Cars" }],
  creator: "Nomo Cars",
  publisher: "Nomo Cars",
  robots: "index, follow",
  
  // Open Graph for Facebook, LinkedIn, etc.
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://nomocars.com",
    siteName: "Nomo Cars",
    title: "Nomo Cars | Premium Car Rental Service",
    description: "Experience luxury travel with Nomo Cars. Rent premium vehicles with seamless booking and exceptional service.",
    images: [
      {
        url: "https://nomocars.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Nomo Cars - Premium Car Rental",
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Nomo Cars | Premium Car Rental Service",
    description: "Experience luxury travel with Nomo Cars. Rent premium vehicles with seamless booking and exceptional service.",
    images: ["https://nomocars.com/twitter-image.png"],
    creator: "@nomocars",
  },
  
  // Additional meta
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Open Graph Meta Tags for Social Sharing */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://nomocars.com" />
        <meta property="og:site_name" content="Nomo Cars" />
        <meta property="og:title" content="Nomo Cars | Premium Car Rental Service" />
        <meta property="og:description" content="Experience luxury travel with Nomo Cars. Rent premium vehicles with seamless booking, flexible plans, and exceptional service." />
        <meta property="og:image" content="https://nomocars.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Nomo Cars - Premium Car Rental Service" />
        <meta property="og:locale" content="en_US" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@nomocars" />
        <meta name="twitter:creator" content="@nomocars" />
        <meta name="twitter:title" content="Nomo Cars | Premium Car Rental Service" />
        <meta name="twitter:description" content="Experience luxury travel with Nomo Cars. Rent premium vehicles with seamless booking and exceptional service." />
        <meta name="twitter:image" content="/home_bg.jpg" />
        <meta name="twitter:image:alt" content="Nomo Cars - Premium Car Rental Service" />
        
        {/* Additional Social Meta Tags */}
        <meta name="description" content="Experience luxury travel with Nomo Cars. Rent premium vehicles with seamless booking, flexible plans, and exceptional service." />
        
        {/* WhatsApp Specific */}
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:secure_url" content="https://nomocars.com/og-image.png" />
        
        {/* LinkedIn Specific */}
        <meta property="og:image" content="https://nomocars.com/og-image.png" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* Font Awesome */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        
        {/* Performance Optimizations */}
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
        <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />
        
        {/* Theme Color for Mobile Browsers */}
        <meta name="theme-color" content="#000000" />
        <meta name="msapplication-TileColor" content="#000000" />
      </head>

      <body className="antialiased">
        <Nav />
        <hr className="text-white" />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}