# Stage 1: Build dependencies
FROM python:3.12-slim AS builder

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Production image
FROM python:3.12-slim

LABEL maintainer="ShowShung-mafia"
LABEL description="ShowShung - Persian online Mafia party game"
LABEL version="1.0"

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application files (ordered by change frequency for layer caching)
COPY manifest.json icon-192.png icon-512.png icon.svg sw.js robots.txt sitemap.xml ./
COPY css/ css/
COPY js/ js/
COPY img/ img/
COPY seo/ seo/

# Copy Python modules (architecture: config, models, routes, services, sockets, utils)
COPY extensions.py ./
COPY config/ config/
COPY models/ models/
COPY routes/ routes/
COPY services/ services/
COPY sockets/ sockets/
COPY utils/ utils/
COPY *.html app.py ./

RUN mkdir -p /app/instance /app/data

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/api/version')" || exit 1

CMD ["python", "app.py"]
