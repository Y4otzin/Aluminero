'use client';

import { useEffect, useRef } from 'react';
import {
  X,
  Fingerprint,
  Globe,
  Clock,
  Hash,
  Monitor,
  FileCheck,
  Download,
  DollarSign,
} from 'lucide-react';
import type { SignatureEvidence } from '@/lib/api';

interface EvidenceModalProps {
  evidence: SignatureEvidence | null;
  open: boolean;
  onClose: () => void;
}

export default function EvidenceModal({ evidence, open, onClose }: EvidenceModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Cerrar con Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // Cerrar al hacer clic fuera
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!open || !evidence) return null;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('es-MX', {
        dateStyle: 'long',
        timeStyle: 'medium',
        timeZone: 'UTC',
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (n: number) =>
    n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* ─── Header tipo reporte legal ─────────────────── */}
        <div className="sticky top-0 bg-white border-b border-gray-200 rounded-t-2xl z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#1e40af]/10 flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-[#1e40af]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Evidencia Legal de Firma</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Reporte con validez jurídica — LSS / FIRMA ELECTRÓNICA
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── Contenido ─────────────────────────────────── */}
        <div className="px-6 py-5 space-y-6">
          {/* Sello de integridad */}
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Fingerprint className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">Firma válida y certificada</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                Este documento fue firmado electrónicamente con trazabilidad legal completa.
              </p>
            </div>
          </div>

          {/* Datos del firmante y proyecto */}
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Proyecto */}
            {evidence.project_name != null && (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  Proyecto
                </p>
                <p className="text-sm font-semibold text-gray-900">{evidence.project_name}</p>
                {evidence.total != null && (
                  <p className="text-xs text-gray-500 mt-1">
                    Total: <span className="font-medium text-gray-700">{formatCurrency(evidence.total)}</span>
                  </p>
                )}
              </div>
            )}

            {/* Firmante */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5" />
                Firmante
              </p>
              <p className="text-sm font-semibold text-gray-900">{evidence.signer_name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{evidence.signer_email}</p>
            </div>
          </div>

          {/* Evidencia técnica */}
          <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
            <div className="px-4 py-3 flex items-center gap-3">
              <Globe className="w-4 h-4 text-[#1e40af] flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase">Dirección IP</p>
                <p className="text-sm font-mono text-gray-900 truncate">{evidence.signer_ip}</p>
              </div>
            </div>
            <div className="px-4 py-3 flex items-center gap-3">
              <Clock className="w-4 h-4 text-[#1e40af] flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase">Timestamp (UTC)</p>
                <p className="text-sm text-gray-900">{formatDate(evidence.signed_at)}</p>
              </div>
            </div>
            <div className="px-4 py-3 flex items-center gap-3">
              <Monitor className="w-4 h-4 text-[#1e40af] flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase">User-Agent</p>
                <p className="text-xs text-gray-700 break-all line-clamp-2">{evidence.user_agent}</p>
              </div>
            </div>
            <div className="px-4 py-3 flex items-start gap-3">
              <Hash className="w-4 h-4 text-[#1e40af] flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase">Hash SHA-256</p>
                <p className="text-xs font-mono text-gray-700 break-all mt-0.5 select-all">
                  {evidence.hash_sha256}
                </p>
              </div>
            </div>
          </div>

          {/* Imagen de la firma */}
          {evidence.signature_image && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Imagen de la firma
              </p>
              <div className="inline-flex border border-gray-200 rounded-xl p-4 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={evidence.signature_image}
                  alt="Firma digital"
                  className="h-16 w-auto object-contain"
                />
              </div>
            </div>
          )}

          {/* Versión del presupuesto */}
          <div className="flex items-center gap-2 p-3 bg-[#1e40af]/5 border border-[#1e40af]/20 rounded-lg">
            <Download className="w-4 h-4 text-[#1e40af]" />
            <p className="text-sm text-gray-700">
              Presupuesto versión <span className="font-semibold text-gray-900">#{evidence.budget_version}</span>
            </p>
          </div>

          {/* Disclaimer legal */}
          <div className="text-xs text-gray-400 italic border-t border-gray-100 pt-4">
            Este reporte constituye evidencia digital de la firma electrónica realizada. Los datos
            fueron capturados en el momento exacto de la transacción y no pueden ser modificados
            posteriormente. Validez conforme a la legislación aplicable en materia de firma
            electrónica.
          </div>
        </div>
      </div>
    </div>
  );
}
