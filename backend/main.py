from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from . import models, schemas, database

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# Allow CORS for development (allowing frontend from localhost:5173 or others)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local home use, allow all is acceptable simplicity
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/api/entries", response_model=schemas.HealthRecord)
def create_entry(entry: schemas.HealthRecordCreate, db: Session = Depends(get_db)):
    db_entry = models.HealthRecord(**entry.dict())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@app.get("/api/entries", response_model=List[schemas.HealthRecord])
def read_entries(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    entries = db.query(models.HealthRecord).order_by(models.HealthRecord.date.desc()).offset(skip).limit(limit).all()
    # Reverse to return oldest first if needed for chart? Usually charts want chronological.
    # But for history list, newest first is good.
    # Let's keep it descending by date for now (newest first).
    return entries

@app.get("/api/latest", response_model=schemas.HealthRecord)
def read_latest_entry(db: Session = Depends(get_db)):
    latest = db.query(models.HealthRecord).order_by(models.HealthRecord.date.desc()).first()
    if latest is None:
        raise HTTPException(status_code=404, detail="No entries found")
    return latest

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app.mount("/static", StaticFiles(directory="backend/static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse('backend/static/index.html')

