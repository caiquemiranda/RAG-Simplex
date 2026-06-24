import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'

/** Bloqueia rotas para quem não está autenticado. */
export default function ProtectedRoute() {
  const { usuario, carregando } = useAuth()
  if (carregando) {
    return <div className="p-8 text-center text-muted-foreground">Carregando…</div>
  }
  if (!usuario) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
