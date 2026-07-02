import { useEffect, useState } from 'react'
import { api, type AdminCliente, type AdminUsuario, type Equipamento, type EquipamentoLista, type Falha, type NovaVisita, type Visita } from '../lib/api'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { IconClose } from './icons'
import { TIPO_OS_LABEL, TIPOS_OS, isoData } from '../lib/format'

const STATUS = ['agendada', 'pendente', 'concluida', 'cancelada']

type Estado = {
  tipo: string; cliente_id: number | ''; equipamento_id: number | ''; falha_id: number | ''; lista_id: number | ''
  data: string; data_fim: string; datas: string[]; status: string; observacoes: string
  usuarioIds: Set<number>; tituloManual: string
}

function inicialDe(v?: Visita): Estado {
  if (!v) return {
    tipo: 'preventiva', cliente_id: '', equipamento_id: '', falha_id: '', lista_id: '',
    data: isoData(new Date()), data_fim: '', datas: [], status: 'agendada', observacoes: '',
    usuarioIds: new Set(), tituloManual: '',
  }
  return {
    tipo: v.tipo || 'corretiva', cliente_id: v.cliente_id ?? '', equipamento_id: v.equipamento_id ?? '',
    falha_id: v.falha_id ?? '', lista_id: v.lista_id ?? '', data: v.data, data_fim: v.data_fim ?? '',
    datas: [...v.datas], status: v.status, observacoes: v.observacoes ?? '',
    usuarioIds: new Set(v.tecnicos.map((t) => t.id)),
    tituloManual: v.titulo, // ao editar, começa com o título atual
  }
}

/** Mês/ano por extenso da data (ex.: "AGOSTO/2026") — para a descrição da preventiva. */
function mesExtenso(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(' de ', '/').toUpperCase()
}

/**
 * Formulário de **Ordem de Serviço** (#OS-PAGINA / #OS-TIPO-CAMPOS) — os campos mudam pelo **tipo**:
 * - **Preventiva:** cliente + **lista de equipamentos** + técnicos + data(s). Descrição automática
 *   `MANUTENÇÃO PREVENTIVA — <mês>`.
 * - **Corretiva:** cliente + **equipamento único** + **falha** + técnicos + data(s). Descrição
 *   automática `MANUTENÇÃO CORRETIVA — <equipamento> — <falha>`.
 * Os "Dados do documento (corretiva)" **não** são preenchidos aqui — vão no documento salvo depois.
 */
