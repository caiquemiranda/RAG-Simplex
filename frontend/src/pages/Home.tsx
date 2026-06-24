import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

export default function Home() {
  const { usuario } = useAuth()
  const pode = (p: string) => usuario?.permissoes.includes(p) ?? false

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Bem-vindo, {usuario?.nome || usuario?.email}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Papel: <strong>{usuario?.papel ?? '—'}</strong>
            </p>
            <p className="text-muted-foreground">
              Permissões: {usuario?.permissoes.join(', ') || '—'}
            </p>
          </CardContent>
        </Card>

        {pode('consultar') && (
          <Link
            to="/consulta"
            className="inline-block text-sm font-medium text-primary hover:underline"
          >
            → Abrir o assistente
          </Link>
        )}
      </div>
    </div>
  )
}
