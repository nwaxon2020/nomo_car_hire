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
  title: "My Car Hire App",
  description: "Hire cars easily and safely",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <title>My Car Hire App</title>
        <meta name="description" content="Hire cars easily and safely" />
        <link rel="icon" href="/favicon.ico" />

        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
        />
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
