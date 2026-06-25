import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, type ClienteVisivel } from '../lib/api'
import { Avatar } from '../components/Avatar'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

export default function RelatorioCliente() {
  const { id } = useParams()
  const [cliente, setCliente] = useState<ClienteVisivel | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    api.clientesVisiveis()
      .then((cs) => setCliente(cs.find((c) => String(c.id) === id) ?? null))
      .catch((e) => setErro(e instanceof Error ? e.message : 'Falha ao carregar'))
  }, [id])

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <Link to="/relatorios" className="text-sm text-primary hover:underline">← Relatórios</Link>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        {!cliente && !erro && <p className="text-sm text-muted-foreground">Cliente não encontrado.</p>}
        {cliente && (
          <>
            <div className="flex items-center gap-3">
              <Avatar nome={cliente.nome} fotoUrl={cliente.logo_url} cor={cliente.cor} className="h-14 w-14 text-base" />
              <div>
                <h1 className="text-xl font-semibold">{cliente.nome}</h1>
                <p className="text-sm text-muted-foreground">{cliente.unidade ?? '—'}</p>
              </div>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">Relatório</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                🚧 Em breve: visitas do cliente, técnicos que o atendem, documentos e
                indicadores. (A identidade visual — cor/logo — é definida no card Clientes do ADM.)
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
