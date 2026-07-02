'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getProject, getPhotos, uploadPhotos, deletePhoto, getProjectSignatures, requestSignature, getSignatureEvidence, generateQuote, getQuotes, downloadQuotePdf, sendQuoteEmail, regenerateQuote, triggerProduction, getProductionOrder, getProductionEvents } from '@/lib/api';
import type { Project, Photo, Quote, ProductionOrder, ProductionEvent } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import PhotoUploader from '@/components/PhotoUploader';
import PhotoGallery from '@/components/PhotoGallery';
import BudgetForm from '@/components/BudgetForm';
import SketchViewer from '@/components/SketchViewer';
import EvidenceModal from '@/components/EvidenceModal';
import QuoteList from '@/components/QuoteList';
import SendEmailModal from '@/components/SendEmailModal';
import {
  ArrowLeft,
  Edit,
  Calculator,
  Mail,
  Phone,
  Calendar,
  Wrench,
  Ruler,
  Hash,
  FileText,
  Lock,
  User,
  Camera,
  ImageIcon,
  DollarSign,
  Palette,
  FileSignature,
  Copy,
  ExternalLink,
  CheckCircle2,
  XCircle,
  HardHat,
  PlayCircle,
  Clock,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';

type TabId = 'details' | 'budget' | 'photos' | 'sketch' | 'signature' | 'quote' | 'production';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  showIf?: (project: Project) => boolean;
}

