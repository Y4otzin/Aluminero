'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { CatalogItem, CatalogType, CreateCatalogItem, UpdateCatalogItem } from '@/lib/api';

// ─── Schema de validación ───────────────────────────────

const catalogFormSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(200, 'Máximo 200 caracteres'),
  price: z
    .union([z.string(), z.number()])
    .transform((val) => (val === '' || val === undefined || val === null ? null : Number(val)))
    .pipe(
      z
        .number()
        .min(0, 'El precio no puede ser negativo')
        .nullable()
        .optional()
    ),
});

type CatalogFormValues = z.input<typeof catalogFormSchema>;

// ─── Labels por tipo ────────────────────────────────────

const CATALOG_LABELS: Record<CatalogType, string> = {
  'aluminum-series': 'Serie de Aluminio',
  finishes: 'Acabado',
  'glass-types': 'Tipo de Vidrio',
  hardware: 'Herraje',
};

// ─── Props ──────────────────────────────────────────────

interface CatalogModalProps {
  type: CatalogType;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateCatalogItem | UpdateCatalogItem) => Promise<void>;
  item?: CatalogItem | null; // null = crear, objeto = editar
  isSaving?: boolean;
}

// ─── Componente ─────────────────────────────────────────

export default function CatalogModal({
  type,
  isOpen,
  onClose,
  onSave,
  item,
  isSaving = false,
}: CatalogModalProps) {
  const isEditing = !!item;
  const label = CATALOG_LABELS[type];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CatalogFormValues>({
    resolver: zodResolver(catalogFormSchema),
    defaultValues: {
      name: '',
      price: '',
    },
  });

  // Pre-llenar formulario al editar
  useEffect(() => {
    if (item) {
      reset({
        name: item.name,
        price: item.price ?? ('' as unknown as number),
      });
    } else {
      reset({ name: '', price: '' });
    }
  }, [item, reset, isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const onSubmit = async (formData: CatalogFormValues) => {
    await onSave({
      name: formData.name,
      price: formData.price as number | null | undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="catalog-modal-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2
            id="catalog-modal-title"
            className="text-lg font-semibold text-gray-900"
          >
            {isEditing ? `Editar ${label}` : `Nuevo ${label}`}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">
          <Input
            label="Nombre"
            placeholder={`Nombre del ${label.toLowerCase()}`}
            error={errors.name?.message}
            required
            {...register('name')}
          />

          <Input
            label="Precio (MXN)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            error={errors.price?.message}
            helperText="Opcional. Precio por unidad en pesos mexicanos."
            {...register('price', {
              setValueAs: (v: string) => (v === '' ? null : Number(v)),
            })}
          />

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              {isEditing ? 'Guardar cambios' : 'Crear'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
