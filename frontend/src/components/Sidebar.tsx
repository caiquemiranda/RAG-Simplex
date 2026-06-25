import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { api, type ClienteVisivel } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { useChat } from '../chat/ChatContext'
import { useTema } from '../theme/ThemeContext'
import { useNotificacoes } from '../notificacoes/NotificacoesContext'
import { Logo } from './Logo'
import { Avatar } from './Avatar'

/* ---- Ícones (SVG inline) ---- */
const ic = 'h-[18px] w-[18px] shrink-0'
const svg = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
const IconPainel = () => (<svg className={ic} viewBox="0 0 24 24" {...svg}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /></svg>)
const IconConsulta = () => (<svg className={ic} viewBox="0 0 24 24" {...svg}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>)
const IconNova = () => (<svg className={ic} viewBox="0 0 24 24" {...svg}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>)
const IconBuscar = () => (<svg className={ic} viewBox="0 0 24 24" {...svg}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>)
const IconRelatorios = () => (<svg className={ic} viewBox="0 0 24 24" {...svg}><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>)
const IconEquipamento = () => (<svg className={ic} viewBox="0 0 24 24" {...svg}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>)
const IconDocumentos = () => (<svg className={ic} viewBox="0 0 24 24" {...svg}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>)
const IconCronograma = () => (<svg className={ic} viewBox="0 0 24 24" {...svg}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></svg>)
const IconSino = () => (<svg className={ic} viewBox="0 0 24 24" {...svg}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>)
const IconLixeira = () => (<svg className="h-4 w-4" viewBox="0 0 24 24" {...svg}><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>)
const Chevron = ({ aberto }: { aberto: boolean }) => (
  <svg className={`h-4 w-4 shrink-0 transition-transform ${aberto ? 'rotate-90' : ''}`} viewBox="0 0 24 24" {...svg}><path d="m9 18 6-6-6-6" /></svg>
)

const itemBase = 'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-accent'

type Props = {
  /** `full` = barra de 260px; `rail` = trilho de ícones (56px). */
  variant: 'full' | 'rail'
  onAbrir?: () => void // trilho → expandir
  onFechar?: () => void // barra → recolher (desktop) ou fechar drawer (compacto)
  aoNavegar?: () => void // chamado ao navegar (fecha o drawer no modo compacto)
}

