import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from './ui/button'

/** Casca da aplicação: cabeçalho com navegação por papel + área de conteúdo. */
export default function Layout() {
  const { usuario, sair } = useAuth()
  const navegar = useNavigate()
  const pode = (p: string) => usuario?.permissoes.includes(p) ?? false

  function logout() {
    sair()
    navegar('/login')
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
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
      <main className="mx-auto max-w-5xl p-4">
        <Outlet />
      </main>
    </div>
  )
}
