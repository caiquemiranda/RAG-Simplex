import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, uploadArquivo, type AdminUnidade, type ClienteDetalhe } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

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
  useEffect(() => {
    carregar()
    if (podeGerir) api.admin.unidades().then(setUnidades).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid])

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
          <p className="mb-2 text-xs text-muted-foreground">Colunas do CSV: <span className="font-mono">painel, loop, add, type, model</span> (delimitador <span className="font-mono">,</span> ou <span className="font-mono">;</span>).</p>
          {cli.equipamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum equipamento. Importe um CSV.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-1 pr-2">Painel</th><th className="py-1 pr-2">Loop</th><th className="py-1 pr-2">Add</th><th className="py-1 pr-2">Type</th><th className="py-1 pr-2">Model</th><th></th>
                </tr></thead>
                <tbody>
                  {cli.equipamentos.map((e) => (
                    <tr key={e.id} className="border-b">
                      <td className="py-1 pr-2 font-mono text-xs">{e.painel}</td>
                      <td className="py-1 pr-2 font-mono text-xs">{e.loop}</td>
                      <td className="py-1 pr-2 font-mono text-xs">{e.add}</td>
                      <td className="py-1 pr-2">{e.type}</td>
                      <td className="py-1 pr-2">{e.model}</td>
                      <td className="py-1 text-right"><button className="text-xs text-destructive hover:underline" onClick={() => removerEquip(e.id)}>remover</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
