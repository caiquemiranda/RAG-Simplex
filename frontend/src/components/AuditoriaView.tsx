import { useEffect, useState } from 'react'
import { api, type AdminAuditoria } from '../lib/api'
import { Card, CardContent } from './ui/card'

function feedbackIcone(v: number | null): string {
  if (v === 1) return '👍'
  if (v === -1) return '👎'
  return '—'
}

/** Lista as consultas registradas (auditoria — PRD §6.2). */
export function AuditoriaView({ emailPorId }: { emailPorId: Record<number, string> }) {
  const [itens, setItens] = useState<AdminAuditoria[]>([])
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    api.admin
      .auditoria(100)
      .then(setItens)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Falha ao carregar'))
  }, [])

  return (
    <Card>
      <CardContent className="p-0">
        {erro && <p className="p-3 text-sm text-destructive">{erro}</p>}
        <table className="w-full text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr>
              <th className="p-3">Quando</th>
              <th className="p-3">Usuário</th>
              <th className="p-3">Pergunta</th>
              <th className="p-3">Estratégia</th>
              <th className="p-3">Fallback</th>
              <th className="p-3">Feedback</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((it) => (
              <tr key={it.id} className="border-b last:border-0 align-top">
                <td className="whitespace-nowrap p-3 text-muted-foreground">
                  {new Date(it.criado_em).toLocaleString('pt-BR')}
                </td>
                <td className="p-3">
                  {it.usuario_id != null ? (emailPorId[it.usuario_id] ?? `#${it.usuario_id}`) : '—'}
                </td>
                <td className="max-w-xs truncate p-3" title={it.pergunta}>
                  {it.pergunta}
                </td>
                <td className="p-3">{it.estrategia}</td>
                <td className="p-3">{it.fallback ? 'sim' : 'não'}</td>
                <td className="p-3">{feedbackIcone(it.feedback)}</td>
              </tr>
            ))}
            {itens.length === 0 && !erro && (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={6}>
                  Nenhuma consulta registrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
