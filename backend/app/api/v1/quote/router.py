"""Router para cotizaciones (quotes): generación, descarga, envío y regeneración."""

import os
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.quote import (
    QuoteCreate,
    QuoteSendRequest,
    QuoteResponse,
    QuoteListResponse,
    QuoteGenerateResponse,
    QuoteHistoryResponse,
)
from app.services.quote_service import QuoteService
from app.services.pdf_service import PDFService
from app.utils.pdf_generator import PDF_STORAGE_DIR, get_pdf_path

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["quotes"])


# ── Generar cotización ─────────────────────────────────────────


@router.post(
    "/projects/{project_id}/generate-quote",
    response_model=QuoteGenerateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generar PDF de cotización y guardar",
)
async def generate_quote(
    project_id: str,
    data: QuoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Genera el PDF de cotización para un proyecto usando una versión
    específica del presupuesto. Crea el registro Quote y el historial.
    """
    quote = QuoteService.create_quote(
        db=db,
        project_id=project_id,
        budget_version=data.budget_version,
        user_id=current_user.id,
    )

    folio = f"COT-{project_id[:8].upper()}-{data.budget_version}"

    return QuoteGenerateResponse(
        id=quote.id,
        project_id=quote.project_id,
        budget_version=quote.budget_version,
        pdf_url=quote.pdf_url,
        status=quote.status.value if hasattr(quote.status, "value") else quote.status,
        folio=folio,
        created_at=quote.created_at,
    )


# ── Listar cotizaciones de un proyecto ─────────────────────────


@router.get(
    "/projects/{project_id}/quotes",
    response_model=QuoteListResponse,
    summary="Listar cotizaciones de un proyecto",
)
async def list_quotes(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Devuelve todas las cotizaciones generadas para un proyecto."""
    quotes = QuoteService.get_quotes(db, project_id)
    quote_responses = [_quote_to_response(q) for q in quotes]
    return QuoteListResponse(quotes=quote_responses, total=len(quote_responses))


# ── Detalle de cotización ──────────────────────────────────────


@router.get(
    "/quotes/{quote_id}",
    response_model=QuoteResponse,
    summary="Obtener detalle de cotización",
)
async def get_quote(
    quote_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtiene el detalle completo de una cotización, incluyendo historial."""
    quote = QuoteService.get_quote(db, quote_id)
    return _quote_to_response(quote)


# ── Descargar PDF ──────────────────────────────────────────────


@router.get(
    "/quotes/{quote_id}/download",
    summary="Descargar PDF de cotización",
)
async def download_quote_pdf(
    quote_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Descarga el archivo PDF de una cotización.
    Retorna el PDF como descarga directa.
    """
    quote = QuoteService.get_quote(db, quote_id)

    if not quote.pdf_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El PDF de esta cotización no está disponible",
        )

    pdf_path = quote.pdf_url
    if not os.path.isabs(pdf_path):
        pdf_path = os.path.join(PDF_STORAGE_DIR, pdf_path)

    if not os.path.exists(pdf_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Archivo PDF no encontrado en el servidor",
        )

    folio = f"COT-{quote.project_id[:8].upper()}-{quote.budget_version}"
    filename = f"{folio}.pdf"

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=filename,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


# ── Enviar cotización por email ────────────────────────────────


@router.post(
    "/quotes/{quote_id}/send",
    summary="Enviar cotización por email",
)
async def send_quote_email(
    quote_id: str,
    data: QuoteSendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Envía la cotización en PDF por email usando la API de Resend.
    Marca la cotización como 'sent' y registra el evento en el historial.
    """
    # Primero marcar como enviada
    QuoteService.mark_as_sent(db, quote_id, current_user.id)

    # Enviar email
    result = PDFService.send_pdf_email(
        quote_id=quote_id,
        recipient_email=data.recipient_email,
        db=db,
    )

    return {
        "success": True,
        "quote_id": quote_id,
        "recipient": data.recipient_email,
        "email_result": result,
    }


# ── Regenerar cotización ───────────────────────────────────────


@router.post(
    "/quotes/{quote_id}/regenerate",
    response_model=QuoteGenerateResponse,
    summary="Regenerar PDF de cotización",
)
async def regenerate_quote(
    quote_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Regenera el PDF de una cotización existente con los datos
    actualizados del proyecto y presupuesto.
    """
    quote = QuoteService.regenerate_quote(db, quote_id, current_user.id)

    folio = f"COT-{quote.project_id[:8].upper()}-{quote.budget_version}"

    return QuoteGenerateResponse(
        id=quote.id,
        project_id=quote.project_id,
        budget_version=quote.budget_version,
        pdf_url=quote.pdf_url,
        status=quote.status.value if hasattr(quote.status, "value") else quote.status,
        folio=folio,
        created_at=quote.created_at,
        message="Cotización regenerada exitosamente",
    )


# ── Historial de cotización ────────────────────────────────────


@router.get(
    "/quotes/{quote_id}/history",
    response_model=List[QuoteHistoryResponse],
    summary="Obtener historial de una cotización",
)
async def get_quote_history(
    quote_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtiene el historial de acciones realizadas sobre una cotización."""
    history = QuoteService.get_history(db, quote_id)
    return [
        QuoteHistoryResponse(
            id=h.id,
            quote_id=h.quote_id,
            action=h.action,
            performed_by=h.performed_by,
            metadata_json=h.metadata_json,
            created_at=h.created_at,
        )
        for h in history
    ]


# ── Helper ─────────────────────────────────────────────────────


def _quote_to_response(quote) -> QuoteResponse:
    """Convierte un modelo Quote a QuoteResponse con historial."""
    history = [
        QuoteHistoryResponse(
            id=h.id,
            quote_id=h.quote_id,
            action=h.action,
            performed_by=h.performed_by,
            metadata_json=h.metadata_json,
            created_at=h.created_at,
        )
        for h in getattr(quote, "history", [])
    ]

    return QuoteResponse(
        id=quote.id,
        project_id=quote.project_id,
        budget_version=quote.budget_version,
        pdf_url=quote.pdf_url,
        status=quote.status.value if hasattr(quote.status, "value") else quote.status,
        creator_id=quote.creator_id,
        created_at=quote.created_at,
        updated_at=quote.updated_at,
        history=history,
    )
