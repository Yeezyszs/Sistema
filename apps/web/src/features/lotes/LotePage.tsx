import { useState, type FormEvent } from 'react';
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
  atualizarLote,
  liberarLoteGate,
  mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarHora, formatarQuantidade, formatarDuracao } from '../../lib/format';
import {
  etapaConcluida,
  etapaEmAndamento,
  localizacaoLote,
  TIPO_MOVIMENTO_LABEL,
  TIPO_MOVIMENTO_DESCRICAO,
  TIPO_MOVIMENTO_TOM,
  sinalMovimento,
  lotePodeSolicitarLiberacao,
} from '@sistema/domain';
import type { EtapaLote } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Modal, Field, TextInput } from '../../components/ui';
import { StatusChip } from '../../components/StatusChip';
import { EtapaCard, type EtapaEstado } from './EtapaCard';
import { IconArrowLeft, IconDoc } from '../../components/icons';
import { useToast } from '../../components/Toast';

export function LotePage() {
  const { id = '' } = useParams();
  const [recarregar, setRecarregar] = useState(0);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<string | null>(null);
  const [liberando, setLiberando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
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

  async function handleSalvarEdicao(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const txt = (k: string) => String(form.get(k) ?? '').trim() || null;
    setSalvandoEdicao(true);
    try {
      await atualizarLote(id, {
        tipo_bag: txt('tipo_bag'),
        local_barracao: txt('local_barracao'),
        local_rua: txt('local_rua'),
      });
      sucesso('Dados do lote atualizados.');
      setEditando(false);
      setRecarregar((n) => n + 1);
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally {
      setSalvandoEdicao(false);
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
  const localizacao = localizacaoLote(lote);

  function estadoEtapa(el: EtapaLote | undefined): EtapaEstado {
    if (el && etapaConcluida(el)) return 'concluida';
    if (el && etapaEmAndamento(el)) return 'andamento';
    return 'pendente';
  }

  return (
    <>
      <BackLink />

      <PageHeader
        title={lote.codigo}
        subtitle={data.produtos.get(lote.produto_id)?.nome}
        action={<StatusChip status={lote.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Coluna principal: etapas em cards */}
        <div className="lg:col-span-3">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Etapas de produção
          </h2>
          <div className="space-y-3">
            {etapasCat.map((etapa) => {
              const el = etapasLote.get(etapa.codigo);
              const estado = estadoEtapa(el);
              const regsDaEtapa = registros.filter((r) => r.etapa_codigo === etapa.codigo).length;
              return (
                <EtapaCard
                  key={etapa.codigo}
                  ordem={etapa.ordem}
                  nome={etapa.nome}
                  estado={estado}
                  inicio={el?.iniciado_em ? formatarHora(el.iniciado_em) : null}
                  fim={el?.finalizado_em ? formatarHora(el.finalizado_em) : null}
                  duracao={formatarDuracao(el?.iniciado_em ?? null, el?.finalizado_em ?? null)}
                  operador={el?.operador_id ? data.funcionarios.get(el.operador_id)?.nome ?? null : null}
                  equipamento={el?.equipamento_id ? data.equipamentos.get(el.equipamento_id)?.nome ?? null : null}
                  registros={regsDaEtapa}
                  carregando={acaoEmAndamento === etapa.codigo}
                  onIniciar={() => void handleIniciar(etapa.codigo)}
                  onFinalizar={() => void handleFinalizar(etapa.codigo)}
                />
              );
            })}
          </div>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Dados do lote
              </h2>
              <button
                onClick={() => setEditando(true)}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                Editar
              </button>
            </div>
            <dl className="space-y-3 text-sm">
              <Linha termo="Produto" valor={data.produtos.get(lote.produto_id)?.nome ?? '—'} />
              {lote.cliente_id && (
                <Linha termo="Cliente" valor={data.clientes.get(lote.cliente_id)?.nome ?? '—'} />
              )}
              {lote.pedido && <Linha termo="Pedido" valor={lote.pedido} />}
              <Linha
                termo="Tipo de bag"
                valor={lote.tipo_bag ?? '—'}
                destaque={!lote.tipo_bag ? 'pendente' : undefined}
              />
              <Linha
                termo="Localização"
                valor={localizacao ?? '—'}
                destaque={!localizacao ? 'pendente' : undefined}
              />
              <Linha termo="Data de produção" valor={formatarData(lote.data_producao)} />
              {(lote.volume_texto || lote.quantidade != null) && (
                <Linha termo="Volume" valor={lote.volume_texto ?? formatarQuantidade(lote.quantidade)} />
              )}
              {lote.data_carregamento && (
                <Linha termo="Carregamento" valor={formatarData(lote.data_carregamento)} />
              )}
              {lote.data_entrega && <Linha termo="Entrega" valor={formatarData(lote.data_entrega)} />}
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
                  <Button className="w-full" loading={liberando} onClick={() => void handleLiberar()}>
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

          {/* Movimentos de estoque detalhados */}
          <Card className="p-6">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Movimentação de estoque
            </h2>
            <p className="mb-4 text-xs text-slate-400">
              Consumo = matéria-prima usada · Produção = produto gerado
            </p>
            {movimentos.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum movimento registrado.</p>
            ) : (
              <ul className="space-y-3">
                {movimentos.map((m) => {
                  const produto = data.produtos.get(m.produto_id);
                  const tom = TIPO_MOVIMENTO_TOM[m.tipo];
                  const sinal = sinalMovimento(m.tipo);
                  const corValor =
                    tom === 'positivo' ? 'text-emerald-600' : tom === 'negativo' ? 'text-red-600' : 'text-slate-600';
                  return (
                    <li key={m.id} className="rounded-lg border border-slate-100 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            tom === 'positivo'
                              ? 'bg-emerald-100 text-emerald-700'
                              : tom === 'negativo'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {TIPO_MOVIMENTO_LABEL[m.tipo]}
                        </span>
                        <span className={`font-semibold ${corValor}`}>
                          {sinal > 0 ? '+' : sinal < 0 ? '−' : ''}
                          {formatarQuantidade(m.quantidade, produto?.unidade ?? 'kg')}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm font-medium text-slate-700">
                        {produto?.nome ?? 'Produto'}
                      </p>
                      <p className="text-xs text-slate-400">{TIPO_MOVIMENTO_DESCRICAO[m.tipo]}</p>
                    </li>
                  );
                })}
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

      {/* Modal edição: tipo de bag + localização */}
      <Modal open={editando} onClose={() => setEditando(false)} title="Editar dados do lote">
        <form onSubmit={handleSalvarEdicao} className="space-y-4">
          <Field label="Tipo de bag / embalagem">
            <TextInput
              name="tipo_bag"
              list="tipos-bag"
              defaultValue={lote.tipo_bag ?? ''}
              placeholder="Ex.: Big Bag 1000kg"
            />
            <datalist id="tipos-bag">
              <option value="Big Bag 1000kg" />
              <option value="Big Bag 1250kg" />
              <option value="Big Bag 750kg" />
              <option value="Saco 25kg" />
              <option value="Saco 50kg" />
              <option value="Fardo" />
            </datalist>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Barracão">
              <TextInput name="local_barracao" defaultValue={lote.local_barracao ?? ''} placeholder="Barracão 1" />
            </Field>
            <Field label="Rua / posição">
              <TextInput name="local_rua" defaultValue={lote.local_rua ?? ''} placeholder="Rua 17" />
            </Field>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={salvandoEdicao}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function Linha({
  termo,
  valor,
  destaque,
}: {
  termo: string;
  valor: string;
  destaque?: 'pendente';
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-400">{termo}</dt>
      <dd
        className={`text-right font-medium ${
          destaque === 'pendente' ? 'text-amber-500' : 'text-slate-700'
        }`}
      >
        {destaque === 'pendente' ? 'A definir' : valor}
      </dd>
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
