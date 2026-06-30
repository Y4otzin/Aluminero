"""
Repositorio de usuarios: operaciones CRUD sobre la tabla `users`.

Patrón: cada método recibe una sesión SQLAlchemy y opera sobre ella.
"""

from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.user import User, UserRole


class UserRepository:
    """Acceso a datos de usuarios."""

    @staticmethod
    def get_by_id(db: Session, user_id: str) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_active_by_email(db: Session, email: str) -> Optional[User]:
        return (
            db.query(User)
            .filter(User.email == email, User.is_active == True)
            .first()
        )

    @staticmethod
    def create(db: Session, email: str, password_hash: str, full_name: str, role: UserRole = UserRole.CLIENTE) -> User:
        user = User(
            email=email,
            password_hash=password_hash,
            full_name=full_name,
            role=role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update(db: Session, user: User) -> User:
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def mark_email_verified(db: Session, user: User) -> User:
        user.email_verified = True
        return UserRepository.update(db, user)

    @staticmethod
    def update_password(db: Session, user: User, new_password_hash: str) -> User:
        user.password_hash = new_password_hash
        return UserRepository.update(db, user)

    @staticmethod
    def exists_by_email(db: Session, email: str) -> bool:
        return db.query(User).filter(User.email == email).first() is not None

    @staticmethod
    def list_by_role(db: Session, role: UserRole) -> list[User]:
        return (
            db.query(User)
            .filter(User.role == role, User.is_active == True)
            .all()
        )
