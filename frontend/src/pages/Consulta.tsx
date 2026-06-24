import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api, type Fonte, type RespostaQuery } from '../lib/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Markdown } from '../components/Markdown'
import { DocumentoPanel } from '../components/DocumentoPanel'

type Mensagem =
  | { autor: 'usuario'; texto: string }
  | {
      autor: 'assistente'
      texto: string
      fontes: Fonte[]
      camadas: string[]
      fallback: boolean
    }

type DocAberto = { nome: string; header: string }

/** Assistente em chat + painel lateral do documento citado (split screen). */
export default function Consulta() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [pergunta, setPergunta] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [doc, setDoc] = useState<DocAberto | null>(null)
  const fimRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, carregando])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const texto = pergunta.trim()
    if (!texto || carregando) return

    setMensagens((m) => [...m, { autor: 'usuario', texto }])
    setPergunta('')
    setCarregando(true)
    try {
      const r: RespostaQuery = await api.query(texto)
      setMensagens((m) => [
        ...m,
        {
          autor: 'assistente',
          texto: r.resposta,
          fontes: r.fontes,
          camadas: r.camadas_exibidas,
          fallback: r.fallback,
        },
      ])
    } catch (err) {
      setMensagens((m) => [
        ...m,
        {
          autor: 'assistente',
          texto: `**Erro:** ${err instanceof Error ? err.message : 'falha na consulta'}`,
          fontes: [],
          camadas: [],
          fallback: true,
        },
      ])
    } finally {
      setCarregando(false)
    }
  }

  function abrirFonte(f: Fonte) {
    if (f.fonte) setDoc({ nome: f.fonte, header: f.header ?? '' })
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
                    {m.camadas.length > 0 && (
                      <div className="mb-1 text-xs text-muted-foreground">
                        Camadas exibidas: {m.camadas.join(', ')}
                      </div>
                    )}
                    <Markdown content={m.texto} />
                    {m.fontes.length > 0 && (
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
                  </div>
                </div>
              ),
            )}

            {carregando && (
              <div className="flex justify-start">
                <div className="rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground">
                  Consultando a base…
                </div>
              </div>
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
