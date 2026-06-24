<#
  run.ps1 - Sobe BACKEND e FRONTEND juntos, cada um na sua propria janela.
  Para rodar so um, use scripts\backend.ps1 ou scripts\frontend.ps1.

  Uso:
    powershell -ExecutionPolicy Bypass -File scripts\run.ps1
  Flags (repassadas aos scripts):
    -Reinstalar        recria o .venv do backend
    -Reindexar         refaz a ingestao do guia
    -ReinstalarFront   reinstala o node_modules do frontend
#>
param([switch]$Reinstalar, [switch]$Reindexar, [switch]$ReinstalarFront)

$scripts = $PSScriptRoot
$back  = '"' + (Join-Path $scripts 'backend.ps1')  + '"'
$front = '"' + (Join-Path $scripts 'frontend.ps1') + '"'

$argsBack = @('-NoExit','-ExecutionPolicy','Bypass','-File',$back)
if ($Reinstalar) { $argsBack += '-Reinstalar' }
if ($Reindexar)  { $argsBack += '-Reindexar' }

$argsFront = @('-NoExit','-ExecutionPolicy','Bypass','-File',$front)
if ($ReinstalarFront) { $argsFront += '-Reinstalar' }

Write-Host '== Abrindo o BACKEND em nova janela ==' -ForegroundColor Cyan
Start-Process powershell -ArgumentList $argsBack

Write-Host '== Abrindo o FRONTEND em nova janela ==' -ForegroundColor Cyan
Start-Process powershell -ArgumentList $argsFront

Write-Host ''
Write-Host 'Subindo nas duas janelas. Quando terminarem de carregar, acesse:' -ForegroundColor Green
Write-Host '  Frontend: http://localhost:5173'
Write-Host '  API:      http://127.0.0.1:8000/docs'
Write-Host '  Login:    admin@local / admin123  (criado na 1a vez)'
