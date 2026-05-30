'use client';

import { useState, useEffect, useRef } from 'react';
import { Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getColorTheme, setColorTheme, type ColorTheme } from '@/lib/storage';

interface ThemeOption {
  id: ColorTheme;
  name: string;
  color: string;
  description: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'default',
    name: 'Default Orange',
    color: 'oklch(0.65 0.27 15)',
    description: 'Warm orange brand color',
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    color: 'oklch(0.6 0.2 240)',
    description: 'Cool blue tones',
  },
  {
    id: 'forest',
    name: 'Forest Green',
    color: 'oklch(0.6 0.2 150)',
    description: 'Nature green tones',
  },
  {
    id: 'midnight',
    name: 'Midnight Purple',
    color: 'oklch(0.6 0.25 300)',
    description: 'Deep purple tones',
  },
  {
    id: 'sunset',
    name: 'Sunset Rose',
    color: 'oklch(0.65 0.25 10)',
    description: 'Warm pink/rose tones',
  },
];

function applyThemeToDocument(theme: ColorTheme) {
  if (typeof document === 'undefined') return;
  if (theme === 'default') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

export default function ThemeSelector() {
  // Read saved theme during initial render (not in an effect)
  const [currentTheme, setCurrentTheme] = useState<ColorTheme>(() => {
    if (typeof window === 'undefined') return 'default';
    return getColorTheme();
  });
  const mountedRef = useRef(false);
  const [open, setOpen] = useState(false);

  // Apply theme to DOM on mount and whenever currentTheme changes
  useEffect(() => {
    applyThemeToDocument(currentTheme);
    mountedRef.current = true;
  }, [currentTheme]);

  const handleSelectTheme = (theme: ColorTheme) => {
    setCurrentTheme(theme);
    setColorTheme(theme);
    setOpen(false);
  };

  // Find current theme option for the palette icon indicator
  const currentOption = THEME_OPTIONS.find(t => t.id === currentTheme);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 relative"
          aria-label="Select color theme"
        >
          <Palette className="size-5" />
          {/* Small color dot indicator showing current theme */}
          {currentTheme !== 'default' && (
            <span
              className="absolute bottom-1 right-1 size-2.5 rounded-full border border-background shadow-sm"
              style={{ backgroundColor: currentOption?.color }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-muted-foreground px-2 pb-1.5 uppercase tracking-wider">
            Color Theme
          </p>
          {THEME_OPTIONS.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleSelectTheme(theme.id)}
              className={`flex items-center gap-3 w-full rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors text-left ${
                currentTheme === theme.id ? 'bg-accent/50' : ''
              }`}
            >
              <span
                className="shrink-0 size-5 rounded-full border border-border/50 shadow-sm ring-offset-background"
                style={{ backgroundColor: theme.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{theme.name}</div>
                <div className="text-[11px] text-muted-foreground">{theme.description}</div>
              </div>
              {currentTheme === theme.id && (
                <Check className="size-4 text-ars shrink-0" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
