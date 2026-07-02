import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, urlArquivo, type ClienteVisivel, type DocEquip, type Equipamento, type Visita } from '../lib/api'
import { Avatar } from '../components/Avatar'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { STATUS_VISITA, isoData } from '../lib/format'

const STATUS_ALL = ['agendada', 'pendente', 'concluida', 'cancelada']

/** Relatório do cliente: indicadores, técnicos, atividades, equipamentos e documentos. */
export default function RelatorioCliente() {
  const { id } = useParams()
  const cid = Number(id)
  const [cliente, setCliente] = useState<ClienteVisivel | null>(null)
  const [atividades, setAtividades] = useState<Visita[]>([])
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [documentos, setDocumentos] = useState<DocEquip[]>([])
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setErro(null)
    api.clientesVisiveis().then((cs) => setCliente(cs.find((c) => c.id === cid) ?? null)).catch((e) => setErro(e instanceof Error ? e.message : 'Falha ao carregar'))
    api.cronograma.atividades().then((vs) => setAtividades(vs.filter((v) => v.cliente_id === cid))).catch(() => {})
    api.equipamentosCliente(cid).then(setEquipamentos).catch(() => setEquipamentos([]))
    api.biblioteca.listar({ categoria: 'cliente', cliente_id: cid }).then(setDocumentos).catch(() => setDocumentos([]))
  }, [cid])

  // Indicadores derivados das atividades do cliente.
  const ind = useMemo(() => {
    const hoje = isoData(new Date())
    const porStatus = Object.fromEntries(STATUS_ALL.map((s) => [s, atividades.filter((v) => v.status === s).length]))
    const atrasadas = atividades.filter((v) => (v.status === 'agendada' || v.status === 'pendente') && v.data < hoje).length
    return { total: atividades.length, porStatus, atrasadas }
  }, [atividades])

  // Técnicos que atendem o cliente (dedup das atividades).
  const tecnicos = useMemo(() => {
    const m = new Map<number, { id: number; nome: string; foto: string | null }>()
    atividades.forEach((v) => v.tecnicos.forEach((t) => m.set(t.id, t)))
    return [...m.values()].sort((a, b) => a.nome.localeCompare(b.nome))
  }, [atividades])

  // #R2-TIPOS: O.S. separadas por tipo (mais recentes primeiro).
  const porTipo = useMemo(() => {
    const ord = (arr: Visita[]) => [...arr].sort((a, b) => b.data.localeCompare(a.data))
    return {
      preventiva: ord(atividades.filter((v) => v.tipo === 'preventiva')),
      corretiva: ord(atividades.filter((v) => v.tipo === 'corretiva')),
    }
  }, [atividades])

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <Link to="/relatorios" className="text-sm text-primary hover:underline">← Relatórios</Link>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        {!cliente && !erro && <p className="text-sm text-muted-foreground">Cliente não encontrado.</p>}
        {cliente && (
          <>
            <div className="flex items-center gap-3">
              <Avatar nome={cliente.nome} fotoUrl={cliente.logo_url} cor={cliente.cor} className="h-14 w-14 text-base" />
              <div>
                <h1 className="text-xl font-semibold">{cliente.nome}</h1>
                <p className="text-sm text-muted-foreground">{cliente.unidade ?? '—'}</p>
              </div>
            </div>

            {/* Indicadores */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border bg-card p-3 text-center">
                <div className="text-2xl font-bold">{ind.total}</div>
                <div className="text-xs text-muted-foreground">atividades</div>
              </div>
              <div className="rounded-xl border bg-card p-3 text-center">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{ind.porStatus['concluida'] ?? 0}</div>
                <div className="text-xs text-muted-foreground">concluídas</div>
              </div>
              <div className="rounded-xl border bg-card p-3 text-center">
                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{ind.atrasadas}</div>
                <div className="text-xs text-muted-foreground">atrasadas</div>
              </div>
              <Link to={`/equipamentos/lista/${cid}`} className="rounded-xl border bg-card p-3 text-center hover:bg-accent">
                <div className="text-2xl font-bold">{equipamentos.length}</div>
                <div className="text-xs text-muted-foreground">equipamentos ↗</div>
              </Link>
            </div>

            {/* Técnicos que atendem */}
            <Card>
              <CardHeader><CardTitle className="text-base">Técnicos que atendem ({tecnicos.length})</CardTitle></CardHeader>
              <CardContent>
                {tecnicos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum técnico com atividade registrada.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tecnicos.map((t) => (
                      <span key={t.id} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                        <Avatar nome={t.nome} fotoUrl={t.foto ?? undefined} className="h-6 w-6 text-[9px]" /> {t.nome}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* O.S. por tipo (#R2-TIPOS) */}
            <div className="grid gap-4 md:grid-cols-2">
              {([
                ['Manutenção Preventiva', porTipo.preventiva],
                ['Manutenção Corretiva', porTipo.corretiva],
              ] as const).map(([titulo, lista]) => (
                <Card key={titulo}>
                  <CardHeader><CardTitle className="text-base">{titulo} ({lista.length})</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma O.S.</p>}
                    {lista.map((v) => (
                      <Link key={v.id} to={`/cronograma/atividade/${v.id}`} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm hover:bg-accent">
                        <span className="min-w-0 flex-1 truncate">{v.titulo}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{v.data}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${STATUS_VISITA[v.status] ?? ''}`}>{v.status}</span>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Documentos do cliente */}
            <Card>
              <CardHeader><CardTitle className="text-base">Documentos ({documentos.length})</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {documentos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum documento. (Adicione em <Link to="/documentos?cat=clientes" className="text-primary hover:underline">Documentos → Clientes</Link>.)</p>
                ) : (
                  documentos.map((d) => (
                    <a key={d.id} href={urlArquivo(d.url)} download className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent">
                      <span className="truncate">📄 {d.nome}</span>
                    </a>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
