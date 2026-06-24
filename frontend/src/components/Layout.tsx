import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from './ui/button'

/** Casca da aplicação em altura cheia: cabeçalho fixo + área de conteúdo rolável.
 *  As páginas controlam a própria rolagem (`h-full`). */
export default function Layout() {
  const { usuario, sair } = useAuth()
  const navegar = useNavigate()
  const pode = (p: string) => usuario?.permissoes.includes(p) ?? false

  function logout() {
    sair()
    navegar('/login')
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="shrink-0 border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 p-4">
          <Link to="/" className="font-semibold">
            RAG-Simplex
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {pode('consultar') && (
              <Link to="/consulta" className="hover:underline">
                Consulta
              </Link>
            )}
            <span className="hidden text-muted-foreground sm:inline">
              {usuario?.email} · {usuario?.papel ?? '—'}
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              Sair
            </Button>
          </nav>
        </div>
      </header>
      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
