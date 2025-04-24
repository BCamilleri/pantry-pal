from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import sessionmaker, declarative_base


# SQLite db file path
DB_URL = "sqlite:///./local_database.db"

# Create db engine
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})

# Session to interact with db
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for db models
Base = declarative_base()

# Dependency to get new db session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()