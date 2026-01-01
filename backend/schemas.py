from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class HealthRecordBase(BaseModel):
    weight: float
    systolic: int
    diastolic: int

class HealthRecordCreate(HealthRecordBase):
    pass

class HealthRecord(HealthRecordBase):
    id: int
    date: datetime

    class Config:
        orm_mode = True
