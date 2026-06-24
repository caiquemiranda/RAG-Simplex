import { useEffect, useMemo, useState } from 'react'
import { api, type AdminCliente, type AdminUsuario, type Visita } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Avatar } from '../components/Avatar'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const STATUS_COR: Record<string, string> = {
  agendada: 'bg-blue-100 text-blue-700',
  concluida: 'bg-emerald-100 text-emerald-700',
  cancelada: 'bg-rose-100 text-rose-700',
}
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function Cronograma() {
  const { usuario } = useAuth()
  const podeGerir = usuario?.permissoes.includes('gerir_usuarios') ?? false

  const hoje = new Date()
  const [ref, setRef] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() })
  const [visitas, setVisitas] = useState<Visita[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [diaSel, setDiaSel] = useState<string | null>(null)

  const [tecnicoFiltro, setTecnicoFiltro] = useState<number | ''>('')
  const [tecnicos, setTecnicos] = useState<AdminUsuario[]>([])
  const [clientes, setClientes] = useState<AdminCliente[]>([])
  const [nova, setNova] = useState({ usuario_id: '' as number | '', cliente_id: '' as number | '', titulo: '', status: 'agendada' })

  const de = fmt(new Date(ref.ano, ref.mes, 1))
  const ate = fmt(new Date(ref.ano, ref.mes + 1, 0))

  async function recarregar() {
    try {
      setVisitas(await api.cronograma.listar(de, ate, podeGerir ? tecnicoFiltro || undefined : undefined))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar o cronograma')
    }
  }

  useEffect(() => {
    recarregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, tecnicoFiltro])

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
    if (!diaSel || !nova.usuario_id || !nova.titulo.trim()) return
    try {
      await api.cronograma.criar({
        usuario_id: nova.usuario_id as number,
        cliente_id: nova.cliente_id === '' ? null : (nova.cliente_id as number),
        data: diaSel, titulo: nova.titulo.trim(), status: nova.status,
      })
      setNova({ usuario_id: '', cliente_id: '', titulo: '', status: 'agendada' })
      recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao adicionar visita')
    }
  }
  async function remover(id: number) {
    try { await api.cronograma.remover(id); recarregar() } catch { /* ignore */ }
  }

  const visitasDoDia = diaSel ? porDia[diaSel] ?? [] : []

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
          {podeGerir && (
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={tecnicoFiltro}
                    onChange={(e) => setTecnicoFiltro(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Todos os técnicos</option>
              {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nome || t.email}</option>)}
            </select>
          )}
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
                  style={c.fds ? { backgroundColor: 'hsl(var(--brand-2) / 0.08)' } : undefined}
                  className="min-h-[92px] border-b border-r p-1.5 text-left hover:bg-accent"
                >
                  <div className="flex justify-end">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${c.ehHoje ? 'bg-primary font-semibold text-primary-foreground' : c.fds ? 'font-medium text-brand-2' : ''}`}>
                      {c.data.getDate()}
                    </span>
                  </div>
                  <div className="mt-1 space-y-1">
                    {c.evs.slice(0, 3).map((v) => (
                      <div
                        key={v.id}
                        className={`flex items-center gap-1 rounded px-1 py-0.5 text-[11px] ${STATUS_COR[v.status] ?? 'bg-muted'}`}
                        title={`${v.tecnico_nome} — ${v.titulo}${v.cliente_nome ? ' @ ' + v.cliente_nome : ''}`}
                      >
                        {podeGerir && <Avatar nome={v.tecnico_nome} fotoUrl={v.tecnico_foto} className="h-5 w-5" />}
                        <span className="truncate">{v.titulo}</span>
                      </div>
                    ))}
                    {c.evs.length > 3 && <div className="px-1 text-[11px] text-muted-foreground">+{c.evs.length - 3}</div>}
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
          <div className="relative z-10 w-full max-w-lg rounded-xl border bg-card p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">
                {new Date(diaSel + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </h2>
              <button className="rounded p-1 text-muted-foreground hover:bg-accent" onClick={() => setDiaSel(null)}>✕</button>
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto">
              {visitasDoDia.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma atividade neste dia.</p>}
              {visitasDoDia.map((v) => (
                <div key={v.id} className="flex gap-2 rounded-lg border p-2 text-sm">
                  <Avatar nome={v.tecnico_nome} fotoUrl={v.tecnico_foto} className="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{v.titulo}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[11px] ${STATUS_COR[v.status] ?? 'bg-muted'}`}>{v.status}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {podeGerir && <>{v.tecnico_nome} · </>}
                      📍 {v.cliente_nome ?? '—'}{v.unidade ? ` (${v.unidade})` : ''}
                    </div>
                    {podeGerir && (
                      <button className="mt-1 text-xs text-destructive hover:underline" onClick={() => remover(v.id)}>remover</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {podeGerir && (
              <div className="mt-3 space-y-2 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">Adicionar atividade</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <select className="h-9 rounded-md border bg-background px-2 text-sm" value={nova.usuario_id}
                          onChange={(e) => setNova({ ...nova, usuario_id: e.target.value ? Number(e.target.value) : '' })}>
                    <option value="">Técnico…</option>
                    {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nome || t.email}</option>)}
                  </select>
                  <select className="h-9 rounded-md border bg-background px-2 text-sm" value={nova.cliente_id}
                          onChange={(e) => setNova({ ...nova, cliente_id: e.target.value ? Number(e.target.value) : '' })}>
                    <option value="">Cliente (opcional)…</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  <Input className="sm:col-span-2" value={nova.titulo} onChange={(e) => setNova({ ...nova, titulo: e.target.value })} placeholder="Atividade (ex.: Manutenção 4100)" />
                </div>
                <Button size="sm" onClick={adicionar} disabled={!nova.usuario_id || !nova.titulo.trim()}>Adicionar</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
