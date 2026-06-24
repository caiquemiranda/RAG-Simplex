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

export type Conversa = {
  id: string
  titulo: string
  mensagens: Mensagem[]
  criadoEm: number
  atualizadoEm: number
}

type EstadoChat = {
  conversas: Conversa[]
  conversaAtivaId: string | null
  mensagens: Mensagem[] // mensagens da conversa ativa (derivado)
  carregando: boolean
  novaConsulta: () => void
  selecionar: (id: string) => void
  excluir: (id: string) => void
  enviar: (texto: string) => Promise<void>
  votar: (indice: number, voto: number) => Promise<void>
}

const ChatContext = createContext<EstadoChat | undefined>(undefined)

const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `c-${Date.now()}-${Math.random().toString(36).slice(2)}`)

function tituloDe(texto: string): string {
  const t = texto.trim().replace(/\s+/g, ' ')
  return t.length > 42 ? `${t.slice(0, 42)}…` : t || 'Nova consulta'
}

/**
 * Mantém o histórico de **consultas** (várias conversas) e executa as buscas
 * acima das rotas — navegar entre abas não perde nada nem aborta o streaming.
 * Persiste por usuário no localStorage (`rag-consultas-<id>`).
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  const podeStream = usuario?.permissoes.includes('consultar_stream') ?? false
  const chave = usuario ? `rag-consultas-${usuario.id}` : null

  const [conversas, setConversas] = useState<Conversa[]>([])
  const [conversaAtivaId, setConversaAtivaId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  // Carrega ao entrar / trocar de usuário.
  useEffect(() => {
    if (!chave) {
      setConversas([])
      setConversaAtivaId(null)
      return
    }
    try {
      const bruto = localStorage.getItem(chave)
      const dados = bruto ? (JSON.parse(bruto) as { conversas: Conversa[]; ativa: string | null }) : null
      setConversas(dados?.conversas ?? [])
      setConversaAtivaId(dados?.ativa ?? null)
    } catch {
      setConversas([])
      setConversaAtivaId(null)
    }
  }, [chave])

  // Persiste a cada mudança (inclui o streaming token a token).
  useEffect(() => {
    if (!chave) return
    try {
      localStorage.setItem(chave, JSON.stringify({ conversas, ativa: conversaAtivaId }))
    } catch {
      /* localStorage cheio/indisponível: ignora */
    }
  }, [chave, conversas, conversaAtivaId])

  const mensagens = conversas.find((c) => c.id === conversaAtivaId)?.mensagens ?? []

  // --- Atualizações endereçadas por id da conversa (não pelo "ativo"), para o
  //     streaming não se perder se o usuário trocar de conversa no meio. ---
  function mapUltima(convId: string, fn: (m: Mensagem) => Mensagem) {
    setConversas((prev) =>
      prev.map((c) => {
        if (c.id !== convId || c.mensagens.length === 0) return c
        const ms = [...c.mensagens]
        ms[ms.length - 1] = fn(ms[ms.length - 1])
        return { ...c, mensagens: ms, atualizadoEm: Date.now() }
      }),
    )
  }

  function novaConsulta() {
    setConversaAtivaId(null)
  }

  function selecionar(id: string) {
    setConversaAtivaId(id)
  }

  function excluir(id: string) {
    setConversas((prev) => prev.filter((c) => c.id !== id))
    setConversaAtivaId((atual) => (atual === id ? null : atual))
  }

  async function enviar(texto: string) {
    const t = texto.trim()
    if (!t || carregando) return

    // Garante uma conversa alvo (cria uma nova se nenhuma estiver ativa).
    const alvoId = conversaAtivaId ?? uid()
    const ehNova = conversaAtivaId === null
    const userMsg: Mensagem = { autor: 'usuario', texto: t }
    const placeholder: Mensagem = {
      autor: 'assistente', texto: '', fontes: [], camadas: [], fallback: false, logId: null, voto: 0,
    }

    setConversas((prev) => {
      const base = ehNova
        ? [{ id: alvoId, titulo: tituloDe(t), mensagens: [], criadoEm: Date.now(), atualizadoEm: Date.now() }, ...prev]
        : prev
      return base.map((c) =>
        c.id === alvoId
          ? { ...c, mensagens: [...c.mensagens, userMsg, placeholder], atualizadoEm: Date.now() }
          : c,
      )
    })
    setConversaAtivaId(alvoId)
    setCarregando(true)

    try {
      if (podeStream) {
        await queryStream(
          t,
          (meta) =>
            mapUltima(alvoId, (m) => ({
              ...m, fontes: meta.fontes, camadas: meta.camadas_exibidas,
              fallback: meta.fallback, logId: meta.log_id,
            })),
          (delta) => mapUltima(alvoId, (m) => ({ ...m, texto: m.texto + delta })),
        )
      } else {
        const r = await api.query(t)
        mapUltima(alvoId, (m) => ({
          ...m, texto: r.resposta, fontes: r.fontes, camadas: r.camadas_exibidas,
          fallback: r.fallback, logId: r.log_id,
        }))
      }
    } catch (err) {
      mapUltima(alvoId, (m) => ({
        ...m, texto: `**Erro:** ${err instanceof Error ? err.message : 'falha na consulta'}`, fallback: true,
      }))
    } finally {
      setCarregando(false)
    }
  }

  async function votar(indice: number, voto: number) {
    const ativa = conversas.find((c) => c.id === conversaAtivaId)
    const m = ativa?.mensagens[indice]
    if (!m?.logId) return
    try {
      await api.feedback(m.logId, voto)
      setConversas((prev) =>
        prev.map((c) =>
          c.id === conversaAtivaId
            ? { ...c, mensagens: c.mensagens.map((x, i) => (i === indice ? { ...x, voto } : x)) }
            : c,
        ),
      )
    } catch {
      /* feedback é best-effort */
    }
  }

  return (
    <ChatContext.Provider
      value={{
        conversas, conversaAtivaId, mensagens, carregando,
        novaConsulta, selecionar, excluir, enviar, votar,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat deve ser usado dentro de <ChatProvider>')
  return ctx
}
