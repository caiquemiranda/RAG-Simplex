import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './auth/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import Consulta from './pages/Consulta'
import Admin from './pages/Admin'
import ClienteAdmin from './pages/ClienteAdmin'
import Relatorios from './pages/Relatorios'
import RelatorioCliente from './pages/RelatorioCliente'
import Equipamentos from './pages/Equipamentos'
import EquipamentosLista from './pages/EquipamentosLista'
import EquipamentoPagina from './pages/EquipamentoPagina'
import SobreEquipamento from './pages/SobreEquipamento'
import DocumentoPreventiva from './pages/DocumentoPreventiva'
import Documentos from './pages/Documentos'
import Cronograma from './pages/Cronograma'
import Atividade from './pages/Atividade'
import Atividades from './pages/Atividades'
import Conversas from './pages/Conversas'
import Conversa from './pages/Conversa'
import Notificacoes from './pages/Notificacoes'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        {/* Fora do Layout — documento em folha cheia para impressão (#PREV-DOC) */}
        <Route path="/preventiva/:listaId" element={<DocumentoPreventiva />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/inicio" replace />} />
          <Route path="/consulta" element={<Consulta />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/relatorios/:id" element={<RelatorioCliente />} />
          <Route path="/equipamentos" element={<Equipamentos />} />
          <Route path="/equipamentos/sobre" element={<SobreEquipamento />} />
          <Route path="/equipamentos/lista" element={<EquipamentosLista />} />
          <Route path="/equipamentos/lista/:id" element={<EquipamentosLista />} />
          <Route path="/equipamentos/:clienteId/:eqpId" element={<EquipamentoPagina />} />
          <Route path="/documentos" element={<Documentos />} />
          <Route path="/cronograma" element={<Cronograma />} />
          <Route path="/cronograma/atividades" element={<Atividades />} />
          <Route path="/cronograma/atividade/:id" element={<Atividade />} />
          <Route path="/conversas" element={<Conversas />} />
          <Route path="/conversas/:usuarioId" element={<Conversa />} />
          <Route path="/notificacoes" element={<Notificacoes />} />
          <Route path="/inicio" element={<Home />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/cliente/:id" element={<ClienteAdmin />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/inicio" replace />} />
    </Routes>
  )
}
