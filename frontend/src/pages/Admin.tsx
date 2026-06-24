import { useEffect, useState, type ChangeEvent } from 'react'
import {
  api,
  type AdminCliente,
  type AdminPapel,
  type AdminPermissao,
  type AdminProvedor,
  type AdminUsuario,
  type DocumentoTecnico,
} from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { AuditoriaView } from '../components/AuditoriaView'
import { Avatar } from '../components/Avatar'
import { statusDoc } from '../lib/format'

type FormEdicao = {
  nome: string
  papel: string
  ativo: boolean
  senha: string
  extras: Set<string>
}

type EstrForm = { estrategia: string; persona: string; camadas: Set<string> }
type PerfilForm = {
  foto_url: string
  telefone: string
  cargo: string
  unidade: string
  clienteIds: Set<number>
  observacoes: string
  acesso_expira_em: string
}
type Secao = null | 'usuarios' | 'auditoria' | 'apikeys' | 'banco' | 'clientes'

const CAMADAS = ['simples', 'tecnica']

const CARDS: { chave: Exclude<Secao, null>; titulo: string; desc: string; icone: string }[] = [
  { chave: 'usuarios', titulo: 'Gerenciar usuários', desc: 'Criar/editar usuários, papéis e permissões.', icone: '👤' },
  { chave: 'apikeys', titulo: 'Gerenciar API keys', desc: 'Chaves de provedores para integrações.', icone: '🔑' },
  { chave: 'banco', titulo: 'Banco de dados', desc: 'Gerenciar bancos de dados do sistema.', icone: '🗄️' },
  { chave: 'clientes', titulo: 'Clientes', desc: 'Clientes e quais técnicos têm acesso a cada um.', icone: '🏢' },
  { chave: 'auditoria', titulo: 'Auditoria', desc: 'Histórico de consultas e feedback.', icone: '📋' },
]

