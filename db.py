#!/usr/bin/env python3
# setup_db.py - Crea BD, usuario y tabla. Requiere variables de entorno obligatorias.

import os
import sys
import mysql.connector
from mysql.connector import Error

def required_env(name):
    """Obtiene variable de entorno o termina con error."""
    value = os.getenv(name)
    if value is None:
        sys.exit(f"❌ Error: Variable de entorno {name} no definida.")
    return value

def main():
    # Variables obligatorias (sin valores por defecto)
    DB_HOST = required_env("DB_HOST")
    DB_ROOT_USER = required_env("DB_ROOT_USER")
    DB_ROOT_PASSWORD = required_env("DB_ROOT_PASSWORD")
    DB_NAME = required_env("DB_NAME")
    DB_APP_USER = required_env("DB_APP_USER")
    DB_APP_PASSWORD = required_env("DB_APP_PASSWORD")

    # Conectar como root
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_ROOT_USER,
            password=DB_ROOT_PASSWORD
        )
        cursor = conn.cursor()
    except Error as e:
        sys.exit(f"❌ No se pudo conectar a MySQL como root: {e}")

    # Crear base de datos
    try:
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
        cursor.execute(f"USE {DB_NAME}")
        print(f"✅ Base de datos '{DB_NAME}' lista.")
    except Error as e:
        sys.exit(f"❌ Error al crear/seleccionar BD: {e}")

    # Crear usuario de aplicación
    try:
        cursor.execute(f"CREATE USER IF NOT EXISTS '{DB_APP_USER}'@'localhost' IDENTIFIED BY '{DB_APP_PASSWORD}'")
        cursor.execute(f"GRANT ALL PRIVILEGES ON {DB_NAME}.* TO '{DB_APP_USER}'@'localhost'")
        cursor.execute("FLUSH PRIVILEGES")
        print(f"✅ Usuario '{DB_APP_USER}' configurado.")
    except Error as e:
        print(f"⚠️ Nota sobre el usuario: {e}")

    # Crear tabla users
    create_table = """
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        avatar_url VARCHAR(255) DEFAULT '/static/default-avatar.png'
    )
    """
    try:
        cursor.execute(create_table)
        print("✅ Tabla 'users' creada/verificada.")
    except Error as e:
        sys.exit(f"❌ Error al crear tabla: {e}")

    cursor.close()
    conn.close()
    print("\n🎉 Configuración completada con éxito.")

if __name__ == "__main__":
    main()
