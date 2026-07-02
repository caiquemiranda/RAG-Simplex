import { Link } from 'react-router-dom'
import { useNotificacoes } from '../notificacoes/NotificacoesContext'
import { Button } from '../components/ui/button'
import { IconExternal } from '../components/icons'
import type { Notificacao } from '../lib/api'

/** Destino da notificação: atividade (cronograma), calendário (feriado) ou conversa (chat). */
function destino(n: Notificacao): string | null {
  if (n.tipo === 'cronograma' && n.ref_id) return `/cronograma/atividade/${n.ref_id}`
  if (n.tipo === 'feriado') return '/cronograma'
  if (n.tipo === 'chat' && n.ref_id) return `/conversas/${n.ref_id}`
  return null
}

export default function Notificacoes() {
  const { itens, naoLidas, marcarLida, marcarTodas } = useNotificacoes()

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Notificações</h1>
          {naoLidas > 0 && (
            <Button variant="outline" size="sm" onClick={marcarTodas}>Marcar todas como lidas</Button>
          )}
        </div>

        {itens.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma notificação.</p>}

        <div className="space-y-2">
          {itens.map((n) => {
            const para = destino(n)
            const corpo = (
              <>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.lida ? 'bg-transparent' : 'bg-primary'}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{n.titulo}</span>
                  {n.texto && <span className="block text-xs text-muted-foreground">{n.texto}</span>}
                  <span className="block text-[11px] text-muted-foreground">
                    {new Date(n.criado_em).toLocaleString('pt-BR')}
                    {para && <span className="ml-1 inline-flex items-center gap-0.5 text-primary">· abrir <IconExternal className="h-3 w-3" /></span>}
                  </span>
                </span>
              </>
            )
            const cls = `flex w-full items-start gap-3 rounded-lg border p-3 text-left ${n.lida ? 'opacity-70' : 'bg-accent/40'}`
            return para ? (
              <Link key={n.id} to={para} onClick={() => !n.lida && marcarLida(n.id)} className={cls}>{corpo}</Link>
            ) : (
              <button key={n.id} onClick={() => !n.lida && marcarLida(n.id)} className={cls}>{corpo}</button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
