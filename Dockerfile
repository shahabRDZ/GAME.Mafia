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

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -s /sbin/nologin appuser

# Copy application files (ordered by change frequency for layer caching)
COPY manifest.json icon-192.png icon-512.png icon.svg sw.js ./
COPY css/ css/
COPY js/ js/
COPY img/ img/
COPY audio/ audio/
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

# Switch to non-root user
USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/')" || exit 1

CMD ["python", "app.py"]
