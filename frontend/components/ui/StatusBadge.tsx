'use client';

import React from 'react';

type ProjectStatus =
  | 'borrador'
  | 'en_cotizacion'
  | 'cotizacion_enviada'
  | 'pendiente_firma'
  | 'aprobado'
  | 'en_produccion'
  | 'terminado'
  | 'entregado'
  | 'rechazado';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  borrador: {
    label: 'Borrador',
    color: 'bg-gray-100 text-gray-700 border-gray-300',
  },
  en_cotizacion: {
    label: 'En Cotización',
    color: 'bg-blue-50 text-blue-700 border-blue-300',
  },
  cotizacion_enviada: {
    label: 'Cotización Enviada',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-300',
  },
  pendiente_firma: {
    label: 'Pendiente de Firma',
    color: 'bg-amber-50 text-amber-700 border-amber-300',
  },
  aprobado: {
    label: 'Aprobado',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  },
  en_produccion: {
    label: 'En Producción',
    color: 'bg-sky-50 text-sky-700 border-sky-300',
  },
  terminado: {
    label: 'Terminado',
    color: 'bg-teal-50 text-teal-700 border-teal-300',
  },
  entregado: {
    label: 'Entregado',
    color: 'bg-green-50 text-green-700 border-green-300',
  },
  rechazado: {
    label: 'Rechazado',
    color: 'bg-red-50 text-red-700 border-red-300',
  },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = STATUS_CONFIG[status] ?? {
    label: status.replace(/_/g, ' '),
    color: 'bg-gray-100 text-gray-600 border-gray-300',
  };

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full border
        ${config.color}
        ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
      `}
      role="status"
    >
      {config.label}
    </span>
  );
};

StatusBadge.displayName = 'StatusBadge';

export { StatusBadge };
export type { StatusBadgeProps, ProjectStatus };
