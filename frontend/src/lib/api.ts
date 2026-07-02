// Cliente HTTP da API FastAPI. O token JWT fica no localStorage e é enviado
// como Bearer em cada requisição.

const BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

/** URL absoluta de um arquivo servido pelo backend (ex.: `/arquivos/...`). */
export const urlArquivo = (caminho: string) => `${BASE}${caminho}`

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
  unidade_id: number | null
  unidade_nome: string | null
  ativo: boolean
  cor: string | null
  logo_url: string | null
  // Cadastro completo (#CLI-PG)
  endereco: string | null
  contato: string | null
  telefone: string | null
  email: string | null
  observacoes: string | null
}
export type ClienteEntrada = {
  nome?: string; unidade?: string | null; unidade_id?: number | null; ativo?: boolean
  cor?: string | null; logo_url?: string | null
  endereco?: string | null; contato?: string | null; telefone?: string | null; email?: string | null; observacoes?: string | null
}
export type ClienteVisivel = { id: number; nome: string; unidade: string | null; unidade_id: number | null; cor: string | null; logo_url: string | null }
// Resumo por cliente para os cards de Relatórios (#R2-CARDS).
export type ResumoCliente = {
  cliente_id: number; nome: string; cor: string | null; logo_url: string | null; unidade: string | null
  equip_total: number; equip_operando: number; equip_falha: number
  os_preventiva: number; os_corretiva: number; os_abertas: number; os_concluidas: number
}

// Equipamento do cliente (#EQP-1) — importado por CSV.
export type Equipamento = {
  id: number; tag: string; painel: string; loop: string; add: string; type: string; model: string
  status: string; falha_id: number | null; falha_nome: string | null
  ultima_manutencao: string | null; ultimo_teste: string | null
  planta_id: number | null; pos_x: number | null; pos_y: number | null
}
// Estados possíveis do equipamento (#EQP-STATUS, D-026). "Em falha" usa falha_id.
export const STATUS_EQUIP = ['Operando', 'Desabilitado', 'Desativado', 'Em falha'] as const
export type ImportEquipResultado = { importados: number; total: number }
// Documento (manual/datasheet da biblioteca) fixado a um equipamento (#EQP-DOC).
export type DocEquipRef = { id: number; nome: string; url: string; marca: string | null }
// Lista nomeada de equipamentos (#EQP-LISTAS) — base do doc de preventiva.
export type EquipamentoLista = { id: number; cliente_id: number; nome: string; equipamento_ids: number[] }
// Documento de Manutenção Preventiva gerado de uma lista (#PREV-DOC).
export type DocPrevEquip = {
  id: number; tag: string; painel: string; loop: string; add: string; type: string; model: string
  status: string; ultima_manutencao: string | null; ultimo_teste: string | null
}
export type DocumentoPreventiva = {
  lista_id: number; lista_nome: string; gerado_em: string
  cliente: { id: number; nome: string; endereco: string | null; unidade: string | null }
  equipamentos: DocPrevEquip[]
}
// Planta (projeto) do cliente — #MAP.
export type Planta = { id: number; nome: string; imagem_url: string; largura: number; altura: number; ordem: number }
// Catálogo de falhas do painel (#OS, D-025).
export type Falha = { id: number; nome: string; termo_en: string | null }
export type FalhaEntrada = { nome: string; termo_en?: string | null }

// Campos do documento de manutenção corretiva (#OS, D-025) — todos opcionais.
export type CamposDocOS = {
  especialidade?: string | null
  requisitante?: string | null
  data_solicitacao?: string | null
  centro_custo?: string | null
  numero_os?: string | null
  reserva_material?: string | null
  material_utilizado?: string | null
  endereco?: string | null
  setor?: string | null
  prioridade?: string | null
  data_execucao?: string | null
  acao_aplicada?: string | null
}
export type ClienteDetalhe = AdminCliente & { equipamentos: Equipamento[] }

// Entidade Unidade (D-021) — base/regional p/ a "visão por unidade" do cronograma.
export type AdminUnidade = { id: number; nome: string; cidade: string | null; ativo: boolean }
export type UnidadeEntrada = { nome?: string; cidade?: string | null; ativo?: boolean }
export type UnidadeVisivel = { id: number; nome: string; cidade: string | null }

