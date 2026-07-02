'use client';

import React, { useState } from 'react';
import {
  FileText,
  Download,
  Send,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import type { Quote } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface QuoteListProps {
  quotes: Quote[];
  loading: boolean;
  error: string | null;
  onDownload: (quote: Quote) => void;
  onSendEmail: (quote: Quote) => void;
  onRegenerate: (quote: Quote) => void;
}

const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  generated: 'Generada',
  sent: 'Enviada',
  signed: 'Firmada',
};

const QUOTE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-300',
  generated: 'bg-blue-50 text-blue-700 border-blue-300',
  sent: 'bg-indigo-50 text-indigo-700 border-indigo-300',
  signed: 'bg-emerald-50 text-emerald-700 border-emerald-300',
};

const QUOTE_STATUS_ICONS: Record<string, React.ReactNode> = {
  draft: <AlertCircle className="w-4 h-4 text-gray-500" />,
  generated: <FileText className="w-4 h-4 text-blue-600" />,
  sent: <Send className="w-4 h-4 text-indigo-600" />,
  signed: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

const QuoteBadge: React.FC<{ status: string }> = ({ status }) => {
  const label = QUOTE_STATUS_LABELS[status] ?? status;
  const color = QUOTE_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600 border-gray-300';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}
    >
      {QUOTE_STATUS_ICONS[status] ?? <Clock className="w-3.5 h-3.5" />}
      {label}
    </span>
  );
};

const QuoteList: React.FC<QuoteListProps> = ({
  quotes,
  loading,
  error,
  onDownload,
  onSendEmail,
  onRegenerate,
}) => {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-[#1e40af] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Cargando cotizaciones...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-sm text-red-600 mb-4">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (quotes.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm font-medium text-gray-600">
              Aún no se ha generado ninguna cotización
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Usa el botón &quot;Generar PDF&quot; para crear la primera cotización a partir del presupuesto.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#1e40af]" />
          Cotizaciones generadas
          <span className="text-sm font-normal text-gray-500">
            ({quotes.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Folio
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Versión
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quotes.map((quote) => (
                <tr
                  key={quote.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="font-medium text-gray-900">
                      {quote.folio}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-gray-700">
                      v{quote.budget_version}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-gray-600 text-xs">
                      {formatDate(quote.created_at)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <QuoteBadge status={quote.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Download className="w-3.5 h-3.5" />}
                        onClick={() => onDownload(quote)}
                      >
                        Descargar
                      </Button>
                      {quote.status !== 'signed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Send className="w-3.5 h-3.5" />}
                          onClick={() => onSendEmail(quote)}
                        >
                          Enviar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                        onClick={() => onRegenerate(quote)}
                      >
                        Regenerar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

QuoteList.displayName = 'QuoteList';

export default QuoteList;