export default function Admin() {
  const { usuario } = useAuth()
  const podeGerir = usuario?.permissoes.includes('gerir_usuarios') ?? false
  const podeChaves = usuario?.permissoes.includes('gerir_chaves') ?? false

  const [secao, setSecao] = useState<Secao>(null)
  const [usuarios, setUsuarios] = useState<AdminUsuario[]>([])
  const [papeis, setPapeis] = useState<AdminPapel[]>([])
  const [permissoes, setPermissoes] = useState<AdminPermissao[]>([])
  const [estrategias, setEstrategias] = useState<string[]>([])
  const [clientes, setClientes] = useState<AdminCliente[]>([])
  const [novoCliente, setNovoCliente] = useState({ nome: '', unidade: '' })
  const [provedores, setProvedores] = useState<AdminProvedor[]>([])
  const [novoProv, setNovoProv] = useState({ nome: '', api_key: '', ativo: true })
  const [erro, setErro] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const [criando, setCriando] = useState(false)
  const [novo, setNovo] = useState({ email: '', nome: '', senha: '', papel: '' })

  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<FormEdicao | null>(null)
  const [estr, setEstr] = useState<EstrForm | null>(null)
  const [perfil, setPerfil] = useState<PerfilForm | null>(null)
  const [documentos, setDocumentos] = useState<DocumentoTecnico[]>([])
  const [novoDoc, setNovoDoc] = useState({ nome: '', validade: '' })
  const [verSenha, setVerSenha] = useState(false)

  function fecharEdicao() {
    setEditId(null); setForm(null); setEstr(null); setPerfil(null); setVerSenha(false)
  }

  async function carregar() {
    setErro(null)
    try {
      const [us, ps, pms, es, cs] = await Promise.all([
        api.admin.usuarios(),
        api.admin.papeis(),
        api.admin.permissoes(),
        api.admin.estrategias(),
        api.admin.clientes(),
      ])
      setUsuarios(us)
      setPapeis(ps)
      setPermissoes(pms)
      setEstrategias(es)
      setClientes(cs)
      if (podeChaves) setProvedores(await api.admin.provedores())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar')
    }
  }

  async function salvarProv() {
    if (!novoProv.nome.trim() || !novoProv.api_key.trim()) return
    setErro(null)
    setMsg(null)
    try {
      await api.admin.salvarProvedor(novoProv.nome.trim(), { api_key: novoProv.api_key, ativo: novoProv.ativo })
      setNovoProv({ nome: '', api_key: '', ativo: true })
      setProvedores(await api.admin.provedores())
      setMsg('Chave salva (armazenada cifrada).')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao salvar a chave')
    }
  }

  useEffect(() => {
    if (podeGerir) carregar()
  }, [podeGerir])

  function permsDoPapel(nome: string): Set<string> {
    return new Set(papeis.find((p) => p.nome === nome)?.permissoes ?? [])
  }

  async function criarUsuario() {
    setErro(null)
    setMsg(null)
    try {
      await api.admin.criarUsuario({
        email: novo.email,
        senha: novo.senha,
        nome: novo.nome,
        papel: novo.papel || null,
      })
      setCriando(false)
      setNovo({ email: '', nome: '', senha: '', papel: '' })
      setMsg('Usuário criado.')
      carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao criar')
    }
  }

  async function abrirEdicao(u: AdminUsuario) {
    setEditId(u.id)
    setMsg(null)
    setForm({
      nome: u.nome,
      papel: u.papel ?? '',
      ativo: u.ativo,
      senha: '',
      extras: new Set(u.permissoes_extra),
    })
    setEstr(null)
    setPerfil(null)
    setDocumentos([])
    setNovoDoc({ nome: '', validade: '' })
    try {
      const [cfg, det] = await Promise.all([
        api.admin.estrategiaUsuario(u.id),
        api.admin.obterUsuario(u.id),
      ])
      setEstr({
        estrategia: cfg?.estrategia ?? '',
        persona: cfg?.persona ?? '',
        camadas: new Set((cfg?.camadas ?? '').split(',').filter(Boolean)),
      })
      setPerfil({
        foto_url: det.foto_url ?? '',
        telefone: det.telefone ?? '',
        cargo: det.cargo ?? '',
        unidade: det.unidade ?? '',
        clienteIds: new Set(det.clientes.map((c) => c.id)),
        observacoes: det.observacoes ?? '',
        acesso_expira_em: det.acesso_expira_em ?? '',
      })
      setDocumentos(det.documentos)
    } catch {
      setEstr({ estrategia: '', persona: '', camadas: new Set() })
    }
  }

  async function salvarEdicao() {
    if (editId == null || !form) return
    setErro(null)
    setMsg(null)
    try {
      await api.admin.atualizarUsuario(editId, {
        nome: form.nome,
        ativo: form.ativo,
        papel: form.papel || null,
        senha: form.senha ? form.senha : undefined,
        foto_url: perfil?.foto_url ?? '',
        telefone: perfil?.telefone ?? '',
        cargo: perfil?.cargo ?? '',
        unidade: perfil?.unidade ?? '',
        cliente_ids: perfil ? Array.from(perfil.clienteIds) : undefined,
        observacoes: perfil?.observacoes ?? '',
        acesso_expira_em: perfil?.acesso_expira_em || null,
      })
      const rolePerms = permsDoPapel(form.papel)
      const extras = Array.from(form.extras).filter((c) => !rolePerms.has(c))
      await api.admin.definirPermissoesExtra(editId, extras)
      setMsg('Usuário atualizado.')
      carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao salvar')
    }
  }

  function onFoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPerfil((p) => (p ? { ...p, foto_url: String(reader.result) } : p))
    reader.readAsDataURL(file)
  }

  async function adicionarDoc() {
    if (editId == null || !novoDoc.nome.trim()) return
    setErro(null)
    try {
      const det = await api.admin.adicionarDocumento(editId, {
        nome: novoDoc.nome.trim(),
        validade: novoDoc.validade || null,
      })
      setDocumentos(det.documentos)
      setNovoDoc({ nome: '', validade: '' })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao adicionar documento')
    }
  }

  async function removerDoc(docId: number) {
    if (editId == null) return
    try {
      const det = await api.admin.removerDocumento(editId, docId)
      setDocumentos(det.documentos)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao remover documento')
    }
  }

  async function criarCliente() {
    if (!novoCliente.nome.trim()) return
    setErro(null)
    try {
      await api.admin.criarCliente({ nome: novoCliente.nome.trim(), unidade: novoCliente.unidade || null })
      setNovoCliente({ nome: '', unidade: '' })
      setClientes(await api.admin.clientes())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao criar cliente')
    }
  }

  async function alternarClienteAtivo(c: AdminCliente) {
    try {
      await api.admin.atualizarCliente(c.id, { ativo: !c.ativo })
      setClientes(await api.admin.clientes())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao atualizar cliente')
    }
  }

  async function removerCliente(c: AdminCliente) {
    try {
      await api.admin.removerCliente(c.id)
      setClientes(await api.admin.clientes())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao remover cliente')
    }
  }

  async function salvarEstrategia() {
    if (editId == null || !estr) return
    setErro(null)
    setMsg(null)
    try {
      await api.admin.definirEstrategiaUsuario(editId, {
        estrategia: estr.estrategia || null,
        persona: estr.persona || null,
        camadas: Array.from(estr.camadas),
      })
      setMsg('Estratégia do usuário atualizada.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao salvar estratégia')
    }
  }

  if (!podeGerir) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl p-4">
          <p className="text-sm text-destructive">
            Acesso restrito: você não tem a permissão <code>gerir_usuarios</code>.
          </p>
        </div>
      </div>
    )
  }

  const rolePerms = form ? permsDoPapel(form.papel) : new Set<string>()
  const emailPorId = Object.fromEntries(usuarios.map((u) => [u.id, u.email]))

  const tituloSecao = CARDS.find((c) => c.chave === secao)?.titulo ?? 'Painel ADM'

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-4 p-4">
        <div className="flex items-center gap-3">
          {secao && (
            <Button variant="outline" size="sm" onClick={() => setSecao(null)}>
              ← Voltar
            </Button>
          )}
          <h1 className="text-lg font-semibold">{tituloSecao}</h1>
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}
        {msg && <p className="text-sm text-green-700 dark:text-green-400">{msg}</p>}

        {/* Hub de cards */}
        {secao === null && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CARDS.map((c) => (
              <button
                key={c.chave}
                onClick={() => { setSecao(c.chave); setMsg(null); setErro(null) }}
                className="flex flex-col items-start rounded-xl border bg-card p-5 text-left shadow-sm transition hover:border-primary hover:shadow-md"
              >
                <span className="text-3xl">{c.icone}</span>
                <span className="mt-3 font-semibold">{c.titulo}</span>
                <span className="mt-1 text-sm text-muted-foreground">{c.desc}</span>
              </button>
            ))}
          </div>
        )}

        {/* Seções em construção */}
        {secao === 'apikeys' && (
          !podeChaves ? (
            <Card><CardContent className="p-6 text-sm text-destructive">
              Você não tem a permissão <code>gerir_chaves</code>.
            </CardContent></Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="border-b text-left text-muted-foreground">
                      <tr><th className="p-3">Provedor</th><th className="p-3">Chave</th><th className="p-3">Ativo</th></tr>
                    </thead>
                    <tbody>
                      {provedores.map((p) => (
                        <tr key={p.nome} className="border-b last:border-0">
                          <td className="p-3 font-medium">{p.nome}</td>
                          <td className="p-3 font-mono text-xs text-muted-foreground">{p.tem_chave ? (p.chave_mascarada ?? '••••') : '— sem chave —'}</td>
                          <td className="p-3">{p.ativo ? 'sim' : 'não'}</td>
                        </tr>
                      ))}
                      {provedores.length === 0 && <tr><td className="p-3 text-muted-foreground" colSpan={3}>Nenhum provedor cadastrado.</td></tr>}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Cadastrar / rotacionar chave</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Provedor</Label>
                    <Input list="provedores-sugestoes" value={novoProv.nome} onChange={(e) => setNovoProv({ ...novoProv, nome: e.target.value })} placeholder="ex.: claude_nuvem" />
                    <datalist id="provedores-sugestoes">
                      <option value="claude_nuvem" />
                      <option value="gemini_nuvem" />
                      <option value="groq_nuvem" />
                    </datalist>
                  </div>
                  <div className="space-y-1">
                    <Label>API key</Label>
                    <Input type="password" value={novoProv.api_key} onChange={(e) => setNovoProv({ ...novoProv, api_key: e.target.value })} placeholder="cole a chave (será cifrada)" />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={novoProv.ativo} onChange={(e) => setNovoProv({ ...novoProv, ativo: e.target.checked })} />
                    Ativo
                  </label>
                  <div className="sm:col-span-2">
                    <Button size="sm" onClick={salvarProv} disabled={!novoProv.nome.trim() || !novoProv.api_key.trim()}>Salvar chave</Button>
                  </div>
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    🔒 A chave é armazenada <strong>cifrada</strong> e nunca retornada em claro (só mascarada). Uso real na <strong>Fase 10</strong> (estratégias de nuvem).
                  </p>
                </CardContent>
              </Card>
            </div>
          )
        )}
        {secao === 'banco' && (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">
            🚧 Em construção: gestão de <strong>bancos de dados</strong> (status, backup, reindexação).
          </CardContent></Card>
        )}
        {secao === 'clientes' && (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Novo cliente</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap items-end gap-3">
                <div className="space-y-1"><Label>Nome</Label><Input value={novoCliente.nome} onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })} /></div>
                <div className="space-y-1"><Label>Unidade / local</Label><Input value={novoCliente.unidade} onChange={(e) => setNovoCliente({ ...novoCliente, unidade: e.target.value })} /></div>
                <Button size="sm" onClick={criarCliente} disabled={!novoCliente.nome.trim()}>Adicionar</Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-muted-foreground">
                    <tr><th className="p-3">Cliente</th><th className="p-3">Unidade</th><th className="p-3">Ativo</th><th className="p-3"></th></tr>
                  </thead>
                  <tbody>
                    {clientes.map((c) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="p-3">{c.nome}</td>
                        <td className="p-3">{c.unidade ?? '—'}</td>
                        <td className="p-3"><button className="text-xs underline" onClick={() => alternarClienteAtivo(c)}>{c.ativo ? 'sim' : 'não'}</button></td>
                        <td className="p-3 text-right"><Button variant="outline" size="sm" onClick={() => removerCliente(c)}>Remover</Button></td>
                      </tr>
                    ))}
                    {clientes.length === 0 && <tr><td className="p-3 text-muted-foreground" colSpan={4}>Nenhum cliente cadastrado.</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">
              Os <strong>técnicos com acesso</strong> a cada cliente são definidos na
              edição do usuário (Perfil e gestão → Clientes atendidos).
            </p>
          </div>
        )}

        {secao === 'auditoria' && <AuditoriaView emailPorId={emailPorId} />}

        {secao === 'usuarios' && (form && editId != null ? (
          /* ===================== #U2: edição como tela própria ===================== */
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={fecharEdicao}>← Voltar à lista</Button>
              <h2 className="font-semibold">{usuarios.find((u) => u.id === editId)?.email}</h2>
            </div>

            {/* 1. Perfil e gestão de acesso */}
            {perfil && (
              <Card>
                <CardHeader><CardTitle className="text-base">1. Perfil e gestão de acesso</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="space-y-1 text-center">
                      <Avatar
                        nome={form.nome || usuarios.find((u) => u.id === editId)?.email || '?'}
                        fotoUrl={perfil.foto_url || undefined}
                        className="h-20 w-20 border text-lg"
                      />
                      <label className="block cursor-pointer text-xs text-primary hover:underline">
                        alterar foto
                        <input type="file" accept="image/*" className="hidden" onChange={onFoto} />
                      </label>
                      {perfil.foto_url && (
                        <button type="button" className="text-xs text-destructive hover:underline" onClick={() => setPerfil({ ...perfil, foto_url: '' })}>remover</button>
                      )}
                    </div>
                    <div className="grid flex-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1"><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                      <div className="space-y-1">
                        <Label>Papel</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.papel} onChange={(e) => setForm({ ...form, papel: e.target.value })}>
                          <option value="">— sem papel —</option>
                          {papeis.map((p) => <option key={p.nome} value={p.nome}>{p.nome}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1"><Label>Cargo / função</Label><Input value={perfil.cargo} onChange={(e) => setPerfil({ ...perfil, cargo: e.target.value })} /></div>
                      <div className="space-y-1"><Label>Telefone</Label><Input value={perfil.telefone} onChange={(e) => setPerfil({ ...perfil, telefone: e.target.value })} /></div>
                      <div className="space-y-1">
                        <Label>Nova senha (opcional)</Label>
                        <div className="relative">
                          <Input type={verSenha ? 'text' : 'password'} className="pr-9" value={form.senha} placeholder="deixe em branco para não alterar" onChange={(e) => setForm({ ...form, senha: e.target.value })} />
                          <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" title={verSenha ? 'Ocultar' : 'Mostrar'} onClick={() => setVerSenha((v) => !v)}>
                            {verSenha ? '🙈' : '👁'}
                          </button>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 self-end text-sm">
                        <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
                        Ativo
                      </label>
                      <div className="space-y-1"><Label>Local de trabalho / unidade</Label><Input value={perfil.unidade} onChange={(e) => setPerfil({ ...perfil, unidade: e.target.value })} /></div>
                      <div className="space-y-1"><Label>Validade do acesso</Label><Input type="date" value={perfil.acesso_expira_em} onChange={(e) => setPerfil({ ...perfil, acesso_expira_em: e.target.value })} /></div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label>Clientes atendidos</Label>
                        {clientes.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Nenhum cliente cadastrado — cadastre no card “Clientes”.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {clientes.map((c) => {
                              const marcado = perfil.clienteIds.has(c.id)
                              return (
                                <label key={c.id} className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-sm ${marcado ? 'border-primary bg-accent' : ''}`}>
                                  <input type="checkbox" checked={marcado} onChange={(e) => {
                                    const ids = new Set(perfil.clienteIds)
                                    if (e.target.checked) ids.add(c.id); else ids.delete(c.id)
                                    setPerfil({ ...perfil, clienteIds: ids })
                                  }} />
                                  {c.nome}{c.unidade && <span className="text-muted-foreground"> · {c.unidade}</span>}
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label>Observações</Label>
                        <textarea className="min-h-[60px] w-full rounded-md border bg-background px-3 py-2 text-sm" value={perfil.observacoes} onChange={(e) => setPerfil({ ...perfil, observacoes: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  <Button size="sm" onClick={salvarEdicao}>Salvar perfil e permissões</Button>
                </CardContent>
              </Card>
            )}

            {/* 2. Documentos exigidos */}
            <Card>
              <CardHeader><CardTitle className="text-base">2. Documentos exigidos (com validade)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(() => {
                  const venc = documentos.filter((d) => d.validade && Math.ceil((new Date(d.validade + 'T00:00:00').getTime() - Date.now()) / 86400000) <= 30).length
                  return venc > 0 ? <p className="text-xs font-medium text-amber-700 dark:text-amber-300">⚠️ {venc} documento(s) vencido(s) ou vencendo em até 30 dias — providenciar renovação.</p> : null
                })()}
                {documentos.length === 0 && <p className="text-xs text-muted-foreground">Nenhum documento cadastrado.</p>}
                {documentos.map((d) => {
                  const s = statusDoc(d.validade)
                  return (
                    <div key={d.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
                      <span className="flex-1 truncate">{d.nome}</span>
                      <span className="text-xs text-muted-foreground">{d.validade ?? '—'}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[11px] ${s.cls}`}>{s.label}</span>
                      <button type="button" className="text-xs text-destructive hover:underline" onClick={() => removerDoc(d.id)}>remover</button>
                    </div>
                  )
                })}
                <div className="flex gap-2">
                  <Input value={novoDoc.nome} onChange={(e) => setNovoDoc({ ...novoDoc, nome: e.target.value })} placeholder="Documento (ex.: NR-10, ASO, crachá Cliente X)" />
                  <Input type="date" className="w-40" value={novoDoc.validade} onChange={(e) => setNovoDoc({ ...novoDoc, validade: e.target.value })} />
                  <Button type="button" variant="outline" size="sm" onClick={adicionarDoc} disabled={!novoDoc.nome.trim()}>Adicionar</Button>
                </div>
              </CardContent>
            </Card>

            {/* 3. Permissões */}
            <Card>
              <CardHeader><CardTitle className="text-base">3. Permissões</CardTitle></CardHeader>
              <CardContent>
                <p className="mb-2 text-xs text-muted-foreground">As “(papel)” vêm do papel; as demais são permissões extra deste usuário. Salvas junto com o perfil.</p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {permissoes.map((perm) => {
                    const viaPapel = rolePerms.has(perm.chave)
                    const marcada = viaPapel || form.extras.has(perm.chave)
                    return (
                      <label key={perm.chave} className="flex items-start gap-2 text-sm" title={perm.descricao}>
                        <input type="checkbox" className="mt-0.5" disabled={viaPapel} checked={marcada} onChange={(e) => {
                          const extras = new Set(form.extras)
                          if (e.target.checked) extras.add(perm.chave); else extras.delete(perm.chave)
                          setForm({ ...form, extras })
                        }} />
                        <span>{perm.chave}{viaPapel && <span className="text-muted-foreground"> (papel)</span>}</span>
                      </label>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 4. Estratégia e camadas */}
            {estr && (
              <Card>
                <CardHeader><CardTitle className="text-base">4. Estratégia e camadas</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">Sobrescreve o padrão global/por papel. Camadas vazias = padrão do papel.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Estratégia</Label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={estr.estrategia} onChange={(e) => setEstr({ ...estr, estrategia: e.target.value })}>
                        <option value="">— padrão (global/papel) —</option>
                        {estrategias.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1"><Label>Persona (opcional)</Label><Input value={estr.persona} onChange={(e) => setEstr({ ...estr, persona: e.target.value })} placeholder="ex.: operador não-técnico" /></div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {CAMADAS.map((c) => (
                      <label key={c} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={estr.camadas.has(c)} onChange={(e) => {
                          const camadas = new Set(estr.camadas)
                          if (e.target.checked) camadas.add(c); else camadas.delete(c)
                          setEstr({ ...estr, camadas })
                        }} />
                        {c === 'simples' ? '🟢 simples' : '🔧 técnica'}
                      </label>
                    ))}
                  </div>
                  <Button size="sm" onClick={salvarEstrategia}>Salvar estratégia</Button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* ===================== #U1: lista moderna ===================== */
          <>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setCriando((v) => !v)}>{criando ? 'Cancelar' : '+ Novo usuário'}</Button>
            </div>

            {criando && (
              <Card>
                <CardHeader><CardTitle className="text-base">Novo usuário</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Nome</Label><Input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Senha</Label><Input type="password" value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} /></div>
                  <div className="space-y-1">
                    <Label>Papel</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={novo.papel} onChange={(e) => setNovo({ ...novo, papel: e.target.value })}>
                      <option value="">— sem papel —</option>
                      {papeis.map((p) => <option key={p.nome} value={p.nome}>{p.nome}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2"><Button size="sm" onClick={criarUsuario} disabled={!novo.email || !novo.senha}>Criar</Button></div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="divide-y p-2">
                {usuarios.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 py-2">
                    <Avatar nome={u.nome || u.email} fotoUrl={u.foto_url} className="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{u.email}</span>
                        {u.docs_alerta > 0 && (
                          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-200" title="Documentos vencidos ou vencendo em até 30 dias">
                            ⚠️ {u.docs_alerta} doc.
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {u.nome || '—'} · {u.cargo || u.papel || '—'}{!u.ativo && ' · inativo'}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => abrirEdicao(u)}>Editar</Button>
                  </div>
                ))}
                {usuarios.length === 0 && <p className="py-3 text-sm text-muted-foreground">Nenhum usuário.</p>}
              </CardContent>
            </Card>
          </>
        ))}
      </div>
    </div>
  )
}
