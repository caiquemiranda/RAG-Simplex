# Imagem do backend (FastAPI + ChromaDB embarcado + SQLite + embeddings e5).
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Ferramentas de build para wheels nativas (hnswlib/chromadb) — removidas depois.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
# Instala o PyTorch CPU-only ANTES do requirements: evita baixar a build com CUDA
# (~2 GB de libs NVIDIA inúteis num app CPU-only). Mesmos resultados, imagem menor
# e build muito mais rápido. Para usar GPU no futuro, remova esta linha do índice
# CPU e deixe o requirements puxar o torch padrão (com CUDA).
RUN pip install --upgrade pip \
    && pip install torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install -r requirements.txt

# Pré-cacheia o modelo de embeddings na imagem (sem download em runtime).
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('intfloat/multilingual-e5-small')"

# A partir daqui, tudo roda offline (modelo já está na imagem).
ENV HF_HUB_OFFLINE=1 \
    TRANSFORMERS_OFFLINE=1

COPY app ./app
COPY docs ./docs
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
