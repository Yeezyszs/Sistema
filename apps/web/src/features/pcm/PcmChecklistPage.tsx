import { useEffect, useState } from 'react';
import {
  listColaboradoresPcm, listFerramentasPcm, listEstadosChecklist, salvarEstadoChecklist,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import {
  ESTADO_CHECKLIST, ESTADO_CHECKLIST_LABEL, ESTADO_CHECKLIST_TOM,
  proximoEstadoChecklist, diasNoMes,
} from '@sistema/domain';
import type { EstadoChecklist } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Field, Select } from '../../components/ui';
import { useToast } from '../../components/Toast';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const chave = (ferramentaId: string, dia: number) => `${ferramentaId}|${dia}`;

export function PcmChecklistPage() {
  const hoje = new Date();
  const [colaboradorId, setColaboradorId] = useState('');
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  // Estado local por célula (ferramenta|dia -> estado), sincronizado do banco.
  const [estados, setEstados] = useState<Map<string, EstadoChecklist>>(new Map());
  const { erro } = useToast();

  const { data, loading } = useAsync(async () => {
    const [colaboradores, ferramentas] = await Promise.all([
      listColaboradoresPcm(), listFerramentasPcm(),
    ]);
    const doChecklist = ferramentas.filter((f) => !f.caixa); // caixa null = tipo checklist
    const linhas = colaboradorId ? await listEstadosChecklist(colaboradorId, ano, mes) : [];
    return { colaboradores, ferramentas: doChecklist, linhas };
  }, [colaboradorId, ano, mes]);

  // Recarrega o mapa local sempre que os dados do período mudam.
  useEffect(() => {
    const m = new Map<string, EstadoChecklist>();
    for (const l of data?.linhas ?? []) m.set(chave(l.ferramenta_id, l.dia), l.estado);
    setEstados(m);
  }, [data?.linhas]);

  const dias = diasNoMes(ano, mes);
  const anos = [hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1];

  async function clicar(ferramentaId: string, dia: number) {
    if (!colaboradorId) return;
    const k = chave(ferramentaId, dia);
    const atual = estados.get(k) ?? null;
    const proximo = proximoEstadoChecklist(atual);
    // Otimista
    setEstados((prev) => {
      const n = new Map(prev);
      if (proximo === null) n.delete(k); else n.set(k, proximo);
      return n;
    });
    try {
      await salvarEstadoChecklist(colaboradorId, ferramentaId, ano, mes, dia, proximo);
    } catch (err) {
      // Reverte em caso de falha
      setEstados((prev) => {
        const n = new Map(prev);
        if (atual === null) n.delete(k); else n.set(k, atual);
        return n;
      });
      erro(err instanceof Error ? err.message : 'Falha ao salvar.');
    }
  }

  return (
    <>
      <PageHeader
        title="Checklist de ferramentas"
        subtitle="Verificação diária por colaborador — grade mensal (PCM)"
      />

      {/* Filtros */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:max-w-2xl">
        <Field label="Colaborador">
          <Select value={colaboradorId} onChange={(e) => setColaboradorId(e.target.value)}>
            <option value="">Selecione…</option>
            {(data?.colaboradores ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </Select>
        </Field>
        <Field label="Mês">
          <Select value={mes} onChange={(e) => setMes(Number(e.target.value))}>
            {MESES.map((nome, i) => <option key={nome} value={i + 1}>{nome}</option>)}
          </Select>
        </Field>
        <Field label="Ano">
          <Select value={ano} onChange={(e) => setAno(Number(e.target.value))}>
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
        </Field>
      </div>

      {/* Legenda */}
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {ESTADO_CHECKLIST.map((e) => (
          <span key={e} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${ESTADO_CHECKLIST_TOM[e]}`}>
            <span className="font-bold">{e}</span> {ESTADO_CHECKLIST_LABEL[e]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-slate-400 ring-1 ring-slate-200">
          Clique numa célula para avançar o estado
        </span>
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-emerald-600" /></div>}

      {data && !colaboradorId && (
        <EmptyState title="Selecione um colaborador" description="Escolha o colaborador para preencher a grade do mês." />
      )}

      {data && colaboradorId && data.ferramentas.length === 0 && (
        <EmptyState title="Nenhuma ferramenta de checklist" description="Cadastre ferramentas sem caixa (tipo checklist) em Cadastros (PCM)." />
      )}

      {data && colaboradorId && data.ferramentas.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="min-w-max text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-400">
                <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-medium">Ferramenta</th>
                {Array.from({ length: dias }, (_, i) => i + 1).map((d) => (
                  <th key={d} className="w-8 px-0 py-2 text-center font-medium">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.ferramentas.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50/60">
                  <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium text-slate-700 whitespace-nowrap">
                    {f.nome}
                    {f.tipo && <span className="ml-1.5 text-xs font-normal text-slate-400">{f.tipo}</span>}
                  </td>
                  {Array.from({ length: dias }, (_, i) => i + 1).map((d) => {
                    const estado = estados.get(chave(f.id, d)) ?? null;
                    return (
                      <td key={d} className="p-0.5 text-center">
                        <button
                          onClick={() => void clicar(f.id, d)}
                          title={estado ? ESTADO_CHECKLIST_LABEL[estado] : 'Vazio'}
                          className={`h-7 w-7 rounded text-xs font-bold transition ${
                            estado ? ESTADO_CHECKLIST_TOM[estado] : 'bg-slate-50 text-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {estado ?? '·'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
