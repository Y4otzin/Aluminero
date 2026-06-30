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
import Logo from '@/components/Logo';
import {
  UserPlus,
  Mail,
  Lock,
  User,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

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
        setServerError(
          'Error de conexión. Verifica tu internet e intenta de nuevo.'
        );
      }
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50 flex items-center justify-center p-4 overflow-hidden">
      {/* Blobs decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary-100/40 rounded-full blur-3xl animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-accent-100/30 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-50/50 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="relative w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8 animate-slide-up">
          <Logo size="lg" className="justify-center" />
        </div>

        <Card
          padding="lg"
          className="shadow-xl shadow-primary-900/5 border-gray-200/80 animate-slide-up animation-delay-100"
        >
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center mb-4 shadow-lg shadow-accent-500/25">
              <UserPlus className="w-7 h-7 text-white" />
            </div>
            <CardTitle as="h1" className="text-2xl font-bold">
              Crear cuenta
            </CardTitle>
            <CardDescription className="text-base">
              Regístrate para comenzar a usar la plataforma
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="space-y-5"
            >
              {/* Error del servidor */}
              {serverError && (
                <div
                  className="flex items-center gap-2.5 p-3.5 text-sm bg-red-50 border border-red-200 rounded-xl text-red-700"
                  role="alert"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              <div className="relative">
                <Input
                  label="Nombre completo"
                  type="text"
                  placeholder="Juan Pérez"
                  autoComplete="name"
                  required
                  error={errors.name?.message}
                  {...register('name')}
                />
                <User className="absolute left-3 top-[38px] w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <div className="relative">
                <Input
                  label="Email corporativo"
                  type="email"
                  placeholder="tu@empresa.com"
                  autoComplete="email"
                  required
                  error={errors.email?.message}
                  {...register('email')}
                />
                <Mail className="absolute left-3 top-[38px] w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <div className="relative">
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
                <Lock className="absolute left-3 top-[38px] w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <div className="relative">
                <Input
                  label="Confirmar contraseña"
                  type="password"
                  placeholder="Repite tu contraseña"
                  autoComplete="new-password"
                  required
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />
                <Lock className="absolute left-3 top-[38px] w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <Button
                type="submit"
                fullWidth
                size="lg"
                isLoading={isSubmitting}
                leftIcon={
                  isSubmitting ? undefined : <UserPlus className="w-4 h-4" />
                }
              >
                {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 text-sm text-center">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-gray-400">
                  ¿Ya tienes cuenta?
                </span>
              </div>
            </div>

            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-primary-700 bg-primary-50 border border-primary-200 rounded-xl hover:bg-primary-100 transition-all duration-200"
            >
              Iniciar sesión
              <ArrowRight className="w-4 h-4" />
            </Link>
          </CardFooter>
        </Card>

        <p className="mt-6 text-center text-xs text-gray-400 animate-fade-in animation-delay-300">
          &copy; {new Date().getFullYear()} Aluminero. Todos los derechos
          reservados.
        </p>
      </div>
    </div>
  );
}
