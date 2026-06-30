'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
import {
  ClipboardList,
  BarChart3,
  FileSignature,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';

const features = [
  {
    icon: ClipboardList,
    title: 'Gestión de Proyectos',
    description:
      'Administra cada proyecto desde la captura inicial hasta la entre final. Controla estados, fotos, y documentos en un solo lugar.',
    gradient: 'from-primary-500 to-primary-700',
  },
  {
    icon: BarChart3,
    title: 'Presupuestos Inteligentes',
    description:
      'Genera cotizaciones precisas al instante con cálculos automatizados de materiales, mano de obra e IVA. Márgenes garantizados.',
    gradient: 'from-accent-500 to-accent-600',
  },
  {
    icon: FileSignature,
    title: 'Firma Digital',
    description:
      'Firma electrónica con trazabilidad legal completa: IP, timestamp, user-agent. Aprobación inmediata sin papeleo ni demoras.',
    gradient: 'from-primary-600 to-primary-800',
  },
];

const steps = [
  {
    number: '01',
    title: 'Captura el Proyecto',
    description:
      'Registra los datos del cliente, dimensiones y fotografías del lugar. Todo desde una interfaz sencilla.',
    icon: ClipboardList,
  },
  {
    number: '02',
    title: 'Genera el Presupuesto',
    description:
      'El sistema calcula costos de aluminio, vidrio, herrajes y mano de obra automáticamente con IA.',
    icon: BarChart3,
  },
  {
    number: '03',
    title: 'Render y Cotización',
    description:
      'Visualiza el resultado final con renders generados por IA. Envía la cotización profesional en PDF.',
    icon: FileSignature,
  },
  {
    number: '04',
    title: 'Firma y Producción',
    description:
      'El cliente firma digitalmente y el proyecto se libera automáticamente a producción. Sin fricciones.',
    icon: ChevronRight,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* ─── Hero Section ─────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900">
        {/* Blobs decorativos */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-blob" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-400/5 rounded-full blur-3xl animate-blob animation-delay-4000" />
        </div>

        {/* Navbar */}
        <nav className="relative z-10 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 sm:h-20">
              <Logo size="md" linkTo="/" className="[&_span]:text-white" />
              <div className="flex items-center gap-4">
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-white/80 hover:text-white transition-colors duration-200"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/auth/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-primary-700 bg-white rounded-lg hover:bg-white/90 transition-all duration-200 shadow-lg shadow-black/10"
                >
                  Registrarse
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white/80 text-sm font-medium mb-8 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />
              Plataforma B2B para herrería de aluminio
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight animate-slide-up">
              Plataforma de Cotización
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-300 to-accent-400">
                y Producción
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-white/70 max-w-2xl leading-relaxed animate-slide-up animation-delay-100">
              Unifica el ciclo comercial y productivo de tu empresa. Captura
              proyectos, genera presupuestos inteligentes con IA, firma
              digitalmente y libera a producción desde una sola plataforma.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 animate-slide-up animation-delay-200">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-accent-600 rounded-xl hover:bg-accent-700 transition-all duration-200 shadow-xl shadow-accent-600/25 hover:shadow-accent-600/40"
              >
                Comenzar
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="#como-funciona"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-white/10 rounded-xl hover:bg-white/20 border border-white/20 transition-all duration-200"
              >
                Más información
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-8 border-t border-white/10 pt-12 animate-fade-in animation-delay-500">
            {[
              { value: '70%', label: 'Menos tiempo en cotización' },
              { value: '25%', label: 'Más tasa de cierre' },
              { value: '80%', label: 'Menos errores' },
              { value: '100%', label: 'Trazabilidad legal' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-white/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Curva de separación */}
        <div className="relative z-10 h-16 sm:h-24 bg-gradient-to-t from-[#f8fafc] to-transparent" />
      </section>

      {/* ─── Características ──────────────────────────── */}
      <section className="py-20 sm:py-28 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Todo lo que necesitas en una sola plataforma
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Diseñada para empresas de herrería de aluminio que buscan
              profesionalizar y acelerar su operación.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="group relative bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 hover:-translate-y-1 animate-slide-up"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div
                  className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} text-white shadow-lg mb-6 transition-transform duration-300 group-hover:scale-110`}
                >
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Cómo funciona ────────────────────────────── */}
      <section
        id="como-funciona"
        className="py-20 sm:py-28 bg-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              ¿Cómo funciona?
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Cuatro pasos sencillos para llevar tu proyecto desde la captura
              hasta la producción.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className="relative text-center animate-slide-up"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                {/* Número */}
                <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 mb-6">
                  <span className="text-2xl font-bold text-primary-700">
                    {step.number}
                  </span>
                </div>

                {/* Separador entre pasos */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-0.5 border-t-2 border-dashed border-primary-200" />
                )}

                <step.icon className="w-8 h-8 text-primary-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center animate-fade-in">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-primary-700 rounded-xl hover:bg-primary-800 transition-all duration-200 shadow-lg shadow-primary-700/25"
            >
              Comenzar ahora
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CTA Final ────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-r from-primary-700 to-primary-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Transforma tu operación hoy
          </h2>
          <p className="mt-4 text-lg text-white/70 max-w-2xl mx-auto">
            Únete a las empresas que ya professionalizan su ciclo comercial y
            productivo con Aluminero.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-primary-700 bg-white rounded-xl hover:bg-white/90 transition-all duration-200 shadow-xl"
            >
              Crear cuenta gratuita
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-white/10 rounded-xl hover:bg-white/20 border border-white/20 transition-all duration-200"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <Logo size="sm" className="[&_span]:text-white" />
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <Link
                href="#"
                className="hover:text-white transition-colors duration-200"
              >
                Términos
              </Link>
              <Link
                href="#"
                className="hover:text-white transition-colors duration-200"
              >
                Privacidad
              </Link>
              <Link
                href="#"
                className="hover:text-white transition-colors duration-200"
              >
                Contacto
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm">
            <p>
              &copy; {new Date().getFullYear()} Aluminero. Todos los derechos
              reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
