# scripts/ — rodar o projeto nativo (Windows / PowerShell)

Scripts para subir o RAG-Simplex **sem Docker**. Os caches (pip, modelo
HuggingFace e npm) são gravados em `.cache/` dentro do repo (no D:), então
**não enchem o C:**. `.cache/` e `.venv/` já estão no `.gitignore`.

## Uso

A partir da raiz do projeto (`D:\GIT-repository\RAG-simplex`):

```powershell
# tudo de uma vez (abre 2 janelas: backend + frontend)
powershell -ExecutionPolicy Bypass -File scripts\run.ps1

# só o backend
powershell -ExecutionPolicy Bypass -File scripts\backend.ps1

# só o frontend
powershell -ExecutionPolicy Bypass -File scripts\frontend.ps1
```

## Endereços

- Frontend: http://localhost:5173
- API (Swagger): http://127.0.0.1:8000/docs
- Login criado na 1ª execução: **admin@local / admin123** (troque depois)

## Flags úteis

| Script | Flag | O que faz |
| --- | --- | --- |
| `backend.ps1` | `-Reinstalar` | apaga o `.venv` e reinstala tudo |
| `backend.ps1` | `-Reindexar` | refaz a ingestão (reindexa o guia) |
| `frontend.ps1` | `-Reinstalar` | apaga `node_modules` e reinstala |
| `run.ps1` | `-Reinstalar` / `-Reindexar` / `-ReinstalarFront` | repassa às janelas |

## O que cada script faz na 1ª vez

- **backend**: cria `.venv` → instala PyTorch (CPU) + `requirements.txt` →
  `db --init` + cria admin → ingestão (baixa o modelo e5) → sobe o uvicorn.
- **frontend**: `npm install` → `npm run dev`.

Da 2ª vez em diante ele detecta o que já existe e pula direto para subir.
