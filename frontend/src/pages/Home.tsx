import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type DocumentoTecnico, type Visita } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { useNotificacoes } from '../notificacoes/NotificacoesContext'
import { Avatar } from '../components/Avatar'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

const STATUS_COR: Record<string, string> = {
  agendada: 'bg-blue-100 text-blue-700',
  concluida: 'bg-emerald-100 text-emerald-700',
  cancelada: 'bg-rose-100 text-rose-700',
}

function saudacao(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function statusDoc(validade: string | null): { label: string; cls: string } | null {
  if (!validade) return null
  const dias = Math.ceil((new Date(validade + 'T00:00:00').getTime() - Date.now()) / 86400000)
  if (dias < 0) return { label: `vencido há ${-dias}d`, cls: 'bg-red-100 text-red-700' }
  if (dias <= 30) return { label: `vence em ${dias}d`, cls: 'bg-amber-100 text-amber-700' }
  return { label: 'válido', cls: 'bg-emerald-100 text-emerald-700' }
}

export default function Home() {
  const { usuario } = useAuth()
  const { naoLidas } = useNotificacoes()
  const podeGerir = usuario?.permissoes.includes('gerir_usuarios') ?? false
  const [hojeVisitas, setHojeVisitas] = useState<Visita[]>([])
  const [docs, setDocs] = useState<DocumentoTecnico[]>([])

  useEffect(() => {
    const hoje = new Date()
    const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
    api.cronograma.listar(iso, iso).then(setHojeVisitas).catch(() => {})
    api.meusDocumentos().then(setDocs).catch(() => {})
  }, [])

  const locais = Array.from(
    new Set(hojeVisitas.map((v) => v.cliente_nome).filter(Boolean) as string[]),
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {saudacao()}, {usuario?.nome || usuario?.email} 👋
          </h1>
          {!podeGerir && locais.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              📍 Hoje você estará em: <strong>{locais.join(', ')}</strong>
            </p>
          )}
        </div>

        {/* Atividades de hoje */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {podeGerir ? 'Atividades de hoje' : 'Suas atividades de hoje'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hojeVisitas.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma atividade para hoje.</p>
            )}
            {hojeVisitas.map((v) => (
              <div key={v.id} className="flex items-center gap-3 rounded-lg border p-2 text-sm">
                <Avatar nome={v.tecnico_nome} fotoUrl={v.tecnico_foto} className="h-9 w-9" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{v.titulo}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[11px] ${STATUS_COR[v.status] ?? 'bg-muted'}`}>{v.status}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {podeGerir && <>{v.tecnico_nome} · </>}
                    📍 {v.cliente_nome ?? '—'}{v.unidade ? ` (${v.unidade})` : ''}
                  </div>
                </div>
              </div>
            ))}
            <Link to="/cronograma" className="inline-block pt-1 text-sm text-primary hover:underline">
              Ver cronograma →
            </Link>
          </CardContent>
        </Card>

        {/* Notificações + atalhos */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Notificações</CardTitle></CardHeader>
            <CardContent className="text-sm">
              {naoLidas > 0 ? (
                <p>Você tem <strong>{naoLidas}</strong> não lida(s).</p>
              ) : (
                <p className="text-muted-foreground">Tudo em dia.</p>
              )}
              <Link to="/notificacoes" className="mt-2 inline-block text-primary hover:underline">Abrir notificações →</Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Atalhos</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <Link to="/consulta" className="text-primary hover:underline">Nova consulta ao assistente →</Link>
              {podeGerir && <Link to="/admin" className="text-primary hover:underline">Painel ADM →</Link>}
            </CardContent>
          </Card>
        </div>

        {/* Seus documentos */}
        {docs.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Seus documentos</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {docs.map((d) => {
                const s = statusDoc(d.validade)
                return (
                  <div key={d.id} className="flex items-center gap-2">
                    <span className="flex-1 truncate">{d.nome}</span>
                    <span className="text-xs text-muted-foreground">{d.validade ?? '—'}</span>
                    {s && <span className={`rounded px-1.5 py-0.5 text-[11px] ${s.cls}`}>{s.label}</span>}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
