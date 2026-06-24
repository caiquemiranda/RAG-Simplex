import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

/** Casca da aplicação: sidebar (estilo ChatGPT) + área de conteúdo rolável. */
export default function Layout() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <main className="min-h-0 min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
