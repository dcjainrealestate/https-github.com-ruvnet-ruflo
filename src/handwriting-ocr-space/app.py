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

import numpy as np
import torch
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
from transformers import TrOCRProcessor, VisionEncoderDecoderModel

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


def segment_lines(img: Image.Image, ink_threshold: int = 200, min_line_height: int = 8, pad: int = 4):
    """Splits a photo of a handwritten list into one crop per line, using a
    simple horizontal ink-density profile (rows with no dark pixels are
    gaps between lines). Works well for a fairly level, high-contrast photo
    of a list — not a general-purpose document layout analyzer."""
    gray = np.array(img.convert("L"))
    has_ink = (gray < ink_threshold).any(axis=1)
    height = gray.shape[0]

    lines = []
    in_line = False
    start = 0
    for y, ink in enumerate(has_ink):
        if ink and not in_line:
            in_line = True
            start = y
        elif not ink and in_line:
            in_line = False
            if y - start >= min_line_height:
                top = max(0, start - pad)
                bottom = min(height, y + pad)
                lines.append(img.crop((0, top, img.width, bottom)))
    if in_line and height - start >= min_line_height:
        lines.append(img.crop((0, max(0, start - pad), img.width, height)))

    return lines or [img]


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
