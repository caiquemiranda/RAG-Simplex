import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type AdminCliente, type AdminUsuario, type Falha, type NovaVisita, type Visita } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/ui/button'
import { MultiFiltro } from '../components/MultiFiltro'
import { FormOS } from '../components/FormOS'
import { STATUS_VISITA, TIPO_OS_COR, TIPO_OS_LABEL, TIPOS_OS, isoData } from '../lib/format'

const STATUS_ALL = ['agendada', 'pendente', 'concluida', 'cancelada']
const BAR: Record<string, string> = {
  agendada: 'bg-blue-500', pendente: 'bg-amber-500', concluida: 'bg-emerald-500', cancelada: 'bg-rose-500',
}
const BAR_TIPO: Record<string, string> = {
  preventiva: 'bg-sky-500', corretiva: 'bg-orange-500',
}

/** Prazo da atividade em relação a hoje: faltam N dias / atrasada há N / hoje. */
function prazo(data: string, status: string): { label: string; cls: string } {
  if (status === 'concluida') return { label: 'concluída', cls: 'text-emerald-600 dark:text-emerald-400' }
  if (status === 'cancelada') return { label: 'cancelada', cls: 'text-muted-foreground' }
  const hoje = new Date(isoData(new Date()) + 'T00:00:00')
  const d = new Date(data + 'T00:00:00')
  const dias = Math.round((d.getTime() - hoje.getTime()) / 86400000)
  if (dias < 0) return { label: `atrasada há ${-dias} dia(s)`, cls: 'text-rose-600 dark:text-rose-400 font-medium' }
  if (dias === 0) return { label: 'hoje', cls: 'text-amber-600 dark:text-amber-400 font-medium' }
  return { label: `faltam ${dias} dia(s)`, cls: 'text-muted-foreground' }
}

