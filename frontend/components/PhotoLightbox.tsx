'use client';

import { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Photo } from '@/lib/api';

interface PhotoLightboxProps {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function PhotoLightbox({
  photos,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}: PhotoLightboxProps) {
  const photo = photos[currentIndex];
  const total = photos.length;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < total - 1;

  // ─── Keyboard navigation ──────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (hasPrev) onPrev();
          break;
        case 'ArrowRight':
          if (hasNext) onNext();
          break;
      }
    },
    [onClose, onPrev, onNext, hasPrev, hasNext]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${currentIndex + 1} de ${total}`}
    >
      {/* ─── Dark overlay ──────────────────────────── */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* ─── Close button ──────────────────────────── */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        aria-label="Cerrar"
      >
        <X className="w-6 h-6" />
      </button>

      {/* ─── Counter ───────────────────────────────── */}
      <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm font-medium backdrop-blur-sm">
        {currentIndex + 1} de {total}
      </div>

      {/* ─── Previous arrow ────────────────────────── */}
      {hasPrev && (
        <button
          onClick={onPrev}
          className="absolute left-4 z-10 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors -translate-y-1/2 top-1/2"
          aria-label="Foto anterior"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {/* ─── Next arrow ────────────────────────────── */}
      {hasNext && (
        <button
          onClick={onNext}
          className="absolute right-4 z-10 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors -translate-y-1/2 top-1/2"
          aria-label="Foto siguiente"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* ─── Image ─────────────────────────────────── */}
      <div className="relative z-0 max-w-[90vw] max-h-[90vh] flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={`Foto ${currentIndex + 1} del proyecto`}
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* ─── EXIF badge ────────────────────────────── */}
      {photo.exif_stripped && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-green-600/90 text-white text-xs font-medium backdrop-blur-sm flex items-center gap-1.5">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
          EXIF limpio
        </div>
      )}
    </div>
  );
}
