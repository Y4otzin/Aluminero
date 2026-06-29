"""
Configuración central de la aplicación
"""
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # App
    APP_ENV: str = "development"
    APP_SECRET_KEY: str = "change-me-in-production"
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    
    # Database
    DATABASE_URL: str = "postgresql://aluminio:aluminio123@localhost:5432/aluminio_db"
    
    # Auth
    JWT_SECRET_KEY: str = "change-me-jwt-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Supabase
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SUPABASE_STORAGE_BUCKET: str = "project-files"
    
    # Email
    RESEND_API_KEY: Optional[str] = None
    
    # IA
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-image-1"
    AI_MONTHLY_BUDGET_USD: float = 500.0
    
    # Business Rules
    IVA_RATE: float = 0.16
    MAX_RENDERS_PER_PROJECT: int = 5
    MAX_FILE_SIZE_MB: int = 10
    
    # Monitoring
    SENTRY_DSN: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
