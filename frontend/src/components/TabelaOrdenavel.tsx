import { useMemo, useState, type ReactNode } from 'react'

/** Definição de uma coluna da tabela ordenável (#TAB-ORDEM). */
export type Coluna<T> = {
  chave: string
  titulo: string
  /** Valor usado para ordenar (default: `linha[chave]`). */
  valor?: (linha: T) => string | number | null | undefined
  /** Conteúdo da célula (default: o valor de ordenação). */
  render?: (linha: T) => ReactNode
  className?: string
  /** Desliga a ordenação nesta coluna. */
  ordenavel?: boolean
}

type Ordenacao = { chave: string; dir: 'asc' | 'desc' } | null

function acessar<T>(linha: T, col: Coluna<T>): string | number | null | undefined {
  if (col.valor) return col.valor(linha)
  return (linha as Record<string, unknown>)[col.chave] as string | number | null | undefined
}

/**
 * Tabela genérica com **ordenação por coluna** tipo planilha (#TAB-ORDEM, item 5):
 * clicar no cabeçalho alterna crescente → decrescente → sem ordem (3º clique).
 * Reutilizável (lista de equipamentos, listas salvas etc.).
 */
export function TabelaOrdenavel<T>({
  colunas, linhas, chaveLinha, aoClicarLinha, vazio,
}: {
  colunas: Coluna<T>[]
  linhas: T[]
  chaveLinha: (linha: T) => string | number
  aoClicarLinha?: (linha: T) => void
  vazio?: ReactNode
}) {
  const [ord, setOrd] = useState<Ordenacao>(null)

  function alternar(col: Coluna<T>) {
    if (col.ordenavel === false) return
    setOrd((o) => {
      if (!o || o.chave !== col.chave) return { chave: col.chave, dir: 'asc' }
      if (o.dir === 'asc') return { chave: col.chave, dir: 'desc' }
      return null  // 3º clique limpa
    })
  }

  const ordenadas = useMemo(() => {
    if (!ord) return linhas
    const col = colunas.find((c) => c.chave === ord.chave)
    if (!col) return linhas
    const fator = ord.dir === 'asc' ? 1 : -1
    return [...linhas].sort((a, b) => {
      const va = acessar(a, col), vb = acessar(b, col)
      // Nulos/vazios sempre no fim, independente da direção.
      const na = va == null || va === '', nb = vb == null || vb === ''
      if (na && nb) return 0
      if (na) return 1
      if (nb) return -1
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * fator
      return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true }) * fator
    })
  }, [linhas, colunas, ord])

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            {colunas.map((c) => {
              const ativo = ord?.chave === c.chave
              const seta = ativo ? (ord!.dir === 'asc' ? '▲' : '▼') : ''
              return (
                <th key={c.chave} className={`py-1 pr-2 ${c.className ?? ''} ${c.ordenavel === false ? '' : 'cursor-pointer select-none hover:text-foreground'}`}
                    onClick={() => alternar(c)} title={c.ordenavel === false ? undefined : 'Ordenar'}>
                  <span className="inline-flex items-center gap-1">{c.titulo}<span className="text-[9px]">{seta}</span></span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((linha) => (
            <tr key={chaveLinha(linha)}
                className={`border-b ${aoClicarLinha ? 'cursor-pointer hover:bg-accent/50' : ''}`}
                onClick={aoClicarLinha ? () => aoClicarLinha(linha) : undefined}>
              {colunas.map((c) => (
                <td key={c.chave} className={`py-1 pr-2 ${c.className ?? ''}`}>
                  {c.render ? c.render(linha) : (acessar(linha, c) ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {ordenadas.length === 0 && vazio}
    </div>
  )
}
