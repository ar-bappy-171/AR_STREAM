'use client';

import { useState } from 'react';
import { Radio, Tv, Volume2, VolumeX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface LiveTVSectionProps {}

interface Channel {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  category: string;
}

const CHANNELS: Channel[] = [
  { id: 'espn', name: 'ESPN', description: 'Live sports coverage and highlights', color: '#d00', icon: '⚽', category: 'Sports' },
  { id: 'bbc-world', name: 'BBC World', description: 'International news and current affairs', color: '#1a1a2e', icon: '🌍', category: 'News' },
  { id: 'cnn', name: 'CNN', description: '24/7 news network', color: '#c00', icon: '📺', category: 'News' },
  { id: 'discovery', name: 'Discovery', description: 'Science, nature and technology', color: '#1b5e20', icon: '🔬', category: 'Documentary' },
  { id: 'nat-geo', name: 'National Geographic', description: 'Exploring the world through stories', color: '#f9a825', icon: '🗺️', category: 'Documentary' },
  { id: 'hbo', name: 'HBO', description: 'Premium movies and original series', color: '#4a148c', icon: '🎬', category: 'Movies' },
  { id: 'netflix', name: 'Netflix Originals', description: 'Award-winning original content', color: '#b71c1c', icon: '🎥', category: 'Movies' },
  { id: 'comedy-central', name: 'Comedy Central', description: 'Stand-up, sketches and comedy shows', color: '#e65100', icon: '😂', category: 'Entertainment' },
  { id: 'mtv', name: 'MTV', description: 'Music videos and pop culture', color: '#880e4f', icon: '🎵', category: 'Music' },
  { id: 'fox-sports', name: 'Fox Sports', description: 'Live sports and analysis', color: '#0d47a1', icon: '🏈', category: 'Sports' },
  { id: 'sky-news', name: 'Sky News', description: 'Breaking news and live updates', color: '#006064', icon: '📡', category: 'News' },
  { id: 'al-jazeera', name: 'Al Jazeera', description: 'Global news and documentaries', color: '#bf360c', icon: '🌐', category: 'News' },
];

export default function LiveTVSection(_props: LiveTVSectionProps) {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [muted, setMuted] = useState(true);

  const handleChannelClick = (channel: Channel) => {
    setSelectedChannel(channel);
  };

  const handleMuteToggle = () => {
    setMuted((prev) => !prev);
  };

  return (
    <section className="w-full fade-in">
      {/* Section Header */}
      <div className="px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-ars/10">
            <Radio className="size-5 text-ars" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Live TV</h2>
            <p className="text-sm text-muted-foreground">Watch live channels from around the world</p>
          </div>
        </div>
      </div>

      {/* Player Area */}
      {selectedChannel ? (
        <div className="px-4 sm:px-6 lg:px-8 mb-6">
          <div className="relative w-full aspect-video max-h-[480px] rounded-xl overflow-hidden bg-black shadow-2xl">
            {/* TV Static Effect */}
            <div className="tv-static absolute inset-0" />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Stream Unavailable Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              {/* Channel info */}
              <div className="mb-4 flex items-center gap-2">
                <div
                  className="flex items-center justify-center size-12 rounded-full shadow-lg"
                  style={{ backgroundColor: selectedChannel.color }}
                >
                  <span className="text-2xl">{selectedChannel.icon}</span>
                </div>
              </div>

              <Tv className="size-12 text-white/40 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-1">Stream Unavailable</h3>
              <p className="text-sm text-white/60 max-w-sm">
                This stream could not be loaded. Select a channel from the list.
              </p>
              <p className="text-xs text-white/40 mt-3">
                Channel: {selectedChannel.name}
              </p>
            </div>

            {/* Top bar with LIVE badge */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-red-600 text-white text-xs font-bold gap-1 px-2 py-0.5">
                  <span className="size-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </Badge>
                <span className="text-white/80 text-sm font-medium">{selectedChannel.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/70 hover:text-white hover:bg-white/10 size-8"
                onClick={handleMuteToggle}
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 sm:px-6 lg:px-8 mb-6">
          <div className="relative w-full aspect-video max-h-[480px] rounded-xl overflow-hidden bg-muted/30 border border-border/50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground/50">
              <Tv className="size-16" />
              <p className="text-sm">Select a channel to start watching</p>
            </div>
          </div>
        </div>
      )}

      {/* Channel Grid */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {CHANNELS.map((channel) => {
            const isSelected = selectedChannel?.id === channel.id;

            return (
              <button
                key={channel.id}
                onClick={() => handleChannelClick(channel)}
                className={`
                  group relative flex flex-col items-center gap-3 p-4 sm:p-5 rounded-xl
                  border transition-all duration-200 cursor-pointer
                  hover:border-ars/50 hover:shadow-lg hover:shadow-ars/5
                  ${isSelected
                    ? 'bg-ars/10 border-ars/50 shadow-lg shadow-ars/10'
                    : 'bg-card border-border/50 hover:bg-accent/50'
                  }
                `}
                aria-label={`Watch ${channel.name}`}
              >
                {/* Channel Logo */}
                <div
                  className={`
                    flex items-center justify-center size-14 sm:size-16 rounded-full
                    shadow-md transition-transform duration-200 group-hover:scale-110
                    ${isSelected ? 'ring-2 ring-ars ring-offset-2 ring-offset-card' : ''}
                  `}
                  style={{ backgroundColor: channel.color }}
                >
                  <span className="text-2xl sm:text-3xl">{channel.icon}</span>
                </div>

                {/* Channel Name */}
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-foreground line-clamp-1">
                    {channel.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                    {channel.description}
                  </p>
                </div>

                {/* LIVE Badge */}
                <Badge className="bg-red-600/90 text-white text-[9px] font-bold uppercase gap-1 px-1.5 py-0">
                  <span className="size-1 rounded-full bg-white animate-pulse" />
                  LIVE
                </Badge>

                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 size-2 rounded-full bg-ars animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
