@echo off
echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt

echo Starting Forge Detection API server on http://localhost:8001
uvicorn main:app --reload --port 8001 --host 0.0.0.0

