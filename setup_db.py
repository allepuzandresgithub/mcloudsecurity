#!/usr/bin/env python3
# setup_db.py - Crea la base de datos, el usuario y la tabla users.
# Lee todas las credenciales desde variables de entorno (no hay valores hardcodeados).

import os
import sys
import mysql.connector
from mysql.connector import Error

def get_env_var(name):
    """Obtiene una variable de entorno o termina el script si no existe."""
    value = os.getenv(name)
    if value is None:
        sys.exit(f"❌ Error: La variable de entorno {name} no está definida.")
    return value

def main():
    # Configuración desde variables de entorno (obligatorias)
    DB_HOST = get_env_var('DB_HOST')
    DB_ROOT_USER = get_env_var('DB_ROOT_USER')
    DB_ROOT_PASSWORD = get_env_var('DB_ROOT_PASSWORD')  # Puede ser cadena vacía
    DB_NAME = get_env_var('DB_NAME')
    DB_APP_USER = get_env_var('DB_APP_USER')
    DB_APP_PASSWORD = get_env_var('DB_APP_PASSWORD')

    # Conectar como root
    config_root = {
        'host': DB_HOST,
        'user': DB_ROOT_USER,
        'password': DB_ROOT_PASSWORD
    }
    try:
        conn = mysql.connector.connect(**config_root)
        cursor = conn.cursor()
    except Error as e:
        sys.exit(f"❌ No se pudo conectar a MySQL como root: {e}")

    # Crear base de datos
    try:
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
        cursor.execute(f"USE {DB_NAME}")
        print(f"✅ Base de datos '{DB_NAME}' lista.")
    except Error as e:
        sys.exit(f"❌ Error al crear/Usar BD: {e}")

    # Crear usuario de aplicación (solo si no existe)
    try:
        cursor.execute(f"CREATE USER IF NOT EXISTS '{DB_APP_USER}'@'localhost' IDENTIFIED BY '{DB_APP_PASSWORD}'")
        cursor.execute(f"GRANT ALL PRIVILEGES ON {DB_NAME}.* TO '{DB_APP_USER}'@'localhost'")
        cursor.execute("FLUSH PRIVILEGES")
        print(f"✅ Usuario '{DB_APP_USER}' creado/verificado.")
    except Error as e:
        print(f"⚠️ Nota sobre el usuario: {e} (puede que ya exista y tenga privilegios)")

    # Crear tabla users
    create_table_query = """
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
        cursor.execute(create_table_query)
        print("✅ Tabla 'users' creada/verificada.")
    except Error as e:
        sys.exit(f"❌ Error al crear tabla: {e}")

    # Limpiar
    cursor.close()
    conn.close()
    print("\n🎉 Configuración completada con éxito.")

if __name__ == "__main__":
    main()
