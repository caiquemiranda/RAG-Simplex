import { useEffect, useState } from 'react'
import {
  api,
  type AdminPapel,
  type AdminPermissao,
  type AdminUsuario,
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

const CAMADAS = ['simples', 'tecnica']

export default function Admin() {
  const { usuario } = useAuth()
  const podeGerir = usuario?.permissoes.includes('gerir_usuarios') ?? false

  const [aba, setAba] = useState<'usuarios' | 'auditoria'>('usuarios')
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
    try {
      const cfg = await api.admin.estrategiaUsuario(u.id)
      setEstr({
        estrategia: cfg?.estrategia ?? '',
        persona: cfg?.persona ?? '',
        camadas: new Set((cfg?.camadas ?? '').split(',').filter(Boolean)),
      })
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

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Painel ADM</h1>
          <div className="flex gap-2">
            <Button variant={aba === 'usuarios' ? 'default' : 'outline'} size="sm" onClick={() => setAba('usuarios')}>
              Usuários
            </Button>
            <Button variant={aba === 'auditoria' ? 'default' : 'outline'} size="sm" onClick={() => setAba('auditoria')}>
              Auditoria
            </Button>
          </div>
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}
        {msg && <p className="text-sm text-green-700">{msg}</p>}

        {aba === 'auditoria' && <AuditoriaView emailPorId={emailPorId} />}

        {aba === 'usuarios' && (
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

                    <div className="flex gap-2">
                      <Button size="sm" onClick={salvarEdicao}>Salvar dados/permissões</Button>
                      <Button variant="outline" size="sm" onClick={() => { setEditId(null); setForm(null); setEstr(null) }}>
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
