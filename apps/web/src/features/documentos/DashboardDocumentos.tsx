// Visão geral da homologação documental: onde a Qualidade olha primeiro.
import { useMemo } from 'react';
import { listFornecedoresDocumentais, listSegmentosFornecedor, listFornecedorSegmentos, getChecklistGeral } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData } from '../../lib/format';
import { STATUS_DOCUMENTAL_LABEL, CLASSIFICACAO_RISCO_LABEL, CLASSIFICACAO_RISCO_COR } from '@sistema/domain';
import type { ItemChecklistGeral } from '@sistema/domain';
import { Card, CardTitle, Spinner, EmptyState, LINHA_CABECALHO } from '../../components/ui';
import { ErroCard, STATUS_CLASS, diasAte } from './comum';

const JANELA_DIAS = 30;

interface Alerta {
  chave: string;
  fornecedor: string;
  documento: string;
  rotulo: string;
  critico: boolean;
  urgencia: number;
}

export function DashboardDocumentos({ onAbrirFornecedores }: { onAbrirFornecedores: () => void }) {
  const { data, loading, error } = useAsync(async () => {
    const [fornecedores, segmentos, vinculos] = await Promise.all([
      listFornecedoresDocumentais(), listSegmentosFornecedor(), listFornecedorSegmentos(),
    ]);
    // O checklist é o coração do painel: se falhar, dizemos isso em vez de
    // mostrar zero e passar a impressão de que está tudo em dia.
    let checklist: ItemChecklistGeral[] = [];
    let indisponivel = false;
    try {
      checklist = await getChecklistGeral();
    } catch {
      indisponivel = true;
    }
    return { fornecedores, segmentos, vinculos, checklist, indisponivel };
  }, []);

  const alertas = useMemo<Alerta[]>(() => {
    const itens: Alerta[] = [];
    for (const i of data?.checklist ?? []) {
      const chave = i.fornecedor_id + i.documento_exigido_id;
      const dias = diasAte(i.proxima_validade);
      if (i.estado === 'vencido') {
        itens.push({
          chave, fornecedor: i.fornecedor, documento: i.documento, critico: true,
          rotulo: dias !== null ? `Vencido há ${Math.abs(dias)} dias` : 'Vencido',
          urgencia: dias !== null ? -1000 + dias : -2000,
        });
      } else if (i.estado === 'ok' && dias !== null && dias <= JANELA_DIAS) {
        itens.push({
          chave, fornecedor: i.fornecedor, documento: i.documento, critico: false,
          rotulo: `Vence em ${dias} dias`, urgencia: dias,
        });
      } else if (i.estado === 'faltando' && i.exigencia === 'obrigatorio') {
        itens.push({
          chave, fornecedor: i.fornecedor, documento: i.documento, critico: false,
          rotulo: 'Pendente de envio', urgencia: 500,
        });
      }
    }
    return itens.sort((a, b) => a.urgencia - b.urgencia);
  }, [data?.checklist]);

  const barras = useMemo(() => {
    if (!data) return [];
    const contagem = data.segmentos.map((s) => ({
      nome: s.nome,
      qtd: data.vinculos.filter((v) => v.segmento_id === s.id).length,
    })).filter((c) => c.qtd > 0);
    const max = Math.max(...contagem.map((c) => c.qtd), 1);
    return contagem.sort((a, b) => b.qtd - a.qtd).slice(0, 8)
      .map((c) => ({ ...c, pct: Math.round((c.qtd / max) * 100) }));
  }, [data]);

  if (error) return <ErroCard mensagem={error} />;
  if (loading || !data) return <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-brand-600" /></div>;

  const { fornecedores } = data;
  const emDia = fornecedores.filter((f) => f.status_documental === 'ok').length;
  const pendentes = fornecedores.filter((f) => f.status_documental === 'pendente').length;
  const vencidos = data.checklist.filter((i) => i.estado === 'vencido').length;

  const recentes = [...fornecedores]
    .sort((a, b) => (b.data_cadastro > a.data_cadastro ? 1 : -1))
    .slice(0, 6);

  return (
    <>
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Kpi rotulo="Fornecedores" valor={String(fornecedores.length)} />
        <Kpi rotulo="Documentação em dia" valor={String(emDia)} cor="text-emerald-700" />
        <Kpi rotulo="Com pendência" valor={String(pendentes)} cor="text-amber-700" />
        <Kpi rotulo="Documentos vencidos" valor={data.indisponivel ? '—' : String(vencidos)} cor="text-red-700" />
      </div>

      <Card className="mt-3.5 p-[18px]">
        <CardTitle sub={data.indisponivel ? undefined : alertas.length === 1 ? '1 item precisa de atenção' : `${alertas.length} itens precisam de atenção`}>
          Ação necessária
        </CardTitle>
        {data.indisponivel ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
            Não foi possível consultar os documentos agora, então esta lista pode estar incompleta.{' '}
            <strong className="font-semibold">Não considere como "tudo em dia".</strong> Recarregue a
            página para tentar de novo.
          </div>
        ) : alertas.length === 0 ? (
          <p className="py-4 text-[13.5px] text-slate-500">Nenhum item pendente no momento — tudo em dia.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {alertas.slice(0, 8).map((a) => (
              <li key={a.chave} className="flex items-center justify-between gap-4 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${a.critico ? 'bg-red-600' : 'bg-amber-500'}`} />
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-slate-900">{a.fornecedor}</p>
                    <p className="truncate text-[12.5px] text-slate-500">{a.documento}</p>
                  </div>
                </div>
                <span className={`shrink-0 text-[12.5px] font-semibold ${a.critico ? 'text-red-700' : 'text-amber-700'}`}>
                  {a.rotulo}
                </span>
              </li>
            ))}
          </ul>
        )}
        {alertas.length > 8 && (
          <p className="mt-2 text-xs text-slate-400">+{alertas.length - 8} não exibido(s)</p>
        )}
      </Card>

      <div className="mt-3.5 grid gap-3.5 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="px-[18px] pt-[18px]">
            <CardTitle>
              Fornecedores recentes
            </CardTitle>
          </div>
          {recentes.length === 0 ? (
            <EmptyState title="Nenhum fornecedor cadastrado" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className={LINHA_CABECALHO}>
                  <th className="px-[18px] py-[11px]">Fornecedor</th>
                  <th className="px-[18px] py-[11px]">Situação</th>
                  <th className="hidden px-[18px] py-[11px] sm:table-cell">Risco</th>
                  <th className="hidden px-[18px] py-[11px] md:table-cell">Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentes.map((f) => (
                  <tr key={f.id} onClick={onAbrirFornecedores} className="cursor-pointer hover:bg-slate-50">
                    <td className="px-[18px] py-3 font-medium text-slate-800">{f.razao_social}</td>
                    <td className="px-[18px] py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[f.status_documental]}`}>
                        {STATUS_DOCUMENTAL_LABEL[f.status_documental]}
                      </span>
                    </td>
                    <td className="hidden px-[18px] py-3 sm:table-cell">
                      {f.classificacao_risco ? (
                        <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-700">
                          <span className="h-2 w-2 rounded-full" style={{ background: CLASSIFICACAO_RISCO_COR[f.classificacao_risco] }} />
                          {CLASSIFICACAO_RISCO_LABEL[f.classificacao_risco]}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="hidden px-[18px] py-3 text-slate-500 md:table-cell">{formatarData(f.data_cadastro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-[18px]">
          <CardTitle>Fornecedores por segmento</CardTitle>
          {barras.length === 0 ? (
            <p className="text-[13px] text-slate-400">Nenhum fornecedor vinculado a segmentos.</p>
          ) : (
            barras.map((b) => (
              <div key={b.nome} className="mb-3">
                <div className="mb-1.5 flex justify-between text-[12.5px]">
                  <span className="truncate pr-2 font-semibold text-slate-700">{b.nome}</span>
                  <span className="text-slate-500">{b.qtd}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-700" style={{ width: `${b.pct}%` }} />
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </>
  );
}

function Kpi({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <Card className="px-[18px] py-4">
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">{rotulo}</p>
      <p className={`mt-2 text-2xl font-bold leading-none tabular-nums ${cor ?? 'text-slate-900'}`}>{valor}</p>
    </Card>
  );
}
