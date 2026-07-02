"""Test de imports del Sprint 10 - Producción."""
import sys
sys.path.insert(0, "/Users/plascenciadvsa/Documents/Plataforma Aluminero/plataforma-herreria-aluminio/backend")

from app.models.production import ProductionOrder, ProductionOrderStatus, ProductionEvent, ProductionStatusHistory
from app.schemas.production import (
    ProductionOrderResponse, ProductionEventResponse, ProductionKanbanResponse,
    ProductionAssignRequest, ProductionNoteRequest, ProductionStatusUpdateRequest,
    ProductionOrdersListResponse, ProductionSummaryResponse, ProductionTriggerResponse,
)
from app.services.production_service import ProductionService, _generate_order_number
from app.repositories.production_repository import ProductionRepository

print("✅ Todos los imports de producción funcionan correctamente")
print(f"✅ ProductionOrderStatus: {[e.value for e in ProductionOrderStatus]}")
print(f"✅ ProductionService métodos: {[m for m in dir(ProductionService) if not m.startswith('_')]}")
print(f"✅ ProductionRepository métodos: {[m for m in dir(ProductionRepository) if not m.startswith('_')]}")
print(f"✅ ProductionOrder tablas: {ProductionOrder.__tablename__}, {ProductionEvent.__tablename__}, {ProductionStatusHistory.__tablename__}")

# Validar schemas
req = ProductionAssignRequest(user_id="test-uuid")
print(f"✅ ProductionAssignRequest: {req.model_dump()}")

note = ProductionNoteRequest(description="Test nota")
print(f"✅ ProductionNoteRequest: {note.model_dump()}")

status_upd = ProductionStatusUpdateRequest(status="en_proceso")
print(f"✅ ProductionStatusUpdateRequest: {status_upd.model_dump()}")

# Verificar que el service de signature importa correctamente
from app.services.signature_service import SignatureService
print("✅ SignatureService importa correctamente con integración de producción")

# Verificar main.py
from main import app
routes = [r.path for r in app.routes]
production_routes = [r for r in routes if "production" in r]
print(f"✅ Rutas de producción registradas en main.py: {production_routes}")

print("\n🎉 Sprint 10 - Producción: TODO OK")
