import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Use SQLite for tests (lightweight, no docker) and PostgreSQL for production
# Database configuration with security defaults
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")

# Ensure compatibility with newer SQLAlchemy versions for 'postgres://' URLs
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite needs connect_args={"check_same_thread": False}
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # Production settings for PostgreSQL (Distributed Ready)
    engine = create_engine(
        DATABASE_URL,
        pool_size=20,          # Support more concurrent connections
        max_overflow=10,
        pool_timeout=30,       # Wait up to 30s for a connection before failing
        pool_pre_ping=True,    # Verify connection health before every request
        pool_recycle=1800,     # Prevent stale connections by recycling every 30m
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
