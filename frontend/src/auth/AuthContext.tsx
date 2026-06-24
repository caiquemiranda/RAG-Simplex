import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, getToken, setToken, type Usuario } from '../lib/api'

type EstadoAuth = {
  usuario: Usuario | null
  carregando: boolean
  entrar: (email: string, senha: string) => Promise<void>
  sair: () => void
}

const AuthContext = createContext<EstadoAuth | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      setCarregando(false)
      return
    }
    api
      .me()
      .then(setUsuario)
      .catch(() => setToken(null))
      .finally(() => setCarregando(false))
  }, [])

  async function entrar(email: string, senha: string) {
    const { access_token } = await api.login(email, senha)
    setToken(access_token)
    setUsuario(await api.me())
  }

  function sair() {
    setToken(null)
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
