import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './auth/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import Consulta from './pages/Consulta'
import Admin from './pages/Admin'
import Relatorios from './pages/Relatorios'
import RelatorioCliente from './pages/RelatorioCliente'
import Equipamentos from './pages/Equipamentos'
import Documentos from './pages/Documentos'
import Cronograma from './pages/Cronograma'
import Notificacoes from './pages/Notificacoes'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/consulta" replace />} />
          <Route path="/consulta" element={<Consulta />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/relatorios/:id" element={<RelatorioCliente />} />
          <Route path="/equipamentos" element={<Equipamentos />} />
          <Route path="/documentos" element={<Documentos />} />
          <Route path="/cronograma" element={<Cronograma />} />
          <Route path="/notificacoes" element={<Notificacoes />} />
          <Route path="/inicio" element={<Home />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/consulta" replace />} />
    </Routes>
  )
}
