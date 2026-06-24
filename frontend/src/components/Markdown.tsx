import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** Extrai o texto puro de uma árvore de nós React (para detectar o aviso). */
function paraTexto(node: React.ReactNode): string {
  if (node == null) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(paraTexto).join('')
  if (React.isValidElement(node)) {
    return paraTexto((node.props as { children?: React.ReactNode }).children)
  }
  return ''
}

/** Renderiza markdown (GFM) com tipografia Tailwind. Blocos de citação que
 *  contêm o AVISO DE SEGURANÇA viram uma caixa de alerta em destaque. */
export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none break-words dark:prose-invert prose-headings:mb-1 prose-headings:mt-3 prose-p:my-2 prose-li:my-0.5 prose-pre:my-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          blockquote({ children }) {
            const aviso = paraTexto(children).includes('AVISO DE SEGURANÇA')
            return (
              <blockquote
                className={
                  aviso
                    ? 'not-prose my-3 rounded-md border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-900'
                    : 'not-prose my-3 rounded-md border-l-4 border-muted-foreground/30 bg-muted px-3 py-2 text-sm text-muted-foreground'
                }
              >
                {children}
              </blockquote>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
