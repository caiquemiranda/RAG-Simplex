import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, urlArquivo, type ClienteVisivel, type DocEquip } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Logo } from '../components/Logo'
import { Avatar } from '../components/Avatar'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

/** Ícone de documento (SVG, sem emoji — #UI-ICONS). */
const IconDoc = () => (
  <svg className="h-4 w-4 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
  </svg>
)

/** Seleção de grupo aberto (drill-in). null = tela de cards. */
type Sel = { tipo: 'empresa' } | { tipo: 'cliente'; id: number } | { tipo: 'marca'; nome: string } | null

/** Botão de upload (label + input file escondido), alvo de toque ≥44px (#UI-TOUCH). */
function UploadBtn({ label, onFile }: { label: string; onFile: (e: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className="inline-flex min-h-[44px] cursor-pointer items-center rounded-md border bg-background px-3 text-sm hover:bg-accent">
      + {label}
      <input type="file" className="hidden" onChange={onFile} />
    </label>
  )
}

export default function Documentos() {
  const { usuario } = useAuth()
  const podeGerir = usuario?.permissoes.includes('gerir_usuarios') ?? false
  const [params] = useSearchParams()
  const cat = params.get('cat') // empresa | clientes | marcas | null (todas)

  const [docs, setDocs] = useState<DocEquip[]>([])
  const [clientes, setClientes] = useState<ClienteVisivel[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [sel, setSel] = useState<Sel>(null)

  async function recarregar() {
    try {
      const [ds, cs] = await Promise.all([api.biblioteca.listar(), api.clientesVisiveis()])
      setDocs(ds); setClientes(cs)
    } catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao carregar') }
  }
  useEffect(() => { recarregar() }, [])

  async function upar(categoria: string, e: ChangeEvent<HTMLInputElement>, opts: { marca?: string; cliente_id?: number } = {}) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setErro(null)
    try { await api.biblioteca.criar(file, categoria, opts); recarregar() }
    catch (err) { setErro(err instanceof Error ? err.message : 'Falha no upload') }
  }
  async function renomear(d: DocEquip) {
    const nome = window.prompt('Novo nome:', d.nome)
    if (nome && nome.trim() && nome !== d.nome) { await api.biblioteca.atualizar(d.id, { nome: nome.trim() }); recarregar() }
  }
  async function toggleOculto(d: DocEquip) { await api.biblioteca.atualizar(d.id, { oculto: !d.oculto }); recarregar() }
  async function remover(d: DocEquip) {
    if (window.confirm(`Excluir "${d.nome}"?`)) { await api.biblioteca.remover(d.id); recarregar() }
  }

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return q ? docs.filter((d) => d.nome.toLowerCase().includes(q)) : docs
  }, [docs, busca])

  const empresa = filtrados.filter((d) => d.categoria === 'empresa')
  const porCliente = filtrados.filter((d) => d.categoria === 'cliente')
  const porMarca = useMemo(() =>
    filtrados.filter((d) => d.categoria === 'marca')
      .reduce<Record<string, DocEquip[]>>((m, d) => { (m[d.marca] ??= []).push(d); return m }, {}),
    [filtrados])
  const mostra = (k: string) => !cat || cat === k

  function Linha({ d }: { d: DocEquip }) {
    return (
      <div className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm ${d.oculto ? 'opacity-60' : ''}`}>
        <a href={urlArquivo(d.url)} target="_blank" rel="noreferrer" download className="flex min-w-0 flex-1 items-center gap-2 text-primary hover:underline" title="Baixar">
          <IconDoc /><span className="truncate">{d.nome}{d.oculto && ' (oculto)'}</span>
        </a>
        {podeGerir && (
          <>
            <button className="min-h-[44px] px-2 text-xs text-muted-foreground hover:underline" onClick={() => renomear(d)}>renomear</button>
            <button className="min-h-[44px] px-2 text-xs text-muted-foreground hover:underline" onClick={() => toggleOculto(d)}>{d.oculto ? 'mostrar' : 'ocultar'}</button>
            <button className="min-h-[44px] px-2 text-xs text-destructive hover:underline" onClick={() => remover(d)}>excluir</button>
          </>
        )}
      </div>
    )
  }

  /** Card de grupo (empresa/cliente/marca): imagem + nome + contagem. */
  function CardGrupo({ img, cor, nome, sub, n, onClick }: { img?: ReactNode; cor?: string | null; nome: string; sub?: string; n: number; onClick: () => void }) {
    return (
      <button onClick={onClick}
              className="flex min-h-[44px] items-center gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition hover:border-primary hover:shadow-md">
        {img ?? <Avatar nome={nome} cor={cor ?? undefined} className="h-12 w-12 text-sm" />}
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{nome}</div>
          {sub && <div className="truncate text-xs text-muted-foreground">{sub}</div>}
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium tabular-nums">{n}</span>
      </button>
    )
  }

  // ---- Drill-in: documentos do grupo selecionado + upload contextual ----
  if (sel) {
    let titulo = 'Empresa'
    let lista: DocEquip[] = empresa
    let uploader: ReactNode = null
    let img: ReactNode = <Logo className="h-8" />
    if (sel.tipo === 'empresa') {
      uploader = podeGerir && <UploadBtn label="Enviar documento" onFile={(e) => upar('empresa', e)} />
    } else if (sel.tipo === 'cliente') {
      const c = clientes.find((x) => x.id === sel.id)
      titulo = c?.nome ?? 'Cliente'
      lista = porCliente.filter((d) => d.cliente_id === sel.id)
      img = <Avatar nome={titulo} fotoUrl={c?.logo_url} cor={c?.cor} className="h-8 w-8 text-xs" />
      uploader = podeGerir && <UploadBtn label="Enviar documento do cliente" onFile={(e) => upar('cliente', e, { cliente_id: sel.id })} />
    } else {
      titulo = sel.nome
      lista = porMarca[sel.nome] ?? []
      img = <Avatar nome={titulo} className="h-8 w-8 text-xs" />
      uploader = podeGerir && <UploadBtn label="Enviar manual/datasheet" onFile={(e) => upar('marca', e, { marca: sel.nome })} />
    }
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <button className="min-h-[44px] text-sm text-primary hover:underline" onClick={() => setSel(null)}>← Documentos</button>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">{img}<CardTitle className="text-base">{titulo}</CardTitle></div>
            {uploader}
          </CardHeader>
          <CardContent className="space-y-1.5">
            {lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhum documento.</p>}
            {lista.map((d) => <Linha key={d.id} d={d} />)}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---- Landing: cards por grupo ----
  const marcas = Object.keys(porMarca).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">Documentos{cat && <span className="text-sm font-normal text-muted-foreground"> · {cat}</span>}</h1>
          <Input className="w-64" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar documento" placeholder="Buscar documento…" />
        </div>
        {erro && <p className="text-sm text-destructive">{erro}</p>}

        {/* Empresa */}
        {mostra('empresa') && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Empresa</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <CardGrupo img={<Logo className="h-10" />} nome="IBSystems" sub="Documentos da empresa" n={empresa.length} onClick={() => setSel({ tipo: 'empresa' })} />
            </div>
          </section>
        )}

        {/* Clientes — um card por cliente */}
        {mostra('clientes') && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clientes</h2>
            {clientes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum cliente.</p> : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {clientes.map((c) => (
                  <CardGrupo key={c.id} cor={c.cor} nome={c.nome} sub={c.unidade ?? undefined}
                             n={porCliente.filter((d) => d.cliente_id === c.id).length}
                             img={<Avatar nome={c.nome} fotoUrl={c.logo_url} cor={c.cor} className="h-12 w-12 text-sm" />}
                             onClick={() => setSel({ tipo: 'cliente', id: c.id })} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Marcas — um card por marca */}
        {mostra('marcas') && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Marcas (equipamentos)</h2>
              {podeGerir && (
                <button className="min-h-[44px] text-xs text-primary hover:underline"
                        onClick={() => { const m = window.prompt('Nome da marca (ex.: Simplex):'); if (m && m.trim()) setSel({ tipo: 'marca', nome: m.trim() }) }}>
                  + Nova marca
                </button>
              )}
            </div>
            {marcas.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum documento de marca.</p> : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {marcas.map((m) => (
                  <CardGrupo key={m} nome={m} sub="Manuais e datasheets" n={porMarca[m].length}
                             onClick={() => setSel({ tipo: 'marca', nome: m })} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
