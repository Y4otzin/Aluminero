"""
Router de Firma Digital: /api/v1/signature/ y /api/v1/projects/{project_id}/request-signature

Endpoints:
- POST /api/v1/projects/{project_id}/request-signature  (auth: vendedor/admin)
- POST /api/v1/signatures/{signature_id}/sign             (sin auth — cliente)
- POST /api/v1/signatures/{signature_id}/reject           (sin auth — cliente)
- GET  /api/v1/signatures/{signature_id}/evidence         (sin auth — reporte legal)
- GET  /api/v1/projects/{project_id}/signatures           (auth: vendedor/admin)
"""

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.signature import (
    SignatureCreate,
    SignatureResponse,
    SignatureEvidenceResponse,
    SignatureListResponse,
)
from app.schemas.auth import MessageResponse
from app.services.signature_service import SignatureService
from app.api.dependencies.auth import get_current_user, require_role
from app.models.user import User, UserRole

router = APIRouter(tags=["signature"])


@router.post(
    "/api/v1/projects/{project_id}/request-signature",
    response_model=SignatureResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Solicitar firma digital",
)
async def request_signature(
    project_id: str,
    budget_version: int = 1,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.VENDEDOR, UserRole.ADMIN)),
):
    """
    Solicita la firma digital de un presupuesto.

    - Cambia el proyecto a estado 'pendiente_firma'.
    - Crea un registro de Signature con status='pending'.
    - Requiere rol vendedor o admin.
    """
    signature = SignatureService.request_signature(
        db,
        project_id=project_id,
        budget_version=budget_version,
    )
    # Cargar evidencia para la respuesta
    signature.evidence = SignatureService.get_evidence(db, signature.id)
    return signature


@router.post(
    "/api/v1/signatures/{signature_id}/sign",
    response_model=SignatureResponse,
    summary="Firmar digitalmente",
)
async def sign_signature(
    signature_id: str,
    data: SignatureCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Procesa la firma digital por parte del cliente.

    - NO requiere autenticación (el cliente no tiene cuenta).
    - Registra la IP real del cliente y el user-agent.
    - Genera hash SHA-256 de la imagen de firma.
    - Cambia project.status a 'aprobado' y is_locked=True.
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    signature = SignatureService.sign(
        db,
        signature_id=signature_id,
        data=data,
        client_ip=client_ip,
        user_agent=user_agent,
    )
    # Cargar evidencia para la respuesta
    signature.evidence = SignatureService.get_evidence(db, signature.id)
    return signature


@router.post(
    "/api/v1/signatures/{signature_id}/reject",
    response_model=SignatureResponse,
    summary="Rechazar firma",
)
async def reject_signature(
    signature_id: str,
    db: Session = Depends(get_db),
):
    """
    Rechaza una solicitud de firma.

    - NO requiere autenticación.
    - Cambia signature.status a 'rejected'.
    - Cambia project.status a 'rechazado'.
    """
    signature = SignatureService.reject(db, signature_id=signature_id)
    return signature


@router.get(
    "/api/v1/signatures/{signature_id}/evidence",
    response_model=list[SignatureEvidenceResponse],
    summary="Obtener evidencia legal",
)
async def get_evidence(
    signature_id: str,
    db: Session = Depends(get_db),
):
    """
    Devuelve toda la evidencia legal asociada a una firma digital.

    Incluye: IP del firmante, timestamp, user-agent,
    hash SHA-256 de la firma, datos del firmante.

    NO requiere autenticación (accesible para reportes legales).
    """
    evidence = SignatureService.get_evidence(db, signature_id=signature_id)
    return [SignatureEvidenceResponse.model_validate(e) for e in evidence]


@router.get(
    "/api/v1/projects/{project_id}/signatures",
    response_model=SignatureListResponse,
    summary="Listar firmas del proyecto",
)
async def list_signatures(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.VENDEDOR, UserRole.ADMIN)),
):
    """
    Devuelve la lista de todas las firmas asociadas a un proyecto.

    - Requiere rol vendedor o admin.
    """
    signatures = SignatureService.get_signatures(db, project_id=project_id)
    items = [
        SignatureResponse.model_validate(s) for s in signatures
    ]
    return SignatureListResponse(
        items=items,
        total=len(items),
    )
