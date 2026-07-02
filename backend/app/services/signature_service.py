"""
SignatureService: lógica de negocio para firma digital con trazabilidad legal.

- request_signature: inicia el flujo de firma (project → pendiente_firma).
- sign: el cliente firma digitalmente (IP, user-agent, hash SHA-256).
- reject: el cliente rechaza la firma.
- get_evidence: reporte completo de evidencia legal.
- get_signatures: lista de firmas de un proyecto.
"""

import hashlib
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.project import Project, ProjectStatus
from app.models.signature import Signature, SignatureStatus, SignatureEvidence
from app.repositories.project_repository import ProjectRepository
from app.repositories.signature_repository import SignatureRepository
from app.schemas.signature import (
    SignatureCreate,
    SignatureResponse,
    SignatureEvidenceResponse,
    SignatureListResponse,
)


class SignatureService:
    """Servicio de firma digital — métodos estáticos con inyección de db."""

    @staticmethod
    def request_signature(
        db: Session,
        project_id: str,
        budget_version: int,
    ) -> Signature:
        """
        Solicita la firma digital de un presupuesto.

        - Cambia el proyecto a estado 'pendiente_firma'.
        - Crea un registro de Signature con status='pending'.
        """
        project = ProjectRepository.get_by_id(db, project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Proyecto {project_id} no encontrado.",
            )

        if project.is_locked:
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="El proyecto está bloqueado. No se puede solicitar firma.",
            )

        # Cambiar estado del proyecto
        project.status = ProjectStatus.PENDIENTE_FIRMA
        ProjectRepository.update(db, project)

        # Crear registro de firma
        signature_data = {
            "project_id": project_id,
            "budget_version": budget_version,
            "status": SignatureStatus.PENDING,
        }
        signature = SignatureRepository.create(db, signature_data)

        # Registrar evidencia: timestamp de solicitud
        SignatureRepository.add_evidence(
            db,
            signature.id,
            "timestamp",
            f"Solicitud de firma creada: {datetime.now(timezone.utc).isoformat()}",
        )

        return signature

    @staticmethod
    def sign(
        db: Session,
        signature_id: str,
        data: SignatureCreate,
        client_ip: str,
        user_agent: str,
    ) -> Signature:
        """
        Procesa la firma digital del cliente.

        - Registra IP y user-agent del firmante.
        - Genera hash SHA-256 de la imagen de firma (base64).
        - Cambia status a 'signed' y registra timestamp.
        - Cambia project.status a 'aprobado' y is_locked=True.
        - Guarda toda la evidencia legal granular.
        """
        signature = SignatureRepository.get_by_id(db, signature_id)
        if not signature:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Solicitud de firma no encontrada.",
            )

        if signature.status != SignatureStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"La firma ya fue {signature.status.value}. "
                "No se puede volver a firmar.",
            )

        project = ProjectRepository.get_by_id(db, signature.project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Proyecto asociado no encontrado.",
            )

        # Calcular hash SHA-256 de la imagen de firma
        pdf_hash = hashlib.sha256(
            data.signature_image.encode("utf-8")
        ).hexdigest()

        # Actualizar la firma
        signature.signer_name = data.signer_name
        signature.signer_email = data.signer_email
        signature.signer_ip = client_ip
        signature.user_agent = user_agent
        signature.signature_image = data.signature_image
        signature.pdf_hash = pdf_hash
        signature.signed_at = datetime.now(timezone.utc)
        signature.status = SignatureStatus.SIGNED

        SignatureRepository.update(db, signature)

        # Cambiar estado del proyecto a aprobado y bloquear
        project.status = ProjectStatus.APROBADO
        project.is_locked = True
        ProjectRepository.update(db, project)

        # Registrar evidencia granular
        timestamp = datetime.now(timezone.utc).isoformat()

        SignatureRepository.add_evidence(
            db, signature.id, "ip", f"IP del firmante: {client_ip}"
        )
        SignatureRepository.add_evidence(
            db,
            signature.id,
            "user_agent",
            f"User-Agent: {user_agent}",
        )
        SignatureRepository.add_evidence(
            db,
            signature.id,
            "timestamp",
            f"Firma realizada: {timestamp}",
        )
        SignatureRepository.add_evidence(
            db,
            signature.id,
            "pdf_hash",
            f"SHA-256: {pdf_hash}",
        )
        SignatureRepository.add_evidence(
            db,
            signature.id,
            "signature",
            f"Firmante: {data.signer_name} ({data.signer_email})",
        )

        return signature

    @staticmethod
    def reject(
        db: Session,
        signature_id: str,
    ) -> Signature:
        """
        Rechaza una solicitud de firma.

        - Cambia status a 'rejected'.
        - Cambia project.status a 'rechazado'.
        """
        signature = SignatureRepository.get_by_id(db, signature_id)
        if not signature:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Solicitud de firma no encontrada.",
            )

        if signature.status != SignatureStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"La firma ya fue {signature.status.value}. "
                "No se puede rechazar.",
            )

        project = ProjectRepository.get_by_id(db, signature.project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Proyecto asociado no encontrado.",
            )

        # Actualizar firma
        signature.status = SignatureStatus.REJECTED
        SignatureRepository.update(db, signature)

        # Cambiar estado del proyecto
        project.status = ProjectStatus.RECHAZADO
        ProjectRepository.update(db, project)

        # Registrar evidencia
        SignatureRepository.add_evidence(
            db,
            signature.id,
            "timestamp",
            f"Firma rechazada: {datetime.now(timezone.utc).isoformat()}",
        )

        return signature

    @staticmethod
    def get_evidence(
        db: Session,
        signature_id: str,
    ) -> List[SignatureEvidence]:
        """
        Devuelve toda la evidencia legal asociada a una firma.

        Incluye: IP, timestamp, user-agent, hash de firma, datos del firmante.
        """
        signature = SignatureRepository.get_by_id(db, signature_id)
        if not signature:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Solicitud de firma no encontrada.",
            )

        return SignatureRepository.get_evidence(db, signature_id)

    @staticmethod
    def get_signatures(
        db: Session,
        project_id: str,
    ) -> List[Signature]:
        """Devuelve la lista de firmas de un proyecto."""
        project = ProjectRepository.get_by_id(db, project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Proyecto {project_id} no encontrado.",
            )

        return SignatureRepository.get_by_project(db, project_id)
