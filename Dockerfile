FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY mafia.html .
COPY admin.html .
COPY app.py .
COPY css/ css/
COPY js/ js/
COPY manifest.json .
COPY icon-192.png .
COPY icon-512.png .
COPY icon.svg .

EXPOSE 5000

CMD ["python", "app.py"]
