from sqlalchemy import Column, Integer, Float, DateTime
from datetime import datetime
from .database import Base

class HealthRecord(Base):
    __tablename__ = "health_records"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=datetime.now)
    weight = Column(Float)
    systolic = Column(Integer)
    diastolic = Column(Integer)
