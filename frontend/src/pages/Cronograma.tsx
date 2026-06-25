import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type AdminCliente, type AdminUsuario, type ClienteVisivel, type Feriado, type NovaVisita, type UnidadeVisivel, type Visita } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Avatar } from '../components/Avatar'
import { MultiFiltro } from '../components/MultiFiltro'
import { STATUS_VISITA, isoData as fmt } from '../lib/format'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const STATUS_COR = STATUS_VISITA

type TecMini = { id: number; nome: string; foto: string | null }
type GrupoCliente = { key: string; nome: string; cor: string | null; logo: string | null; visitas: Visita[]; tecnicos: TecMini[] }

/** Agrupa as visitas do dia por cliente; coleta os técnicos (dedup) — #CR6/#CR8. */
function agruparPorCliente(evs: Visita[]): GrupoCliente[] {
  const m = new Map<string, GrupoCliente>()
  for (const v of evs) {
    const key = v.cliente_id != null ? `c${v.cliente_id}` : 'sem'
    let g = m.get(key)
    if (!g) {
      g = { key, nome: v.cliente_nome ?? v.titulo, cor: v.cliente_cor, logo: v.cliente_logo, visitas: [], tecnicos: [] }
      m.set(key, g)
    }
    g.visitas.push(v)
    for (const t of v.tecnicos) if (!g.tecnicos.some((x) => x.id === t.id)) g.tecnicos.push(t)
  }
  return [...m.values()]
}

