# ML Services Setup Guide

This folder contains two ML services:
1. **OCR_api** - Extracts text and information from certificate images using Gemini AI
2. **forge_detection** - Detects forged/tampered certificates using AI

## Prerequisites

- Python 3.8 or higher
- Virtual environment (venv) already created in each folder

## Setup Instructions

### 1. OCR API Setup

1. Navigate to the OCR_api folder:
   ```bash
   cd OCR_api
   ```

2. Activate the virtual environment:
   ```bash
   venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the `OCR_api` folder:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

5. Run the service:
   ```bash
   uvicorn main:app --reload --port 8000 --host 0.0.0.0
   ```
   
   Or use the batch file:
   ```bash
   run.bat
   ```

   The service will run on: `http://localhost:8000`

### 2. Forge Detection API Setup

1. Navigate to the forge_detection folder:
   ```bash
   cd forge_detection
   ```

2. Activate the virtual environment:
   ```bash
   venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the `forge_detection` folder:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

5. Run the service:
   ```bash
   uvicorn main:app --reload --port 8001 --host 0.0.0.0
   ```
   
   Or use the batch file:
   ```bash
   run.bat
   ```

   The service will run on: `http://localhost:8001`

## Quick Start (Windows)

### Option 1: Using Batch Files

1. **Start OCR API:**
   - Open a terminal in `OCR_api` folder
   - Double-click `run.bat` or run it from command line

2. **Start Forge Detection API:**
   - Open another terminal in `forge_detection` folder
   - Double-click `run.bat` or run it from command line

### Option 2: Manual Commands

**Terminal 1 (OCR API):**
```bash
cd HackOdhisha-TeamFB\ML\OCR_api
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Terminal 2 (Forge Detection):**
```bash
cd HackOdhisha-TeamFB\ML\forge_detection
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

## API Endpoints

### OCR API (Port 8000)
- **POST** `/extract/` - Extract certificate information from image
  - Body: FormData with `file` field (image file)
  - Returns: JSON with extracted fields (Name, Institution, etc.)

### Forge Detection API (Port 8001)
- **POST** `/predict` - Detect if certificate is forged
  - Body: FormData with `file` field (image file)
  - Returns: JSON with detection results and bounding boxes

## Testing

### Test OCR API:
```bash
curl -X POST "http://localhost:8000/extract/" -F "file=@path/to/certificate.jpg"
```

### Test Forge Detection:
```bash
curl -X POST "http://localhost:8001/predict" -F "file=@path/to/certificate.jpg"
```

## Getting Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and add it to your `.env` files

## Troubleshooting

- **Port already in use**: Change the port in the uvicorn command
- **Module not found**: Make sure venv is activated and dependencies are installed
- **API key error**: Check that `.env` file exists and has the correct key
- **CORS errors**: The services are configured to allow all origins in development

