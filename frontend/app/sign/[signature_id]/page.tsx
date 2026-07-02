'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  FileSignature,
  DollarSign,
  User,
  Mail,
} from 'lucide-react';
import { sign, rejectSignature, getSignatureEvidence } from '@/lib/api';
import type { SignatureEvidence } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import SignatureCanvas from '@/components/SignatureCanvas';

// ─── Zod schema ─────────────────────────────────────────
const signerSchema = z.object({
  signer_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  signer_email: z.string().email('Ingresa un correo electrónico válido'),
});

type SignerFormData = z.infer<typeof signerSchema>;

type SignState = 'loading' | 'form' | 'signed' | 'rejected' | 'error';

const formatCurrency = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

export default function SignPage() {
  const params = useParams();
  const signatureId = params.signature_id as string;

  // ─── States ─────────────────────────────────────────
  const [evidence, setEvidence] = useState<SignatureEvidence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signState, setSignState] = useState<SignState>('loading');
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ─── React Hook Form ─────────────────────────────────
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignerFormData>({
    resolver: zodResolver(signerSchema),
    defaultValues: {
      signer_name: '',
      signer_email: '',
    },
  });

  // ─── Cargar datos de la firma ────────────────────────
  useEffect(() => {
    if (!signatureId) return;

    setLoading(true);
    setError(null);

    getSignatureEvidence(signatureId)
      .then((data) => {
        setEvidence(data);
        // Verificar si ya fue firmada o rechazada
        // (el evidence se obtiene incluso si está pendiente, pero usamos el status de una llamada posterior)
        setSignState('form');
      })
      .catch((err) => {
        setError(err?.message || 'No se pudo cargar la información de la firma.');
      })
      .finally(() => setLoading(false));
  }, [signatureId]);

  // ─── Guardar firma del canvas ────────────────────────
  const handleSignatureSave = useCallback((base64: string) => {
    setSignatureBase64(base64);
  }, []);

  // ─── Firmar ──────────────────────────────────────────
  const onSubmitSign = async (formData: SignerFormData) => {
    if (!signatureBase64) return;
    setSubmitting(true);
    try {
      const result = await sign(signatureId, {
        signer_name: formData.signer_name,
        signer_email: formData.signer_email,
        signature_image: signatureBase64,
      });
      if (result.status === 'signed') {
        setSignState('signed');
        // Actualizar evidence con lo que devolvió
        if (result.signature_image) {
          setEvidence((prev) =>
            prev
              ? {
                  ...prev,
                  signer_name: result.signer_name ?? prev.signer_name,
                  signer_email: result.signer_email ?? prev.signer_email,
                  signature_image: result.signature_image ?? prev.signature_image,
                  hash_sha256: result.hash_sha256 ?? prev.hash_sha256,
                  signed_at: result.signed_at ?? prev.signed_at,
                }
              : prev
          );
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al firmar. Intenta de nuevo.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Rechazar ────────────────────────────────────────
  const handleReject = async () => {
    setSubmitting(true);
    try {
      await rejectSignature(signatureId);
      setSignState('rejected');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al rechazar. Intenta de nuevo.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Loading ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#1e40af] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Cargando documento para firma...</p>
        </div>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────
  if (error && !evidence) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent>
            <div className="py-8">
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-600 font-medium mb-2">Error al cargar el documento</p>
              <p className="text-sm text-gray-500 mb-6">{error}</p>
              <Button onClick={() => window.location.reload()}>Reintentar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Confirmación: Firmado ────────────────────────────
  if (signState === 'signed') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent>
            <div className="py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Firma exitosa!
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Tu firma ha sido registrada correctamente con validez legal.
              </p>
              {evidence?.signature_image && (
                <div className="inline-flex border border-gray-200 rounded-lg p-3 bg-gray-50 mb-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={evidence.signature_image}
                    alt="Firma"
                    className="h-12 w-auto"
                  />
                </div>
              )}
              {evidence?.hash_sha256 && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-left">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Hash SHA-256
                  </p>
                  <p className="text-xs font-mono text-gray-700 break-all select-all">
                    {evidence.hash_sha256}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Confirmación: Rechazado ──────────────────────────
  if (signState === 'rejected') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent>
            <div className="py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Presupuesto rechazado
              </h2>
              <p className="text-sm text-gray-500">
                Has rechazado el presupuesto. El vendedor recibirá una notificación con tu decisión.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Formulario de firma ──────────────────────────────
  const totalAmount = evidence?.total ?? 0;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header corporativo */}
      <header className="bg-[#1e40af] text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <FileSignature className="w-6 h-6" />
          <div>
            <h1 className="text-lg font-bold">Firma Digital de Presupuesto</h1>
            <p className="text-sm text-blue-200">Plataforma Aluminero</p>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Error banner */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Datos del proyecto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#1e40af]" />
              Resumen del presupuesto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {evidence?.project_name && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <dt className="text-sm text-gray-500">Proyecto</dt>
                  <dd className="text-sm font-medium text-gray-900">{evidence.project_name}</dd>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <dt className="text-sm text-gray-500">Versión del presupuesto</dt>
                <dd className="text-sm font-medium text-gray-900">
                  #{evidence?.budget_version ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between items-center py-2">
                <dt className="text-sm text-gray-500">Total</dt>
                <dd className="text-xl font-bold text-[#1e40af]">{formatCurrency(totalAmount)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Datos del firmante */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#1e40af]" />
              Datos del firmante
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Nombre completo"
              placeholder="Ingresa tu nombre completo"
              required
              {...register('signer_name')}
              error={errors.signer_name?.message}
            />
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tucorreo@ejemplo.com"
              required
              {...register('signer_email')}
              error={errors.signer_email?.message}
            />
          </CardContent>
        </Card>

        {/* Canvas de firma */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-[#1e40af]" />
              Dibuja tu firma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SignatureCanvas
              onSave={handleSignatureSave}
              savedSignature={signatureBase64}
            />
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={<CheckCircle2 className="w-5 h-5" />}
            onClick={handleSubmit(onSubmitSign)}
            isLoading={submitting}
            disabled={!signatureBase64}
          >
            Firmar y aprobar
          </Button>
          <Button
            variant="outline"
            size="lg"
            fullWidth
            leftIcon={<XCircle className="w-5 h-5" />}
            onClick={handleReject}
            isLoading={submitting}
          >
            Rechazar presupuesto
          </Button>
        </div>

        {/* Footer legal */}
        <p className="text-center text-xs text-gray-400">
          Al firmar, aceptas los términos y condiciones del presupuesto. Tu firma tiene validez
          legal conforme a la legislación aplicable en materia de firma electrónica.
        </p>
      </div>
    </div>
  );
}
