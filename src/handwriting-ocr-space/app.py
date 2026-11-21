"""
Self-hosted handwriting OCR service for the "Add Tasks from Photo" feature.

Why this exists: the free client-side engine (Tesseract.js) is weak on
real handwriting — it's built for printed text. TrOCR (microsoft/trocr-
base-handwritten), a transformer model fine-tuned specifically on
handwritten text, is meaningfully more accurate on cursive/messy writing.
It needs real CPU/RAM to run, which a browser or a Supabase Edge Function
can't provide, so it runs here instead, as a small self-hosted API this
project owns the code for.

Flow: receive a photo -> split it into individual line images (TrOCR reads
one line at a time, unlike Tesseract which did its own layout analysis) ->
run each line through TrOCR -> return the recognized lines. The app's
existing parseHandwrittenLines() still does bullet/number stripping and
due-date assignment client-side — this service only does the reading.
"""

import io

import torch
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
from transformers import TrOCRProcessor, VisionEncoderDecoderModel

from segmentation import segment_lines

app = FastAPI()

# No secrets or per-user data live behind this endpoint, and it's called
# directly from the browser (GitHub Pages origin) with no auth — wide open
# CORS is the right call here rather than guessing the exact origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_NAME = "microsoft/trocr-base-handwritten"
processor = TrOCRProcessor.from_pretrained(MODEL_NAME)
model = VisionEncoderDecoderModel.from_pretrained(MODEL_NAME)
model.eval()


def read_line(line_img: Image.Image) -> str:
    pixel_values = processor(images=line_img.convert("RGB"), return_tensors="pt").pixel_values
    with torch.no_grad():
        generated_ids = model.generate(pixel_values, max_length=64)
    text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
    return text.strip()


@app.get("/")
def health():
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/scan")
async def scan(file: UploadFile = File(...)):
    data = await file.read()
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except Exception:
        return JSONResponse({"error": "Could not read that as an image"}, status_code=400)

    line_images = segment_lines(img)
    lines = [text for text in (read_line(li) for li in line_images) if text]
    return JSONResponse({"lines": lines})
