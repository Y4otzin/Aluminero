"""
Repositorio de firmas digitales: operaciones CRUD sobre `signatures`.

Patrón: métodos estáticos que reciben session SQLAlchemy.
"""

from typing import Optional, List

from sqlalchemy.orm import Session

from app.models.signature import Signature, SignatureEvidence, SignatureStatus


class SignatureRepository:
    """Acceso a datos de firmas digitales."""

    @staticmethod
    def get_by_id(db: Session, signature_id: str) -> Optional[Signature]:
        """Obtiene una firma por ID."""
        return db.query(Signature).filter(Signature.id == signature_id).first()

    @staticmethod
    def get_by_project(
        db: Session, project_id: str
    ) -> List[Signature]:
        """Obtiene todas las firmas de un proyecto, ordenadas por creación."""
        return (
            db.query(Signature)
            .filter(Signature.project_id == project_id)
            .order_by(Signature.created_at.desc())
            .all()
        )

    @staticmethod
    def create(db: Session, signature_data: dict) -> Signature:
        """Crea un nuevo registro de firma."""
        signature = Signature(**signature_data)
        db.add(signature)
        db.commit()
        db.refresh(signature)
        return signature

    @staticmethod
    def update(db: Session, signature: Signature) -> Signature:
        """Actualiza y persiste cambios en una firma."""
        db.commit()
        db.refresh(signature)
        return signature

    @staticmethod
    def add_evidence(
        db: Session,
        signature_id: str,
        evidence_type: str,
        evidence_value: str,
    ) -> SignatureEvidence:
        """Agrega un ítem de evidencia legal a una firma."""
        evidence = SignatureEvidence(
            signature_id=signature_id,
            evidence_type=evidence_type,
            evidence_value=evidence_value,
        )
        db.add(evidence)
        db.commit()
        db.refresh(evidence)
        return evidence

    @staticmethod
    def get_evidence(
        db: Session, signature_id: str
    ) -> List[SignatureEvidence]:
        """Obtiene toda la evidencia asociada a una firma."""
        return (
            db.query(SignatureEvidence)
            .filter(SignatureEvidence.signature_id == signature_id)
            .order_by(SignatureEvidence.created_at.asc())
            .all()
        )
