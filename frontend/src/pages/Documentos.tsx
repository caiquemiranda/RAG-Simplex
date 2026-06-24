import { useEffect, useState, type ChangeEvent } from 'react'
import { api, urlArquivo, type DocEquip } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Logo } from '../components/Logo'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

export default function Documentos() {
  const { usuario } = useAuth()
  const podeGerir = usuario?.permissoes.includes('gerir_usuarios') ?? false
  const [docs, setDocs] = useState<DocEquip[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [marcaNova, setMarcaNova] = useState('Simplex')

  async function recarregar() {
    try { setDocs(await api.biblioteca.listar()) }
    catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao carregar') }
  }
  useEffect(() => { recarregar() }, [])

  async function upar(categoria: 'empresa' | 'marca', e: ChangeEvent<HTMLInputElement>, marca = '') {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setErro(null)
    try { await api.biblioteca.criar(file, categoria, marca); recarregar() }
    catch (err) { setErro(err instanceof Error ? err.message : 'Falha no upload') }
  }
  async function renomear(d: DocEquip) {
    const nome = window.prompt('Novo nome do arquivo:', d.nome)
    if (nome && nome.trim() && nome !== d.nome) { await api.biblioteca.atualizar(d.id, { nome: nome.trim() }); recarregar() }
  }
  async function toggleOculto(d: DocEquip) { await api.biblioteca.atualizar(d.id, { oculto: !d.oculto }); recarregar() }
  async function remover(d: DocEquip) {
    if (window.confirm(`Excluir "${d.nome}"?`)) { await api.biblioteca.remover(d.id); recarregar() }
  }

  const empresa = docs.filter((d) => d.categoria === 'empresa')
  const porMarca = docs
    .filter((d) => d.categoria === 'marca')
    .reduce<Record<string, DocEquip[]>>((m, d) => { (m[d.marca] ??= []).push(d); return m }, {})

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

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <h1 className="text-lg font-semibold">Documentos</h1>
        {erro && <p className="text-sm text-destructive">{erro}</p>}

        {/* Empresa */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2"><Logo className="h-6" /><CardTitle className="text-base">Empresa</CardTitle></div>
            {podeGerir && (
              <label className="cursor-pointer text-sm text-primary hover:underline">
                + enviar
                <input type="file" className="hidden" onChange={(e) => upar('empresa', e)} />
              </label>
            )}
          </CardHeader>
          <CardContent className="space-y-1.5">
            {empresa.length === 0 && <p className="text-sm text-muted-foreground">Nenhum documento da empresa.</p>}
            {empresa.map((d) => <Linha key={d.id} d={d} />)}
          </CardContent>
        </Card>

        {/* Marcas */}
        <Card>
          <CardHeader><CardTitle className="text-base">Marcas (equipamentos)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {podeGerir && (
              <div className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Marca</label>
                  <Input className="h-8 w-40" list="marcas-sugestoes" value={marcaNova} onChange={(e) => setMarcaNova(e.target.value)} />
                  <datalist id="marcas-sugestoes"><option value="Simplex" /><option value="Notifier" /><option value="Bosch" /></datalist>
                </div>
                <label className="cursor-pointer rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent">
                  + enviar manual/datasheet
                  <input type="file" className="hidden" onChange={(e) => upar('marca', e, marcaNova)} />
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
      </div>
    </div>
  )
}
