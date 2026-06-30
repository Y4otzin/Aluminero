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
  notes: string | null;
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
};
