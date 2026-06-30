'use client';

import { useState } from 'react';
import { Trash2, ShieldCheck, ImageIcon } from 'lucide-react';
import type { Photo } from '@/lib/api';
import PhotoLightbox from './PhotoLightbox';
import { Card, CardContent } from '@/components/ui/Card';

interface PhotoGalleryProps {
  photos: Photo[];
  onDelete: (photoId: string) => void;
  isLocked?: boolean;
}

export default function PhotoGallery({
  photos,
  onDelete,
  isLocked = false,
}: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ─── Empty state ────────────────────────────────────
  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <ImageIcon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          Sin fotos aún
        </h3>
        <p className="text-sm text-gray-500 max-w-sm">
          Sube fotos del proyecto usando el panel de carga. Formatos
          soportados: JPG, PNG y WebP.
        </p>
      </div>
    );
  }

  // ─── Lightbox navigation ───────────────────────────
  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const goPrev = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };
  const goNext = () => {
    if (lightboxIndex !== null && lightboxIndex < photos.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  // ─── Delete with confirmation ─────────────────────
  const handleDeleteClick = (photoId: string) => {
    if (deleteConfirm === photoId) {
      onDelete(photoId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(photoId);
      // Auto-cancel after 3 seconds
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  return (
    <>
      {/* ─── Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo, index) => (
          <Card
            key={photo.id}
            className="group relative overflow-hidden cursor-pointer p-0 border-gray-200 hover:border-[#1e40af]/40 transition-all duration-200 hover:shadow-lg"
            padding="none"
          >
            <CardContent className="p-0">
              {/* Thumbnail */}
              <div className="relative aspect-square bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onClick={() => openLightbox(index)}
                  loading="lazy"
                />

                {/* Hover overlay */}
                <div
                  className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200"
                  onClick={() => openLightbox(index)}
                />

                {/* EXIF badge */}
                {photo.exif_stripped && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-600/90 text-white text-[10px] font-medium backdrop-blur-sm">
                    <ShieldCheck className="w-3 h-3" />
                    EXIF limpio
                  </div>
                )}
              </div>

              {/* Delete button */}
              {!isLocked && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(photo.id);
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${
                      deleteConfirm === photo.id
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-white/90 text-gray-600 hover:bg-red-50 hover:text-red-600 shadow-sm'
                    }`}
                    aria-label={
                      deleteConfirm === photo.id
                        ? 'Confirmar eliminación'
                        : 'Eliminar foto'
                    }
                    title={
                      deleteConfirm === photo.id
                        ? '¿Eliminar? Haz clic para confirmar'
                        : 'Eliminar foto'
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Lightbox ──────────────────────────────────── */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
    </>
  );
}
