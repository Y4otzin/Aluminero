"""Crear usuario admin."""
import psycopg2
import uuid
import bcrypt
from datetime import datetime, timezone

conn = psycopg2.connect(
    host='localhost', port=5432,
    dbname='aluminio_db', user='aluminio',
    password='aluminio123'
)
cur = conn.cursor()

email = 'admin@aluminero.com'
password = 'Admin123!'
full_name = 'Admin Principal'
uid = str(uuid.uuid4())
pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

cur.execute("""
    INSERT INTO users (id, email, password_hash, full_name, role, is_active, email_verified, created_at, updated_at)
    VALUES (%s, %s, %s, %s, 'ADMIN', TRUE, TRUE, %s, %s)
    ON CONFLICT (email) DO UPDATE SET role='ADMIN', is_active=TRUE, password_hash=%s
""", (uid, email, pw_hash, full_name, datetime.now(timezone.utc), datetime.now(timezone.utc), pw_hash))

conn.commit()
cur.close()
conn.close()
print('✅ Admin creado: admin@aluminero.com / Admin123!')
