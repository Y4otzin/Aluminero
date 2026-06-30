"""
Repositorio genérico para catálogos del Sprint 4.

Proporciona operaciones CRUD estándar reutilizables para cualquier
modelo de catálogo (AluminumSeries, Finish, GlassType, Hardware).

Patrón: clase con constructor que recibe el modelo, métodos de instancia
que reciben session SQLAlchemy.
"""

from typing import Optional, List, Type

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import Base


class CatalogRepository:
    """Repositorio CRUD genérico para tablas de catálogo.

    Uso:
        repo = CatalogRepository(AluminumSeries)
        item = repo.get_by_id(db, "uuid-aqui")
        items = repo.list_all(db)
    """

    def __init__(self, model: Type[Base]):
        self.model = model

    # ── Crear ──────────────────────────────────────────────────────

    def create(self, db: Session, data: dict) -> Base:
        """Inserta un nuevo registro en el catálogo."""
        item = self.model(**data)
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    # ── Leer ───────────────────────────────────────────────────────

    def get_by_id(self, db: Session, item_id: str) -> Optional[Base]:
        """Busca un registro por ID (UUID)."""
        return db.query(self.model).filter(self.model.id == item_id).first()

    def get_by_name(self, db: Session, name: str) -> Optional[Base]:
        """Busca un registro por nombre exacto (sin distinción de mayúsculas)."""
        return db.query(self.model).filter(func.lower(self.model.name) == name.lower()).first()

    def list_all(
        self,
        db: Session,
        search: Optional[str] = None,
        active_only: bool = False,
    ) -> List[Base]:
        """
        Lista todos los registros del catálogo.

        Args:
            db: Sesión de base de datos.
            search: Búsqueda parcial por nombre (case-insensitive).
            active_only: Si True, solo devuelve items activos (is_active=True).
                         Solo aplica a modelos que tengan ese campo.
        """
        query = db.query(self.model)

        # Filtro de búsqueda (si el modelo tiene campo 'name')
        if search and hasattr(self.model, "name"):
            query = query.filter(self.model.name.ilike(f"%{search.strip()}%"))

        # Filtro de activos (si el modelo tiene campo 'is_active')
        if active_only and hasattr(self.model, "is_active"):
            query = query.filter(self.model.is_active == True)

        # Ordenar por nombre ascendente
        query = query.order_by(self.model.created_at.desc())

        return query.all()

    # ── Editar ─────────────────────────────────────────────────────

    def update(self, db: Session, item: Base, data: dict) -> Base:
        """Aplica los campos recibidos al registro y persiste."""
        for field, value in data.items():
            if value is not None:
                setattr(item, field, value)
        db.commit()
        db.refresh(item)
        return item

    # ── Eliminar ───────────────────────────────────────────────────

    def delete(self, db: Session, item: Base) -> None:
        """Elimina permanentemente un registro del catálogo."""
        db.delete(item)
        db.commit()
