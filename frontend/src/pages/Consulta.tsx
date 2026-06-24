import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api, type Fonte, type RespostaQuery } from '../lib/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Markdown } from '../components/Markdown'

type Mensagem =
  | { autor: 'usuario'; texto: string }
  | {
      autor: 'assistente'
      texto: string
      fontes: Fonte[]
      camadas: string[]
      fallback: boolean
    }

/** Assistente em formato de chat: histórico rolável + entrada fixa, resposta
 *  renderizada como markdown (dupla camada + aviso de segurança em destaque). */
export default function Consulta() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [pergunta, setPergunta] = useState('')
  const [carregando, setCarregando] = useState(false)
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 p-4">
          {mensagens.length === 0 && (
            <div className="mt-16 text-center text-muted-foreground">
              <p className="text-lg font-medium text-foreground">Assistente técnico Simplex</p>
              <p className="mt-2 text-sm">
                Descreva a falha do painel ou cole o código exibido no display.
              </p>
              <p className="mt-4 text-xs">
                Ex.: “HEAD MISSING no loop do 4100”, “painel apitando, luz vermelha piscando”.
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
                    <div className="mt-3 border-t pt-2 text-xs text-muted-foreground">
                      <span className="font-medium">Fontes: </span>
                      {m.fontes
                        .map((f) => `${f.header} (${f.similaridade.toFixed(2)})`)
                        .join(' · ')}
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
  )
}
