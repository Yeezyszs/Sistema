// Timeline vertical das etapas do lote — a tela-assinatura da rastreabilidade.
import type { ReactNode } from 'react';
import { IconCheck, IconClock } from './icons';

export type TimelineEstado = 'concluida' | 'andamento' | 'pendente';

export interface TimelineItem {
  titulo: string;
  estado: TimelineEstado;
  detalhe?: ReactNode;
  meta?: string;
}

export function Timeline({ itens }: { itens: TimelineItem[] }) {
  return (
    <ol className="relative">
      {itens.map((item, i) => {
        const last = i === itens.length - 1;
        return (
          <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
            {!last && (
              <span
                className={`absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px ${
                  item.estado === 'concluida' ? 'bg-emerald-200' : 'bg-slate-200'
                }`}
                aria-hidden
              />
            )}
            <Marker estado={item.estado} />
            <div className="flex-1 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">{item.titulo}</p>
                {item.meta && <span className="text-xs text-slate-400">{item.meta}</span>}
              </div>
              {item.detalhe && <div className="mt-1 text-sm text-slate-500">{item.detalhe}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Marker({ estado }: { estado: TimelineEstado }) {
  if (estado === 'concluida') {
    return (
      <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <IconCheck width={16} height={16} />
      </span>
    );
  }
  if (estado === 'andamento') {
    return (
      <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 ring-2 ring-sky-200">
        <IconClock width={16} height={16} />
      </span>
    );
  }
  return (
    <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-300">
      <span className="h-2 w-2 rounded-full bg-current" />
    </span>
  );
}
