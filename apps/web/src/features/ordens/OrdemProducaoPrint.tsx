import { Link, useParams } from 'react-router-dom';
import { getOrdemProducao, getLotesDaOrdem, getProduto, getCliente } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarQuantidade } from '../../lib/format';
import { Spinner } from '../../components/ui';
import { IconArrowLeft } from '../../components/icons';

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
  const produtoTxt = produto ? `${produto.codigo ? `(${produto.codigo} - BAG) ` : ''}${produto.nome}` : '';

  const bags = Array.from({ length: totalUnidades }, (_, i) => {
    const n = i + 1;
    return { subl: String(Math.ceil(n / BAGS_POR_SUBLOTE)), bag: n, reproc: false };
  });
  const reproc = Array.from({ length: LINHAS_REPROCESSO }, (_, i) => ({ subl: '50', bag: 101 + i, reproc: true }));
  const linhas = [...bags, ...reproc];

  const td = 'border border-slate-700 px-1 leading-tight';

  return (
    <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <style>{'@media print { @page { size: A4 landscape; margin: 6mm; } .no-print { display: none !important; } html, body { height: auto; } }'}</style>

      <div className="no-print mx-auto mb-4 flex max-w-5xl items-center justify-between">
        <Link to={`/ordens/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <IconArrowLeft width={16} height={16} /> Ordem
        </Link>
        <button onClick={() => window.print()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          Imprimir
        </button>
      </div>

      <div className="mx-auto max-w-5xl bg-white p-3 font-mono text-[9px] leading-tight text-black print:max-w-none print:p-0">
        <div className="border-t-2 border-black" />

        {/* Cabeçalho: dados à esquerda + medidas à direita */}
        <div className="flex justify-between gap-8 border-b-2 border-black py-1">
          <table className="border-collapse">
            <tbody>
              <CabLinha t="ORDEM Nº" v={String(op.numero)} extraT="EMBALAGEM" extraV={undefined} hideExtra />
              <CabLinha t="PEDIDO" v={op.pedido ?? ''} hideExtra />
              <CabLinha t="CLIENTE" v={cliente?.nome ?? ''} hideExtra />
              <CabLinha t="PRODUTO" v={produtoTxt} hideExtra />
              <CabLinha t="PRODUZIR" v={op.quantidade != null ? formatarQuantidade(op.quantidade, 'kg') : ''}
                extraT="EMBALAGEM" extraV={op.embalagem ?? 'KG'} />
              <CabLinha t="LOTE" v={lote?.codigo ?? ''} hideExtra />
              <CabLinha t="REPROCESSAR" v={op.reprocessar ? 'SIM' : ''} hideExtra />
              <CabLinha t="OBSERVAÇÃO" v={op.observacao ?? ''} hideExtra />
            </tbody>
          </table>
          <table className="h-min border-collapse">
            <tbody>
              <MedLinha t="QTD/EMBALAGEM" v={pesoPorBag != null ? formatarQuantidade(pesoPorBag, 'kg') : ''} />
              <MedLinha t="TOTAL UNIDADES" v={totalUnidades ? `${totalUnidades} un.` : ''} />
              <MedLinha t="PESO MÁXIMO" v={op.peso_max != null ? `${op.peso_max} kg` : ''} />
              <MedLinha t="PESO MÍNIMO" v={op.peso_min != null ? `${op.peso_min} kg` : ''} />
            </tbody>
          </table>
        </div>

        {/* Data início / reprocesso */}
        <div className="flex items-stretch border-b-2 border-black">
          <div className="flex flex-1 items-center gap-2 py-1">
            <span className="font-bold">DATA INÍCIO :</span>
            <span className="min-w-[120px] border border-black px-2 text-center">/&nbsp;&nbsp;&nbsp;&nbsp;/</span>
          </div>
          <div className="flex flex-[2] items-center gap-2 py-1 pl-4">
            <span className="font-bold">REPROCESSO:</span>
            <span className="flex-1 border border-black px-2 text-right">kg</span>
          </div>
        </div>

        {/* Quadro bag a bag */}
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="font-bold">
              <th className={`${td} w-[11%] text-center`}>DATA</th>
              <th className={`${td} w-[5%] text-center`}>SUBL</th>
              <th className={`${td} w-[5%] text-center`}>BAG</th>
              <th className={`${td} w-[7%] text-center`}>HORA</th>
              <th className={`${td} w-[7%] text-center`}>PESO</th>
              <th className={`${td} w-[10%] text-center`}>LACRE Nº</th>
              <th className={`${td} w-[12%] text-center`}>BAG INTEGRO</th>
              <th className={`${td} w-[15%] text-center`}>RESPONSÁVEL</th>
              <th className={`${td} w-[13%] text-center`}>LIBERADO GQ</th>
              <th className={`${td} w-[15%] text-center`}>APONTAMENTO</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={`${l.subl}-${l.bag}`}>
                <td className={`${td} whitespace-nowrap`}>{l.reproc ? 'A REPROCESSAR' : ' '}</td>
                <td className={`${td} text-center`}>{l.subl}</td>
                <td className={`${td} text-center`}>{l.bag}</td>
                <td className={td} />
                <td className={td} />
                <td className={td} />
                <td className={`${td} text-center whitespace-nowrap`}>( )S&nbsp;&nbsp;( )N</td>
                <td className={td} />
                <td className={`${td} text-center whitespace-nowrap`}>( )S&nbsp;&nbsp;( )N</td>
                <td className={td} />
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={10} className={`${td} py-2 text-center`}>
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

function CabLinha({ t, v, extraT, extraV, hideExtra }: {
  t: string; v: string; extraT?: string; extraV?: string; hideExtra?: boolean;
}) {
  return (
    <tr>
      <td className="whitespace-nowrap pr-2 align-top font-bold">{t}</td>
      <td className="pr-1 align-top">:</td>
      <td className="align-top">{v}</td>
      {!hideExtra && extraT ? (
        <>
          <td className="whitespace-nowrap pl-8 pr-2 align-top font-bold">{extraT}</td>
          <td className="pr-1 align-top">:</td>
          <td className="align-top">{extraV}</td>
        </>
      ) : null}
    </tr>
  );
}

function MedLinha({ t, v }: { t: string; v: string }) {
  return (
    <tr>
      <td className="whitespace-nowrap pr-2 align-top font-bold">{t}</td>
      <td className="pr-1 align-top">:</td>
      <td className="whitespace-nowrap align-top">{v}</td>
    </tr>
  );
}
