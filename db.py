# db.py
import os
import mysql.connector
from mysql.connector import Error
import bcrypt
from datetime import datetime
from dotenv import load_dotenv

# Cargar variables desde .env (debe estar en el mismo directorio)
load_dotenv()

# Configuración leída desde variables de entorno
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'musiccloud'),
    'password': os.getenv('DB_PASSWORD', 'mimusicpass'),
    'database': os.getenv('DB_NAME', 'musiccloud')
}

def get_db_connection():
    try:
        return mysql.connector.connect(**DB_CONFIG)
    except Error as e:
        print(f"Error conectando a MySQL: {e}")
        return None

# El resto de funciones (create_user, authenticate_user, etc.) se mantienen exactamente igual
# Solo cambia la configuración de conexión. Copia las funciones que ya tenías sin modificarlas.
# Aquí van tal como las escribiste, pero por brevedad no las repito todas.
# Asegúrate de incluir desde create_user hasta update_user_password.
