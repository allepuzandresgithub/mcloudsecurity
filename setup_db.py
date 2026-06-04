# setup_db.py
import mysql.connector
from mysql.connector import Error

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': ''
}

def create_database_and_table():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Crear base de datos
        cursor.execute("CREATE DATABASE IF NOT EXISTS musiccloud")
        cursor.execute("USE musiccloud")
        
        # Crear tabla
        cursor.execute("""
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
        """)
        
        print("✅ Base de datos y tabla creadas/verificadas correctamente")
        
        cursor.close()
        conn.close()
    except Error as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    create_database_and_table()
