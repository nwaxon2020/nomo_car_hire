import type { Metadata, Viewport } from "next";
import "./globals.css";

// Fonts
import { Geist, Geist_Mono } from "next/font/google";

// UI
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import { Toaster } from "react-hot-toast";
import GlobalDriverListener from "@/components/GlobalDriverListener";
import { PWAProvider, PWAInstallBanner } from "@/components/PWA";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

/* ================= METADATA ================= */

export const metadata: Metadata = {
  title: {
    default: "Nomo Cars | Premium Car Rental Service",
    template: "%s | Nomo Cars",
  },
  description:
    "Experience luxury travel with Nomo Cars. Rent premium vehicles with seamless booking, flexible plans, and exceptional service.",
  keywords: [
    "car rental",
    "luxury cars",
    "premium vehicles",
    "car hire",
    "rent a car",
    "Nomo Cars",
  ],
  authors: [{ name: "Nomo Cars" }],
  creator: "Nomo Cars",
  publisher: "Nomo Cars",
  robots: "index, follow",

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://res.cloudinary.com/dqm6hjihm/image/upload/v1774736312/driverShareProfile_zy0dht.jpg",
    siteName: "Nomo Cars",
    title: "Nomo Cars | Premium Car Rental Service",
    description:
      "Experience luxury travel with Nomo Cars. Rent premium vehicles with seamless booking and exceptional service.",
    images: [
      {
        url: "https://res.cloudinary.com/dqm6hjihm/image/upload/v1774736312/driverShareProfile_zy0dht.jpg",
        width: 1200,
        height: 630,
        alt: "Nomo Cars - Premium Car Rental",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Nomo Cars | Premium Car Booking Service",
    description:
      "Experience luxury travel with Nomo Cars. Rent premium vehicles with seamless booking and exceptional service.",
    images: ["https://res.cloudinary.com/dqm6hjihm/image/upload/v1774736312/driverShareProfile_zy0dht.jpg"],
    creator: "@nomocars",
  },

  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },

  manifest: "/site.webmanifest",
};

/* ================= VIEWPORT (NEW WAY) ================= */

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

/* ================= ROOT LAYOUT ================= */

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="antialiased">
        {/* PWA Provider - MUST be at top level to provide context to all components */}
        <PWAProvider>
          {/* Global Toasts */}
          <Toaster position="top-center" reverseOrder={false} />

          {/* PWA: Register service worker */}
          <ServiceWorkerRegistrar />

          {/* PWA: Install banner (shown on every page, 15s, once per install) */}
          <PWAInstallBanner />

          {/* Driver Auto-Redirects for New Rides */}
          <GlobalDriverListener />

          <Nav />
          <hr className="text-white" />
          <main>{children}</main>
          <Footer />
        </PWAProvider>
      </body>
    </html>
  );
}