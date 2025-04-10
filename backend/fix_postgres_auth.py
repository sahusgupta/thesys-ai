import os
import subprocess
import sys

def fix_postgres_auth():
    # Stop PostgreSQL service
    print("Stopping PostgreSQL service...")
    subprocess.run(['net', 'stop', 'postgresql-x64-13'], check=False)
    
    # Find pg_hba.conf location
    pg_data = os.environ.get('PGDATA', r'C:\Program Files\PostgreSQL\13\data')
    pg_hba_path = os.path.join(pg_data, 'pg_hba.conf')
    
    if not os.path.exists(pg_hba_path):
        print(f"Error: Could not find pg_hba.conf at {pg_hba_path}")
        print("Please specify the correct PostgreSQL data directory path")
        return
    
    # Backup the original file
    backup_path = pg_hba_path + '.bak'
    if not os.path.exists(backup_path):
        print(f"Creating backup at {backup_path}")
        os.rename(pg_hba_path, backup_path)
    
    # Create new pg_hba.conf with proper authentication settings
    print("Creating new pg_hba.conf with proper authentication settings...")
    with open(pg_hba_path, 'w') as f:
        f.write("""# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             postgres                                md5
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
""")
    
    # Start PostgreSQL service
    print("Starting PostgreSQL service...")
    subprocess.run(['net', 'start', 'postgresql-x64-13'], check=False)
    
    print("\nPostgreSQL authentication settings have been updated.")
    print("Please try connecting again with your password.")

if __name__ == '__main__':
    try:
        fix_postgres_auth()
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1) 