const TABS: Tab[] = [
  {
    id: 'details',
    label: 'Detalles',
    icon: <FileText className="w-4 h-4" />,
  },
  {
    id: 'budget',
    label: 'Presupuesto',
    icon: <DollarSign className="w-4 h-4" />,
  },
  {
    id: 'sketch',
    label: 'Boceto',
    icon: <Palette className="w-4 h-4" />,
  },
  {
    id: 'photos',
    label: 'Fotos',
    icon: <Camera className="w-4 h-4" />,
  },
  {
    id: 'signature',
    label: 'Firma',
    icon: <FileSignature className="w-4 h-4" />,
  },
  {
    id: 'quote',
    label: 'Cotización',
    icon: <FileText className="w-4 h-4" />,
  },
  {
    id: 'production',
    label: 'Producción',
    icon: <HardHat className="w-4 h-4" />,
    showIf: (p: Project) =>
      p.status === 'aprobado' || p.status === 'en_produccion' || p.status === 'terminado' || p.status === 'entregado',
  },
];

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const id = params.id as string;

  // ─── Tab state ───────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>('details');

  // ─── Project state ───────────────────────────────────
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Photos state ────────────────────────────────────
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosError, setPhotosError] = useState<string | null>(null);

  // ─── Signature state ─────────────────────────────────
  const [signatures, setSignatures] = useState<any[]>([]);
  const [signaturesLoading, setSignaturesLoading] = useState(false);
  const [signaturesError, setSignaturesError] = useState<string | null>(null);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [evidenceData, setEvidenceData] = useState<any>(null);
  const [signatureLinkCopied, setSignatureLinkCopied] = useState(false);

  // ─── Quote state ──────────────────────────────────────
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState<string | null>(null);
  const [quoteGenerating, setQuoteGenerating] = useState(false);
  const [sendEmailModalOpen, setSendEmailModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  // ─── Production state ─────────────────────────────────
  const [productionOrder, setProductionOrder] = useState<ProductionOrder | null>(null);
  const [productionEvents, setProductionEvents] = useState<ProductionEvent[]>([]);
  const [productionLoading, setProductionLoading] = useState(false);
  const [productionError, setProductionError] = useState<string | null>(null);
  const [activatingProduction, setActivatingProduction] = useState(false);

  // ─── Load project ────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    getProject(token, id)
      .then((data) => {
        setProject(data);
      })
      .catch((err) => {
        setError(err?.message || 'No se pudo cargar el proyecto.');
      })
      .finally(() => setLoading(false));
  }, [token, id]);

  // ─── Load photos (only when photos tab is active) ────
  const loadPhotos = useCallback(async () => {
    if (!token) return;
    setPhotosLoading(true);
    setPhotosError(null);
    try {
      const data = await getPhotos(token, id);
      setPhotos(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al cargar las fotos.';
      setPhotosError(msg);
    } finally {
      setPhotosLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    if (activeTab === 'photos') {
      loadPhotos();
    }
  }, [activeTab, loadPhotos]);

  // ─── Load signatures (only when signature tab is active)
  const loadSignatures = useCallback(async () => {
    if (!token) return;
    setSignaturesLoading(true);
    setSignaturesError(null);
    try {
      const data = await getProjectSignatures(token, id);
      setSignatures(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al cargar firmas.';
      setSignaturesError(msg);
    } finally {
      setSignaturesLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    if (activeTab === 'signature') {
      loadSignatures();
    }
  }, [activeTab, loadSignatures]);

  // ─── Photo upload handler ────────────────────────────
  const handleUpload = useCallback(
    async (files: File[]) => {
      if (!token) throw new Error('No autenticado');
      await uploadPhotos(token, id, files);
      // Refresh gallery after upload
      await loadPhotos();
    },
    [token, id, loadPhotos]
  );

  // ─── Photo delete handler ────────────────────────────
  const handleDeletePhoto = useCallback(
    async (photoId: string) => {
      if (!token) return;
      try {
        await deletePhoto(token, photoId);
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Error al eliminar la foto.';
        setPhotosError(msg);
      }
    },
    [token]
  );

  // ─── Signature handlers ──────────────────────────────
  const handleRequestSignature = useCallback(async () => {
    if (!token || !project) return;
    try {
      const sig = await requestSignature(token, id, 1);
      setSignatures((prev) => [...prev, sig]);
      await loadSignatures();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al solicitar firma.';
      setSignaturesError(msg);
    }
  }, [token, project, id, loadSignatures]);

  // ─── Production handlers ──────────────────────────────
  const loadProduction = useCallback(async () => {
    if (!token) return;
    setProductionLoading(true);
    setProductionError(null);
    try {
      // Try to find production order for this project
      // First attempt: getProductionOrder if we have the order id
      // Backend should support finding by project
      const data = await getProductionOrder(token, id);
      setProductionOrder(data);
      // Load events
      const events = await getProductionEvents(token, data.id);
      setProductionEvents(events);
    } catch (err: unknown) {
      // 404 means no production order yet — that's fine
      const errObj = err as { status?: number; message?: string };
      if (errObj?.status !== 404) {
        const msg =
          err instanceof Error ? err.message : 'Error al cargar producción.';
        setProductionError(msg);
      }
      setProductionOrder(null);
      setProductionEvents([]);
    } finally {
      setProductionLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    if (activeTab === 'production') {
      loadProduction();
    }
  }, [activeTab, loadProduction]);

  const handleTriggerProduction = useCallback(async () => {
    if (!token) return;
    setActivatingProduction(true);
    setProductionError(null);
    try {
      const order = await triggerProduction(token, id);
      setProductionOrder(order);
      setProductionEvents([]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al activar producción.';
      setProductionError(msg);
    } finally {
      setActivatingProduction(false);
    }
  }, [token, id]);

  const handleCopySignatureLink = useCallback(
    (signatureId: string) => {
      const url = `${window.location.origin}/sign/${signatureId}`;
      navigator.clipboard.writeText(url).then(() => {
        setSignatureLinkCopied(true);
        setTimeout(() => setSignatureLinkCopied(false), 2500);
      });
    },
    []
  );

  const handleViewEvidence = useCallback(
    async (signatureId: string) => {
      try {
        const evidence = await getSignatureEvidence(signatureId);
        setEvidenceData(evidence);
        setEvidenceModalOpen(true);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Error al cargar evidencia.';
        setSignaturesError(msg);
      }
    },
    []
  );

  // ─── Quote handlers ─────────────────────────────────
  const loadQuotes = useCallback(async () => {
    if (!token) return;
    setQuotesLoading(true);
    setQuotesError(null);
    try {
      const data = await getQuotes(token, id);
      setQuotes(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al cargar cotizaciones.';
      setQuotesError(msg);
    } finally {
      setQuotesLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    if (activeTab === 'quote') {
      loadQuotes();
    }
  }, [activeTab, loadQuotes]);

  const handleGenerateQuote = useCallback(async () => {
    if (!token) return;
    setQuoteGenerating(true);
    try {
      await generateQuote(token, id);
      await loadQuotes();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al generar cotización.';
      setQuotesError(msg);
    } finally {
      setQuoteGenerating(false);
    }
  }, [token, id, loadQuotes]);

  const handleDownloadQuote = useCallback(
    async (quote: Quote) => {
      if (!token) return;
      try {
        const blob = await downloadQuotePdf(token, quote.id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${quote.folio}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Error al descargar PDF.';
        setQuotesError(msg);
      }
    },
    [token]
  );

  const handleSendEmailClick = useCallback((quote: Quote) => {
    setSelectedQuote(quote);
    setSendEmailModalOpen(true);
  }, []);

  const handleSendEmailSuccess = useCallback(() => {
    setSendEmailModalOpen(false);
    setSelectedQuote(null);
    loadQuotes();
  }, [loadQuotes]);

  const handleRegenerateQuote = useCallback(
    async (quote: Quote) => {
      if (!token) return;
      try {
        await regenerateQuote(token, quote.id);
        await loadQuotes();
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Error al regenerar cotización.';
        setQuotesError(msg);
      }
    },
    [token, loadQuotes]
  );

  // ─── Loading state ───────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#1e40af] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">
            {authLoading ? 'Verificando sesión...' : 'Cargando proyecto...'}
          </p>
        </div>
      </div>
    );
  }

  // ─── Error state ─────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <Card className="max-w-lg mx-auto text-center">
          <CardContent>
            <div className="py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => router.back()}>
                  Volver
                </Button>
                <Button
                  onClick={() => {
                    setLoading(true);
                    setError(null);
                    getProject(token!, id)
                      .then(setProject)
                      .catch((err) =>
                        setError(err?.message || 'Error al cargar.')
                      )
                      .finally(() => setLoading(false));
                  }}
                >
                  Reintentar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) return null;

  const areaM2 = calculateArea(project.height_m, project.width_m, project.quantity);
  const photoCount = photos.length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* ─── Header ────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => router.push('/dashboard/projects')}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Volver a proyectos"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {project.client_name}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Proyecto #{project.id.slice(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <StatusBadge status={project.status} />
          {!project.is_locked && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Edit className="w-4 h-4" />}
              onClick={() =>
                router.push(`/dashboard/projects/${project.id}/edit`)
              }
            >
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* ─── Indicador de bloqueo ──────────────────── */}
      {project.is_locked && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Proyecto bloqueado
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Este proyecto ya fue firmado y no se puede modificar.
            </p>
          </div>
        </div>
      )}

      {/* ─── Tabs ──────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {TABS.filter((tab) => !tab.showIf || tab.showIf(project)).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                transition-all duration-200
                ${
                  isActive
                    ? 'bg-white text-[#1e40af] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.id === 'photos' && photoCount > 0 && (
                <span className={`
                  inline-flex items-center justify-center min-w-[20px] h-5 px-1.5
                  rounded-full text-[11px] font-semibold
                  ${isActive ? 'bg-[#1e40af] text-white' : 'bg-gray-200 text-gray-600'}
                `}>
                  {photoCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Tab: Detalles ─────────────────────────── */}
      {activeTab === 'details' && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Columna izquierda: datos principales */}
          <div className="lg:col-span-2 space-y-6">
            {/* Datos del cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-[#1e40af]" />
                  Datos del cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Nombre
                    </dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {project.client_name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      Correo
                    </dt>
                    <dd className="text-sm text-gray-700">
                      <a
                        href={`mailto:${project.client_email}`}
                        className="hover:text-[#1e40af] transition-colors"
                      >
                        {project.client_email}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      Teléfono
                    </dt>
                    <dd className="text-sm text-gray-700">
                      <a
                        href={`tel:${project.client_phone}`}
                        className="hover:text-[#1e40af] transition-colors"
                      >
                        {project.client_phone}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Creado
                    </dt>
                    <dd className="text-sm text-gray-700">
                      {formatDate(project.created_at)}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Detalles del proyecto */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-[#1e40af]" />
                  Detalles del proyecto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Tipo de proyecto
                    </dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {project.project_type}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Cantidad
                    </dt>
                    <dd className="text-sm text-gray-700 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-gray-400" />
                      {project.quantity} unidad{project.quantity !== 1 ? 'es' : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Alto
                    </dt>
                    <dd className="text-sm text-gray-700">
                      {project.height_m.toFixed(2)} m
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Ancho
                    </dt>
                    <dd className="text-sm text-gray-700">
                      {project.width_m.toFixed(2)} m
                    </dd>
                  </div>
                </dl>

                {/* Área calculada */}
                <div className="mt-6 flex items-center gap-3 p-4 bg-[#1e40af]/5 border border-[#1e40af]/20 rounded-lg">
                  <div className="w-10 h-10 rounded-lg bg-[#1e40af]/10 flex items-center justify-center flex-shrink-0">
                    <Calculator className="w-5 h-5 text-[#1e40af]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Área total
                    </p>
                    <p className="text-2xl font-bold text-[#1e40af]">
                      {areaM2} m²
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {project.height_m.toFixed(2)} m × {project.width_m.toFixed(2)} m ×{' '}
                      {project.quantity} unidad{project.quantity !== 1 ? 'es' : ''}
                    </p>
                  </div>
                </div>

                {project.notes && (
                  <div className="mt-6">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Notas
                    </dt>
                    <dd className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap">
                      {project.notes}
                    </dd>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Columna derecha: metadata */}
          <div className="space-y-4">
            {/* Estado */}
            <Card>
              <CardContent className="py-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Estado actual
                </p>
                <StatusBadge status={project.status} />
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardContent className="py-4">
                <dl className="space-y-3">
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID del proyecto
                    </dt>
                    <dd className="text-sm text-gray-700 font-mono mt-0.5 break-all">
                      {project.id}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Última actualización
                    </dt>
                    <dd className="text-sm text-gray-700 mt-0.5">
                      {formatDate(project.updated_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bloqueado
                    </dt>
                    <dd className="text-sm text-gray-700 mt-0.5 flex items-center gap-1.5">
                      {project.is_locked ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-amber-600" />
                          <span className="text-amber-700 font-medium">Sí</span>
                        </>
                      ) : (
                        <span className="text-gray-500">No</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fotos
                    </dt>
                    <dd className="text-sm text-gray-700 mt-0.5 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                      <span>{photoCount} foto{photoCount !== 1 ? 's' : ''}</span>
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─── Tab: Fotos ────────────────────────────── */}
      {activeTab === 'photos' && (
        <div className="space-y-6">
          {/* Upload section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#1e40af]" />
                Subir fotos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoUploader
                onUpload={handleUpload}
                isLocked={project.is_locked}
              />
            </CardContent>
          </Card>

          {/* Gallery section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#1e40af]" />
                Galería
                {photoCount > 0 && (
                  <span className="text-sm font-normal text-gray-500">
                    ({photoCount} foto{photoCount !== 1 ? 's' : ''})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {photosLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-[#1e40af] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : photosError ? (
                <div className="text-center py-8">
                  <p className="text-red-600 text-sm mb-4">{photosError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadPhotos}
                  >
                    Reintentar
                  </Button>
                </div>
              ) : (
                <PhotoGallery
                  photos={photos}
                  onDelete={handleDeletePhoto}
                  isLocked={project.is_locked}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Tab: Presupuesto ────────────────────────── */}
      {activeTab === 'budget' && <BudgetForm project={project} />}
      {activeTab === 'sketch' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#1e40af]" />
                Boceto del diseño
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Vista preliminar del diseño generada automáticamente a partir de las dimensiones del proyecto. Sin dependencia de APIs externas.
              </p>
              <SketchViewer
                canvasState={[
                  { type: 'rect', x: 10, y: 10, width: 300, height: 200, stroke: '#1e40af', fill: '#e0e7ff', roughness: 2 },
                  { type: 'line', x1: 10, y1: 210, x2: 310, y2: 210, stroke: '#374151', stroke_width: 2, roughness: 2 },
                  { type: 'text', x: 20, y: 240, text: `Proyecto: ${project.client_name}`, stroke: '#374151', stroke_width: 1 },
                  { type: 'text', x: 20, y: 260, text: `${project.width_m} m × ${project.height_m} m × ${project.quantity} uds = ${(project.width_m * project.height_m * project.quantity).toFixed(2)} m²`, stroke: '#6b7280', stroke_width: 0.5 },
                ]}
                width={500}
                height={400}
                style="hand-drawn"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Tab: Cotización ─────────────────────────── */}
      {activeTab === 'quote' && (
        <div className="space-y-6">
          {/* Generar PDF button */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#1e40af]" />
                Generar cotización
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-[#1e40af]/5 border border-[#1e40af]/20 rounded-lg">
                <p className="text-sm text-gray-700 mb-3">
                  Genera un PDF de cotización profesional a partir del presupuesto actual del proyecto.
                  El PDF incluirá datos del cliente, especificaciones técnicas, desglose de costos y condiciones comerciales.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={
                    quoteGenerating ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )
                  }
                  onClick={handleGenerateQuote}
                  isLoading={quoteGenerating}
                  disabled={quoteGenerating}
                >
                  {quoteGenerating ? 'Generando...' : 'Generar PDF'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quote list */}
          <QuoteList
            quotes={quotes}
            loading={quotesLoading}
            error={quotesError}
            onDownload={handleDownloadQuote}
            onSendEmail={handleSendEmailClick}
            onRegenerate={handleRegenerateQuote}
          />
        </div>
      )}

      {/* ─── Tab: Firma Digital ─────────────────────── */}
      {activeTab === 'signature' && (
        <div className="space-y-6">
          {/* Error banner */}
          {signaturesError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700">{signaturesError}</p>
            </div>
          )}

          {/* Estado del proyecto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-[#1e40af]" />
                Estado de Firma Digital
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Estado del proyecto</span>
                  <StatusBadge status={project.status} size="sm" />
                </div>

                {/* Botón solicitar firma (solo en_cotizacion) */}
                {project.status === 'en_cotizacion' && !project.is_locked && (
                  <div className="p-4 bg-[#1e40af]/5 border border-[#1e40af]/20 rounded-lg">
                    <p className="text-sm text-gray-700 mb-3">
                      El proyecto está listo para solicitar la firma del cliente. Se
                      enviará un enlace de firma digital al correo del cliente.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<FileSignature className="w-4 h-4" />}
                      onClick={handleRequestSignature}
                    >
                      Solicitar firma
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lista de firmas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-[#1e40af]" />
                Firmas registradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {signaturesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-[#1e40af] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : signatures.length === 0 ? (
                <div className="text-center py-8">
                  <FileSignature className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    No hay solicitudes de firma aún.
                  </p>
                  {project.status === 'en_cotizacion' && (
                    <p className="text-xs text-gray-400 mt-1">
                      Usa el botón &quot;Solicitar firma&quot; para iniciar el proceso.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {signatures.map((sig) => (
                    <div
                      key={sig.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          {sig.status === 'signed' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          ) : sig.status === 'rejected' ? (
                            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                          ) : (
                            <FileSignature className="w-5 h-5 text-amber-500 flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {sig.status === 'signed'
                              ? 'Aprobado'
                              : sig.status === 'rejected'
                                ? 'Rechazado'
                                : 'Pendiente de firma'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 ml-8">
                          {sig.signer_name
                            ? `Firmado por: ${sig.signer_name}`
                            : `Solicitado: ${new Date(sig.created_at).toLocaleDateString('es-MX')}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        {/* Copiar link si está pendiente */}
                        {sig.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={
                              signatureLinkCopied ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )
                            }
                            onClick={() => handleCopySignatureLink(sig.id)}
                          >
                            {signatureLinkCopied ? '¡Copiado!' : 'Copiar link'}
                          </Button>
                        )}

                        {/* Ver evidencia si está firmado */}
                        {(sig.status === 'signed' || sig.status === 'rejected') && (
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<ExternalLink className="w-4 h-4" />}
                            onClick={() => handleViewEvidence(sig.id)}
                          >
                            Ver evidencia
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Tab: Producción ──────────────────────────── */}
      {activeTab === 'production' && (
        <div className="space-y-6">
          {/* Error banner */}
          {productionError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700">{productionError}</p>
            </div>
          )}

          {/* Loading */}
          {productionLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-[#1e40af] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500">Cargando producción...</p>
              </div>
            </div>
          )}

          {!productionLoading && !productionOrder && (
            /* ─── No production order — show trigger button ─── */
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardHat className="w-5 h-5 text-[#1e40af]" />
                  Activar producción
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-6 bg-[#1e40af]/5 border border-[#1e40af]/20 rounded-xl text-center">
                  <HardHat className="w-12 h-12 text-[#1e40af]/40 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Proyecto aprobado — listo para producción
                  </h3>
                  <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                    El proyecto ha sido aprobado. Activa la producción para generar
                    la orden de trabajo y comenzar el proceso de fabricación.
                  </p>
                  <Button
                    variant="primary"
                    size="lg"
                    leftIcon={
                      activatingProduction ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <PlayCircle className="w-5 h-5" />
                      )
                    }
                    onClick={handleTriggerProduction}
                    isLoading={activatingProduction}
                    disabled={activatingProduction}
                  >
                    {activatingProduction
                      ? 'Activando...'
                      : 'Activar producción'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!productionLoading && productionOrder && (
            <>
              {/* ─── Production order details ─────────────── */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardHat className="w-5 h-5 text-[#1e40af]" />
                    Orden de producción
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        N° Orden
                      </p>
                      <p className="text-sm font-bold text-gray-900 font-mono">
                        {productionOrder.order_number}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Estado
                      </p>
                      <StatusBadge
                        status={
                          productionOrder.status === 'pending'
                            ? 'Pendiente'
                            : productionOrder.status === 'in_progress'
                              ? 'En Proceso'
                              : productionOrder.status === 'completed'
                                ? 'Terminado'
                                : 'Entregado'
                        }
                        size="sm"
                      />
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Asignado a
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {productionOrder.assigned_user_name || (
                          <span className="text-amber-600">Sin asignar</span>
                        )}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Fecha de creación
                      </p>
                      <p className="text-sm text-gray-700">
                        {new Date(productionOrder.created_at).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ─── Timeline de eventos ────────────────── */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#1e40af]" />
                    Timeline de eventos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {productionEvents.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">
                        No hay eventos registrados aún.
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Los eventos aparecerán a medida que avance la producción.
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />

                      <div className="space-y-6">
                        {productionEvents.map((event) => (
                          <div
                            key={event.id}
                            className="relative flex items-start gap-4"
                          >
                            {/* Timeline dot */}
                            <div className="relative z-10 flex-shrink-0">
                              <div className="w-6 h-6 rounded-full bg-[#1e40af] flex items-center justify-center">
                                {event.event_type === 'assigned' ? (
                                  <UserCheck className="w-3.5 h-3.5 text-white" />
                                ) : event.event_type === 'status_change' ? (
                                  <ArrowLeft className="w-3.5 h-3.5 text-white rotate-90" />
                                ) : (
                                  <AlertTriangle className="w-3.5 h-3.5 text-white" />
                                )}
                              </div>
                            </div>

                            {/* Event content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-gray-900">
                                  {event.description}
                                </p>
                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                  {new Date(event.created_at).toLocaleDateString(
                                    'es-MX',
                                    {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    }
                                  )}
                                </span>
                              </div>
                              {event.user_name && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  por {event.user_name}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ─── Evidence Modal ───────────────────────────── */}
      <EvidenceModal
        evidence={evidenceData}
        open={evidenceModalOpen}
        onClose={() => setEvidenceModalOpen(false)}
      />

      {/* ─── Send Email Modal ──────────────────────────── */}
      {selectedQuote && (
        <SendEmailModal
          quoteId={selectedQuote.id}
          quoteFolio={selectedQuote.folio}
          defaultEmail={project?.client_email || ''}
          open={sendEmailModalOpen}
          onClose={() => {
            setSendEmailModalOpen(false);
            setSelectedQuote(null);
          }}
          onSuccess={handleSendEmailSuccess}
          token={token!}
        />
      )}
    </div>
  );
}