export type TecnicoMini = { id: number; nome: string; foto: string | null }
// Visita = Ordem de Serviço (#OS, D-025).
export type Visita = CamposDocOS & {
  id: number
  usuario_id: number
  tecnico_nome: string
  tecnico_foto: string | null
  tecnicos: TecnicoMini[]
  cliente_id: number | null
  cliente_nome: string | null
  cliente_cor: string | null
  cliente_logo: string | null
  unidade: string | null
  unidade_id: number | null
  data: string
  data_fim: string | null
  titulo: string
  status: string
  observacoes: string | null
  fixo: boolean
  // O.S. (D-025)
  tipo: string
  equipamento_id: number | null
  equipamento_tag: string | null
  falha_id: number | null
  falha_nome: string | null
  lista_id: number | null
  lista_nome: string | null
}
// Página da atividade (#ATV-1).
export type ComentarioVisita = { id: number; autor_id: number | null; autor_nome: string | null; texto: string; criado_em: string }
export type AnexoVisita = { id: number; url: string; nome: string; autor_id: number | null; criado_em: string }
export type VisitaDetalhe = Visita & { comentarios: ComentarioVisita[]; anexos: AnexoVisita[] }
export type NovaVisita = CamposDocOS & {
  usuario_ids: number[]        // vazio → usa os técnicos fixos do cliente (#ALOC)
  cliente_id?: number | null
  data: string
  data_fim?: string | null     // fim do intervalo (#OS-MULTIDATA)
  titulo: string
  status?: string
  observacoes?: string | null
  // O.S. (D-025)
  tipo?: string
  equipamento_id?: number | null
  falha_id?: number | null
  lista_id?: number | null
}
export type Feriado = { id: number; data: string; descricao: string }
export type DocEquip = {
  id: number
  categoria: string
  marca: string
  cliente_id: number | null
  cliente_nome: string | null
  nome: string
  url: string
  oculto: boolean
}
// Chat interno (#CHAT).
export type ContatoChat = { id: number; nome: string; email: string; foto: string | null; nao_lidas: number }
export type MensagemChat = { id: number; remetente_id: number; texto: string; meu: boolean; criado_em: string }
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
  unidade_id: number | null
  unidade_nome: string | null
  clientes: AdminCliente[]
  cliente_padrao_id: number | null
  cliente_padrao_nome: string | null
  observacoes: string | null
  acesso_expira_em: string | null
  documentos: DocumentoTecnico[]
}

// Card "Banco de dados" (status + backup) — D-022.
export type BancoTabela = { nome: string; linhas: number }
export type BancoMigracao = { revisao_atual: string | null; revisao_head: string | null; em_dia: boolean }
export type BancoStatus = {
  backend: string
  caminho: string | null
  tamanho_bytes: number | null
  tabelas: BancoTabela[]
  migracao: BancoMigracao
  blocos_indexados: number
}
export type BancoBackup = { arquivo: string; tamanho_bytes: number }

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
  unidade_id?: number | null
  cliente_ids?: number[]
  cliente_padrao_id?: number | null
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

