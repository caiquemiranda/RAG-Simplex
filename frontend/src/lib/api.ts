// Cliente HTTP da API FastAPI. O token JWT fica no localStorage e é enviado
// como Bearer em cada requisição.

const BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

export type Usuario = {
  id: number
  email: string
  nome: string
  papel: string | null
  permissoes: string[]
}

export type Fonte = {
  id: string
  header: string | null
  sistema: string | null
  severidade: string | null
  similaridade: number
  fonte: string | null
  trecho: string | null
}

export type RespostaQuery = {
  pergunta: string
  resposta: string
  fallback: boolean
  fontes: Fonte[]
  camadas_exibidas: string[]
}

const TOKEN_KEY = 'rag_simplex_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    let detalhe = res.statusText
    try {
      const corpo = await res.json()
      detalhe = corpo.detail ?? detalhe
    } catch {
      /* resposta sem JSON */
    }
    throw new Error(detalhe)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

export const api = {
  login: (email: string, senha: string) =>
    request<{ access_token: string; refresh_token?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    }),
  me: () => request<Usuario>('/auth/me'),
  query: (pergunta: string, persona?: string) =>
    request<RespostaQuery>('/query', {
      method: 'POST',
      body: JSON.stringify({ pergunta, persona }),
    }),
}
