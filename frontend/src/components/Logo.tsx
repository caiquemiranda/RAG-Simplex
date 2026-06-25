import { useState } from 'react'

/** Wordmark IBSystems em SVG (fundo transparente, gradiente da marca, escala com a altura). */
function Wordmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 224 54" className={className} role="img" aria-label="IBSystems">
      <defs>
        <linearGradient id="ib-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--brand))' }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--brand-2))' }} />
        </linearGradient>
      </defs>
      <text x="0" y="36" fontFamily="system-ui, Segoe UI, sans-serif" fontSize="36" fontWeight="800" letterSpacing="-1" fill="url(#ib-grad)">
        IBSystems
      </text>
      <text x="3" y="50" fontFamily="system-ui, Segoe UI, sans-serif" fontSize="8.5" fontWeight="600" letterSpacing="3.5" fill="hsl(var(--brand-2))">
        INTELLIGENT BUILDING
      </text>
    </svg>
  )
}

/**
 * Logo da IBSystems. Prefere `/logo.svg` (coloque um SVG **transparente** em
 * `frontend/public/logo.svg`); se não houver, usa o wordmark SVG embutido — sem
 * fundo, escalável e na cor da marca.
 */
export function Logo({ className = 'h-9' }: { className?: string }) {
  const [erro, setErro] = useState(false)
  if (erro) return <Wordmark className={`w-auto ${className}`} />
  return (
    <img src="/logo.svg" alt="IBSystems" className={`w-auto ${className}`} onError={() => setErro(true)} />
  )
}
