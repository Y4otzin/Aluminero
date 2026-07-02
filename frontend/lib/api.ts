const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiError {
  detail: string;
  errors?: Record<string, string[]>;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

interface AuthResponse extends AuthTokens {
  user: User;
}

interface RegisterResponse {
  message: string;
  user: User;
}

interface ForgotPasswordResponse {
  message: string;
}

interface ResetPasswordResponse {
  message: string;
}

class ApiClientError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.errors = errors;
  }
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: 'Error de conexión con el servidor' };
    }
    throw new ApiClientError(
      errorData.detail || 'Ha ocurrido un error inesperado',
      response.status,
      errorData.errors
    );
  }

  return response.json();
}

/**
 * Iniciar sesión con email y contraseña.
 * Retorna tokens de acceso y datos del usuario.
 */
export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Registrar un nuevo usuario.
 */
export async function register(
  name: string,
  email: string,
  password: string
): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

/**
 * Solicitar recuperación de contraseña.
 * El backend envía un email con link de reseteo.
 */
export async function forgotPassword(
  email: string
): Promise<ForgotPasswordResponse> {
  return apiFetch<ForgotPasswordResponse>('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Restablecer contraseña con token de recuperación.
 */
export async function resetPassword(
  token: string,
  new_password: string
): Promise<ResetPasswordResponse> {
  return apiFetch<ResetPasswordResponse>('/api/v1/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password }),
  });
}

/**
 * Obtener datos del usuario autenticado.
 * Requiere token JWT en el header Authorization.
 */
export async function getMe(token: string): Promise<User> {
  return apiFetch<User>('/api/v1/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// ─── Tipos de Proyectos ──────────────────────────────────

interface Project {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  project_type: string;
  height_m: number;
  width_m: number;
  quantity: number;
  area_m2: number;
  notes: string;
  status: string;
  is_locked: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CreateProjectData {
  client_name: string;
  client_email: string;
  client_phone: string;
  project_type: string;
  height_m: number;
  width_m: number;
  quantity: number;
  notes?: string;
}

interface UpdateProjectData {
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  project_type?: string;
  height_m?: number;
  width_m?: number;
  quantity?: number;
  notes?: string;
}

interface WorkType {
  id: string;
  name: string;
  description?: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface ProjectFilters {
  status?: string;
  type?: string;
  search?: string;
  page?: number;
  size?: number;
}

// ─── Fetch autenticado (helper) ─────────────────────────

async function authApiFetch<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  return apiFetch<T>(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

// ─── Endpoints de Proyectos ─────────────────────────────

/**
 * Obtener lista de proyectos con filtros y paginación.
 */
export async function getProjects(
  token: string,
  filters: ProjectFilters = {}
): Promise<PaginatedResponse<Project>> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.type) params.set('type', filters.type);
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.size) params.set('size', String(filters.size));

  const query = params.toString();
  return authApiFetch<PaginatedResponse<Project>>(
    `/api/v1/projects${query ? `?${query}` : ''}`,
    token
  );
}

/**
 * Obtener un proyecto por su ID.
 */
export async function getProject(
  token: string,
  id: string
): Promise<Project> {
  return authApiFetch<Project>(`/api/v1/projects/${id}`, token);
}

/**
 * Crear un nuevo proyecto.
 */
export async function createProject(
  token: string,
  data: CreateProjectData
): Promise<Project> {
  return authApiFetch<Project>('/api/v1/projects', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Actualizar un proyecto existente.
 */
export async function updateProject(
  token: string,
  id: string,
  data: UpdateProjectData
): Promise<Project> {
  return authApiFetch<Project>(`/api/v1/projects/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Obtener catálogo de tipos de trabajo.
 */
export async function getWorkTypes(
  token: string
): Promise<WorkType[]> {
  return authApiFetch<WorkType[]>('/api/v1/work-types', token);
}

// ─── Tipos de Fotos ────────────────────────────────────

interface Photo {
  id: string;
  project_id: string;
  url: string;
  order: number;
  exif_stripped: boolean;
  created_at: string;
}

// ─── Fetch autenticado (multipart) ─────────────────────

async function authApiFetchFormData<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const config: RequestInit = {
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: 'Error de conexión con el servidor' };
    }
    throw new ApiClientError(
      errorData.detail || 'Ha ocurrido un error inesperado',
      response.status,
      errorData.errors
    );
  }

  return response.json();
}

// ─── Endpoints de Fotos ─────────────────────────────────

/**
 * Subir múltiples fotos a un proyecto.
 * Usa FormData para enviar los archivos.
 */
export async function uploadPhotos(
  token: string,
  projectId: string,
  files: File[]
): Promise<Photo[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }

  return authApiFetchFormData<Photo[]>(
    `/api/v1/projects/${projectId}/photos`,
    token,
    {
      method: 'POST',
      body: formData,
    }
  );
}

/**
 * Obtener todas las fotos de un proyecto.
 */
export async function getPhotos(
  token: string,
  projectId: string
): Promise<Photo[]> {
  return authApiFetch<Photo[]>(
    `/api/v1/projects/${projectId}/photos`,
    token
  );
}

/**
 * Reordenar fotos de un proyecto.
 * @param orderedIds Array de IDs ordenados según la nueva posición.
 */
export async function reorderPhotos(
  token: string,
  projectId: string,
  orderedIds: string[]
): Promise<{ message: string }> {
  return authApiFetch<{ message: string }>(
    `/api/v1/projects/${projectId}/photos/reorder`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({ ordered_ids: orderedIds }),
    }
  );
}

/**
 * Eliminar una foto por su ID.
 */
export async function deletePhoto(
  token: string,
  photoId: string
): Promise<{ message: string }> {
  return authApiFetch<{ message: string }>(
    `/api/v1/photos/${photoId}`,
    token,
    {
      method: 'DELETE',
    }
  );
}

// ─── Tipos de Catálogos ────────────────────────────────

type CatalogType = 'aluminum-series' | 'finishes' | 'glass-types' | 'hardware';

interface CatalogItem {
  id: string;
  name: string;
  price?: number | null;
  created_at?: string;
  updated_at?: string;
}

interface CreateCatalogItem {
  name: string;
  price?: number | null;
}

interface UpdateCatalogItem {
  name?: string;
  price?: number | null;
}

// ─── Endpoints de Catálogos ────────────────────────────

function catalogUrl(type: CatalogType): string {
  return `/api/v1/catalogs/${type}`;
}

/** Obtener todos los items de un catálogo */
async function getCatalogItems(
  token: string,
  type: CatalogType
): Promise<CatalogItem[]> {
  return authApiFetch<CatalogItem[]>(catalogUrl(type), token);
}

/** Crear un item de catálogo (solo admin) */
async function createCatalogItem(
  token: string,
  type: CatalogType,
  data: CreateCatalogItem
): Promise<CatalogItem> {
  return authApiFetch<CatalogItem>(catalogUrl(type), token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Actualizar un item de catálogo (solo admin) */
async function updateCatalogItem(
  token: string,
  type: CatalogType,
  id: string,
  data: UpdateCatalogItem
): Promise<CatalogItem> {
  return authApiFetch<CatalogItem>(`${catalogUrl(type)}/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** Eliminar un item de catálogo (solo admin) */
async function deleteCatalogItem(
  token: string,
  type: CatalogType,
  id: string
): Promise<{ message: string }> {
  return authApiFetch<{ message: string }>(`${catalogUrl(type)}/${id}`, token, {
    method: 'DELETE',
  });
}

// ─── Catálogo: Series de Aluminio ──────────────────────

export function getAluminumSeries(token: string): Promise<CatalogItem[]> {
  return getCatalogItems(token, 'aluminum-series');
}
export function createAluminumSeries(
  token: string,
  data: CreateCatalogItem
): Promise<CatalogItem> {
  return createCatalogItem(token, 'aluminum-series', data);
}
export function updateAluminumSeries(
  token: string,
  id: string,
  data: UpdateCatalogItem
): Promise<CatalogItem> {
  return updateCatalogItem(token, 'aluminum-series', id, data);
}
export function deleteAluminumSeries(
  token: string,
  id: string
): Promise<{ message: string }> {
  return deleteCatalogItem(token, 'aluminum-series', id);
}

// ─── Catálogo: Acabados ────────────────────────────────

export function getFinishes(token: string): Promise<CatalogItem[]> {
  return getCatalogItems(token, 'finishes');
}
export function createFinish(
  token: string,
  data: CreateCatalogItem
): Promise<CatalogItem> {
  return createCatalogItem(token, 'finishes', data);
}
export function updateFinish(
  token: string,
  id: string,
  data: UpdateCatalogItem
): Promise<CatalogItem> {
  return updateCatalogItem(token, 'finishes', id, data);
}
export function deleteFinish(
  token: string,
  id: string
): Promise<{ message: string }> {
  return deleteCatalogItem(token, 'finishes', id);
}

// ─── Catálogo: Tipos de Vidrio ─────────────────────────

export function getGlassTypes(token: string): Promise<CatalogItem[]> {
  return getCatalogItems(token, 'glass-types');
}
export function createGlassType(
  token: string,
  data: CreateCatalogItem
): Promise<CatalogItem> {
  return createCatalogItem(token, 'glass-types', data);
}
export function updateGlassType(
  token: string,
  id: string,
  data: UpdateCatalogItem
): Promise<CatalogItem> {
  return updateCatalogItem(token, 'glass-types', id, data);
}
export function deleteGlassType(
  token: string,
  id: string
): Promise<{ message: string }> {
  return deleteCatalogItem(token, 'glass-types', id);
}

// ─── Catálogo: Herrajes ────────────────────────────────

export function getHardware(token: string): Promise<CatalogItem[]> {
  return getCatalogItems(token, 'hardware');
}
export function createHardware(
  token: string,
  data: CreateCatalogItem
): Promise<CatalogItem> {
  return createCatalogItem(token, 'hardware', data);
}
export function updateHardware(
  token: string,
  id: string,
  data: UpdateCatalogItem
): Promise<CatalogItem> {
  return updateCatalogItem(token, 'hardware', id, data);
}
export function deleteHardware(
  token: string,
  id: string
): Promise<{ message: string }> {
  return deleteCatalogItem(token, 'hardware', id);
}

// ── Budget & Presupuestos ─────────────────────────────────

interface BudgetData {
  aluminum_series_id: string;
  finish_id: string;
  glass_type_id: string;
  hardware_ids: string[];
  height_m: number;
  width_m: number;
  quantity: number;
  discount_pct?: number;
  notes?: string;
}

interface Budget {
  id: string;
  project_id: string;
  version: number;
  aluminum_series_id: string | null;
  finish_id: string | null;
  glass_type_id: string | null;
  hardware_ids: string[];
  height_m: number;
  width_m: number;
  quantity: number;
  area_m2: number;
  material_cost: number;
  labor_cost: number;
  subtotal: number;
  tax: number;
  total: number;
  discount_pct: number;
  notes: string | null;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

interface BudgetVersionSummary {
  version: number;
  total: number;
  is_current: boolean;
  created_at: string;
}

interface LaborCost {
  id: string;
  job_type: string;
  cost_per_m2: number;
}

/** Crear o actualizar presupuesto (nueva versión) */
export async function createBudget(
  token: string,
  projectId: string,
  data: BudgetData
): Promise<Budget> {
  const resp = await fetch(`${API_URL}/api/v1/projects/${projectId}/budget`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new ApiClientError(await resp.json(), resp.status);
  return resp.json();
}

/** Obtener presupuesto actual del proyecto */
export async function getCurrentBudget(
  token: string,
  projectId: string
): Promise<Budget> {
  const resp = await fetch(`${API_URL}/api/v1/projects/${projectId}/budget`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!resp.ok) {
    if (resp.status === 404) {
      const errBody = await resp.json().catch(() => ({ detail: 'Sin presupuesto' }));
      throw new ApiClientError(errBody.detail || 'Sin presupuesto', 404);
    }
    throw new ApiClientError(await resp.json(), resp.status);
  }
  return resp.json();
}

/** Obtener versiones del presupuesto */
export async function getBudgetVersions(
  token: string,
  projectId: string
): Promise<{ versions: BudgetVersionSummary[] }> {
  const resp = await fetch(`${API_URL}/api/v1/projects/${projectId}/budget/versions`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!resp.ok) throw new ApiClientError(await resp.json(), resp.status);
  return resp.json();
}

/** Obtener una versión específica */
export async function getBudgetVersion(
  token: string,
  projectId: string,
  version: number
): Promise<Budget> {
  const resp = await fetch(`${API_URL}/api/v1/projects/${projectId}/budget/${version}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!resp.ok) throw new ApiClientError(await resp.json(), resp.status);
  return resp.json();
}

/** Establecer una versión como actual */
export async function setBudgetAsCurrent(
  token: string,
  projectId: string,
  version: number
): Promise<Budget> {
  const resp = await fetch(`${API_URL}/api/v1/projects/${projectId}/budget/${version}/set-current`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!resp.ok) throw new ApiClientError(await resp.json(), resp.status);
  return resp.json();
}

/** Obtener costos de mano de obra */
export async function getLaborCosts(token: string): Promise<LaborCost[]> {
  const resp = await fetch(`${API_URL}/api/v1/labor-costs`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!resp.ok) throw new ApiClientError(await resp.json(), resp.status);
  return resp.json();
}

// ─── Tipos de Firma Digital ─────────────────────────────

interface Signature {
  id: string;
  project_id: string;
  budget_version: number;
  signer_name?: string | null;
  signer_email?: string | null;
  signature_image?: string | null;
  signer_ip?: string | null;
  user_agent?: string | null;
  signed_at?: string | null;
  hash_sha256?: string | null;
  status: 'pending' | 'signed' | 'rejected';
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

interface SignatureRequest {
  budget_version: number;
}

interface SignData {
  signer_name: string;
  signer_email: string;
  signature_image: string; // base64
}

interface SignatureEvidence {
  id: string;
  project_id: string;
  signer_name: string;
  signer_email: string;
  signer_ip: string;
  signed_at: string;
  user_agent: string;
  hash_sha256: string;
  signature_image: string; // base64
  budget_version: number;
  project_name?: string;
  total?: number;
}

// ─── Endpoints de Firma Digital ─────────────────────────

/**
 * Solicitar firma para un proyecto (envía notificación al cliente).
 * Requiere token de autenticación.
 */
export async function requestSignature(
  token: string,
  projectId: string,
  budgetVersion: number
): Promise<Signature> {
  const resp = await fetch(`${API_URL}/api/v1/projects/${projectId}/request-signature`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ budget_version: budgetVersion } as SignatureRequest),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Error al solicitar firma' }));
    throw new ApiClientError(err.detail || 'Error al solicitar firma', resp.status);
  }
  return resp.json();
}

/**
 * Firmar digitalmente un documento (ruta pública, no requiere token).
 */
export async function sign(
  signatureId: string,
  data: SignData
): Promise<Signature> {
  const resp = await fetch(`${API_URL}/api/v1/signatures/${signatureId}/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Error al firmar' }));
    throw new ApiClientError(err.detail || 'Error al firmar', resp.status);
  }
  return resp.json();
}

/**
 * Rechazar firma digitalmente (ruta pública, no requiere token).
 */
export async function rejectSignature(signatureId: string): Promise<Signature> {
  const resp = await fetch(`${API_URL}/api/v1/signatures/${signatureId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Error al rechazar firma' }));
    throw new ApiClientError(err.detail || 'Error al rechazar firma', resp.status);
  }
  return resp.json();
}

/**
 * Obtener evidencia legal de una firma.
 */
export async function getSignatureEvidence(
  signatureId: string
): Promise<SignatureEvidence> {
  const resp = await fetch(`${API_URL}/api/v1/signatures/${signatureId}/evidence`);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Error al obtener evidencia' }));
    throw new ApiClientError(err.detail || 'Error al obtener evidencia', resp.status);
  }
  return resp.json();
}

/**
 * Obtener todas las firmas de un proyecto.
 */
export async function getProjectSignatures(
  token: string,
  projectId: string
): Promise<Signature[]> {
  const resp = await fetch(`${API_URL}/api/v1/projects/${projectId}/signatures`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Error al obtener firmas' }));
    throw new ApiClientError(err.detail || 'Error al obtener firmas', resp.status);
  }
  return resp.json();
}

// ─── Tipos de Cotización / Quote ─────────────────────────

export type QuoteStatus = 'draft' | 'generated' | 'sent' | 'signed';

export interface Quote {
  id: string;
  project_id: string;
  budget_version: number;
  folio: string;
  file_url?: string | null;
  status: QuoteStatus;
  sent_at?: string | null;
  signed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenerateQuoteResponse {
  message: string;
  quote_id: string;
  folio: string;
}

export interface SendQuoteResponse {
  message: string;
  sent_at: string;
}

// ─── Endpoints de Cotización ─────────────────────────

/**
 * Generar cotización en PDF a partir del presupuesto actual del proyecto.
 */
export async function generateQuote(
  token: string,
  projectId: string
): Promise<GenerateQuoteResponse> {
  const resp = await fetch(
    `${API_URL}/api/v1/projects/${projectId}/generate-quote`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Error al generar cotización' }));
    throw new ApiClientError(err.detail || 'Error al generar cotización', resp.status);
  }
  return resp.json();
}

/**
 * Obtener lista de cotizaciones generadas para un proyecto.
 */
export async function getQuotes(
  token: string,
  projectId: string
): Promise<Quote[]> {
  const resp = await fetch(
    `${API_URL}/api/v1/projects/${projectId}/quotes`,
    {
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Error al obtener cotizaciones' }));
    throw new ApiClientError(err.detail || 'Error al obtener cotizaciones', resp.status);
  }
  return resp.json();
}

/**
 * Obtener detalle de una cotización por su ID.
 */
export async function getQuote(
  token: string,
  quoteId: string
): Promise<Quote> {
  const resp = await fetch(
    `${API_URL}/api/v1/quotes/${quoteId}`,
    {
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Error al obtener cotización' }));
    throw new ApiClientError(err.detail || 'Error al obtener cotización', resp.status);
  }
  return resp.json();
}

/**
 * Descargar PDF de una cotización. Retorna el blob del archivo.
 */
export async function downloadQuotePdf(
  token: string,
  quoteId: string
): Promise<Blob> {
  const resp = await fetch(
    `${API_URL}/api/v1/quotes/${quoteId}/download`,
    {
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Error al descargar PDF' }));
    throw new ApiClientError(err.detail || 'Error al descargar PDF', resp.status);
  }
  return resp.blob();
}

/**
 * Enviar cotización por email al cliente.
 */
export async function sendQuoteEmail(
  token: string,
  quoteId: string,
  email?: string
): Promise<SendQuoteResponse> {
  const resp = await fetch(
    `${API_URL}/api/v1/quotes/${quoteId}/send`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(email ? { email } : {}),
    }
  );
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Error al enviar cotización' }));
    throw new ApiClientError(err.detail || 'Error al enviar cotización', resp.status);
  }
  return resp.json();
}

/**
 * Regenerar cotización (nueva versión basada en el presupuesto actual).
 */
export async function regenerateQuote(
  token: string,
  quoteId: string
): Promise<GenerateQuoteResponse> {
  const resp = await fetch(
    `${API_URL}/api/v1/quotes/${quoteId}/regenerate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Error al regenerar cotización' }));
    throw new ApiClientError(err.detail || 'Error al regenerar cotización', resp.status);
  }
  return resp.json();
}

export { ApiClientError };
export type {
  User,
  AuthTokens,
  AuthResponse,
  RegisterResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
  Project,
  CreateProjectData,
  UpdateProjectData,
  WorkType,
  PaginatedResponse,
  ProjectFilters,
  Photo,
  CatalogItem,
  CreateCatalogItem,
  UpdateCatalogItem,
  CatalogType,
  Budget,
  BudgetData,
  BudgetVersionSummary,
  LaborCost,
  Signature,
  SignatureEvidence,
  SignData,
};
