"""
AuthService: lógica de negocio para registro, login, verificación de email,
recuperación y restablecimiento de contraseña.
"""

from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.repositories.session_repository import SessionRepository
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_token,
    create_reset_token,
)


class AuthService:
    """Servicio de autenticación — sin estado, métodos estáticos con inyección de db."""

    # ── Registro ─────────────────────────────────────────────────────

    @staticmethod
    def register(
        db: Session,
        email: str,
        password: str,
        full_name: str,
        role: UserRole = UserRole.CLIENTE,
    ) -> Tuple[User, str, str]:
        """
        Registra un nuevo usuario.

        Returns:
            (usuario, access_token, refresh_token)
        """
        # Validar unicidad de email
        if UserRepository.exists_by_email(db, email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El email ya está registrado.",
            )

        # Crear usuario
        password_hash = get_password_hash(password)
        user = UserRepository.create(
            db,
            email=email,
            password_hash=password_hash,
            full_name=full_name,
            role=role,
        )

        # Crear sesión (refresh token)
        session = SessionRepository.create(db, user.id)

        # Generar access token
        access_token, _ = create_access_token(user.id, user.role.value)

        return user, access_token, session.refresh_token

    # ── Login ────────────────────────────────────────────────────────

    @staticmethod
    def login(
        db: Session,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[User, str, str, int]:
        """
        Autentica al usuario con email y contraseña.

        Returns:
            (usuario, access_token, refresh_token, expires_in_segundos)
        """
        user = UserRepository.get_active_by_email(db, email)
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Generar tokens
        access_token, access_expire = create_access_token(user.id, user.role.value)
        session = SessionRepository.create(
            db,
            user.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        expires_in = int((access_expire - now).total_seconds())

        return user, access_token, session.refresh_token, expires_in

    # ── Verificación de email ────────────────────────────────────────

    @staticmethod
    def verify_email(db: Session, user: User) -> User:
        """Marca el email del usuario como verificado."""
        if user.email_verified:
            return user
        return UserRepository.mark_email_verified(db, user)

    # ── Olvidé contraseña ───────────────────────────────────────────

    @staticmethod
    def forgot_password(db: Session, email: str) -> str:
        """
        Genera un token de restablecimiento para el email dado.
        Siempre devuelve éxito para no filtrar emails existentes.

        Returns:
            Mensaje de confirmación (el token se enviaría por email en producción).
        """
        user = UserRepository.get_active_by_email(db, email)
        if user:
            reset_token, _ = create_reset_token(user.id)
            # En producción: enviar token por email con Resend
            # Por ahora lo devolvemos solo para desarrollo
            return f"Token de restablecimiento generado (desarrollo): {reset_token}"
        # No revelamos si el email existe o no
        return "Si el email existe, recibirás instrucciones para restablecer tu contraseña."

    # ── Restablecer contraseña ──────────────────────────────────────

    @staticmethod
    def reset_password(db: Session, token: str, new_password: str) -> User:
        """Restablece la contraseña usando un token válido."""
        payload = decode_token(token, expected_type="reset_password")
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido o expirado.",
            )

        user = UserRepository.get_by_id(db, payload["sub"])
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Usuario no encontrado o inactivo.",
            )

        new_hash = get_password_hash(new_password)
        user = UserRepository.update_password(db, user, new_hash)

        # Invalidar todas las sesiones existentes (seguridad)
        SessionRepository.revoke_all_for_user(db, user.id)

        return user
