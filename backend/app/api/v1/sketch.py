"""
Router: /api/v1/sketch  — Generador de boceto vectorial (SVG)

Reemplaza la dependencia de OpenAI/FAL con un generador interno
que convierte el JSON del diseño en un croquis SVG escalable.

Flujo:
  POST /api/v1/sketch
    ← {"elements": [{"type":"rect","x":...,"y":...,...}, ...],
       "width": 800, "height": 600, "style": "hand-drawn"}

    → Response(content=svg_as_string, media_type="image/svg+xml")"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import svgwrite

router = APIRouter(tags=["sketch"])

# ── Schema de entrada ──────────────────────────────────────────────

class SketchElement(BaseModel):
    type: str  # "rect" | "line" | "circle" | "path" | "text"
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    rx: Optional[float] = 0  # radio de esquina
    x1: Optional[float] = None
    y1: Optional[float] = None
    x2: Optional[float] = None
    y2: Optional[float] = None
    r: Optional[float] = None
    text: Optional[str] = None
    stroke: Optional[str] = "#000000"
    stroke_width: Optional[float] = 2
    fill: Optional[str] = "none"
    roughness: Optional[int] = 2  # 0 = líneas limpias; 1-3 = aspecto boceto


class SketchRequest(BaseModel):
    elements: List[SketchElement] = Field(..., description="Lista de elementos del canvas")
    width: int = Field(800, description="Ancho del SVG en px")
    height: int = Field(600, description="Alto del SVG en px")
    style: Optional[Literal["clean", "hand-drawn"]] = "hand-drawn"
    background_color: Optional[str] = "#ffffff"


# ── Generador de boceto ────────────────────────────────────────────

def _apply_roughness(element: SketchElement, dwg_attrs: dict) -> dict:
    """Aplica un pequeño desplazamiento aleatorio para simular un trazo a mano."""
    if element.roughness and element.roughness > 0:
        import random
        random.seed(0)
        offset_x = random.uniform(-element.roughness, element.roughness)
        offset_y = random.uniform(-element.roughness, element.roughness)
        if element.type == "line":
            if "start" in dwg_attrs:
                sx, sy = dwg_attrs["start"]
                ex, ey = dwg_attrs["end"]
                dwg_attrs["start"] = (sx + offset_x, sy + offset_y)
                dwg_attrs["end"] = (ex + offset_x, ey + offset_y)
        else:
            dwg_attrs["x"] = dwg_attrs.get("x", dwg_attrs.get("insert", (0, 0))[0]) + offset_x
            dwg_attrs["y"] = dwg_attrs.get("y", dwg_attrs.get("insert", (0, 0))[1]) + offset_y
        # Línea más gruesa y discontinua para boceto
        dwg_attrs["stroke-dasharray"] = f"4,{element.roughness}"
        dwg_attrs["stroke-width"] = (dwg_attrs.get("stroke-width", 2) or 2) + element.roughness
    return dwg_attrs


def build_svg(request: SketchRequest) -> str:
    """Construye el SVG a partir de los elementos recibidos."""
    dwg = svgwrite.Drawing(
        size=(f"{request.width}px", f"{request.height}px"),
        profile="tiny",
    )

    # Fondo
    if request.background_color and request.background_color != "transparent":
        dwg.add(dwg.rect(
            insert=(0, 0),
            size=(request.width, request.height),
            fill=request.background_color,
        ))

    for el in request.elements:
        try:
            if el.type == "rect":
                attrs = {
                    "insert": (el.x or 0, el.y or 0),
                    "size": (el.width or 0, el.height or 0),
                    "rx": el.rx or 0,
                    "stroke": el.stroke or "#000",
                    "stroke-width": el.stroke_width or 2,
                    "fill": el.fill or "none",
                }
                if el.roughness and el.roughness > 0:
                    import random; random.seed(0)
                    ox = random.uniform(-el.roughness, el.roughness)
                    oy = random.uniform(-el.roughness, el.roughness)
                    sx, sy = attrs["insert"]
                    attrs["insert"] = (sx + ox, sy + oy)
                    attrs["stroke-dasharray"] = f"4,{el.roughness}"
                    attrs["stroke-width"] += el.roughness
                dwg.add(dwg.rect(**attrs))

            elif el.type == "line":
                attrs = {
                    "start": (el.x1 or 0, el.y1 or 0),
                    "end": (el.x2 or 0, el.y2 or 0),
                    "stroke": el.stroke or "#000",
                    "stroke-width": el.stroke_width or 2,
                }
                if el.roughness and el.roughness > 0:
                    import random; random.seed(0)
                    ox = random.uniform(-el.roughness, el.roughness)
                    oy = random.uniform(-el.roughness, el.roughness)
                    sx, sy = attrs["start"]
                    ex, ey = attrs["end"]
                    attrs["start"] = (sx + ox, sy + oy)
                    attrs["end"] = (ex + ox, ey + oy)
                    attrs["stroke-dasharray"] = f"4,{el.roughness}"
                    attrs["stroke-width"] += el.roughness
                dwg.add(dwg.line(**attrs))

            elif el.type == "circle":
                attrs = {
                    "center": (el.x or 0, el.y or 0),
                    "r": el.r or 10,
                    "stroke": el.stroke or "#000",
                    "stroke-width": el.stroke_width or 2,
                    "fill": el.fill or "none",
                }
                attrs = _apply_roughness(el, attrs)
                dwg.add(dwg.circle(**attrs))

            elif el.type == "text":
                dwg.add(dwg.text(
                    el.text or "",
                    insert=(el.x or 0, el.y or 0),
                    fill=el.stroke or "#000",
                    font_size=f"{el.stroke_width * 6}px" if el.stroke_width else "12px",
                ))

            elif el.type == "path":
                d = el.text or ""
                dwg.add(dwg.path(
                    d=d,
                    stroke=el.stroke or "#000",
                    stroke_width=el.stroke_width or 2,
                    fill=el.fill or "none",
                ))

        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Error dibujando {el.type}: {exc}")

    return dwg.tostring()


# ── Endpoint ────────────────────────────────────────────────────────

@router.post("/sketch", summary="Generar boceto vectorial (SVG)")
async def generate_sketch(request: SketchRequest):
    """Convierte el diseño del canvas en un croquis SVG vectorial sin depender
    de APIs externas de IA. El resultado es escalable y ultraligero."""
    svg_string = build_svg(request)
    return Response(
        content=svg_string,
        media_type="image/svg+xml",
        headers={"Cache-Control": "public, max-age=300"},
    )
