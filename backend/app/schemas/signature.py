"""
Esquemas Pydantic para el módulo de Firma Digital (Signature).

- SignatureCreate: entrada al firmar (cliente envía su firma).
- SignatureResponse: salida con datos de la firma.
- SignatureEvidenceResponse: salida de evidencia legal.
- SignatureListResponse: lista paginada de firmas.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


# ── Entrada ──────────────────────────────────────────────────────────


class SignatureCreate(BaseModel):
    """Datos enviados por el cliente al firmar digitalmente."""

    signature_image: str = Field(
        ...,
        description="Imagen de la firma en base64 PNG",
    )
    signer_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Nombre completo del firmante",
    )
    signer_email: str = Field(
        ...,
        max_length=255,
        description="Correo electrónico del firmante",
    )

    model_config = {"from_attributes": True}


# ── Salida ───────────────────────────────────────────────────────────


class SignatureEvidenceResponse(BaseModel):
    """Ítem individual de evidencia legal."""

    id: str
    evidence_type: str
    evidence_value: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SignatureResponse(BaseModel):
    """Respuesta con datos completos de una firma."""

    id: str
    project_id: str
    budget_version: int
    signer_name: Optional[str] = None
    signer_email: Optional[str] = None
    signer_ip: Optional[str] = None
    user_agent: Optional[str] = None
    signature_image: Optional[str] = None
    pdf_hash: Optional[str] = None
    signed_at: Optional[datetime] = None
    status: str
    created_at: datetime
    updated_at: datetime
    evidence: Optional[List[SignatureEvidenceResponse]] = None

    model_config = {"from_attributes": True}


class SignatureListResponse(BaseModel):
    """Lista de firmas asociadas a un proyecto."""

    items: List[SignatureResponse]
    total: int

    model_config = {"from_attributes": True}
