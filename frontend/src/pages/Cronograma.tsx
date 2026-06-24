import { useMemo, useState } from 'react'

/** Técnicos e seus locais de trabalho (placeholder — virá do backend). */
const TECNICOS = [
  { id: 'todos', nome: 'Todos os locais' },
  { id: 'sp', nome: 'João — Matriz SP' },
  { id: 'rj', nome: 'Maria — Filial RJ' },
]

type Evento = { dia: number; titulo: string; cor: string }

/** Eventos de exemplo por local (placeholder para visualizar o calendário). */
const EVENTOS: Record<string, Evento[]> = {
  sp: [
    { dia: 4, titulo: 'Manutenção 4100', cor: 'bg-blue-100 text-blue-700' },
    { dia: 12, titulo: 'Inspeção QE90', cor: 'bg-amber-100 text-amber-700' },
    { dia: 23, titulo: 'Troca de fonte', cor: 'bg-rose-100 text-rose-700' },
  ],
  rj: [
    { dia: 8, titulo: 'Comissionamento F3200', cor: 'bg-emerald-100 text-emerald-700' },
    { dia: 19, titulo: 'Ronda IMS', cor: 'bg-violet-100 text-violet-700' },
  ],
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function Cronograma() {
  const hoje = new Date()
  const [ref, setRef] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() })
  const [local, setLocal] = useState('todos')

  const eventos = useMemo<Evento[]>(
    () => (local === 'todos' ? [...EVENTOS.sp, ...EVENTOS.rj] : EVENTOS[local] ?? []),
    [local],
  )

  const inicioSemana = new Date(ref.ano, ref.mes, 1).getDay() // 0 = domingo
  const titulo = new Date(ref.ano, ref.mes, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  function mover(delta: number) {
    setRef((r) => {
      const d = new Date(r.ano, r.mes + delta, 1)
      return { ano: d.getFullYear(), mes: d.getMonth() }
    })
  }
  function irHoje() {
    setRef({ ano: hoje.getFullYear(), mes: hoje.getMonth() })
  }

  const celulas = Array.from({ length: 42 }, (_, i) => {
    const data = new Date(ref.ano, ref.mes, i - inicioSemana + 1)
    const doMes = data.getMonth() === ref.mes
    const ehHoje =
      data.getFullYear() === hoje.getFullYear() &&
      data.getMonth() === hoje.getMonth() &&
      data.getDate() === hoje.getDate()
    const evs = doMes ? eventos.filter((e) => e.dia === data.getDate()) : []
    return { data, doMes, ehHoje, evs }
  })

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button className="rounded-lg border px-2 py-1 text-sm hover:bg-accent" onClick={() => mover(-1)} aria-label="Mês anterior">‹</button>
            <button className="rounded-lg border px-3 py-1 text-sm hover:bg-accent" onClick={irHoje}>Hoje</button>
            <button className="rounded-lg border px-2 py-1 text-sm hover:bg-accent" onClick={() => mover(1)} aria-label="Próximo mês">›</button>
            <h1 className="ml-2 text-lg font-semibold capitalize">{titulo}</h1>
          </div>
          <select
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            {TECNICOS.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>
        </div>

        {/* Grade do mês */}
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-medium text-muted-foreground">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {celulas.map((c, i) => (
              <div
                key={i}
                className={`min-h-[92px] border-b border-r p-1.5 ${
                  c.doMes ? '' : 'bg-muted/30 text-muted-foreground'
                }`}
              >
                <div className="flex justify-end">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      c.ehHoje ? 'bg-primary font-semibold text-primary-foreground' : ''
                    }`}
                  >
                    {c.data.getDate()}
                  </span>
                </div>
                <div className="mt-1 space-y-1">
                  {c.evs.map((e, j) => (
                    <div key={j} className={`truncate rounded px-1.5 py-0.5 text-[11px] ${e.cor}`} title={e.titulo}>
                      {e.titulo}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          🚧 Em construção — dados de exemplo. Cada técnico verá o cronograma do seu
          <strong> local de trabalho</strong>; criação/edição de visitas e integração com o
          backend virão a seguir.
        </p>
      </div>
    </div>
  )
}
