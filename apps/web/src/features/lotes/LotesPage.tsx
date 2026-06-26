import { Link } from 'react-router-dom';
import { listLotes, listProdutos, mapBy } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData } from '../../lib/format';
import { PageHeader, Card, Spinner, EmptyState } from '../../components/ui';
import { StatusChip } from '../../components/StatusChip';
import { IconBox, IconChevronRight } from '../../components/icons';

export function LotesPage() {
  const { data, loading, error } = useAsync(
    async () => {
      const [lotes, produtos] = await Promise.all([listLotes(), listProdutos()]);
      return { lotes, produtos: mapBy(produtos, 'id') };
    },
    [],
  );

  return (
    <>
      <PageHeader title="Lotes" subtitle="Produção e rastreabilidade dos lotes" />

      {loading && (
        <div className="flex justify-center py-20">
          <Spinner className="h-7 w-7 text-emerald-600" />
        </div>
      )}

      {error && (
        <Card className="p-4 text-sm text-red-600">Erro ao carregar lotes: {error}</Card>
      )}

      {data && data.lotes.length === 0 && (
        <EmptyState
          icon={<IconBox width={40} height={40} />}
          title="Nenhum lote ainda"
          description="Os lotes de produção aparecerão aqui conforme forem abertos."
        />
      )}

      {data && data.lotes.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Lote</th>
                <th className="px-5 py-3 font-medium">Produto</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">Produção</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.lotes.map((lote) => (
                <tr key={lote.id} className="group transition hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <Link to={`/lotes/${lote.id}`} className="font-medium text-slate-900">
                      {lote.codigo}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {data.produtos.get(lote.produto_id)?.nome ?? '—'}
                  </td>
                  <td className="hidden px-5 py-3.5 text-slate-500 sm:table-cell">
                    {formatarData(lote.data_producao)}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusChip status={lote.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      to={`/lotes/${lote.id}`}
                      className="inline-flex text-slate-300 transition group-hover:text-emerald-600"
                      aria-label={`Abrir lote ${lote.codigo}`}
                    >
                      <IconChevronRight />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
