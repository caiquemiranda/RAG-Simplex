import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, urlArquivo, type AdminCliente, type AdminUsuario, type Falha, type NovaVisita, type VisitaDetalhe } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { FormOS } from '../components/FormOS'
import { IconClose, IconDoc, IconWrench, IconAlert, IconClipboard } from '../components/icons'
import { STATUS_VISITA, TIPO_OS_COR, intervaloData } from '../lib/format'

const STATUS = ['agendada', 'pendente', 'concluida', 'cancelada']

/** Página da atividade (#ATV-1): status, técnicos, galeria de imagens e comentários. */
export default function Atividade() {
  const { id } = useParams()
  const vid = Number(id)
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [atv, setAtv] = useState<VisitaDetalhe | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [zoom, setZoom] = useState<string | null>(null)   // imagem aberta no lightbox
  const fileRef = useRef<HTMLInputElement>(null)

  // Pode gerir = admin ou técnico atribuído (o backend também valida).
  const ehAdmin = usuario?.permissoes.includes('gerir_usuarios') ?? false
  const podeGerir = !!usuario && (ehAdmin || (atv?.tecnicos.some((t) => t.id === usuario.id) ?? false))
  // Edição completa da O.S. (#OS-EDIT-INLINE) — só admin, via FormOS na própria página.
  const [editando, setEditando] = useState(false)
  const [clientes, setClientes] = useState<AdminCliente[]>([])
  const [tecnicos, setTecnicos] = useState<AdminUsuario[]>([])
  const [falhas, setFalhas] = useState<Falha[]>([])

  async function carregar() {
    setErro(null)
    try { setAtv(await api.cronograma.obter(vid)) }
    catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao carregar a atividade') }
  }
  useEffect(() => { carregar() /* eslint-disable-next-line */ }, [vid])
  useEffect(() => {
    if (!ehAdmin) return
    Promise.all([api.admin.clientes(), api.admin.usuarios(), api.admin.falhas()])
      .then(([c, u, f]) => { setClientes(c); setTecnicos(u); setFalhas(f) })
      .catch(() => {})
  }, [ehAdmin])

  async function salvarOS(dados: NovaVisita) {
    await api.cronograma.atualizar(vid, dados)
    carregar()
  }

  async function mudarStatus(status: string) {
    try { await api.cronograma.atualizar(vid, { status }); carregar() }
    catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao mudar status') }
  }
  async function comentar() {
    if (!texto.trim()) return
    try { setAtv(await api.cronograma.comentar(vid, texto.trim())); setTexto('') }
    catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao comentar') }
  }
  async function anexar(file: File) {
    try { setAtv(await api.cronograma.anexar(vid, file)) }
    catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao anexar') }
  }
  async function removerAnexo(anexoId: number) {
    try { setAtv(await api.cronograma.removerAnexo(vid, anexoId)) }
    catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao remover anexo') }
  }

  if (erro && !atv) return <div className="p-6"><p className="text-sm text-destructive">{erro}</p><Link to="/cronograma" className="text-sm text-primary hover:underline">← Voltar ao cronograma</Link></div>
  if (!atv) return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      {/* Cascata Cronograma → Cliente → Atividade */}
      <nav className="text-xs text-muted-foreground">
        <Link to="/cronograma" className="hover:underline">Cronograma</Link>
        <span className="mx-1">/</span>
        {atv.cliente_id
          ? <Link to={`/relatorios/${atv.cliente_id}`} className="hover:underline">{atv.cliente_nome}</Link>
          : <span>{atv.cliente_nome ?? 'Sem cliente'}</span>}
        <span className="mx-1">/</span>
        <span className="text-foreground">{atv.titulo}</span>
      </nav>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{atv.titulo}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{intervaloData(atv.data, atv.data_fim)}{atv.cliente_nome ? ` · ${atv.cliente_nome}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            {ehAdmin && <Button size="sm" variant="outline" onClick={() => setEditando(true)}>Editar O.S.</Button>}
            {podeGerir ? (
              <select className="h-9 rounded-md border bg-background px-2 text-sm" value={atv.status} onChange={(e) => mudarStatus(e.target.value)}>
                {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_VISITA[atv.status] ?? ''}`}>{atv.status}</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Tipo / equipamento / falha / lista (#OS) */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-2 py-0.5 ${TIPO_OS_COR[atv.tipo] ?? 'bg-muted'}`}>{atv.tipo}</span>
            {atv.equipamento_tag && <span className="inline-flex items-center gap-1 text-muted-foreground"><IconWrench className="h-3 w-3" /> {atv.equipamento_tag}</span>}
            {atv.falha_nome && <span className="inline-flex items-center gap-1 text-muted-foreground"><IconAlert className="h-3 w-3" /> {atv.falha_nome}</span>}
            {atv.lista_nome && <span className="inline-flex items-center gap-1 text-muted-foreground"><IconClipboard className="h-3 w-3" /> {atv.lista_nome}</span>}
            {atv.tipo === 'preventiva' && atv.lista_id != null && (
              <button className="inline-flex min-h-[44px] items-center gap-1 rounded-md border px-2 text-primary hover:bg-accent"
                      onClick={() => navigate(`/preventiva/${atv.lista_id}`)}><IconDoc className="h-3.5 w-3.5" /> Gerar documento de preventiva</button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Técnicos:</span>
            {atv.tecnicos.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                <Avatar nome={t.nome} fotoUrl={t.foto ?? undefined} className="h-5 w-5 text-[9px]" /> {t.nome}
              </span>
            ))}
          </div>
          {atv.observacoes && <p className="text-sm"><span className="text-muted-foreground">Observações:</span> {atv.observacoes}</p>}
        </CardContent>
      </Card>

      {/* Galeria de imagens */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Imagens ({atv.anexos.length})</CardTitle>
          {podeGerir && (
            <>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                     onChange={(e) => { const f = e.target.files?.[0]; if (f) anexar(f); e.target.value = '' }} />
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>Anexar imagem</Button>
            </>
          )}
        </CardHeader>
        <CardContent>
          {atv.anexos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma imagem anexada.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {atv.anexos.map((a) => (
                <div key={a.id} className="group relative overflow-hidden rounded-lg border">
                  <button type="button" className="block w-full" onClick={() => setZoom(urlArquivo(a.url))} title="Ampliar">
                    <img src={urlArquivo(a.url)} alt={a.nome} className="h-32 w-full object-cover" />
                  </button>
                  {podeGerir && (
                    <button className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white opacity-0 group-hover:opacity-100"
                            title="Remover" onClick={() => removerAnexo(a.id)}><IconClose /></button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comentários */}
      <Card>
        <CardHeader><CardTitle className="text-base">Comentários ({atv.comentarios.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {atv.comentarios.map((c) => (
            <div key={c.id} className="rounded-md border bg-muted/30 p-2">
              <div className="text-xs text-muted-foreground">{c.autor_nome ?? 'Alguém'} · {new Date(c.criado_em).toLocaleString('pt-BR')}</div>
              <div className="whitespace-pre-wrap text-sm">{c.texto}</div>
            </div>
          ))}
          {atv.comentarios.length === 0 && <p className="text-sm text-muted-foreground">Sem comentários ainda.</p>}
          {podeGerir && (
            <div className="flex gap-2">
              <textarea className="min-h-[40px] flex-1 rounded-md border bg-background px-3 py-2 text-sm" value={texto}
                        onChange={(e) => setTexto(e.target.value)} aria-label="Escrever comentário" placeholder="Escreva um comentário…" />
              <Button size="sm" onClick={comentar} disabled={!texto.trim()}>Enviar</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edição completa da O.S. na própria página (#OS-EDIT-INLINE) */}
      {editando && ehAdmin && (
        <FormOS
          clientes={clientes} tecnicos={tecnicos} falhas={falhas} inicial={atv}
          aoSalvar={salvarOS} aoFechar={() => setEditando(false)}
        />
      )}

      {/* Lightbox: imagem ampliada na mesma página, com X para fechar. */}
      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setZoom(null)}>
          <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={() => setZoom(null)} aria-label="Fechar"><IconClose className="h-5 w-5" /></button>
          <img src={zoom} alt="" className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
