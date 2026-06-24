import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api, queryStream, type Fonte } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Markdown } from '../components/Markdown'
import { DocumentoPanel } from '../components/DocumentoPanel'

type Mensagem = {
  autor: 'usuario' | 'assistente'
  texto: string
  fontes?: Fonte[]
  camadas?: string[]
  fallback?: boolean
  logId?: number | null
  voto?: number
}

type DocAberto = { nome: string; header: string }

export default function Consulta() {
  const { usuario } = useAuth()
  const podeStream = usuario?.permissoes.includes('consultar_stream') ?? false

  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [pergunta, setPergunta] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [doc, setDoc] = useState<DocAberto | null>(null)
  const fimRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, carregando])

  // Atualiza a última mensagem (a do assistente em curso).
  function patchUltima(patch: Partial<Mensagem>) {
    setMensagens((prev) => {
      const copia = [...prev]
      const i = copia.length - 1
      copia[i] = { ...copia[i], ...patch }
      return copia
    })
  }
  function appendUltima(delta: string) {
    setMensagens((prev) => {
      const copia = [...prev]
      const i = copia.length - 1
      copia[i] = { ...copia[i], texto: copia[i].texto + delta }
      return copia
    })
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const texto = pergunta.trim()
    if (!texto || carregando) return

    setMensagens((m) => [
      ...m,
      { autor: 'usuario', texto },
      { autor: 'assistente', texto: '', fontes: [], camadas: [], fallback: false, logId: null, voto: 0 },
    ])
    setPergunta('')
    setCarregando(true)
    try {
      if (podeStream) {
        await queryStream(
          texto,
          (meta) =>
            patchUltima({
              fontes: meta.fontes,
              camadas: meta.camadas_exibidas,
              fallback: meta.fallback,
              logId: meta.log_id,
            }),
          (delta) => appendUltima(delta),
        )
      } else {
        const r = await api.query(texto)
        patchUltima({
          texto: r.resposta,
          fontes: r.fontes,
          camadas: r.camadas_exibidas,
          fallback: r.fallback,
          logId: r.log_id,
        })
      }
    } catch (err) {
      patchUltima({
        texto: `**Erro:** ${err instanceof Error ? err.message : 'falha na consulta'}`,
        fallback: true,
      })
    } finally {
      setCarregando(false)
    }
  }

  function abrirFonte(f: Fonte) {
    if (f.fonte) setDoc({ nome: f.fonte, header: f.header ?? '' })
  }

  async function votar(idx: number, voto: number) {
    const m = mensagens[idx]
    if (!m.logId) return
    try {
      await api.feedback(m.logId, voto)
      setMensagens((prev) => prev.map((x, i) => (i === idx ? { ...x, voto } : x)))
    } catch {
      /* silencioso: feedback é best-effort */
    }
  }

  return (
    <div className="flex h-full">
      <div className={doc ? 'flex h-full w-1/2 flex-col' : 'flex h-full w-full flex-col'}>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-4 p-4">
            {mensagens.length === 0 && (
              <div className="mt-16 text-center text-muted-foreground">
                <p className="text-lg font-medium text-foreground">Assistente técnico Simplex</p>
                <p className="mt-2 text-sm">
                  Descreva a falha do painel ou cole o código exibido no display.
                </p>
                <p className="mt-4 text-xs">
                  Clique em uma <span className="font-medium">fonte</span> para abrir o guia ao
                  lado, no trecho exato.
                </p>
              </div>
            )}

            {mensagens.map((m, i) =>
              m.autor === 'usuario' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground">
                    {m.texto}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start">
                  <div className="w-full rounded-2xl border bg-card px-4 py-3 shadow-sm">
                    {!m.texto && carregando ? (
                      <p className="text-sm text-muted-foreground">Consultando a base…</p>
                    ) : (
                      <>
                        {m.camadas && m.camadas.length > 0 && (
                          <div className="mb-1 text-xs text-muted-foreground">
                            Camadas exibidas: {m.camadas.join(', ')}
                          </div>
                        )}
                        <Markdown content={m.texto} />
                        {m.fontes && m.fontes.length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-2">
                            <span className="text-xs font-medium text-muted-foreground">Fontes:</span>
                            {m.fontes.map((f, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => abrirFonte(f)}
                                title={`Abrir ${f.fonte ?? 'documento'} no trecho citado`}
                                className="rounded border bg-background px-1.5 py-0.5 text-xs text-primary hover:bg-accent hover:text-accent-foreground"
                              >
                                {f.header ?? f.id} ({f.similaridade.toFixed(2)})
                              </button>
                            ))}
                          </div>
                        )}
                        {m.logId && !m.fallback && (
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => votar(i, 1)}
                              className={`rounded px-1.5 text-sm hover:bg-accent ${m.voto === 1 ? 'opacity-100' : 'opacity-50'}`}
                              title="Resposta útil"
                            >
                              👍
                            </button>
                            <button
                              type="button"
                              onClick={() => votar(i, -1)}
                              className={`rounded px-1.5 text-sm hover:bg-accent ${m.voto === -1 ? 'opacity-100' : 'opacity-50'}`}
                              title="Resposta ruim"
                            >
                              👎
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ),
            )}
            <div ref={fimRef} />
          </div>
        </div>

        <div className="shrink-0 border-t bg-background">
          <form onSubmit={enviar} className="mx-auto flex max-w-3xl gap-2 p-4">
            <Input
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              placeholder="Descreva a falha ou cole o código do display…"
              autoFocus
            />
            <Button type="submit" disabled={carregando || !pergunta.trim()}>
              Enviar
            </Button>
          </form>
        </div>
      </div>

      {doc && (
        <DocumentoPanel nome={doc.nome} alvoHeader={doc.header} onFechar={() => setDoc(null)} />
      )}
    </div>
  )
}
