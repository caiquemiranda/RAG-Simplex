import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, type ClienteVisivel, type Equipamento } from '../lib/api'
import { Avatar } from '../components/Avatar'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

/** Lista de equipamentos por cliente (#EQP-2): cards de clientes → lista do cliente. */
export default function EquipamentosLista() {
  const { id } = useParams()
  const [clientes, setClientes] = useState<ClienteVisivel[]>([])
  const [equip, setEquip] = useState<Equipamento[]>([])
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    api.clientesVisiveis().then(setClientes).catch(() => {})
  }, [])
  useEffect(() => {
    if (!id) { setEquip([]); return }
    setErro(null)
    api.equipamentosCliente(Number(id)).then(setEquip)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Falha ao carregar equipamentos'))
  }, [id])

  // Visão de um cliente (lista de equipamentos).
  if (id) {
    const cli = clientes.find((c) => c.id === Number(id))
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <nav className="text-xs text-muted-foreground">
          <Link to="/equipamentos/lista" className="hover:underline">Equipamentos</Link>
          <span className="mx-1">/</span>
          <span className="text-foreground">{cli?.nome ?? 'Cliente'}</span>
        </nav>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <Card>
          <CardHeader><CardTitle className="text-base">Equipamentos ({equip.length})</CardTitle></CardHeader>
          <CardContent>
            {equip.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum equipamento cadastrado para este cliente.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-1 pr-2">Painel</th><th className="py-1 pr-2">Loop</th><th className="py-1 pr-2">Add</th><th className="py-1 pr-2">Type</th><th className="py-1 pr-2">Model</th>
                  </tr></thead>
                  <tbody>
                    {equip.map((e) => (
                      <tr key={e.id} className="border-b">
                        <td className="py-1 pr-2 font-mono text-xs">{e.painel}</td>
                        <td className="py-1 pr-2 font-mono text-xs">{e.loop}</td>
                        <td className="py-1 pr-2 font-mono text-xs">{e.add}</td>
                        <td className="py-1 pr-2">{e.type}</td>
                        <td className="py-1 pr-2">{e.model}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Visão geral: cards por cliente.
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <h1 className="text-lg font-semibold">Lista de equipamentos</h1>
      <p className="text-sm text-muted-foreground">Escolha um cliente para ver seus equipamentos.</p>
      {clientes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum cliente disponível.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {clientes.map((c) => (
            <Link key={c.id} to={`/equipamentos/lista/${c.id}`}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent">
              <Avatar nome={c.nome} fotoUrl={c.logo_url} cor={c.cor} className="h-10 w-10" />
              <span className="min-w-0 truncate text-sm font-medium">{c.nome}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
