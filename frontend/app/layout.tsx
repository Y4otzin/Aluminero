import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aluminero — Plataforma de Cotización y Producción para Herrería de Aluminio',
  description:
    'Gestiona proyectos, genera presupuestos inteligentes con IA, firma digitalmente y libera a producción desde una sola plataforma B2B.',
  keywords: [
    'herrería aluminio',
    'cotización automática',
    'presupuestos inteligentes',
    'firma digital',
    'gestión de proyectos',
    'producción',
    'aluminero',
  ],
  authors: [{ name: 'Aluminero' }],
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Aluminero — Plataforma de Cotización y Producción',
    description:
      'Unifica el ciclo comercial y productivo de tu empresa de herrería de aluminio.',
    type: 'website',
    locale: 'es_MX',
    siteName: 'Aluminero',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1e40af',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
