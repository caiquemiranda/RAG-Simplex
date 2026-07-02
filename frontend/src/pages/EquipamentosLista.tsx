import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, type ClienteVisivel, type Equipamento, type EquipamentoLista } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/ui/button'
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
  const { usuario } = useAuth()
  const podeGerir = usuario?.permissoes.includes('gerir_usuarios') ?? false
  const [clientes, setClientes] = useState<ClienteVisivel[]>([])
  const [equip, setEquip] = useState<Equipamento[]>([])
  const [busca, setBusca] = useState('')
  const [fTipo, setFTipo] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fModel, setFModel] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  // #EQP-LISTAS: listas nomeadas do cliente.
  const [listas, setListas] = useState<EquipamentoLista[]>([])
  const [listaSel, setListaSel] = useState<number | null>(null)   // filtro ativo por lista
  const [modal, setModal] = useState<{ lista?: EquipamentoLista } | null>(null)

  function carregarListas() {
    if (!id || !podeGerir) { setListas([]); return }
    api.admin.listas(Number(id)).then(setListas).catch(() => setListas([]))
  }
  useEffect(() => {
    api.clientesVisiveis().then(setClientes).catch(() => {})
  }, [])
  useEffect(() => {
    if (!id) { setEquip([]); return }
    setErro(null); setListaSel(null)
    api.equipamentosCliente(Number(id)).then(setEquip)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Falha ao carregar equipamentos'))
    carregarListas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, podeGerir])

  // Visão de um cliente (lista) — busca + filtros por várias colunas (#EQP-FILTROS+).
  const opcoes = (sel: (e: Equipamento) => string) =>
    [...new Set(equip.map(sel).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const tipos = useMemo(() => opcoes((e) => e.type), [equip])
  const models = useMemo(() => opcoes((e) => e.model), [equip])
  const statuses = useMemo(() => opcoes(rotuloStatus), [equip])
  const idsDaLista = useMemo(
    () => (listaSel == null ? null : new Set(listas.find((l) => l.id === listaSel)?.equipamento_ids ?? [])),
    [listaSel, listas],
  )
  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return equip.filter((e) =>
      (!idsDaLista || idsDaLista.has(e.id)) &&
      (!fTipo || e.type === fTipo) &&
      (!fModel || e.model === fModel) &&
      (!fStatus || rotuloStatus(e) === fStatus) &&
      (!t || [e.tag, e.add, e.painel, e.loop, e.model].some((v) => (v || '').toLowerCase().includes(t))),
    )
  }, [equip, busca, fTipo, fModel, fStatus, idsDaLista])

  async function removerLista(l: EquipamentoLista) {
    if (!window.confirm(`Remover a lista "${l.nome}"?`)) return
    try { await api.admin.removerLista(l.id); if (listaSel === l.id) setListaSel(null); carregarListas() }
    catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao remover a lista') }
  }

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
            {/* Listas nomeadas (#EQP-LISTAS) — chips no topo */}
            {podeGerir && (
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <button className={`rounded-full border px-3 py-1 text-xs ${listaSel == null ? 'border-primary bg-accent font-medium' : 'hover:bg-accent'}`}
                        onClick={() => setListaSel(null)}>Todas</button>
                {listas.map((l) => (
                  <span key={l.id} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${listaSel === l.id ? 'border-primary bg-accent font-medium' : ''}`}>
                    <button onClick={() => setListaSel(listaSel === l.id ? null : l.id)}>{l.nome} ({l.equipamento_ids.length})</button>
                    <button className="text-muted-foreground hover:text-primary" title="Editar lista" onClick={() => setModal({ lista: l })}>✎</button>
                    <button className="text-muted-foreground hover:text-destructive" title="Remover lista" onClick={() => removerLista(l)}>✕</button>
                  </span>
                ))}
                <button className="rounded-full border border-dashed px-3 py-1 text-xs text-primary hover:bg-accent" onClick={() => setModal({})}>+ Criar lista</button>
              </div>
            )}
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

        {modal && podeGerir && (
          <ModalLista clienteId={Number(id)} equip={equip} lista={modal.lista}
                      aoFechar={() => setModal(null)} aoSalvar={() => { setModal(null); carregarListas() }} />
        )}
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

/** Modal para criar/editar uma lista de equipamentos (#EQP-LISTAS): nome + seleção por checkbox. */
function ModalLista({ clienteId, equip, lista, aoFechar, aoSalvar }: {
  clienteId: number
  equip: Equipamento[]
  lista?: EquipamentoLista
  aoFechar: () => void
  aoSalvar: () => void
}) {
  const [nome, setNome] = useState(lista?.nome ?? '')
  const [sel, setSel] = useState<Set<number>>(new Set(lista?.equipamento_ids ?? []))
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return equip.filter((e) => !t || [e.tag, e.add, e.type, e.model].some((v) => (v || '').toLowerCase().includes(t)))
  }, [equip, busca])

  async function salvar() {
    if (!nome.trim()) { setErro('Informe o nome da lista.'); return }
    setErro(null); setSalvando(true)
    try {
      const ids = Array.from(sel)
      if (lista) await api.admin.atualizarLista(lista.id, { nome: nome.trim(), equipamento_ids: ids })
      else await api.admin.criarLista(clienteId, { nome: nome.trim(), equipamento_ids: ids })
      aoSalvar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao salvar a lista')
    } finally { setSalvando(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/40" aria-label="Fechar" onClick={aoFechar} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border bg-card shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b p-4">
          <h2 className="font-semibold">{lista ? 'Editar lista' : 'Nova lista de equipamentos'}</h2>
          <button className="rounded p-1 text-muted-foreground hover:bg-accent" onClick={aoFechar}>✕</button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da lista (ex.: Preventiva Q4 — pavimento 3)" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Filtrar equipamentos…" />
          <p className="text-xs text-muted-foreground">{sel.size} selecionado(s) de {equip.length}</p>
          <div className="space-y-1">
            {visiveis.map((e) => {
              const marcado = sel.has(e.id)
              return (
                <label key={e.id} className={`flex cursor-pointer items-center gap-2 rounded border px-2 py-1 text-sm ${marcado ? 'border-primary bg-accent' : ''}`}>
                  <input type="checkbox" checked={marcado} onChange={(ev) => {
                    const s = new Set(sel)
                    if (ev.target.checked) s.add(e.id); else s.delete(e.id)
                    setSel(s)
                  }} />
                  <span className="font-mono text-xs">{e.tag || e.add || `#${e.id}`}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{e.type}{e.model ? ` · ${e.model}` : ''}</span>
                </label>
              )
            })}
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 border-t p-4">
          <Button variant="outline" size="sm" onClick={aoFechar}>Cancelar</Button>
          <Button size="sm" onClick={salvar} disabled={salvando || !nome.trim()}>{salvando ? 'Salvando…' : 'Salvar'}</Button>
        </div>
      </div>
    </div>
  )
}