/** Tela "Atividades": filtros (status/cliente/técnico) + gráfico por status + lista com prazo. */
export default function Atividades() {
  const { usuario } = useAuth()
  const podeGerir = usuario?.permissoes.includes('gerir_usuarios') ?? false
  const [itens, setItens] = useState<Visita[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [statusSel, setStatusSel] = useState<Set<string>>(new Set())
  const [tipoSel, setTipoSel] = useState<Set<string>>(new Set())
  const [clienteSel, setClienteSel] = useState<Set<number>>(new Set())
  const [tecnicoSel, setTecnicoSel] = useState<Set<number>>(new Set())
  // Formulário de O.S. (#OS-PAGINA): criar (novo) ou editar (uma Visita).
  const [clientes, setClientes] = useState<AdminCliente[]>([])
  const [tecnicos, setTecnicos] = useState<AdminUsuario[]>([])
  const [falhas, setFalhas] = useState<Falha[]>([])
  const [form, setForm] = useState<{ modo: 'novo' } | { modo: 'editar'; visita: Visita } | null>(null)

  function recarregar() {
    api.cronograma.atividades().then(setItens)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Falha ao carregar as O.S.'))
  }
  useEffect(() => { recarregar() }, [])
  useEffect(() => {
    if (!podeGerir) return
    Promise.all([api.admin.clientes(), api.admin.usuarios(), api.admin.falhas()])
      .then(([c, u, f]) => { setClientes(c); setTecnicos(u); setFalhas(f) })
      .catch(() => {})
  }, [podeGerir])

  async function salvar(dados: NovaVisita) {
    if (form?.modo === 'editar') await api.cronograma.atualizar(form.visita.id, dados)
    else await api.cronograma.criar(dados)
    recarregar()
  }

  // Opções de cliente/técnico derivadas das próprias atividades (sem exigir permissões extra).
  const clienteOpts = useMemo(() => {
    const m = new Map<number, string>()
    itens.forEach((v) => { if (v.cliente_id != null) m.set(v.cliente_id, v.cliente_nome ?? `#${v.cliente_id}`) })
    return [...m].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [itens])
  const tecnicoOpts = useMemo(() => {
    const m = new Map<number, string>()
    itens.forEach((v) => v.tecnicos.forEach((t) => m.set(t.id, t.nome)))
    return [...m].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [itens])

  const filtradas = useMemo(() => {
    const peso = (s: string) => (s === 'agendada' || s === 'pendente' ? 0 : 1)
    return itens
      .filter((v) =>
        (statusSel.size === 0 || statusSel.has(v.status)) &&
        (tipoSel.size === 0 || tipoSel.has(v.tipo)) &&
        (clienteSel.size === 0 || (v.cliente_id != null && clienteSel.has(v.cliente_id))) &&
        (tecnicoSel.size === 0 || v.tecnicos.some((t) => tecnicoSel.has(t.id))),
      )
      .sort((a, b) => peso(a.status) - peso(b.status) || a.data.localeCompare(b.data))
  }, [itens, statusSel, tipoSel, clienteSel, tecnicoSel])

  // Gráfico: contagem por status (sobre a lista filtrada).
  const contagem = STATUS_ALL.map((s) => ({ s, n: filtradas.filter((v) => v.status === s).length }))
  const maxN = Math.max(1, ...contagem.map((c) => c.n))
  // Gráfico: contagem por tipo de O.S. (#OS item 9).
  const contagemTipo = TIPOS_OS.map((t) => ({ t, n: filtradas.filter((v) => v.tipo === t).length }))
  const maxNT = Math.max(1, ...contagemTipo.map((c) => c.n))

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Ordens de Serviço</h1>
          {podeGerir && <Button size="sm" onClick={() => setForm({ modo: 'novo' })}>+ Nova O.S.</Button>}
        </div>
        {erro && <p className="text-sm text-destructive">{erro}</p>}

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <MultiFiltro label="Status" todosLabel="Todos os status" sel={statusSel} setSel={setStatusSel}
                       opcoes={STATUS_ALL.map((s) => ({ id: s, nome: s }))} />
          <MultiFiltro label="Tipo" todosLabel="Todos os tipos" sel={tipoSel} setSel={setTipoSel}
                       opcoes={TIPOS_OS.map((t) => ({ id: t, nome: TIPO_OS_LABEL[t] }))} />
          <MultiFiltro label="Clientes" todosLabel="Todos os clientes" sel={clienteSel} setSel={setClienteSel} opcoes={clienteOpts} />
          <MultiFiltro label="Técnicos" todosLabel="Todos os técnicos" sel={tecnicoSel} setSel={setTecnicoSel} opcoes={tecnicoOpts} />
        </div>

        {/* Gráficos: por status + por tipo (#OS item 9) */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Por status ({filtradas.length})</div>
            <div className="space-y-1.5">
              {contagem.map(({ s, n }) => (
                <div key={s} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-xs">{s}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded bg-muted">
                    <div className={`h-full ${BAR[s]}`} style={{ width: `${(n / maxN) * 100}%` }} />
                  </div>
                  <span className="w-6 shrink-0 text-right text-xs tabular-nums">{n}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Por tipo</div>
            <div className="space-y-1.5">
              {contagemTipo.map(({ t, n }) => (
                <div key={t} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 truncate text-xs" title={TIPO_OS_LABEL[t]}>{t}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded bg-muted">
                    <div className={`h-full ${BAR_TIPO[t]}`} style={{ width: `${(n / maxNT) * 100}%` }} />
                  </div>
                  <span className="w-6 shrink-0 text-right text-xs tabular-nums">{n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lista */}
        {filtradas.length === 0 && !erro && <p className="text-sm text-muted-foreground">Nenhuma atividade.</p>}
        <div className="space-y-2">
          {filtradas.map((v) => {
            const p = prazo(v.data, v.status)
            return (
              <Link key={v.id} to={`/cronograma/atividade/${v.id}`}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{v.titulo}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${TIPO_OS_COR[v.tipo] ?? 'bg-muted'}`}>{v.tipo}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${STATUS_VISITA[v.status] ?? ''}`}>{v.status}</span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {v.data}{v.cliente_nome ? ` · ${v.cliente_nome}` : ''}{v.equipamento_tag ? ` · ${v.equipamento_tag}` : ''}{v.falha_nome ? ` · ${v.falha_nome}` : ''}
                  </div>
                </div>
                <div className="flex -space-x-2">
                  {v.tecnicos.slice(0, 4).map((t) => (
                    <Avatar key={t.id} nome={t.nome} fotoUrl={t.foto ?? undefined} className="h-7 w-7 border-2 border-background text-[9px]" />
                  ))}
                </div>
                <span className={`whitespace-nowrap text-xs ${p.cls}`}>{p.label}</span>
                {podeGerir && (
                  <button className="shrink-0 rounded border px-2 py-0.5 text-xs text-primary hover:bg-accent"
                          title="Editar O.S." onClick={(e) => { e.preventDefault(); setForm({ modo: 'editar', visita: v }) }}>editar</button>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Form de O.S. (#OS-PAGINA) — criar/editar com todos os campos */}
      {form && podeGerir && (
        <FormOS
          clientes={clientes} tecnicos={tecnicos} falhas={falhas}
          inicial={form.modo === 'editar' ? form.visita : undefined}
          aoSalvar={salvar} aoFechar={() => setForm(null)}
        />
      )}
    </div>
  )
}
