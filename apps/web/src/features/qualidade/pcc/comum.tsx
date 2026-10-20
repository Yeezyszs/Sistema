// Peças comuns aos registros de PCC/PPRO (forno, detector, ímãs).
import { useState } from 'react';
import { validarRegistrosQualidade } from '../../../lib/db';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../components/Toast';
import { formatarDataHora } from '../../../lib/format';

/** Hora local de um timestamp, para ler a folha como no papel. */
export function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function useEhQualidade(): boolean {
  const { perfis } = useAuth();
  return perfis.includes('qualidade');
}

/** Selo "Validado" / "Aguardando validação". */
export function SeloValidacao({ validadoEm }: { validadoEm: string | null }) {
  return validadoEm ? (
    <span title={`Validado em ${formatarDataHora(validadoEm)}`}
      className="whitespace-nowrap rounded bg-emerald-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-700">
      Validado
    </span>
  ) : (
    <span className="whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-500">
      A validar
    </span>
  );
}

/** Botão da Qualidade para validar os registros pendentes de uma vez. */
export function BotaoValidar({ tabela, ids, rotulo = 'Validar', onFeito }: {
  tabela: 'verificacoes_dm' | 'verificacoes_ima' | 'forno_registros';
  ids: string[];
  rotulo?: string;
  onFeito: () => void;
}) {
  const ehQualidade = useEhQualidade();
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();
  if (!ehQualidade || ids.length === 0) return null;
  async function validar() {
    setSalvando(true);
    try {
      await validarRegistrosQualidade(tabela, ids);
      sucesso(ids.length === 1 ? 'Registro validado.' : `${ids.length} registros validados.`);
      onFeito();
    } catch (e) { erro(e instanceof Error ? e.message : 'Falha ao validar.'); }
    finally { setSalvando(false); }
  }
  return (
    <button type="button" disabled={salvando} onClick={() => void validar()}
      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
      {salvando ? 'Validando…' : `${rotulo}${ids.length > 1 ? ` (${ids.length})` : ''}`}
    </button>
  );
}

/** Pergunta sim/não do verso de correção. */
export function SimNao({ label, valor, onChange }: { label: string; valor: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-[12.5px] text-slate-700">{label}</span>
      <span className="flex gap-1">
        {([true, false] as const).map((v) => (
          <button key={String(v)} type="button" aria-pressed={valor === v} onClick={() => onChange(v)}
            className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${
              valor === v
                ? v ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-500 bg-slate-500 text-white'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}>
            {v ? 'Sim' : 'Não'}
          </button>
        ))}
      </span>
    </div>
  );
}
