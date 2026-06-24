import { useState } from 'react'

/**
 * Logo da IBSystems. Usa `/logo.png` (coloque o arquivo em `frontend/public/logo.png`).
 * Se a imagem não existir, cai num texto "IBSystems" com o gradiente da marca.
 */
export function Logo({ className = '' }: { className?: string }) {
  const [erro, setErro] = useState(false)

  if (erro) {
    return (
      <span className={`bg-gradient-to-r from-brand to-brand-2 bg-clip-text font-extrabold tracking-tight text-transparent ${className}`}>
        IBSystems
      </span>
    )
  }

  return (
    <img
      src="/logo.png"
      alt="IBSystems"
      className={`h-7 w-auto ${className}`}
      onError={() => setErro(true)}
    />
  )
}
