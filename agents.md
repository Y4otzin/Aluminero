# 📄 agente.md - Plataforma Inteligente de Cotización y Producción

```markdown
# 🎯 AGENTE DE DESARROLLO - Plataforma Herrería Aluminio

## 📋 CONTEXTO DEL PROYECTO

**Nombre:** Plataforma Inteligente de Cotización y Producción para Herrería de Aluminio  
**Referencia:** ALU-TA-2025-01  
**Duración:** 16 semanas (4 fases de 4 semanas)  
**Stack Tecnológico:** Next.js 18 + FastAPI + PostgreSQL + Supabase  

### 🎯 Objetivo Principal
Unificar el ciclo comercial y productivo de empresas de herrería de aluminio mediante una plataforma web que integre:
- Gestión de proyectos y clientes
- Cotización automática con IA generativa
- Firma digital con trazabilidad legal
- Liberación automática a producción

### 📊 Métricas de Éxito
- Reducción del 70% en tiempo de cotización
- Aumento del 25% en tasa de cierre (por renders IA)
- Reducción del 80% en errores de producción
- Eliminación de disputas sin evidencia

---

## 🏗️ ARQUITECTURA Y ESTRUCTURA

### Frontend (Next.js 18 + TypeScript)
```
/frontend
├── /app
│   ├── /auth
│   │   ├── /login
│   │   ├── /register
│   │   └── /forgot-password
│   ├── /dashboard
│   │   ├── /projects
│   │   ├── /production
│   │   └── /admin
│   ├── /project
│   │   ├── /[id]
│   │   │   ├── /details
│   │   │   ├── /photos
│   │   │   ├── /budget
│   │   │   ├── /render
│   │   │   ├── /quote
│   │   │   └── /sign
│   │   └── /new
│   └── /api (API routes)
├── /components
│   ├── /ui (shadcn/ui)
│   ├── /forms
│   ├── /signature (Fabric.js)
│   └── /render-viewer
├── /lib
│   ├── /api (API client)
│   ├── /utils
│   └── /hooks
└── /public
```

### Backend (FastAPI + Python)
```
/backend
├── /app
│   ├── /api
│   │   ├── /v1
│   │   │   ├── /auth
│   │   │   ├── /users
│   │   │   ├── /projects
│   │   │   ├── /photos
│   │   │   ├── /budget
│   │   │   ├── /render
│   │   │   ├── /quote
│   │   │   ├── /signature
│   │   │   └── /production
│   │   └── /dependencies
│   ├── /core
│   │   ├── /config
│   │   ├── /security
│   │   ├── /database
│   │   └── /exceptions
│   ├── /models
│   │   ├── /user.py
│   │   ├── /project.py
│   │   ├── /photo.py
│   │   ├── /budget.py
│   │   ├── /render.py
│   │   ├── /signature.py
│   │   └── /production.py
│   ├── /schemas
│   ├── /services
│   │   ├── /auth_service.py
│   │   ├── /project_service.py
│   │   ├── /photo_service.py
│   │   ├── /budget_service.py
│   │   ├── /ai_service.py
│   │   ├── /pdf_service.py
│   │   ├── /signature_service.py
│   │   └── /production_service.py
│   ├── /repositories
│   └── /utils
│       ├── /exif_stripper.py
│       ├── /pdf_generator.py
│       └── /email_sender.py
├── /alembic
│   ├── /versions
│   └── env.py
├── /tests
└── main.py
```

### Base de Datos (PostgreSQL)
```sql
-- Tablas principales
users (id, email, password_hash, role, created_at, updated_at)
roles (id, name, permissions)
sessions (id, user_id, token, expires_at, ip_address, user_agent)
projects (id, client_name, client_email, client_phone, project_type, 
          dimensions, notes, status, created_by, created_at, updated_at)
photos (id, project_id, url, order, exif_stripped, created_at)
budgets (id, project_id, aluminum_series, finish, glass_type, hardware, 
         area, material_cost, labor_cost, subtotal, tax, total, version, created_at)
renders (id, project_id, prompt, image_url, original_photo_id, version, created_at)
quotes (id, project_id, budget_id, render_id, pdf_url, status, created_at)
signatures (id, quote_id, signature_image, signer_name, signer_ip, 
            signed_at, user_agent, status)
production_orders (id, project_id, quote_id, signature_id, status, 
                   assigned_to, created_at, updated_at)
