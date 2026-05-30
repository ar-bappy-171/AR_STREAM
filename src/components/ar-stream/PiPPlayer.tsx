'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { X, Minimize2, Maximize2, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

type PiPSize = 'small' | 'medium' | 'large';

const SIZE_MAP: Record<PiPSize, { width: number; height: number }> = {
  small: { width: 320, height: 180 },
  medium: { width: 480, height: 270 },
  large: { width: 640, height: 360 },
};

function getInitialPosition(size: PiPSize): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  const dims = SIZE_MAP[size];
  return {
    x: window.innerWidth - dims.width - 20,
    y: window.innerHeight - dims.height - 80,
  };
}

interface PiPPlayerProps {
  trailerKey: string;
  title: string | null;
  onClose: () => void;
}

export default function PiPPlayer({ trailerKey, title, onClose }: PiPPlayerProps) {
  const [size, setSize] = useState<PiPSize>('small');
  const [position, setPosition] = useState<{ x: number; y: number }>(() => getInitialPosition('small'));
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const currentSize = SIZE_MAP[size];

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const newX = Math.max(0, Math.min(window.innerWidth - currentSize.width, e.clientX - dragOffset.current.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffset.current.y));
    setPosition({ x: newX, y: newY });
  }, [isDragging, currentSize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    dragOffset.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    };
  }, [position]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const newX = Math.max(0, Math.min(window.innerWidth - currentSize.width, touch.clientX - dragOffset.current.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 60, touch.clientY - dragOffset.current.y));
    setPosition({ x: newX, y: newY });
  }, [isDragging, currentSize]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      return () => {
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleTouchMove, handleTouchEnd]);

  const cycleSize = useCallback(() => {
    const sizes: PiPSize[] = ['small', 'medium', 'large'];
    const currentIdx = sizes.indexOf(size);
    const nextIdx = (currentIdx + 1) % sizes.length;
    setSize(sizes[nextIdx]);
  }, [size]);

  return (
    <div
      ref={containerRef}
      className="fixed z-[90] shadow-2xl rounded-xl overflow-hidden border border-border/50 bg-black"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${currentSize.width}px`,
        height: `${currentSize.height + 40}px`,
        cursor: isDragging ? 'grabbing' : 'default',
        transition: isDragging ? 'none' : 'width 0.2s, height 0.2s',
      }}
    >
      {/* Title Bar - Draggable */}
      <div
        className="flex items-center justify-between h-10 bg-card/95 backdrop-blur-sm px-3 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-foreground truncate">
            {title || 'PiP Player'}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={cycleSize}
            aria-label="Resize player"
          >
            {size === 'large' ? (
              <Minimize2 className="h-3 w-3 text-muted-foreground" />
            ) : (
              <Maximize2 className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
            aria-label="Close PiP player"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Video Container */}
      <div
        className="w-full bg-black"
        style={{ height: `${currentSize.height}px` }}
      >
        <iframe
          src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`}
          title={title || 'PiP Trailer'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
