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

export { ApiClientError };
export type { User, AuthTokens, AuthResponse, RegisterResponse, ForgotPasswordResponse, ResetPasswordResponse };
