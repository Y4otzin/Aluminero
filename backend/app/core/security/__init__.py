"""
Utilidades de seguridad: hashing de contraseñas (bcrypt) y JWT (python-jose).
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from jose import jwt, JWTError
import bcrypt

from app.core.config.settings import settings

# ── Hashing de contraseñas ──────────────────────────────────────────

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica contraseña plana contra hash bcrypt."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8") if isinstance(hashed_password, str) else hashed_password,
    )


def get_password_hash(password: str) -> str:
    """Genera hash bcrypt de la contraseña."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


# ── JWT ─────────────────────────────────────────────────────────────

def create_access_token(user_id: str, role: str) -> Tuple[str, datetime]:
    """
    Crea un JWT access token.

    Returns:
        (token_jwt, fecha_expiracion)
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "exp": expire,
        "role": role,
        "type": "access",
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, expire


def create_refresh_token(user_id: str) -> Tuple[str, datetime]:
    """
    Crea un JWT refresh token.

    Returns:
        (token_jwt, fecha_expiracion)
    """
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": user_id,
        "exp": expire,
        "type": "refresh",
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, expire


def decode_token(token: str, expected_type: str = "access") -> Optional[dict]:
    """
    Decodifica y valida un JWT.

    Args:
        token: JWT codificado.
        expected_type: "access" o "refresh".

    Returns:
        Payload decodificado o None si es inválido.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("type") != expected_type:
            return None
        return payload
    except JWTError:
        return None


def create_reset_token(user_id: str) -> Tuple[str, datetime]:
    """Crea un token de corta duración para restablecer contraseña (1 hora)."""
    expire = datetime.now(timezone.utc) + timedelta(hours=1)
    payload = {
        "sub": user_id,
        "exp": expire,
        "type": "reset_password",
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, expire
