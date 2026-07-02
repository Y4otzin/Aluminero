'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  getKanban,
  assignProductionOrder,
  updateProductionStatus,
  getProductionSummary,
} from '@/lib/api';
import type {
  KanbanData,
  ProductionOrder,
  ProductionSummary,
  ProductionStatus,
} from '@/lib/api';
import ProductionCard from '@/components/ProductionCard';
import AssignModal from '@/components/AssignModal';
import {
  LayoutDashboard,
  RefreshCw,
  ClipboardList,
  AlertCircle,
  Package,
  Truck,
  CheckCircle2,
  Loader2,
  HardHat,
} from 'lucide-react';

const STATUS_CONFIG: {
  key: keyof KanbanData;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  headerBg: string;
  borderColor: string;
}[] = [
  {
    key: 'pending',
    label: 'Pendiente',
    icon: <AlertCircle className="w-4 h-4" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    headerBg: 'bg-amber-100',
    borderColor: 'border-amber-200',
  },
  {
    key: 'in_progress',
    label: 'En Proceso',
    icon: <HardHat className="w-4 h-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    headerBg: 'bg-blue-100',
    borderColor: 'border-blue-200',
  },
  {
    key: 'completed',
    label: 'Terminado',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    headerBg: 'bg-emerald-100',
    borderColor: 'border-emerald-200',
  },
  {
    key: 'delivered',
    label: 'Entregado',
    icon: <Truck className="w-4 h-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    headerBg: 'bg-purple-100',
    borderColor: 'border-purple-200',
  },
];

export default function ProductionKanbanPage() {
  const { token, isLoading: authLoading } = useAuth();

  // ─── State ─────────────────────────────────────────────
  const [kanban, setKanban] = useState<KanbanData | null>(null);
  const [summary, setSummary] = useState<ProductionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Assign modal state ────────────────────────────────
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);

  // ─── Load data ─────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const [kanbanData, summaryData] = await Promise.all([
        getKanban(token),
        getProductionSummary(token),
      ]);
      setKanban(kanbanData);
      setSummary(summaryData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar Kanban';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && token) {
      loadData();
    }
  }, [authLoading, token, loadData]);

  // ─── Handlers ──────────────────────────────────────────

  const handleAssignClick = useCallback((order: ProductionOrder) => {
    setSelectedOrder(order);
    setAssignModalOpen(true);
  }, []);

  const handleAssign = useCallback(
    async (userId: string) => {
      if (!token || !selectedOrder) return;
      const updated = await assignProductionOrder(token, selectedOrder.id, userId);
      // Update kanban optimistically
      setKanban((prev) => {
        if (!prev) return prev;
        const newKanban = { ...prev };
        // Find and update the order in its column
        for (const key of Object.keys(newKanban) as (keyof KanbanData)[]) {
          newKanban[key] = newKanban[key].map((o) =>
            o.id === updated.id ? updated : o
          );
        }
        return newKanban;
      });
    },
    [token, selectedOrder]
  );

  const handleAdvance = useCallback(
    async (order: ProductionOrder) => {
      if (!token) return;

      const statusMap: Record<ProductionStatus, ProductionStatus> = {
        pending: 'in_progress',
        in_progress: 'completed',
        completed: 'delivered',
        delivered: 'delivered',
      };

      const nextStatus = statusMap[order.status];
      if (!nextStatus || nextStatus === order.status) return;

      try {
        const updated = await updateProductionStatus(token, order.id, nextStatus);
        // Update kanban: remove from current column, add to next
        setKanban((prev) => {
          if (!prev) return prev;

          const statusKeyMap: Record<ProductionStatus, keyof KanbanData> = {
            pending: 'pending',
            in_progress: 'in_progress',
            completed: 'completed',
            delivered: 'delivered',
          };

          const currentKey = statusKeyMap[order.status];
          const nextKey = statusKeyMap[nextStatus];

          if (!currentKey || !nextKey) return prev;

          return {
            ...prev,
            [currentKey]: prev[currentKey].filter((o) => o.id !== order.id),
            [nextKey]: [...prev[nextKey], updated],
          };
        });

        // Update summary
        setSummary((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            [order.status]: Math.max(0, prev[order.status] - 1),
            [nextStatus]: prev[nextStatus] + 1,
          };
        });
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Error al actualizar estado';
        setError(msg);
      }
    },
    [token]
  );

  // ─── Loading state ─────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#1e40af] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-[#1e40af]" />
            Kanban de Producción
          </h1>
          <p className="text-gray-500 mt-1">
            Gestiona el flujo de trabajo de las órdenes de producción
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
          />
          Actualizar
        </button>
      </div>

      {/* ─── Summary Cards ────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">
              Pendientes
            </p>
            <p className="text-2xl font-bold text-amber-800 mt-1">
              {summary.pending}
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">
              En Proceso
            </p>
            <p className="text-2xl font-bold text-blue-800 mt-1">
              {summary.in_progress}
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">
              Terminados
            </p>
            <p className="text-2xl font-bold text-emerald-800 mt-1">
              {summary.completed}
            </p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">
              Entregados
            </p>
            <p className="text-2xl font-bold text-purple-800 mt-1">
              {summary.delivered}
            </p>
          </div>
        </div>
      )}

      {/* ─── Error banner ─────────────────────────────── */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* ─── Loading ──────────────────────────────────── */}
      {loading && !kanban && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#1e40af]" />
            <p className="text-sm text-gray-500">Cargando Kanban...</p>
          </div>
        </div>
      )}

      {/* ─── Kanban Columns ──────────────────────────── */}
      {kanban && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_CONFIG.map((col) => {
            const orders = kanban[col.key];
            return (
              <div
                key={col.key}
                className={`rounded-xl border ${col.borderColor} ${col.bgColor} flex flex-col min-h-[500px]`}
              >
                {/* Column header */}
                <div
                  className={`flex items-center justify-between px-4 py-3 ${col.headerBg} rounded-t-xl border-b ${col.borderColor}`}
                >
                  <div className={`flex items-center gap-2 ${col.color}`}>
                    {col.icon}
                    <span className="text-sm font-semibold">{col.label}</span>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white ${col.color}`}
                  >
                    {orders.length}
                  </span>
                </div>

                {/* Column body */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-400px)]">
                  {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Package className="w-8 h-8 text-gray-300 mb-2" />
                      <p className="text-xs text-gray-400">
                        Sin órdenes
                      </p>
                      <p className="text-[11px] text-gray-300 mt-1">
                        {col.key === 'pending'
                          ? 'Activa producción desde un proyecto aprobado'
                          : 'No hay órdenes en este estado'}
                      </p>
                    </div>
                  ) : (
                    orders.map((order) => (
                      <div
                        key={order.id}
                        className="transition-all duration-300 ease-in-out"
                      >
                        <ProductionCard
                          order={order}
                          onAssign={
                            order.status === 'pending'
                              ? handleAssignClick
                              : undefined
                          }
                          onAdvance={handleAdvance}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Assign Modal ─────────────────────────────── */}
      <AssignModal
        open={assignModalOpen}
        orderNumber={selectedOrder?.order_number}
        onClose={() => {
          setAssignModalOpen(false);
          setSelectedOrder(null);
        }}
        onAssign={handleAssign}
      />
    </div>
  );
}
