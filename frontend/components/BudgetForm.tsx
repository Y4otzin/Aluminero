'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Calculator,
  DollarSign,
  ChevronDown,
  Trash2,
 Clock,
  CheckCircle2,
  History,
  X,
  Loader2,
  FileText,
  Percent,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  getAluminumSeries,
  getFinishes,
  getGlassTypes,
  getHardware,
  getLaborCosts,
  createBudget,
  getCurrentBudget,
  getBudgetVersions,
  setBudgetAsCurrent,
} from '@/lib/api';
import type {
  CatalogItem,
  Budget,
  BudgetVersionSummary,
  Project,
} from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

// ─── Zod schema ─────────────────────────────────────────
const budgetSchema = z.object({
  aluminum_series_id: z.string().min(1, 'Selecciona una serie de aluminio'),
  finish_id: z.string().min(1, 'Selecciona un acabado'),
  glass_type_id: z.string().min(1, 'Selecciona un tipo de vidrio'),
  hardware_ids: z.array(z.string()).min(1, 'Selecciona al menos un herraje'),
  height_m: z.coerce.number().positive('Debe ser mayor a 0'),
  width_m: z.coerce.number().positive('Debe ser mayor a 0'),
  quantity: z.coerce.number().int().positive('Debe ser al menos 1'),
  discount_pct: z.coerce
    .number()
    .min(0, 'Mínimo 0%')
    .max(100, 'Máximo 100%')
    .optional()
    .default(0),
  notes: z.string().optional().default(''),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

const IVA_RATE = 0.16;

// ─── Format helpers ─────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface BudgetFormProps {
  project: Project;
}

export default function BudgetForm({ project }: BudgetFormProps) {
  const { token } = useAuth();

  // ─── Catalogs state ──────────────────────────────────
  const [aluminumSeries, setAluminumSeries] = useState<CatalogItem[]>([]);
  const [finishes, setFinishes] = useState<CatalogItem[]>([]);
  const [glassTypes, setGlassTypes] = useState<CatalogItem[]>([]);
  const [hardware, setHardware] = useState<CatalogItem[]>([]);
  const [laborCosts, setLaborCosts] = useState<number | null>(null);
  const [catsLoading, setCatsLoading] = useState(true);
  const [catsError, setCatsError] = useState<string | null>(null);

  // ─── Budget state ────────────────────────────────────
  const [currentBudget, setCurrentBudget] = useState<Budget | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [calculated, setCalculated] = useState<Budget | null>(null);

  // ─── Versions state ──────────────────────────────────
  const [versions, setVersions] = useState<BudgetVersionSummary[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);

  // ─── React Hook Form ─────────────────────────────────
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      aluminum_series_id: '',
      finish_id: '',
      glass_type_id: '',
      hardware_ids: [],
      height_m: project.height_m,
      width_m: project.width_m,
      quantity: project.quantity,
      discount_pct: 0,
      notes: '',
    },
  });

  const watchedHeight = watch('height_m');
  const watchedWidth = watch('width_m');
  const watchedQty = watch('quantity');
  const watchedDiscount = watch('discount_pct');

  // ─── Load catalogs ───────────────────────────────────
  const loadCatalogs = useCallback(async () => {
    if (!token) return;
    setCatsLoading(true);
    setCatsError(null);
    try {
      const [series, fins, glass, hw, labor] = await Promise.all([
        getAluminumSeries(token),
        getFinishes(token),
        getGlassTypes(token),
        getHardware(token),
        getLaborCosts(token),
      ]);
      setAluminumSeries(series);
      setFinishes(fins);
      setGlassTypes(glass);
      setHardware(hw);
      if (labor.length > 0) {
        const avg =
          labor.reduce((sum, l) => sum + l.cost_per_m2, 0) / labor.length;
        setLaborCosts(avg);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al cargar catálogos';
      setCatsError(msg);
    } finally {
      setCatsLoading(false);
    }
  }, [token]);

  // ─── Load current budget ─────────────────────────────
  const loadBudget = useCallback(async () => {
    if (!token) return;
    setBudgetLoading(true);
    setBudgetError(null);
    try {
      const budget = await getCurrentBudget(token, project.id);
      setCurrentBudget(budget);
      setCalculated(budget);
      // Pre-fill form if budget exists
      setValue('aluminum_series_id', budget.aluminum_series_id ?? '');
      setValue('finish_id', budget.finish_id ?? '');
      setValue('glass_type_id', budget.glass_type_id ?? '');
      setValue('hardware_ids', budget.hardware_ids ?? []);
      setValue('height_m', budget.height_m);
      setValue('width_m', budget.width_m);
      setValue('quantity', budget.quantity);
      setValue('discount_pct', budget.discount_pct ?? 0);
    } catch (err: unknown) {
      if (err instanceof Error && err.message?.includes('Sin presupuesto')) {
        // No budget yet — fine
        setCurrentBudget(null);
        setCalculated(null);
      } else {
        const msg =
          err instanceof Error ? err.message : 'Error al cargar presupuesto';
        setBudgetError(msg);
      }
    } finally {
      setBudgetLoading(false);
    }
  }, [token, project.id, setValue]);

  // ─── Load versions ──────────────────────────────────
  const loadVersions = useCallback(async () => {
    if (!token) return;
    setVersionsLoading(true);
    try {
      const data = await getBudgetVersions(token, project.id);
      setVersions(data.versions ?? []);
    } catch {
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }, [token, project.id]);

  // ─── Initial load ────────────────────────────────────
  useEffect(() => {
    loadCatalogs();
    loadBudget();
  }, [loadCatalogs, loadBudget]);

  // ─── Submit ─────────────────────────────────────────
  const onSubmit = async (data: BudgetFormData) => {
    if (!token) return;
    setSaving(true);
    try {
      const result = await createBudget(token, project.id, {
        aluminum_series_id: data.aluminum_series_id,
        finish_id: data.finish_id,
        glass_type_id: data.glass_type_id,
        hardware_ids: data.hardware_ids,
        height_m: data.height_m,
        width_m: data.width_m,
        quantity: data.quantity,
        discount_pct: data.discount_pct || 0,
        notes: data.notes || undefined,
      });
      setCalculated(result);
      setCurrentBudget(result);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al guardar presupuesto';
      setBudgetError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Derived calculations (live preview) ─────────────
  const area = watchedHeight * watchedWidth * watchedQty;
  const discountDecimal = (watchedDiscount ?? 0) / 100;

  // Pick selected item prices
  const selectedSeries = aluminumSeries.find(
    (s) => s.id === watch('aluminum_series_id')
  );
  const selectedFinish = finishes.find((f) => f.id === watch('finish_id'));
  const selectedGlass = glassTypes.find((g) => g.id === watch('glass_type_id'));
  const selectedHardwareIds = watch('hardware_ids');
  const selectedHardwareItems = hardware.filter((h) =>
    selectedHardwareIds.includes(h.id)
  );

  const materialCostFromSelection =
    (selectedSeries?.price ?? 0) +
    (selectedFinish?.price ?? 0) +
    (selectedGlass?.price ?? 0) +
    selectedHardwareItems.reduce((sum, h) => sum + (h.price ?? 0), 0);

  const materialCostTotal = materialCostFromSelection * area;
  const laborCostTotal = (laborCosts ?? 0) * area;
  const subtotal = materialCostTotal + laborCostTotal;
  const discountAmount = subtotal * discountDecimal;
  const afterDiscount = subtotal - discountAmount;
  const tax = afterDiscount * IVA_RATE;
  const total = afterDiscount + tax;

  // ─── Toggle hardware checkbox ──────────────────────
  const toggleHardware = (id: string) => {
    const current = watch('hardware_ids');
    if (current.includes(id)) {
      setValue(
        'hardware_ids',
        current.filter((h) => h !== id),
        { shouldValidate: true }
      );
    } else {
      setValue('hardware_ids', [...current, id], { shouldValidate: true });
    }
  };

  // ─── Handle set version as current ───────────────────
  const handleSetCurrent = async (version: number) => {
    if (!token) return;
    try {
      await setBudgetAsCurrent(token, project.id, version);
      await loadBudget();
      await loadVersions();
    } catch {
      // silently fail
    }
  };

  // ─── Loading state ───────────────────────────────────
  if (catsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#1e40af] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Cargando catálogos...</p>
        </div>
      </div>
    );
  }

  if (catsError && !currentBudget) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 text-sm mb-4">{catsError}</p>
        <Button variant="outline" size="sm" onClick={loadCatalogs}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Error banner ──────────────────────────────── */}
      {budgetError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{budgetError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* ─── Catalog selects ──────────────────────────── */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="w-5 h-5 text-[#1e40af]" />
              Especificaciones del presupuesto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {/* Serie de aluminio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Serie de aluminio <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('aluminum_series_id')}
                  className={`w-full px-4 py-2.5 bg-white border rounded-lg text-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                    errors.aluminum_series_id
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                      : 'border-gray-300 hover:border-gray-400 focus:border-[#1e40af] focus:ring-[#1e40af]/20'
                  }`}
                >
                  <option value="">Seleccionar...</option>
                  {aluminumSeries.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.price != null ? ` ($${fmt(s.price)}/m²)` : ''}
                    </option>
                  ))}
                </select>
                {errors.aluminum_series_id && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.aluminum_series_id.message}
                  </p>
                )}
              </div>

              {/* Acabado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Acabado <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('finish_id')}
                  className={`w-full px-4 py-2.5 bg-white border rounded-lg text-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                    errors.finish_id
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                      : 'border-gray-300 hover:border-gray-400 focus:border-[#1e40af] focus:ring-[#1e40af]/20'
                  }`}
                >
                  <option value="">Seleccionar...</option>
                  {finishes.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                      {f.price != null ? ` ($${fmt(f.price)}/m²)` : ''}
                    </option>
                  ))}
                </select>
                {errors.finish_id && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.finish_id.message}
                  </p>
                )}
              </div>

              {/* Tipo de vidrio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tipo de vidrio <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('glass_type_id')}
                  className={`w-full px-4 py-2.5 bg-white border rounded-lg text-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                    errors.glass_type_id
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                      : 'border-gray-300 hover:border-gray-400 focus:border-[#1e40af] focus:ring-[#1e40af]/20'
                  }`}
                >
                  <option value="">Seleccionar...</option>
                  {glassTypes.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                      {g.price != null ? ` ($${fmt(g.price)}/m²)` : ''}
                    </option>
                  ))}
                </select>
                {errors.glass_type_id && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.glass_type_id.message}
                  </p>
                )}
              </div>
            </div>

            {/* ─── Hardware multi-select ──────────────── */}
            <div className="mt-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Herrajes <span className="text-red-500">*</span>
              </label>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {hardware.map((h) => {
                  const selected = watch('hardware_ids').includes(h.id);
                  return (
                    <label
                      key={h.id}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                        transition-all duration-150
                        ${
                          selected
                            ? 'border-[#1e40af] bg-[#1e40af]/5 ring-1 ring-[#1e40af]/20'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleHardware(h.id)}
                        className="w-4 h-4 rounded border-gray-300 text-[#1e40af] focus:ring-[#1e40af]/30"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {h.name}
                        </p>
                        {h.price != null && (
                          <p className="text-xs text-gray-500">
                            ${fmt(h.price)}/m²
                          </p>
                        )}
                      </div>
                      {selected && (
                        <CheckCircle2 className="w-4 h-4 text-[#1e40af] flex-shrink-0" />
                      )}
                    </label>
                  );
                })}
              </div>
              {errors.hardware_ids && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.hardware_ids.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ─── Dimensions card ──────────────────────────── */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="w-5 h-5 text-[#1e40af]" />
              Dimensiones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 sm:grid-cols-4">
              <Input
                label="Alto (m)"
                type="number"
                step="0.01"
                min="0.01"
                {...register('height_m')}
                error={errors.height_m?.message}
              />
              <Input
                label="Ancho (m)"
                type="number"
                step="0.01"
                min="0.01"
                {...register('width_m')}
                error={errors.width_m?.message}
              />
              <Input
                label="Cantidad"
                type="number"
                step="1"
                min="1"
                {...register('quantity')}
                error={errors.quantity?.message}
              />
              <Input
                label="Descuento (%)"
                type="number"
                step="0.5"
                min="0"
                max="100"
                {...register('discount_pct')}
                error={errors.discount_pct?.message}
              />
            </div>

            {/* Área calculada en vivo */}
            <div className="mt-4 flex items-center gap-3 p-3 bg-[#1e40af]/5 border border-[#1e40af]/20 rounded-lg">
              <div className="w-9 h-9 rounded-lg bg-[#1e40af]/10 flex items-center justify-center flex-shrink-0">
                <Calculator className="w-4 h-4 text-[#1e40af]" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Área total
                </p>
                <p className="text-lg font-bold text-[#1e40af]">
                  {isNaN(area) ? '0.00' : area.toFixed(2)} m²
                </p>
              </div>
            </div>

            {/* Notas */}
            <div className="mt-5">
              <Input
                label="Notas (opcional)"
                placeholder="Notas adicionales para el presupuesto..."
                {...register('notes')}
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── Submit ───────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            isLoading={saving}
            leftIcon={<DollarSign className="w-4 h-4" />}
          >
            {calculated ? 'Actualizar y guardar' : 'Calcular y guardar'}
          </Button>

          {(currentBudget || calculated) && (
            <Button
              type="button"
              variant="outline"
              leftIcon={<History className="w-4 h-4" />}
              onClick={() => {
                setShowVersions(true);
                loadVersions();
              }}
            >
              Ver versiones
            </Button>
          )}
        </div>
      </form>

      {/* ─── Budget result card ─────────────────────────── */}
      {calculated && (
        <Card className="border-[#1e40af]/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5 text-[#1e40af]" />
              Resumen del presupuesto
              {calculated.is_current && (
                <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">
                  <CheckCircle2 className="w-3 h-3" />
                  Actual
                </span>
              )}
              <span className="ml-auto text-xs font-normal text-gray-400">
                V{calculated.version}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-[#f8fafc] rounded-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 bg-[#1e40af] text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider opacity-80">
                      Presupuesto
                    </p>
                    <p className="text-lg font-bold mt-0.5">
                      Proyecto #{project.id.slice(0, 8)}
                    </p>
                  </div>
                  <p className="text-2xl font-bold">${fmt(calculated.total)}</p>
                </div>
              </div>

              {/* Lines */}
              <div className="px-6 py-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Área total</span>
                  <span className="font-medium text-gray-900">
                    {calculated.area_m2.toFixed(2)} m²
                  </span>
                </div>
                <div className="border-t border-gray-100" />
                <div className="flex justify-between">
                  <span className="text-gray-500">Costo de materiales</span>
                  <span className="font-medium text-gray-900">
                    ${fmt(calculated.material_cost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Mano de obra</span>
                  <span className="font-medium text-gray-900">
                    ${fmt(calculated.labor_cost)}
                  </span>
                </div>
                <div className="border-t border-gray-100" />
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium text-gray-900">
                    ${fmt(calculated.subtotal)}
                  </span>
                </div>
                {calculated.discount_pct > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5" />
                      Descuento ({calculated.discount_pct}%)
                    </span>
                    <span className="font-medium text-red-600">
                      -${fmt(calculated.subtotal * (calculated.discount_pct / 100))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal con descuento</span>
                  <span className="font-medium text-gray-900">
                    ${fmt(calculated.subtotal * (1 - calculated.discount_pct / 100))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">IVA (16%)</span>
                  <span className="font-medium text-gray-900">
                    ${fmt(calculated.tax)}
                  </span>
                </div>
                <div className="border-t-2 border-[#1e40af]" />
                <div className="flex justify-between text-base">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-[#1e40af] text-lg">
                    ${fmt(calculated.total)}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-400 flex items-center justify-between">
                <span>
                  Creado el{' '}
                  {new Date(calculated.created_at).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {calculated.notes && (
                  <span className="text-gray-500 truncate ml-4">
                    {calculated.notes}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Preview (before saving) ────────────────────── */}
      {!calculated && !isNaN(area) && area > 0 && (
        <Card className="border border-dashed border-gray-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-gray-500">
              <Calculator className="w-5 h-5" />
              Vista previa del cálculo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-[#f8fafc] rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Área total</span>
                  <span className="font-medium text-gray-900">
                    {area.toFixed(2)} m²
                  </span>
                </div>
                <div className="border-t border-gray-100" />
                <div className="flex justify-between">
                  <span className="text-gray-500">Costo de materiales</span>
                  <span className="font-medium text-gray-900">
                    ${fmt(materialCostTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Mano de obra</span>
                  <span className="font-medium text-gray-900">
                    ${fmt(laborCostTotal)}
                  </span>
                </div>
                <div className="border-t border-gray-100" />
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium text-gray-900">
                    ${fmt(subtotal)}
                  </span>
                </div>
                {discountDecimal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5" />
                      Descuento ({watchedDiscount ?? 0}%)
                    </span>
                    <span className="font-medium text-red-600">
                      -${fmt(discountAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal con descuento</span>
                  <span className="font-medium text-gray-900">
                    ${fmt(afterDiscount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">IVA (16%)</span>
                  <span className="font-medium text-gray-900">
                    ${fmt(tax)}
                  </span>
                </div>
                <div className="border-t-2 border-[#1e40af]" />
                <div className="flex justify-between text-base">
                  <span className="font-semibold text-gray-900">Total estimado</span>
                  <span className="font-bold text-[#1e40af] text-lg">
                    ${fmt(total)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Versions modal ─────────────────────────────── */}
      {showVersions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#1e40af]" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Historial de versiones
                </h3>
              </div>
              <button
                onClick={() => setShowVersions(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 max-h-80 overflow-y-auto">
              {versionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : versions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No hay versiones guardadas.
                </p>
              ) : (
                <div className="space-y-2">
                  {versions.map((v) => (
                    <div
                      key={v.version}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        v.is_current
                          ? 'border-[#1e40af] bg-[#1e40af]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                            v.is_current
                              ? 'bg-[#1e40af] text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {v.version}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Versión {v.version}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(v.created_at).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          ${fmt(v.total)}
                        </span>
                        {v.is_current ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3" />
                            Actual
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetCurrent(v.version)}
                          >
                            Activar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
              <Button variant="ghost" onClick={() => setShowVersions(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
