import { useState, type ReactNode } from 'react';
import { Card, Button } from '../../components/ui';
import { IconCheck, IconClock, IconChevronRight } from '../../components/icons';

export type EtapaEstado = 'concluida' | 'andamento' | 'pendente';

export interface EtapaCardProps {
  ordem: number;
  nome: string;
  estado: EtapaEstado;
  inicio?: string | null;
  fim?: string | null;
  duracao?: string | null;
  operador?: string | null;
  equipamento?: string | null;
  setor?: string | null;
  onIniciar?: () => void;
  onFinalizar?: () => void;
  carregando?: boolean;
  /** Conteúdo revelado ao expandir o card (ações/registros da etapa). */
  children?: ReactNode;
}

const ESTADO_META: Record<EtapaEstado, { label: string; chip: string; ring: string }> = {
  concluida: { label: 'Concluída', chip: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-200' },
  andamento: { label: 'Em andamento', chip: 'bg-sky-100 text-sky-700', ring: 'ring-sky-300' },
  pendente: { label: 'Pendente', chip: 'bg-slate-100 text-slate-500', ring: 'ring-slate-200' },
};

export function EtapaCard(props: EtapaCardProps) {
  const { estado } = props;
  const meta = ESTADO_META[estado];
  const [aberto, setAberto] = useState(false);
  const expansivel = Boolean(props.children);

  return (
    <Card
      className={`overflow-hidden transition ${
        estado === 'andamento' ? 'ring-2 ' + meta.ring : 'ring-1 ring-transparent'
      }`}
    >
      {/* Cabeçalho clicável */}
      <div
        className={`flex items-start gap-4 p-5 ${expansivel ? 'cursor-pointer hover:bg-slate-50' : ''}`}
        onClick={expansivel ? () => setAberto((v) => !v) : undefined}
        role={expansivel ? 'button' : undefined}
        aria-expanded={expansivel ? aberto : undefined}
      >
        <Marker estado={estado} ordem={props.ordem} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">{props.nome}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.chip}`}>
              {meta.label}
            </span>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
            {props.inicio && <Detalhe termo="Início" valor={props.inicio} />}
            {props.fim && <Detalhe termo="Fim" valor={props.fim} />}
            {props.duracao && <Detalhe termo="Duração" valor={props.duracao} />}
            {props.equipamento && <Detalhe termo="Equipamento" valor={props.equipamento} />}
            {props.operador && <Detalhe termo="Operador" valor={props.operador} />}
            {props.setor && <Detalhe termo="Setor" valor={props.setor} />}
          </dl>

          {estado === 'pendente' && !props.inicio && (
            <p className="mt-3 text-xs text-slate-400">Esta etapa ainda não foi iniciada.</p>
          )}

          {expansivel && (
            <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
              {aberto ? 'Ocultar detalhes' : 'Ver detalhes da etapa'}
              <IconChevronRight
                width={14}
                height={14}
                className={`transition-transform ${aberto ? 'rotate-90' : ''}`}
              />
            </p>
          )}
        </div>

        {/* Ação — não dispara o expand */}
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {estado === 'andamento' && props.onFinalizar && (
            <Button
              variant="outline"
              className="border-emerald-300 px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50"
              loading={props.carregando}
              onClick={props.onFinalizar}
            >
              Finalizar
            </Button>
          )}
          {estado === 'pendente' && props.onIniciar && (
            <Button
              variant="outline"
              className="px-3 py-1.5 text-xs"
              loading={props.carregando}
              onClick={props.onIniciar}
            >
              Iniciar
            </Button>
          )}
        </div>
      </div>

      {/* Painel expandido */}
      {expansivel && aberto && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">{props.children}</div>
      )}
    </Card>
  );
}

function Marker({ estado, ordem }: { estado: EtapaEstado; ordem: number }) {
  if (estado === 'concluida')
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <IconCheck width={18} height={18} />
      </span>
    );
  if (estado === 'andamento')
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 ring-2 ring-sky-200">
        <IconClock width={18} height={18} />
      </span>
    );
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-400">
      {ordem}
    </span>
  );
}

function Detalhe({ termo, valor }: { termo: string; valor: ReactNode }) {
  return (
    <div>
      <dt className="text-slate-400">{termo}</dt>
      <dd className="mt-0.5 font-medium text-slate-700">{valor}</dd>
    </div>
  );
}

// ── Blocos reutilizáveis do painel de detalhes ──────────────────
export function EtapaSecao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{titulo}</h4>
      {children}
    </div>
  );
}
