@echo off
echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt

echo Starting OCR API server on http://localhost:8000
uvicorn main:app --reload --port 8000 --host 0.0.0.0

