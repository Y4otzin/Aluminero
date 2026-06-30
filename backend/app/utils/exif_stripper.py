"""
Utilidad de limpieza EXIF/GPS para imágenes con Pillow.

Seguridad: TODAS las imágenes deben pasar por este limpiador antes de
almacenarse, eliminando metadatos de ubicación, cámara, fecha, etc.
Además, se comprimen a WebP con calidad 85% para reducir tamaño.
"""

import io
from PIL import Image


def strip_exif(image_bytes: bytes) -> bytes:
    """
    Elimina todos los metadatos EXIF/GPS de una imagen y la comprime a WebP.

    Args:
        image_bytes: Bytes crudos de la imagen original (JPEG, PNG, WebP, etc.).

    Returns:
        Bytes limpios de la imagen en formato WebP (calidad 85%).

    Raises:
        ValueError: Si la imagen no puede ser procesada (formato no soportado, corrupta).
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))

        # ── Convertir a RGB (elimina EXIF, alpha, paletas, etc.) ──
        # Al convertir a RGB, Pillow descarta todos los metadatos EXIF/GPS/ICC.
        if img.mode in ("RGBA", "LA", "P"):
            # Crear fondo blanco para imágenes con transparencia
            background = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            background.paste(
                img, mask=img.split()[-1] if img.mode == "RGBA" else None
            )
            img = background
        elif img.mode not in ("RGB",):
            img = img.convert("RGB")

        # ── Comprimir a WebP con calidad 85% ────────────────────
        output = io.BytesIO()
        img.save(output, format="WEBP", quality=85)
        return output.getvalue()

    except Exception as exc:
        raise ValueError(f"No se pudo procesar la imagen: {exc}") from exc
