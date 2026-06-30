'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Camera,
  X,
  FileImage,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

// ─── Constants ─────────────────────────────────────────
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILES = 10;
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

interface PhotoFile {
  file: File;
  preview: string;
  id: string;
}

interface PhotoUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  isLocked?: boolean;
}

export default function PhotoUploader({
  onUpload,
  isLocked = false,
}: PhotoUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<PhotoFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const dragCounter = useRef(0);

  // ─── Validation ──────────────────────────────────────
  const validateFiles = useCallback(
    (files: FileList | File[]): { valid: File[]; errors: string[] } => {
      const errors: string[] = [];
      const valid: File[] = [];

      // Convert FileList to array for ES5 compatibility
      const fileArray = Array.from(files);

      const totalAfterAdd = selectedFiles.length + fileArray.length;
      if (totalAfterAdd > MAX_FILES) {
        errors.push(
          `Máximo ${MAX_FILES} fotos permitidas. Ya tienes ${selectedFiles.length} seleccionada${selectedFiles.length !== 1 ? 's' : ''}.`
        );
        return { valid, errors };
      }

      for (const file of fileArray) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          errors.push(
            `${file.name}: formato no permitido. Usa ${ALLOWED_EXTENSIONS.join(', ')}`
          );
          continue;
        }
        if (file.size > MAX_SIZE_BYTES) {
          errors.push(
            `${file.name}: excede ${MAX_SIZE_MB} MB (${(file.size / 1024 / 1024).toFixed(1)} MB)`
          );
          continue;
        }
        valid.push(file);
      }

      return { valid, errors };
    },
    [selectedFiles.length]
  );

  // ─── Add files ──────────────────────────────────────
  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const { valid, errors: newErrors } = validateFiles(files);
      setErrors(newErrors);

      if (valid.length === 0) return;

      const newPhotoFiles: PhotoFile[] = valid.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      }));

      setSelectedFiles((prev) => [...prev, ...newPhotoFiles].slice(0, MAX_FILES));
    },
    [validateFiles]
  );

  // ─── Remove a single file ───────────────────────────
  const removeFile = useCallback((id: string) => {
    setSelectedFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  // ─── Clear all ──────────────────────────────────────
  const clearAll = useCallback(() => {
    for (const f of selectedFiles) {
      URL.revokeObjectURL(f.preview);
    }
    setSelectedFiles([]);
    setErrors([]);
  }, [selectedFiles]);

  // ─── Drag & Drop handlers ───────────────────────────
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  // ─── File input handler ─────────────────────────────
  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
      }
      // Reset so the same file can be re-selected
      if (e.target) e.target.value = '';
    },
    [addFiles]
  );

  // ─── Upload ─────────────────────────────────────────
  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    setErrors([]);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 20;
      });
    }, 300);

    try {
      const files = selectedFiles.map((f) => f.file);
      await onUpload(files);
      setUploadProgress(100);

      // Clean up previews
      for (const f of selectedFiles) {
        URL.revokeObjectURL(f.preview);
      }
      setSelectedFiles([]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error desconocido al subir fotos.';
      setErrors([msg]);
    } finally {
      clearInterval(progressInterval);
      setIsUploading(false);
    }
  }, [selectedFiles, onUpload]);

  // ─── Locked state ───────────────────────────────────
  if (isLocked) {
    return (
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="flex items-center gap-3 py-4 text-sm text-gray-500">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p>Este proyecto está bloqueado. No se pueden cargar nuevas fotos.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Drop zone ──────────────────────────────────── */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 text-center
          ${
            isDragging
              ? 'border-[#1e40af] bg-[#1e40af]/5 scale-[1.01]'
              : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
          }
        `}
      >
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(',')}
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(',')}
          capture="environment"
          className="hidden"
          onChange={handleFileInput}
        />

        {isDragging ? (
          <div className="space-y-2">
            <Upload className="w-10 h-10 text-[#1e40af] mx-auto animate-bounce" />
            <p className="text-[#1e40af] font-medium">Suelta los archivos aquí</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#1e40af]/10 flex items-center justify-center">
              <FileImage className="w-7 h-7 text-[#1e40af]" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                Arrastra y suelta tus fotos aquí
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {ALLOWED_EXTENSIONS.join(', ')} · Máx {MAX_FILES} archivos · Hasta {MAX_SIZE_MB} MB cada uno
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Upload className="w-4 h-4" />}
                onClick={() => fileInputRef.current?.click()}
              >
                Seleccionar archivos
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Camera className="w-4 h-4" />}
                onClick={() => cameraInputRef.current?.click()}
              >
                Tomar foto
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Errors ────────────────────────────────────── */}
      {errors.length > 0 && (
        <div className="space-y-1.5">
          {errors.map((err, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}

      {/* ─── Preview thumbnails ────────────────────────── */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {selectedFiles.length} archivo{selectedFiles.length !== 1 ? 's' : ''} seleccionado{selectedFiles.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={clearAll}
              className="text-xs text-gray-500 hover:text-red-600 transition-colors"
              disabled={isUploading}
            >
              Limpiar todo
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {selectedFiles.map((pf) => (
              <div
                key={pf.id}
                className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pf.preview}
                  alt={pf.file.name}
                  className="w-full h-full object-cover"
                />
                {/* Overlay with remove button */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <button
                    onClick={() => removeFile(pf.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-white/90 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all shadow"
                    aria-label={`Quitar ${pf.file.name}`}
                    disabled={isUploading}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-black/50 text-white text-[10px] truncate">
                  {pf.file.name}
                </div>
              </div>
            ))}
          </div>

          {/* ─── Upload progress ─────────────────────── */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Subiendo fotos...</span>
                <span className="font-medium text-[#1e40af]">
                  {Math.round(uploadProgress)}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1e40af] rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* ─── Upload button ──────────────────────── */}
          {!isUploading && (
            <Button
              fullWidth
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={handleUpload}
            >
              Subir {selectedFiles.length} foto{selectedFiles.length !== 1 ? 's' : ''}
            </Button>
          )}

          {/* ─── Success state ──────────────────────── */}
          {uploadProgress === 100 && selectedFiles.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>Fotos subidas correctamente</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
