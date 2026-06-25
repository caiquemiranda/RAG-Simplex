import { useState } from 'react'

/** Filtro multi-seleção (botão + dropdown de checkboxes). Genérico p/ ids string ou number. */
export function MultiFiltro<K extends string | number>({ label, todosLabel, opcoes, sel, setSel }: {
  label: string
  todosLabel: string
  opcoes: { id: K; nome: string }[]
  sel: Set<K>
  setSel: (s: Set<K>) => void
}) {
  const [aberto, setAberto] = useState(false)
  function alternar(id: K) {
    const s = new Set(sel)
    s.has(id) ? s.delete(id) : s.add(id)
    setSel(s)
  }
  return (
    <div className="relative">
      <button className="h-9 rounded-md border bg-background px-3 text-sm" onClick={() => setAberto((v) => !v)}>
        {sel.size ? `${label} (${sel.size})` : todosLabel} ▾
      </button>
      {aberto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAberto(false)} />
          <div className="absolute z-20 mt-1 max-h-72 w-56 overflow-auto rounded-md border bg-card p-2 shadow-lg">
            {sel.size > 0 && (
              <button className="mb-1 w-full text-left text-xs text-primary hover:underline" onClick={() => setSel(new Set())}>limpar seleção</button>
            )}
            {opcoes.map((o) => (
              <label key={String(o.id)} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent">
                <input type="checkbox" checked={sel.has(o.id)} onChange={() => alternar(o.id)} />
                <span className="truncate">{o.nome}</span>
              </label>
            ))}
            {opcoes.length === 0 && <p className="px-1 text-xs text-muted-foreground">nenhum</p>}
          </div>
        </>
      )}
    </div>
  )
}
