'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getWorkTypes, createProject, ApiClientError } from '@/lib/api';
import type { WorkType } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  ArrowLeft,
  Calculator,
  Save,
  User,
  Mail,
  Phone,
  Ruler,
  Hash,
  FileText,
  Wrench,
} from 'lucide-react';

// ─── Schema de validación ──────────────────────────

const projectSchema = z.object({
  client_name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo'),
  client_email: z
    .string()
    .email('Correo electrónico inválido'),
  client_phone: z
    .string()
    .min(8, 'El teléfono debe tener al menos 8 dígitos')
    .max(20, 'El teléfono es demasiado largo')
    .regex(/^[0-9+\-\s()]+$/, 'Formato de teléfono inválido'),
  project_type: z
    .string()
    .min(1, 'Selecciona un tipo de proyecto'),
  height_m: z
    .number({ invalid_type_error: 'Altura requerida' })
    .positive('La altura debe ser mayor a 0')
    .max(100, 'La altura no puede exceder 100 m'),
  width_m: z
    .number({ invalid_type_error: 'Ancho requerido' })
    .positive('El ancho debe ser mayor a 0')
    .max(100, 'El ancho no puede exceder 100 m'),
  quantity: z
    .number({ invalid_type_error: 'Cantidad requerida' })
    .int('Cantidad debe ser un número entero')
    .positive('La cantidad debe ser mayor a 0')
    .max(999, 'Cantidad máxima es 999'),
  notes: z
    .string()
    .max(500, 'Las notas no pueden exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
});

type ProjectFormData = z.infer<typeof projectSchema>;

export default function NewProjectPage() {
  const { token, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      client_name: '',
      client_email: '',
      client_phone: '',
      project_type: '',
      height_m: undefined as unknown as number,
      width_m: undefined as unknown as number,
      quantity: 1,
      notes: '',
    },
  });

  // ─── Cargar tipos de trabajo ─────────────────────
  useEffect(() => {
    if (!token) return;
    getWorkTypes(token)
      .then((types) => {
        setWorkTypes(types);
        if (types.length === 1) {
          setValue('project_type', types[0].name);
        }
      })
      .catch(() => setWorkTypes([]))
      .finally(() => setLoadingTypes(false));
  }, [token, setValue]);

  // ─── Watch dimensiones para área en tiempo real ──
  const heightVal = watch('height_m');
  const widthVal = watch('width_m');
  const qtyVal = watch('quantity');

  const areaM2: number | null =
    heightVal && widthVal && qtyVal
      ? heightVal * widthVal * qtyVal
      : null;

  // ─── Envío del formulario ────────────────────────
  const onSubmit = async (data: ProjectFormData) => {
    if (!token) return;
    setSubmitting(true);
    setServerError(null);

    try {
      const project = await createProject(token, {
        client_name: data.client_name,
        client_email: data.client_email,
        client_phone: data.client_phone,
        project_type: data.project_type,
        height_m: data.height_m,
        width_m: data.width_m,
        quantity: data.quantity,
        notes: data.notes || undefined,
      });
      router.push(`/dashboard/projects/${project.id}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setServerError(err.message);
        // Errores de validación por campo
        if (err.errors) {
          Object.entries(err.errors).forEach(([field, msgs]) => {
            // Intentamos mapear el campo a nuestro form
            const msg = Array.isArray(msgs) ? msgs[0] : msgs;
            console.warn(`Error backend [${field}]:`, msg);
          });
        }
      } else {
        setServerError('Error de conexión. Verifica que el servidor esté funcionando.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#1e40af] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* ─── Header ────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo proyecto</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Completa los datos del cliente y las dimensiones
          </p>
        </div>
      </div>

      {/* ─── Formulario ────────────────────────────── */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card>
          {/* Datos del cliente */}
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#1e40af]" />
              Datos del cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Nombre del cliente"
              placeholder="Ej. Juan Pérez"
              required
              error={errors.client_name?.message}
              {...register('client_name')}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="cliente@ejemplo.com"
                required
                error={errors.client_email?.message}
                {...register('client_email')}
              />
              <Input
                label="Teléfono"
                type="tel"
                placeholder="+52 55 1234 5678"
                required
                error={errors.client_phone?.message}
                {...register('client_phone')}
              />
            </div>
          </CardContent>

          {/* Detalles del proyecto */}
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[#1e40af]" />
              Detalles del proyecto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tipo de proyecto */}
            <div>
              <label
                htmlFor="project_type"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Tipo de proyecto
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <select
                id="project_type"
                disabled={loadingTypes}
                className={`
                  w-full px-4 py-2.5 bg-white border rounded-lg text-sm text-gray-900
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-offset-0
                  disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60
                  ${
                    errors.project_type
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                      : 'border-gray-300 hover:border-gray-400 focus:border-[#1e40af] focus:ring-[#1e40af]/20'
                  }
                `}
                {...register('project_type')}
              >
                <option value="">
                  {loadingTypes ? 'Cargando...' : 'Selecciona un tipo'}
                </option>
                {workTypes.map((wt) => (
                  <option key={wt.id} value={wt.name}>
                    {wt.name}
                  </option>
                ))}
              </select>
              {errors.project_type && (
                <p className="mt-1.5 text-sm text-red-600" role="alert">
                  {errors.project_type.message}
                </p>
              )}
            </div>

            {/* Dimensiones */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="height_m"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Alto (m)
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <input
                  id="height_m"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100"
                  placeholder="1.20"
                  className={`
                    w-full px-4 py-2.5 bg-white border rounded-lg text-sm text-gray-900
                    placeholder:text-gray-400 transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-offset-0
                    ${
                      errors.height_m
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                        : 'border-gray-300 hover:border-gray-400 focus:border-[#1e40af] focus:ring-[#1e40af]/20'
                    }
                  `}
                  {...register('height_m', { valueAsNumber: true })}
                />
                {errors.height_m && (
                  <p className="mt-1.5 text-sm text-red-600" role="alert">
                    {errors.height_m.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="width_m"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Ancho (m)
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <input
                  id="width_m"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100"
                  placeholder="0.80"
                  className={`
                    w-full px-4 py-2.5 bg-white border rounded-lg text-sm text-gray-900
                    placeholder:text-gray-400 transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-offset-0
                    ${
                      errors.width_m
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                        : 'border-gray-300 hover:border-gray-400 focus:border-[#1e40af] focus:ring-[#1e40af]/20'
                    }
                  `}
                  {...register('width_m', { valueAsNumber: true })}
                />
                {errors.width_m && (
                  <p className="mt-1.5 text-sm text-red-600" role="alert">
                    {errors.width_m.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="quantity"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Cantidad
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <input
                  id="quantity"
                  type="number"
                  step="1"
                  min="1"
                  max="999"
                  placeholder="1"
                  className={`
                    w-full px-4 py-2.5 bg-white border rounded-lg text-sm text-gray-900
                    placeholder:text-gray-400 transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-offset-0
                    ${
                      errors.quantity
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                        : 'border-gray-300 hover:border-gray-400 focus:border-[#1e40af] focus:ring-[#1e40af]/20'
                    }
                  `}
                  {...register('quantity', { valueAsNumber: true })}
                />
                {errors.quantity && (
                  <p className="mt-1.5 text-sm text-red-600" role="alert">
                    {errors.quantity.message}
                  </p>
                )}
              </div>
            </div>

            {/* Área calculada en tiempo real */}
            {areaM2 !== null && (
              <div className="flex items-center gap-3 p-4 bg-[#1e40af]/5 border border-[#1e40af]/20 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-[#1e40af]/10 flex items-center justify-center flex-shrink-0">
                  <Calculator className="w-5 h-5 text-[#1e40af]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Área total calculada
                  </p>
                  <p className="text-2xl font-bold text-[#1e40af]">
                    {areaM2.toFixed(2)} m²
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {heightVal.toFixed(2)} m × {widthVal.toFixed(2)} m × {qtyVal} unidad
                    {qtyVal !== 1 ? 'es' : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Notas */}
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Notas
              </label>
              <textarea
                id="notes"
                rows={3}
                maxLength={500}
                placeholder="Observaciones adicionales sobre el proyecto..."
                className={`
                  w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900
                  placeholder:text-gray-400 transition-all duration-200 resize-none
                  focus:outline-none focus:ring-2 focus:ring-offset-0
                  focus:border-[#1e40af] focus:ring-[#1e40af]/20
                  ${errors.notes ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : ''}
                `}
                {...register('notes')}
              />
              {errors.notes && (
                <p className="mt-1.5 text-sm text-red-600" role="alert">
                  {errors.notes.message}
                </p>
              )}
            </div>
          </CardContent>

          {/* Error del servidor */}
          {serverError && (
            <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{serverError}</p>
            </div>
          )}

          {/* Botones */}
          <CardFooter className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={submitting}
              leftIcon={<Save className="w-4 h-4" />}
            >
              {submitting ? 'Creando...' : 'Crear proyecto'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
