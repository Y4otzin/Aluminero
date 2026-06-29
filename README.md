# 🏗️ Plataforma Inteligente de Cotización y Producción

Sistema web end-to-end para herrería de aluminio que unifica el proceso comercial y productivo mediante IA generativa, firma digital y liberación automática a fabricación.

**Ref:** ALU-TA-2025-01  
**Duración:** 18 semanas (9 sprints)  
**Stack:** Next.js 18 + FastAPI + PostgreSQL + Supabase

## 🚀 Inicio Rápido

### Prerequisitos
- Python 3.11+
- Node.js 18+
- Docker y Docker Compose
- Cuenta en Supabase

### 1. Clonar y configurar
```bash
git clone <repo-url>
cd plataforma-herreria-aluminio
cp .env.example .env
# Editar .env con tus credenciales
```

### 2. Levantar con Docker
```bash
docker-compose up -d
```

### 3. Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload
```

### 4. Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

## 📖 Documentación
- **API Swagger:** http://localhost:8000/docs
- **API ReDoc:** http://localhost:8000/redoc
- **Frontend:** http://localhost:3000

## 🧪 Tests
```bash
cd backend
pytest --cov=app
```

## 📋 Sprints
Ver [plan_lenguaje_simple.md](./plan_lenguaje_simple.md) para el roadmap completo.
