import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

class ReceiptBase(BaseModel):
    merchant: Optional[str] = Field(None, max_length=255)
    total_amount: Optional[float] = Field(None, ge=0)
    date: Optional[datetime.date] = None
    category: Optional[str] = Field(None, max_length=100)

class ReceiptCreate(ReceiptBase):
    pass

class ReceiptOut(ReceiptBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
