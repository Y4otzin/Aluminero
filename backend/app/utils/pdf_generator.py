"""
Utilidad para generar PDFs de cotización usando WeasyPrint.

Construye el HTML completo (Jinja2) con:
- Encabezado/logo "ALUMINERO"
- Datos del proyecto y cliente
- Tabla de presupuesto (materiales, mano de obra, subtotal, IVA, total)
- Boceto SVG embebido
- Firma digital si existe
- Código QR con link de verificación
- Footer con fecha, folio y términos
"""

import io
import os
import base64
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config.settings import settings
from app.models.project import Project
from app.models.budget import Budget, LaborCost
from app.models.signature import Signature
from app.models.catalog import Hardware


# ── Carpeta donde se guardan los PDFs generados ──────────────────────
PDF_STORAGE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "generated_pdfs",
)


def _ensure_storage_dir() -> str:
    """Crea la carpeta de PDFs si no existe y devuelve la ruta."""
    os.makedirs(PDF_STORAGE_DIR, exist_ok=True)
    return PDF_STORAGE_DIR


def generate_qr_svg(quote_id: str) -> str:
    """
    Genera un código QR en formato SVG con el link de verificación.
    Se usa un enfoque simple con módulos de 3x3 para no depender
    de librerías externas (qrcode, qrcodegen, etc.).
    """
    base_url = os.getenv("VERIFICATION_BASE_URL", "https://aluminero.app/verify")
    verification_url = f"{base_url}/{quote_id}"

    try:
        import qrcode
        from qrcode.image.svg import SvgPathImage

        qr = qrcode.QRCode(box_size=4, border=2)
        qr.add_data(verification_url)
        qr.make(fit=True)
        img = qr.make_image(image_factory=SvgPathImage)
        svg_buffer = io.BytesIO()
        img.save(svg_buffer)
        return svg_buffer.getvalue().decode("utf-8")
    except ImportError:
        # Fallback minimalista: SVG placeholder
        return f"""<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"
             viewBox="0 0 100 100">
          <rect width="100" height="100" fill="white" rx="4"/>
          <text x="50" y="55" text-anchor="middle" font-size="8" fill="#666">
            QR
          </text>
          <text x="50" y="68" text-anchor="middle" font-size="6" fill="#999">
            {quote_id[:8]}
          </text>
        </svg>"""


