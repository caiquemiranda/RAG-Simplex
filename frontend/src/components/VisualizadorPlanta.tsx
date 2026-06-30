import { useEffect, useRef, useState, type ReactNode } from 'react'
import { urlArquivo } from '../lib/api'

export type Marcador = { id: number; x: number; y: number; cor?: string }

/**
 * Visualizador de planta (#MAP) — imagem com **zoom/pan** (scroll + arraste) e **marcadores**
 * posicionados por coordenadas (px da imagem). Zero dependência externa.
 * - `focoId`: ao mudar, dá zoom e centraliza no marcador (usado pela busca).
 * - `onMarcador`: clique num marcador. `onClicarPlanta`: clique na planta → (x,y) em px (editor).
 * - `renderPopup`: conteúdo do popup do marcador ativo (`ativoId`).
 */
export function VisualizadorPlanta({
  imagemUrl, largura, altura, marcadores, ativoId, focoId, onMarcador, onClicarPlanta, renderPopup, altura_px = '62vh',
}: {
  imagemUrl: string
  largura: number
  altura: number
  marcadores: Marcador[]
  ativoId?: number | null
  focoId?: number | null
  onMarcador?: (id: number) => void
  onClicarPlanta?: (x: number, y: number) => void
  renderPopup?: (id: number) => ReactNode
  altura_px?: string
}) {
  const refBox = useRef<HTMLDivElement>(null)
  const [escala, setEscala] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const arrasto = useRef<{ x: number; y: number; tx: number; ty: number; moveu: boolean } | null>(null)

  function caixa() {
    const b = refBox.current
    return { w: b?.clientWidth ?? 800, h: b?.clientHeight ?? 500 }
  }

  // Ajusta a planta para caber e centraliza.
  function ajustar() {
    if (!largura || !altura) return
    const { w, h } = caixa()
    const s = Math.min(w / largura, h / altura) * 0.98
    setEscala(s)
    setTx((w - largura * s) / 2)
    setTy((h - altura * s) / 2)
  }
  useEffect(() => { ajustar() /* eslint-disable-next-line */ }, [imagemUrl, largura, altura])

  // Centraliza (com zoom) num marcador quando `focoId` muda.
  useEffect(() => {
    if (focoId == null) return
    const m = marcadores.find((x) => x.id === focoId)
    if (!m) return
    const { w, h } = caixa()
    const s = Math.max(2, escala)
    setEscala(s)
    setTx(w / 2 - m.x * s)
    setTy(h / 2 - m.y * s)
    // eslint-disable-next-line
  }, [focoId])

  function zoom(fator: number, cx?: number, cy?: number) {
    const { w, h } = caixa()
    const px = cx ?? w / 2
    const py = cy ?? h / 2
    const nova = Math.min(8, Math.max(0.1, escala * fator))
    // mantém o ponto sob o cursor fixo
    setTx(px - ((px - tx) * nova) / escala)
    setTy(py - ((py - ty) * nova) / escala)
    setEscala(nova)
  }

  // Zoom com a roda do mouse via listener NATIVO não-passivo — só assim `preventDefault`
  // funciona e a **página não rola** quando o cursor está sobre o mapa (item 1).
  const vals = useRef({ escala, tx, ty })
  vals.current = { escala, tx, ty }
  useEffect(() => {
    const box = refBox.current
    if (!box) return
    function aoRolar(e: WheelEvent) {
      e.preventDefault()
      const r = box!.getBoundingClientRect()
      const px = e.clientX - r.left
      const py = e.clientY - r.top
      const { escala: es, tx: x, ty: y } = vals.current
      const nova = Math.min(8, Math.max(0.1, es * (e.deltaY < 0 ? 1.15 : 1 / 1.15)))
      setTx(px - ((px - x) * nova) / es)
      setTy(py - ((py - y) * nova) / es)
      setEscala(nova)
    }
    box.addEventListener('wheel', aoRolar, { passive: false })
    return () => box.removeEventListener('wheel', aoRolar)
  }, [])

  function onDown(e: React.MouseEvent) {
    arrasto.current = { x: e.clientX, y: e.clientY, tx, ty, moveu: false }
  }
  function onMove(e: React.MouseEvent) {
    if (!arrasto.current) return
    const dx = e.clientX - arrasto.current.x
    const dy = e.clientY - arrasto.current.y
    if (Math.abs(dx) + Math.abs(dy) > 3) arrasto.current.moveu = true
    setTx(arrasto.current.tx + dx)
    setTy(arrasto.current.ty + dy)
  }
  function onUp(e: React.MouseEvent) {
    const a = arrasto.current
    arrasto.current = null
    if (a && !a.moveu && onClicarPlanta) {
      const r = refBox.current!.getBoundingClientRect()
      const x = (e.clientX - r.left - tx) / escala
      const y = (e.clientY - r.top - ty) / escala
      if (x >= 0 && y >= 0 && x <= largura && y <= altura) onClicarPlanta(Math.round(x), Math.round(y))
    }
  }

  const ativo = marcadores.find((m) => m.id === ativoId)

  return (
    <div
      ref={refBox}
      className="relative overflow-hidden rounded-lg border bg-muted/30 select-none"
      style={{ height: altura_px, cursor: arrasto.current ? 'grabbing' : 'grab' }}
      onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={() => (arrasto.current = null)}
    >
      {/* Palco transformado (imagem + marcadores) */}
      <div className="absolute left-0 top-0 origin-top-left"
           style={{ transform: `translate(${tx}px, ${ty}px) scale(${escala})`, width: largura, height: altura }}>
        <img src={urlArquivo(imagemUrl)} width={largura} height={altura} draggable={false} alt="planta" className="block max-w-none" />
        {marcadores.map((m) => {
          const ativoM = m.id === ativoId
          return (
            <button key={m.id} title={`#${m.id}`}
                    onClick={(e) => { e.stopPropagation(); onMarcador?.(m.id) }}
                    style={{ position: 'absolute', left: m.x, top: m.y, transform: `translate(-50%, -100%) scale(${1 / escala})`, transformOrigin: 'bottom center' }}>
              <svg width="26" height="34" viewBox="0 0 26 34" className={ativoM ? 'drop-shadow' : ''}>
                <path d="M13 0C6 0 0 5.5 0 12.6 0 22 13 34 13 34s13-12 13-21.4C26 5.5 20 0 13 0z"
                      fill={m.cor ?? '#ef4444'} stroke="white" strokeWidth="2" />
                <circle cx="13" cy="12.5" r="4.5" fill="white" />
              </svg>
            </button>
          )
        })}
      </div>

      {/* Popup do marcador ativo (em coordenadas de tela) */}
      {ativo && renderPopup && (
        <div className="absolute z-10 w-56 -translate-x-1/2 rounded-lg border bg-card p-3 text-sm shadow-xl"
             style={{ left: tx + ativo.x * escala, top: ty + ativo.y * escala - 40, transform: 'translate(-50%, -100%)' }}>
          {renderPopup(ativo.id)}
        </div>
      )}

      {/* Controles de zoom */}
      <div className="absolute left-2 top-2 flex flex-col overflow-hidden rounded-md border bg-card shadow">
        <button className="px-2 py-1 text-lg leading-none hover:bg-accent" onClick={() => zoom(1.3)} aria-label="Mais zoom">+</button>
        <button className="border-t px-2 py-1 text-lg leading-none hover:bg-accent" onClick={() => zoom(1 / 1.3)} aria-label="Menos zoom">−</button>
        <button className="border-t px-2 py-0.5 text-xs hover:bg-accent" onClick={ajustar} aria-label="Ajustar">⤢</button>
      </div>
    </div>
  )
}
