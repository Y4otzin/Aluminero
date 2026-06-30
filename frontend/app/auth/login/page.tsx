'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ApiClientError } from '@/lib/api';
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
import { LogIn, Mail, Lock, AlertTriangle } from 'lucide-react';

// ─── Schema de validación ──────────────────────────────

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es obligatorio')
    .email('Ingresa un email válido'),
  password: z
    .string()
    .min(1, 'La contraseña es obligatoria')
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ─── Página ────────────────────────────────────────────

export default function LoginPage() {
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      await login(data.email, data.password);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setServerError(error.message);
      } else {
        setServerError('Error de conexión. Verifica tu internet e intenta de nuevo.');
      }
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-[#1e40af]/10 flex items-center justify-center mb-3">
          <LogIn className="w-6 h-6 text-[#1e40af]" />
        </div>
        <CardTitle as="h1">Iniciar sesión</CardTitle>
        <CardDescription>
          Ingresa tus credenciales para acceder a la plataforma
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

          <div>
            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              error={errors.password?.message}
              {...register('password')}
            />
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={isSubmitting}
            leftIcon={<LogIn className="w-4 h-4" />}
          >
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 text-sm text-center">
        <Link
          href="/auth/forgot-password"
          className="text-[#1e40af] hover:text-[#1e3a8a] hover:underline font-medium transition-colors"
        >
          ¿Olvidaste tu contraseña?
        </Link>

        <p className="text-gray-500">
          ¿No tienes cuenta?{' '}
          <Link
            href="/auth/register"
            className="text-[#1e40af] hover:text-[#1e3a8a] hover:underline font-medium transition-colors"
          >
            Crear una cuenta
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
