"""
Modelos SQLAlchemy: Project (proyectos de herrería) y WorkType (catálogo de tipos).
"""

import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    DateTime,
    Text,
    Enum as SAEnum,
    ForeignKey,
    CheckConstraint,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class ProjectStatus(str, enum.Enum):
    """Estados del ciclo de vida de un proyecto."""

    BORRADOR = "borrador"
    EN_COTIZACION = "en_cotizacion"
    PENDIENTE_FIRMA = "pendiente_firma"
    APROBADO = "aprobado"
    RECHAZADO = "rechazado"
    EN_PRODUCCION = "en_produccion"
    TERMINADO = "terminado"
    ENTREGADO = "entregado"


class Project(Base):
    """Proyecto de herrería de aluminio."""

    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_name = Column(String(255), nullable=False)
    client_email = Column(String(255), nullable=True)
    client_phone = Column(String(50), nullable=True)
    project_type = Column(
        String(100), nullable=False, default="ventana"
    )  # ventana, puerta, cancel, fachada, etc.
    height_m = Column(Float, nullable=False, default=1.0)
    width_m = Column(Float, nullable=False, default=1.0)
    quantity = Column(Integer, nullable=False, default=1)
    area_m2 = Column(Float, nullable=False, default=1.0)
    notes = Column(Text, nullable=True)
    status = Column(
        SAEnum(ProjectStatus),
        nullable=False,
        default=ProjectStatus.BORRADOR,
    )
    is_locked = Column(Boolean, nullable=False, default=False)
    created_by = Column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint("height_m > 0", name="ck_project_height_positive"),
        CheckConstraint("width_m > 0", name="ck_project_width_positive"),
        CheckConstraint("quantity > 0", name="ck_project_quantity_positive"),
        CheckConstraint("area_m2 >= 0", name="ck_project_area_non_negative"),
    )

    # Relación con el usuario creador
    creator = relationship("User", backref="projects")

    # Relación con fotos de evidencia
    photos = relationship("Photo", back_populates="project", cascade="all, delete-orphan")

    def calculate_area(self) -> float:
        """Calcula area_m2 = height_m * width_m * quantity."""
        self.area_m2 = round(self.height_m * self.width_m * self.quantity, 4)
        return self.area_m2

    def __repr__(self) -> str:
        return (
            f"<Project {self.id[:8]}... "
            f"'{self.client_name}' "
            f"({self.project_type}) [{self.status.value}]>"
        )


class WorkType(Base):
    """Catálogo de tipos de trabajo de herrería de aluminio."""

    __tablename__ = "work_types"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<WorkType {self.name}>"
