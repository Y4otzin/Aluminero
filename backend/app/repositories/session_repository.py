"""
Repositorio de sesiones: gestión de refresh tokens en la tabla `sessions`.
"""

from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session as DBSession
from app.models.user import Session as SessionModel
from app.core.security import create_refresh_token


class SessionRepository:
    """Acceso a datos de sesiones (refresh tokens)."""

    @staticmethod
    def create(
        db: DBSession,
        user_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> SessionModel:
        token, expires_at = create_refresh_token(user_id)
        session = SessionModel(
            user_id=user_id,
            refresh_token=token,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def get_by_token(db: DBSession, refresh_token: str) -> Optional[SessionModel]:
        return (
            db.query(SessionModel)
            .filter(SessionModel.refresh_token == refresh_token)
            .first()
        )

    @staticmethod
    def revoke(db: DBSession, session: SessionModel) -> SessionModel:
        session.is_revoked = True
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def revoke_all_for_user(db: DBSession, user_id: str) -> int:
        count = (
            db.query(SessionModel)
            .filter(SessionModel.user_id == user_id, SessionModel.is_revoked == False)
            .update({"is_revoked": True})
        )
        db.commit()
        return count

    @staticmethod
    def cleanup_expired(db: DBSession) -> int:
        """Elimina sesiones expiradas de la base de datos."""
        now = datetime.now(timezone.utc)
        count = (
            db.query(SessionModel)
            .filter(SessionModel.expires_at < now)
            .delete()
        )
        db.commit()
        return count

    @staticmethod
    def get_active_sessions_for_user(db: DBSession, user_id: str) -> List[SessionModel]:
        now = datetime.now(timezone.utc)
        return (
            db.query(SessionModel)
            .filter(
                SessionModel.user_id == user_id,
                SessionModel.is_revoked == False,
                SessionModel.expires_at > now,
            )
            .all()
        )
