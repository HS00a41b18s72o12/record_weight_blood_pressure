@echo off
echo Starting Weight & Blood Pressure Recorder...
echo Open http://localhost:8082 in your browser.
call venv\Scripts\activate
uvicorn backend.main:app --host 0.0.0.0 --port 8082 --reload
pause
