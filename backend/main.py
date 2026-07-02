"""
Plataforma Herrería Aluminio - FastAPI Backend
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
import os

app = FastAPI(
    title="Plataforma Herrería Aluminio",
    description="API REST para gestión de proyectos, cotizaciones y producción",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "name": "Plataforma Herrería Aluminio API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

from app.api.v1 import sketch
app.include_router(sketch.router, prefix="/api/v1")

from app.api.v1.auth import router as auth_router
app.include_router(auth_router)

from app.api.v1.projects.router import router as projects_router
app.include_router(projects_router)

from app.api.v1.photos.router import router as photos_router
app.include_router(photos_router)

from app.api.v1.catalogs.router import router as catalogs_router
app.include_router(catalogs_router)

from app.api.v1.budget.router import router as budget_router
app.include_router(budget_router)

from app.api.v1.signature.router import router as signature_router
app.include_router(signature_router)

from app.api.v1.quote.router import router as quote_router
app.include_router(quote_router)

from app.api.v1.production.router import router as production_router
app.include_router(production_router)
