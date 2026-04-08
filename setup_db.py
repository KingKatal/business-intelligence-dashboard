import mysql.connector
import os
import sys

def split_sql_script(script):
    statements = []
    current = []
    delimiter = ';'

    for raw_line in script.splitlines():
        stripped = raw_line.strip()
        if stripped.upper().startswith('DELIMITER '):
            delimiter = stripped.split(None, 1)[1]
            continue

        if delimiter != ';':
            if stripped.endswith(delimiter):
                current.append(raw_line[: len(raw_line) - len(delimiter)])
                statement = '\n'.join(current).strip()
                if statement and not statement.endswith(';'):
                    statement += ';'
                if statement:
                    statements.append(statement)
                current = []
            else:
                current.append(raw_line)
        else:
            current.append(raw_line)
            if stripped.endswith(';'):
                statement = '\n'.join(current).strip()
                if statement:
                    statements.append(statement)
                current = []

    if current:
        statement = '\n'.join(current).strip()
        if statement:
            statements.append(statement)

    return statements


def execute_sql_script(cursor, script, ignore_errors=None):
    if ignore_errors is None:
        ignore_errors = {1061, 1062}

    statements = split_sql_script(script)
    for i, statement in enumerate(statements, start=1):
        statement = statement.strip()
        if not statement or statement.startswith('--'):
            continue

        try:
            cursor.execute(statement)
            if cursor.description:
                cursor.fetchall()
            print(f"  ✓ Statement {i} executed")
        except mysql.connector.Error as err:
            if err.errno in ignore_errors:
                print(f"  ⚠️ Statement {i} ignored: {err}")
                continue
            raise


def setup_database():
    print("🚀 Setting up Business Dashboard Database...")
    print("=" * 50)
    
    try:
        # Connect to MySQL (WAMP default: no password)
        print("Connecting to MySQL...")
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",  # Empty password for WAMP
            charset="utf8mb4"
        )
        
        cursor = conn.cursor()
        
        # Create database
        print("Creating database 'business_dashboard'...")
        cursor.execute("CREATE DATABASE IF NOT EXISTS business_dashboard")
        cursor.execute("USE business_dashboard")
        
        # Read setup.sql file
        print("Reading setup.sql...")
        with open("database/setup.sql", "r", encoding="utf-8") as f:
            sql_script = f.read()

        print("Executing setup.sql...")
        execute_sql_script(cursor, sql_script)

        # Load sample data if available
        sample_data_path = os.path.join('database', 'sampledata.sql')
        if os.path.exists(sample_data_path):
            print("Reading sampledata.sql...")
            with open(sample_data_path, 'r', encoding='utf-8') as f:
                sample_script = f.read()

            print("Loading sample data...")
            execute_sql_script(cursor, sample_script)

        conn.commit()
        print("\n" + "=" * 50)
        print("✅ Database setup COMPLETE!")
        print("\nDefault login credentials:")
        print("  👑 Admin: admin / admin123")
        print("  👥 Staff: staff1 / password123")
        print("\nAccess your app at: http://localhost:5000")
        
        cursor.close()
        conn.close()
        
    except mysql.connector.Error as err:
        print(f"\n❌ ERROR: {err}")
        print("\nTroubleshooting:")
        print("1. Is WAMP running? (Check for GREEN icon)")
        print("2. Try: http://localhost/phpmyadmin")
        print("3. WAMP MySQL default has NO password")
        sys.exit(1)

if __name__ == "__main__":
    setup_database()