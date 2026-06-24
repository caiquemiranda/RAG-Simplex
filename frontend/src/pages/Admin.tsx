import { useEffect, useState, type ChangeEvent } from 'react'
import {
  api,
  type AdminPapel,
  type AdminPermissao,
  type AdminUsuario,
  type DocumentoTecnico,
} from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { AuditoriaView } from '../components/AuditoriaView'

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
  clientes: string
  observacoes: string
  acesso_expira_em: string
}
type Secao = null | 'usuarios' | 'auditoria' | 'apikeys' | 'banco' | 'clientes'

/** Classifica a validade de um documento para o alerta visual. */
function statusDoc(validade: string | null): { label: string; cls: string } {
  if (!validade) return { label: 'sem validade', cls: 'bg-muted text-muted-foreground' }
  const dias = Math.ceil((new Date(validade + 'T00:00:00').getTime() - Date.now()) / 86400000)
  if (dias < 0) return { label: `vencido há ${-dias}d`, cls: 'bg-red-100 text-red-700' }
  if (dias <= 30) return { label: `vence em ${dias}d`, cls: 'bg-amber-100 text-amber-700' }
  return { label: 'válido', cls: 'bg-emerald-100 text-emerald-700' }
}

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

  const [secao, setSecao] = useState<Secao>(null)
  const [usuarios, setUsuarios] = useState<AdminUsuario[]>([])
  const [papeis, setPapeis] = useState<AdminPapel[]>([])
  const [permissoes, setPermissoes] = useState<AdminPermissao[]>([])
  const [estrategias, setEstrategias] = useState<string[]>([])
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

  async function carregar() {
    setErro(null)
    try {
      const [us, ps, pms, es] = await Promise.all([
        api.admin.usuarios(),
        api.admin.papeis(),
        api.admin.permissoes(),
        api.admin.estrategias(),
      ])
      setUsuarios(us)
      setPapeis(ps)
      setPermissoes(pms)
      setEstrategias(es)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar')
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
        clientes: det.clientes ?? '',
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
        clientes: perfil?.clientes ?? '',
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
        {msg && <p className="text-sm text-green-700">{msg}</p>}

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
          <Card><CardContent className="p-6 text-sm text-muted-foreground">
            🚧 Em construção: cadastro/rotação de <strong>API keys</strong> de provedores
            (já há suporte no backend em <code>/admin/provedores</code>, com a chave cifrada).
          </CardContent></Card>
        )}
        {secao === 'banco' && (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">
            🚧 Em construção: gestão de <strong>bancos de dados</strong> (status, backup, reindexação).
          </CardContent></Card>
        )}
        {secao === 'clientes' && (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">
            🚧 Em construção: <strong>clientes</strong> e quais técnicos têm acesso a cada um.
          </CardContent></Card>
        )}

        {secao === 'auditoria' && <AuditoriaView emailPorId={emailPorId} />}

        {secao === 'usuarios' && (
          <>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setCriando((v) => !v)}>
                {criando ? 'Cancelar' : '+ Novo usuário'}
              </Button>
            </div>

            {criando && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Novo usuário</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>E-mail</Label>
                    <Input type="email" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Nome</Label>
                    <Input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Senha</Label>
                    <Input type="password" value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Papel</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={novo.papel}
                      onChange={(e) => setNovo({ ...novo, papel: e.target.value })}
                    >
                      <option value="">— sem papel —</option>
                      {papeis.map((p) => (
                        <option key={p.nome} value={p.nome}>{p.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <Button size="sm" onClick={criarUsuario} disabled={!novo.email || !novo.senha}>
                      Criar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-muted-foreground">
                    <tr>
                      <th className="p-3">E-mail</th>
                      <th className="p-3">Nome</th>
                      <th className="p-3">Papel</th>
                      <th className="p-3">Ativo</th>
                      <th className="p-3">Extra</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u) => (
                      <tr key={u.id} className="border-b last:border-0">
                        <td className="p-3">{u.email}</td>
                        <td className="p-3">{u.nome || '—'}</td>
                        <td className="p-3">{u.papel ?? '—'}</td>
                        <td className="p-3">{u.ativo ? 'sim' : 'não'}</td>
                        <td className="p-3">{u.permissoes_extra.length || '—'}</td>
                        <td className="p-3 text-right">
                          <Button variant="outline" size="sm" onClick={() => abrirEdicao(u)}>
                            Editar
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {usuarios.length === 0 && (
                      <tr>
                        <td className="p-3 text-muted-foreground" colSpan={6}>Nenhum usuário.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {form && editId != null && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Editar: {usuarios.find((u) => u.id === editId)?.email}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Dados + permissões */}
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Nome</Label>
                        <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Papel</Label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={form.papel}
                          onChange={(e) => setForm({ ...form, papel: e.target.value })}
                        >
                          <option value="">— sem papel —</option>
                          {papeis.map((p) => (
                            <option key={p.nome} value={p.nome}>{p.nome}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label>Nova senha (opcional)</Label>
                        <Input
                          type="password"
                          value={form.senha}
                          onChange={(e) => setForm({ ...form, senha: e.target.value })}
                          placeholder="deixe em branco para não alterar"
                        />
                      </div>
                      <label className="flex items-center gap-2 self-end text-sm">
                        <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
                        Ativo
                      </label>
                    </div>

                    <div>
                      <Label>Permissões</Label>
                      <p className="mb-2 text-xs text-muted-foreground">
                        As “(papel)” vêm do papel; as demais são permissões extra deste usuário.
                      </p>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {permissoes.map((perm) => {
                          const viaPapel = rolePerms.has(perm.chave)
                          const marcada = viaPapel || form.extras.has(perm.chave)
                          return (
                            <label key={perm.chave} className="flex items-start gap-2 text-sm" title={perm.descricao}>
                              <input
                                type="checkbox"
                                className="mt-0.5"
                                disabled={viaPapel}
                                checked={marcada}
                                onChange={(e) => {
                                  const extras = new Set(form.extras)
                                  if (e.target.checked) extras.add(perm.chave)
                                  else extras.delete(perm.chave)
                                  setForm({ ...form, extras })
                                }}
                              />
                              <span>
                                {perm.chave}
                                {viaPapel && <span className="text-muted-foreground"> (papel)</span>}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>

                    {/* Perfil / acesso / documentos */}
                    {perfil && (
                      <div className="space-y-4 border-t pt-4">
                        <Label>Perfil e gestão de acesso</Label>
                        <div className="flex items-start gap-4">
                          <div className="space-y-1 text-center">
                            <div className="h-20 w-20 overflow-hidden rounded-full border bg-muted">
                              {perfil.foto_url ? (
                                <img src={perfil.foto_url} alt="foto" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[11px] text-muted-foreground">sem foto</div>
                              )}
                            </div>
                            <label className="block cursor-pointer text-xs text-primary hover:underline">
                              alterar foto
                              <input type="file" accept="image/*" className="hidden" onChange={onFoto} />
                            </label>
                            {perfil.foto_url && (
                              <button type="button" className="text-xs text-destructive hover:underline" onClick={() => setPerfil({ ...perfil, foto_url: '' })}>remover</button>
                            )}
                          </div>
                          <div className="grid flex-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1"><Label>Telefone</Label><Input value={perfil.telefone} onChange={(e) => setPerfil({ ...perfil, telefone: e.target.value })} /></div>
                            <div className="space-y-1"><Label>Cargo / função</Label><Input value={perfil.cargo} onChange={(e) => setPerfil({ ...perfil, cargo: e.target.value })} /></div>
                            <div className="space-y-1"><Label>Local de trabalho / unidade</Label><Input value={perfil.unidade} onChange={(e) => setPerfil({ ...perfil, unidade: e.target.value })} /></div>
                            <div className="space-y-1"><Label>Validade do acesso</Label><Input type="date" value={perfil.acesso_expira_em} onChange={(e) => setPerfil({ ...perfil, acesso_expira_em: e.target.value })} /></div>
                            <div className="space-y-1 sm:col-span-2"><Label>Clientes associados</Label><Input value={perfil.clientes} onChange={(e) => setPerfil({ ...perfil, clientes: e.target.value })} placeholder="ex.: Shopping X, Hospital Y (separe por vírgula)" /></div>
                            <div className="space-y-1 sm:col-span-2">
                              <Label>Observações</Label>
                              <textarea className="min-h-[60px] w-full rounded-md border bg-background px-3 py-2 text-sm" value={perfil.observacoes} onChange={(e) => setPerfil({ ...perfil, observacoes: e.target.value })} />
                            </div>
                          </div>
                        </div>

                        {/* Documentos com validade */}
                        <div className="space-y-2">
                          <Label>Documentos exigidos (com validade)</Label>
                          {(() => {
                            const venc = documentos.filter((d) => d.validade && Math.ceil((new Date(d.validade + 'T00:00:00').getTime() - Date.now()) / 86400000) <= 30).length
                            return venc > 0 ? <p className="text-xs font-medium text-amber-700">⚠️ {venc} documento(s) vencido(s) ou vencendo em até 30 dias — providenciar renovação.</p> : null
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
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 border-t pt-4">
                      <Button size="sm" onClick={salvarEdicao}>Salvar usuário</Button>
                      <Button variant="outline" size="sm" onClick={() => { setEditId(null); setForm(null); setEstr(null); setPerfil(null) }}>
                        Fechar
                      </Button>
                    </div>
                  </div>

                  {/* Estratégia / camadas deste usuário */}
                  {estr && (
                    <div className="space-y-3 border-t pt-4">
                      <Label>Estratégia e camadas deste usuário</Label>
                      <p className="text-xs text-muted-foreground">
                        Sobrescreve o padrão global/por papel. Camadas vazias = padrão do papel.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label>Estratégia</Label>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            value={estr.estrategia}
                            onChange={(e) => setEstr({ ...estr, estrategia: e.target.value })}
                          >
                            <option value="">— padrão (global/papel) —</option>
                            {estrategias.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label>Persona (opcional)</Label>
                          <Input
                            value={estr.persona}
                            onChange={(e) => setEstr({ ...estr, persona: e.target.value })}
                            placeholder="ex.: operador não-técnico"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {CAMADAS.map((c) => (
                          <label key={c} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={estr.camadas.has(c)}
                              onChange={(e) => {
                                const camadas = new Set(estr.camadas)
                                if (e.target.checked) camadas.add(c)
                                else camadas.delete(c)
                                setEstr({ ...estr, camadas })
                              }}
                            />
                            {c === 'simples' ? '🟢 simples' : '🔧 técnica'}
                          </label>
                        ))}
                      </div>
                      <Button size="sm" onClick={salvarEstrategia}>Salvar estratégia</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
