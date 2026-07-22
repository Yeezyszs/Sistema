import { STATUS_LOTE_LABEL, STATUS_LOTE_TOM, type StatusLote, type Tom } from '@sistema/domain';

const TOM_CLASSES: Record<Tom, string> = {
  neutro: 'bg-slate-100 text-slate-600 ring-slate-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  sucesso: 'bg-brand-50 text-brand-700 ring-brand-200',
  alerta: 'bg-amber-50 text-amber-700 ring-amber-200',
  erro: 'bg-red-50 text-red-700 ring-red-200',
};

export function StatusChip({ status }: { status: StatusLote }) {
  const tom = STATUS_LOTE_TOM[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${TOM_CLASSES[tom]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LOTE_LABEL[status]}
    </span>
  );
}
