import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, type ContatoChat, type MensagemChat } from '../lib/api'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/ui/button'

/** Chat 1-a-1 com outro usuário (#CHAT). Polling a cada 5s enquanto aberto. */
export default function Conversa() {
  const { usuarioId } = useParams()
  const oid = Number(usuarioId)
  const [contato, setContato] = useState<ContatoChat | null>(null)
  const [msgs, setMsgs] = useState<MensagemChat[]>([])
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const fimRef = useRef<HTMLDivElement>(null)

  function carregar() {
    api.conversas.historico(oid).then(setMsgs).catch((e) => setErro(e instanceof Error ? e.message : 'Falha ao carregar a conversa'))
  }
  useEffect(() => {
    api.conversas.contatos().then((cs) => setContato(cs.find((c) => c.id === oid) ?? null)).catch(() => {})
    carregar()
    const t = setInterval(carregar, 5000)   // polling
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oid])

  // Rola para a última mensagem quando a lista muda.
  useEffect(() => { fimRef.current?.scrollIntoView({ block: 'end' }) }, [msgs.length])

  async function enviar() {
    const t = texto.trim()
    if (!t) return
    setTexto('')
    try {
      const m = await api.conversas.enviar(oid, t)
      setMsgs((xs) => [...xs, m])
    } catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao enviar'); setTexto(t) }
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col p-4">
      <div className="mb-2 flex items-center gap-2">
        <Link to="/conversas" className="text-sm text-primary hover:underline">← Conversas</Link>
        {contato && (
          <span className="ml-2 inline-flex items-center gap-2 font-medium">
            <Avatar nome={contato.nome} fotoUrl={contato.foto ?? undefined} className="h-7 w-7 text-[10px]" /> {contato.nome}
          </span>
        )}
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}

      {/* Mensagens */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-lg border bg-muted/20 p-3">
        {msgs.length === 0 && <p className="text-center text-sm text-muted-foreground">Nenhuma mensagem ainda. Diga olá!</p>}
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.meu ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-2xl px-3 py-1.5 text-sm ${m.meu ? 'bg-primary text-primary-foreground' : 'border bg-card'}`}>
              <div className="whitespace-pre-wrap break-words">{m.texto}</div>
              <div className={`mt-0.5 text-[10px] ${m.meu ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {new Date(m.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={fimRef} />
      </div>

      {/* Composer */}
      <div className="mt-2 flex items-end gap-2">
        <textarea className="min-h-[44px] flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm" rows={1}
                  aria-label="Mensagem" value={texto} onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
                  placeholder="Escreva uma mensagem…" />
        <Button size="sm" onClick={enviar} disabled={!texto.trim()}>Enviar</Button>
      </div>
    </div>
  )
}
