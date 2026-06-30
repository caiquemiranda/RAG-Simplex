import { useEffect, useMemo, useState } from 'react'
import { api, type AdminCliente, type AdminUsuario, type Equipamento, type OrdemServico } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { isoData } from '../lib/format'

const TIPOS = ['corretiva', 'preventiva', 'planejada']
const STATUS = ['aberta', 'em_andamento', 'concluida', 'cancelada']
const STATUS_COR: Record<string, string> = {
  aberta: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  em_andamento: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  concluida: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  cancelada: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
}

type Nova = { cliente_id: number | ''; equipamento_id: number | ''; usuario_id: number | ''; data: string; tipo: string; status: string; descricao: string; solucao: string }

/** Ordens de Serviço (#OS-2): lista + filtros + criar/editar (admin). */
export default function Ordens() {
  const { usuario } = useAuth()
  const podeGerir = usuario?.permissoes.includes('gerir_usuarios') ?? false

  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [clientes, setClientes] = useState<AdminCliente[]>([])
  const [tecnicos, setTecnicos] = useState<AdminUsuario[]>([])
  const [equipForm, setEquipForm] = useState<Equipamento[]>([])
  const [fCliente, setFCliente] = useState<number | ''>('')
  const [fStatus, setFStatus] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const [nova, setNova] = useState<Nova>({ cliente_id: '', equipamento_id: '', usuario_id: '', data: isoData(new Date()), tipo: 'corretiva', status: 'aberta', descricao: '', solucao: '' })

  async function carregar() {
    setErro(null)
    try { setOrdens(await api.admin.ordens({ cliente_id: fCliente || undefined, status: fStatus || undefined })) }
    catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao carregar') }
  }
  useEffect(() => { if (podeGerir) carregar() /* eslint-disable-next-line */ }, [podeGerir, fCliente, fStatus])
  useEffect(() => {
    if (!podeGerir) return
    api.admin.clientes().then(setClientes).catch(() => {})
    api.admin.usuarios().then(setTecnicos).catch(() => {})
  }, [podeGerir])

  // Equipamentos do cliente escolhido no formulário (para o select).
  useEffect(() => {
    if (nova.cliente_id === '') { setEquipForm([]); return }
    api.admin.equipamentos(nova.cliente_id).then(setEquipForm).catch(() => setEquipForm([]))
  }, [nova.cliente_id])

  async function criar() {
    if (nova.cliente_id === '' || !nova.descricao.trim()) return
    setErro(null)
    try {
      await api.admin.criarOrdem({
        cliente_id: nova.cliente_id, data: nova.data,
        equipamento_id: nova.equipamento_id === '' ? null : nova.equipamento_id,
        usuario_id: nova.usuario_id === '' ? null : nova.usuario_id,
        tipo: nova.tipo, status: nova.status, descricao: nova.descricao.trim(), solucao: nova.solucao || null,
      })
      setCriando(false)
      setNova({ ...nova, equipamento_id: '', descricao: '', solucao: '' })
      carregar()
    } catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao criar') }
  }
  async function mudarStatus(o: OrdemServico, status: string) {
    try { await api.admin.atualizarOrdem(o.id, { status }); carregar() }
    catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao atualizar') }
  }
  async function remover(id: number) {
    try { await api.admin.removerOrdem(id); carregar() } catch { /* ignore */ }
  }

  const clientesOrd = useMemo(() => [...clientes].sort((a, b) => a.nome.localeCompare(b.nome)), [clientes])

  if (!podeGerir) return <div className="p-6 text-sm text-muted-foreground">Acesso restrito ao administrador.</div>

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Ordens de Serviço</h1>
          <Button size="sm" onClick={() => setCriando((v) => !v)}>{criando ? 'Fechar' : 'Nova O.S.'}</Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <select className="h-9 rounded-md border bg-background px-3 text-sm" value={fCliente} onChange={(e) => setFCliente(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Todos os clientes</option>
            {clientesOrd.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select className="h-9 rounded-md border bg-background px-3 text-sm" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        {/* Formulário de nova O.S. */}
        {criando && (
          <Card>
            <CardHeader><CardTitle className="text-base">Nova ordem de serviço</CardTitle></CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <select className="h-9 rounded-md border bg-background px-2 text-sm" value={nova.cliente_id} onChange={(e) => setNova({ ...nova, cliente_id: e.target.value ? Number(e.target.value) : '', equipamento_id: '' })}>
                <option value="">Cliente…</option>
                {clientesOrd.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <select className="h-9 rounded-md border bg-background px-2 text-sm" value={nova.equipamento_id} onChange={(e) => setNova({ ...nova, equipamento_id: e.target.value ? Number(e.target.value) : '' })}>
                <option value="">Equipamento (opcional)…</option>
                {equipForm.map((eq) => <option key={eq.id} value={eq.id}>{eq.tag || eq.add || `#${eq.id}`}</option>)}
              </select>
              <select className="h-9 rounded-md border bg-background px-2 text-sm" value={nova.usuario_id} onChange={(e) => setNova({ ...nova, usuario_id: e.target.value ? Number(e.target.value) : '' })}>
                <option value="">Técnico (opcional)…</option>
                {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nome || t.email}</option>)}
              </select>
              <Input type="date" value={nova.data} onChange={(e) => setNova({ ...nova, data: e.target.value })} />
              <select className="h-9 rounded-md border bg-background px-2 text-sm" value={nova.tipo} onChange={(e) => setNova({ ...nova, tipo: e.target.value })}>
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className="h-9 rounded-md border bg-background px-2 text-sm" value={nova.status} onChange={(e) => setNova({ ...nova, status: e.target.value })}>
                {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <textarea className="min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm sm:col-span-2" placeholder="Descrição" value={nova.descricao} onChange={(e) => setNova({ ...nova, descricao: e.target.value })} />
              <textarea className="min-h-[40px] rounded-md border bg-background px-3 py-2 text-sm sm:col-span-2" placeholder="Solução (opcional)" value={nova.solucao} onChange={(e) => setNova({ ...nova, solucao: e.target.value })} />
              <div className="sm:col-span-2"><Button size="sm" onClick={criar} disabled={nova.cliente_id === '' || !nova.descricao.trim()}>Criar O.S.</Button></div>
            </CardContent>
          </Card>
        )}

        {/* Lista */}
        <div className="space-y-2">
          {ordens.length === 0 && !erro && <p className="text-sm text-muted-foreground">Nenhuma ordem de serviço.</p>}
          {ordens.map((o) => (
            <div key={o.id} className="rounded-lg border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-medium">{o.cliente_nome ?? `Cliente #${o.cliente_id}`}</span>
                  {o.equipamento_tag && <span className="text-muted-foreground"> · {o.equipamento_tag}</span>}
                  <span className="text-xs text-muted-foreground"> · {o.data} · {o.tipo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <select value={o.status} onChange={(e) => mudarStatus(o, e.target.value)} className={`rounded-full border px-2 py-0.5 text-[11px] ${STATUS_COR[o.status] ?? 'bg-muted'}`}>
                    {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className="text-xs text-destructive hover:underline" onClick={() => remover(o.id)}>excluir</button>
                </div>
              </div>
              <div className="mt-1">{o.descricao}</div>
              {o.solucao && <div className="text-xs text-muted-foreground">Solução: {o.solucao}</div>}
              {o.tecnico_nome && <div className="text-xs text-muted-foreground">Técnico: {o.tecnico_nome}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
