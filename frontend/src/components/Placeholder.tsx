/** Página em construção (abas ainda sem conteúdo). */
export default function Placeholder({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold">{titulo}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{descricao ?? 'Em breve.'}</p>
        <span className="mt-4 inline-block rounded-full border px-3 py-1 text-xs text-muted-foreground">
          🚧 Em construção
        </span>
      </div>
    </div>
  )
}
