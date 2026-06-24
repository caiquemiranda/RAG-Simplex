<#
  frontend.ps1 - Sobe o frontend (Vite/React) de forma NATIVA.
  Cache do npm fica em .cache/ dentro do repo (no D:), para nao encher o C:.

  Uso:
    powershell -ExecutionPolicy Bypass -File scripts\frontend.ps1
  Flag:
    -Reinstalar   apaga node_modules e reinstala
#>
param([switch]$Reinstalar)
$ErrorActionPreference = 'Stop'

$raiz  = (Resolve-Path "$PSScriptRoot\..").Path
$front = Join-Path $raiz 'frontend'
Set-Location $front

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw 'npm nao encontrado no PATH. Instale o Node.js e tente de novo.'
}

# Cache do npm no proprio repo (D:), so para este processo.
$env:npm_config_cache = Join-Path $raiz '.cache\npm'

if ($Reinstalar -and (Test-Path 'node_modules')) {
    Write-Host '== Removendo node_modules para reinstalar ==' -ForegroundColor Yellow
    Remove-Item 'node_modules' -Recurse -Force
}

if (-not (Test-Path 'node_modules')) {
    Write-Host '== Instalando dependencias (npm install) ==' -ForegroundColor Cyan
    npm install
}

Write-Host ''
Write-Host '== Frontend no ar: http://localhost:5173   (Ctrl+C para parar) ==' -ForegroundColor Green
npm run dev
