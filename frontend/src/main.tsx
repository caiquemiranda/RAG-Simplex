import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider } from './auth/AuthContext'
import { ChatProvider } from './chat/ChatContext'
import { ThemeProvider } from './theme/ThemeContext'
import { NotificacoesProvider } from './notificacoes/NotificacoesContext'

// Aplica o tema salvo antes do render (evita "flash" do tema claro).
{
  const salvo = localStorage.getItem('rag-tema')
  const escuro = salvo ? salvo === 'escuro' : window.matchMedia?.('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', !!escuro)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <NotificacoesProvider>
            <ChatProvider>
              <App />
            </ChatProvider>
          </NotificacoesProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
)
