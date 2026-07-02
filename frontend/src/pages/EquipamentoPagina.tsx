import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, urlArquivo, type ClienteVisivel, type DocEquip, type Equipamento, type Visita } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { STATUS_VISITA, TIPO_OS_COR, TIPO_OS_LABEL, TIPOS_OS, corStatusEquip } from '../lib/format'

/** Página de um dispositivo (#EQP-PAGINA): dados + O.S. associadas (com filtros) + documentos. */
export default function EquipamentoPagina() {
  const { clienteId, eqpId } = useParams()
  const cid = Number(clienteId)
  const eid = Number(eqpId)
  const [cliente, setCliente] = useState<ClienteVisivel | null>(null)
  const [eq, setEq] = useState<Equipamento | null>(null)
  const [ordens, setOrdens] = useState<Visita[]>([])
  const [docs, setDocs] = useState<DocEquip[]>([])
  const [erro, setErro] = useState<string | null>(null)
  // #OS-HIST-FILTRO: busca + filtros do histórico.
  const [busca, setBusca] = useState('')
  const [fFalha, setFFalha] = useState('')
  const [fTipo, setFTipo] = useState('')

  useEffect(() => {
    api.clientesVisiveis().then((cs) => setCliente(cs.find((c) => c.id === cid) ?? null)).catch(() => {})
    api.equipamentosCliente(cid).then((es) => setEq(es.find((e) => e.id === eid) ?? null))
      .catch((e) => setErro(e instanceof Error ? e.message : 'Falha ao carregar o equipamento'))
    api.ordensEquipamento(eid).then(setOrdens).catch(() => setOrdens([]))
    // Documentos da marca (manuais/datasheets) — associação por model/type (D-026).
    api.biblioteca.listar({ categoria: 'marcas' }).then(setDocs).catch(() => setDocs([]))
  }, [cid, eid])

  // Documentos "associados": os da biblioteca (Marcas) cujo nome/marca casa com model/type do equipamento.
  const docsAssociados = useMemo(() => {
    if (!eq) return []
    const alvos = [eq.model, eq.type].map((s) => (s || '').toLowerCase().trim()).filter(Boolean)
    if (alvos.length === 0) return []
    return docs.filter((d) => {
      const hay = `${d.nome} ${d.marca}`.toLowerCase()
      return alvos.some((a) => hay.includes(a))
    })
  }, [docs, eq])

  const falhasNasOrdens = useMemo(
    () => [...new Set(ordens.map((o) => o.falha_nome).filter(Boolean) as string[])].sort(),
    [ordens],
  )
  const ordensFiltradas = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return ordens.filter((o) =>
      (!fFalha || o.falha_nome === fFalha) &&
      (!fTipo || o.tipo === fTipo) &&
      (!t || [o.titulo, o.data, ...o.tecnicos.map((x) => x.nome)].some((v) => (v || '').toLowerCase().includes(t))),
    )
  }, [ordens, busca, fFalha, fTipo])

  const emFalha = eq?.falha_id != null

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <nav className="text-xs text-muted-foreground">
        <Link to="/equipamentos/lista" className="hover:underline">Equipamentos</Link>
        <span className="mx-1">/</span>
        <Link to={`/equipamentos/lista/${cid}`} className="hover:underline">{cliente?.nome ?? 'Cliente'}</Link>
        <span className="mx-1">/</span>
        <span className="text-foreground">{eq?.tag || `#${eid}`}</span>
      </nav>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      {!eq ? (
        <p className="text-sm text-muted-foreground">Carregando equipamento…</p>
      ) : (
        <>
          {/* Dados do equipamento */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{eq.tag || `Equipamento #${eq.id}`}</CardTitle>
              <span className="inline-flex items-center gap-1.5 text-xs">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: corStatusEquip(eq.status, emFalha) }} />
                {emFalha ? `Em falha (${eq.falha_nome})` : (eq.status || '—')}
              </span>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
              <div><span className="text-muted-foreground">Painel:</span> {eq.painel || '—'}</div>
              <div><span className="text-muted-foreground">Loop:</span> {eq.loop || '—'}</div>
              <div><span className="text-muted-foreground">Endereço (add):</span> {eq.add || '—'}</div>
              <div><span className="text-muted-foreground">Tipo:</span> {eq.type || '—'}</div>
              <div><span className="text-muted-foreground">Modelo:</span> {eq.model || '—'}</div>
              <div><span className="text-muted-foreground">Coordenadas:</span> {eq.pos_x != null ? `X ${eq.pos_x}, Y ${eq.pos_y}` : '—'}</div>
              <div><span className="text-muted-foreground">Última manutenção:</span> {eq.ultima_manutencao ?? '—'}</div>
              <div><span className="text-muted-foreground">Último teste:</span> {eq.ultimo_teste ?? '—'}</div>
            </CardContent>
          </Card>

          {/* Documentos associados (manuais/datasheets da biblioteca → Marcas) */}
          <Card>
            <CardHeader><CardTitle className="text-base">Documentos ({docsAssociados.length})</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {docsAssociados.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum manual/datasheet casando com o modelo. Cadastre em <Link to="/documentos?cat=marcas" className="text-primary hover:underline">Documentos → Marcas</Link>.
                </p>
              ) : docsAssociados.map((d) => (
                <a key={d.id} href={urlArquivo(d.url)} target="_blank" rel="noreferrer"
                   className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent">
                  <span className="text-muted-foreground">📄</span>
                  <span className="min-w-0 flex-1 truncate">{d.nome}</span>
                  {d.marca && <span className="shrink-0 text-xs text-muted-foreground">{d.marca}</span>}
                </a>
              ))}
            </CardContent>
          </Card>

          {/* O.S. associadas + filtros (#OS-HIST-FILTRO) */}
          <Card>
            <CardHeader><CardTitle className="text-base">Ordens de Serviço ({ordensFiltradas.length}/{ordens.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Input className="w-56" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar (título, técnico, data)…" />
                <select className="h-9 rounded-md border bg-background px-3 text-sm" value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
                  <option value="">Todos os tipos</option>
                  {TIPOS_OS.map((t) => <option key={t} value={t}>{TIPO_OS_LABEL[t]}</option>)}
                </select>
                <select className="h-9 rounded-md border bg-background px-3 text-sm" value={fFalha} onChange={(e) => setFFalha(e.target.value)}>
                  <option value="">Todas as falhas</option>
                  {falhasNasOrdens.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                {(busca || fTipo || fFalha) && (
                  <button className="text-xs text-primary hover:underline" onClick={() => { setBusca(''); setFTipo(''); setFFalha('') }}>limpar</button>
                )}
              </div>
              {ordensFiltradas.length === 0 ? (
                <p className="text-sm text-muted-foreground">{ordens.length === 0 ? 'Nenhuma O.S. registrada para este equipamento.' : 'Nenhuma O.S. corresponde ao filtro.'}</p>
              ) : (
                <div className="space-y-2">
                  {ordensFiltradas.map((o) => (
                    <Link key={o.id} to={`/cronograma/atividade/${o.id}`}
                          className="block rounded-md border-l-2 border-primary bg-muted/30 p-2 hover:bg-accent/40">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-primary">{o.data}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${TIPO_OS_COR[o.tipo] ?? 'bg-muted'}`}>{o.tipo}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${STATUS_VISITA[o.status] ?? ''}`}>{o.status}</span>
                      </div>
                      <div className="text-sm">{o.titulo || '—'}</div>
                      {o.falha_nome && <div className="text-xs text-muted-foreground">Falha: {o.falha_nome}</div>}
                      {o.tecnicos.length > 0 && <div className="text-xs text-muted-foreground">Técnico(s): {o.tecnicos.map((t) => t.nome).join(', ')}</div>}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
