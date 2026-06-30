import type { Metadata } from 'next';
import { Building2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Autenticación — Plataforma Herrería Aluminio',
  description: 'Inicia sesión o crea una cuenta en la plataforma',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#1e40af]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#1e40af]/3 rounded-full blur-3xl" />
      </div>

      {/* Header con logo */}
      <header className="relative z-10 flex justify-center pt-12 pb-4">
        <a href="/" className="flex items-center gap-3 group">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#1e40af] text-white shadow-md shadow-[#1e40af]/20 group-hover:shadow-lg group-hover:shadow-[#1e40af]/30 transition-shadow">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Herrería Aluminio
            </h1>
            <p className="text-xs text-gray-500 -mt-0.5">
              Plataforma de Cotización y Producción
            </p>
          </div>
        </a>
      </header>

      {/* Contenido centrado */}
      <main className="relative z-10 flex-1 flex items-start justify-center px-4 pt-4 pb-12">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-gray-400">
        <p>&copy; {new Date().getFullYear()} Plataforma Herrería Aluminio</p>
      </footer>
    </div>
  );
}
