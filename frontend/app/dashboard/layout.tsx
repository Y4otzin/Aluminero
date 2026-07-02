'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Logo from '@/components/Logo';
import {
  LayoutDashboard,
  FolderKanban,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
  BookOpen,
  Settings,
  HelpCircle,
  HardHat,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const MAIN_NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    href: '/dashboard/projects',
    label: 'Proyectos',
    icon: <FolderKanban className="w-5 h-5" />,
  },
  {
    href: '/dashboard/production',
    label: 'Producción',
    icon: <HardHat className="w-5 h-5" />,
  },
];

const SECONDARY_NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard/profile',
    label: 'Perfil',
    icon: <User className="w-5 h-5" />,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Evitar hidratación incorrecta con el avatar
  useEffect(() => {
    setMounted(true);
  }, []);

  // Cerrar sidebar en mobile al cambiar de ruta
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const isActive = (href: string): boolean => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* ─── Overlay para mobile ────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─── Sidebar ────────────────────────────────── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200
          flex flex-col
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo / Brand */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-gray-200 shrink-0">
          <Logo size="sm" linkTo="/dashboard" />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navegación principal */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Principal
          </p>
          {MAIN_NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${
                    active
                      ? 'bg-primary-50 text-primary-700 border border-primary-100'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                  }
                `}
              >
                <span
                  className={`transition-colors duration-200 ${
                    active ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {active && (
                  <ChevronRight className="w-4 h-4 text-primary-500" />
                )}
              </Link>
            );
          })}

          {/* ─── Separador: Admin ──────────────────── */}
          {user?.role === 'admin' && (
            <>
              <div className="pt-5 pb-1">
                <div className="border-t border-gray-100 mb-3" />
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Administración
                </p>
              </div>
              <Link
                href="/dashboard/admin/catalogs"
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${
                    isActive('/dashboard/admin/catalogs')
                      ? 'bg-primary-50 text-primary-700 border border-primary-100'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                  }
                `}
              >
                <span
                  className={`transition-colors duration-200 ${
                    isActive('/dashboard/admin/catalogs')
                      ? 'text-primary-600'
                      : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                </span>
                <span className="flex-1">Catálogos</span>
                {isActive('/dashboard/admin/catalogs') && (
                  <ChevronRight className="w-4 h-4 text-primary-500" />
                )}
              </Link>
            </>
          )}

          {/* ─── Separador: Cuenta ─────────────────── */}
          <div className="pt-5 pb-1">
            <div className="border-t border-gray-100 mb-3" />
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Cuenta
            </p>
          </div>
          {SECONDARY_NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${
                    active
                      ? 'bg-primary-50 text-primary-700 border border-primary-100'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                  }
                `}
              >
                <span
                  className={`transition-colors duration-200 ${
                    active ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {active && (
                  <ChevronRight className="w-4 h-4 text-primary-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer del sidebar — Avatar + Cerrar sesión */}
        <div className="p-3 border-t border-gray-200 shrink-0">
          {mounted && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              {/* Avatar redondo con iniciales */}
              <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.name || 'Usuario'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={logout}
            className="group flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 border border-transparent hover:border-red-100"
          >
            <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors duration-200" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ─── Contenido principal ────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header superior */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Botón hamburguesa (mobile) */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors duration-200"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1" />
          </div>
        </header>

        {/* Contenido de la página */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
