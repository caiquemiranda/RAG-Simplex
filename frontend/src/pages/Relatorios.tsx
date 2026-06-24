import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type ClienteVisivel } from '../lib/api'
import { Avatar } from '../components/Avatar'

export default function Relatorios() {
  const navegar = useNavigate()
  const [clientes, setClientes] = useState<ClienteVisivel[]>([])
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    api.clientesVisiveis().then(setClientes).catch((e) => setErro(e instanceof Error ? e.message : 'Falha ao carregar'))
  }, [])

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <h1 className="text-lg font-semibold">Relatórios por cliente</h1>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        {clientes.length === 0 && !erro && (
          <p className="text-sm text-muted-foreground">Nenhum cliente disponível.</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clientes.map((c) => (
            <button
              key={c.id}
              onClick={() => navegar(`/relatorios/${c.id}`)}
              className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition hover:border-primary hover:shadow-md"
            >
              <Avatar nome={c.nome} fotoUrl={c.logo_url} cor={c.cor} className="h-12 w-12 text-sm" />
              <div className="min-w-0">
                <div className="truncate font-semibold">{c.nome}</div>
                <div className="truncate text-xs text-muted-foreground">{c.unidade ?? '—'}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
