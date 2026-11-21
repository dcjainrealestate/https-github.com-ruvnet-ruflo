---
title: Handwriting OCR
emoji: ✍️
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
---

# Handwriting OCR

Self-hosted handwriting recognition for the Task Management System's
"Add Tasks from Photo" feature. Runs TrOCR (`microsoft/trocr-base-handwritten`),
an open-source model fine-tuned specifically on handwritten text — more
accurate on real (including cursive) handwriting than the free client-side
engine (Tesseract.js) the app used before.

## API

`POST /scan` — multipart form upload, field name `file` (an image).
Returns `{"lines": ["...", "..."]}`, one entry per detected line.

`GET /` — health check.

## Deploying

1. Create a new Space on huggingface.co/new-space, SDK: **Docker**.
2. Push this directory's contents to the Space's git remote:
   ```
   git remote add space https://huggingface.co/spaces/<your-username>/<space-name>
   git push space main
   ```
   (or upload the files via the Space's web UI "Files" tab instead.)
3. Wait for the build to finish (the Docker image downloads the model
   weights at build time, so the first build takes several minutes).
4. Your endpoint is `https://<your-username>-<space-name>.hf.space/scan` —
   update `HANDWRITING_OCR_ENDPOINT` in
   `src/team-task-dashboard/index.html` with that URL.

Free CPU Spaces can go idle and take ~30-60 seconds to wake back up after a
period of no traffic — the app's "Reading your handwriting…" screen
accounts for this with a generous timeout, but the very first scan after
a quiet period may take noticeably longer than later ones.
