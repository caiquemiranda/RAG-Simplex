import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { Markdown } from './Markdown'
import { Button } from './ui/button'

/** Slug a partir do texto de um cabeçalho (para casar fonte ↔ seção do documento).
 *  Aplicado igualmente aos dois lados, então a normalização só precisa ser
 *  consistente (acentos viram '-' pelo filtro a-z0-9). */
function slug(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

type Secao = { id: string; header: string; corpo: string }

/** Divide o markdown em seções por cabeçalho (cada `#`…`######` inicia uma seção). */
function dividirEmSecoes(md: string): Secao[] {
  const secoes: Secao[] = []
  let header = ''
  let buffer: string[] = []
  const empurrar = () => {
    if (header || buffer.join('').trim()) {
      secoes.push({ id: slug(header) || 'inicio', header, corpo: buffer.join('\n') })
    }
  }
  for (const linha of md.split('\n')) {
    const m = /^(#{1,6})\s+(.*)$/.exec(linha)
    if (m) {
      empurrar()
      header = m[2].trim()
      buffer = [linha] // mantém a linha do cabeçalho no corpo renderizado
    } else {
      buffer.push(linha)
    }
  }
  empurrar()
  return secoes
}

export function DocumentoPanel({
  nome,
  alvoHeader,
  onFechar,
}: {
  nome: string
  alvoHeader: string
  onFechar: () => void
}) {
  const [secoes, setSecoes] = useState<Secao[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const alvoRef = useRef<HTMLDivElement>(null)
  const alvoId = slug(alvoHeader)

  useEffect(() => {
    setSecoes(null)
    setErro(null)
    api
      .documento(nome)
      .then((d) => setSecoes(dividirEmSecoes(d.conteudo)))
      .catch((e) => setErro(e instanceof Error ? e.message : 'Falha ao carregar o documento'))
  }, [nome])

  useEffect(() => {
    if (secoes && alvoRef.current) {
      alvoRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [secoes, alvoHeader])

  return (
    <div className="flex h-full w-1/2 flex-col border-l">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b p-3">
        <div className="truncate text-sm font-medium" title={nome}>
          📄 {nome}
        </div>
        <Button variant="ghost" size="sm" onClick={onFechar}>
          Fechar ✕
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        {!secoes && !erro && (
          <p className="text-sm text-muted-foreground">Carregando documento…</p>
        )}
        {secoes?.map((s, i) => {
          const ehAlvo = !!alvoId && s.id === alvoId
          return (
            <div
              key={i}
              ref={ehAlvo ? alvoRef : undefined}
              className={
                ehAlvo ? 'scroll-mt-4 rounded-md bg-yellow-100 p-2 ring-2 ring-yellow-400' : ''
              }
            >
              <Markdown content={s.corpo} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
