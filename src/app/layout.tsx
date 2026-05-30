import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AR-Stream - Movies, TV Shows & Anime Streaming Aggregator",
  description: "Discover and explore movies, TV series, and anime from around the world. AR-Stream aggregates content from TMDB, MyAnimeList, and more.",
  keywords: ["AR-Stream", "movies", "TV shows", "anime", "streaming", "entertainment", "TMDB", "MyAnimeList"],
  authors: [{ name: "AR-Stream" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "AR-Stream",
    description: "Movies, TV Shows & Anime Streaming Aggregator",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
