"""Script de verificación rápida de imports y funcionalidad."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.config.settings import settings
print('✓ settings cargado:', settings.APP_ENV)

from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_token
print('✓ security cargado')

from app.models.user import User, Session as SessionModel, UserRole
print('✓ modelos cargados:', list(UserRole))

from app.schemas.auth import UserCreate, UserLogin, UserResponse, TokenResponse
print('✓ esquemas cargados')

from app.repositories.user_repository import UserRepository
print('✓ user_repository cargado')

from app.repositories.session_repository import SessionRepository
print('✓ session_repository cargado')

from app.services.auth_service import AuthService
print('✓ auth_service cargado')

from app.api.dependencies.auth import get_current_user, require_role
print('✓ middleware RBAC cargado')

from app.api.v1.auth import router as auth_router
print('✓ auth router cargado, rutas:', [r.path for r in auth_router.routes])

# Test password hashing
h = get_password_hash('Test1234')
assert verify_password('Test1234', h)
print('✓ bcrypt hashing funciona')

# Test JWT
token, exp = create_access_token('user123', 'admin')
assert decode_token(token, 'access') is not None
assert decode_token(token, 'refresh') is None
print('✓ JWT access token funciona')

ref_token, ref_exp = create_refresh_token('user123')
assert decode_token(ref_token, 'refresh') is not None
assert decode_token(ref_token, 'access') is None
print('✓ JWT refresh token funciona')

print()
print('🎉 TODOS los módulos se importan y funcionan correctamente')
