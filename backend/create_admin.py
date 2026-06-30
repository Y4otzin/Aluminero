#!/usr/bin/env python3
"""
Script para crear usuario administrador en la plataforma.
Ejecuta: python create_admin.py
"""

from app.core.database import SessionLocal
from app.models.user import UserRole
from app.repositories.user_repository import UserRepository
from passlib.context import CryptContext

def create_admin():
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    db = SessionLocal()

    try:
        email = "admin@herreria.com"
        password = "Admin@123456"
        full_name = "Administrador"
        
        # Verificar si ya existe
        existing = UserRepository.get_by_email(db, email)
        if existing:
            print(f"✗ El usuario {email} ya existe")
            print(f"  Email: {existing.email}")
            print(f"  Rol: {existing.role.value}")
            return
        
        # Crear usuario admin
        password_hash = pwd_context.hash(password)
        admin_user = UserRepository.create(
            db=db,
            email=email,
            password_hash=password_hash,
            full_name=full_name,
            role=UserRole.ADMIN
        )
        
        print("✓ Usuario administrador creado exitosamente")
        print(f"  Email: {admin_user.email}")
        print(f"  Contraseña: {password}")
        print(f"  Rol: {admin_user.role.value}")
        print(f"  ID: {admin_user.id}")
        print()
        print("Para hacer login:")
        print("  curl -X POST http://localhost:8000/api/v1/auth/login \\")
        print("    -H 'Content-Type: application/json' \\")
        print(f"    -d '{{\"email\":\"{email}\",\"password\":\"{password}\"}}'")

    except Exception as e:
        print(f"✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
