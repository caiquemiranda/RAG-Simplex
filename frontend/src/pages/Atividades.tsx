import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Visita } from '../lib/api'
import { Avatar } from '../components/Avatar'
import { STATUS_VISITA, isoData } from '../lib/format'

/** Prazo da atividade em relação a hoje: faltam N dias / atrasada há N / hoje. */
function prazo(data: string, status: string): { label: string; cls: string } {
  if (status === 'concluida') return { label: 'concluída', cls: 'text-emerald-600 dark:text-emerald-400' }
  if (status === 'cancelada') return { label: 'cancelada', cls: 'text-muted-foreground' }
  const hoje = new Date(isoData(new Date()) + 'T00:00:00')
  const d = new Date(data + 'T00:00:00')
  const dias = Math.round((d.getTime() - hoje.getTime()) / 86400000)
  if (dias < 0) return { label: `atrasada há ${-dias} dia(s)`, cls: 'text-rose-600 dark:text-rose-400 font-medium' }
  if (dias === 0) return { label: 'hoje', cls: 'text-amber-600 dark:text-amber-400 font-medium' }
  return { label: `faltam ${dias} dia(s)`, cls: 'text-muted-foreground' }
}

/** Tela "Atividades" (sidebar Cronograma → Atividades): resumo + prazo de cada atividade. */
export default function Atividades() {
  const [itens, setItens] = useState<Visita[]>([])
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    api.cronograma.atividades().then(setItens)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Falha ao carregar atividades'))
  }, [])

  // Pendentes (agendadas) primeiro, ordenadas por data; concluídas/canceladas ao final.
  const ordenadas = useMemo(() => {
    const peso = (s: string) => (s === 'agendada' ? 0 : 1)
    return [...itens].sort((a, b) => peso(a.status) - peso(b.status) || a.data.localeCompare(b.data))
  }, [itens])

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-lg font-semibold">Atividades</h1>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      {ordenadas.length === 0 && !erro && <p className="text-sm text-muted-foreground">Nenhuma atividade.</p>}
      <div className="space-y-2">
        {ordenadas.map((v) => {
          const p = prazo(v.data, v.status)
          return (
            <Link key={v.id} to={`/cronograma/atividade/${v.id}`}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{v.titulo}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${STATUS_VISITA[v.status] ?? ''}`}>{v.status}</span>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  📅 {v.data}{v.cliente_nome ? ` · 📍 ${v.cliente_nome}` : ''}
                </div>
              </div>
              <div className="flex -space-x-2">
                {v.tecnicos.slice(0, 4).map((t) => (
                  <Avatar key={t.id} nome={t.nome} fotoUrl={t.foto ?? undefined} className="h-7 w-7 border-2 border-background text-[9px]" />
                ))}
              </div>
              <span className={`whitespace-nowrap text-xs ${p.cls}`}>{p.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
