'use client';

import { useAuth } from '@/lib/auth-context';
import { LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export default function DashboardPage() {
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#1e40af] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header del dashboard */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-lg font-semibold text-gray-900">
              🏗️ Plataforma Herrería Aluminio
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <UserIcon className="w-4 h-4" />
                <span>{user?.name || user?.email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                leftIcon={<LogOut className="w-4 h-4" />}
              >
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="max-w-lg mx-auto text-center">
          <CardContent>
            <div className="py-8">
              <div className="w-16 h-16 mx-auto bg-[#1e40af]/10 rounded-full flex items-center justify-center mb-4">
                <UserIcon className="w-8 h-8 text-[#1e40af]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Bienvenido{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
              </h2>
              <p className="text-gray-500">
                Has iniciado sesión correctamente en la Plataforma de Herrería Aluminio.
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Las funcionalidades del dashboard estarán disponibles próximamente.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