```

---

## 🎯 REGLAS DE NEGOCIO CRÍTICAS

### 1. Seguridad y Privacidad
- **EXIF/GPS:** TODAS las imágenes deben tener metadatos eliminados antes de almacenamiento
- **Firma Digital:** Debe registrar IP, timestamp UTC, user-agent y email del firmante
- **JWT:** Access tokens (15 min) + Refresh tokens (7 días)
- **RBAC:** 4 roles estrictos (admin, vendedor, producción, cliente)
- **HTTPS:** Obligatorio en todos los endpoints
- **Rate Limiting:** 100 req/min por usuario, 10 req/min para IA

### 2. Flujo de Estados del Proyecto
```
Borrador → En Cotización → Cotización Enviada → Pendiente de Firma 
→ Aprobado → En Producción → Terminado → Entregado
                                    ↓
                              Rechazado
```

### 3. Validaciones de Negocio
- **Proyectos:** No se pueden editar después de firma digital
- **Presupuestos:** Precio mínimo = costo + 20% margen
- **Renders:** Máximo 5 generaciones por proyecto (control de costos API)
- **Firma:** Requiere al menos 1 render y 1 presupuesto aprobado
- **Producción:** Se genera automáticamente al firmar, no manualmente

### 4. Cálculos de Presupuesto
```python
# Fórmula base
area_m2 = (alto_m * ancho_m) * cantidad
material_cost = (precio_aluminio_m2 + precio_vidrio_m2) * area_m2
hardware_cost = precio_herrajes * cantidad
labor_cost = costo_mano_obra_m2 * area_m2
subtotal = material_cost + hardware_cost + labor_cost
tax = subtotal * 0.16  # IVA 16%
total = subtotal + tax
```

---

## 🚨 RESTRICCIONES Y LÍMITES

### NO HACER
❌ Almacenar imágenes sin eliminar EXIF/GPS  
❌ Permitir edición de proyectos después de firma  
❌ Generar PDF sin render y presupuesto completos  
❌ Enviar notificaciones sin validación de email  
❌ Usar APIs de IA sin control de costos  
❌ Hardcodear precios o tarifas (siempre desde DB)  
❌ Exponer datos sensibles en logs  
❌ Permitir firma sin confirmar por email  
❌ Crear orden de producción sin firma válida  
❌ Usar tokens JWT sin expiración  

### SIEMPRE HACER
✅ Validar todos los inputs (backend + frontend)  
✅ Usar transacciones DB para operaciones críticas  
✅ Registrar logs de auditoría (quién, cuándo, qué)  
✅ Implementar retry logic para APIs externas  
✅ Comprimir imágenes antes de almacenamiento  
✅ Versionar presupuestos y renders  
✅ Notificar cambios de estado por email  
✅ Implementar tests unitarios (cobertura >80%)  
✅ Documentar todos los endpoints (OpenAPI)  
✅ Usar variables de entorno para secretos  

---

## 🎨 ESTÁNDARES DE CÓDIGO

### Frontend (React/Next.js)
```typescript
// Componentes funcionales con TypeScript
interface ProjectCardProps {
  project: Project;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  onEdit, 
  onDelete 
}) => {
  // Implementación
}

// Hooks personalizados
export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchProjects().then(data => {
      setProjects(data);
      setLoading(false);
    });
  }, []);
  
  return { projects, loading };
}
```

### Backend (FastAPI)
```python
# Endpoints con validación Pydantic
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])

@router.post("/", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validaciones
    if not project_data.client_email:
        raise HTTPException(status_code=400, detail="Email requerido")
    
    # Lógica de negocio
    project = ProjectService.create(db, project_data, current_user.id)
    
    # Auditoría
    AuditLogger.log(f"Proyecto creado: {project.id}")
    
    return project

# Servicios con inyección de dependencias
class ProjectService:
    @staticmethod
    def create(db: Session, data: ProjectCreate, user_id: int) -> Project:
        # Implementación
        pass
```

### Base de Datos (SQLAlchemy)
```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String(100), nullable=False)
    client_email = Column(String(100), nullable=False)
    project_type = Column(String(50), nullable=False)
    status = Column(String(20), default="draft")
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relaciones
    photos = relationship("Photo", back_populates="project")
    budgets = relationship("Budget", back_populates="project")
```

---

## 🧪 TESTING Y CALIDAD

### Tests Unitarios (Obligatorios)
```python
# tests/test_budget_service.py
import pytest
from app.services.budget_service import BudgetService

