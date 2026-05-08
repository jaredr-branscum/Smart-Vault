import sys
import time
import logging
from sqlalchemy import create_engine, text
from alembic.config import Config
from alembic import command
from alembic.script import ScriptDirectory
from database import DATABASE_URL, engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration-orchestrator")

def get_current_revision(conn):
    try:
        res = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
        return res
    except Exception:
        return None

def run_migrations():
    # Only use locking for PostgreSQL
    if not DATABASE_URL.startswith("postgresql"):
        logger.info("Non-Postgres DB detected. Skipping advisory locks.")
        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
        return

    # 1. Fast Check: See if we actually need to migrate
    alembic_cfg = Config("alembic.ini")
    script = ScriptDirectory.from_config(alembic_cfg)
    head_revision = script.get_current_head()

    with engine.connect() as conn:
        current_revision = get_current_revision(conn)
        
        if current_revision == head_revision:
            logger.info(f"Database is already at latest revision ({head_revision}). Skipping lock.")
            return

    # 2. If we reach here, a migration is likely needed. Proceed with lock.
    LOCK_ID = 7234821 
    logger.info("Database out of date or new. Attempting to acquire advisory lock...")
    
    with engine.connect() as conn:
        # Transactional context is important for the lock to be released if needed
        # but pg_advisory_lock is session-level by default.
        # We'll use pg_try_advisory_lock in a loop to wait gracefully.
        
        retries = 0
        max_retries = 30
        
        while retries < max_retries:
            result = conn.execute(text(f"SELECT pg_try_advisory_lock({LOCK_ID})")).scalar()
            
            if result:
                logger.info("Lock acquired. Running migrations...")
                try:
                    alembic_cfg = Config("alembic.ini")
                    command.upgrade(alembic_cfg, "head")
                    logger.info("Migrations complete.")
                finally:
                    conn.execute(text(f"SELECT pg_advisory_unlock({LOCK_ID})"))
                    logger.info("Lock released.")
                return
            
            logger.info("Database is currently locked by another instance. Waiting...")
            time.sleep(5)
            retries += 1
            
        logger.error("Could not acquire migration lock. Process timed out.")
        sys.exit(1)

if __name__ == "__main__":
    run_migrations()
