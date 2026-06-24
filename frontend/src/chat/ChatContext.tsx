import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, queryStream, type Fonte } from '../lib/api'
import { useAuth } from '../auth/AuthContext'

export type Mensagem = {
  autor: 'usuario' | 'assistente'
  texto: string
  fontes?: Fonte[]
  camadas?: string[]
  fallback?: boolean
  logId?: number | null
  voto?: number
}

type EstadoChat = {
  mensagens: Mensagem[]
  carregando: boolean
  enviar: (texto: string) => Promise<void>
  votar: (indice: number, voto: number) => Promise<void>
  limpar: () => void
}

const ChatContext = createContext<EstadoChat | undefined>(undefined)

/**
 * Mantém o histórico do chat e executa as buscas **acima das rotas**, para que
 * navegar entre abas não perca o histórico nem aborte uma busca em andamento.
 * O histórico é persistido no localStorage por usuário (sobrevive a reload).
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  const podeStream = usuario?.permissoes.includes('consultar_stream') ?? false
  const chave = usuario ? `rag-historico-${usuario.id}` : null

  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [carregando, setCarregando] = useState(false)

  // Carrega o histórico do usuário ao entrar / trocar de usuário.
  useEffect(() => {
    if (!chave) {
      setMensagens([])
      return
    }
    try {
      const bruto = localStorage.getItem(chave)
      setMensagens(bruto ? (JSON.parse(bruto) as Mensagem[]) : [])
    } catch {
      setMensagens([])
    }
  }, [chave])

  // Persiste a cada mudança (inclui o streaming token a token).
  useEffect(() => {
    if (!chave) return
    try {
      localStorage.setItem(chave, JSON.stringify(mensagens))
    } catch {
      /* localStorage cheio/indisponível: ignora */
    }
  }, [chave, mensagens])

  // Atualiza a última mensagem (a do assistente em curso).
  function patchUltima(patch: Partial<Mensagem>) {
    setMensagens((prev) => {
      const copia = [...prev]
      copia[copia.length - 1] = { ...copia[copia.length - 1], ...patch }
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

  async function enviar(texto: string) {
    const t = texto.trim()
    if (!t || carregando) return
    setMensagens((m) => [
      ...m,
      { autor: 'usuario', texto: t },
      { autor: 'assistente', texto: '', fontes: [], camadas: [], fallback: false, logId: null, voto: 0 },
    ])
    setCarregando(true)
    try {
      if (podeStream) {
        await queryStream(
          t,
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
        const r = await api.query(t)
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

  async function votar(indice: number, voto: number) {
    const m = mensagens[indice]
    if (!m?.logId) return
    try {
      await api.feedback(m.logId, voto)
      setMensagens((prev) => prev.map((x, i) => (i === indice ? { ...x, voto } : x)))
    } catch {
      /* feedback é best-effort */
    }
  }

  function limpar() {
    setMensagens([])
  }

  return (
    <ChatContext.Provider value={{ mensagens, carregando, enviar, votar, limpar }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat deve ser usado dentro de <ChatProvider>')
  return ctx
}