def test_calculate_budget_basic():
    """Test cálculo básico de presupuesto"""
    budget_data = {
        "area_m2": 10.5,
        "aluminum_price": 150.0,
        "glass_price": 200.0,
        "hardware_cost": 500.0,
        "labor_cost_per_m2": 80.0
    }
    
    result = BudgetService.calculate(budget_data)
    
    assert result["material_cost"] == 3675.0
    assert result["labor_cost"] == 840.0
    assert result["subtotal"] == 5015.0
    assert result["tax"] == 802.4
    assert result["total"] == 5817.4

def test_budget_minimum_margin():
    """Test validación de margen mínimo"""
    # Implementación
    pass
```

### Tests de Integración
```python
# tests/integration/test_signature_flow.py
def test_complete_signature_flow(client, auth_headers):
    """Test flujo completo de firma digital"""
    # 1. Crear proyecto
    project = create_project(client, auth_headers)
    
    # 2. Subir fotos
    photos = upload_photos(client, project["id"])
    
    # 3. Generar presupuesto
    budget = create_budget(client, project["id"])
    
    # 4. Generar render IA
    render = generate_render(client, project["id"])
    
    # 5. Generar PDF
    quote = generate_quote(client, project["id"])
    
    # 6. Firmar
    signature = sign_quote(client, quote["id"], {
        "signature_image": "base64_data",
        "signer_name": "Juan Pérez",
        "signer_email": "juan@example.com"
    })
    
    # 7. Verificar orden de producción creada
    production_order = get_production_order(client, project["id"])
    assert production_order is not None
    assert production_order["status"] == "pending"
```

### Métricas de Calidad
- **Cobertura de tests:** >80%
- **Tiempo de respuesta API:** <500ms (p95)
- **Disponibilidad:** 99.5% uptime
- **Errores en producción:** <0.1% de requests
- **Performance Lighthouse:** >90 en todas las métricas

---

## 🚀 DEPLOYMENT Y DEVOPS

### Variables de Entorno
```bash
# .env.example
DATABASE_URL=postgresql://user:pass@localhost:5432/aluminio_db
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

OPENAI_API_KEY=sk-...
STABILITY_API_KEY=sk-...

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-key
SUPABASE_BUCKET=project-images

SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=re_...

SENTRY_DSN=https://xxx@sentry.io/xxx
ENVIRONMENT=production
```

### CI/CD Pipeline (GitHub Actions)
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Run tests
        run: |
          cd backend
          pytest --cov=app --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          # Deploy script
          echo "Deploying to production..."
```

### Monitoreo
```python
# app/core/monitoring.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    integrations=[
        FastApiIntegration(),
        SqlalchemyIntegration(),
    ],
    traces_sample_rate=0.1,
    environment=os.getenv("ENVIRONMENT", "development")
)
```

---

## 📚 DOCUMENTACIÓN

### API Documentation (OpenAPI)
```python
# main.py
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

app = FastAPI(
    title="Plataforma Herrería Aluminio",
    description="Sistema integral de cotización y producción",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="Plataforma Herrería Aluminio API",
        version="1.0.0",
        description="API REST para gestión de proyectos, cotizaciones y producción",
        routes=app.routes,
    )
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi
```

### README.md del Proyecto
```markdown
# Plataforma Inteligente de Cotización y Producción

## 🚀 Inicio Rápido

### Prerequisitos
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Docker (opcional)

### Instalación Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o
venv\Scripts\activate  # Windows

pip install -r requirements.txt
cp .env.example .env
# Editar .env con tus credenciales

alembic upgrade head
uvicorn main:app --reload
```

### Instalación Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## 📖 Documentación API
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🧪 Tests
```bash
cd backend
pytest --cov=app
```

