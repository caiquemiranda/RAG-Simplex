/** Helpers de formatação/estado compartilhados pela UI (evita duplicação). */

/** Data local → `YYYY-MM-DD` (sem fuso, para casar com as datas do backend). */
export function isoData(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Cor do chip por status de visita do cronograma (adapta ao tema claro/escuro). */
export const STATUS_VISITA: Record<string, string> = {
  agendada: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  pendente: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  concluida: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  cancelada: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
}

/** Tipos de Ordem de Serviço (#OS, D-025) e rótulos/cores de exibição. */
export const TIPOS_OS = ['preventiva', 'corretiva', 'avulsa'] as const
export const TIPO_OS_LABEL: Record<string, string> = {
  preventiva: 'Manutenção preventiva',
  corretiva: 'Manutenção corretiva',
  avulsa: 'Manutenção avulsa',
}
export const TIPO_OS_COR: Record<string, string> = {
  preventiva: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200',
  corretiva: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200',
  avulsa: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200',
}
/** Campos do documento de corretiva: chave → rótulo (ordem do documento img1). */
export const CAMPOS_DOC_OS: [string, string][] = [
  ['especialidade', 'Especialidade'],
  ['requisitante', 'Requisitante'],
  ['data_solicitacao', 'Data da solicitação'],
  ['centro_custo', 'Centro de custo'],
  ['numero_os', 'Nº da O.S.'],
  ['reserva_material', 'Reserva de material'],
  ['material_utilizado', 'Material utilizado'],
  ['endereco', 'Endereço'],
  ['setor', 'Setor'],
  ['prioridade', 'Prioridade'],
  ['data_execucao', 'Data de execução'],
  ['acao_aplicada', 'Ação aplicada'],
]

/** Classifica a validade de um documento para o badge (válido / vence em Nd / vencido). */
export function statusDoc(validade: string | null): { label: string; cls: string } {
  if (!validade) return { label: 'sem validade', cls: 'bg-muted text-muted-foreground' }
  const dias = Math.ceil((new Date(validade + 'T00:00:00').getTime() - Date.now()) / 86400000)
  if (dias < 0) return { label: `vencido há ${-dias}d`, cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200' }
  if (dias <= 30) return { label: `vence em ${dias}d`, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200' }
  return { label: 'válido', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200' }
}
