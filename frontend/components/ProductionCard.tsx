'use client';

import React from 'react';
import type { ProductionOrder, ProductionStatus } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import {
  User,
  ArrowRight,
  Calendar,
  HardHat,
} from 'lucide-react';

interface ProductionCardProps {
  order: ProductionOrder;
  onAssign?: (order: ProductionOrder) => void;
  onAdvance?: (order: ProductionOrder) => void;
}

const STATUS_STYLES: Record<
  ProductionStatus,
  { border: string; badge: string; label: string }
> = {
  pending: {
    border: 'border-l-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    label: 'Pendiente',
  },
  in_progress: {
    border: 'border-l-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    label: 'En Proceso',
  },
  completed: {
    border: 'border-l-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
    label: 'Terminado',
  },
  delivered: {
    border: 'border-l-purple-500',
    badge: 'bg-purple-100 text-purple-700',
    label: 'Entregado',
  },
};

const NEXT_STATUS: Record<ProductionStatus, ProductionStatus | null> = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: 'delivered',
  delivered: null,
};

const NEXT_LABEL: Record<ProductionStatus, string> = {
  pending: 'Iniciar',
  in_progress: 'Terminar',
  completed: 'Entregar',
  delivered: '',
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function ProductionCard({
  order,
  onAssign,
  onAdvance,
}: ProductionCardProps) {
  const styles = STATUS_STYLES[order.status];
  const nextStatus = NEXT_STATUS[order.status];
  const nextLabel = NEXT_LABEL[order.status];

  return (
    <div
      className={`
        bg-white rounded-lg border border-gray-200 border-l-4 ${styles.border}
        shadow-sm hover:shadow-md transition-all duration-200 p-4 space-y-3
      `}
    >
      {/* Order number + status badge */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-gray-900 font-mono">
          {order.order_number}
        </p>
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${styles.badge}`}
        >
          {styles.label}
        </span>
      </div>

      {/* Client name */}
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {order.project.client_name}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {order.project.project_type}
        </p>
      </div>

      {/* Date */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Calendar className="w-3.5 h-3.5" />
        <span>{formatDate(order.created_at)}</span>
      </div>

      {/* Assigned user */}
      {order.assigned_user_name ? (
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <User className="w-3.5 h-3.5 text-gray-400" />
          <span>{order.assigned_user_name}</span>
        </div>
      ) : order.status === 'pending' ? (
        <div className="flex items-center gap-1.5 text-xs text-amber-600">
          <HardHat className="w-3.5 h-3.5" />
          <span>Sin asignar</span>
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {order.status === 'pending' && onAssign && (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<User className="w-3.5 h-3.5" />}
            onClick={() => onAssign(order)}
            className="flex-1"
          >
            Asignar
          </Button>
        )}

        {nextStatus && onAdvance && (
          <Button
            variant={order.status === 'pending' ? 'primary' : 'secondary'}
            size="sm"
            leftIcon={<ArrowRight className="w-3.5 h-3.5" />}
            onClick={() => onAdvance(order)}
            className="flex-1"
            disabled={order.status === 'pending' && !order.assigned_to}
          >
            {nextLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
