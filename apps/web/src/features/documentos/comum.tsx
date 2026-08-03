// Peças compartilhadas pelas telas do módulo de Gestão de Documentos.
import type { EstadoItemChecklist, StatusDocumental } from '@sistema/domain';
import { Card } from '../../components/ui';

// Consulta falhou: num painel de compliance, afirmar conformidade a partir de
// uma consulta que não completou é pior do que não mostrar nada.
export function ErroCard({ mensagem }: { mensagem: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-red-700">Não foi possível carregar a situação documental.</p>
      <p className="mt-1 text-sm text-slate-500">{mensagem}</p>
    </Card>
  );
}

export const ESTADO_CLASS: Record<EstadoItemChecklist, string> = {
  ok: 'bg-emerald-100 text-emerald-800',
  faltando: 'bg-red-100 text-red-700',
  vencido: 'bg-red-100 text-red-700',
  aguardando: 'bg-amber-100 text-amber-700',
};

export const STATUS_CLASS: Record<StatusDocumental, string> = {
  ok: 'bg-emerald-100 text-emerald-800',
  pendente: 'bg-red-100 text-red-700',
  sem_documentos: 'bg-slate-100 text-slate-600',
};

/** Dias entre hoje e a data (negativo = já venceu). */
export function diasAte(iso: string | null): number | null {
  if (!iso) return null;
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!a || !m || !d) return null;
  const alvo = new Date(a, m - 1, d);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

/** Cor do texto conforme a proximidade do vencimento. */
export function corVencimento(iso: string | null): string {
  const dias = diasAte(iso);
  if (dias === null) return 'text-slate-400';
  if (dias < 0) return 'text-red-700 font-semibold';
  if (dias <= 30) return 'text-amber-700 font-semibold';
  return 'text-slate-600';
}
