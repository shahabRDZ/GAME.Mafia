FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY mafia.html .
COPY app.py .
COPY css/ css/
COPY js/ js/

EXPOSE 5000

CMD ["python", "app.py"]
