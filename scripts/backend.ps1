<#
  backend.ps1 - Sobe o backend (FastAPI/uvicorn) de forma NATIVA, sem Docker.
  Caches (pip e modelo HuggingFace) ficam em .cache/ dentro do repo (no D:),
  para nao encher o C:.

  Uso:
    powershell -ExecutionPolicy Bypass -File scripts\backend.ps1
  Flags:
    -Reinstalar   apaga o .venv e reinstala todas as dependencias
    -Reindexar    refaz a ingestao (reindexa o guia no ChromaDB)
#>
param([switch]$Reinstalar, [switch]$Reindexar)
$ErrorActionPreference = 'Stop'

$raiz = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $raiz

# --- Caches no proprio repo (D:) em vez do C: ---
$env:PIP_CACHE_DIR = Join-Path $raiz '.cache\pip'
$env:HF_HOME       = Join-Path $raiz '.cache\hf'
New-Item -ItemType Directory -Force -Path $env:PIP_CACHE_DIR, $env:HF_HOME, (Join-Path $raiz 'data\processed') | Out-Null

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw 'Python nao encontrado no PATH. Instale o Python 3.10+ e tente de novo.'
}

$venv     = Join-Path $raiz '.venv'
$activate = Join-Path $venv 'Scripts\Activate.ps1'

if ($Reinstalar -and (Test-Path $venv)) {
    Write-Host '== Removendo .venv para reinstalar ==' -ForegroundColor Yellow
    Remove-Item $venv -Recurse -Force
}

if (-not (Test-Path $activate)) {
    Write-Host '== Criando ambiente virtual (.venv) ==' -ForegroundColor Cyan
    python -m venv $venv
    & $activate
    python -m pip install --upgrade pip
    Write-Host '== Instalando PyTorch (CPU-only) ==' -ForegroundColor Cyan
    pip install torch --index-url https://download.pytorch.org/whl/cpu
    Write-Host '== Instalando dependencias do projeto ==' -ForegroundColor Cyan
    pip install -r requirements.txt
} else {
    & $activate
}

# --- Banco + admin padrao (apenas na primeira vez) ---
$dbFile = Join-Path $raiz 'data\processed\ragsimplex.db'
if (-not (Test-Path $dbFile)) {
    Write-Host '== Inicializando o banco (db --init) ==' -ForegroundColor Cyan
    python -m app.db --init
    Write-Host '== Criando admin padrao ==' -ForegroundColor Cyan
    python -m app.auth --criar-admin admin@local admin123
    Write-Host '   >>> Login: admin@local   Senha: admin123   (troque depois!)' -ForegroundColor Green
}

# --- Ingestao (apenas se ainda nao houver indice) ---
$chroma = Join-Path $raiz 'data\processed\chroma'
if ($Reindexar -or -not (Test-Path $chroma)) {
    Write-Host '== Indexando o guia (ingestao) -- baixa o modelo na 1a vez ==' -ForegroundColor Cyan
    python -m app.ingestao --reset
}

Write-Host ''
Write-Host '== API no ar: http://127.0.0.1:8000/docs   (Ctrl+C para parar) ==' -ForegroundColor Green
uvicorn app.main:app --reload
