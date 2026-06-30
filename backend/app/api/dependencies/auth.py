"""
Dependencias de autenticación y autorización (RBAC).

- get_current_user: extrae el usuario del token JWT.
- require_role: verifica que el usuario tenga un rol específico.
"""

from typing import List

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository

# Esquema de seguridad Bearer para OpenAPI
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Extrae y valida el usuario desde el token JWT Bearer.

    Lanza 401 si el token falta, es inválido, o el usuario no existe.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de acceso requerido.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(credentials.credentials, expected_type="access")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = UserRepository.get_by_id(db, payload["sub"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada.",
        )

    return user


def require_role(*roles: UserRole):
    """
    Factory de dependencia: exige que el usuario tenga al menos uno de los roles dados.

    Uso:
        @router.get("/admin")
        async def admin_endpoint(user: User = Depends(require_role(UserRole.ADMIN))):
            ...
    """

    async def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            allowed = ", ".join(r.value for r in roles)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Se requiere uno de los roles: {allowed}.",
            )
        return user

    return role_checker


def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """
    Similar a get_current_user pero no lanza error si no hay token.
    Útil para endpoints que funcionan con o sin autenticación.
    """
    if not credentials:
        return None

    payload = decode_token(credentials.credentials, expected_type="access")
    if not payload:
        return None

    user = UserRepository.get_by_id(db, payload["sub"])
    if not user or not user.is_active:
        return None

    return user
