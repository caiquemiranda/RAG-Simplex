import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, urlArquivo, type ClienteVisivel, type DocEquip } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Logo } from '../components/Logo'
import { Avatar } from '../components/Avatar'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

export default function Documentos() {
  const { usuario } = useAuth()
  const podeGerir = usuario?.permissoes.includes('gerir_usuarios') ?? false
  const [params] = useSearchParams()
  const cat = params.get('cat') // empresa | clientes | marcas | null (todas)

  const [docs, setDocs] = useState<DocEquip[]>([])
  const [clientes, setClientes] = useState<ClienteVisivel[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [marcaNova, setMarcaNova] = useState('Simplex')
  const [clienteUpload, setClienteUpload] = useState<number | ''>('')

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

  const mostra = (k: string) => !cat || cat === k

  function Linha({ d }: { d: DocEquip }) {
    return (
      <div className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm ${d.oculto ? 'opacity-60' : ''}`}>
        <a href={urlArquivo(d.url)} target="_blank" rel="noreferrer" download className="min-w-0 flex-1 truncate text-primary hover:underline" title="Baixar">
          📄 {d.nome}{d.oculto && ' (oculto)'}
        </a>
        {podeGerir && (
          <>
            <button className="text-xs text-muted-foreground hover:underline" onClick={() => renomear(d)}>renomear</button>
            <button className="text-xs text-muted-foreground hover:underline" onClick={() => toggleOculto(d)}>{d.oculto ? 'mostrar' : 'ocultar'}</button>
            <button className="text-xs text-destructive hover:underline" onClick={() => remover(d)}>excluir</button>
          </>
        )}
      </div>
    )
  }

  const empresa = filtrados.filter((d) => d.categoria === 'empresa')
  const porCliente = filtrados.filter((d) => d.categoria === 'cliente')
  const porMarca = filtrados.filter((d) => d.categoria === 'marca')
    .reduce<Record<string, DocEquip[]>>((m, d) => { (m[d.marca] ??= []).push(d); return m }, {})
  const clientesComDoc = clientes.filter((c) => porCliente.some((d) => d.cliente_id === c.id))

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">Documentos {cat && <span className="text-sm font-normal text-muted-foreground">· {cat}</span>}</h1>
          <Input className="w-64" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="🔍 buscar documento…" />
        </div>
        {erro && <p className="text-sm text-destructive">{erro}</p>}

        {/* Empresa */}
        {mostra('empresa') && (
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2"><Logo className="h-6" /><CardTitle className="text-base">Empresa</CardTitle></div>
              {podeGerir && (
                <label className="cursor-pointer text-sm text-primary hover:underline">+ enviar
                  <input type="file" className="hidden" onChange={(e) => upar('empresa', e)} />
                </label>
              )}
            </CardHeader>
            <CardContent className="space-y-1.5">
              {empresa.length === 0 && <p className="text-sm text-muted-foreground">Nenhum documento.</p>}
              {empresa.map((d) => <Linha key={d.id} d={d} />)}
            </CardContent>
          </Card>
        )}

        {/* Clientes (card por cliente, como Relatórios) */}
        {mostra('clientes') && (
          <Card>
            <CardHeader><CardTitle className="text-base">Clientes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {podeGerir && (
                <div className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-2">
                  <select className="h-9 rounded-md border bg-background px-2 text-sm" value={clienteUpload}
                          onChange={(e) => setClienteUpload(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">Cliente…</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  <label className={`rounded-md border bg-background px-3 py-1.5 text-sm ${clienteUpload ? 'cursor-pointer hover:bg-accent' : 'pointer-events-none opacity-50'}`}>
                    + enviar documento do cliente
                    <input type="file" className="hidden" onChange={(e) => clienteUpload && upar('cliente', e, { cliente_id: clienteUpload as number })} />
                  </label>
                </div>
              )}
              {clientesComDoc.length === 0 && <p className="text-sm text-muted-foreground">Nenhum documento de cliente.</p>}
              {clientesComDoc.map((c) => (
                <div key={c.id} className="rounded-lg border p-2">
                  <div className="mb-1 flex items-center gap-2">
                    <Avatar nome={c.nome} fotoUrl={c.logo_url} cor={c.cor} className="h-7 w-7 text-[10px]" />
                    <span className="font-medium">{c.nome}</span>
                  </div>
                  <div className="space-y-1.5">
                    {porCliente.filter((d) => d.cliente_id === c.id).map((d) => <Linha key={d.id} d={d} />)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Marcas */}
        {mostra('marcas') && (
          <Card>
            <CardHeader><CardTitle className="text-base">Marcas (equipamentos)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {podeGerir && (
                <div className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-2">
                  <Input className="h-9 w-40" list="marcas-sugestoes" value={marcaNova} onChange={(e) => setMarcaNova(e.target.value)} />
                  <datalist id="marcas-sugestoes"><option value="Simplex" /><option value="Notifier" /><option value="Bosch" /></datalist>
                  <label className="cursor-pointer rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent">
                    + enviar manual/datasheet
                    <input type="file" className="hidden" onChange={(e) => upar('marca', e, { marca: marcaNova })} />
                  </label>
                </div>
              )}
              {Object.keys(porMarca).length === 0 && <p className="text-sm text-muted-foreground">Nenhum documento de marca.</p>}
              {Object.entries(porMarca).map(([marca, lista]) => (
                <div key={marca} className="space-y-1.5">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{marca}</div>
                  {lista.map((d) => <Linha key={d.id} d={d} />)}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
