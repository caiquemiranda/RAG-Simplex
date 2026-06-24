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
  cargo: string | null
  foto_url: string | null
  docs_alerta: number
  permissoes_extra: string[]
}

export type DocumentoTecnico = { id: number; nome: string; validade: string | null }
export type AdminCliente = {
  id: number
  nome: string
  unidade: string | null
  ativo: boolean
  cor: string | null
  logo_url: string | null
}
export type ClienteEntrada = { nome?: string; unidade?: string | null; ativo?: boolean; cor?: string | null; logo_url?: string | null }
export type ClienteVisivel = { id: number; nome: string; unidade: string | null; cor: string | null; logo_url: string | null }

export type Visita = {
  id: number
  usuario_id: number
  tecnico_nome: string
  tecnico_foto: string | null
  cliente_id: number | null
  cliente_nome: string | null
  cliente_cor: string | null
  cliente_logo: string | null
  unidade: string | null
  data: string
  titulo: string
  status: string
  observacoes: string | null
}
export type NovaVisita = {
  usuario_id: number
  cliente_id?: number | null
  data: string
  titulo: string
  status?: string
  observacoes?: string | null
}
export type Feriado = { id: number; data: string; descricao: string }
export type Notificacao = {
  id: number
  tipo: string
  titulo: string
  texto: string | null
  ref_id: number | null
  lida: boolean
  criado_em: string
}

export type AdminUsuarioDetalhe = AdminUsuario & {
  foto_url: string | null
  telefone: string | null
  cargo: string | null
  unidade: string | null
  clientes: AdminCliente[]
  observacoes: string | null
  acesso_expira_em: string | null
  documentos: DocumentoTecnico[]
}

export type AdminPapel = { nome: string; permissoes: string[] }
export type AdminPermissao = { chave: string; descricao: string }
export type AdminProvedor = {
  nome: string
  ativo: boolean
  tem_chave: boolean
  chave_mascarada: string | null
}

export type AdminConfig = {
  escopo: string
  alvo: string | null
  estrategia: string
  persona: string | null
  camadas: string | null
}

export type AdminAuditoria = {
  id: number
  usuario_id: number | null
  pergunta: string
  estrategia: string
  latencia_ms: number | null
  fallback: boolean
  feedback: number | null
  criado_em: string
}

export type ConfigUsuarioIn = {
  estrategia?: string | null
  persona?: string | null
  camadas?: string[] | null
}