def render_quote_html(
    project: Project,
    budget: Budget,
    signature: Optional[Signature] = None,
    svg_content: Optional[str] = None,
    quote_id: Optional[str] = None,
    folio: Optional[str] = None,
) -> str:
    """
    Genera el HTML para el PDF de cotización usando Jinja2 templates
    o generación directa de strings.
    """
    # Datos de hardware asociados
    hardware_items = budget.hardware if hasattr(budget, "hardware") else []
    hardware_rows = ""
    for hw in hardware_items:
        name = hw.name if hasattr(hw, "name") else str(hw)
        qty = budget.quantity
        price = getattr(hw, "price_per_unit", 0) or 0
        total = round(price * qty, 2)
        hardware_rows += f"""
        <tr>
            <td>{name}</td>
            <td class="center">{qty}</td>
            <td class="right">${price:,.2f}</td>
            <td class="right">${total:,.2f}</td>
        </tr>"""

    total_material = budget.material_cost or 0.0
    total_labor = budget.labor_cost or 0.0
    subtotal = budget.subtotal or 0.0
    tax = budget.tax or 0.0
    total = budget.total or 0.0
    discount_pct = budget.discount_pct or 0.0

    # Boceto SVG embebido
    sketch_html = ""
    if svg_content:
        # Codificar SVG en base64 para incrustar como data URI
        svg_b64 = base64.b64encode(svg_content.encode("utf-8")).decode("utf-8")
        sketch_html = f"""
        <div class="section">
            <h2>Boceto del proyecto</h2>
            <div class="sketch-container">
                <img src="data:image/svg+xml;base64,{svg_b64}"
                     alt="Boceto del proyecto"
                     style="max-width: 100%; max-height: 400px;" />
            </div>
        </div>"""

    # Firma digital
    signature_html = ""
    if signature and signature.signature_image:
        sig_b64 = signature.signature_image
        if not sig_b64.startswith("data:"):
            sig_b64 = f"data:image/png;base64,{sig_b64}"
        signed_at_str = ""
        if signature.signed_at:
            signed_at_str = signature.signed_at.strftime("%d/%m/%Y %H:%M UTC")
        signature_html = f"""
        <div class="section signature-section">
            <h2>Firma digital</h2>
            <div class="signature-box">
                <div class="signature-image">
                    <img src="{sig_b64}" alt="Firma" style="max-height: 80px;" />
                </div>
                <div class="signature-info">
                    <p><strong>Firmante:</strong> {signature.signer_name or "—"}</p>
                    <p><strong>Email:</strong> {signature.signer_email or "—"}</p>
                    <p><strong>Fecha:</strong> {signed_at_str}</p>
                </div>
            </div>
        </div>"""

    # Código QR
    qr_svg = ""
    if quote_id:
        qr_svg = generate_qr_svg(quote_id)

    # Folio
    today_str = datetime.now(timezone.utc).strftime("%d/%m/%Y")
    if not folio:
        folio = f"COT-{project.id[:8].upper()}-{budget.version}"

    # Desglose con descuento
    discount_html = ""
    if discount_pct > 0:
        discount_amount = round(subtotal * (discount_pct / 100), 2)
        discount_html = f"""
        <tr>
            <td colspan="3" class="right"><strong>Descuento ({discount_pct:.0f}%)</strong></td>
            <td class="right" style="color: #d32f2f;">-${discount_amount:,.2f}</td>
        </tr>"""

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<style>
    @page {{
        size: letter;
        margin: 2cm 1.5cm;
        @bottom-center {{
            content: "Página " counter(page) " de " counter(pages);
            font-size: 9px;
            color: #888;
        }}
    }}
    body {{
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-size: 11pt;
        color: #222;
        line-height: 1.5;
    }}
    .header {{
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 3px solid #1a237e;
        padding-bottom: 15px;
        margin-bottom: 20px;
    }}
    .header .logo h1 {{
        font-size: 28pt;
        color: #1a237e;
        margin: 0;
        letter-spacing: 2px;
        font-weight: 900;
    }}
    .header .logo .subtitle {{
        font-size: 9pt;
        color: #666;
        margin-top: -5px;
    }}
    .header .folio {{
        text-align: right;
        font-size: 10pt;
    }}
    .header .folio strong {{
        color: #1a237e;
    }}
    .folio-number {{
        font-size: 14pt;
        font-weight: bold;
        color: #1a237e;
    }}
    .section {{
        margin-bottom: 20px;
    }}
    .section h2 {{
        font-size: 13pt;
        color: #1a237e;
        border-bottom: 1px solid #ddd;
        padding-bottom: 5px;
        margin-bottom: 10px;
    }}
    .info-grid {{
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
    }}
    .info-item {{
        flex: 1 1 45%;
        margin-bottom: 5px;
    }}
    .info-item .label {{
        font-size: 9pt;
        color: #888;
        display: block;
    }}
    .info-item .value {{
        font-weight: bold;
        font-size: 11pt;
    }}
    table {{
        width: 100%;
        border-collapse: collapse;
        margin: 10px 0;
    }}
    th {{
        background-color: #1a237e;
        color: white;
        padding: 8px 10px;
        text-align: left;
        font-size: 10pt;
    }}
    td {{
        padding: 7px 10px;
        border-bottom: 1px solid #eee;
        font-size: 10pt;
    }}
    th.right, td.right {{
        text-align: right;
    }}
    th.center, td.center {{
        text-align: center;
    }}
    .total-row td {{
        font-weight: bold;
        border-top: 2px solid #1a237e;
        border-bottom: 2px solid #1a237e;
    }}
    .grand-total td {{
        font-weight: bold;
        font-size: 13pt;
        color: #1a237e;
        background-color: #e8eaf6;
        border-top: 3px solid #1a237e;
        border-bottom: 3px solid #1a237e;
    }}
    .sketch-container {{
        text-align: center;
        padding: 10px;
        background-color: #fafafa;
        border: 1px solid #ddd;
        border-radius: 4px;
    }}
    .signature-box {{
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 15px;
        background-color: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 4px;
    }}
    .signature-info p {{
        margin: 3px 0;
    }}
    .qr-section {{
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 10px;
    }}
    .qr-section .qr-text {{
        font-size: 8pt;
        color: #888;
        text-align: right;
    }}
    .footer {{
        border-top: 1px solid #ddd;
        padding-top: 10px;
        margin-top: 20px;
        font-size: 8pt;
        color: #888;
    }}
    .footer p {{
        margin: 2px 0;
    }}
    .terms {{
        font-size: 8.5pt;
        color: #555;
        margin-top: 15px;
        padding: 10px;
        background-color: #fafafa;
        border-left: 3px solid #1a237e;
    }}
    .badge {{
        display: inline-block;
        padding: 3px 8px;
        background-color: #e8eaf6;
        color: #1a237e;
        border-radius: 3px;
        font-size: 9pt;
        font-weight: bold;
    }}
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
    <div class="logo">
        <h1>ALUMINERO</h1>
        <div class="subtitle">Soluciones en Aluminio</div>
    </div>
    <div class="folio">
        <div class="folio-number">{folio}</div>
        <div style="font-size:9pt;color:#888;">{today_str}</div>
    </div>
</div>