export default function Sidebar({ variant, onAbrir, onFechar, aoNavegar }: Props) {
  const { usuario, sair } = useAuth()
  const { conversas, conversaAtivaId, novaConsulta, selecionar, excluir } = useChat()
  const { tema, alternar } = useTema()
  const { naoLidas } = useNotificacoes()
  const navegar = useNavigate()
  const local = useLocation()
  const pode = (p: string) => usuario?.permissoes.includes(p) ?? false

  const [grupo, setGrupo] = useState(true)
  const [grupoRel, setGrupoRel] = useState(false)
  const [grupoDoc, setGrupoDoc] = useState(false)
  const [grupoEqp, setGrupoEqp] = useState(false)
  const [clientesRel, setClientesRel] = useState<ClienteVisivel[]>([])
  const [busca, setBusca] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [menu, setMenu] = useState(false)
  const buscaRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (usuario) api.clientesVisiveis().then(setClientesRel).catch(() => {})
  }, [usuario])

  const naConsulta = local.pathname === '/consulta'
  const naRel = local.pathname.startsWith('/relatorios')
  const recentes = [...conversas]
    .sort((a, b) => b.atualizadoEm - a.atualizadoEm)
    .filter((c) => {
      const q = busca.trim().toLowerCase()
      if (!q) return true
      return c.titulo.toLowerCase().includes(q) || c.mensagens.some((m) => m.texto.toLowerCase().includes(q))
    })

  const navegou = () => aoNavegar?.()
  function abrirNova() { novaConsulta(); navegar('/consulta'); navegou() }
  function abrirConsulta(id: string) { selecionar(id); navegar('/consulta'); navegou() }
  function irPara(rota: string) { setMenu(false); navegar(rota); navegou() }
  function toggleBusca() { setGrupo(true); setBuscando((v) => !v); setTimeout(() => buscaRef.current?.focus(), 0) }
  function logout() { sair(); navegar('/login') }

  const linkCls = ({ isActive }: { isActive: boolean }) => `${itemBase} ${isActive ? 'bg-accent font-medium' : ''}`

  /* ---- Trilho recolhido (só ícones) ---- */
  if (variant === 'rail') {
    const railBtn = 'rounded-lg p-2 hover:bg-accent'
    const railLink = ({ isActive }: { isActive: boolean }) => `${railBtn} ${isActive ? 'bg-accent' : ''}`
    return (
      <aside className="flex h-full w-[56px] flex-col items-center gap-1 border-r bg-muted py-2">
        <button className={railBtn} title="Abrir barra lateral" onClick={onAbrir}><IconPainel /></button>
        <NavLink to="/notificacoes" className={({ isActive }) => `relative ${railBtn} ${isActive ? 'bg-accent' : ''}`} title="Notificações" onClick={navegou}>
          <IconSino />
          {naoLidas > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />}
        </NavLink>
        <NavLink to="/consulta" className={railLink} title="Consulta" onClick={navegou}><IconConsulta /></NavLink>
        <NavLink to="/relatorios" className={railLink} title="Relatórios" onClick={navegou}><IconRelatorios /></NavLink>
        <NavLink to="/equipamentos" className={railLink} title="Buscar Equipamento" onClick={navegou}><IconEquipamento /></NavLink>
        <NavLink to="/documentos" className={railLink} title="Documentos" onClick={navegou}><IconDocumentos /></NavLink>
        <NavLink to="/cronograma" className={railLink} title="Cronograma" onClick={navegou}><IconCronograma /></NavLink>
        <button className="mt-auto" title={usuario?.email} onClick={onAbrir}>
          <Avatar nome={usuario?.nome || usuario?.email || '?'} />
        </button>
      </aside>
    )
  }

  /* ---- Barra completa ---- */
  return (
    <aside className="flex h-full w-[260px] flex-col border-r bg-muted">
      <div className="flex items-center justify-between p-2">
        <Link to="/inicio" onClick={navegou} title="Início" className="ml-1">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <button className="relative rounded-lg p-2 hover:bg-accent" title="Notificações"
                  onClick={() => { setMenu(false); navegar('/notificacoes'); navegou() }}>
            <IconSino />
            {naoLidas > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                {naoLidas > 9 ? '9+' : naoLidas}
              </span>
            )}
          </button>
          <button className="rounded-lg p-2 hover:bg-accent" title="Fechar barra lateral" onClick={onFechar}><IconPainel /></button>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {/* Grupo Consulta */}
        <button className={`${itemBase} ${naConsulta ? 'font-medium' : ''}`} onClick={() => setGrupo((v) => !v)}>
          <Chevron aberto={grupo} />
          <IconConsulta />
          <span className="flex-1 text-left">Consulta</span>
        </button>

        {grupo && (
          <div className="ml-3 space-y-0.5 border-l pl-2">
            <button className={itemBase} onClick={abrirNova}><IconNova /> Nova consulta</button>
            <button className={itemBase} onClick={toggleBusca}><IconBuscar /> Buscar consulta</button>
            {buscando && (
              <input
                ref={buscaRef}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Filtrar consultas…"
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            )}
            <div className="px-2 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Consultas recentes
            </div>
            {recentes.length === 0 && (
              <p className="px-2 py-1 text-xs text-muted-foreground">{busca ? 'Nada encontrado.' : 'Nenhuma ainda.'}</p>
            )}
            {recentes.map((c) => (
              <div key={c.id} className={`group flex items-center gap-1 rounded-lg pr-1 text-sm hover:bg-accent ${c.id === conversaAtivaId ? 'bg-accent' : ''}`}>
                <button className="min-w-0 flex-1 truncate px-2 py-1.5 text-left" title={c.titulo} onClick={() => abrirConsulta(c.id)}>
                  {c.titulo}
                </button>
                <button
                  className="shrink-0 rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                  title="Excluir consulta"
                  onClick={(e) => { e.stopPropagation(); excluir(c.id) }}
                >
                  <IconLixeira />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Outras abas */}
        <div className="pt-2">
          {/* Grupo Relatórios (clientes) */}
          <button className={`${itemBase} ${naRel ? 'font-medium' : ''}`} onClick={() => setGrupoRel((v) => !v)}>
            <Chevron aberto={grupoRel} />
            <IconRelatorios />
            <span className="flex-1 text-left">Relatórios</span>
          </button>
          {grupoRel && (
            <div className="ml-3 space-y-0.5 border-l pl-2">
              <NavLink to="/relatorios" end className={linkCls} onClick={navegou}>Visão geral</NavLink>
              {clientesRel.map((c) => (
                <NavLink key={c.id} to={`/relatorios/${c.id}`} className={linkCls} onClick={navegou}>
                  <Avatar nome={c.nome} fotoUrl={c.logo_url} cor={c.cor} className="h-5 w-5" />
                  <span className="truncate">{c.nome}</span>
                </NavLink>
              ))}
              {clientesRel.length === 0 && <p className="px-2 py-1 text-xs text-muted-foreground">Nenhum cliente.</p>}
            </div>
          )}
          {/* Grupo Equipamentos (Buscar/Sobre/Lista) — #EQP-2 */}
          <button className={`${itemBase} ${local.pathname.startsWith('/equipamentos') ? 'font-medium' : ''}`} onClick={() => setGrupoEqp((v) => !v)}>
            <Chevron aberto={grupoEqp} />
            <IconEquipamento />
            <span className="flex-1 text-left">Equipamentos</span>
          </button>
          {grupoEqp && (
            <div className="ml-3 space-y-0.5 border-l pl-2">
              <NavLink to="/equipamentos" end className={linkCls} onClick={navegou}>Buscar equipamento</NavLink>
              <NavLink to="/equipamentos/sobre" className={linkCls} onClick={navegou}>Sobre equipamento</NavLink>
              <NavLink to="/equipamentos/lista" className={linkCls} onClick={navegou}>Lista de equipamentos</NavLink>
            </div>
          )}
          {/* Grupo Documentos (Empresa/Clientes/Marcas) */}
          <button className={`${itemBase} ${local.pathname === '/documentos' ? 'font-medium' : ''}`} onClick={() => setGrupoDoc((v) => !v)}>
            <Chevron aberto={grupoDoc} />
            <IconDocumentos />
            <span className="flex-1 text-left">Documentos</span>
          </button>
          {grupoDoc && (
            <div className="ml-3 space-y-0.5 border-l pl-2">
              <NavLink to="/documentos" end className={linkCls} onClick={navegou}>Todos</NavLink>
              <NavLink to="/documentos?cat=empresa" className={linkCls} onClick={navegou}>Empresa</NavLink>
              <NavLink to="/documentos?cat=clientes" className={linkCls} onClick={navegou}>Clientes</NavLink>
              <NavLink to="/documentos?cat=marcas" className={linkCls} onClick={navegou}>Marcas</NavLink>
            </div>
          )}
          <NavLink to="/cronograma" className={linkCls} onClick={navegou}><IconCronograma /> Cronograma</NavLink>
        </div>
      </nav>

      {/* Usuário (rodapé) */}
      <div className="relative border-t p-2">
        {menu && (
          <>
            <button className="fixed inset-0 z-40 cursor-default" aria-label="Fechar menu" onClick={() => setMenu(false)} />
            <div className="absolute bottom-14 left-2 right-2 z-50 overflow-hidden rounded-lg border bg-card text-card-foreground shadow-lg">
              <button className="block w-full px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => irPara('/inicio')}>Início</button>
              {pode('gerir_usuarios') && (
                <button className="block w-full px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => irPara('/admin')}>Painel ADM</button>
              )}
              <button className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent" onClick={alternar}>
                <span>Tema</span>
                <span className="text-muted-foreground">{tema === 'escuro' ? '🌙 escuro' : '☀️ claro'}</span>
              </button>
              <button className="block w-full border-t px-3 py-2 text-left text-sm text-destructive hover:bg-accent" onClick={logout}>Sair</button>
            </div>
          </>
        )}
        <button className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-accent" onClick={() => setMenu((v) => !v)}>
          <Avatar nome={usuario?.nome || usuario?.email || '?'} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{usuario?.nome || usuario?.email}</span>
            <span className="block truncate text-xs text-muted-foreground">{usuario?.papel ?? '—'}</span>
          </span>
        </button>
      </div>
    </aside>
  )
}
