import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, type ClienteVisivel, type Equipamento } from '../lib/api'
import { Avatar } from '../components/Avatar'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { TabelaOrdenavel, type Coluna } from '../components/TabelaOrdenavel'
import { corStatusEquip } from '../lib/format'

/** Rótulo de estado do equipamento (mostra a falha quando "em falha"). */
function rotuloStatus(e: Equipamento): string {
  return e.falha_nome ? `Em falha (${e.falha_nome})` : (e.status || '—')
}

/** Lista de equipamentos por cliente (#EQP-2): cards de clientes → lista do cliente. */
export default function EquipamentosLista() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [clientes, setClientes] = useState<ClienteVisivel[]>([])
  const [equip, setEquip] = useState<Equipamento[]>([])
  const [busca, setBusca] = useState('')
  const [fTipo, setFTipo] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fModel, setFModel] = useState('')
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

  // Visão de um cliente (lista) — busca + filtros por várias colunas (#EQP-FILTROS+).
  const opcoes = (sel: (e: Equipamento) => string) =>
    [...new Set(equip.map(sel).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const tipos = useMemo(() => opcoes((e) => e.type), [equip])
  const models = useMemo(() => opcoes((e) => e.model), [equip])
  const statuses = useMemo(() => opcoes(rotuloStatus), [equip])
  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return equip.filter((e) =>
      (!fTipo || e.type === fTipo) &&
      (!fModel || e.model === fModel) &&
      (!fStatus || rotuloStatus(e) === fStatus) &&
      (!t || [e.tag, e.add, e.painel, e.loop, e.model].some((v) => (v || '').toLowerCase().includes(t))),
    )
  }, [equip, busca, fTipo, fModel, fStatus])

  // Colunas da tabela ordenável (#TAB-ORDEM).
  const colunas: Coluna<Equipamento>[] = [
    { chave: 'tag', titulo: 'Tag', className: 'font-mono text-xs font-medium', render: (e) => e.tag || '—' },
    { chave: 'painel', titulo: 'Painel', className: 'font-mono text-xs' },
    { chave: 'loop', titulo: 'Loop', className: 'font-mono text-xs' },
    { chave: 'add', titulo: 'Add', className: 'font-mono text-xs' },
    { chave: 'type', titulo: 'Type' },
    { chave: 'model', titulo: 'Model' },
    {
      chave: 'status', titulo: 'Status', valor: rotuloStatus,
      render: (e) => (
        <span className="inline-flex items-center gap-1.5 text-xs">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: corStatusEquip(e.status, e.falha_id != null) }} />
          {rotuloStatus(e)}
        </span>
      ),
    },
    { chave: 'ultima_manutencao', titulo: 'Últ. manut.', className: 'text-xs text-muted-foreground', render: (e) => e.ultima_manutencao ?? '—' },
  ]

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
          <CardHeader><CardTitle className="text-base">Equipamentos ({filtrados.length}/{equip.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Input className="w-64" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar (tag, add, painel, loop, model)…" />
              <select className="h-9 rounded-md border bg-background px-3 text-sm" value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
                <option value="">Todos os tipos</option>
                {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className="h-9 rounded-md border bg-background px-3 text-sm" value={fModel} onChange={(e) => setFModel(e.target.value)}>
                <option value="">Todos os modelos</option>
                {models.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select className="h-9 rounded-md border bg-background px-3 text-sm" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                <option value="">Todos os status</option>
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {(busca || fTipo || fModel || fStatus) && (
                <button className="text-xs text-primary hover:underline" onClick={() => { setBusca(''); setFTipo(''); setFModel(''); setFStatus('') }}>limpar</button>
              )}
            </div>
            <TabelaOrdenavel
              colunas={colunas} linhas={filtrados} chaveLinha={(e) => e.id}
              aoClicarLinha={(e) => navigate(`/equipamentos/${id}/${e.id}`)}
              vazio={<p className="py-2 text-sm text-muted-foreground">{equip.length === 0 ? 'Nenhum equipamento cadastrado para este cliente.' : 'Nenhum equipamento corresponde ao filtro.'}</p>}
            />
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
