"""
PhotoService: lógica de negocio para evidencia fotográfica.

- Subida múltiple con limpieza EXIF y compresión WebP.
- Almacenamiento en Supabase Storage con fallback a filesystem local.
- Signed URLs temporales (1 hora) para acceso seguro.
- Reordenamiento y eliminación con limpieza de storage.
"""

import os
import uuid
import httpx
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session

from app.core.config.settings import settings
from app.models.photo import Photo
from app.models.project import Project
from app.schemas.photo import PhotoResponse, PhotoUploadResponse
from app.utils.exif_stripper import strip_exif


# ── Constantes ──────────────────────────────────────────────────────

STORAGE_BUCKET = "project-photos"
SIGNED_URL_EXPIRY = 3600  # 1 hora
MAX_PHOTOS_PER_UPLOAD = 10
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
LOCAL_STORAGE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "storage",
    "photos",
)


class PhotoService:
    """Servicio de fotos — métodos estáticos con inyección de db."""

    # ── Subir fotos ──────────────────────────────────────────────

    @staticmethod
    async def upload_photos(
        db: Session,
        project_id: str,
        files: List[UploadFile],
    ) -> PhotoUploadResponse:
        """
        Sube múltiples fotos a un proyecto.

        - Valida cantidad máxima (10) y tamaño máximo (10 MB c/u).
        - Limpia metadatos EXIF/GPS de cada imagen.
        - Comprime a WebP calidad 85%.
        - Sube a Supabase Storage (o filesystem local si no está configurado).
        - Genera signed URL temporal (1 hora).
        - Guarda registro en la base de datos.

        Args:
            db: Sesión de base de datos.
            project_id: UUID del proyecto al que pertenecen las fotos.
            files: Lista de archivos subidos (UploadFile).

        Returns:
            PhotoUploadResponse con la lista de fotos creadas.

        Raises:
            HTTPException 404: Si el proyecto no existe.
            HTTPException 400: Si se excede el límite de archivos o tamaño.
        """
        # ── Validar proyecto ──────────────────────────────────
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Proyecto {project_id} no encontrado.",
            )

        # ── Validar límites ───────────────────────────────────
        if not files:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debe enviar al menos un archivo.",
            )

        if len(files) > MAX_PHOTOS_PER_UPLOAD:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Máximo {MAX_PHOTOS_PER_UPLOAD} fotos por carga.",
            )

        # ── Obtener siguiente order disponible ────────────────
        max_order_result = (
            db.query(Photo)
            .filter(Photo.project_id == project_id)
            .order_by(Photo.order.desc())
            .first()
        )
        next_order = (max_order_result.order + 1) if max_order_result else 0

        # ── Procesar cada archivo ─────────────────────────────
        created_photos: List[Photo] = []
        use_supabase = bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY)

        for idx, file in enumerate(files):
            # Validar tamaño
            content = await file.read()
            if len(content) > MAX_FILE_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El archivo '{file.filename}' excede los 10 MB.",
                )

            # Limpiar EXIF + comprimir a WebP
            try:
                clean_bytes = strip_exif(content)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"No se pudo procesar '{file.filename}': {exc}",
                )

            # Generar nombre único para storage
            ext = ".webp"
            storage_filename = f"{project_id}/{uuid.uuid4().hex}{ext}"

            # ── Subir a storage ───────────────────────────────
            if use_supabase:
                storage_url = await PhotoService._upload_to_supabase(
                    storage_filename, clean_bytes
                )
                signed_url = await PhotoService._generate_signed_url(storage_filename)
            else:
                storage_url = await PhotoService._save_to_local(
                    storage_filename, clean_bytes
                )
                signed_url = storage_url  # Local: misma URL

            # ── Guardar en DB ─────────────────────────────────
            photo = Photo(
                project_id=project_id,
                url=signed_url,
                original_filename=file.filename,
                order=next_order + idx,
                exif_stripped=True,
            )
            db.add(photo)
            created_photos.append(photo)

        db.commit()
        for p in created_photos:
            db.refresh(p)

        return PhotoUploadResponse(
            message=f"{len(created_photos)} foto(s) subida(s) correctamente.",
            photos=[PhotoResponse.model_validate(p) for p in created_photos],
            count=len(created_photos),
        )

    # ── Listar fotos ─────────────────────────────────────────────

    @staticmethod
    def list_photos(
        db: Session,
        project_id: str,
    ) -> List[PhotoResponse]:
        """
        Lista las fotos de un proyecto ordenadas por el campo `order`.

        Args:
            db: Sesión de base de datos.
            project_id: UUID del proyecto.

        Returns:
            Lista de PhotoResponse ordenadas.
        """
        # Verificar que el proyecto existe
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Proyecto {project_id} no encontrado.",
            )

        photos = (
            db.query(Photo)
            .filter(Photo.project_id == project_id)
            .order_by(Photo.order.asc())
            .all()
        )

        # ── Refrescar signed URLs si están expiradas ──────────
        use_supabase = bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY)
        result = []
        for photo in photos:
            if use_supabase:
                # Extraer path del storage desde la URL firmada o generar nueva
                photo.url = PhotoService._refresh_signed_url_sync(photo)
            result.append(PhotoResponse.model_validate(photo))

        return result

    # ── Reordenar ────────────────────────────────────────────────

    @staticmethod
    def reorder_photos(
        db: Session,
        project_id: str,
        photo_ids: List[str],
    ) -> List[PhotoResponse]:
        """
        Reordena las fotos de un proyecto.

        Valida que todos los IDs pertenezcan al proyecto y
        que no falte ni sobre ninguna foto.

        Args:
            db: Sesión de base de datos.
            project_id: UUID del proyecto.
            photo_ids: Lista de photo IDs en el nuevo orden.

        Returns:
            Lista de PhotoResponse en el nuevo orden.
        """
        # Verificar que el proyecto existe
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Proyecto {project_id} no encontrado.",
            )

        # Obtener todas las fotos del proyecto
        existing = (
            db.query(Photo)
            .filter(Photo.project_id == project_id)
            .all()
        )
        existing_ids = {p.id for p in existing}

        # Validar que todos los IDs enviados existen en el proyecto
        sent_ids = set(photo_ids)
        if sent_ids != existing_ids:
            missing = existing_ids - sent_ids
            extra = sent_ids - existing_ids
            detail_parts = []
            if missing:
                detail_parts.append(f"faltan: {', '.join(sorted(missing)[:5])}")
            if extra:
                detail_parts.append(f"no pertenecen al proyecto: {', '.join(sorted(extra)[:5])}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La lista no coincide con las fotos del proyecto: " + "; ".join(detail_parts),
            )

        # Actualizar orden
        photo_map = {p.id: p for p in existing}
        for new_order, photo_id in enumerate(photo_ids):
            photo_map[photo_id].order = new_order

        db.commit()
        for p in existing:
            db.refresh(p)

        # Devolver en orden
        sorted_photos = sorted(existing, key=lambda p: p.order)
        return [PhotoResponse.model_validate(p) for p in sorted_photos]

    # ── Eliminar ─────────────────────────────────────────────────

    @staticmethod
    def delete_photo(
        db: Session,
        photo_id: str,
    ) -> dict:
        """
        Elimina una foto de Storage y de la base de datos.

        Args:
            db: Sesión de base de datos.
            photo_id: UUID de la foto.

        Returns:
            Dict con mensaje de confirmación.
        """
        photo = db.query(Photo).filter(Photo.id == photo_id).first()
        if not photo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Foto {photo_id} no encontrada.",
            )

        # ── Eliminar de storage ───────────────────────────────
        use_supabase = bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY)

        # Extraer path del storage desde la URL
        storage_path = PhotoService._extract_storage_path(photo.url, photo.project_id, photo.id)

        if use_supabase and storage_path:
            PhotoService._delete_from_supabase_sync(storage_path)
        elif not use_supabase and storage_path:
            PhotoService._delete_from_local_sync(storage_path)

        # ── Eliminar de DB ────────────────────────────────────
        db.delete(photo)
        db.commit()

        return {"message": f"Foto {photo_id} eliminada correctamente."}

    # ── Helpers: Supabase Storage ─────────────────────────────────

    @staticmethod
    async def _upload_to_supabase(path: str, file_bytes: bytes) -> str:
        """Sube un archivo a Supabase Storage y devuelve la URL pública."""
        assert settings.SUPABASE_URL is not None, "SUPABASE_URL required for upload"
        supabase_url = settings.SUPABASE_URL.rstrip("/")
        service_key = settings.SUPABASE_SERVICE_ROLE_KEY
        bucket = STORAGE_BUCKET

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{supabase_url}/storage/v1/object/{bucket}/{path}",
                content=file_bytes,
                headers={
                    "Authorization": f"Bearer {service_key}",
                    "Content-Type": "image/webp",
                    "x-upsert": "true",
                },
            )

            if response.status_code not in (200, 201):
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Error al subir a Supabase Storage: {response.text[:200]}",
                )

            return f"{supabase_url}/storage/v1/object/public/{bucket}/{path}"

    @staticmethod
    async def _generate_signed_url(path: str) -> str:
        """Genera una URL firmada temporal (1 hora) para acceso seguro."""
        assert settings.SUPABASE_URL is not None, "SUPABASE_URL required for signed URL"
        supabase_url = settings.SUPABASE_URL.rstrip("/")
        service_key = settings.SUPABASE_SERVICE_ROLE_KEY
        bucket = STORAGE_BUCKET

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{supabase_url}/storage/v1/object/sign/{bucket}/{path}",
                json={"expiresIn": SIGNED_URL_EXPIRY},
                headers={
                    "Authorization": f"Bearer {service_key}",
                },
            )

            if response.status_code not in (200, 201):
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Error al generar URL firmada: {response.text[:200]}",
                )

            data = response.json()
            return data.get("signedURL", "")

    @staticmethod
    def _delete_from_supabase_sync(path: str) -> None:
        """Elimina un archivo de Supabase Storage (síncrono)."""
        import httpx as sync_httpx

        assert settings.SUPABASE_URL is not None, "SUPABASE_URL required for delete"
        supabase_url = settings.SUPABASE_URL.rstrip("/")
        service_key = settings.SUPABASE_SERVICE_ROLE_KEY
        bucket = STORAGE_BUCKET

        try:
            with sync_httpx.Client(timeout=15.0) as client:
                response = client.delete(
                    f"{supabase_url}/storage/v1/object/{bucket}/{path}",
                    headers={"Authorization": f"Bearer {service_key}"},
                )
                # 200 o 404 (ya eliminado) son aceptables
                if response.status_code not in (200, 404):
                    # Loggear pero no fallar: la foto ya se eliminó de DB
                    print(f"[WARN] No se pudo eliminar de Supabase: {response.text[:200]}")
        except Exception as exc:
            print(f"[WARN] Error al eliminar de Supabase: {exc}")

    # ── Helpers: Filesystem local (fallback) ───────────────────────

    @staticmethod
    async def _save_to_local(path: str, file_bytes: bytes) -> str:
        """Guarda un archivo en el filesystem local y devuelve la ruta relativa."""
        full_path = os.path.join(LOCAL_STORAGE_DIR, path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(file_bytes)
        return f"/storage/photos/{path}"

    @staticmethod
    def _delete_from_local_sync(path: str) -> None:
        """Elimina un archivo del filesystem local."""
        full_path = os.path.join(LOCAL_STORAGE_DIR, path)
        try:
            if os.path.exists(full_path):
                os.remove(full_path)
        except OSError as exc:
            print(f"[WARN] No se pudo eliminar archivo local: {exc}")

    # ── Helpers: URL parsing ───────────────────────────────────────

    @staticmethod
    def _extract_storage_path(
        url: str,
        project_id: str,
        photo_id: str,
    ) -> Optional[str]:
        """
        Extrae el path de storage desde una URL de Supabase o local.

        Para Supabase: https://xxx.supabase.co/storage/v1/object/public/bucket/path
        Para local: /storage/photos/path

        Returns:
            Path relativo dentro del bucket/carpeta, o None si no se puede extraer.
        """
        if not url:
            return None

        # Local
        if url.startswith("/storage/photos/"):
            return url[len("/storage/photos/"):]

        # Supabase signed URL
        if "/storage/v1/object/sign/" in url:
            # La URL firmada contiene el bucket y path; extraemos lo que hay después del bucket
            try:
                parts = url.split(f"/storage/v1/object/sign/{STORAGE_BUCKET}/")
                if len(parts) > 1:
                    # Quitar query params (token)
                    return parts[1].split("?")[0]
            except Exception:
                pass

        # Supabase public URL
        if f"/storage/v1/object/public/{STORAGE_BUCKET}/" in url:
            try:
                parts = url.split(f"/storage/v1/object/public/{STORAGE_BUCKET}/")
                if len(parts) > 1:
                    return parts[1].split("?")[0]
            except Exception:
                pass

        return None

    @staticmethod
    def _refresh_signed_url_sync(photo: Photo) -> str:
        """Refresca la signed URL de una foto si es necesario (síncrono)."""
        import httpx as sync_httpx

        assert settings.SUPABASE_URL is not None, "SUPABASE_URL required for refresh"

        storage_path = PhotoService._extract_storage_path(
            photo.url, photo.project_id, photo.id
        )
        if not storage_path:
            return photo.url

        supabase_url = settings.SUPABASE_URL.rstrip("/")
        service_key = settings.SUPABASE_SERVICE_ROLE_KEY
        bucket = STORAGE_BUCKET

        try:
            with sync_httpx.Client(timeout=15.0) as client:
                response = client.post(
                    f"{supabase_url}/storage/v1/object/sign/{bucket}/{storage_path}",
                    json={"expiresIn": SIGNED_URL_EXPIRY},
                    headers={"Authorization": f"Bearer {service_key}"},
                )
                if response.status_code in (200, 201):
                    data = response.json()
                    return data.get("signedURL", photo.url)
        except Exception:
            pass

        return photo.url
