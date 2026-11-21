"""Pure image-processing step: split a photo of a handwritten list into one
crop per line. Kept separate from app.py (which also loads the TrOCR model)
so this logic can be tested without needing the model or any network
access."""

from PIL import Image
import numpy as np


def segment_lines(img: Image.Image, ink_threshold: int = 200, min_line_height: int = 8, pad: int = 4):
    """Uses a simple horizontal ink-density profile (rows with no dark
    pixels are gaps between lines) to find each line. Works well for a
    fairly level, high-contrast photo of a list — not a general-purpose
    document layout analyzer."""
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
