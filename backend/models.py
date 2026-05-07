from sqlalchemy import Column, Integer, String, Float, Date
from database import Base

class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(Integer, primary_key=True, index=True)
    merchant = Column(String, index=True)
    total_amount = Column(Float)
    date = Column(Date)
    category = Column(String, index=True, nullable=True)
