import { useNotificacoes } from '../notificacoes/NotificacoesContext'
import { Button } from '../components/ui/button'

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
          {itens.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.lida && marcarLida(n.id)}
              className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left ${n.lida ? 'opacity-70' : 'bg-accent/40'}`}
            >
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.lida ? 'bg-transparent' : 'bg-primary'}`} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{n.titulo}</span>
                {n.texto && <span className="block text-xs text-muted-foreground">{n.texto}</span>}
                <span className="block text-[11px] text-muted-foreground">
                  {new Date(n.criado_em).toLocaleString('pt-BR')}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
