import { STATUS_LOTE_LABEL, STATUS_LOTE_TOM, type StatusLote, type Tom } from '@sistema/domain';

// Badge de status: pastel de fundo + texto escuro. As cores são semânticas
// (sucesso = verde, alerta = âmbar, erro = vermelho) e independem do acento
// da marca — é o estado que precisa ser lido num relance, não a identidade.
const TOM_CLASSES: Record<Tom, string> = {
  neutro: 'bg-slate-100 text-slate-600',
  info: 'bg-indigo-100 text-indigo-800',
  sucesso: 'bg-emerald-100 text-emerald-800',
  alerta: 'bg-amber-100 text-amber-800',
  erro: 'bg-red-100 text-red-800',
};

export function StatusChip({ status }: { status: StatusLote }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[11.5px] font-semibold ${TOM_CLASSES[STATUS_LOTE_TOM[status]]}`}>
      {STATUS_LOTE_LABEL[status]}
    </span>
  );
}
