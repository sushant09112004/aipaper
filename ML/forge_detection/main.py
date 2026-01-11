# filename: app.py
import base64
import json
import re
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import google.generativeai as genai

# ---------- CORS Setup ----------
# Development: allow all origins
# Production: restrict to trusted domains only
allow_origins = ["*"]  # ✅ allows all origins during development
# Example for production:
# allow_origins = [
#     "http://localhost:3000",    # Local frontend
#     "https://your-frontend-domain.com"  # Deployed frontend
# ]

# ---------- Load environment variables ----------
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY not set in .env")

genai.configure(api_key=GEMINI_API_KEY)

# ---------- FastAPI App ----------
app = FastAPI(
    title="Forge Detection API",
    description="Detect forged/tampered certificates",
    version="1.0"
)

# ---------- Add CORS Middleware ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# ---------- Core Function ----------
def extract_with_gemini(image_bytes: bytes):
    image_data = base64.b64encode(image_bytes).decode("utf-8")

    prompt = """
You are an expert OCR and information extraction system.
First, carefully check whether the given image is an educational marksheet or certificate 
(i.e., it should clearly contain information like name, roll number, course, branch, grades, 
or other educational details).

If it is NOT an educational certificate/marksheet (for example, a random photo, ID card, 
bill, receipt, or unrelated document), return the following JSON exactly:

{
  "error": "Please enter an educational certificate."
}

If it IS an educational certificate/marksheet, extract the following fields:
- Name
- Roll Number
- Course
- Branch
- Year
- CGPA
- SGPA
- Certificate Id
- Institution
- Issue Date

Return the result STRICTLY as a valid JSON object with keys exactly as above.
If a field is missing in the image, set its value to null.
Do not add extra commentary or explanation.
Only return JSON.
"""


    model = genai.GenerativeModel("gemini-2.5-flash")
    response = model.generate_content(
        contents=[
            {"role": "user", "parts": [prompt, {"mime_type": "image/png", "data": image_data}]}
        ]
    )

    try:
        data = json.loads(response.text.strip())
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", response.text, re.DOTALL)
        if match:
            data = json.loads(match.group())
        else:
            data = {}

    return data


# ---------- Forge Detection Function ----------
def detect_forgery(image_bytes: bytes):
    """
    Detect if a certificate is forged using Gemini AI.
    Returns bounding boxes and confidence scores for suspicious regions.
    """
    image_data = base64.b64encode(image_bytes).decode("utf-8")
    
    prompt = """
    You are an expert document forensics analyst. Analyze this certificate image for signs of forgery or tampering.
    
    Look for:
    - Inconsistent fonts or text alignment
    - Suspicious seals or signatures
    - Altered dates or numbers
    - Mismatched backgrounds or textures
    - Signs of digital manipulation
    
    Return a JSON object with a "detections" array. Each detection should have:
    - "bbox": [x, y, width, height] - bounding box coordinates (normalized 0-1)
    - "class_name": "fake" or "true" - whether this region is suspicious
    - "confidence": 0.0 to 1.0 - confidence score
    
    If no suspicious regions found, return empty detections array.
    Return ONLY valid JSON, no other text.
    """
    
    model = genai.GenerativeModel("gemini-2.5-flash")
    response = model.generate_content(
        contents=[
            {"role": "user", "parts": [prompt, {"mime_type": "image/png", "data": image_data}]}
        ]
    )
    
    try:
        data = json.loads(response.text.strip())
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", response.text, re.DOTALL)
        if match:
            data = json.loads(match.group())
        else:
            data = {"detections": []}
    
    # Ensure detections array exists
    if "detections" not in data:
        data["detections"] = []
    
    return data


# ---------- API Endpoints ----------
@app.post("/predict")
async def predict_forgery(file: UploadFile = File(...)):
    """
    Predict if certificate is forged.
    Returns detections with bounding boxes and confidence scores.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    image_bytes = await file.read()
    result = detect_forgery(image_bytes)
    
    # Ensure response matches expected format
    if "detections" not in result:
        result["detections"] = []
    
    return JSONResponse(content=result)
