import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useChat } from '../chat/ChatContext'

/* ---- Ícones (SVG inline, 18px, stroke currentColor) ---- */
const ic = 'h-[18px] w-[18px]'
const IconPainel = () => (
  <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /></svg>
)
const IconNova = () => (
  <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
)
const IconBuscar = () => (
  <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
)
const IconLixeira = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
)

function iniciais(texto: string): string {
  const partes = texto.replace(/@.*/, '').split(/[.\s_-]+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || texto[0]?.toUpperCase() || '?'
}

export default function Sidebar() {
  const { usuario, sair } = useAuth()
  const { conversas, conversaAtivaId, novaConsulta, selecionar, excluir } = useChat()
  const navegar = useNavigate()
  const pode = (p: string) => usuario?.permissoes.includes(p) ?? false

  const [aberta, setAberta] = useState(() => localStorage.getItem('rag-sidebar') !== '0')
  const [busca, setBusca] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [menu, setMenu] = useState(false)
  const buscaRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    localStorage.setItem('rag-sidebar', aberta ? '1' : '0')
  }, [aberta])

  const recentes = [...conversas]
    .sort((a, b) => b.atualizadoEm - a.atualizadoEm)
    .filter((c) => {
      const q = busca.trim().toLowerCase()
      if (!q) return true
      return (
        c.titulo.toLowerCase().includes(q) ||
        c.mensagens.some((m) => m.texto.toLowerCase().includes(q))
      )
    })

  function abrirNova() {
    novaConsulta()
    navegar('/consulta')
  }
  function abrirConsulta(id: string) {
    selecionar(id)
    navegar('/consulta')
  }
  function logout() {
    sair()
    navegar('/login')
  }
  function toggleBusca() {
    if (!aberta) setAberta(true)
    setBuscando((v) => !v)
    setTimeout(() => buscaRef.current?.focus(), 0)
  }

  /* ---- Rail recolhido: só ícones ---- */
  if (!aberta) {
    return (
      <aside className="flex h-full w-[56px] flex-col items-center gap-1 border-r bg-muted/30 py-2">
        <button className="rounded p-2 hover:bg-accent" title="Abrir barra" onClick={() => setAberta(true)}>
          <IconPainel />
        </button>
        <button className="rounded p-2 hover:bg-accent" title="Nova consulta" onClick={abrirNova}>
          <IconNova />
        </button>
        <button className="rounded p-2 hover:bg-accent" title="Buscar consulta" onClick={toggleBusca}>
          <IconBuscar />
        </button>
        <div className="mt-auto">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
            title={usuario?.email}
            onClick={() => setAberta(true)}
          >
            {iniciais(usuario?.nome || usuario?.email || '?')}
          </button>
        </div>
      </aside>
    )
  }

  /* ---- Sidebar aberta ---- */
  return (
    <aside className="flex h-full w-[260px] flex-col border-r bg-muted/30">
      {/* Topo: logo + recolher */}
      <div className="flex items-center justify-between p-2">
        <span className="px-2 text-sm font-semibold">RAG-Simplex</span>
        <button className="rounded p-2 hover:bg-accent" title="Recolher barra" onClick={() => setAberta(false)}>
          <IconPainel />
        </button>
      </div>

      {/* Ações */}
      <div className="space-y-0.5 px-2">
        <button
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium hover:bg-accent"
          onClick={abrirNova}
        >
          <IconNova /> Nova consulta
        </button>
        <button
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium hover:bg-accent"
          onClick={toggleBusca}
        >
          <IconBuscar /> Buscar consulta
        </button>
        {buscando && (
          <input
            ref={buscaRef}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar pelo título ou conteúdo…"
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        )}
      </div>

      {/* Recentes */}
      <div className="px-3 pb-1 pt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Consultas recentes
      </div>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2">
        {recentes.length === 0 && (
          <p className="px-2 py-2 text-xs text-muted-foreground">
            {busca ? 'Nada encontrado.' : 'Nenhuma consulta ainda.'}
          </p>
        )}
        {recentes.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center gap-1 rounded-lg pr-1 text-sm hover:bg-accent ${
              c.id === conversaAtivaId ? 'bg-accent' : ''
            }`}
          >
            <button
              className="min-w-0 flex-1 truncate px-2 py-2 text-left"
              title={c.titulo}
              onClick={() => abrirConsulta(c.id)}
            >
              {c.titulo}
            </button>
            <button
              className="shrink-0 rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
              title="Excluir consulta"
              onClick={(e) => {
                e.stopPropagation()
                excluir(c.id)
              }}
            >
              <IconLixeira />
            </button>
          </div>
        ))}
      </div>

      {/* Usuário (rodapé) com menu */}
      <div className="relative border-t p-2">
        {menu && (
          <div className="absolute bottom-14 left-2 right-2 z-10 overflow-hidden rounded-lg border bg-popover shadow-md">
            <button className="block w-full px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => { setMenu(false); navegar('/inicio') }}>
              Início
            </button>
            {pode('gerir_usuarios') && (
              <button className="block w-full px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => { setMenu(false); navegar('/admin') }}>
                Painel ADM
              </button>
            )}
            <button className="block w-full border-t px-3 py-2 text-left text-sm text-destructive hover:bg-accent" onClick={logout}>
              Sair
            </button>
          </div>
        )}
        <button
          className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-accent"
          onClick={() => setMenu((v) => !v)}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {iniciais(usuario?.nome || usuario?.email || '?')}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{usuario?.nome || usuario?.email}</span>
            <span className="block truncate text-xs text-muted-foreground">{usuario?.papel ?? '—'}</span>
          </span>
        </button>
      </div>
    </aside>
  )
}
