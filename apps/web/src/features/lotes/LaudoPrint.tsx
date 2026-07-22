import { useParams, Link } from 'react-router-dom';
import { getLaudo, getResultadosDoLaudo, getLote, getProduto, getCliente } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade } from '../../lib/format';
import { TIPO_LAUDO_LABEL } from '@sistema/domain';
import type { LaudoDados } from '@sistema/domain';
import { Spinner } from '../../components/ui';

// Cabeçalho institucional (fixo por enquanto — Bepi Mataruco / Sumaré).
const EMPRESA = {
  nome: 'Indústria e Comércio de Alimentos Sumaré',
  endereco: 'BR-158, S/N - Sítio São Luiz',
  municipio: 'Paranavaí - PR',
  cep: '87701-970',
  telefone: '(44) 99736-0150',
  emails: ['qualidade@bepimataruco.com.br', 'laboratorio@bepimataruco.com.br'],
};

export function LaudoPrint() {
  const { id = '' } = useParams();

  const { data, loading, error } = useAsync(async () => {
    const laudo = await getLaudo(id);
    if (!laudo) return { laudo: null } as const;
    const [resultados, lote, produto] = await Promise.all([
      getResultadosDoLaudo(id),
      getLote(laudo.lote_id),
      getProduto(laudo.produto_id),
    ]);
    const cliente = lote?.cliente_id ? await getCliente(lote.cliente_id) : null;
    return { laudo, resultados, lote, produto, cliente };
  }, [id]);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-7 w-7 text-brand-600" />
      </div>
    );
  if (error || !data || !data.laudo)
    return <div className="p-10 text-sm text-red-600">Laudo não encontrado.</div>;

  const { laudo, resultados, lote, produto, cliente } = data;
  const dados = (laudo.dados ?? {}) as LaudoDados;
  const isVisual = laudo.tipo === 'verificacao_visual';

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      {/* Barra de ações — escondida na impressão */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 print:hidden">
        <Link to={`/lotes/${laudo.lote_id}`} className="text-sm text-slate-500 hover:text-slate-800">
          ← Voltar ao lote
        </Link>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Imprimir / Salvar PDF
        </button>
      </div>

      {/* Folha A4 */}
      <div className="mx-auto my-6 max-w-[210mm] bg-white p-10 shadow-sm print:my-0 print:shadow-none">
        {/* Cabeçalho institucional */}
        <header className="mb-6 border-b border-slate-300 pb-4">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-lg font-bold text-slate-900">{EMPRESA.nome}</h1>
              <p className="text-xs text-slate-500">{EMPRESA.endereco} · {EMPRESA.municipio} · CEP {EMPRESA.cep}</p>
              <p className="text-xs text-slate-500">Tel.: {EMPRESA.telefone}</p>
              <p className="text-xs text-slate-500">{EMPRESA.emails.join(' · ')}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-slate-400">Laudo nº</p>
              <p className="text-xl font-bold text-brand-700">{laudo.numero}</p>
            </div>
          </div>
        </header>

        <h2 className="mb-4 text-center text-base font-semibold text-slate-800">
          {isVisual ? 'Relatório de Verificação Visual – Contaminantes Físicos' : 'Laudo de Análise Interno Físico-Químico'}
        </h2>

        {/* Identificação do lote */}
        <dl className="mb-6 grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
          <Item termo="Produto" valor={produto?.nome ?? '—'} />
          <Item termo="Lote" valor={lote?.codigo ?? '—'} />
          <Item termo="Quantidade (kg)" valor={lote?.quantidade != null ? formatarQuantidade(lote.quantidade) : '—'} />
          <Item termo="Data de fabricação" valor={formatarData(laudo.data_fabricacao ?? lote?.data_producao ?? null)} />
          <Item termo="Data de validade" valor={formatarData(laudo.data_validade)} />
          {cliente && <Item termo="Cliente" valor={cliente.nome} />}
        </dl>

        {/* Tabela de resultados */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-slate-300 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2 font-medium">Ensaio</th>
              <th className="px-3 py-2 font-medium">Resultado</th>
              {!isVisual && <th className="px-3 py-2 font-medium">Unidade</th>}
              <th className="px-3 py-2 font-medium">Valor de referência</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {resultados.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 align-top">
                <td className="px-3 py-2">
                  <p className="text-slate-800">{r.ensaio}</p>
                  {r.metodologia && <p className="mt-0.5 text-[10px] text-slate-400">{r.metodologia}</p>}
                </td>
                <td className="px-3 py-2 font-medium text-slate-800">
                  {r.texto ?? (r.resultado != null ? r.resultado : '—')}
                </td>
                {!isVisual && <td className="px-3 py-2 text-slate-500">{r.unidade ?? '—'}</td>}
                <td className="px-3 py-2 text-slate-500">{r.referencia_texto ?? '—'}</td>
                <td className="px-3 py-2">
                  <span className={r.conforme ? 'text-brand-700' : 'text-red-700'}>
                    {r.conforme ? 'Conforme' : 'Não conforme'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Bags (verificação visual) */}
        {isVisual && dados.bags && dados.bags.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Amostras peneiradas (bags)</p>
            <div className="flex flex-wrap gap-2">
              {dados.bags.map((b, i) => (
                <span key={i} className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600">
                  {b.faixa}: <span className={b.resultado === 'Conforme' ? 'text-brand-700' : 'text-red-700'}>{b.resultado}</span>
                </span>
              ))}
            </div>
            {dados.amostragem && <p className="mt-3 text-xs text-slate-500">{dados.amostragem}</p>}
          </div>
        )}

        {isVisual === false && (
          <p className="mt-4 text-xs text-slate-400">
            Análises microbiológicas realizadas em laboratório externo acreditado conforme a ISO/IEC 17025.
          </p>
        )}

        {laudo.observacao && (
          <p className="mt-4 text-sm text-slate-600"><span className="font-medium">Observações:</span> {laudo.observacao}</p>
        )}

        {/* Resultado geral + rodapé */}
        <div className="mt-8 flex items-end justify-between border-t border-slate-300 pt-4">
          <p className="text-[10px] text-slate-400">Este documento só pode ser reproduzido por inteiro.</p>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-400">Resultado do laudo</p>
            <p className={`text-lg font-bold ${laudo.conforme ? 'text-brand-700' : 'text-red-700'}`}>
              {laudo.conforme ? 'APROVADO' : 'REPROVADO'}
            </p>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-slate-400">{TIPO_LAUDO_LABEL[laudo.tipo]} · Emitido em {formatarData(laudo.emitido_em)}</p>
      </div>
    </div>
  );
}

function Item({ termo, valor }: { termo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{termo}</dt>
      <dd className="font-medium text-slate-700">{valor}</dd>
    </div>
  );
}