export function FormOS({
  clientes, tecnicos, falhas, inicial, dataFixa, aoSalvar, aoFechar,
}: {
  clientes: AdminCliente[]
  tecnicos: AdminUsuario[]
  falhas: Falha[]
  inicial?: Visita
  dataFixa?: string          // quando definido (ex.: dia do calendário), usa como data inicial
  aoSalvar: (dados: NovaVisita) => Promise<void>
  aoFechar: () => void
}) {
  const [f, setF] = useState<Estado>(() => ({ ...inicialDe(inicial), ...(dataFixa ? { data: dataFixa } : {}) }))
  const [equip, setEquip] = useState<Equipamento[]>([])
  const [listas, setListas] = useState<EquipamentoLista[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  // Equipamentos e listas do cliente escolhido.
  useEffect(() => {
    if (f.cliente_id === '') { setEquip([]); setListas([]); return }
    api.admin.equipamentos(f.cliente_id as number).then(setEquip).catch(() => setEquip([]))
    api.admin.listas(f.cliente_id as number).then(setListas).catch(() => setListas([]))
  }, [f.cliente_id])

  const datasOrdenadas = [...f.datas].sort()

  // Descrição automática conforme o tipo (#OS-TIPO-CAMPOS).
  function descricaoAuto(): string {
    if (f.tipo === 'preventiva') {
      const mes = mesExtenso(datasOrdenadas[0] || f.data)   // mês vem das datas marcadas
      return `MANUTENÇÃO PREVENTIVA${mes ? ` — ${mes}` : ''}`
    }
    const eq = equip.find((e) => e.id === f.equipamento_id)
    const fa = falhas.find((x) => x.id === f.falha_id)
    const tag = eq ? (eq.tag || eq.add || `#${eq.id}`) : ''
    return `MANUTENÇÃO CORRETIVA${tag ? ` — ${tag}` : ''}${fa ? ` — ${fa.nome}` : ''}`
  }

  function addData(iso: string) {
    if (!iso || f.datas.includes(iso)) return
    setF({ ...f, datas: [...f.datas, iso] })
  }

  async function salvar() {
    setErro(null)
    const ehPrev = f.tipo === 'preventiva'
    // Campos obrigatórios por tipo.
    if (!ehPrev && f.equipamento_id === '') { setErro('Selecione o equipamento (corretiva).'); return }
    if (ehPrev && f.lista_id === '') { setErro('Selecione a lista de equipamentos (preventiva).'); return }
    if (ehPrev && datasOrdenadas.length === 0) { setErro('Marque ao menos uma data da preventiva.'); return }
    // Preventiva: todas as datas devem ser do mesmo mês (um documento por mês).
    if (ehPrev && datasOrdenadas.some((d) => d.slice(0, 7) !== datasOrdenadas[0].slice(0, 7))) {
      setErro('As datas da preventiva devem ser do mesmo mês.'); return
    }
    if (!ehPrev && f.data_fim && f.data_fim < f.data) { setErro('A data final é antes da inicial.'); return }
    setSalvando(true)
    try {
      await aoSalvar({
        usuario_ids: Array.from(f.usuarioIds),
        cliente_id: f.cliente_id === '' ? null : (f.cliente_id as number),
        data: ehPrev ? datasOrdenadas[0] : f.data,
        data_fim: ehPrev ? null : (f.data_fim || null),
        datas: ehPrev ? datasOrdenadas : [],
        titulo: f.tituloManual.trim() || descricaoAuto(),
        status: f.status,
        observacoes: f.observacoes.trim() || null,
        tipo: f.tipo,
        // Corretiva → equipamento+falha; Preventiva → lista. O outro lado é limpo.
        equipamento_id: !ehPrev && f.equipamento_id !== '' ? (f.equipamento_id as number) : null,
        falha_id: !ehPrev && f.falha_id !== '' ? (f.falha_id as number) : null,
        lista_id: ehPrev && f.lista_id !== '' ? (f.lista_id as number) : null,
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
  const ehPrev = f.tipo === 'preventiva'

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
                      onChange={(e) => setF({ ...f, cliente_id: e.target.value ? Number(e.target.value) : '', equipamento_id: '', lista_id: '' })}>
                <option value="">— sem cliente —</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
            <label><span className={rotulo}>Técnicos (vazio = fixos do cliente)</span>
              <div className="mt-1 flex max-h-16 flex-wrap gap-1.5 overflow-y-auto">
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
            </label>

            {/* Datas — preventiva: dias avulsos do mês (#OS-PREV-DATAS); corretiva: intervalo (#OS-MULTIDATA) */}
            {ehPrev ? (
              <div className="sm:col-span-2">
                <span className={rotulo}>Datas da preventiva (dias do mês — ex.: 2, 3, 15, 16, 20)</span>
                <div className="mt-1 flex items-center gap-2">
                  <Input type="date" aria-label="Adicionar data" onChange={(e) => { addData(e.target.value); e.target.value = '' }} />
                  <span className="text-[11px] text-muted-foreground">escolha uma data para adicionar</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {datasOrdenadas.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma data marcada.</span>}
                  {datasOrdenadas.map((d) => (
                    <span key={d} className="inline-flex items-center gap-1 rounded-full border bg-accent px-2 py-0.5 text-xs">
                      {d.split('-').reverse().slice(0, 2).join('/')}
                      <button type="button" className="text-muted-foreground hover:text-destructive" aria-label={`Remover ${d}`}
                              onClick={() => setF({ ...f, datas: f.datas.filter((x) => x !== d) })}>×</button>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <label><span className={rotulo}>Data{dataFixa ? '' : ' (início)'}</span>
                  <Input type="date" value={f.data} disabled={!!dataFixa} onChange={(e) => setF({ ...f, data: e.target.value })} />
                </label>
                <label><span className={rotulo}>Data fim (opcional — se durar vários dias)</span>
                  <Input type="date" value={f.data_fim} min={f.data} onChange={(e) => setF({ ...f, data_fim: e.target.value })} />
                </label>
              </>
            )}

            {/* Campos que dependem do tipo (#OS-TIPO-CAMPOS) */}
            {ehPrev ? (
              <label className="sm:col-span-2"><span className={rotulo}>Equipamentos — lista cadastrada</span>
                <select className={campo} value={f.lista_id} disabled={f.cliente_id === ''}
                        onChange={(e) => setF({ ...f, lista_id: e.target.value ? Number(e.target.value) : '' })}>
                  <option value="">— selecione uma lista —</option>
                  {listas.map((l) => <option key={l.id} value={l.id}>{l.nome} ({l.equipamento_ids.length})</option>)}
                </select>
              </label>
            ) : (
              <>
                <label><span className={rotulo}>Equipamento</span>
                  <select className={campo} value={f.equipamento_id} disabled={f.cliente_id === ''}
                          onChange={(e) => setF({ ...f, equipamento_id: e.target.value ? Number(e.target.value) : '' })}>
                    <option value="">— selecione —</option>
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
              </>
            )}
          </div>

          {/* Descrição automática + override opcional */}
          <div className="rounded-md border bg-muted/20 p-2">
            <div className={rotulo}>Descrição (automática)</div>
            <div className="text-sm font-medium">{descricaoAuto() || '—'}</div>
            <Input className="mt-2 h-8" value={f.tituloManual} onChange={(e) => setF({ ...f, tituloManual: e.target.value })}
                   aria-label="Personalizar descrição" placeholder="Personalizar (opcional) — em branco usa a automática" />
          </div>

          <label className="block"><span className={rotulo}>Observações</span>
            <textarea value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })}
                      rows={2} className="w-full rounded-md border bg-background px-2 py-1 text-sm" />
          </label>

          {!ehPrev && (
            <p className="text-[11px] text-muted-foreground">Os <strong>dados do documento de corretiva</strong> são preenchidos depois, no documento da O.S.</p>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t p-4">
          <Button variant="outline" size="sm" onClick={aoFechar}>Cancelar</Button>
          <Button size="sm" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Button>
        </div>
      </div>
    </div>
  )
}