export type NovoUsuario = { email: string; senha: string; nome?: string; papel?: string | null }
export type AtualizaUsuario = {
  nome?: string
  ativo?: boolean
  papel?: string | null
  senha?: string
  foto_url?: string | null
  telefone?: string | null
  cargo?: string | null
  unidade?: string | null
  cliente_ids?: number[]
  observacoes?: string | null
  acesso_expira_em?: string | null
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

/** Sobe um arquivo (multipart) e devolve a URL pública `/arquivos/…`. Só admin. */
export async function uploadArquivo(file: File, subpasta = ''): Promise<{ url: string; nome_original: string }> {
  const token = getToken()
  const fd = new FormData()
  fd.append('arquivo', file)
  if (subpasta) fd.append('subpasta', subpasta)
  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  if (!res.ok) {
    let detalhe = res.statusText
    try {
      detalhe = (await res.json()).detail ?? detalhe
    } catch {
      /* sem JSON */
    }
    throw new Error(detalhe)
  }
  return res.json()
}

export const api = {
  login: (email: string, senha: string) =>
    request<{ access_token: string; refresh_token?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    }),
  me: () => request<Usuario>('/auth/me'),
  meusDocumentos: () => request<DocumentoTecnico[]>('/me/documentos'),
  clientesVisiveis: () => request<ClienteVisivel[]>('/clientes'),
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
    obterUsuario: (id: number) => request<AdminUsuarioDetalhe>(`/admin/usuarios/${id}`),
    criarUsuario: (dados: NovoUsuario) =>
      request<AdminUsuario>('/admin/usuarios', { method: 'POST', body: JSON.stringify(dados) }),
    atualizarUsuario: (id: number, dados: AtualizaUsuario) =>
      request<AdminUsuarioDetalhe>(`/admin/usuarios/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dados),
      }),
    adicionarDocumento: (id: number, dados: { nome: string; validade: string | null }) =>
      request<AdminUsuarioDetalhe>(`/admin/usuarios/${id}/documentos`, {
        method: 'POST',
        body: JSON.stringify(dados),
      }),
    removerDocumento: (id: number, docId: number) =>
      request<AdminUsuarioDetalhe>(`/admin/usuarios/${id}/documentos/${docId}`, {
        method: 'DELETE',
      }),
    definirPermissoesExtra: (id: number, permissoes: string[]) =>
      request<AdminUsuario>(`/admin/usuarios/${id}/permissoes-extra`, {
        method: 'PUT',
        body: JSON.stringify({ permissoes }),
      }),
    papeis: () => request<AdminPapel[]>('/admin/papeis'),
    permissoes: () => request<AdminPermissao[]>('/admin/permissoes'),
    estrategias: () => request<string[]>('/admin/estrategias'),
    provedores: () => request<AdminProvedor[]>('/admin/provedores'),
    salvarProvedor: (nome: string, dados: { api_key: string; ativo: boolean }) =>
      request<AdminProvedor>(`/admin/provedores/${encodeURIComponent(nome)}`, {
        method: 'PUT',
        body: JSON.stringify(dados),
      }),
    estrategiaUsuario: (id: number) =>
      request<AdminConfig | null>(`/admin/usuarios/${id}/estrategia`),
    definirEstrategiaUsuario: (id: number, dados: ConfigUsuarioIn) =>
      request<AdminConfig>(`/admin/usuarios/${id}/estrategia`, {
        method: 'PUT',
        body: JSON.stringify(dados),
      }),
    auditoria: (limite = 50) => request<AdminAuditoria[]>(`/admin/auditoria?limite=${limite}`),
    clientes: () => request<AdminCliente[]>('/admin/clientes'),
    criarCliente: (dados: ClienteEntrada & { nome: string }) =>
      request<AdminCliente>('/admin/clientes', { method: 'POST', body: JSON.stringify(dados) }),
    atualizarCliente: (id: number, dados: ClienteEntrada) =>
      request<AdminCliente>(`/admin/clientes/${id}`, { method: 'PATCH', body: JSON.stringify(dados) }),
    removerCliente: (id: number) =>
      request<void>(`/admin/clientes/${id}`, { method: 'DELETE' }),
  },
  cronograma: {
    listar: (de: string, ate: string, tecnicoId?: number | null) =>
      request<Visita[]>(`/cronograma?de=${de}&ate=${ate}${tecnicoId ? `&tecnico_id=${tecnicoId}` : ''}`),
    criar: (dados: NovaVisita) =>
      request<Visita>('/cronograma', { method: 'POST', body: JSON.stringify(dados) }),
    atualizar: (id: number, dados: Partial<NovaVisita>) =>
      request<Visita>(`/cronograma/${id}`, { method: 'PATCH', body: JSON.stringify(dados) }),
    remover: (id: number) => request<void>(`/cronograma/${id}`, { method: 'DELETE' }),
    feriados: (de: string, ate: string) =>
      request<Feriado[]>(`/cronograma/feriados/intervalo?de=${de}&ate=${ate}`),
    criarFeriado: (dados: { data: string; descricao: string }) =>
      request<Feriado>('/cronograma/feriados', { method: 'POST', body: JSON.stringify(dados) }),
    removerFeriado: (id: number) => request<void>(`/cronograma/feriados/${id}`, { method: 'DELETE' }),
  },
  notificacoes: {
    listar: (apenasNaoLidas = false) =>
      request<Notificacao[]>(`/notificacoes${apenasNaoLidas ? '?apenas_nao_lidas=true' : ''}`),
    marcarLida: (id: number) =>
      request<Notificacao>(`/notificacoes/${id}/lida`, { method: 'POST' }),
    marcarTodas: () => request<{ ok: boolean }>('/notificacoes/lidas', { method: 'POST' }),
  },
}
