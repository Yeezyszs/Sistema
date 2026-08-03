// Relatórios da homologação documental: para onde o vencimento está indo,
// como cada segmento está, e a exportação para quem precisa levar em planilha.
import { useMemo } from 'react';
import { listFornecedores, listSegmentosFornecedor, listFornecedorSegmentos, getChecklistGeral } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, hojeLocalISO } from '../../lib/format';
import { STATUS_DOCUMENTAL_LABEL, CLASSIFICACAO_RISCO_LABEL } from '@sistema/domain';
import type { Fornecedor, ItemChecklistGeral } from '@sistema/domain';
import { Card, CardTitle, Spinner, Button, EmptyState, LINHA_CABECALHO } from '../../components/ui';
import { ErroCard } from './comum';

function paraCSV(linhas: Fornecedor[]): string {
  const cab = ['Razao social', 'CNPJ', 'Telefone', 'E-mail', 'Risco', 'Situacao documental', 'Cadastro'];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const corpo = linhas.map((f) => [
    f.razao_social,
    f.cnpj ?? '',
    f.telefone ?? '',
    f.email ?? '',
    f.classificacao_risco ? CLASSIFICACAO_RISCO_LABEL[f.classificacao_risco] : '',
    STATUS_DOCUMENTAL_LABEL[f.status_documental],
    f.data_cadastro,
  ].map((c) => esc(String(c))).join(','));
  return [cab.map(esc).join(','), ...corpo].join('\n');
}

export function RelatoriosDocumentos() {
  const { data, loading, error } = useAsync(async () => {
    const [fornecedores, segmentos, vinculos] = await Promise.all([
      listFornecedores(), listSegmentosFornecedor(), listFornecedorSegmentos(),
    ]);
    let checklist: ItemChecklistGeral[] = [];
    let indisponivel = false;
    try {
      checklist = await getChecklistGeral();
    } catch {
      indisponivel = true;
    }
    return { fornecedores, segmentos, vinculos, checklist, indisponivel };
  }, []);

  // Documentos vigentes que vencem nos próximos 6 meses, por mês.
  const meses = useMemo(() => {
    const hoje = new Date();
    const base: { chave: string; rotulo: string; qtd: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      base.push({
        chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        rotulo: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') + '/' + String(d.getFullYear()).slice(2),
        qtd: 0,
      });
    }
    for (const i of data?.checklist ?? []) {
      if (!i.proxima_validade) continue;
      const m = base.find((b) => b.chave === i.proxima_validade!.slice(0, 7));
      if (m) m.qtd++;
    }
    return base;
  }, [data?.checklist]);

  const grafico = useMemo(() => {
    const max = Math.max(...meses.map((m) => m.qtd), 1);
    const largura = 660, topo = 20, base = 180;
    const passo = (largura - 30) / Math.max(meses.length - 1, 1);
    const pontos = meses.map((m, i) => ({
      ...m,
      x: 30 + i * passo,
      y: topo + (base - topo) * (1 - m.qtd / max),
    }));
    const linha = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const ultimo = pontos[pontos.length - 1]!;
    const primeiro = pontos[0]!;
    return {
      pontos, linha, base,
      area: `${linha} L${ultimo.x.toFixed(1)},${base} L${primeiro.x.toFixed(1)},${base} Z`,
    };
  }, [meses]);

  const porSegmento = useMemo(() => {
    if (!data) return [];
    const vencidosPorFornecedor = new Map<string, number>();
    for (const i of data.checklist) {
      if (i.estado === 'vencido') {
        vencidosPorFornecedor.set(i.fornecedor_id, (vencidosPorFornecedor.get(i.fornecedor_id) ?? 0) + 1);
      }
    }
    return data.segmentos.map((s) => {
      const ids = new Set(data.vinculos.filter((v) => v.segmento_id === s.id).map((v) => v.fornecedor_id));
      const doSeg = data.fornecedores.filter((f) => ids.has(f.id));
      return {
        nome: s.nome,
        emDia: doSeg.filter((f) => f.status_documental === 'ok').length,
        pendentes: doSeg.filter((f) => f.status_documental === 'pendente').length,
        vencidos: doSeg.reduce((acc, f) => acc + (vencidosPorFornecedor.get(f.id) ?? 0), 0),
        total: doSeg.length,
      };
    }).filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
  }, [data]);

  function exportar() {
    if (!data) return;
    const blob = new Blob(['﻿' + paraCSV(data.fornecedores)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fornecedores-${hojeLocalISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) return <ErroCard mensagem={error} />;
  if (loading || !data) return <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-brand-600" /></div>;

  return (
    <div className="space-y-3.5">
      {data.indisponivel && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Não foi possível consultar os documentos agora — os números de vencimento estão
          incompletos. <strong className="font-semibold">Não use este relatório como evidência.</strong>
        </div>
      )}

      <Card className="p-[18px]">
        <CardTitle sub="Próximos 6 meses, todos os segmentos">Documentos vencendo por período</CardTitle>
        <svg viewBox="0 0 680 220" className="h-[220px] w-full">
          <line x1="30" y1={grafico.base} x2="660" y2={grafico.base} stroke="#e2e8f0" strokeWidth="1" />
          <path d={grafico.area} fill="#000f89" opacity="0.08" />
          <path d={grafico.linha} fill="none" stroke="#000f89" strokeWidth="2.5" />
          {grafico.pontos.map((p) => (
            <g key={p.chave}>
              <circle cx={p.x} cy={p.y} r="4" fill="#000f89" />
              <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="12" fontWeight="700" fill="#0f172a">{p.qtd}</text>
              <text x={p.x} y="200" textAnchor="middle" fontSize="12" fill="#64748b">{p.rotulo}</text>
            </g>
          ))}
        </svg>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-[18px] pt-[18px]"><CardTitle>Situação por segmento</CardTitle></div>
        {porSegmento.length === 0 ? (
          <EmptyState title="Nenhum fornecedor vinculado a segmentos" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className={LINHA_CABECALHO}>
                <th className="px-[18px] py-[11px]">Segmento</th>
                <th className="px-[18px] py-[11px]">Em dia</th>
                <th className="px-[18px] py-[11px]">Com pendência</th>
                <th className="px-[18px] py-[11px]">Docs vencidos</th>
                <th className="px-[18px] py-[11px]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {porSegmento.map((r) => (
                <tr key={r.nome}>
                  <td className="px-[18px] py-3 font-medium text-slate-800">{r.nome}</td>
                  <td className="px-[18px] py-3 font-semibold text-emerald-700 tabular-nums">{r.emDia}</td>
                  <td className="px-[18px] py-3 font-semibold text-amber-700 tabular-nums">{r.pendentes}</td>
                  <td className="px-[18px] py-3 font-semibold text-red-700 tabular-nums">{r.vencidos}</td>
                  <td className="px-[18px] py-3 text-slate-600 tabular-nums">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-semibold text-slate-800">Exportar fornecedores</p>
          <p className="text-xs text-slate-500">
            {data.fornecedores.length} fornecedor(es) — CSV com contato, risco, situação e data de cadastro.
          </p>
        </div>
        <Button variant="outline" onClick={exportar} disabled={data.fornecedores.length === 0}>
          Exportar CSV
        </Button>
      </Card>
    </div>
  );
}
