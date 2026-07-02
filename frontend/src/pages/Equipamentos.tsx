import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type ClienteVisivel, type Equipamento, type Visita, type Planta } from '../lib/api'
import { TIPO_OS_LABEL, corStatusEquip } from '../lib/format'
import { VisualizadorPlanta, type Marcador } from '../components/VisualizadorPlanta'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'

/** Buscar equipamento (#MAP): cliente → tag → localiza o dispositivo na planta. */
export default function Equipamentos() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState<ClienteVisivel[]>([])
  const [cid, setCid] = useState<number | ''>('')
  const [plantas, setPlantas] = useState<Planta[]>([])
  const [equip, setEquip] = useState<Equipamento[]>([])
  const [plantaSel, setPlantaSel] = useState<number | ''>('')
  const [busca, setBusca] = useState('')
  const [selId, setSelId] = useState<number | null>(null)
  const [foco, setFoco] = useState<{ id: number; nonce: number } | null>(null)
  const focar = (id: number) => setFoco((f) => ({ id, nonce: (f?.nonce ?? 0) + 1 }))
  const [historico, setHistorico] = useState<Visita[]>([])
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => { api.clientesVisiveis().then(setClientes).catch(() => {}) }, [])

  // Histórico de manutenção (O.S.) do equipamento selecionado (#MAP-4).
  useEffect(() => {
    if (selId == null) { setHistorico([]); return }
    api.ordensEquipamento(selId).then(setHistorico).catch(() => setHistorico([]))
  }, [selId])

  // Ao trocar de cliente, carrega plantas + equipamentos.
  useEffect(() => {
    setPlantas([]); setEquip([]); setPlantaSel(''); setSelId(null); setFoco(null); setErro(null)
    if (cid === '') return
    api.plantasCliente(cid).then((ps) => { setPlantas(ps); if (ps[0]) setPlantaSel(ps[0].id) }).catch((e) => setErro(e instanceof Error ? e.message : 'Falha ao carregar plantas'))
    api.equipamentosCliente(cid).then(setEquip).catch(() => {})
  }, [cid])

  const selecionado = equip.find((e) => e.id === selId) ?? null

  // Resultados da busca (por tag/add).
  const resultados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    if (!t) return []
    return equip.filter((e) => (e.tag || '').toLowerCase().includes(t) || (e.add || '').toLowerCase().includes(t)).slice(0, 12)
  }, [busca, equip])

  // Marcadores da planta selecionada.
  const marcadores: Marcador[] = useMemo(() => equip
    .filter((e) => e.planta_id === plantaSel && e.pos_x != null && e.pos_y != null)
    .map((e) => ({ id: e.id, x: e.pos_x as number, y: e.pos_y as number, cor: corStatusEquip(e.status, e.falha_id != null) })),
    [equip, plantaSel])

  function selecionar(e: Equipamento) {
    setSelId(e.id)
    setBusca(e.tag || e.add || '')
    if (e.planta_id != null) {
      setPlantaSel(e.planta_id)
      focar(e.id)
    }
  }

  const planta = plantas.find((p) => p.id === plantaSel) ?? null

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <h1 className="text-lg font-semibold">Buscar equipamento</h1>

        {/* Cliente + busca + planta */}
        <div className="flex flex-wrap items-center gap-2">
          <select className="h-9 rounded-md border bg-background px-3 text-sm" aria-label="Selecionar cliente" value={cid}
                  onChange={(e) => setCid(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Selecione o cliente…</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <div className="relative">
            <Input className="w-64" value={busca} onChange={(e) => { setBusca(e.target.value); setSelId(null) }}
                   aria-label="Buscar equipamento por tag" placeholder="Tag do equipamento (ex.: N2-L23-DF-003)" disabled={cid === ''} />
            {resultados.length > 0 && !selecionado && (
              <div className="absolute z-20 mt-1 max-h-64 w-72 overflow-auto rounded-md border bg-card shadow-lg">
                {resultados.map((e) => (
                  <button key={e.id} className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm hover:bg-accent"
                          onClick={() => selecionar(e)}>
                    <span className="truncate font-medium">{e.tag || e.add || `#${e.id}`}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{e.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {plantas.length > 1 && (
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={plantaSel}
                    onChange={(e) => setPlantaSel(e.target.value ? Number(e.target.value) : '')}>
              {plantas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          )}
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}
        {cid === '' && <p className="text-sm text-muted-foreground">Escolha um cliente para buscar e localizar equipamentos na planta.</p>}
        {cid !== '' && plantas.length === 0 && <p className="text-sm text-muted-foreground">Este cliente não tem plantas cadastradas. (Cadastre na página do cliente.)</p>}

        {/* Mapa */}
        {planta && (
          <VisualizadorPlanta
            imagemUrl={planta.imagem_url} largura={planta.largura} altura={planta.altura}
            marcadores={marcadores} ativoId={selId} foco={foco}
            onMarcador={(id) => { const e = equip.find((x) => x.id === id); if (e) selecionar(e) }}
            renderPopup={(id) => {
              const e = equip.find((x) => x.id === id)
              if (!e) return null
              return (
                <div className="space-y-1">
                  <div className="font-semibold">{e.tag || `#${e.id}`}</div>
                  <div className="text-xs"><span className="text-muted-foreground">Tipo:</span> {e.type || '—'}</div>
                  <div className="text-xs"><span className="text-muted-foreground">Status:</span> {e.falha_nome ? `Em falha (${e.falha_nome})` : (e.status || '—')}</div>
                  <div className="text-xs"><span className="text-muted-foreground">Última manutenção:</span> {e.ultima_manutencao ?? '—'}</div>
                </div>
              )
            }}
          />
        )}

        {/* Detalhes do equipamento selecionado */}
        {selecionado && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{selecionado.tag || `Equipamento #${selecionado.id}`}</CardTitle>
              <div className="flex items-center gap-3">
                {selecionado.planta_id != null && (
                  <button className="text-xs text-primary hover:underline" onClick={() => { setPlantaSel(selecionado.planta_id as number); focar(selecionado.id) }}>Localizar no mapa</button>
                )}
                {cid !== '' && (
                  <button className="rounded-md border px-2 py-1 text-xs text-primary hover:bg-accent"
                          onClick={() => navigate(`/equipamentos/${cid}/${selecionado.id}`)}>Detalhes do dispositivo →</button>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
              <div><span className="text-muted-foreground">Tipo:</span> {selecionado.type || '—'}</div>
              <div><span className="text-muted-foreground">Modelo:</span> {selecionado.model || '—'}</div>
              <div><span className="text-muted-foreground">Status:</span> {selecionado.falha_nome ? `Em falha (${selecionado.falha_nome})` : (selecionado.status || '—')}</div>
              <div><span className="text-muted-foreground">Painel:</span> {selecionado.painel || '—'}</div>
              <div><span className="text-muted-foreground">Loop:</span> {selecionado.loop || '—'}</div>
              <div><span className="text-muted-foreground">Endereço (add):</span> {selecionado.add || '—'}</div>
              <div><span className="text-muted-foreground">Última manutenção:</span> {selecionado.ultima_manutencao ?? '—'}</div>
              <div><span className="text-muted-foreground">Último teste:</span> {selecionado.ultimo_teste ?? '—'}</div>
              <div><span className="text-muted-foreground">Coordenadas:</span> {selecionado.pos_x != null ? `X ${selecionado.pos_x}, Y ${selecionado.pos_y}` : '—'}</div>
            </CardContent>
            {/* Histórico de manutenção (O.S.) — #MAP-4 */}
            <CardContent className="border-t pt-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Histórico de manutenção ({historico.length})</div>
              {historico.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma ordem de serviço registrada.</p>
              ) : (
                <div className="space-y-2">
                  {historico.map((o) => (
                    <Link key={o.id} to={`/cronograma/atividade/${o.id}`}
                          className="block rounded-md border-l-2 border-primary bg-muted/30 p-2 hover:bg-accent/40">
                      <div className="text-xs font-medium text-primary">{o.data} · {TIPO_OS_LABEL[o.tipo] ?? o.tipo} · {o.status}</div>
                      <div className="text-sm">{o.titulo || '—'}</div>
                      {o.falha_nome && <div className="text-xs text-muted-foreground">Falha: {o.falha_nome}</div>}
                      {o.acao_aplicada && <div className="text-xs text-muted-foreground">Ação: {o.acao_aplicada}</div>}
                      {o.tecnicos.length > 0 && <div className="text-xs text-muted-foreground">Técnico(s): {o.tecnicos.map((t) => t.nome).join(', ')}</div>}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
