from sqlalchemy import Column, Integer, String, Float, Date, DateTime
from sqlalchemy.sql import func
from database import Base

class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True) # Keycloak 'sub'
    merchant = Column(String, index=True)
    total_amount = Column(Float)
    date = Column(Date, index=True)
    category = Column(String, index=True, nullable=True)
    file_path = Column(String, nullable=True) # Path to stored document
    created_at = Column(DateTime(timezone=True), server_default=func.now())
