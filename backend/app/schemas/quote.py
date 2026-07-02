"""Esquemas Pydantic para cotizaciones (quotes)."""

from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime


class QuoteCreate(BaseModel):
    budget_version: int = Field(..., ge=1, description="Versión del presupuesto a cotizar")


class QuoteSendRequest(BaseModel):
    recipient_email: str = Field(..., description="Email del destinatario")


class QuoteHistoryResponse(BaseModel):
    id: str
    quote_id: str
    action: str
    performed_by: Optional[str] = None
    metadata_json: Optional[Any] = None
    created_at: datetime

    class Config:
        from_attributes = True


class QuoteResponse(BaseModel):
    id: str
    project_id: str
    budget_version: int
    pdf_url: Optional[str] = None
    status: str
    creator_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    history: List[QuoteHistoryResponse] = []

    class Config:
        from_attributes = True


class QuoteListResponse(BaseModel):
    quotes: List[QuoteResponse]
    total: int


class QuoteGenerateResponse(BaseModel):
    id: str
    project_id: str
    budget_version: int
    pdf_url: Optional[str] = None
    status: str
    folio: str
    created_at: datetime
    message: str = "Cotización generada exitosamente"
