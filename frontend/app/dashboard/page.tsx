'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { getProjects } from '@/lib/api';
import type { PaginatedResponse, Project } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import {
  FolderKanban,
  ClipboardCheck,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [projectsData, setProjectsData] = useState<PaginatedResponse<Project> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !token) return;

    getProjects(token, { page: 1, size: 1 })
      .then((data) => {
        setProjectsData(data);
      })
      .catch(() => {
        // Si falla, mostramos 0 — el backend puede no tener la API lista aún
        setProjectsData(null);
      })
      .finally(() => setLoading(false));
  }, [authLoading, token]);

  const activeCount = projectsData?.total ?? 0;

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
      {/* ─── Encabezado ──────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          ¡Bienvenido{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-gray-500 mt-1">
          Panel de control de la Plataforma de Herrería Aluminio
        </p>
      </div>

      {/* ─── Tarjetas de resumen ─────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Proyectos activos */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/projects')}>
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Proyectos activos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {loading ? (
                    <span className="inline-block w-8 h-8 bg-gray-200 rounded animate-pulse" />
                  ) : (
                    activeCount
                  )}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {loading ? 'Cargando...' : `Tienes ${activeCount} proyecto${activeCount !== 1 ? 's' : ''} en total`}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#1e40af]/10 flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-[#1e40af]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pendientes de firma — placeholder hasta que el backend lo exponga */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pendientes de firma</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">—</p>
                <p className="text-sm text-gray-400 mt-1">
                  Próximamente
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* En producción — placeholder */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">En producción</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">—</p>
                <p className="text-sm text-gray-400 mt-1">
                  Próximamente
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Acceso rápido ───────────────────────────── */}
      <Card>
        <CardContent>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Acceso rápido</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => router.push('/dashboard/projects')}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-[#1e40af]/30 hover:bg-[#1e40af]/5 transition-all text-left group"
            >
              <div>
                <p className="font-medium text-gray-900">Ver proyectos</p>
                <p className="text-sm text-gray-500">Gestionar todos los proyectos</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#1e40af] transition-colors" />
            </button>
            <button
              onClick={() => router.push('/dashboard/projects/new')}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-[#1e40af]/30 hover:bg-[#1e40af]/5 transition-all text-left group"
            >
              <div>
                <p className="font-medium text-gray-900">Nuevo proyecto</p>
                <p className="text-sm text-gray-500">Crear un nuevo proyecto</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#1e40af] transition-colors" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
