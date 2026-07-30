import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listLotes, listProdutos, mapBy } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade } from '../../lib/format';
import { STATUS_LOTE, STATUS_LOTE_LABEL } from '@sistema/domain';
import type { StatusLote } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Pill } from '../../components/ui';
import { IconBox, IconPlus, IconSearch } from '../../components/icons';

// Badge de status no padrão do novo desenho: pastel + texto escuro.
const TOM_STATUS: Record<StatusLote, string> = {
  em_processo: 'bg-indigo-100 text-indigo-800',
  aguardando_liberacao: 'bg-amber-100 text-amber-800',
  liberado: 'bg-emerald-100 text-emerald-800',
  bloqueado: 'bg-red-100 text-red-800',
  expedido: 'bg-slate-100 text-slate-600',
  cancelado: 'bg-slate-100 text-slate-500',
};

export function LotesPage() {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todos' | StatusLote>('todos');
  const navigate = useNavigate();

  const { data, loading, error } = useAsync(async () => {
    const [lotes, produtos] = await Promise.all([listLotes(), listProdutos()]);
    return { lotes, produtos: mapBy(produtos, 'id') };
  }, []);

  const lotes = data?.lotes ?? [];
  // Só oferece filtro dos status que existem hoje.
  const statusPresentes = STATUS_LOTE.filter((st) => lotes.some((l) => l.status === st));

  const filtrados = lotes.filter((l) => {
    if (filtro !== 'todos' && l.status !== filtro) return false;
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    const produto = data?.produtos.get(l.produto_id);
    return [l.codigo, produto?.nome, produto?.nome_curto, produto?.codigo]
      .some((v) => (v ?? '').toLowerCase().includes(q));
  });

  return (
    <>
      <PageHeader
        grupo="Produção"
        title="Lotes"
        subtitle="Produção e rastreabilidade dos lotes"
        action={
          <Button onClick={() => navigate('/ordens')}>
            <IconPlus width={16} height={16} />
            Novo lote
          </Button>
        }
      />

      {/* Filtros em pílula + busca */}
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <Pill ativo={filtro === 'todos'} onClick={() => setFiltro('todos')}>Todos</Pill>
        {statusPresentes.map((st) => (
          <Pill key={st} ativo={filtro === st} onClick={() => setFiltro(st)}>{STATUS_LOTE_LABEL[st]}</Pill>
        ))}
        <div className="relative ml-auto">
          <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar lote ou produto…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-56 rounded-[7px] border border-slate-300 bg-white py-2 pl-9 pr-3 text-[12.5px] outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}
      {error && <Card className="p-4 text-red-600">Erro ao carregar lotes: {error}</Card>}

      {data && lotes.length === 0 && (
        <EmptyState
          icon={<IconBox width={40} height={40} />}
          title="Nenhum lote ainda"
          description='Os lotes nascem das ordens de produção. Clique em "Novo lote" para abrir uma ordem.'
        />
      )}

      {data && lotes.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11.5px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-[11px]">Lote</th>
                  <th className="px-4 py-[11px]">Produto</th>
                  <th className="px-4 py-[11px]">Status</th>
                  <th className="px-4 py-[11px]">Produção</th>
                  <th className="px-4 py-[11px] text-right">Quantidade</th>
                  <th className="px-4 py-[11px] text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((l) => {
                  const p = data.produtos.get(l.produto_id);
                  return (
                    <tr key={l.id} className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{l.codigo}</td>
                      <td className="px-4 py-3 text-slate-600">{p?.nome_curto || p?.nome || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-md px-2.5 py-1 text-[11.5px] font-semibold ${TOM_STATUS[l.status]}`}>
                          {STATUS_LOTE_LABEL[l.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatarData(l.data_producao)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                        {l.quantidade != null ? `${formatarQuantidade(l.quantidade)} kg` : l.volume_texto || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/lotes/${l.id}`} className="text-[12.5px] font-semibold text-brand-700 hover:underline">
                          Detalhes
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtrados.length === 0 && (
            <p className="px-4 py-8 text-center text-slate-400">Nenhum lote encontrado para este filtro.</p>
          )}
        </Card>
      )}
    </>
  );
}

