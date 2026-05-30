'use client';

import { useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getColorTheme, setColorTheme, type ColorTheme } from '@/lib/storage';

interface ThemeOption {
  id: ColorTheme;
  name: string;
  color: string;
  darkColor: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'default',
    name: 'Default',
    color: 'oklch(0.6 0.25 15)',
    darkColor: 'oklch(0.65 0.27 15)',
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    color: 'oklch(0.6 0.2 240)',
    darkColor: 'oklch(0.6 0.2 240)',
  },
  {
    id: 'forest',
    name: 'Forest Green',
    color: 'oklch(0.6 0.2 150)',
    darkColor: 'oklch(0.6 0.2 150)',
  },
  {
    id: 'midnight',
    name: 'Midnight Purple',
    color: 'oklch(0.6 0.25 300)',
    darkColor: 'oklch(0.6 0.25 300)',
  },
  {
    id: 'sunset',
    name: 'Sunset Rose',
    color: 'oklch(0.65 0.25 10)',
    darkColor: 'oklch(0.65 0.25 10)',
  },
];

export default function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState<ColorTheme>(() => {
    if (typeof window === 'undefined') return 'default';
    const saved = getColorTheme();
    // Apply the data-theme attribute on mount
    if (saved === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', saved);
    }
    return saved;
  });
  const [open, setOpen] = useState(false);

  const handleSelectTheme = (theme: ColorTheme) => {
    setCurrentTheme(theme);
    setColorTheme(theme);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label="Select color theme"
        >
          <Palette className="size-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-2">
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground px-2 pb-1.5">
            Color Theme
          </p>
          {THEME_OPTIONS.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleSelectTheme(theme.id)}
              className="flex items-center gap-3 w-full rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors text-left"
            >
              <span
                className="shrink-0 size-5 rounded-full border border-border/50 shadow-sm"
                style={{ backgroundColor: theme.color }}
              />
              <span className="flex-1">{theme.name}</span>
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
