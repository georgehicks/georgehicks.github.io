# Always-on worker in a container: runs the same on a NAS, Raspberry Pi, VPS, Mac, Windows (anything with Docker).
FROM python:3.12-slim
RUN pip install --no-cache-dir "playwright>=1.51" && playwright install --with-deps chromium
WORKDIR /app
COPY abidingsteps_worker.py .
# bundled Chromium (no system Chrome in the image); root in a container needs --no-sandbox
ENV ABIDINGSTEPS_WORKER_HOME=/data ABIDINGSTEPS_BROWSER_CHANNEL= ABIDINGSTEPS_NO_SANDBOX=1 PYTHONUNBUFFERED=1
CMD ["python", "abidingsteps_worker.py", "--service"]