/** POST multipart de um único arquivo (campo `arquivo`) para um endpoint qualquer. */
export async function uploadMultipart<T>(path: string, file: File): Promise<T> {
  const token = getToken()
  const fd = new FormData()
  fd.append('arquivo', file)
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  if (!res.ok) {
    let detalhe = res.statusText
    try { detalhe = (await res.json()).detail ?? detalhe } catch { /* sem JSON */ }
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
  relatoriosResumo: () => request<ResumoCliente[]>('/relatorios/resumo'),
  unidadesVisiveis: () => request<UnidadeVisivel[]>('/unidades'),
  equipamentosCliente: (clienteId: number, busca?: string) =>
    request<Equipamento[]>(`/clientes/${clienteId}/equipamentos${busca ? `?busca=${encodeURIComponent(busca)}` : ''}`),
  plantasCliente: (clienteId: number) => request<Planta[]>(`/clientes/${clienteId}/plantas`),
  ordensEquipamento: (equipamentoId: number) => request<Visita[]>(`/cronograma/equipamento/${equipamentoId}`),
  documentosEquipamento: (equipamentoId: number) => request<DocEquipRef[]>(`/equipamentos/${equipamentoId}/documentos`),
  tipoImagemEquipamento: (equipamentoId: number) => request<{ tipo: string; imagem_url: string | null }>(`/equipamentos/${equipamentoId}/tipo-imagem`),
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
    cliente: (id: number) => request<ClienteDetalhe>(`/admin/clientes/${id}`),
    criarCliente: (dados: ClienteEntrada & { nome: string }) =>
      request<AdminCliente>('/admin/clientes', { method: 'POST', body: JSON.stringify(dados) }),
    atualizarCliente: (id: number, dados: ClienteEntrada) =>
      request<AdminCliente>(`/admin/clientes/${id}`, { method: 'PATCH', body: JSON.stringify(dados) }),
    removerCliente: (id: number) =>
      request<void>(`/admin/clientes/${id}`, { method: 'DELETE' }),
    // Equipamentos do cliente (#EQP-1)
    equipamentos: (clienteId: number) => request<Equipamento[]>(`/admin/clientes/${clienteId}/equipamentos`),
    importarEquipamentos: (clienteId: number, file: File, substituir = false) =>
      uploadMultipart<ImportEquipResultado>(`/admin/clientes/${clienteId}/equipamentos/importar?substituir=${substituir}`, file),
    removerEquipamento: (eqpId: number) =>
      request<void>(`/admin/equipamentos/${eqpId}`, { method: 'DELETE' }),
    criarEquipamento: (clienteId: number, dados: Partial<Equipamento>) =>
      request<Equipamento>(`/admin/clientes/${clienteId}/equipamentos`, { method: 'POST', body: JSON.stringify(dados) }),
    definirDocumentosEquipamento: (eqpId: number, documento_ids: number[]) =>
      request<DocEquipRef[]>(`/admin/equipamentos/${eqpId}/documentos`, { method: 'PUT', body: JSON.stringify({ documento_ids }) }),
    definirTipoImagem: (tipo: string, imagem_url: string) =>
      request<{ id: number; tipo: string; imagem_url: string }>(`/admin/tipos-equipamento`, { method: 'PUT', body: JSON.stringify({ tipo, imagem_url }) }),
    atualizarEquipamento: (eqpId: number, dados: Partial<Equipamento>) =>
      request<Equipamento>(`/admin/equipamentos/${eqpId}`, { method: 'PATCH', body: JSON.stringify(dados) }),
    // Plantas (#MAP)
    plantas: (clienteId: number) => request<Planta[]>(`/admin/clientes/${clienteId}/plantas`),
    uploadPlanta: (clienteId: number, file: File) =>
      uploadMultipart<Planta[]>(`/admin/clientes/${clienteId}/plantas`, file),
    removerPlanta: (plantaId: number) =>
      request<void>(`/admin/plantas/${plantaId}`, { method: 'DELETE' }),
    // Listas de equipamentos (#EQP-LISTAS)
    listas: (clienteId: number) => request<EquipamentoLista[]>(`/admin/clientes/${clienteId}/listas`),
    criarLista: (clienteId: number, dados: { nome: string; equipamento_ids: number[] }) =>
      request<EquipamentoLista>(`/admin/clientes/${clienteId}/listas`, { method: 'POST', body: JSON.stringify(dados) }),
    atualizarLista: (id: number, dados: { nome?: string; equipamento_ids?: number[] }) =>
      request<EquipamentoLista>(`/admin/listas/${id}`, { method: 'PATCH', body: JSON.stringify(dados) }),
    removerLista: (id: number) => request<void>(`/admin/listas/${id}`, { method: 'DELETE' }),
    documentoPreventiva: (listaId: number) => request<DocumentoPreventiva>(`/admin/listas/${listaId}/documento-preventiva`),
    // Catálogo de falhas (#OS, D-025)
    falhas: () => request<Falha[]>('/admin/falhas'),
    criarFalha: (dados: FalhaEntrada) =>
      request<Falha>('/admin/falhas', { method: 'POST', body: JSON.stringify(dados) }),
    removerFalha: (id: number) => request<void>(`/admin/falhas/${id}`, { method: 'DELETE' }),
    banco: () => request<BancoStatus>('/admin/banco'),
    bancoBackup: () => request<BancoBackup>('/admin/banco/backup', { method: 'POST' }),
    unidades: () => request<AdminUnidade[]>('/admin/unidades'),
    criarUnidade: (dados: UnidadeEntrada & { nome: string }) =>
      request<AdminUnidade>('/admin/unidades', { method: 'POST', body: JSON.stringify(dados) }),
    atualizarUnidade: (id: number, dados: UnidadeEntrada) =>
      request<AdminUnidade>(`/admin/unidades/${id}`, { method: 'PATCH', body: JSON.stringify(dados) }),
    removerUnidade: (id: number) =>
      request<void>(`/admin/unidades/${id}`, { method: 'DELETE' }),
  },
  cronograma: {
    listar: (de: string, ate: string, opts?: { tecnicoIds?: number[]; clienteIds?: number[]; unidadeId?: number | null }) => {
      const p = new URLSearchParams({ de, ate })
      opts?.tecnicoIds?.forEach((id) => p.append('tecnico_ids', String(id)))
      opts?.clienteIds?.forEach((id) => p.append('cliente_ids', String(id)))
      if (opts?.unidadeId) p.append('unidade_id', String(opts.unidadeId))
      return request<Visita[]>(`/cronograma?${p.toString()}`)
    },
    criar: (dados: NovaVisita) =>
      request<Visita>('/cronograma', { method: 'POST', body: JSON.stringify(dados) }),
    atualizar: (id: number, dados: Partial<NovaVisita>) =>
      request<Visita>(`/cronograma/${id}`, { method: 'PATCH', body: JSON.stringify(dados) }),
    remover: (id: number) => request<void>(`/cronograma/${id}`, { method: 'DELETE' }),
    // Lista de todas as atividades (sidebar Cronograma → Atividades)
    atividades: () => request<Visita[]>('/cronograma/atividades'),
    // Página da atividade (#ATV-1)
    obter: (id: number) => request<VisitaDetalhe>(`/cronograma/${id}`),
    comentar: (id: number, texto: string) =>
      request<VisitaDetalhe>(`/cronograma/${id}/comentarios`, { method: 'POST', body: JSON.stringify({ texto }) }),
    anexar: (id: number, file: File) => uploadMultipart<VisitaDetalhe>(`/cronograma/${id}/anexos`, file),
    removerAnexo: (id: number, anexoId: number) =>
      request<VisitaDetalhe>(`/cronograma/${id}/anexos/${anexoId}`, { method: 'DELETE' }),
    feriados: (de: string, ate: string) =>
      request<Feriado[]>(`/cronograma/feriados/intervalo?de=${de}&ate=${ate}`),
    criarFeriado: (dados: { data: string; descricao: string }) =>
      request<Feriado>('/cronograma/feriados', { method: 'POST', body: JSON.stringify(dados) }),
    removerFeriado: (id: number) => request<void>(`/cronograma/feriados/${id}`, { method: 'DELETE' }),
  },
  biblioteca: {
    listar: (params?: { categoria?: string; busca?: string; cliente_id?: number }) => {
      const q = new URLSearchParams()
      if (params?.categoria) q.set('categoria', params.categoria)
      if (params?.busca) q.set('busca', params.busca)
      if (params?.cliente_id != null) q.set('cliente_id', String(params.cliente_id))
      const s = q.toString()
      return request<DocEquip[]>(`/biblioteca${s ? `?${s}` : ''}`)
    },
    criar: async (file: File, categoria: string, opts: { marca?: string; nome?: string; cliente_id?: number } = {}) => {
      const token = getToken()
      const fd = new FormData()
      fd.append('arquivo', file)
      fd.append('categoria', categoria)
      fd.append('marca', opts.marca ?? '')
      fd.append('nome', opts.nome ?? '')
      if (opts.cliente_id != null) fd.append('cliente_id', String(opts.cliente_id))
      const res = await fetch(`${BASE}/biblioteca`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
      if (!res.ok) {
        let d = res.statusText
        try { d = (await res.json()).detail ?? d } catch { /* */ }
        throw new Error(d)
      }
      return res.json() as Promise<DocEquip>
    },
    atualizar: (id: number, dados: { nome?: string; marca?: string; oculto?: boolean }) =>
      request<DocEquip>(`/biblioteca/${id}`, { method: 'PATCH', body: JSON.stringify(dados) }),
    remover: (id: number) => request<void>(`/biblioteca/${id}`, { method: 'DELETE' }),
  },
  conversas: {
    contatos: () => request<ContatoChat[]>('/conversas'),
    naoLidas: () => request<{ total: number }>('/conversas/nao-lidas'),
    historico: (outroId: number) => request<MensagemChat[]>(`/conversas/${outroId}`),
    enviar: (outroId: number, texto: string) =>
      request<MensagemChat>(`/conversas/${outroId}`, { method: 'POST', body: JSON.stringify({ texto }) }),
  },
  notificacoes: {
    listar: (apenasNaoLidas = false) =>
      request<Notificacao[]>(`/notificacoes${apenasNaoLidas ? '?apenas_nao_lidas=true' : ''}`),
    marcarLida: (id: number) =>
      request<Notificacao>(`/notificacoes/${id}/lida`, { method: 'POST' }),
    marcarTodas: () => request<{ ok: boolean }>('/notificacoes/lidas', { method: 'POST' }),
  },
}
