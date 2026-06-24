import { useState } from 'react'

/**
 * Logo da IBSystems. Usa `/logo.png` (coloque o arquivo em `frontend/public/logo.png`).
 * Se a imagem não existir, cai num texto "IBSystems" com o gradiente da marca —
 * o gradiente vem de CSS vars inline (funciona mesmo sem rebuild do Tailwind).
 */
export function Logo({ className = '' }: { className?: string }) {
  const [erro, setErro] = useState(false)

  if (erro) {
    return (
      <span
        className={`bg-clip-text text-lg font-extrabold tracking-tight text-transparent ${className}`}
        style={{
          backgroundImage: 'linear-gradient(90deg, hsl(var(--brand)), hsl(var(--brand-2)))',
        }}
      >
        IBSystems
      </span>
    )
  }

  return (
    <img
      src="/logo.png"
      alt="IBSystems"
      className={`h-8 w-auto ${className}`}
      onError={() => setErro(true)}
    />
  )
}
