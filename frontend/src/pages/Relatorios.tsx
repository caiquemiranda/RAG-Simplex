import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type ResumoCliente } from '../lib/api'
import { Avatar } from '../components/Avatar'

/** Disponibilidade = equipamentos Operando / total (%). */
function disponibilidade(r: ResumoCliente): number {
  if (r.equip_total === 0) return 0
  return Math.round((r.equip_operando / r.equip_total) * 100)
}

export default function Relatorios() {
  const navegar = useNavigate()
  const [itens, setItens] = useState<ResumoCliente[]>([])
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    api.relatoriosResumo().then(setItens).catch((e) => setErro(e instanceof Error ? e.message : 'Falha ao carregar'))
  }, [])

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <h1 className="text-lg font-semibold">Relatórios por cliente</h1>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        {itens.length === 0 && !erro && (
          <p className="text-sm text-muted-foreground">Nenhum cliente disponível.</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {itens.map((r) => {
            const disp = disponibilidade(r)
            const dispCor = disp >= 90 ? 'bg-emerald-500' : disp >= 70 ? 'bg-amber-500' : 'bg-rose-500'
            return (
              <button
                key={r.cliente_id}
                onClick={() => navegar(`/relatorios/${r.cliente_id}`)}
                className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition hover:border-primary hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <Avatar nome={r.nome} fotoUrl={r.logo_url} cor={r.cor} className="h-12 w-12 text-sm" />
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{r.nome}</div>
                    <div className="truncate text-xs text-muted-foreground">{r.unidade ?? '—'}</div>
                  </div>
                </div>

                {/* Disponibilidade dos equipamentos */}
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Disponibilidade</span>
                    <span className="font-semibold tabular-nums">{disp}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-muted">
                    <div className={`h-full ${dispCor}`} style={{ width: `${disp}%` }} />
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {r.equip_operando}/{r.equip_total} operando{r.equip_falha > 0 ? ` · ${r.equip_falha} em falha` : ''}
                  </div>
                </div>

                {/* O.S. por tipo */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-sky-100 py-1.5 dark:bg-sky-900/40">
                    <div className="text-lg font-bold text-sky-700 dark:text-sky-200">{r.os_preventiva}</div>
                    <div className="text-[10px] text-muted-foreground">preventivas</div>
                  </div>
                  <div className="rounded-lg bg-orange-100 py-1.5 dark:bg-orange-900/40">
                    <div className="text-lg font-bold text-orange-700 dark:text-orange-200">{r.os_corretiva}</div>
                    <div className="text-[10px] text-muted-foreground">corretivas</div>
                  </div>
                  <div className="rounded-lg bg-muted py-1.5">
                    <div className="text-lg font-bold">{r.os_abertas}</div>
                    <div className="text-[10px] text-muted-foreground">abertas</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
