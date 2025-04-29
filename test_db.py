# check_db_path.py
from backend.database import SQLALCHEMY_DATABASE_URL
from alembic.config import Config

app_db = SQLALCHEMY_DATABASE_URL
alembic_db = Config("alembic.ini").get_main_option("sqlalchemy.url")

assert app_db == alembic_db, f"Paths don't match!\nApp: {app_db}\nAlembic: {alembic_db}"
print(f"Both using: {app_db}")