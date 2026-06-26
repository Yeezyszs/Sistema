import { useState } from 'react';
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
  listClientes,
  iniciarEtapa,
  finalizarEtapa,
  atualizarStatusLote,
  liberarLoteGate,
  mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarHora, formatarQuantidade } from '../../lib/format';
import { etapaConcluida, etapaEmAndamento, TIPO_MOVIMENTO_LABEL, lotePodeSolicitarLiberacao } from '@sistema/domain';
import type { EtapaLote } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button } from '../../components/ui';
import { StatusChip } from '../../components/StatusChip';
import { Timeline, type TimelineItem, type TimelineEstado } from '../../components/Timeline';
import { IconArrowLeft, IconDoc } from '../../components/icons';
import { useToast } from '../../components/Toast';

export function LotePage() {
  const { id = '' } = useParams();
  const [recarregar, setRecarregar] = useState(0);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<string | null>(null);
  const [liberando, setLiberando] = useState(false);
  const { sucesso, erro } = useToast();

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
      clientes,
    ] = await Promise.all([
      listEtapas(),
      getEtapasDoLote(id),
      getRegistrosDoLote(id),
      getMovimentosDoLote(id),
      getRecebimentosDoLote(id),
      listProdutos(),
      listEquipamentos(),
      listFuncionarios(),
      listClientes(),
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
      clientes: mapBy(clientes, 'id'),
    };
  }, [id, recarregar]);

  async function handleIniciar(etapaCodigo: string) {
    setAcaoEmAndamento(etapaCodigo);
    try {
      await iniciarEtapa(id, etapaCodigo);
      sucesso('Etapa iniciada.');
      setRecarregar((n) => n + 1);
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha ao iniciar etapa.');
    } finally {
      setAcaoEmAndamento(null);
    }
  }

  async function handleFinalizar(etapaCodigo: string) {
    setAcaoEmAndamento(etapaCodigo);
    try {
      await finalizarEtapa(id, etapaCodigo);
      sucesso('Etapa concluída.');
      setRecarregar((n) => n + 1);
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha ao finalizar etapa.');
    } finally {
      setAcaoEmAndamento(null);
    }
  }

  async function handleSolicitarLiberacao() {
    setLiberando(true);
    try {
      await atualizarStatusLote(id, 'aguardando_liberacao');
      sucesso('Lote enviado para liberação pela Qualidade.');
      setRecarregar((n) => n + 1);
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha.');
    } finally {
      setLiberando(false);
    }
  }

  async function handleLiberar() {
    setLiberando(true);
    try {
      await liberarLoteGate(id);
      sucesso('Lote liberado com sucesso.');
      setRecarregar((n) => n + 1);
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha ao liberar lote.');
    } finally {
      setLiberando(false);
    }
  }

  async function handleBloquear() {
    setLiberando(true);
    try {
      await atualizarStatusLote(id, 'bloqueado');
      sucesso('Lote bloqueado.');
      setRecarregar((n) => n + 1);
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha.');
    } finally {
      setLiberando(false);
    }
  }

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
    const emAcao = acaoEmAndamento === etapa.codigo;

    const acao =
      estado === 'concluida' ? undefined : estado === 'andamento' ? (
        <Button
          variant="outline"
          className="py-1 px-2.5 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          loading={emAcao}
          onClick={() => void handleFinalizar(etapa.codigo)}
        >
          Finalizar
        </Button>
      ) : (
        <Button
          variant="outline"
          className="py-1 px-2.5 text-xs"
          loading={emAcao}
          onClick={() => void handleIniciar(etapa.codigo)}
        >
          Iniciar
        </Button>
      );

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
          <span>{[equipamento, operador].filter(Boolean).join(' · ')}</span>
        ) : undefined,
      acao,
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
              {lote.cliente_id && (
                <Linha termo="Cliente" valor={data.clientes.get(lote.cliente_id)?.nome ?? '—'} />
              )}
              {lote.pedido && <Linha termo="Pedido" valor={lote.pedido} />}
              <Linha termo="Data de produção" valor={formatarData(lote.data_producao)} />
              {(lote.volume_texto || lote.quantidade != null) && (
                <Linha
                  termo="Volume"
                  valor={lote.volume_texto ?? formatarQuantidade(lote.quantidade)}
                />
              )}
              {lote.data_carregamento && (
                <Linha termo="Carregamento" valor={formatarData(lote.data_carregamento)} />
              )}
              {lote.data_entrega && (
                <Linha termo="Entrega" valor={formatarData(lote.data_entrega)} />
              )}
              <Linha termo="Matéria-prima" valor={`${recebimentos.length} recebimento(s)`} />
            </dl>

            {/* Ações de liberação */}
            <div className="mt-5 border-t border-slate-100 pt-5 space-y-2">
              {lote.status === 'em_processo' && lotePodeSolicitarLiberacao(lote) && (
                <Button
                  variant="outline"
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                  loading={liberando}
                  onClick={() => void handleSolicitarLiberacao()}
                >
                  Solicitar liberação
                </Button>
              )}
              {lote.status === 'aguardando_liberacao' && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 text-center">Aguardando aprovação da Qualidade</p>
                  <Button
                    className="w-full"
                    loading={liberando}
                    onClick={() => void handleLiberar()}
                  >
                    Liberar lote
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-red-300 text-red-700 hover:bg-red-50"
                    loading={liberando}
                    onClick={() => void handleBloquear()}
                  >
                    Bloquear lote
                  </Button>
                </div>
              )}
            </div>
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

      {/* Documentos / registros */}
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
