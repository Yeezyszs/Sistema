import { Link, useParams } from 'react-router-dom';
import {
  getLote,
  getEtapasDoLote,
  getRegistrosDoLote,
  getMovimentosDoLote,
  getRecebimentosDoLote,
  listEtapas,
  listProdutos,
  listEquipamentos,
  listFuncionarios,
  mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarHora, formatarQuantidade } from '../../lib/format';
import { etapaConcluida, etapaEmAndamento, TIPO_MOVIMENTO_LABEL } from '@sistema/domain';
import type { EtapaLote } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState } from '../../components/ui';
import { StatusChip } from '../../components/StatusChip';
import { Timeline, type TimelineItem, type TimelineEstado } from '../../components/Timeline';
import { IconArrowLeft, IconDoc } from '../../components/icons';

export function LotePage() {
  const { id = '' } = useParams();

  const { data, loading, error } = useAsync(async () => {
    const lote = await getLote(id);
    if (!lote) return { lote: null } as const;
    const [
      etapasCat,
      etapasLote,
      registros,
      movimentos,
      recebimentos,
      produtos,
      equipamentos,
      funcionarios,
    ] = await Promise.all([
      listEtapas(),
      getEtapasDoLote(id),
      getRegistrosDoLote(id),
      getMovimentosDoLote(id),
      getRecebimentosDoLote(id),
      listProdutos(),
      listEquipamentos(),
      listFuncionarios(),
    ]);
    return {
      lote,
      etapasCat,
      etapasLote: mapBy(etapasLote, 'etapa_codigo'),
      registros,
      movimentos,
      recebimentos,
      produtos: mapBy(produtos, 'id'),
      equipamentos: mapBy(equipamentos, 'id'),
      funcionarios: mapBy(funcionarios, 'id'),
    };
  }, [id]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-7 w-7 text-emerald-600" />
      </div>
    );

  if (error) return <Card className="p-4 text-sm text-red-600">Erro: {error}</Card>;
  if (!data || !data.lote)
    return (
      <>
        <BackLink />
        <EmptyState title="Lote não encontrado" />
      </>
    );

  const { lote, etapasCat, etapasLote, registros, movimentos, recebimentos } = data;

  const itens: TimelineItem[] = etapasCat.map((etapa) => {
    const el: EtapaLote | undefined = etapasLote.get(etapa.codigo);
    let estado: TimelineEstado = 'pendente';
    if (el && etapaConcluida(el)) estado = 'concluida';
    else if (el && etapaEmAndamento(el)) estado = 'andamento';

    const operador = el?.operador_id ? data.funcionarios.get(el.operador_id)?.nome : null;
    const equipamento = el?.equipamento_id ? data.equipamentos.get(el.equipamento_id)?.nome : null;

    return {
      titulo: etapa.nome,
      estado,
      meta: el?.finalizado_em
        ? formatarHora(el.finalizado_em)
        : el?.iniciado_em
          ? `início ${formatarHora(el.iniciado_em)}`
          : undefined,
      detalhe:
        operador || equipamento ? (
          <span>
            {[equipamento, operador].filter(Boolean).join(' · ')}
          </span>
        ) : undefined,
    };
  });

  return (
    <>
      <BackLink />

      <PageHeader
        title={lote.codigo}
        subtitle={data.produtos.get(lote.produto_id)?.nome}
        action={<StatusChip status={lote.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Coluna principal: timeline */}
        <Card className="p-6 lg:col-span-3">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Etapas de produção
          </h2>
          <Timeline itens={itens} />
        </Card>

        {/* Coluna lateral */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Dados do lote
            </h2>
            <dl className="space-y-3 text-sm">
              <Linha termo="Produto" valor={data.produtos.get(lote.produto_id)?.nome ?? '—'} />
              <Linha termo="Data de produção" valor={formatarData(lote.data_producao)} />
              <Linha termo="Matéria-prima" valor={`${recebimentos.length} recebimento(s)`} />
            </dl>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Movimentos de estoque
            </h2>
            {movimentos.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum movimento registrado.</p>
            ) : (
              <ul className="space-y-2.5 text-sm">
                {movimentos.map((m) => (
                  <li key={m.id} className="flex items-center justify-between">
                    <span className="text-slate-600">{TIPO_MOVIMENTO_LABEL[m.tipo]}</span>
                    <span className="font-medium text-slate-800">
                      {formatarQuantidade(m.quantidade)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* Documentos / registros da rastreabilidade */}
      <Card className="mt-6 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Documentos e registros
        </h2>
        {registros.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum documento anexado a este lote.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {registros.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <IconDoc width={18} height={18} />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">
                    {r.tipo_documento.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-slate-400">
                    {r.etapa_codigo ?? '—'} · {formatarHora(r.registrado_em)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function Linha({ termo, valor }: { termo: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-400">{termo}</dt>
      <dd className="text-right font-medium text-slate-700">{valor}</dd>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/lotes"
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-800"
    >
      <IconArrowLeft width={16} height={16} />
      Lotes
    </Link>
  );
}