## 🐳 Docker
```bash
docker-compose up -d
```
```

---

## 🎯 CHECKLIST DE ÉXITO POR FASE

### Fase 1: Cimientos (Semanas 1-4)
- [ ] Autenticación completa (login, registro, recuperación)
- [ ] CRUD de proyectos funcional
- [ ] Carga de imágenes con eliminación EXIF
- [ ] Sistema de roles y permisos
- [ ] Tests unitarios >80%
- [ ] Documentación API completa

### Fase 2: Presupuestación (Semanas 5-8)
- [ ] Catálogos configurables (aluminio, vidrio, herrajes)
- [ ] Cálculo automático de costos
- [ ] Panel de administración de tarifas
- [ ] Validaciones de precios
- [ ] Historial de presupuestos
- [ ] Tests de integración

### Fase 3: IA + PDF (Semanas 9-12)
- [ ] Integración API IA funcional
- [ ] Generación de prompts automáticos
- [ ] Renders fotorrealistas (<30 seg)
- [ ] PDF profesional con render
- [ ] Compartir por email
- [ ] Control de costos API

### Fase 4: Firma + Producción (Semanas 13-16)
- [ ] Firma digital táctil/mouse
- [ ] Registro de IP y timestamp
- [ ] Generación automática orden producción
- [ ] Notificaciones por email
- [ ] UAT aprobado (5 casos de éxito)
- [ ] Deploy a producción

---

## 📞 ESCALACIÓN Y SOPORTE

### Niveles de Soporte
- **Nivel 1:** Errores críticos (sistema caído) - Respuesta <1 hora
- **Nivel 2:** Errores importantes (funcionalidad rota) - Respuesta <4 horas
- **Nivel 3:** Errores menores (cosméticos) - Respuesta <24 horas
- **Nivel 4:** Mejoras y features - Según roadmap

### Métricas de Monitoreo
- Uptime >99.5%
- Tiempo de respuesta API <500ms (p95)
- Tasa de errores <0.1%
- Uso de CPU/RAM <70%
- Costo API IA <$500/mes

---

## 🔄 ACTUALIZACIONES Y VERSIONADO

### Semantic Versioning
```
MAJOR.MINOR.PATCH

Ejemplo: 1.2.3
- 1 = MAJOR (cambios incompatibles)
- 2 = MINOR (nuevas funcionalidades compatibles)
- 3 = PATCH (corrección de bugs)
```

### Changelog
```markdown
## [1.0.0] - 2025-01-15

### Added
- Sistema completo de autenticación
- Gestión de proyectos y clientes
- Carga de imágenes con eliminación EXIF
- Motor de presupuestación automático
- Generación de renders con IA
- Firma digital con trazabilidad
- Liberación automática a producción

### Security
- Implementación de JWT con refresh tokens
- Eliminación automática de metadatos GPS
- Registro de IP en firmas digitales
- Rate limiting en endpoints críticos
```

---

## ✅ CRITERIOS DE ACEPTACIÓN GENERALES

### Funcionalidad
- [ ] Todas las features implementadas según especificación
- [ ] Flujos de usuario completos y probados
- [ ] Validaciones de negocio correctas
- [ ] Estados y transiciones correctos

### Calidad
- [ ] Tests unitarios >80% cobertura
- [ ] Tests de integración para flujos críticos
- [ ] Sin errores críticos en producción
- [ ] Performance aceptable (<500ms API)

### Seguridad
- [ ] Autenticación y autorización correctas
- [ ] Datos sensibles protegidos
- [ ] EXIF eliminado en todas las imágenes
- [ ] Firma digital con evidencia legal

### Documentación
- [ ] API documentada (OpenAPI)
- [ ] README completo
- [ ] Guía de despliegue
- [ ] Manual de usuario

### UX/UI
- [ ] Responsive (móvil, tablet, desktop)
- [ ] Accesible (WCAG 2.1 AA)
- [ ] Intuitivo y fácil de usar
- [ ] Feedback claro al usuario

---

## 🎓 APRENDIZAJE CONTINUO

### Retrospectivas
- Cada 2 semanas (fin de sprint)
- Documentar lecciones aprendidas
- Ajustar procesos según feedback

### Métricas de Equipo
- Velocidad (story points por sprint)
- Calidad (bugs en producción)
- Satisfacción del cliente (NPS)

### Mejoras Continuas
- Refactorización periódica
- Actualización de dependencias
- Optimización de performance
- Nuevas features según feedback

---

## 📝 NOTAS FINALES

Este documento es la **fuente de verdad** para el desarrollo del proyecto. Cualquier decisión técnica o de negocio debe alinearse con los principios y reglas aquí definidos.

**Principios clave:**
1. **Seguridad primero:** Privacidad del cliente y trazabilidad legal
2. **Experiencia de usuario:** Simplicidad y velocidad
3. **Calidad de código:** Tests, documentación y mantenibilidad
4. **Enfoque en negocio:** Resolver problemas reales del cliente
5. **Iteración continua:** Entregar valor desde la primera fase

---

**Última actualización:** 2025-01-15  
**Versión:** 1.0.0  
**Autor:** Equipo de Desarrollo  
**Revisado por:** Product Owner
```

---

## 📦 Cómo usar este `agente.md`

1. **Guárdalo en la raíz de tu proyecto** como `agente.md` o `.cursorrules` (si usas Cursor)
2. **Referencia constante:** Los agentes de IA (Cursor, Copilot, etc.) lo usarán como contexto
3. **Actualízalo** conforme el proyecto evolucione
4. **Comparte con el equipo** para mantener consistencia