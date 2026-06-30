'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { forgotPassword, ApiClientError } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/Card';
import { Mail, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';

// ─── Schema de validación ──────────────────────────────

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es obligatorio')
    .email('Ingresa un email válido'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// ─── Página ────────────────────────────────────────────

export default function ForgotPasswordPage() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setServerError(null);
    try {
      await forgotPassword(data.email);
      setSubmittedEmail(data.email);
      setIsSuccess(true);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setServerError(error.message);
      } else {
        setServerError('Error de conexión. Verifica tu internet e intenta de nuevo.');
      }
    }
  };

  // ─── Vista de éxito ──────────────────────────────────

  if (isSuccess) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                ¡Te enviamos un link!
              </h2>
              <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                Revisa la bandeja de <strong>{submittedEmail}</strong>. Si el
                email está registrado, recibirás un enlace para restablecer tu
                contraseña.
              </p>
            </div>
            <div className="pt-4 space-y-2">
              <p className="text-xs text-gray-400">
                ¿No recibiste el email? Revisa tu carpeta de spam o{' '}
                <button
                  onClick={() => setIsSuccess(false)}
                  className="text-[#1e40af] hover:underline font-medium"
                >
                  intenta de nuevo
                </button>
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <Link
            href="/auth/login"
            className="flex items-center gap-1.5 text-sm text-[#1e40af] hover:text-[#1e3a8a] hover:underline font-medium transition-colors mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio de sesión
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // ─── Formulario ──────────────────────────────────────

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-[#1e40af]/10 flex items-center justify-center mb-3">
          <Mail className="w-6 h-6 text-[#1e40af]" />
        </div>
        <CardTitle as="h1">Recuperar contraseña</CardTitle>
        <CardDescription>
          Ingresa tu email y te enviaremos un enlace para restablecer tu
          contraseña
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Error del servidor */}
          {serverError && (
            <div
              className="flex items-center gap-2 p-3 text-sm bg-red-50 border border-red-200 rounded-lg text-red-700"
              role="alert"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <Input
            label="Email"
            type="email"
            placeholder="tu@empresa.com"
            autoComplete="email"
            required
            error={errors.email?.message}
            {...register('email')}
          />

          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={isSubmitting}
            leftIcon={<Mail className="w-4 h-4" />}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
          </Button>
        </form>
      </CardContent>

      <CardFooter>
        <Link
          href="/auth/login"
          className="flex items-center gap-1.5 text-sm text-[#1e40af] hover:text-[#1e3a8a] hover:underline font-medium transition-colors mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio de sesión
        </Link>
      </CardFooter>
    </Card>
  );
}
