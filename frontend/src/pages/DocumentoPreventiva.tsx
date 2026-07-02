import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, type DocumentoPreventiva } from '../lib/api'
import { IconPrint } from '../components/icons'

/**
 * Documento de **Manutenção Preventiva** (#PREV-DOC) gerado de uma lista de equipamentos.
 * Página cheia (fora do Layout) para **impressão limpa** — o botão imprime/salva em PDF via
 * `window.print()`. Colunas de checklist (Testado/Conforme/Observação) ficam em branco para
 * preenchimento em campo.
 */
export default function DocumentoPreventiva() {
  const { listaId, visitaId } = useParams()
  const navigate = useNavigate()
  const [doc, setDoc] = useState<DocumentoPreventiva | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    // Da O.S. mensal (com as datas marcadas, #OS-PREV-DATAS) ou de uma lista avulsa (#PREV-DOC).
    const p = visitaId ? api.documentoPreventivaOS(Number(visitaId)) : api.admin.documentoPreventiva(Number(listaId))
    p.then(setDoc).catch((e) => setErro(e instanceof Error ? e.message : 'Falha ao gerar o documento'))
  }, [listaId, visitaId])

  const brData = (iso: string) => iso.split('-').reverse().slice(0, 2).join('/')

  if (erro) return <div className="p-6 text-sm text-destructive">{erro}</div>
  if (!doc) return <div className="p-6 text-sm text-muted-foreground">Gerando documento…</div>

  const linha = 'border border-neutral-400 px-2 py-1'

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Barra de ações — some na impressão */}
      <div className="flex items-center justify-between gap-2 border-b bg-neutral-100 px-4 py-2 print:hidden">
        <button className="text-sm text-neutral-700 hover:underline" onClick={() => navigate(-1)}>← Voltar</button>
        <button className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-700"
                onClick={() => window.print()}><IconPrint /> Imprimir / Salvar PDF</button>
      </div>

      {/* Folha do documento */}
      <div className="mx-auto max-w-[820px] p-8 text-[13px] leading-relaxed">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between border-b-2 border-neutral-800 pb-3">
          <div>
            <div className="text-xl font-bold tracking-tight">IBSystems</div>
            <div className="text-xs text-neutral-500">Detecção e alarme de incêndio</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold">Relatório de Manutenção Preventiva</div>
            <div className="text-xs text-neutral-500">Gerado em {doc.gerado_em}</div>
          </div>
        </div>

        {/* Identificação */}
        <table className="mt-4 w-full border-collapse text-[12px]">
          <tbody>
            <tr>
              <td className={`${linha} w-28 bg-neutral-100 font-medium`}>Cliente</td>
              <td className={linha}>{doc.cliente?.nome ?? '—'}</td>
              <td className={`${linha} w-24 bg-neutral-100 font-medium`}>Unidade</td>
              <td className={linha}>{doc.cliente?.unidade ?? '—'}</td>
            </tr>
            <tr>
              <td className={`${linha} bg-neutral-100 font-medium`}>Endereço</td>
              <td className={linha} colSpan={3}>{doc.cliente?.endereco ?? '—'}</td>
            </tr>
            <tr>
              <td className={`${linha} bg-neutral-100 font-medium`}>Escopo</td>
              <td className={linha}>{doc.titulo ?? doc.lista_nome ?? '—'}</td>
              <td className={`${linha} bg-neutral-100 font-medium`}>Datas</td>
              <td className={linha}>{doc.datas && doc.datas.length > 0 ? doc.datas.map(brData).join(', ') : ' '}</td>
            </tr>
            <tr>
              <td className={`${linha} bg-neutral-100 font-medium`}>Técnico(s)</td>
              <td className={linha}>&nbsp;</td>
              <td className={`${linha} bg-neutral-100 font-medium`}>Ordem de Serviço</td>
              <td className={linha}>&nbsp;</td>
            </tr>
          </tbody>
        </table>

        {/* Tabela de equipamentos + checklist */}
        <div className="mt-5 text-sm font-semibold">Equipamentos ({doc.equipamentos.length})</div>
        <table className="mt-1 w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-neutral-200 text-left">
              <th className={`${linha} w-6`}>#</th>
              <th className={linha}>Tag</th>
              <th className={linha}>Painel</th>
              <th className={linha}>Loop</th>
              <th className={linha}>Add</th>
              <th className={linha}>Tipo</th>
              <th className={linha}>Modelo</th>
              <th className={`${linha} w-14 text-center`}>Testado</th>
              <th className={`${linha} w-16 text-center`}>Conforme</th>
              <th className={`${linha} w-40`}>Observação</th>
            </tr>
          </thead>
          <tbody>
            {doc.equipamentos.map((e, i) => (
              <tr key={e.id}>
                <td className={`${linha} text-center`}>{i + 1}</td>
                <td className={`${linha} font-mono`}>{e.tag || '—'}</td>
                <td className={`${linha} font-mono`}>{e.painel}</td>
                <td className={`${linha} font-mono`}>{e.loop}</td>
                <td className={`${linha} font-mono`}>{e.add}</td>
                <td className={linha}>{e.type}</td>
                <td className={linha}>{e.model}</td>
                <td className={linha}>&nbsp;</td>
                <td className={linha}>&nbsp;</td>
                <td className={linha}>&nbsp;</td>
              </tr>
            ))}
            {doc.equipamentos.length === 0 && (
              <tr><td className={`${linha} text-center text-neutral-500`} colSpan={10}>Lista sem equipamentos.</td></tr>
            )}
          </tbody>
        </table>

        {/* Assinaturas */}
        <div className="mt-10 grid grid-cols-2 gap-10 text-center text-[12px]">
          <div className="border-t border-neutral-500 pt-1">Técnico responsável</div>
          <div className="border-t border-neutral-500 pt-1">Responsável pelo cliente</div>
        </div>
      </div>
    </div>
  )
}
