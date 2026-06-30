"""
Endpoints de autenticación: /api/v1/auth/*
"""

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    MessageResponse,
)
from app.services.auth_service import AuthService
from app.api.dependencies.auth import get_current_user
from app.models.user import User, UserRole

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nuevo usuario",
)
async def register(
    data: UserCreate,
    db: Session = Depends(get_db),
):
    """
    Crea una cuenta nueva de usuario.

    - Valida email único, fuerza de contraseña.
    - Devuelve access token + refresh token.
    - El rol por defecto es `cliente`.
    """
    user, access_token, refresh_token = AuthService.register(
        db,
        email=data.email,
        password=data.password,
        full_name=data.full_name,
        role=data.role if data.role else UserRole.CLIENTE,
    )
    from datetime import datetime, timezone
    from app.core.config.settings import settings

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Iniciar sesión",
)
async def login(
    data: UserLogin,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Autentica al usuario con email y contraseña.

    - Devuelve access token (15 min) y refresh token (7 días).
    - Registra IP y User-Agent para auditoría.
    """
    user, access_token, refresh_token, expires_in = AuthService.login(
        db,
        email=data.email,
        password=data.password,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=expires_in,
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Obtener perfil del usuario autenticado",
)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """Devuelve los datos del usuario autenticado (requiere token Bearer)."""
    return current_user


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Solicitar restablecimiento de contraseña",
)
async def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Envía un enlace de restablecimiento al email proporcionado.

    Por seguridad, siempre devuelve éxito aunque el email no exista.
    En modo desarrollo, el token se incluye en la respuesta.
    """
    msg = AuthService.forgot_password(db, email=data.email)
    return MessageResponse(message=msg)


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Restablecer contraseña con token",
)
async def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Cambia la contraseña usando un token de restablecimiento válido.

    - El token expira en 1 hora.
    - Invalida todas las sesiones activas del usuario.
    """
    AuthService.reset_password(db, token=data.token, new_password=data.new_password)
    return MessageResponse(
        message="Contraseña restablecida correctamente.",
        detail="Todas las sesiones han sido invalidadas.",
    )
