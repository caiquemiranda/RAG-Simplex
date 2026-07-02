import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, urlArquivo, type ClienteVisivel, type DocEquip, type DocEquipRef, type Equipamento, type Visita } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { IconDoc, IconClose } from '../components/icons'
import { STATUS_VISITA, TIPO_OS_COR, TIPO_OS_LABEL, TIPOS_OS, corStatusEquip, intervaloData } from '../lib/format'

/** Página de um dispositivo (#EQP-PAGINA): dados + O.S. associadas (com filtros) + documentos. */
export default function EquipamentoPagina() {
  const { clienteId, eqpId } = useParams()
  const cid = Number(clienteId)
  const eid = Number(eqpId)
  const { usuario } = useAuth()
  const podeGerir = usuario?.permissoes.includes('gerir_usuarios') ?? false
  const [cliente, setCliente] = useState<ClienteVisivel | null>(null)
  const [eq, setEq] = useState<Equipamento | null>(null)
  const [ordens, setOrdens] = useState<Visita[]>([])
  const [docsFixados, setDocsFixados] = useState<DocEquipRef[]>([])   // #EQP-DOC: manuais fixados
  const [marcas, setMarcas] = useState<DocEquip[]>([])                // biblioteca (Marcas) — p/ o seletor
  const [gerenciar, setGerenciar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  // #OS-HIST-FILTRO: busca + filtros do histórico. #OS-HIST-DATAS: período (semana/mês/todo).
  const [busca, setBusca] = useState('')
  const [fFalha, setFFalha] = useState('')
  const [fTipo, setFTipo] = useState('')
  const [fPeriodo, setFPeriodo] = useState<'tudo' | 'semana' | 'mes'>('tudo')

  function carregarDocs() {
    api.documentosEquipamento(eid).then(setDocsFixados).catch(() => setDocsFixados([]))
  }
  useEffect(() => {
    api.clientesVisiveis().then((cs) => setCliente(cs.find((c) => c.id === cid) ?? null)).catch(() => {})
    api.equipamentosCliente(cid).then((es) => setEq(es.find((e) => e.id === eid) ?? null))
      .catch((e) => setErro(e instanceof Error ? e.message : 'Falha ao carregar o equipamento'))
    api.ordensEquipamento(eid).then(setOrdens).catch(() => setOrdens([]))
    carregarDocs()
    // Biblioteca (Marcas) só é necessária para o admin gerenciar os vínculos.
    if (podeGerir) api.biblioteca.listar({ categoria: 'marca' }).then(setMarcas).catch(() => setMarcas([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid, eid, podeGerir])

  const falhasNasOrdens = useMemo(
    () => [...new Set(ordens.map((o) => o.falha_nome).filter(Boolean) as string[])].sort(),
    [ordens],
  )
  const ordensFiltradas = useMemo(() => {
    const t = busca.trim().toLowerCase()
    // #OS-HIST-DATAS: corte por período (relativo a hoje). Usa data_fim se houver (fim do intervalo).
    let corte = ''
    if (fPeriodo !== 'tudo') {
      const d = new Date()
      d.setDate(d.getDate() - (fPeriodo === 'semana' ? 7 : 30))
      corte = d.toISOString().slice(0, 10)
    }
    return ordens.filter((o) =>
      (!fFalha || o.falha_nome === fFalha) &&
      (!fTipo || o.tipo === fTipo) &&
      (!corte || (o.data_fim ?? o.data) >= corte) &&
      (!t || [o.titulo, o.data, ...o.tecnicos.map((x) => x.nome)].some((v) => (v || '').toLowerCase().includes(t))),
    )
  }, [ordens, busca, fFalha, fTipo, fPeriodo])

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

          {/* Documentos do equipamento (manuais/datasheets fixados da biblioteca → Marcas, #EQP-DOC) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Documentos ({docsFixados.length})</CardTitle>
              {podeGerir && <Button size="sm" variant="outline" onClick={() => setGerenciar(true)}>Gerenciar</Button>}
            </CardHeader>
            <CardContent className="space-y-1.5">
              {docsFixados.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum documento vinculado.{podeGerir ? ' Use “Gerenciar” para fixar manuais/datasheets da ' : ' Cadastre em '}
                  <Link to="/documentos?cat=marcas" className="text-primary hover:underline">biblioteca → Marcas</Link>.
                </p>
              ) : docsFixados.map((d) => (
                <a key={d.id} href={urlArquivo(d.url)} target="_blank" rel="noreferrer"
                   className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent">
                  <IconDoc className="text-muted-foreground" />
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
                <Input className="w-56" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar ordens de serviço" placeholder="Buscar (título, técnico, data)…" />
                <select className="h-9 rounded-md border bg-background px-3 text-sm" aria-label="Filtrar O.S. por tipo" value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
                  <option value="">Todos os tipos</option>
                  {TIPOS_OS.map((t) => <option key={t} value={t}>{TIPO_OS_LABEL[t]}</option>)}
                </select>
                <select className="h-9 rounded-md border bg-background px-3 text-sm" aria-label="Filtrar O.S. por falha" value={fFalha} onChange={(e) => setFFalha(e.target.value)}>
                  <option value="">Todas as falhas</option>
                  {falhasNasOrdens.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <select className="h-9 rounded-md border bg-background px-3 text-sm" aria-label="Filtrar O.S. por período" value={fPeriodo} onChange={(e) => setFPeriodo(e.target.value as 'tudo' | 'semana' | 'mes')}>
                  <option value="tudo">Todo o período</option>
                  <option value="semana">Última semana</option>
                  <option value="mes">Último mês</option>
                </select>
                {(busca || fTipo || fFalha || fPeriodo !== 'tudo') && (
                  <button className="text-xs text-primary hover:underline" onClick={() => { setBusca(''); setFTipo(''); setFFalha(''); setFPeriodo('tudo') }}>limpar</button>
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
                        <span className="font-medium text-primary">{intervaloData(o.data, o.data_fim)}</span>
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

      {/* Gerenciar documentos vinculados (#EQP-DOC) — admin */}
      {gerenciar && podeGerir && (
        <GerenciarDocs
          marcas={marcas} fixadosIds={docsFixados.map((d) => d.id)}
          aoFechar={() => setGerenciar(false)}
          aoSalvar={async (ids) => { await api.admin.definirDocumentosEquipamento(eid, ids); setGerenciar(false); carregarDocs() }}
        />
      )}
    </div>
  )
}

/** Modal p/ o admin fixar quais documentos da biblioteca (Marcas) aparecem no equipamento. */
function GerenciarDocs({ marcas, fixadosIds, aoFechar, aoSalvar }: {
  marcas: DocEquip[]
  fixadosIds: number[]
  aoFechar: () => void
  aoSalvar: (ids: number[]) => Promise<void>
}) {
  const [sel, setSel] = useState<Set<number>>(new Set(fixadosIds))
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState(false)
  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return marcas.filter((d) => !t || `${d.nome} ${d.marca}`.toLowerCase().includes(t))
  }, [marcas, busca])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/40" aria-label="Fechar" onClick={aoFechar} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border bg-card shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b p-4">
          <h2 className="font-semibold">Documentos do equipamento</h2>
          <button className="rounded p-2 text-muted-foreground hover:bg-accent" onClick={aoFechar} aria-label="Fechar"><IconClose /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Filtrar documentos" placeholder="Filtrar por nome/marca…" />
          {marcas.length === 0 && <p className="text-sm text-muted-foreground">Nenhum documento em <Link to="/documentos?cat=marcas" className="text-primary hover:underline">biblioteca → Marcas</Link>.</p>}
          {visiveis.map((d) => {
            const marcado = sel.has(d.id)
            return (
              <label key={d.id} className={`flex cursor-pointer items-center gap-2 rounded border px-2 py-1 text-sm ${marcado ? 'border-primary bg-accent' : ''}`}>
                <input type="checkbox" checked={marcado} onChange={(e) => {
                  const s = new Set(sel); if (e.target.checked) s.add(d.id); else s.delete(d.id); setSel(s)
                }} />
                <span className="min-w-0 flex-1 truncate">{d.nome}</span>
                {d.marca && <span className="shrink-0 text-xs text-muted-foreground">{d.marca}</span>}
              </label>
            )
          })}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 border-t p-4">
          <Button variant="outline" size="sm" onClick={aoFechar}>Cancelar</Button>
          <Button size="sm" disabled={salvando} onClick={async () => { setSalvando(true); try { await aoSalvar(Array.from(sel)) } finally { setSalvando(false) } }}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
