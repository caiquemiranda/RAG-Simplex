import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

/** Famílias de painéis atendidas — descrição de alto nível (sem dados técnicos inventados). */
const FAMILIAS: { nome: string; resumo: string; usa: string }[] = [
  {
    nome: '4100 / 4100ES',
    resumo: 'Família de painéis de detecção e alarme endereçáveis para instalações de médio e grande porte.',
    usa: 'Loops endereçáveis (dispositivos com endereço), integração em rede e módulos de expansão.',
  },
  {
    nome: 'F3200',
    resumo: 'Central de alarme de incêndio para instalações comerciais; opera com zonas/loops e módulos.',
    usa: 'Configurações conforme o projeto do local; interliga detecção e sinalização.',
  },
  {
    nome: 'QE90',
    resumo: 'Sistema associado a alerta e evacuação (EWIS) — comunicação de emergência com as áreas.',
    usa: 'Controle de alerta/evacuação integrado à detecção de incêndio.',
  },
  {
    nome: 'IMS / TrueSite',
    resumo: 'Camada de rede e supervisão (workstation) que agrega vários painéis num ponto de monitoração.',
    usa: 'Visão centralizada, gráficos e histórico de eventos da rede de painéis.',
  },
]

/** Página "Sobre equipamento" (#EQP-SOBRE): visão geral das famílias + para onde ir buscar o detalhe. */
export default function SobreEquipamento() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-lg font-semibold">Sobre os equipamentos</h1>

      {/* Aviso de segurança de vida */}
      <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-3 text-sm dark:bg-amber-900/20">
        ⚠️ <strong>Sistema de segurança de vida.</strong> Esta página é uma visão geral. Para
        procedimentos, tensões, endereços e dip-switches, use sempre a base de conhecimento
        (<Link to="/consulta" className="text-primary hover:underline">Consulta</Link>) e os manuais
        oficiais em <Link to="/documentos?cat=marcas" className="text-primary hover:underline">Documentos → Marcas</Link>.
        Nunca improvise procedimento fora do que consta na fonte.
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FAMILIAS.map((f) => (
          <Card key={f.nome}>
            <CardHeader><CardTitle className="text-base">{f.nome}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{f.resumo}</p>
              <p className="text-muted-foreground">{f.usa}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Onde encontrar o detalhe técnico</CardTitle></CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <p>• <Link to="/consulta" className="text-primary hover:underline">Consulta (RAG)</Link> — diagnóstico de falhas do painel (ex.: <span className="font-mono">HEAD MISSING</span>, No Answer) ancorado no guia.</p>
          <p>• <Link to="/documentos?cat=marcas" className="text-primary hover:underline">Documentos → Marcas</Link> — manuais e datasheets por marca; vincule-os ao dispositivo na página do equipamento.</p>
          <p>• <Link to="/equipamentos" className="text-primary hover:underline">Buscar equipamento</Link> — localizar um dispositivo na planta e abrir os detalhes.</p>
          <p>• <Link to="/equipamentos/lista" className="text-primary hover:underline">Lista de equipamentos</Link> — inventário por cliente, com filtros e listas de manutenção.</p>
        </CardContent>
      </Card>
    </div>
  )
}
