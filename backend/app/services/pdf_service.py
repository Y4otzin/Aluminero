"""
PDFService: servicios para generar, almacenar y enviar PDFs de cotización.

Flujo completo:
1. render_html(project_id, budget_version) → obtiene datos y genera HTML
2. generate_quote_pdf(project_id, budget_version) → genera PDF con WeasyPrint
3. save_pdf_local(pdf_bytes, filename) → guarda en backend/generated_pdfs/
4. send_pdf_email(quote_id, recipient_email) → envía por Resend API
"""

import os
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.budget import Budget, LaborCost
from app.models.signature import Signature, SignatureStatus
from app.services.budget_service import BudgetService
from app.utils.pdf_generator import (
    render_quote_html,
    generate_pdf_bytes,
    save_pdf,
    get_pdf_path,
    PDF_STORAGE_DIR,
)

logger = logging.getLogger(__name__)


class PDFService:
    """Servicio de generación y envío de PDFs de cotización."""

    @staticmethod
    def _get_sketch_svg(project_id: str) -> Optional[str]:
        """
        Intenta obtener el SVG del boceto del proyecto.
        Si no hay sketch endpoint disponible, retorna None.
        """
        try:
            from app.api.v1.sketch import build_svg
            from app.api.v1.sketch import SketchRequest, SketchElement

            # Verificar si existen fotos/elementos de boceto
            # Por ahora retornamos None y se omite del PDF
            return None
        except ImportError:
            return None

    @staticmethod
    def render_html(project_id: str, budget_version: int, db: Session) -> str:
        """Genera el HTML para el PDF de cotización."""
        # Obtener proyecto
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Proyecto no encontrado",
            )

        # Obtener presupuesto por versión
        budget = BudgetService.get_by_version(db, project_id, budget_version)
        if not budget:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Presupuesto versión {budget_version} no encontrado",
            )

        # Obtener firma si existe
        signature = (
            db.query(Signature)
            .filter(
                Signature.project_id == project_id,
                Signature.status == SignatureStatus.SIGNED,
            )
            .order_by(Signature.signed_at.desc())
            .first()
        )

        # SVG del boceto (opcional)
        svg_content = PDFService._get_sketch_svg(project_id)

        # Generar HTML
        html = render_quote_html(
            project=project,
            budget=budget,
            signature=signature,
            svg_content=svg_content,
        )
        return html

    @staticmethod
    def generate_quote_pdf(
        project_id: str,
        budget_version: int,
        db: Session,
        quote_id: Optional[str] = None,
    ) -> bytes:
        """
        Genera el PDF de cotización completo.
        Retorna los bytes del PDF.
        """
        html = PDFService.render_html(project_id, budget_version, db)

        # Si tenemos quote_id, lo pasamos para el QR
        if quote_id:
            project = db.query(Project).filter(Project.id == project_id).first()
            budget = BudgetService.get_by_version(db, project_id, budget_version)
            folio = f"COT-{project.id[:8].upper()}-{budget.version}"
            html = render_quote_html(
                project=project,
                budget=budget,
                signature=db.query(Signature)
                .filter(
                    Signature.project_id == project_id,
                    Signature.status == SignatureStatus.SIGNED,
                )
                .order_by(Signature.signed_at.desc())
                .first(),
                quote_id=quote_id,
                folio=folio,
            )

        pdf_bytes = generate_pdf_bytes(html)
        return pdf_bytes

    @staticmethod
    def save_pdf_local(pdf_bytes: bytes, filename: str) -> str:
        """
        Guarda el PDF en el sistema de archivos local.
        Retorna la ruta absoluta.
        """
        filepath = save_pdf(pdf_bytes, filename)
        logger.info(f"PDF guardado: {filepath}")
        return filepath

    @staticmethod
    def send_pdf_email(
        quote_id: str,
        recipient_email: str,
        db: Session,
    ) -> dict:
        """
        Envía el PDF de cotización por email usando Resend API.

        Requiere:
        - RESEND_API_KEY en variables de entorno
        - El PDF debe existir en generated_pdfs/
        """
        from app.models.quote import Quote

        quote = db.query(Quote).filter(Quote.id == quote_id).first()
        if not quote:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cotización no encontrada",
            )

        if not quote.pdf_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La cotización no tiene PDF generado",
            )

        # Leer el archivo PDF
        pdf_path = quote.pdf_url
        if not os.path.isabs(pdf_path):
            pdf_path = os.path.join(PDF_STORAGE_DIR, pdf_path)

        if not os.path.exists(pdf_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Archivo PDF no encontrado en el servidor",
            )

        with open(pdf_path, "rb") as f:
            pdf_content = f.read()

        # Obtener datos del proyecto
        project = db.query(Project).filter(Project.id == quote.project_id).first()
        project_name = project.client_name if project else "Cliente"
        folio = f"COT-{project.id[:8].upper() if project else 'XXXX'}-{quote.budget_version}"

        # Enviar por Resend
        try:
            import resend

            resend.api_key = os.getenv("RESEND_API_KEY", "")

            if not resend.api_key:
                logger.warning(
                    "RESEND_API_KEY no configurada — simulación de envío"
                )
                return {
                    "success": True,
                    "simulated": True,
                    "message": "Email no enviado: RESEND_API_KEY no configurada",
                }

            # Adjuntar PDF como base64
            import base64

            pdf_b64 = base64.b64encode(pdf_content).decode("utf-8")

            params = {
                "from": os.getenv(
                    "EMAIL_FROM", "ALUMINERO <cotizaciones@aluminero.app>"
                ),
                "to": [recipient_email],
                "subject": f"Cotización ALUMINERO — {folio}",
                "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px;">
                    <h2 style="color: #1a237e;">ALUMINERO — Cotización</h2>
                    <p>Hola <strong>{project_name}</strong>,</p>
                    <p>Adjuntamos la cotización <strong>{folio}</strong> para su proyecto.</p>
                    <p>Puede revisar los detalles en el PDF adjunto.</p>
                    <p>Para firmar digitalmente, acceda al siguiente enlace:</p>
                    <p><a href="{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/project/{quote.project_id}/sign"
                          style="display: inline-block; padding: 10px 20px;
                                 background-color: #1a237e; color: white;
                                 text-decoration: none; border-radius: 5px;">
                        Revisar y firmar cotización
                    </a></p>
                    <hr style="border: none; border-top: 1px solid #ddd;" />
                    <p style="color: #888; font-size: 12px;">
                        ALUMINERO — Soluciones en Aluminio<br/>
                        Este es un mensaje automático, por favor no responda a este correo.
                    </p>
                </div>
                """,
                "attachments": [
                    {
                        "filename": f"{folio}.pdf",
                        "content": pdf_b64,
                    }
                ],
            }

            response = resend.Emails.send(params)
            logger.info(f"Email enviado a {recipient_email}: {response}")
            return {"success": True, "id": response.get("id", ""), "to": recipient_email}

        except Exception as e:
            logger.error(f"Error enviando email a {recipient_email}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al enviar el email: {str(e)}",
            )
