import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Tema = 'claro' | 'escuro'

const ThemeContext = createContext<{ tema: Tema; alternar: () => void }>({
  tema: 'claro',
  alternar: () => {},
})

function temaInicial(): Tema {
  const salvo = localStorage.getItem('rag-tema')
  if (salvo === 'claro' || salvo === 'escuro') return salvo
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}

/** Aplica o tema (classe `dark` no <html>) e persiste a preferência por usuário/máquina. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(temaInicial)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'escuro')
    localStorage.setItem('rag-tema', tema)
  }, [tema])

  return (
    <ThemeContext.Provider value={{ tema, alternar: () => setTema((t) => (t === 'claro' ? 'escuro' : 'claro')) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTema = () => useContext(ThemeContext)
