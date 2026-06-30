'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  FolderKanban,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: '/dashboard/projects', label: 'Proyectos', icon: <FolderKanban className="w-5 h-5" /> },
  { href: '/dashboard/profile', label: 'Perfil', icon: <User className="w-5 h-5" /> },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Cerrar sidebar en mobile al cambiar de ruta
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const isActive = (href: string): boolean => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* ─── Overlay para mobile ────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─── Sidebar ────────────────────────────────── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto lg:flex lg:flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo / Brand */}
        <div className="flex items-center h-16 px-6 border-b border-gray-200">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl">🏗️</span>
            <span className="text-sm font-bold text-gray-900 leading-tight">
              Herrería<br />Aluminio
            </span>
          </Link>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors duration-150
                  ${
                    active
                      ? 'bg-[#1e40af]/10 text-[#1e40af]'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                {item.icon}
                <span>{item.label}</span>
                {active && (
                  <ChevronRight className="w-4 h-4 ml-auto text-[#1e40af]" />
                )}
              </Link>
            );
          })}

          {/* ─── Sección Admin ──────────────────── */}
          {user?.role === 'admin' && (
            <>
              <div className="pt-3 mb-1">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Administración
                </p>
              </div>
              <Link
                href="/dashboard/admin/catalogs"
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors duration-150
                  ${
                    isActive('/dashboard/admin/catalogs')
                      ? 'bg-[#1e40af]/10 text-[#1e40af]'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <BookOpen className="w-5 h-5" />
                <span>Catálogos</span>
                {isActive('/dashboard/admin/catalogs') && (
                  <ChevronRight className="w-4 h-4 ml-auto text-[#1e40af]" />
                )}
              </Link>
            </>
          )}
        </nav>

        {/* Footer del sidebar */}
        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-[#1e40af]/10 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-[#1e40af]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ─── Contenido principal ────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header superior */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Botón hamburguesa (mobile) */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1" />

            {/* Botón cerrar sidebar (mobile, flotante dentro del aside) */}
          </div>
        </header>

        {/* Contenido de la página */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Botón de cerrar sidebar (dentro del aside, visible solo en mobile) */}
      <button
        onClick={() => setSidebarOpen(false)}
        className="absolute top-4 right-4 p-1 rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden"
        aria-label="Cerrar menú"
        style={{ display: 'none' }}
      />
    </div>
  );
}
