import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type ContatoChat } from '../lib/api'
import { Avatar } from '../components/Avatar'

/** Lista de contatos do chat interno (#CHAT) — cada usuário abre uma conversa 1-a-1. */
export default function Conversas() {
  const navigate = useNavigate()
  const [contatos, setContatos] = useState<ContatoChat[]>([])
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    api.conversas.contatos().then(setContatos).catch((e) => setErro(e instanceof Error ? e.message : 'Falha ao carregar'))
  }, [])

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4">
      <h1 className="text-lg font-semibold">Conversas</h1>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      {contatos.length === 0 && !erro && <p className="text-sm text-muted-foreground">Nenhum outro usuário.</p>}
      <div className="divide-y rounded-lg border">
        {contatos.map((c) => (
          <button key={c.id} onClick={() => navigate(`/conversas/${c.id}`)}
                  className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent">
            <Avatar nome={c.nome} fotoUrl={c.foto ?? undefined} className="h-10 w-10" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{c.nome}</div>
              <div className="truncate text-xs text-muted-foreground">{c.email}</div>
            </div>
            {c.nao_lidas > 0 && (
              <span className="shrink-0 rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground tabular-nums">{c.nao_lidas}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
