import { useEffect, useState } from 'react'
import { api, type AdminCliente, type AdminUsuario, type Equipamento, type EquipamentoLista, type Falha, type NovaVisita, type Visita } from '../lib/api'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { IconClose } from './icons'
import { CAMPOS_DOC_OS, TIPO_OS_LABEL, TIPOS_OS, isoData } from '../lib/format'

const STATUS = ['agendada', 'pendente', 'concluida', 'cancelada']

type Estado = {
  tipo: string; cliente_id: number | ''; equipamento_id: number | ''; falha_id: number | ''; lista_id: number | ''
  data: string; titulo: string; status: string; observacoes: string
  usuarioIds: Set<number>; doc: Record<string, string>
}

function inicialDe(v?: Visita): Estado {
  if (!v) return {
    tipo: 'corretiva', cliente_id: '', equipamento_id: '', falha_id: '', lista_id: '',
    data: isoData(new Date()), titulo: '', status: 'agendada', observacoes: '',
    usuarioIds: new Set(), doc: {},
  }
  const doc: Record<string, string> = {}
  for (const [k] of CAMPOS_DOC_OS) {
    const val = (v as unknown as Record<string, string | null>)[k]
    if (val != null) doc[k] = String(val)
  }
  return {
    tipo: v.tipo || 'corretiva', cliente_id: v.cliente_id ?? '', equipamento_id: v.equipamento_id ?? '',
    falha_id: v.falha_id ?? '', lista_id: v.lista_id ?? '', data: v.data, titulo: v.titulo, status: v.status,
    observacoes: v.observacoes ?? '', usuarioIds: new Set(v.tecnicos.map((t) => t.id)), doc,
  }
}

/**
 * Formulário completo de **Ordem de Serviço** (#OS-PAGINA) — criar ou editar, com **todos os
 * campos** (tipo, cliente, equipamento, falha, técnicos, data, status, observações e os 12 campos
 * do documento de corretiva). Reutilizável: página de O.S. e calendário. Modal.
 */
