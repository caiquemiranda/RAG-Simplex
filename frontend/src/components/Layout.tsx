import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Logo } from './Logo'
import { useMediaQuery } from '../hooks/useMediaQuery'

const IconMenu = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" />
  </svg>
)

/**
 * Casca da aplicação.
 * - Telas largas: sidebar fixa (alterna entre barra de 260px e trilho de ícones).
 * - Telas estreitas (< 768px): a sidebar vira um **drawer** sobreposto, aberto por
 *   um ☰ no topo e fechado ao navegar / clicar no fundo.
 */
export default function Layout() {
  const compacto = useMediaQuery('(max-width: 767px)')
  const [aberta, setAberta] = useState(() => localStorage.getItem('rag-sidebar') !== '0')
  const [drawer, setDrawer] = useState(false)

  useEffect(() => {
    localStorage.setItem('rag-sidebar', aberta ? '1' : '0')
  }, [aberta])

  // Ao voltar para tela larga, garante o drawer fechado.
  useEffect(() => {
    if (!compacto) setDrawer(false)
  }, [compacto])

  if (compacto) {
    return (
      <div className="flex h-screen flex-col bg-background text-foreground">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-2">
          <button className="rounded-lg p-2 hover:bg-accent" aria-label="Abrir barra lateral" onClick={() => setDrawer(true)}>
            <IconMenu />
          </button>
          <Link to="/inicio"><Logo className="h-7" /></Link>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>

        {/* Drawer sobreposto */}
        {drawer && (
          <div className="fixed inset-0 z-40 bg-black/40" aria-hidden onClick={() => setDrawer(false)} />
        )}
        <div
          className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 ${
            drawer ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar variant="full" onFechar={() => setDrawer(false)} aoNavegar={() => setDrawer(false)} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        variant={aberta ? 'full' : 'rail'}
        onAbrir={() => setAberta(true)}
        onFechar={() => setAberta(false)}
      />
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
