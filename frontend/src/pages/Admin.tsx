import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  api,
  uploadArquivo,
  type AdminCliente,
  type AdminUnidade,
  type BancoStatus,
  type AdminPapel,
  type AdminPermissao,
  type AdminProvedor,
  type AdminUsuario,
  type DocumentoTecnico,
  type Falha,
} from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { AuditoriaView } from '../components/AuditoriaView'
import { Avatar } from '../components/Avatar'
import { IconUser, IconKey, IconDatabase, IconBuilding, IconAlert, IconClipboard, IconClose, IconMonitor, IconWrench, IconEye, IconEyeOff } from '../components/icons'
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
  unidadeId: number | ''
  clienteIds: Set<number>
  clientePadraoId: number | ''
  observacoes: string
  acesso_expira_em: string
}
type Secao = null | 'usuarios' | 'auditoria' | 'apikeys' | 'banco' | 'clientes' | 'falhas'

const CAMADAS = ['simples', 'tecnica']

/** Formata bytes em KB/MB legível (ex.: 131072 → "128 KB"). */
function formatarBytes(n: number | null): string {
  if (n == null) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

const CARDS: { chave: Exclude<Secao, null>; titulo: string; desc: string; icone: ReactNode }[] = [
  { chave: 'usuarios', titulo: 'Gerenciar usuários', desc: 'Criar/editar usuários, papéis e permissões.', icone: <IconUser className="h-8 w-8" /> },
  { chave: 'apikeys', titulo: 'Gerenciar API keys', desc: 'Chaves de provedores para integrações.', icone: <IconKey className="h-8 w-8" /> },
  { chave: 'banco', titulo: 'Banco de dados', desc: 'Gerenciar bancos de dados do sistema.', icone: <IconDatabase className="h-8 w-8" /> },
  { chave: 'clientes', titulo: 'Clientes e unidades', desc: 'Clientes, unidades (bases) e quais técnicos têm acesso.', icone: <IconBuilding className="h-8 w-8" /> },
  { chave: 'falhas', titulo: 'Catálogo de falhas', desc: 'Falhas do painel (No Answer, Dirty…) usadas nas O.S.', icone: <IconAlert className="h-8 w-8" /> },
  { chave: 'auditoria', titulo: 'Auditoria', desc: 'Histórico de consultas e feedback.', icone: <IconClipboard className="h-8 w-8" /> },
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
  const [novoCliente, setNovoCliente] = useState({ nome: '', unidade: '', cor: '#16C0CC', unidadeId: '' as number | '' })
  const [unidades, setUnidades] = useState<AdminUnidade[]>([])
  const [novaUnidade, setNovaUnidade] = useState({ nome: '', cidade: '' })
  const [falhas, setFalhas] = useState<Falha[]>([])
  const [novaFalha, setNovaFalha] = useState({ nome: '', termo_en: '' })
  const [banco, setBanco] = useState<BancoStatus | null>(null)
  const [backupMsg, setBackupMsg] = useState<string | null>(null)
  const [provedores, setProvedores] = useState<AdminProvedor[]>([])
  const [novoProv, setNovoProv] = useState({ nome: '', api_key: '', ativo: true })
  const corDefault = '#16C0CC'
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
      const [us, ps, pms, es, cs, uns, fs] = await Promise.all([
        api.admin.usuarios(),
        api.admin.papeis(),
        api.admin.permissoes(),
        api.admin.estrategias(),
        api.admin.clientes(),
        api.admin.unidades(),
        api.admin.falhas(),
      ])
      setUsuarios(us)
      setPapeis(ps)
      setPermissoes(pms)
      setEstrategias(es)
      setClientes(cs)
      setUnidades(uns)
      setFalhas(fs)
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

  // Carrega o status do banco ao abrir o card (consulta mais pesada — sob demanda).
  useEffect(() => {
    if (secao === 'banco') {
      setBackupMsg(null)
      api.admin.banco().then(setBanco).catch((e) => setErro(e instanceof Error ? e.message : 'Falha ao ler o banco'))
    }
  }, [secao])

  async function fazerBackup() {
    setErro(null); setBackupMsg(null)
    try {
      const r = await api.admin.bancoBackup()
      setBackupMsg(`Backup criado: ${r.arquivo} (${formatarBytes(r.tamanho_bytes)}).`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao fazer backup')
    }
  }

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
        unidadeId: det.unidade_id ?? '',
        clienteIds: new Set(det.clientes.map((c) => c.id)),
        clientePadraoId: det.cliente_padrao_id ?? '',
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
        unidade_id: perfil ? (perfil.unidadeId === '' ? null : perfil.unidadeId) : undefined,
        cliente_ids: perfil ? Array.from(perfil.clienteIds) : undefined,
        cliente_padrao_id: perfil ? (perfil.clientePadraoId === '' ? null : perfil.clientePadraoId) : undefined,
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

  async function onFoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErro(null)
    try {
      const { url } = await uploadArquivo(file, 'usuarios')   // grava a URL, não o data URL (banco leve)
      setPerfil((p) => (p ? { ...p, foto_url: url } : p))
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao enviar a foto')
    }
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
      await api.admin.criarCliente({
        nome: novoCliente.nome.trim(), unidade: novoCliente.unidade || null, cor: novoCliente.cor,
        unidade_id: novoCliente.unidadeId === '' ? null : novoCliente.unidadeId,
      })
      setNovoCliente({ nome: '', unidade: '', cor: corDefault, unidadeId: '' })
      setClientes(await api.admin.clientes())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao criar cliente')
    }
  }

  async function patchCliente(c: AdminCliente, dados: { ativo?: boolean; cor?: string; logo_url?: string; unidade_id?: number | null }) {
    try {
      await api.admin.atualizarCliente(c.id, dados)
      setClientes(await api.admin.clientes())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao atualizar cliente')
    }
  }

  // --- Unidades (D-021) ---
  async function criarUnidade() {
    if (!novaUnidade.nome.trim()) return
    setErro(null)
    try {
      await api.admin.criarUnidade({ nome: novaUnidade.nome.trim(), cidade: novaUnidade.cidade || null })
      setNovaUnidade({ nome: '', cidade: '' })
      setUnidades(await api.admin.unidades())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao criar unidade')
    }
  }

  async function removerUnidade(u: AdminUnidade) {
    setErro(null)
    try {
      await api.admin.removerUnidade(u.id)
      setUnidades(await api.admin.unidades())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao remover unidade')
    }
  }

  // --- Catálogo de falhas (#OS, D-025) ---
  async function criarFalha() {
    if (!novaFalha.nome.trim()) return
    setErro(null)
    try {
      await api.admin.criarFalha({ nome: novaFalha.nome.trim(), termo_en: novaFalha.termo_en.trim() || null })
      setNovaFalha({ nome: '', termo_en: '' })
      setFalhas(await api.admin.falhas())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao criar falha')
    }
  }

  async function removerFalha(f: Falha) {
    setErro(null)
    try {
      await api.admin.removerFalha(f.id)
      setFalhas(await api.admin.falhas())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao remover falha')
    }
  }

  async function uploadLogoCliente(c: AdminCliente, file: File) {
    setErro(null)
    try {
      const { url } = await uploadArquivo(file, 'clientes')
      await patchCliente(c, { logo_url: url })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao enviar o logo')
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
                <span className="text-primary">{c.icone}</span>
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
                    A chave é armazenada <strong>cifrada</strong> e nunca retornada em claro (só mascarada). Uso real na <strong>Fase 10</strong> (estratégias de nuvem).
                  </p>
                </CardContent>
              </Card>
            </div>
          )
        )}
        {secao === 'banco' && (
          <div className="space-y-4">
            {backupMsg && <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">{backupMsg}</p>}
            {!banco ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando status do banco…</CardContent></Card>
            ) : (
              <>
                <Card>
                  <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <div className="text-sm"><span className="text-muted-foreground">Backend:</span> <strong>{banco.backend}</strong></div>
                    <div className="text-sm"><span className="text-muted-foreground">Tamanho:</span> <strong>{formatarBytes(banco.tamanho_bytes)}</strong></div>
                    <div className="truncate text-sm sm:col-span-2"><span className="text-muted-foreground">Arquivo:</span> <span className="font-mono text-xs">{banco.caminho ?? '—'}</span></div>
                    <div className="text-sm"><span className="text-muted-foreground">Blocos indexados (Chroma):</span> <strong>{banco.blocos_indexados}</strong></div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Migração:</span>{' '}
                      {banco.migracao.em_dia
                        ? <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">em dia</span>
                        : <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">pendente</span>}
                      <span className="ml-2 font-mono text-xs text-muted-foreground">{banco.migracao.revisao_atual ?? '—'} → {banco.migracao.revisao_head ?? '—'}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Tabelas</CardTitle></CardHeader>
                  <CardContent className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                    {banco.tabelas.map((t) => (
                      <div key={t.nome} className="flex justify-between border-b py-1 text-sm">
                        <span className="font-mono text-xs">{t.nome}</span>
                        <span className="text-muted-foreground">{t.linhas}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-3 p-4">
                    <Button size="sm" onClick={fazerBackup} disabled={banco.backend !== 'sqlite'}>Fazer backup</Button>
                    <span className="text-xs text-muted-foreground">
                      Cópia do arquivo SQLite para <span className="font-mono">data/processed/backups/</span>.
                      Reindexação do guia: use <strong>POST /ingest</strong> (permissão <code>ingerir</code>).
                    </span>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
        {secao === 'clientes' && (
          <div className="space-y-4">
            {/* Unidades (D-021) — base/regional para a "visão por unidade" do cronograma. */}
            <Card>
              <CardHeader><CardTitle className="text-base">Unidades (bases/regionais)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1"><Label>Nome</Label><Input value={novaUnidade.nome} onChange={(e) => setNovaUnidade({ ...novaUnidade, nome: e.target.value })} placeholder="Filial SP" /></div>
                  <div className="space-y-1"><Label>Cidade</Label><Input value={novaUnidade.cidade} onChange={(e) => setNovaUnidade({ ...novaUnidade, cidade: e.target.value })} /></div>
                  <Button size="sm" onClick={criarUnidade} disabled={!novaUnidade.nome.trim()}>Adicionar unidade</Button>
                </div>
                {unidades.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {unidades.map((u) => (
                      <span key={u.id} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
                        <span className="font-medium">{u.nome}</span>
                        {u.cidade && <span className="text-muted-foreground">· {u.cidade}</span>}
                        <button className="p-1 text-destructive hover:underline" title="Remover unidade" aria-label="Remover unidade" onClick={() => removerUnidade(u)}><IconClose className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                ) : <p className="text-xs text-muted-foreground">Nenhuma unidade cadastrada. Cadastre para agrupar o cronograma por base.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Novo cliente</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap items-end gap-3">
                <div className="space-y-1"><Label>Nome</Label><Input value={novoCliente.nome} onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })} /></div>
                <div className="space-y-1">
                  <Label>Unidade</Label>
                  <select className="h-10 rounded-md border bg-background px-2 text-sm"
                          value={novoCliente.unidadeId}
                          onChange={(e) => setNovoCliente({ ...novoCliente, unidadeId: e.target.value ? Number(e.target.value) : '' })}>
                    <option value="">— sem unidade —</option>
                    {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Cor</Label>
                  <input type="color" value={novoCliente.cor} onChange={(e) => setNovoCliente({ ...novoCliente, cor: e.target.value })} className="h-10 w-12 cursor-pointer rounded border" />
                </div>
                <Button size="sm" onClick={criarCliente} disabled={!novoCliente.nome.trim()}>Adicionar</Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="divide-y p-2">
                {clientes.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 py-2">
                    <Avatar nome={c.nome} fotoUrl={c.logo_url} cor={c.cor} className="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/admin/cliente/${c.id}`} className="truncate text-sm font-medium text-primary hover:underline">{c.nome}</Link>
                      <div className="truncate text-xs text-muted-foreground">{c.unidade_nome ?? c.unidade ?? '—'}{!c.ativo && ' · inativo'}</div>
                    </div>
                    <select className="h-8 rounded-md border bg-background px-1 text-xs" title="Unidade do cliente"
                            value={c.unidade_id ?? ''}
                            onChange={(e) => patchCliente(c, { unidade_id: e.target.value ? Number(e.target.value) : null })}>
                      <option value="">— unidade —</option>
                      {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </select>
                    <input type="color" value={c.cor ?? corDefault} onChange={(e) => patchCliente(c, { cor: e.target.value })} title="Cor do cliente" className="h-8 w-8 cursor-pointer rounded border" />
                    <label className="cursor-pointer text-xs text-primary hover:underline" title="Enviar logo">
                      logo
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogoCliente(c, f) }} />
                    </label>
                    <button className="text-xs text-muted-foreground hover:underline" onClick={() => patchCliente(c, { ativo: !c.ativo })}>{c.ativo ? 'ativo' : 'inativo'}</button>
                    <Button variant="outline" size="sm" onClick={() => removerCliente(c)}>Remover</Button>
                  </div>
                ))}
                {clientes.length === 0 && <p className="py-3 text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>}
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">
              A <strong>cor</strong> e o <strong>logo</strong> do cliente são usados onde ele aparece
              (relatórios, calendário). Os <strong>técnicos com acesso</strong> são definidos na
              edição do usuário (Perfil e gestão → Clientes atendidos).
            </p>
          </div>
        )}

        {secao === 'falhas' && (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Nova falha</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap items-end gap-3">
                <div className="space-y-1"><Label>Nome</Label><Input value={novaFalha.nome} onChange={(e) => setNovaFalha({ ...novaFalha, nome: e.target.value })} placeholder="Cabeçote ausente" /></div>
                <div className="space-y-1"><Label>Termo no painel (EN)</Label><Input value={novaFalha.termo_en} onChange={(e) => setNovaFalha({ ...novaFalha, termo_en: e.target.value })} placeholder="HEAD MISSING" /></div>
                <Button size="sm" onClick={criarFalha} disabled={!novaFalha.nome.trim()}>Adicionar falha</Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="divide-y p-2">
                {falhas.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{f.nome}</div>
                      {f.termo_en && <div className="inline-flex items-center gap-1 truncate text-xs text-muted-foreground"><IconMonitor className="h-3 w-3" /> {f.termo_en}</div>}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => removerFalha(f)}>Remover</Button>
                  </div>
                ))}
                {falhas.length === 0 && <p className="py-3 text-sm text-muted-foreground">Nenhuma falha cadastrada. Cadastre para classificar as O.S.</p>}
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">
              As falhas aparecem na criação/edição de <strong>Ordens de Serviço</strong>. O <strong>termo no painel</strong>
              (em inglês, ex.: <code>HEAD MISSING</code>) é preservado como aparece no display Simplex.
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
                          <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'} title={verSenha ? 'Ocultar' : 'Mostrar'} onClick={() => setVerSenha((v) => !v)}>
                            {verSenha ? <IconEyeOff /> : <IconEye />}
                          </button>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 self-end text-sm">
                        <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
                        Ativo
                      </label>
                      <div className="space-y-1">
                        <Label>Unidade (base)</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                value={perfil.unidadeId}
                                onChange={(e) => setPerfil({ ...perfil, unidadeId: e.target.value ? Number(e.target.value) : '' })}>
                          <option value="">— sem unidade —</option>
                          {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1"><Label>Validade do acesso</Label><Input type="date" value={perfil.acesso_expira_em} onChange={(e) => setPerfil({ ...perfil, acesso_expira_em: e.target.value })} /></div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label>Cliente fixo (padrão no cronograma)</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                value={perfil.clientePadraoId}
                                onChange={(e) => setPerfil({ ...perfil, clientePadraoId: e.target.value ? Number(e.target.value) : '' })}>
                          <option value="">— nenhum —</option>
                          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                      </div>
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
                  return venc > 0 ? <p className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300"><IconAlert className="h-3.5 w-3.5" /> {venc} documento(s) vencido(s) ou vencendo em até 30 dias — providenciar renovação.</p> : null
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
                        {c === 'simples'
                          ? <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> simples</span>
                          : <span className="inline-flex items-center gap-1"><IconWrench className="h-3.5 w-3.5" /> técnica</span>}
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
                            <IconAlert className="mr-0.5 inline h-3 w-3" />{u.docs_alerta} doc.
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