export default function Cronograma() {
  const { usuario } = useAuth()
  const podeGerir = usuario?.permissoes.includes('gerir_usuarios') ?? false

  const hoje = new Date()
  const [ref, setRef] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() })
  const [visitas, setVisitas] = useState<Visita[]>([])
  const [feriados, setFeriados] = useState<Record<string, Feriado>>({})
  const [novoFeriado, setNovoFeriado] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [diaSel, setDiaSel] = useState<string | null>(null)

  const [equipeFiltro, setEquipeFiltro] = useState<Set<number>>(new Set())   // Equipe (técnicos) — multi
  const [clienteFiltro, setClienteFiltro] = useState<Set<number>>(new Set()) // Clientes — multi
  const [unidadeFiltro, setUnidadeFiltro] = useState<number | ''>('')        // visão por unidade (D-021)
  const [unidades, setUnidades] = useState<UnidadeVisivel[]>([])
  const [tecnicos, setTecnicos] = useState<AdminUsuario[]>([])
  const [clientes, setClientes] = useState<AdminCliente[]>([])
  const [clientesVis, setClientesVis] = useState<ClienteVisivel[]>([])       // opções do filtro Clientes (todos os papéis)
  const [nova, setNova] = useState<{ usuarioIds: Set<number>; cliente_id: number | ''; titulo: string }>({ usuarioIds: new Set(), cliente_id: '', titulo: '' })

  const de = fmt(new Date(ref.ano, ref.mes, 1))
  const ate = fmt(new Date(ref.ano, ref.mes + 1, 0))

  async function recarregar() {
    try {
      const [vs, fs] = await Promise.all([
        api.cronograma.listar(de, ate, {
          tecnicoIds: podeGerir && equipeFiltro.size ? Array.from(equipeFiltro) : undefined,
          clienteIds: clienteFiltro.size ? Array.from(clienteFiltro) : undefined,
          unidadeId: unidadeFiltro || undefined,
        }),
        api.cronograma.feriados(de, ate),
      ])
      setVisitas(vs)
      setFeriados(Object.fromEntries(fs.map((f) => [f.data, f])))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar o cronograma')
    }
  }

  async function marcarFeriado() {
    if (!diaSel) return
    try {
      await api.cronograma.criarFeriado({ data: diaSel, descricao: novoFeriado.trim() || 'Feriado' })
      setNovoFeriado('')
      recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao marcar feriado')
    }
  }
  async function removerFeriado(id: number) {
    try { await api.cronograma.removerFeriado(id); recarregar() } catch { /* ignore */ }
  }

  // Chaves estáveis dos filtros multi para o array de dependências.
  const equipeKey = Array.from(equipeFiltro).sort().join(',')
  const clienteKey = Array.from(clienteFiltro).sort().join(',')
  useEffect(() => {
    recarregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, equipeKey, clienteKey, unidadeFiltro])

  useEffect(() => {
    api.unidadesVisiveis().then(setUnidades).catch(() => {})
    api.clientesVisiveis().then(setClientesVis).catch(() => {})
  }, [])

  useEffect(() => {
    if (!podeGerir) return
    Promise.all([api.admin.usuarios(), api.admin.clientes()])
      .then(([u, c]) => { setTecnicos(u); setClientes(c) })
      .catch(() => {})
  }, [podeGerir])

  const porDia = useMemo(() => {
    const m: Record<string, Visita[]> = {}
    visitas.forEach((v) => { (m[v.data] ??= []).push(v) })
    return m
  }, [visitas])

  const inicioSemana = new Date(ref.ano, ref.mes, 1).getDay()
  const titulo = new Date(ref.ano, ref.mes, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  function mover(delta: number) {
    setRef((r) => {
      const d = new Date(r.ano, r.mes + delta, 1)
      return { ano: d.getFullYear(), mes: d.getMonth() }
    })
  }

  // #CR1: renderiza só as semanas que contêm dias do mês vigente (nenhum do mês seguinte).
  const diasNoMes = new Date(ref.ano, ref.mes + 1, 0).getDate()
  const totalCelulas = Math.ceil((inicioSemana + diasNoMes) / 7) * 7
  const celulas = Array.from({ length: totalCelulas }, (_, i) => {
    const data = new Date(ref.ano, ref.mes, i - inicioSemana + 1)
    const iso = fmt(data)
    const doMes = data.getMonth() === ref.mes
    const fds = data.getDay() === 0 || data.getDay() === 6 // domingo/sábado
    return { data, iso, doMes, fds, ehHoje: iso === fmt(hoje), evs: doMes ? porDia[iso] ?? [] : [] }
  })

  async function adicionar() {
    if (!diaSel || nova.usuarioIds.size === 0 || !nova.titulo.trim()) return
    try {
      await api.cronograma.criar({
        usuario_ids: Array.from(nova.usuarioIds),
        cliente_id: nova.cliente_id === '' ? null : (nova.cliente_id as number),
        data: diaSel, titulo: nova.titulo.trim(),
      })
      setNova({ usuarioIds: new Set(), cliente_id: '', titulo: '' })
      recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao adicionar visita')
    }
  }
  async function remover(id: number) {
    try { await api.cronograma.remover(id); recarregar() } catch { /* ignore */ }
  }
  async function atualizarVisita(id: number, dados: Partial<NovaVisita>) {
    try { await api.cronograma.atualizar(id, dados); recarregar() }
    catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao atualizar a visita') }
  }

  const visitasDoDia = diaSel ? porDia[diaSel] ?? [] : []
  // Equipe do dia: cada técnico (dedup) e onde está (cliente), para o painel esquerdo.
  const equipeDia = (() => {
    const m = new Map<number, { id: number; nome: string; foto: string | null; local: string; fixo: boolean; titulo?: string }>()
    for (const v of visitasDoDia) {
      for (const t of v.tecnicos) {
        if (!m.has(t.id)) m.set(t.id, { id: t.id, nome: t.nome, foto: t.foto, local: v.cliente_nome ?? '—', fixo: v.fixo, titulo: v.fixo ? undefined : v.titulo })
      }
    }
    return [...m.values()].sort((a, b) => a.nome.localeCompare(b.nome))
  })()

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button className="rounded-lg border px-2 py-1 text-sm hover:bg-accent" onClick={() => mover(-1)} aria-label="Mês anterior">‹</button>
            <button className="rounded-lg border px-3 py-1 text-sm hover:bg-accent" onClick={() => setRef({ ano: hoje.getFullYear(), mes: hoje.getMonth() })}>Hoje</button>
            <button className="rounded-lg border px-2 py-1 text-sm hover:bg-accent" onClick={() => mover(1)} aria-label="Próximo mês">›</button>
            <h1 className="ml-2 text-lg font-semibold capitalize">{titulo}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {unidades.length > 0 && (
              <select className="h-9 rounded-md border bg-background px-3 text-sm" value={unidadeFiltro}
                      onChange={(e) => setUnidadeFiltro(e.target.value ? Number(e.target.value) : '')}
                      title="Visão por unidade">
                <option value="">Todas as unidades</option>
                {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            )}
            {podeGerir && (
              <MultiFiltro label="Equipe" todosLabel="Toda a equipe" sel={equipeFiltro} setSel={setEquipeFiltro}
                           opcoes={tecnicos.map((t) => ({ id: t.id, nome: t.nome || t.email }))} />
            )}
            {clientesVis.length > 0 && (
              <MultiFiltro label="Clientes" todosLabel="Todos os clientes" sel={clienteFiltro} setSel={setClienteFiltro}
                           opcoes={clientesVis.map((c) => ({ id: c.id, nome: c.nome }))} />
            )}
          </div>
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-medium text-muted-foreground">
            {DIAS_SEMANA.map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {celulas.map((c, i) =>
              c.doMes ? (
                <button
                  key={i}
                  onClick={() => setDiaSel(c.iso)}
                  style={
                    feriados[c.iso]
                      ? { backgroundColor: 'hsl(var(--destructive) / 0.08)' }
                      : c.fds
                        ? { backgroundColor: 'hsl(var(--brand-2) / 0.08)' }
                        : undefined
                  }
                  className="min-h-[100px] border-b border-r p-1.5 text-left hover:bg-accent"
                >
                  <div className="flex justify-end">
                    <span className={`flex h-7 min-w-[28px] items-center justify-center rounded-full px-1 text-base font-bold ${c.ehHoje ? 'bg-primary text-primary-foreground' : c.fds ? 'text-brand-2' : 'text-foreground'}`}>
                      {c.data.getDate()}
                    </span>
                  </div>
                  <div className="mt-1 space-y-1">
                    {feriados[c.iso] && (
                      <div className="truncate rounded px-1 py-0.5 text-[10px] font-medium text-destructive" title={feriados[c.iso].descricao}>
                        🎌 {feriados[c.iso].descricao}
                      </div>
                    )}
                    {agruparPorCliente(c.evs).slice(0, 2).map((g) => (
                      <div
                        key={g.key}
                        className="rounded border-l-2 bg-muted/50 px-1 py-0.5"
                        style={{ borderColor: g.cor ?? 'hsl(var(--brand))' }}
                        title={g.visitas.map((v) => `${v.tecnico_nome} — ${v.titulo}`).join('\n')}
                      >
                        <div className="flex items-center gap-1">
                          {(g.logo || g.cor) && <Avatar nome={g.nome} fotoUrl={g.logo} cor={g.cor} className="h-4 w-4 text-[7px]" />}
                          <span className="truncate text-[11px] font-medium">{g.nome}</span>
                        </div>
                        <div className="mt-0.5 flex -space-x-1">
                          {g.tecnicos.slice(0, 4).map((t) => (
                            <Avatar key={t.id} nome={t.nome} fotoUrl={t.foto} className="h-4 w-4 border border-card text-[7px]" title={t.nome} />
                          ))}
                          {g.tecnicos.length > 4 && <span className="pl-1.5 text-[9px] text-muted-foreground">+{g.tecnicos.length - 4}</span>}
                        </div>
                      </div>
                    ))}
                    {agruparPorCliente(c.evs).length > 2 && (
                      <div className="px-1 text-[10px] text-muted-foreground">+{agruparPorCliente(c.evs).length - 2} cliente(s)</div>
                    )}
                  </div>
                </button>
              ) : (
                <div key={i} className="min-h-[92px] border-b border-r bg-muted/20" />
              ),
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {podeGerir ? 'Visão completa: clique num dia para ver onde cada técnico está e a atividade.' : 'Clique num dia para ver onde você estará e a atividade.'}
        </p>
      </div>

      {/* Card do dia */}
      {diaSel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/40" aria-label="Fechar" onClick={() => setDiaSel(null)} />
          <div className="relative z-10 w-full max-w-4xl rounded-xl border bg-card p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">
                {new Date(diaSel + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </h2>
              <button className="rounded p-1 text-muted-foreground hover:bg-accent" onClick={() => setDiaSel(null)}>✕</button>
            </div>

            {/* Feriado (#CR3) */}
            {(() => {
              const fer = diaSel ? feriados[diaSel] : undefined
              if (fer) {
                return (
                  <div className="mb-2 flex items-center justify-between rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">
                    <span>🎌 Feriado: {fer.descricao}</span>
                    {podeGerir && <button className="hover:underline" onClick={() => removerFeriado(fer.id)}>remover</button>}
                  </div>
                )
              }
              if (podeGerir) {
                return (
                  <div className="mb-2 flex gap-2">
                    <Input className="h-8" value={novoFeriado} onChange={(e) => setNovoFeriado(e.target.value)} placeholder="Marcar feriado (descrição)" />
                    <Button size="sm" variant="outline" onClick={marcarFeriado}>Feriado</Button>
                  </div>
                )
              }
              return null
            })()}

            <div className="grid gap-4 md:grid-cols-[240px_1fr]">
              {/* Esquerda: a equipe do dia e onde cada um está */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Equipe hoje ({equipeDia.length})</h3>
                {equipeDia.length === 0 && <p className="text-sm text-muted-foreground">Ninguém alocado.</p>}
                {equipeDia.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 rounded-lg border p-2">
                    <Avatar nome={e.nome} fotoUrl={e.foto ?? undefined} className="h-9 w-9" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{e.nome}</div>
                      <div className="truncate text-xs text-muted-foreground">📍 {e.local}{e.fixo ? ' · fixo' : e.titulo ? ` · ${e.titulo}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Direita: cards das atividades do dia */}
              <div className="max-h-[62vh] space-y-3 overflow-y-auto pr-1">
                {visitasDoDia.filter((v) => !v.fixo).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma atividade neste dia.</p>}
                {visitasDoDia.filter((v) => !v.fixo).map((v) => (
                  <div key={v.id} className="space-y-2 rounded-xl border bg-card p-3 text-sm shadow-sm">
                    {/* Cabeçalho: avatares de todos os técnicos + status + abrir */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex -space-x-2">
                        {v.tecnicos.map((t) => (
                          <Avatar key={t.id} nome={t.nome} fotoUrl={t.foto ?? undefined} className="h-8 w-8 border-2 border-card text-[9px]" title={t.nome} />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={v.status}
                          onChange={(e) => atualizarVisita(v.id, { status: e.target.value })}
                          className={`rounded-full border px-2 py-0.5 text-[11px] ${STATUS_COR[v.status] ?? 'bg-muted'}`}
                        >
                          <option value="agendada">agendada</option>
                          <option value="pendente">pendente</option>
                          <option value="concluida">concluída</option>
                          <option value="cancelada">cancelada</option>
                        </select>
                        {v.id > 0 && (
                          <Link to={`/cronograma/atividade/${v.id}`} className="whitespace-nowrap text-[11px] text-primary hover:underline" title="Abrir página da atividade">abrir ↗</Link>
                        )}
                      </div>
                    </div>

                    {/* Título / descrição */}
                    {podeGerir ? (
                      <input
                        defaultValue={v.titulo}
                        onBlur={(e) => { if (e.target.value.trim() && e.target.value !== v.titulo) atualizarVisita(v.id, { titulo: e.target.value }) }}
                        className="w-full rounded border bg-background px-2 py-1 text-sm font-medium"
                      />
                    ) : (
                      <div className="font-medium">{v.titulo}</div>
                    )}

                    {/* Cliente + técnicos (edição) ou somente leitura */}
                    {podeGerir ? (
                      <div className="space-y-1">
                        <select className="h-8 w-full rounded border bg-background px-1 text-xs" value={v.cliente_id ?? ''}
                                onChange={(e) => atualizarVisita(v.id, { cliente_id: e.target.value ? Number(e.target.value) : null })}>
                          <option value="">sem cliente</option>
                          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                        <div className="flex flex-wrap gap-1">
                          {tecnicos.map((t) => {
                            const marcado = v.tecnicos.some((x) => x.id === t.id)
                            return (
                              <label key={t.id} className={`flex cursor-pointer items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] ${marcado ? 'border-primary bg-accent' : ''}`}>
                                <input type="checkbox" checked={marcado} onChange={(e) => {
                                  const ids = new Set(v.tecnicos.map((x) => x.id))
                                  if (e.target.checked) ids.add(t.id); else ids.delete(t.id)
                                  if (ids.size > 0) atualizarVisita(v.id, { usuario_ids: Array.from(ids) })
                                }} />
                                {t.nome || t.email}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">📍 {v.cliente_nome ?? '—'}{v.unidade ? ` (${v.unidade})` : ''}</div>
                    )}

                    <textarea
                      defaultValue={v.observacoes ?? ''}
                      rows={2}
                      placeholder="observações do fechamento…"
                      onBlur={(e) => { if (e.target.value !== (v.observacoes ?? '')) atualizarVisita(v.id, { observacoes: e.target.value }) }}
                      className="w-full rounded border bg-background px-2 py-1 text-xs"
                    />
                    {podeGerir && (
                      <button className="text-xs text-destructive hover:underline" onClick={() => remover(v.id)}>remover atividade</button>
                    )}
                  </div>
                ))}
                {podeGerir && visitasDoDia.some((v) => v.fixo) && (
                  <p className="text-[11px] text-muted-foreground">Técnicos “fixos” aparecem à esquerda; adicione uma atividade para <strong>relocar</strong> alguém neste dia.</p>
                )}
              </div>
            </div>

            {podeGerir && (
              <div className="mt-3 space-y-2 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">Adicionar atividade</p>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Técnicos (1+):</span>
                  <div className="flex flex-wrap gap-1.5">
                    {tecnicos.map((t) => {
                      const marcado = nova.usuarioIds.has(t.id)
                      return (
                        <label key={t.id} className={`flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs ${marcado ? 'border-primary bg-accent' : ''}`}>
                          <input type="checkbox" checked={marcado} onChange={(e) => {
                            const s = new Set(nova.usuarioIds)
                            if (e.target.checked) s.add(t.id); else s.delete(t.id)
                            setNova({ ...nova, usuarioIds: s })
                          }} />
                          {t.nome || t.email}
                        </label>
                      )
                    })}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <select className="h-9 rounded-md border bg-background px-2 text-sm" value={nova.cliente_id}
                          onChange={(e) => setNova({ ...nova, cliente_id: e.target.value ? Number(e.target.value) : '' })}>
                    <option value="">Cliente (opcional)…</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  <Input value={nova.titulo} onChange={(e) => setNova({ ...nova, titulo: e.target.value })} placeholder="Atividade (ex.: Manutenção 4100)" />
                </div>
                <Button size="sm" onClick={adicionar} disabled={nova.usuarioIds.size === 0 || !nova.titulo.trim()}>Adicionar</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
