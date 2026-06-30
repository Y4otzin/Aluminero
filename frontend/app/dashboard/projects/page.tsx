'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getProjects, getWorkTypes } from '@/lib/api';
import type { Project, WorkType, PaginatedResponse } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Plus,
  Search,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'en_cotizacion', label: 'En Cotización' },
  { value: 'cotizacion_enviada', label: 'Cotización Enviada' },
  { value: 'pendiente_firma', label: 'Pendiente de Firma' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'en_produccion', label: 'En Producción' },
  { value: 'terminado', label: 'Terminado' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'rechazado', label: 'Rechazado' },
];

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function calculateArea(height: number, width: number, qty: number): string {
  const area = height * width * qty;
  return area.toFixed(2);
}

export default function ProjectsPage() {
  const { token, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // ─── Cargar tipos de trabajo ─────────────────────
  useEffect(() => {
    if (!token) return;
    getWorkTypes(token)
      .then(setWorkTypes)
      .catch(() => setWorkTypes([]));
  }, [token]);

  // ─── Cargar proyectos ────────────────────────────
  const fetchProjects = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const data: PaginatedResponse<Project> = await getProjects(token, {
        search: search || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        page,
        size: PAGE_SIZE,
      });
      setProjects(data.items);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch (err) {
      setError('No se pudieron cargar los proyectos. Verifica tu conexión.');
      setProjects([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter, typeFilter, page]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // ─── Cambio de página ────────────────────────────
  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
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
    <div className="space-y-6">
      {/* ─── Header ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-[#1e40af]" />
            Proyectos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} proyecto{total !== 1 ? 's' : ''} en total
          </p>
        </div>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => router.push('/dashboard/projects/new')}
        >
          Nuevo proyecto
        </Button>
      </div>

      {/* ─── Filtros ────────────────────────────────── */}
      <Card>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Búsqueda por nombre */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] transition-all"
              />
            </div>

            {/* Tipo de proyecto */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] transition-all"
            >
              <option value="">Todos los tipos</option>
              {workTypes.map((wt) => (
                <option key={wt.id} value={wt.name}>
                  {wt.name}
                </option>
              ))}
            </select>

            {/* Estado */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] transition-all"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* ─── Tabla de proyectos ────────────────────── */}
      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#1e40af] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Cargando proyectos...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button variant="outline" onClick={fetchProjects}>
              Reintentar
            </Button>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-16 text-center">
            <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No hay proyectos
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Crea tu primer proyecto para comenzar
            </p>
            <Button
              variant="outline"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => router.push('/dashboard/projects/new')}
            >
              Crear proyecto
            </Button>
          </div>
        ) : (
          <>
            {/* Tabla — escritorio */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Área
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {projects.map((project) => (
                    <tr
                      key={project.id}
                      onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">
                          {project.client_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {project.client_email}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">
                          {project.project_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">
                          {calculateArea(project.height_m, project.width_m, project.quantity)} m²
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={project.status} size="sm" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">
                          {formatDate(project.created_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards — mobile */}
            <div className="md:hidden divide-y divide-gray-100">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {project.client_name}
                      </p>
                      <p className="text-xs text-gray-500">{project.client_email}</p>
                    </div>
                    <StatusBadge status={project.status} size="sm" />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{project.project_type}</span>
                    <span>·</span>
                    <span>
                      {calculateArea(project.height_m, project.width_m, project.quantity)} m²
                    </span>
                    <span>·</span>
                    <span>{formatDate(project.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ─── Paginación ────────────────────── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Página {page} de {totalPages} ({total} resultados)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1}
                    className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`
                          w-9 h-9 rounded-lg text-sm font-medium transition-colors
                          ${
                            pageNum === page
                              ? 'bg-[#1e40af] text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }
                        `}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= totalPages}
                    className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Página siguiente"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