<!-- DATOS DEL PROYECTO -->
<div class="section">
    <h2>Datos del proyecto</h2>
    <div class="info-grid">
        <div class="info-item">
            <span class="label">Cliente</span>
            <span class="value">{project.client_name or "—"}</span>
        </div>
        <div class="info-item">
            <span class="label">Email</span>
            <span class="value">{project.client_email or "—"}</span>
        </div>
        <div class="info-item">
            <span class="label">Teléfono</span>
            <span class="value">{project.client_phone or "—"}</span>
        </div>
        <div class="info-item">
            <span class="label">Tipo de proyecto</span>
            <span class="value"><span class="badge">{project.project_type or "—"}</span></span>
        </div>
        <div class="info-item">
            <span class="label">Dimensiones</span>
            <span class="value">{project.height_m:.2f}m × {project.width_m:.2f}m</span>
        </div>
        <div class="info-item">
            <span class="label">Cantidad</span>
            <span class="value">{project.quantity}</span>
        </div>
        <div class="info-item">
            <span class="label">Área total</span>
            <span class="value">{budget.area_m2:.2f} m²</span>
        </div>
        <div class="info-item">
            <span class="label">Versión de presupuesto</span>
            <span class="value">#{budget.version}</span>
        </div>
    </div>
</div>

<!-- TABLA DE PRESUPUESTO -->
<div class="section">
    <h2>Detalle del presupuesto</h2>

    <table>
        <thead>
            <tr>
                <th>Concepto</th>
                <th class="center">Cantidad</th>
                <th class="right">Precio unitario</th>
                <th class="right">Total</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Material (aluminio, acabado, vidrio)</td>
                <td class="center">{budget.area_m2:.2f} m²</td>
                <td class="right">${total_material / budget.area_m2:,.2f} /m²</td>
                <td class="right">${total_material:,.2f}</td>
            </tr>
            {hardware_rows}
            <tr>
                <td>Mano de obra</td>
                <td class="center">{budget.area_m2:.2f} m²</td>
                <td class="right">${total_labor / budget.area_m2:,.2f} /m²</td>
                <td class="right">${total_labor:,.2f}</td>
            </tr>
        </tbody>
    </table>

    <table>
        <tbody>
            {discount_html}
            <tr class="total-row">
                <td colspan="3" class="right"><strong>Subtotal</strong></td>
                <td class="right">${subtotal:,.2f}</td>
            </tr>
            <tr>
                <td colspan="3" class="right">IVA (16%)</td>
                <td class="right">${tax:,.2f}</td>
            </tr>
            <tr class="grand-total">
                <td colspan="3" class="right">TOTAL</td>
                <td class="right">${total:,.2f}</td>
            </tr>
        </tbody>
    </table>
</div>

<!-- BOCETO SVG -->
{sketch_html}

<!-- FIRMA DIGITAL -->
{signature_html}

<!-- CÓDIGO QR -->
{qr_svg}

<!-- TÉRMINOS Y CONDICIONES -->
<div class="terms">
    <strong>Términos y condiciones:</strong>
    <p>1. Esta cotización tiene una validez de 15 días naturales a partir de la fecha de emisión.</p>
    <p>2. Los precios incluyen IVA (16%) y no incluyen flete ni instalación salvo que se especifique lo contrario.</p>
    <p>3. El pago se realiza contra factura; se requiere 50% de anticipo para iniciar producción.</p>
    <p>4. Una vez firmada esta cotización, el proyecto queda aprobado y no se aceptan cambios en las especificaciones.</p>
    <p>5. El tiempo estimado de entrega se confirmará al momento de la aceptación.</p>
</div>

<!-- FOOTER -->
<div class="footer">
    <p><strong>ALUMINERO</strong> — Soluciones en Aluminio</p>
    <p>Folio: {folio} | Emitido: {today_str}</p>
    <p>Verifique esta cotización en: {os.getenv("VERIFICATION_BASE_URL", "https://aluminero.app/verify")}/{quote_id if quote_id else "—"}</p>
</div>

</body>
</html>"""
    return html


def generate_pdf_bytes(html_content: str) -> bytes:
    """Convierte HTML a PDF usando WeasyPrint."""
    from weasyprint import HTML as WeasyprintHTML

    pdf_bytes = WeasyprintHTML(string=html_content).write_pdf()
    return pdf_bytes


def save_pdf(pdf_bytes: bytes, filename: str) -> str:
    """
    Guarda el PDF en el sistema de archivos local.
    Devuelve la ruta absoluta del archivo guardado.
    """
    storage_dir = _ensure_storage_dir()
    filepath = os.path.join(storage_dir, filename)
    with open(filepath, "wb") as f:
        f.write(pdf_bytes)
    return filepath


def get_pdf_path(filename: str) -> str:
    """Devuelve la ruta completa a un archivo PDF por nombre."""
    return os.path.join(PDF_STORAGE_DIR, filename)