export function FormOS({
  clientes, tecnicos, falhas, inicial, dataFixa, aoSalvar, aoFechar,
}: {
  clientes: AdminCliente[]
  tecnicos: AdminUsuario[]
  falhas: Falha[]
  inicial?: Visita
  dataFixa?: string          // quando definido (ex.: dia do calendário), esconde o campo de data
  aoSalvar: (dados: NovaVisita) => Promise<void>
  aoFechar: () => void
}) {
  const [f, setF] = useState<Estado>(() => ({ ...inicialDe(inicial), ...(dataFixa ? { data: dataFixa } : {}) }))
  const [equip, setEquip] = useState<Equipamento[]>([])
  const [listas, setListas] = useState<EquipamentoLista[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  // Equipamentos e listas do cliente escolhido (seletores de equipamento e lista).
  useEffect(() => {
    if (f.cliente_id === '') { setEquip([]); setListas([]); return }
    api.admin.equipamentos(f.cliente_id as number).then(setEquip).catch(() => setEquip([]))
    api.admin.listas(f.cliente_id as number).then(setListas).catch(() => setListas([]))
  }, [f.cliente_id])

  async function salvar() {
    if (!f.titulo.trim()) { setErro('Informe a descrição da O.S.'); return }
    setErro(null); setSalvando(true)
    try {
      const doc = f.tipo === 'corretiva'
        ? Object.fromEntries(CAMPOS_DOC_OS.map(([k]) => [k, f.doc[k]?.trim() || null]))
        : Object.fromEntries(CAMPOS_DOC_OS.map(([k]) => [k, null]))
      await aoSalvar({
        usuario_ids: Array.from(f.usuarioIds),
        cliente_id: f.cliente_id === '' ? null : (f.cliente_id as number),
        data: f.data, titulo: f.titulo.trim(), status: f.status,
        observacoes: f.observacoes.trim() || null,
        tipo: f.tipo,
        equipamento_id: f.equipamento_id === '' ? null : (f.equipamento_id as number),
        falha_id: f.falha_id === '' ? null : (f.falha_id as number),
        lista_id: f.tipo === 'preventiva' && f.lista_id !== '' ? (f.lista_id as number) : null,
        ...doc,
      })
      aoFechar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao salvar a O.S.')
    } finally {
      setSalvando(false)
    }
  }

  const rotulo = 'text-[11px] text-muted-foreground'
  const campo = 'h-9 w-full rounded-md border bg-background px-2 text-sm'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/40" aria-label="Fechar" onClick={aoFechar} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border bg-card shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b p-4">
          <h2 className="font-semibold">{inicial ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}</h2>
          <button className="rounded p-2 text-muted-foreground hover:bg-accent" onClick={aoFechar} aria-label="Fechar"><IconClose /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <div>
            <span className={rotulo}>Descrição</span>
            <Input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder="Ex.: Manutenção 4100 — loop 3" />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label><span className={rotulo}>Tipo de manutenção</span>
              <select className={campo} value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
                {TIPOS_OS.map((t) => <option key={t} value={t}>{TIPO_OS_LABEL[t]}</option>)}
              </select>
            </label>
            <label><span className={rotulo}>Status</span>
              <select className={campo} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
                {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label><span className={rotulo}>Cliente</span>
              <select className={campo} value={f.cliente_id}
                      onChange={(e) => setF({ ...f, cliente_id: e.target.value ? Number(e.target.value) : '', equipamento_id: '' })}>
                <option value="">— sem cliente —</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
            {!dataFixa && (
              <label><span className={rotulo}>Data</span>
                <Input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} />
              </label>
            )}
            <label><span className={rotulo}>Equipamento</span>
              <select className={campo} value={f.equipamento_id} disabled={f.cliente_id === ''}
                      onChange={(e) => setF({ ...f, equipamento_id: e.target.value ? Number(e.target.value) : '' })}>
                <option value="">— nenhum —</option>
                {equip.map((eq) => <option key={eq.id} value={eq.id}>{eq.tag || eq.add || `#${eq.id}`}</option>)}
              </select>
            </label>
            <label><span className={rotulo}>Falha</span>
              <select className={campo} value={f.falha_id}
                      onChange={(e) => setF({ ...f, falha_id: e.target.value ? Number(e.target.value) : '' })}>
                <option value="">— nenhuma —</option>
                {falhas.map((fa) => <option key={fa.id} value={fa.id}>{fa.nome}{fa.termo_en ? ` (${fa.termo_en})` : ''}</option>)}
              </select>
            </label>
            {f.tipo === 'preventiva' && (
              <label><span className={rotulo}>Lista de equipamentos (documento de preventiva)</span>
                <select className={campo} value={f.lista_id} disabled={f.cliente_id === ''}
                        onChange={(e) => setF({ ...f, lista_id: e.target.value ? Number(e.target.value) : '' })}>
                  <option value="">— nenhuma —</option>
                  {listas.map((l) => <option key={l.id} value={l.id}>{l.nome} ({l.equipamento_ids.length})</option>)}
                </select>
              </label>
            )}
          </div>

          <div>
            <span className={rotulo}>Técnicos (vazio = fixos do cliente)</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {tecnicos.map((t) => {
                const marcado = f.usuarioIds.has(t.id)
                return (
                  <label key={t.id} className={`flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs ${marcado ? 'border-primary bg-accent' : ''}`}>
                    <input type="checkbox" checked={marcado} onChange={(e) => {
                      const s = new Set(f.usuarioIds)
                      if (e.target.checked) s.add(t.id); else s.delete(t.id)
                      setF({ ...f, usuarioIds: s })
                    }} />
                    {t.nome || t.email}
                  </label>
                )
              })}
            </div>
          </div>

          <label className="block"><span className={rotulo}>Observações</span>
            <textarea value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })}
                      rows={2} className="w-full rounded-md border bg-background px-2 py-1 text-sm" />
          </label>

          {/* Campos do documento — só manutenção corretiva (#OS item 12) */}
          {f.tipo === 'corretiva' && (
            <details className="rounded-md border bg-muted/20 px-2 py-1.5" open={!!inicial}>
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Dados do documento (corretiva)</summary>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {CAMPOS_DOC_OS.map(([k, rot]) => {
                  const isData = k === 'data_solicitacao' || k === 'data_execucao'
                  return (
                    <label key={k} className={rotulo}>
                      {rot}
                      <input type={isData ? 'date' : 'text'} value={f.doc[k] ?? ''}
                             onChange={(e) => setF({ ...f, doc: { ...f.doc, [k]: e.target.value } })}
                             className="mt-0.5 w-full rounded border bg-background px-2 py-1 text-xs text-foreground" />
                    </label>
                  )
                })}
              </div>
            </details>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t p-4">
          <Button variant="outline" size="sm" onClick={aoFechar}>Cancelar</Button>
          <Button size="sm" onClick={salvar} disabled={salvando || !f.titulo.trim()}>{salvando ? 'Salvando…' : 'Salvar'}</Button>
        </div>
      </div>
    </div>
  )
}
