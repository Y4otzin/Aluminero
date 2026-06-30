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
import { UserPlus, Mail, Lock, User, AlertTriangle } from 'lucide-react';

// ─── Schema de validación ──────────────────────────────

const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(100, 'El nombre es demasiado largo'),
    email: z
      .string()
      .min(1, 'El email es obligatorio')
      .email('Ingresa un email válido'),
    password: z
      .string()
      .min(1, 'La contraseña es obligatoria')
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'La contraseña debe incluir mayúscula, minúscula y número'
      ),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

// ─── Página ────────────────────────────────────────────

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      await registerUser(data.name, data.email, data.password);
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
          <UserPlus className="w-6 h-6 text-[#1e40af]" />
        </div>
        <CardTitle as="h1">Crear cuenta</CardTitle>
        <CardDescription>
          Regístrate para comenzar a usar la plataforma
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
            label="Nombre completo"
            type="text"
            placeholder="Juan Pérez"
            autoComplete="name"
            required
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Email"
            type="email"
            placeholder="tu@empresa.com"
            autoComplete="email"
            required
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Contraseña"
            type="password"
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            required
            helperText="Debe incluir mayúscula, minúscula y número"
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            label="Confirmar contraseña"
            type="password"
            placeholder="Repite tu contraseña"
            autoComplete="new-password"
            required
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={isSubmitting}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="text-sm text-center">
        <p className="text-gray-500 w-full">
          ¿Ya tienes cuenta?{' '}
          <Link
            href="/auth/login"
            className="text-[#1e40af] hover:text-[#1e3a8a] hover:underline font-medium transition-colors"
          >
            Iniciar sesión
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
