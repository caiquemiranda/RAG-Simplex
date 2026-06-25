import { urlArquivo } from '../lib/api'

/** Iniciais a partir do nome/e-mail: "Caíque Miranda" → "CM". */
export function iniciais(texto: string): string {
  const p = texto.replace(/@.*/, '').split(/[.\s_-]+/).filter(Boolean)
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || texto[0]?.toUpperCase() || '?'
}

/** Avatar: foto (se houver) ou iniciais. Cor de fundo: `cor` (ex.: do cliente) ou o teal da marca. */
export function Avatar({
  nome,
  fotoUrl,
  className = 'h-8 w-8',
  title,
  cor,
}: {
  nome: string
  fotoUrl?: string | null
  className?: string
  title?: string
  cor?: string | null
}) {
  const titulo = title ?? nome
  if (fotoUrl) {
    // Caminhos relativos do backend (/arquivos/...) viram URL absoluta; data:/http passam direto.
    const src = fotoUrl.startsWith('/') ? urlArquivo(fotoUrl) : fotoUrl
    return (
      <img
        src={src}
        alt={nome}
        title={titulo}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    )
  }
  return (
    <span
      title={titulo}
      style={cor ? { backgroundColor: cor } : undefined}
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground ${className}`}
    >
      {iniciais(nome)}
    </span>
  )
}
