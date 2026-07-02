"""
QuoteService: lógica de negocio para cotizaciones.

- create_quote: genera PDF, guarda en filesystem, crea Quote, registra QuoteHistory
- get_quotes: lista de cotizaciones por proyecto
- get_quote: detalle de una cotización
- mark_as_sent: marca como enviada y registra historial
- regenerate_quote: regenera PDF con datos actualizados
"""

import os
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.quote import Quote, QuoteHistory, QuoteStatus
from app.models.project import Project
from app.models.user import User
from app.services.budget_service import BudgetService
from app.services.pdf_service import PDFService

logger = logging.getLogger(__name__)


class QuoteService:
    """Servicio de cotizaciones — métodos estáticos con inyección de db."""

    @staticmethod
    def create_quote(
        db: Session,
        project_id: str,
        budget_version: int,
        user_id: str,
    ) -> Quote:
        """
        Crea una cotización: genera el PDF, lo guarda, registra en DB.

        Flujo:
        1. Validar proyecto y presupuesto
        2. Generar PDF con WeasyPrint
        3. Guardar PDF en filesystem
        4. Crear registro Quote en DB
        5. Registrar QuoteHistory
        """
        # Validar proyecto
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Proyecto no encontrado",
            )

        # Validar presupuesto
        budget = BudgetService.get_by_version(db, project_id, budget_version)
        if not budget:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Presupuesto versión {budget_version} no encontrado para el proyecto",
            )

        # Generar PDF
        folio = f"COT-{project.id[:8].upper()}-{budget_version}"
        filename = f"{folio.lower()}.pdf"

        pdf_bytes = PDFService.generate_quote_pdf(
            project_id=project_id,
            budget_version=budget_version,
            db=db,
        )

        # Guardar PDF en filesystem
        pdf_path = PDFService.save_pdf_local(pdf_bytes, filename)

        # Crear Quote
        quote = Quote(
            project_id=project_id,
            budget_version=budget_version,
            pdf_url=pdf_path,
            status=QuoteStatus.DRAFT,
            creator_id=user_id,
        )
        db.add(quote)
        db.flush()  # para obtener el ID

        # Regenerar PDF con quote_id para el QR
        pdf_bytes_with_qr = PDFService.generate_quote_pdf(
            project_id=project_id,
            budget_version=budget_version,
            db=db,
            quote_id=quote.id,
        )

        # Sobrescribir PDF con QR incluido
        PDFService.save_pdf_local(pdf_bytes_with_qr, filename)

        # Registrar historial
        history = QuoteHistory(
            quote_id=quote.id,
            action="created",
            performed_by=user_id,
            metadata_json={
                "budget_version": budget_version,
                "folio": folio,
                "filename": filename,
            },
        )
        db.add(history)
        db.commit()
        db.refresh(quote)

        logger.info(f"Cotización creada: {quote.id} — {folio}")
        return quote

    @staticmethod
    def get_quotes(db: Session, project_id: str) -> List[Quote]:
        """Lista todas las cotizaciones de un proyecto, ordenadas por fecha descendente."""
        return (
            db.query(Quote)
            .filter(Quote.project_id == project_id)
            .order_by(desc(Quote.created_at))
            .all()
        )

    @staticmethod
    def get_quote(db: Session, quote_id: str) -> Quote:
        """Obtiene el detalle de una cotización por ID."""
        quote = db.query(Quote).filter(Quote.id == quote_id).first()
        if not quote:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cotización no encontrada",
            )
        return quote

    @staticmethod
    def mark_as_sent(db: Session, quote_id: str, user_id: str) -> Quote:
        """
        Marca una cotización como enviada.
        Registra el evento en QuoteHistory.
        """
        quote = QuoteService.get_quote(db, quote_id)

        if quote.status != QuoteStatus.DRAFT:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"No se puede marcar como enviada: "
                f"la cotización está en estado '{quote.status.value}'",
            )

        quote.status = QuoteStatus.SENT
        db.flush()

        # Registrar historial
        history = QuoteHistory(
            quote_id=quote.id,
            action="sent",
            performed_by=user_id,
            metadata_json={
                "previous_status": QuoteStatus.DRAFT.value,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )
        db.add(history)
        db.commit()
        db.refresh(quote)

        logger.info(f"Cotización marcada como enviada: {quote.id}")
        return quote

    @staticmethod
    def regenerate_quote(db: Session, quote_id: str, user_id: str) -> Quote:
        """
        Regenera el PDF de una cotización con los datos actualizados
        del presupuesto y proyecto.

        Útil cuando se actualiza el presupuesto y se quiere reflejar
        los cambios en la cotización sin crear una nueva.
        """
        quote = QuoteService.get_quote(db, quote_id)

        project_id = quote.project_id
        budget_version = quote.budget_version

        # Validar que el presupuesto aún existe
        budget = BudgetService.get_by_version(db, project_id, budget_version)
        if not budget:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Presupuesto versión {budget_version} ya no existe",
            )

        # Generar nuevo PDF
        folio = f"COT-{project_id[:8].upper()}-{budget_version}"
        filename = f"{folio.lower()}.pdf"

        pdf_bytes = PDFService.generate_quote_pdf(
            project_id=project_id,
            budget_version=budget_version,
            db=db,
            quote_id=quote_id,
        )

        pdf_path = PDFService.save_pdf_local(pdf_bytes, filename)

        # Actualizar quote
        quote.pdf_url = pdf_path
        db.flush()

        # Registrar historial
        history = QuoteHistory(
            quote_id=quote.id,
            action="regenerated",
            performed_by=user_id,
            metadata_json={
                "budget_version": budget_version,
                "filename": filename,
                "regenerated_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        db.add(history)
        db.commit()
        db.refresh(quote)

        logger.info(f"Cotización regenerada: {quote.id}")
        return quote

    @staticmethod
    def get_history(db: Session, quote_id: str) -> List[QuoteHistory]:
        """Obtiene el historial de acciones de una cotización."""
        quote = QuoteService.get_quote(db, quote_id)
        return (
            db.query(QuoteHistory)
            .filter(QuoteHistory.quote_id == quote_id)
            .order_by(desc(QuoteHistory.created_at))
            .all()
        )
