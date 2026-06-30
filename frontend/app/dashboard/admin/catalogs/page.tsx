'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import CatalogModal from '@/components/CatalogModal';
import {
  getAluminumSeries,
  createAluminumSeries,
  updateAluminumSeries,
  deleteAluminumSeries,
  getFinishes,
  createFinish,
  updateFinish,
  deleteFinish,
  getGlassTypes,
  createGlassType,
  updateGlassType,
  deleteGlassType,
  getHardware,
  createHardware,
  updateHardware,
  deleteHardware,
} from '@/lib/api';
import type { CatalogItem, CatalogType, CreateCatalogItem, UpdateCatalogItem } from '@/lib/api';
import {
  Layers,
  PaintBucket,
  PanelTop,
  Wrench,
  Plus,
  Pencil,
  Trash2,
  ShieldAlert,
  Loader2,
  RefreshCw,
} from 'lucide-react';

// ─── Configuración de pestañas ──────────────────────────

interface TabConfig {
  type: CatalogType;
  label: string;
  icon: React.ReactNode;
  fetchFn: (token: string) => Promise<CatalogItem[]>;
  createFn: (token: string, data: CreateCatalogItem) => Promise<CatalogItem>;
  updateFn: (token: string, id: string, data: UpdateCatalogItem) => Promise<CatalogItem>;
  deleteFn: (token: string, id: string) => Promise<{ message: string }>;
}

const TABS: TabConfig[] = [
  {
    type: 'aluminum-series',
    label: 'Aluminio',
    icon: <Layers className="w-4 h-4" />,
    fetchFn: getAluminumSeries,
    createFn: createAluminumSeries,
    updateFn: updateAluminumSeries,
    deleteFn: deleteAluminumSeries,
  },
  {
    type: 'finishes',
    label: 'Acabados',
    icon: <PaintBucket className="w-4 h-4" />,
    fetchFn: getFinishes,
    createFn: createFinish,
    updateFn: updateFinish,
    deleteFn: deleteFinish,
  },
  {
    type: 'glass-types',
    label: 'Vidrios',
    icon: <PanelTop className="w-4 h-4" />,
    fetchFn: getGlassTypes,
    createFn: createGlassType,
    updateFn: updateGlassType,
    deleteFn: deleteGlassType,
  },
  {
    type: 'hardware',
    label: 'Herrajes',
    icon: <Wrench className="w-4 h-4" />,
    fetchFn: getHardware,
    createFn: createHardware,
    updateFn: updateHardware,
    deleteFn: deleteHardware,
  },
];

// ─── Formateador de precio ──────────────────────────────

function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return '—';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(price);
}

// ─── Página principal ───────────────────────────────────

export default function AdminCatalogsPage() {
  const { token, isAdmin, isLoading: isAuthLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<number>(0);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentTab = TABS[activeTab];

  // ─── Cargar datos ─────────────────────────────────
  const loadItems = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await currentTab.fetchFn(token);
      setItems(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error al cargar el catálogo';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [token, currentTab]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // ─── Abrir modal para crear ───────────────────────
  const handleOpenCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  // ─── Abrir modal para editar ─────────────────────
  const handleOpenEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  // ─── Guardar (crear o editar) ────────────────────
  const handleSave = async (data: CreateCatalogItem | UpdateCatalogItem) => {
    if (!token) return;
    setIsSaving(true);
    try {
      if (editingItem) {
        await currentTab.updateFn(token, editingItem.id, data);
      } else {
        await currentTab.createFn(token, data as CreateCatalogItem);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      await loadItems();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error al guardar';
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Eliminar ────────────────────────────────────
  const handleDelete = async (item: CatalogItem) => {
    if (!token) return;
    const confirmed = window.confirm(
      `¿Eliminar "${item.name}"? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    try {
      await currentTab.deleteFn(token, item.id);
      await loadItems();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error al eliminar';
      alert(message);
    }
  };

  // ─── Cerrar modal ────────────────────────────────
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  // ─── Loading de auth ─────────────────────────────
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e40af]" />
      </div>
    );
  }

  // ─── Guardia: solo admin ─────────────────────────
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center" padding="lg">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle>Sin permisos</CardTitle>
            <p className="text-gray-500 text-sm">
              No tienes permisos de administrador para acceder a la gestión de
              catálogos. Contacta al administrador del sistema si necesitas
              acceso.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Vista principal ─────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Catálogos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Administra los precios y referencias de materiales, acabados, vidrios
          y herrajes.
        </p>
      </div>

      {/* Pestañas */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((tab, idx) => (
          <button
            key={tab.type}
            onClick={() => setActiveTab(idx)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
              transition-all duration-150
              ${
                activeTab === idx
                  ? 'bg-white text-[#1e40af] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }
            `}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Contenido de la pestaña */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{currentTab.label}</CardTitle>
            <p className="text-sm text-gray-500 mt-0.5">
              {items.length} elemento{items.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadItems}
              isLoading={isLoading}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Actualizar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreate}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Agregar
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Estados: loading, error, vacío, tabla */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#1e40af]" />
              <span className="ml-3 text-sm text-gray-500">
                Cargando catálogo...
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                <ShieldAlert className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-sm font-medium text-gray-900">
                Error al cargar
              </p>
              <p className="text-sm text-gray-500 mt-1 mb-4">{error}</p>
              <Button variant="outline" size="sm" onClick={loadItems}>
                Reintentar
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                {currentTab.icon}
              </div>
              <p className="text-sm font-medium text-gray-900">
                Sin elementos
              </p>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                No hay {currentTab.label.toLowerCase()} registrados. Agrega el
                primero.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenCreate}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Agregar {currentTab.label}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">
                      Nombre
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">
                      Precio
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700 tabular-nums">
                        {formatPrice(item.price)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#1e40af] hover:bg-[#1e40af]/10 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de crear/editar */}
      <CatalogModal
        type={currentTab.type}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        item={editingItem}
        isSaving={isSaving}
      />
    </div>
  );
}
