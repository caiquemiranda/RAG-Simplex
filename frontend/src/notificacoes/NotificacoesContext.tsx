import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type Notificacao } from '../lib/api'
import { useAuth } from '../auth/AuthContext'

type Estado = {
  itens: Notificacao[]
  naoLidas: number
  recarregar: () => void
  marcarLida: (id: number) => Promise<void>
  marcarTodas: () => Promise<void>
}

const NotificacoesContext = createContext<Estado>({
  itens: [], naoLidas: 0, recarregar: () => {}, marcarLida: async () => {}, marcarTodas: async () => {},
})

/** Carrega as notificações do usuário e atualiza o badge (poll a cada 60s). */
export function NotificacoesProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  const [itens, setItens] = useState<Notificacao[]>([])

  const recarregar = useCallback(() => {
    if (!usuario) { setItens([]); return }
    api.notificacoes.listar().then(setItens).catch(() => {})
  }, [usuario])

  useEffect(() => {
    recarregar()
    if (!usuario) return
    const t = setInterval(recarregar, 60_000)
    return () => clearInterval(t)
  }, [recarregar, usuario])

  const naoLidas = itens.filter((n) => !n.lida).length

  async function marcarLida(id: number) {
    await api.notificacoes.marcarLida(id)
    recarregar()
  }
  async function marcarTodas() {
    await api.notificacoes.marcarTodas()
    recarregar()
  }

  return (
    <NotificacoesContext.Provider value={{ itens, naoLidas, recarregar, marcarLida, marcarTodas }}>
      {children}
    </NotificacoesContext.Provider>
  )
}

export const useNotificacoes = () => useContext(NotificacoesContext)
