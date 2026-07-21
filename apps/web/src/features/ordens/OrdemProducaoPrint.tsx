import { Link, useParams } from 'react-router-dom';
import { getOrdemProducao, getLotesDaOrdem, getProduto, getCliente } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarQuantidade } from '../../lib/format';
import { Spinner } from '../../components/ui';
import { IconArrowLeft, IconLeaf } from '../../components/icons';

// Bags por sublote (grupo do quadro). Ajuste aqui se o padrão mudar.
const BAGS_POR_SUBLOTE = 8;
// Linhas de reprocesso pré-impressas (SUBL 50, numeração 101+).
const LINHAS_REPROCESSO = 8;

export function OrdemProducaoPrint() {
  const { id = '' } = useParams();
  const { data, loading } = useAsync(async () => {
    const op = await getOrdemProducao(id);
    if (!op) return { op: null } as const;
    const [lotes, produto, cliente] = await Promise.all([
      getLotesDaOrdem(id),
      getProduto(op.produto_id),
      op.cliente_id ? getCliente(op.cliente_id) : Promise.resolve(null),
    ]);
    return { op, lote: lotes[0] ?? null, produto, cliente };
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-emerald-600" /></div>;
  if (!data?.op) return <p className="p-8 text-sm text-slate-500">Ordem não encontrada.</p>;
  const { op, lote, produto, cliente } = data;

  const totalUnidades = op.qtd_embalagem ?? 0;
  const pesoPorBag = op.quantidade && op.qtd_embalagem ? op.quantidade / op.qtd_embalagem : null;
  const produtoTxt = produto ? `${produto.codigo ? `(${produto.codigo}) ` : ''}${produto.nome}` : '—';

  // Linhas do quadro: bags de produção + bloco de reprocesso.
  const bags = Array.from({ length: totalUnidades }, (_, i) => {
    const n = i + 1;
    return { subl: String(Math.ceil(n / BAGS_POR_SUBLOTE)), bag: n, reproc: false };
  });
  const reproc = Array.from({ length: LINHAS_REPROCESSO }, (_, i) => ({ subl: '50', bag: 101 + i, reproc: true }));
  const linhas = [...bags, ...reproc];

  return (
    <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <style>{'@media print { @page { size: A4 portrait; margin: 8mm; } .no-print { display: none !important; } }'}</style>

      <div className="no-print mx-auto mb-4 flex max-w-4xl items-center justify-between">
        <Link to={`/ordens/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <IconArrowLeft width={16} height={16} /> Ordem
        </Link>
        <button onClick={() => window.print()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          Imprimir
        </button>
      </div>

      <div className="mx-auto max-w-4xl border border-slate-400 bg-white p-4 text-xs text-slate-900 print:border-0">
        {/* Cabeçalho institucional */}
        <div className="mb-2 flex items-center justify-between border-b-2 border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded bg-emerald-700 text-white"><IconLeaf width={20} height={20} /></span>
            <div>
              <p className="font-bold leading-tight">INDÚSTRIA E COMÉRCIO ALIMENTOS SUMARÉ</p>
              <p className="text-[10px] text-slate-500">Bepi Mataruco · Ordem de Produção</p>
            </div>
          </div>
          <p className="font-mono text-lg font-bold">ORDEM Nº {op.numero}</p>
        </div>

        {/* Dados da OP: duas colunas */}
        <div className="mb-2 grid grid-cols-2 gap-x-6 border-b border-slate-400 pb-2">
          <div className="space-y-0.5">
            <Ln t="Pedido" v={op.pedido ?? ''} />
            <Ln t="Cliente" v={cliente?.nome ?? ''} />
            <Ln t="Produto" v={produtoTxt} />
            <Ln t="Produzir" v={op.quantidade != null ? formatarQuantidade(op.quantidade, 'kg') : ''} />
            <Ln t="Embalagem" v={op.embalagem ?? 'KG'} />
            <Ln t="Lote" v={lote?.codigo ?? ''} />
            <Ln t="Reprocessar" v={op.reprocessar ? 'SIM' : 'NÃO'} />
            <Ln t="Observação" v={op.observacao ?? ''} />
          </div>
          <div className="space-y-0.5">
            <Ln t="Qtd/Embalagem" v={pesoPorBag != null ? formatarQuantidade(pesoPorBag, 'kg') : ''} />
            <Ln t="Total unidades" v={totalUnidades ? `${totalUnidades} un.` : ''} />
            <Ln t="Peso máximo" v={op.peso_max != null ? `${op.peso_max} kg` : ''} />
            <Ln t="Peso mínimo" v={op.peso_min != null ? `${op.peso_min} kg` : ''} />
          </div>
        </div>

        {/* Data início / reprocesso */}
        <div className="mb-2 flex items-center gap-6 border-b border-slate-400 pb-2">
          <span className="font-bold uppercase">Data início: <span className="ml-2 font-normal">___/___/______</span></span>
          <span className="font-bold uppercase">Reprocesso: <span className="ml-2 font-normal">____________ kg</span></span>
        </div>

        {/* Quadro bag a bag */}
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-100">
              {['Data', 'Subl', 'Bag', 'Hora', 'Peso', 'Lacre Nº', 'Bag íntegro', 'Responsável', 'Liberado GQ', 'Apontamento'].map((h) => (
                <th key={h} className="border border-slate-500 px-1 py-1 text-center font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={`${l.subl}-${l.bag}`} className={l.reproc ? 'bg-amber-50' : ''}>
                <td className="border border-slate-500 px-1 py-1.5">{l.reproc ? 'A REPROCESSAR' : ''}</td>
                <td className="border border-slate-500 px-1 py-1.5 text-center font-medium">{l.subl}</td>
                <td className="border border-slate-500 px-1 py-1.5 text-center font-medium">{l.bag}</td>
                <td className="border border-slate-500 px-1 py-1.5" />
                <td className="border border-slate-500 px-1 py-1.5" />
                <td className="border border-slate-500 px-1 py-1.5" />
                <td className="border border-slate-500 px-1 py-1.5 text-center whitespace-nowrap">( )S ( )N</td>
                <td className="border border-slate-500 px-1 py-1.5" />
                <td className="border border-slate-500 px-1 py-1.5 text-center whitespace-nowrap">( )S ( )N</td>
                <td className="border border-slate-500 px-1 py-1.5" />
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={10} className="border border-slate-500 px-2 py-3 text-center text-slate-400">
                  Defina "Total unidades" (qtd/embalagem) na ordem para gerar o quadro de bags.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Ln({ t, v }: { t: string; v: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0 font-bold uppercase text-slate-700">{t}:</span>
      <span className="flex-1 border-b border-dotted border-slate-300">{v}</span>
    </div>
  );
}
