"""
Esquemas Pydantic para autenticación y usuarios.

Todos los esquemas de entrada validan email con email-validator.
"""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
from app.models.user import UserRole
import re


# ── Entrada ──────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    """Registro de nuevo usuario."""
    email: EmailStr
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Contraseña de 8 a 128 caracteres",
    )
    full_name: str = Field(..., min_length=2, max_length=255)
    role: Optional[UserRole] = Field(default=UserRole.CLIENTE)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("La contraseña debe contener al menos una mayúscula")
        if not re.search(r"[a-z]", v):
            raise ValueError("La contraseña debe contener al menos una minúscula")
        if not re.search(r"[0-9]", v):
            raise ValueError("La contraseña debe contener al menos un número")
        return v


class UserLogin(BaseModel):
    """Inicio de sesión."""
    email: EmailStr
    password: str = Field(..., min_length=1, description="Contraseña")


class ForgotPasswordRequest(BaseModel):
    """Solicita enlace de restablecimiento de contraseña."""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Restablece contraseña con token."""
    token: str = Field(..., description="Token de restablecimiento enviado por email")
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Nueva contraseña (8-128 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número)",
    )

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("La contraseña debe contener al menos una mayúscula")
        if not re.search(r"[a-z]", v):
            raise ValueError("La contraseña debe contener al menos una minúscula")
        if not re.search(r"[0-9]", v):
            raise ValueError("La contraseña debe contener al menos un número")
        return v


# ── Salida ───────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    """Datos públicos del usuario (sin hash de contraseña)."""
    id: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    email_verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """Tokens JWT devueltos tras login."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(..., description="Segundos hasta que expire el access token")

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    """Respuesta genérica con mensaje."""
    message: str
    detail: Optional[str] = None


# ── Esquemas internos del token (no expuestos en OpenAPI) ───────────

class TokenPayload(BaseModel):
    """Payload decodificado del JWT."""
    sub: str  # user_id
    exp: int  # timestamp expiración
    role: str
    type: str = "access"  # "access" o "refresh"
