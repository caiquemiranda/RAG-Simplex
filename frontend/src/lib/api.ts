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
  log_id: number | null
}

export type MetaStream = {
  tipo: 'meta'
  log_id: number | null
  fallback: boolean
  camadas_exibidas: string[]
  fontes: Fonte[]
}

export type Documento = {
  nome: string
  conteudo: string
}

export type AdminUsuario = {
  id: number
  email: string
  nome: string
  ativo: boolean
  papel: string | null
  permissoes_extra: string[]
}

export type AdminPapel = { nome: string; permissoes: string[] }
export type AdminPermissao = { chave: string; descricao: string }

export type NovoUsuario = { email: string; senha: string; nome?: string; papel?: string | null }
export type AtualizaUsuario = {
  nome?: string
  ativo?: boolean
  papel?: string | null
  senha?: string
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

/** Consome /query/stream (NDJSON): chama `onMeta` uma vez e `onDelta` por pedaço. */
export async function queryStream(
  pergunta: string,
  onMeta: (m: MetaStream) => void,
  onDelta: (texto: string) => void,
): Promise<void> {
  const token = getToken()
  const res = await fetch(`${BASE}/query/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ pergunta }),
  })
  if (!res.ok || !res.body) {
    let detalhe = res.statusText
    try {
      detalhe = (await res.json()).detail ?? detalhe
    } catch {
      /* sem JSON */
    }
    throw new Error(detalhe)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const processar = (linha: string) => {
    const t = linha.trim()
    if (!t) return
    const evt = JSON.parse(t)
    if (evt.tipo === 'meta') onMeta(evt as MetaStream)
    else if (evt.tipo === 'delta') onDelta(evt.texto as string)
  }

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let nl: number
    while ((nl = buffer.indexOf('\n')) >= 0) {
      processar(buffer.slice(0, nl))
      buffer = buffer.slice(nl + 1)
    }
  }
  processar(buffer)
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
  feedback: (log_id: number, voto: number) =>
    request<{ ok: boolean }>('/feedback', {
      method: 'POST',
      body: JSON.stringify({ log_id, voto }),
    }),
  documentos: () => request<string[]>('/documentos'),
  documento: (nome: string) => request<Documento>(`/documentos/${encodeURIComponent(nome)}`),

  admin: {
    usuarios: () => request<AdminUsuario[]>('/admin/usuarios'),
    criarUsuario: (dados: NovoUsuario) =>
      request<AdminUsuario>('/admin/usuarios', { method: 'POST', body: JSON.stringify(dados) }),
    atualizarUsuario: (id: number, dados: AtualizaUsuario) =>
      request<AdminUsuario>(`/admin/usuarios/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dados),
      }),
    definirPermissoesExtra: (id: number, permissoes: string[]) =>
      request<AdminUsuario>(`/admin/usuarios/${id}/permissoes-extra`, {
        method: 'PUT',
        body: JSON.stringify({ permissoes }),
      }),
    papeis: () => request<AdminPapel[]>('/admin/papeis'),
    permissoes: () => request<AdminPermissao[]>('/admin/permissoes'),
  },
}
