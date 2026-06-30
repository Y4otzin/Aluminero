"""
Endpoints de evidencia fotográfica: /api/v1/projects/{project_id}/photos/*

Requiere autenticación (Bearer JWT) para todas las operaciones.
Las imágenes se limpian de metadatos EXIF/GPS automáticamente.
"""

from typing import List

from fastapi import APIRouter, Depends, UploadFile, File, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.photo import (
    PhotoResponse,
    PhotoUploadResponse,
    PhotoReorderRequest,
)
from app.schemas.auth import MessageResponse
from app.services.photo_service import PhotoService
from app.api.dependencies.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/v1", tags=["photos"])


# ── Subir fotos ─────────────────────────────────────────────────


@router.post(
    "/projects/{project_id}/photos",
    response_model=PhotoUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Subir fotos a un proyecto",
)
async def upload_photos(
    project_id: str,
    files: List[UploadFile] = File(
        ...,
        description="Archivos de imagen (máx. 10, máx. 10 MB c/u). Se limpia EXIF/GPS automáticamente.",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Sube una o varias fotos de evidencia a un proyecto.

    - **Máximo 10 archivos** por solicitud.
    - **Máximo 10 MB** por archivo.
    - Los metadatos EXIF/GPS se eliminan automáticamente.
    - Las imágenes se comprimen a WebP (calidad 85%).
    - Se almacenan en Supabase Storage con URLs firmadas (1 hora).
    """
    return await PhotoService.upload_photos(db, project_id, files)


# ── Listar fotos ────────────────────────────────────────────────


@router.get(
    "/projects/{project_id}/photos",
    response_model=List[PhotoResponse],
    summary="Listar fotos de un proyecto",
)
async def list_photos(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Devuelve todas las fotos de un proyecto, ordenadas por el campo `order`.

    Las URLs firmadas se refrescan automáticamente si es necesario.
    """
    return PhotoService.list_photos(db, project_id)


# ── Reordenar ───────────────────────────────────────────────────


@router.put(
    "/projects/{project_id}/photos/reorder",
    response_model=List[PhotoResponse],
    summary="Reordenar fotos del proyecto",
)
async def reorder_photos(
    project_id: str,
    data: PhotoReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cambia el orden de las fotos en la galería del proyecto.

    - Envía la lista completa de photo IDs en el nuevo orden deseado.
    - Todos los IDs deben pertenecer al proyecto.
    - No debe faltar ni sobrar ninguna foto del proyecto.
    """
    return PhotoService.reorder_photos(db, project_id, data.photo_ids)


# ── Eliminar foto ───────────────────────────────────────────────


@router.delete(
    "/photos/{photo_id}",
    response_model=MessageResponse,
    summary="Eliminar una foto",
)
async def delete_photo(
    photo_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Elimina una foto del storage y de la base de datos.

    - Elimina el archivo de Supabase Storage (o filesystem local).
    - Elimina el registro de la base de datos.
    """
    result = PhotoService.delete_photo(db, photo_id)
    return MessageResponse(
        message=result["message"],
    )
