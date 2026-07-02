import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, uploadArquivo, STATUS_EQUIP, type AdminUnidade, type ClienteDetalhe, type Equipamento, type Falha, type Planta } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { VisualizadorPlanta, type Marcador } from '../components/VisualizadorPlanta'
import { corStatusEquip } from '../lib/format'
import { IconClose } from '../components/icons'

const corStatus = corStatusEquip

type Form = {
  nome: string; unidadeId: number | ''; cor: string
  endereco: string; contato: string; telefone: string; email: string; observacoes: string
}

/** Página de cadastro do cliente (#CLI-PG): dados, endereço/contatos, logo e equipamentos. */
export default function ClienteAdmin() {
  const { id } = useParams()
  const cid = Number(id)
  const { usuario } = useAuth()
  const podeGerir = usuario?.permissoes.includes('gerir_usuarios') ?? false

  const [cli, setCli] = useState<ClienteDetalhe | null>(null)
  const [unidades, setUnidades] = useState<AdminUnidade[]>([])
  const [form, setForm] = useState<Form | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [substituir, setSubstituir] = useState(false)
  const csvRef = useRef<HTMLInputElement>(null)
  // Editor de mapa (#MAP-3)
  const [plantas, setPlantas] = useState<Planta[]>([])
  const [plantaEditId, setPlantaEditId] = useState<number | ''>('')
  const [colocarId, setColocarId] = useState<number | null>(null)  // equipamento a posicionar/mover
  const pdfRef = useRef<HTMLInputElement>(null)
  // Cadastro manual de equipamento (item 5)
  const [novoEq, setNovoEq] = useState({ tag: '', painel: '', loop: '', add: '', type: '', model: '' })
  const [falhas, setFalhas] = useState<Falha[]>([])   // catálogo (#EQP-STATUS)
  // Editor: autocomplete + caixa de posicionamento (itens 2/3/4)
  const [buscaEd, setBuscaEd] = useState('')
  const [verTodos, setVerTodos] = useState(false)
  const [pendente, setPendente] = useState<{ x: number; y: number } | null>(null)
  const [boxFields, setBoxFields] = useState({ painel: '', loop: '', add: '', type: '', model: '' })

  async function carregar() {
    setErro(null)
    try {
      const c = await api.admin.cliente(cid)
      setCli(c)
      setForm({
        nome: c.nome, unidadeId: c.unidade_id ?? '', cor: c.cor ?? '#16C0CC',
        endereco: c.endereco ?? '', contato: c.contato ?? '', telefone: c.telefone ?? '',
        email: c.email ?? '', observacoes: c.observacoes ?? '',
      })
    } catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao carregar o cliente') }
  }
  async function carregarPlantas() {
    try { const ps = await api.admin.plantas(cid); setPlantas(ps); if (plantaEditId === '' && ps[0]) setPlantaEditId(ps[0].id) }
    catch { /* ignore */ }
  }
  useEffect(() => {
    carregar(); carregarPlantas()
    if (podeGerir) {
      api.admin.unidades().then(setUnidades).catch(() => {})
      api.admin.falhas().then(setFalhas).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid])

  // #EQP-STATUS: muda status/falha do equipamento; "Em falha" exige falha_id, os demais limpam.
  async function atualizarStatus(e: Equipamento, dados: { status?: string; falha_id?: number | null }) {
    try { await api.admin.atualizarEquipamento(e.id, dados); carregar() }
    catch (err) { setErro(err instanceof Error ? err.message : 'Falha ao atualizar status') }
  }

  async function subirPlanta(file: File) {
    setErro(null); setMsg(null)
    try { const novas = await api.admin.uploadPlanta(cid, file); setMsg(`Planta importada (${novas.length} página(s)).`); carregarPlantas() }
    catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao subir a planta (envie um PDF)') }
  }
  async function removerPlanta(plantaId: number) {
    try { await api.admin.removerPlanta(plantaId); if (plantaEditId === plantaId) setPlantaEditId(''); carregarPlantas(); carregar() }
    catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao remover a planta') }
  }
  async function tirarDoMapa(eqpId: number) {
    try { await api.admin.atualizarEquipamento(eqpId, { planta_id: null, pos_x: null, pos_y: null }); carregar() }
    catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao remover do mapa') }
  }
  async function criarEquip() {
    if (!novoEq.tag.trim() && !novoEq.painel.trim() && !novoEq.add.trim()) return
    setErro(null)
    try { await api.admin.criarEquipamento(cid, novoEq); setNovoEq({ tag: '', painel: '', loop: '', add: '', type: '', model: '' }); carregar() }
    catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao cadastrar equipamento') }
  }
  // Item 2: clicar na planta abre a caixa (não salva ainda); "Salvar" grava a posição.
  async function salvarPosicao(campos: { painel: string; loop: string; add: string; type: string; model: string }) {
    if (colocarId == null || plantaEditId === '' || !pendente) return
    try {
      await api.admin.atualizarEquipamento(colocarId, { planta_id: plantaEditId, pos_x: pendente.x, pos_y: pendente.y, ...campos })
      setPendente(null); carregar()
    } catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao salvar posição') }
  }

  async function salvar() {
    if (!form) return
    setErro(null); setMsg(null)
    try {
      await api.admin.atualizarCliente(cid, {
        nome: form.nome.trim(), unidade_id: form.unidadeId === '' ? null : form.unidadeId, cor: form.cor,
        endereco: form.endereco, contato: form.contato, telefone: form.telefone, email: form.email, observacoes: form.observacoes,
      })
      setMsg('Cliente salvo.')
      carregar()
    } catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao salvar') }
  }

  async function onLogo(file: File) {
    try { const { url } = await uploadArquivo(file, 'clientes'); await api.admin.atualizarCliente(cid, { logo_url: url }); carregar() }
    catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao enviar o logo') }
  }

  async function importarCsv(file: File) {
    setErro(null); setMsg(null)
    try {
      const r = await api.admin.importarEquipamentos(cid, file, substituir)
      setMsg(`Importados ${r.importados} equipamentos (total ${r.total}).`)
      carregar()
    } catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao importar CSV') }
  }
  async function removerEquip(eqpId: number) {
    try { await api.admin.removerEquipamento(eqpId); carregar() } catch { /* ignore */ }
  }

  if (!podeGerir) return <div className="p-6 text-sm text-muted-foreground">Acesso restrito ao administrador.</div>
  if (erro && !cli) return <div className="p-6"><p className="text-sm text-destructive">{erro}</p><Link to="/admin" className="text-sm text-primary hover:underline">← Voltar ao painel</Link></div>
  if (!cli || !form) return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <nav className="text-xs text-muted-foreground">
        <Link to="/admin" className="hover:underline">Painel ADM</Link>
        <span className="mx-1">/</span>
        <span className="text-foreground">Clientes</span>
        <span className="mx-1">/</span>
        <span className="text-foreground">{cli.nome}</span>
      </nav>

      {erro && <p className="text-sm text-destructive">{erro}</p>}
      {msg && <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">{msg}</p>}

      {/* Dados do cliente */}
      <Card>
        <CardHeader><CardTitle className="text-base">Dados do cliente</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="space-y-1 text-center">
              <Avatar nome={form.nome || cli.nome} fotoUrl={cli.logo_url ?? undefined} cor={form.cor} className="h-16 w-16 text-lg" />
              <label className="cursor-pointer text-xs text-primary hover:underline">
                alterar logo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogo(f) }} />
              </label>
            </div>
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Unidade</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={form.unidadeId} onChange={(e) => setForm({ ...form, unidadeId: e.target.value ? Number(e.target.value) : '' })}>
                  <option value="">— sem unidade —</option>
                  {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label>Contato (responsável)</Label><Input value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} /></div>
              <div className="space-y-1"><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
              <div className="space-y-1"><Label>E-mail</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Cor</Label>
                <input type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} className="h-10 w-12 cursor-pointer rounded border" />
              </div>
              <div className="space-y-1 sm:col-span-2"><Label>Endereço</Label><Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Observações</Label>
                <textarea className="min-h-[60px] w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
              </div>
            </div>
          </div>
          <Button size="sm" onClick={salvar} disabled={!form.nome.trim()}>Salvar</Button>
        </CardContent>
      </Card>

      {/* Equipamentos (#EQP-1) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Equipamentos ({cli.equipamentos.length})</CardTitle>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              <input type="checkbox" checked={substituir} onChange={(e) => setSubstituir(e.target.checked)} /> substituir
            </label>
            <input ref={csvRef} type="file" accept=".csv,text/csv" className="hidden"
                   onChange={(e) => { const f = e.target.files?.[0]; if (f) importarCsv(f); e.target.value = '' }} />
            <Button size="sm" variant="outline" onClick={() => csvRef.current?.click()}>Importar CSV</Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-2 text-xs text-muted-foreground">Colunas do CSV: <span className="font-mono">tag, painel, loop, add, type, model, status, ultima_manutencao</span> — se a <strong>tag</strong> faltar, é composta de painel+loop+add+type.</p>
          {/* Cadastro manual (item 5) — campos vazios podem ser preenchidos depois */}
          <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-lg border bg-muted/20 p-2 sm:grid-cols-7">
            <Input className="h-8 sm:col-span-2" value={novoEq.tag} onChange={(e) => setNovoEq({ ...novoEq, tag: e.target.value })} placeholder="Tag (ou auto)" />
            <Input className="h-8" value={novoEq.painel} onChange={(e) => setNovoEq({ ...novoEq, painel: e.target.value })} placeholder="Painel" />
            <Input className="h-8" value={novoEq.loop} onChange={(e) => setNovoEq({ ...novoEq, loop: e.target.value })} placeholder="Loop" />
            <Input className="h-8" value={novoEq.add} onChange={(e) => setNovoEq({ ...novoEq, add: e.target.value })} placeholder="Add" />
            <Input className="h-8" value={novoEq.type} onChange={(e) => setNovoEq({ ...novoEq, type: e.target.value })} placeholder="Type" />
            <Input className="h-8" value={novoEq.model} onChange={(e) => setNovoEq({ ...novoEq, model: e.target.value })} placeholder="Model" />
            <div className="sm:col-span-7"><Button size="sm" variant="outline" onClick={criarEquip}>Adicionar equipamento</Button></div>
          </div>
          {cli.equipamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum equipamento. Cadastre acima ou importe um CSV.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-1 pr-2">Tag</th><th className="py-1 pr-2">Painel</th><th className="py-1 pr-2">Loop</th><th className="py-1 pr-2">Add</th><th className="py-1 pr-2">Type</th><th className="py-1 pr-2">Model</th><th className="py-1 pr-2">Status</th><th className="py-1 pr-2">Coordenadas</th><th className="py-1 pr-2">Últ. manut.</th><th></th>
                </tr></thead>
                <tbody>
                  {cli.equipamentos.map((e) => {
                    const emFalha = e.falha_id != null
                    const statusSel = emFalha ? 'Em falha' : (e.status || 'Operando')
                    return (
                    <tr key={e.id} className="border-b">
                      <td className="py-1 pr-2 font-mono text-xs font-medium">{e.tag || '—'}</td>
                      <td className="py-1 pr-2 font-mono text-xs">{e.painel}</td>
                      <td className="py-1 pr-2 font-mono text-xs">{e.loop}</td>
                      <td className="py-1 pr-2 font-mono text-xs">{e.add}</td>
                      <td className="py-1 pr-2">{e.type}</td>
                      <td className="py-1 pr-2">{e.model}</td>
                      <td className="py-1 pr-2">
                        <div className="flex items-center gap-1">
                          <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: corStatus(e.status, emFalha) }} />
                          <select className="h-7 rounded border bg-background px-1 text-xs" value={statusSel}
                                  onChange={(ev) => {
                                    const v = ev.target.value
                                    if (v === 'Em falha') atualizarStatus(e, { status: 'Em falha', falha_id: falhas[0]?.id ?? null })
                                    else atualizarStatus(e, { status: v, falha_id: null })
                                  }}>
                            {STATUS_EQUIP.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                          {emFalha && (
                            <select className="h-7 rounded border bg-background px-1 text-xs" value={e.falha_id ?? ''}
                                    onChange={(ev) => atualizarStatus(e, { falha_id: ev.target.value ? Number(ev.target.value) : null })}>
                              {falhas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="py-1 pr-2 text-xs text-muted-foreground">{e.pos_x != null ? `X ${e.pos_x}, Y ${e.pos_y}` : '—'}</td>
                      <td className="py-1 pr-2 text-xs text-muted-foreground">{e.ultima_manutencao ?? '—'}</td>
                      <td className="py-1 text-right"><button className="text-xs text-destructive hover:underline" onClick={() => removerEquip(e.id)}>remover</button></td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plantas (#MAP) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Plantas ({plantas.length})</CardTitle>
          <>
            <input ref={pdfRef} type="file" accept="application/pdf,.pdf" className="hidden"
                   onChange={(e) => { const f = e.target.files?.[0]; if (f) subirPlanta(f); e.target.value = '' }} />
            <Button size="sm" variant="outline" onClick={() => pdfRef.current?.click()}>Subir planta (PDF)</Button>
          </>
        </CardHeader>
        <CardContent>
          <p className="mb-2 text-xs text-muted-foreground">Cada página do PDF vira uma planta (convertida em imagem no servidor).</p>
          {plantas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma planta. Suba o PDF do projeto.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {plantas.map((p) => (
                <span key={p.id} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${p.id === plantaEditId ? 'border-primary bg-accent' : ''}`}>
                  <button onClick={() => setPlantaEditId(p.id)} className="hover:underline">{p.nome}</button>
                  <button className="p-1 text-destructive hover:underline" title="Remover planta" aria-label="Remover planta" onClick={() => removerPlanta(p.id)}><IconClose className="h-3.5 w-3.5" /></button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor de mapa (#MAP-3): posicionar equipamentos */}
      {plantaEditId !== '' && cli && (() => {
        const eqs: Equipamento[] = cli.equipamentos
        const planta = plantas.find((p) => p.id === plantaEditId)
        if (!planta) return null
        const posicionados = eqs.filter((e) => e.planta_id === plantaEditId && e.pos_x != null && e.pos_y != null)
        const marcadores: Marcador[] = posicionados.map((e) => ({ id: e.id, x: e.pos_x as number, y: e.pos_y as number, cor: corStatus(e.status, e.falha_id != null) }))
        if (pendente && colocarId != null) marcadores.push({ id: -1, x: pendente.x, y: pendente.y, cor: '#6366f1' })
        const aColocar = eqs.find((e) => e.id === colocarId) ?? null
        const t = buscaEd.trim().toLowerCase()
        const sugestoes = t ? eqs.filter((e) => (e.tag || '').toLowerCase().includes(t) || (e.add || '').toLowerCase().includes(t)).slice(0, 10) : []

        function escolher(e: Equipamento) {
          setColocarId(e.id); setBuscaEd(e.tag || e.add || `#${e.id}`); setPendente(null)
        }
        function validarBusca() {
          const v = buscaEd.trim().toLowerCase()
          if (!v) return
          const achado = eqs.find((e) => (e.tag || '').toLowerCase() === v || (e.add || '').toLowerCase() === v)
          if (achado) escolher(achado)
          else if (!eqs.some((e) => (e.tag || '').toLowerCase().includes(v) || (e.add || '').toLowerCase().includes(v))) {
            window.alert(`Sem registro para "${buscaEd}".`)
          }
        }
        return (
          <Card>
            <CardHeader><CardTitle className="text-base">Posicionar no mapa — {planta.nome}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {/* Item 3: autocomplete por tag + Item 4: ver todos */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Input className="w-64" value={buscaEd} placeholder="Equipamento (digite a tag)…"
                         onChange={(e) => { setBuscaEd(e.target.value); setColocarId(null) }}
                         onKeyDown={(e) => { if (e.key === 'Enter') validarBusca() }} onBlur={validarBusca} />
                  {sugestoes.length > 0 && colocarId == null && (
                    <div className="absolute z-20 mt-1 max-h-56 w-72 overflow-auto rounded-md border bg-card shadow-lg">
                      {sugestoes.map((e) => (
                        <button key={e.id} className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm hover:bg-accent" onClick={() => escolher(e)}>
                          <span className="truncate font-medium">{e.tag || e.add || `#${e.id}`}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{e.planta_id != null ? '✓ no mapa' : e.type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => setVerTodos((v) => !v)}>{verTodos ? 'Ocultar lista' : 'Ver todos'}</Button>
                {aColocar && aColocar.planta_id != null && (
                  <button className="text-xs text-destructive hover:underline" onClick={() => tirarDoMapa(aColocar.id)}>tirar do mapa</button>
                )}
              </div>

              {/* Item 4: lista de todos os posicionados */}
              {verTodos && (
                <div className="flex flex-wrap gap-1.5 rounded-md border p-2">
                  {posicionados.length === 0 && <span className="text-xs text-muted-foreground">Nenhum equipamento posicionado nesta planta.</span>}
                  {posicionados.map((e) => (
                    <button key={e.id} className={`rounded-full border px-2 py-0.5 text-xs hover:bg-accent ${e.id === colocarId ? 'border-primary bg-accent' : ''}`} onClick={() => { setColocarId(e.id); setBuscaEd(e.tag || '') }}>{e.tag || e.add || `#${e.id}`}</button>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {colocarId ? 'Clique na planta para marcar a posição — depois confira os dados e clique em Salvar.' : 'Escolha um equipamento (busca ou "Ver todos") e clique na planta.'}
              </p>

              <VisualizadorPlanta
                imagemUrl={planta.imagem_url} largura={planta.largura} altura={planta.altura}
                marcadores={marcadores} ativoId={pendente ? -1 : colocarId}
                onMarcador={(id) => { if (id !== -1) { setColocarId(id); setBuscaEd(eqs.find((e) => e.id === id)?.tag ?? '') } }}
                onClicarPlanta={(x, y) => {
                  if (colocarId == null) { window.alert('Selecione um equipamento primeiro.'); return }
                  const e = eqs.find((q) => q.id === colocarId)
                  setBoxFields({ painel: e?.painel ?? '', loop: e?.loop ?? '', add: e?.add ?? '', type: e?.type ?? '', model: e?.model ?? '' })
                  setPendente({ x, y })
                }}
                renderPopup={() => null}
              />

              {/* Item 2: caixa com os dados + Salvar (após marcar a posição) */}
              {pendente && aColocar && (
                <div className="rounded-lg border bg-card p-3">
                  <div className="mb-2 text-sm font-semibold">{aColocar.tag || `#${aColocar.id}`} — posição X {pendente.x}, Y {pendente.y}</div>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                    <Input className="h-8" value={boxFields.painel} onChange={(e) => setBoxFields({ ...boxFields, painel: e.target.value })} placeholder="Painel" />
                    <Input className="h-8" value={boxFields.loop} onChange={(e) => setBoxFields({ ...boxFields, loop: e.target.value })} placeholder="Loop" />
                    <Input className="h-8" value={boxFields.add} onChange={(e) => setBoxFields({ ...boxFields, add: e.target.value })} placeholder="Add" />
                    <Input className="h-8" value={boxFields.type} onChange={(e) => setBoxFields({ ...boxFields, type: e.target.value })} placeholder="Type" />
                    <Input className="h-8" value={boxFields.model} onChange={(e) => setBoxFields({ ...boxFields, model: e.target.value })} placeholder="Model" />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => salvarPosicao(boxFields)}>Salvar</Button>
                    <Button size="sm" variant="outline" onClick={() => setPendente(null)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })()}
    </div>
  )
}
