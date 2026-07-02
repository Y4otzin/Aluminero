'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Send,
  Mail,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { sendQuoteEmail } from '@/lib/api';

interface SendEmailModalProps {
  quoteId: string;
  quoteFolio: string;
  defaultEmail: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
}

const SendEmailModal: React.FC<SendEmailModalProps> = ({
  quoteId,
  quoteFolio,
  defaultEmail,
  open,
  onClose,
  onSuccess,
  token,
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (open) {
      setEmail(defaultEmail);
      setResult(null);
      setSending(false);
    }
  }, [open, defaultEmail]);

  const handleSend = useCallback(async () => {
    if (!email.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await sendQuoteEmail(token, quoteId, email.trim());
      setResult({
        type: 'success',
        message: res.message || 'Cotización enviada correctamente.',
      });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al enviar la cotización.';
      setResult({ type: 'error', message: msg });
    } finally {
      setSending(false);
    }
  }, [email, token, quoteId, onSuccess, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1e40af]/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-[#1e40af]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Enviar cotización
              </h3>
              <p className="text-sm text-gray-500">{quoteFolio}</p>
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

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Correo del destinatario
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setResult(null);
                }}
                placeholder="cliente@ejemplo.com"
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl 
                  focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] 
                  outline-none transition-all"
                disabled={sending}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              El cliente recibirá el PDF de cotización adjunto.
            </p>
          </div>

          {/* Result message */}
          {result && (
            <div
              className={`flex items-start gap-3 p-4 rounded-xl border ${
                result.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              {result.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <p
                className={`text-sm ${
                  result.type === 'success'
                    ? 'text-emerald-700'
                    : 'text-red-700'
                }`}
              >
                {result.message}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={sending}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={
              sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )
            }
            onClick={handleSend}
            isLoading={sending}
            disabled={!email.trim() || sending}
          >
            {sending ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </div>
    </div>
  );
};

SendEmailModal.displayName = 'SendEmailModal';

export default SendEmailModal;
