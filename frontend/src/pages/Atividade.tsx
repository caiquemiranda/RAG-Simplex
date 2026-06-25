import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, urlArquivo, type VisitaDetalhe } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { STATUS_VISITA } from '../lib/format'

const STATUS = ['agendada', 'concluida', 'cancelada']

/** Página da atividade (#ATV-1): status, técnicos, galeria de imagens e comentários. */
export default function Atividade() {
  const { id } = useParams()
  const vid = Number(id)
  const { usuario } = useAuth()
  const [atv, setAtv] = useState<VisitaDetalhe | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Pode gerir = admin ou técnico atribuído (o backend também valida).
  const podeGerir = !!usuario && (usuario.permissoes.includes('gerir_usuarios') || (atv?.tecnicos.some((t) => t.id === usuario.id) ?? false))

  async function carregar() {
    setErro(null)
    try { setAtv(await api.cronograma.obter(vid)) }
    catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao carregar a atividade') }
  }
  useEffect(() => { carregar() /* eslint-disable-next-line */ }, [vid])

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
            <p className="mt-1 text-sm text-muted-foreground">📅 {atv.data}{atv.cliente_nome ? ` · 📍 ${atv.cliente_nome}` : ''}</p>
          </div>
          {podeGerir ? (
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={atv.status} onChange={(e) => mudarStatus(e.target.value)}>
              {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_VISITA[atv.status] ?? ''}`}>{atv.status}</span>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
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
                  <a href={urlArquivo(a.url)} target="_blank" rel="noreferrer">
                    <img src={urlArquivo(a.url)} alt={a.nome} className="h-32 w-full object-cover" />
                  </a>
                  {podeGerir && (
                    <button className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white opacity-0 group-hover:opacity-100"
                            title="Remover" onClick={() => removerAnexo(a.id)}>✕</button>
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
                        onChange={(e) => setTexto(e.target.value)} placeholder="Escreva um comentário…" />
              <Button size="sm" onClick={comentar} disabled={!texto.trim()}>Enviar</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
