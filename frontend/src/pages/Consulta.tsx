import { useState, type FormEvent } from 'react'
import { api, type RespostaQuery } from '../lib/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

// Versão base da consulta (Fase 7). A renderização rica em markdown da dupla
// camada e o streaming entram na Fase 8.
export default function Consulta() {
  const [pergunta, setPergunta] = useState('')
  const [resposta, setResposta] = useState<RespostaQuery | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    setResposta(null)
    try {
      setResposta(await api.query(pergunta))
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha na consulta')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder="Ex.: HEAD MISSING no loop do 4100"
          required
        />
        <Button type="submit" disabled={carregando}>
          {carregando ? '…' : 'Consultar'}
        </Button>
      </form>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      {resposta && (
        <Card>
          <CardHeader>
            <CardTitle>
              {resposta.fallback ? 'Sem correspondência segura' : 'Resposta'}
              {resposta.camadas_exibidas.length > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({resposta.camadas_exibidas.join(', ')})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="whitespace-pre-wrap font-sans text-sm">{resposta.resposta}</pre>
            {resposta.fontes.length > 0 && (
              <div className="border-t pt-2 text-xs text-muted-foreground">
                <span className="font-medium">Fontes: </span>
                {resposta.fontes
                  .map((f) => `${f.header} (${f.similaridade.toFixed(2)})`)
                  .join(' · ')}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
