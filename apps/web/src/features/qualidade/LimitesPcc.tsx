// Pontos de controle (APPCC) com os limites editáveis pela Qualidade. Toda
// alteração pede motivo e fica no histórico — o forno, o laudo e os avisos
// passam a usar o novo limite na hora.
import { useState, type FormEvent } from 'react';
import { alterarLimitePontoControle, listHistoricoPontosControle } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { useAuth } from '../../lib/auth';
import { formatarDataHora } from '../../lib/format';
import { TIPO_PCC_LABEL, limiteLabel } from '@sistema/domain';
import type { PontoControle } from '@sistema/domain';
import { Card, Button, Field, TextInput, Modal } from '../../components/ui';
import { IconFlask } from '../../components/icons';
import { useToast } from '../../components/Toast';

const num = (v: number | null) => (v == null ? '—' : String(v));

export function LimitesPcc({ pontos, onSaved }: { pontos: PontoControle[]; onSaved: () => void }) {
  const { perfis } = useAuth();
  const ehQualidade = perfis.includes('qualidade');
  const [editando, setEditando] = useState<PontoControle | null>(null);
  const [versao, setVersao] = useState(0);
  const { data: historico } = useAsync(() => listHistoricoPontosControle(), [versao]);

  return (
    <Card className="mt-6 overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
        <IconFlask width={18} height={18} className="text-slate-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Pontos de controle e limites (FSSC 22000)</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11.5px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-[11px]">Código</th>
              <th className="px-5 py-[11px]">Nome</th>
              <th className="hidden px-5 py-[11px] sm:table-cell">Tipo</th>
              <th className="px-5 py-[11px]">Limite</th>
              <th className="hidden px-5 py-[11px] lg:table-cell">Ação corretiva</th>
              <th className="px-5 py-[11px]" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pontos.map((pc) => (
              <tr key={pc.codigo} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-mono text-xs text-slate-500">{pc.codigo}</td>
                <td className="px-5 py-3 font-medium text-slate-800">{pc.nome}</td>
                <td className="hidden px-5 py-3 text-xs text-slate-500 sm:table-cell">{TIPO_PCC_LABEL[pc.tipo]}</td>
                <td className="px-5 py-3 text-slate-700">{limiteLabel(pc)}</td>
                <td className="hidden px-5 py-3 text-xs text-slate-500 lg:table-cell">{pc.acao_corretiva ?? '—'}</td>
                <td className="px-5 py-3 text-right">
                  {ehQualidade && (
                    <button type="button" onClick={() => setEditando(pc)} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                      Alterar limite
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {historico && historico.length > 0 && (
        <details className="border-t border-slate-100 px-5 py-3 text-[12.5px]">
          <summary className="cursor-pointer font-medium text-slate-600">Histórico de alterações ({historico.length})</summary>
          <ul className="mt-2 space-y-1 text-slate-600">
            {historico.map((h) => (
              <li key={h.id}>
                <span className="font-mono text-xs">{h.codigo}</span> · {formatarDataHora(h.alterado_em)} ·
                mín {num(h.limite_min_ant)}→{num(h.limite_min)}, máx {num(h.limite_max_ant)}→{num(h.limite_max)} ·
                <span className="text-slate-500"> {h.motivo}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {editando && (
        <ModalLimite pc={editando} onClose={() => setEditando(null)}
          onSaved={() => { setEditando(null); setVersao((v) => v + 1); onSaved(); }} />
      )}
    </Card>
  );
}

function ModalLimite({ pc, onClose, onSaved }: { pc: PontoControle; onClose: () => void; onSaved: () => void }) {
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const n = (k: string) => { const v = String(f.get(k) ?? '').trim().replace(',', '.'); return v ? Number(v) : null; };
    const motivo = String(f.get('motivo') ?? '').trim();
    if (!motivo) { erro('Informe o motivo da alteração.'); return; }
    setSalvando(true);
    try {
      await alterarLimitePontoControle(pc.codigo, n('min'), n('max'), String(f.get('acao') ?? '').trim() || null, motivo);
      sucesso(`Limite de ${pc.codigo} alterado.`);
      onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={`Alterar limite — ${pc.codigo} ${pc.nome}`}>
      <form onSubmit={salvar} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Mínimo${pc.unidade ? ` (${pc.unidade})` : ''}`}><TextInput name="min" type="number" step="any" defaultValue={pc.limite_min ?? ''} /></Field>
          <Field label={`Máximo${pc.unidade ? ` (${pc.unidade})` : ''}`}><TextInput name="max" type="number" step="any" defaultValue={pc.limite_max ?? ''} /></Field>
        </div>
        <Field label="Ação corretiva"><TextInput name="acao" defaultValue={pc.acao_corretiva ?? ''} /></Field>
        <Field label="Motivo da alteração (obrigatório)"><TextInput name="motivo" placeholder="Ex.: revisão do plano APPCC — umidade máx. 13% (FOR PQSA 8)" /></Field>
        <p className="text-[11.5px] text-slate-500">Deixe em branco o limite que não se aplica. A alteração vale na hora para o forno, os avisos e os laudos.</p>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Salvar limite</Button>
        </div>
      </form>
    </Modal>
  );
}
