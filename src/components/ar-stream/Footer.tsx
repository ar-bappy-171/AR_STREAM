'use client';

import { Play, ExternalLink, Mail, Github, Twitter, MessageCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-border/40 bg-card/60 backdrop-blur-sm mb-16 md:mb-0">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-ars to-orange-500 shadow-lg shadow-ars/20">
                <Play className="size-4 text-white fill-white ml-0.5" />
              </div>
              <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-ars via-orange-400 to-amber-400 bg-clip-text text-transparent">
                AR-Stream
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              Your gateway to movies, TV shows, and anime from around the world. Discover, explore, and enjoy.
            </p>
          </div>

          {/* Disclaimer */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Disclaimer</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              For educational and personal use only. We do not host any streams. All content is sourced from third-party APIs.
            </p>
          </div>

          {/* Attribution */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Powered By</h4>
            <div className="space-y-2">
              <a
                href="https://www.themoviedb.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-ars transition-colors"
              >
                <ExternalLink className="size-3" />
                Powered by TMDB
              </a>
              <a
                href="https://jikan.moe/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-ars transition-colors"
              >
                <ExternalLink className="size-3" />
                Anime data from Jikan/MAL
              </a>
            </div>
          </div>

          {/* Contact & Social */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Connect</h4>
            <div className="space-y-2">
              <a
                href="mailto:report@ar-stream.dev?subject=AR-Stream%20Issue%20Report"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-ars transition-colors"
              >
                <Mail className="size-3" />
                Report Issue
              </a>
            </div>
            {/* Social Icons */}
            <div className="flex items-center gap-3 mt-4">
              <a
                href="#"
                aria-label="GitHub"
                className="flex items-center justify-center size-8 rounded-full bg-muted/50 text-muted-foreground hover:bg-ars/10 hover:text-ars transition-colors"
              >
                <Github className="size-4" />
              </a>
              <a
                href="#"
                aria-label="Twitter"
                className="flex items-center justify-center size-8 rounded-full bg-muted/50 text-muted-foreground hover:bg-ars/10 hover:text-ars transition-colors"
              >
                <Twitter className="size-4" />
              </a>
              <a
                href="#"
                aria-label="Discord"
                className="flex items-center justify-center size-8 rounded-full bg-muted/50 text-muted-foreground hover:bg-ars/10 hover:text-ars transition-colors"
              >
                <MessageCircle className="size-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/30 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              &copy; 2024 AR-Stream. All rights reserved.
            </p>
            <p className="text-[10px] text-muted-foreground/50">
              This product uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
