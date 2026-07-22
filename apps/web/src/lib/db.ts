// Acesso a dados via supabase-js direto (protegido por RLS).
// Schemas de domínio expostos no PostgREST; lookups cruzados são resolvidos
// em JS para evitar dependência de embedding cross-schema.
import { supabase } from './supabaseClient';
import type {
  Lote,
  NovoLote,
  Produto,
  Fornecedor,
  DocumentoFornecedor,
  NovoDocumentoFornecedor,
  EtapaLote,
  Etapa,
  Recebimento,
  RegistroEtapa,
  MovimentoEstoque,
  NovoRecebimento,
  StatusLote,
  PontoControle,
  Monitoramento,
  NovoMonitoramento,
  Cliente,
  NovoCliente,
  AtualizacaoCliente,
  OrdemProducao,
  NovaOrdemProducao,
  StatusOP,
  AtualizacaoLote,
  Especificacao,
  EspecificacaoParametro,
  NovaEspecificacao,
  NovoParametro,
  LaudoInterno,
  LaudoResultado,
  NovoLaudo,
  NovoResultadoLaudo,
  NaoConformidade,
  NovaNaoConformidade,
  NcCorrecao,
  StatusNC,
  DetectorMetais,
  VerificacaoDM,
  NovaVerificacaoDM,
  Ima,
  VerificacaoIma,
  NovaVerificacaoIma,
  QuebraVidro,
  NovaQuebraVidro,
  Checklist,
  ChecklistItem,
  ChecklistExecucao,
  ChecklistResposta,
  NovaExecucaoChecklist,
  NovaRespostaChecklist,
  Ppho,
  NovaPpho,
  OrdemServico,
  NovaOrdemServico,
  StatusOS,
  PlanoPreventivo,
  ExecucaoPreventiva,
  Instrumento,
  NovoInstrumento,
  Calibracao,
  NovaCalibracao,
  AnaliseRisco,
  NovaAnaliseRisco,
  TipoAnaliseRisco,
  Auditoria,
  AuditoriaItem,
  NovaAuditoria,
  NovoItemAuditoria,
  StatusAuditoria,
  VerificacaoPpr,
  PontoAmostragem,
  NovoPontoAmostragem,
  MonitoramentoAmbiental,
  NovoMonitoramentoAmbiental,
  TipoInspecao,
  InspecaoRecebimento,
  Homologacao,
  NovaHomologacao,
  Linha,
  Programacao,
  NovaProgramacao,
  Apontamento,
  NovoApontamento,
  LocalEstoque,
  PosicaoEstoque,
  NovaPosicao,
  Pedido,
  NovoPedido,
  StatusPedido,
  SituacaoPedido,
  Carregamento,
  NovoCarregamento,
  Embalagem,
  NovaEmbalagem,
  MovimentoEmbalagem,
  NovoMovimentoEmbalagem,
  Pallet,
  MovimentoPallet,
  NovoMovimentoPallet,
  Reprocesso,
  NovoReprocesso,
  Desvio,
  NovoDesvio,
  AnaliseProcesso,
  AnaliseProcessoValor,
  NovaAnaliseProcesso,
  NovoAnaliseValor,
  MonitoramentoAgua,
  NovoMonitoramentoAgua,
  CalibracaoPhmetro,
  NovaCalibracaoPhmetro,
  InsumoLaboratorio,
  NovoInsumoLaboratorio,
  Contraprova,
  NovaContraprova,
  ContraprovaRetencao,
  NovaRetencao,
  ColaboradorPcm,
  EquipamentoPcm,
  ComponenteEquipamento,
  PlanoPcm,
  LubrificacaoPcm,
  FerramentaPcm,
  EstadoChecklistFerramenta,
  EstadoChecklist,
  OrdemPcm,
  NovaOrdemPcm,
  OsExecucao,
  NovaOsExecucao,
  PreventivaPcm,
  NovaPreventivaPcm,
  LuExecucao,
  NovaLuExecucao,
  Parada,
  NovaParada,
  ProducaoHoras,
  NovaProducaoHoras,
  CustoManut,
  NovoCustoManut,
} from '@sistema/domain';

const producao = () => supabase.schema('producao');
const core = () => supabase.schema('core');
const qualidade = () => supabase.schema('qualidade');
const manutencao = () => supabase.schema('manutencao');

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

// ── Catálogos / dados-mestre ───────────────────────────────────
export async function listEtapas(): Promise<Etapa[]> {
  // Só etapas ativas — descarga/extração/secagem foram desativadas (retorno PCP).
  return unwrap<Etapa[]>(await producao().from('etapas').select('*').eq('ativo', true).order('ordem'));
}

export async function listProdutos(): Promise<Produto[]> {
  // Só o catálogo oficial (ativos) — os antigos ficam apenas no histórico.
  return unwrap<Produto[]>(await core().from('produtos').select('*').eq('ativo', true).order('nome'));
}

export async function atualizarProduto(
  id: string,
  patch: Partial<Pick<Produto, 'nome' | 'codigo' | 'nome_curto' | 'peso_unitario' | 'rendimento' | 'kg_por_lote' | 'tempo_por_lote_min'>>,
): Promise<void> {
  const res = await core().from('produtos').update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function listFornecedores(): Promise<Fornecedor[]> {
  return unwrap<Fornecedor[]>(await core().from('fornecedores').select('*').order('razao_social'));
}

export async function listClientes(): Promise<Cliente[]> {
  return unwrap<Cliente[]>(
    await core().from('clientes').select('*').eq('ativo', true).order('nome'),
  );
}

export async function getProduto(id: string): Promise<Produto | null> {
  const res = await core().from('produtos').select('*').eq('id', id).maybeSingle();
  if (res.error) throw new Error(res.error.message);
  return res.data as Produto | null;
}

export async function getCliente(id: string): Promise<Cliente | null> {
  const res = await core().from('clientes').select('*').eq('id', id).maybeSingle();
  if (res.error) throw new Error(res.error.message);
  return res.data as Cliente | null;
}

export async function criarCliente(payload: NovoCliente): Promise<Cliente> {
  const res = await core().from('clientes').insert(payload).select('*').single();
  if (res.error) throw new Error(res.error.message);
  return res.data as Cliente;
}

export async function atualizarCliente(id: string, patch: AtualizacaoCliente): Promise<void> {
  const res = await core().from('clientes').update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function excluirCliente(id: string): Promise<void> {
  const res = await core().from('clientes').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// ── Ordens de produção ─────────────────────────────────────────
export async function listOrdensProducao(): Promise<OrdemProducao[]> {
  return unwrap<OrdemProducao[]>(
    await producao().from('ordens_producao').select('*').order('numero', { ascending: false }),
  );
}

export async function getOrdemProducao(id: string): Promise<OrdemProducao | null> {
  const res = await producao().from('ordens_producao').select('*').eq('id', id).maybeSingle();
  if (res.error) throw new Error(res.error.message);
  return res.data as OrdemProducao | null;
}

export async function criarOrdemProducao(payload: NovaOrdemProducao): Promise<OrdemProducao> {
  const res = await producao().from('ordens_producao').insert(payload).select('*').single();
  if (res.error) throw new Error(res.error.message);
  return res.data as OrdemProducao;
}

export async function atualizarStatusOP(id: string, status: StatusOP): Promise<void> {
  const res = await producao().from('ordens_producao').update({ status }).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// Exclui a ordem de produção. Se já houver lote vinculado, o banco bloqueia por FK.
export async function excluirOrdemProducao(id: string): Promise<void> {
  const res = await producao().from('ordens_producao').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function getLotesDaOrdem(ordemId: string): Promise<Lote[]> {
  return unwrap<Lote[]>(
    await producao()
      .from('lotes')
      .select('*')
      .eq('ordem_producao_id', ordemId)
      .order('created_at', { ascending: false }),
  );
}

// ── Lotes ──────────────────────────────────────────────────────
export async function listLotes(): Promise<Lote[]> {
  return unwrap<Lote[]>(
    await producao().from('lotes').select('*').order('created_at', { ascending: false }),
  );
}

export async function getLote(id: string): Promise<Lote | null> {
  const res = await producao().from('lotes').select('*').eq('id', id).maybeSingle();
  if (res.error) throw new Error(res.error.message);
  return res.data as Lote | null;
}

export async function criarLote(payload: NovoLote): Promise<Lote> {
  const res = await producao().from('lotes').insert(payload).select('*').single();
  if (res.error) throw new Error(res.error.message);
  return res.data as Lote;
}

export async function atualizarStatusLote(loteId: string, status: StatusLote): Promise<void> {
  const res = await producao().from('lotes').update({ status }).eq('id', loteId);
  if (res.error) throw new Error(res.error.message);
}

export async function atualizarLote(loteId: string, patch: AtualizacaoLote): Promise<void> {
  const res = await producao().from('lotes').update(patch).eq('id', loteId);
  if (res.error) throw new Error(res.error.message);
}

// Cancelamento suave: mantém o lote e todo o histórico, só muda o status.
export async function cancelarLote(loteId: string): Promise<void> {
  const res = await producao().from('lotes').update({ status: 'cancelado' }).eq('id', loteId);
  if (res.error) throw new Error(res.error.message);
}

// Exclusão física: só deve ser usada em lote sem histórico (criado por engano).
// Se houver registros vinculados, o banco bloqueia por chave estrangeira.
export async function excluirLote(loteId: string): Promise<void> {
  const res = await producao().from('lotes').delete().eq('id', loteId);
  if (res.error) throw new Error(res.error.message);
}

// Gate de liberação: valida não-conformidades no DB antes de liberar
export async function liberarLoteGate(loteId: string): Promise<void> {
  const { error } = await supabase.rpc('liberar_lote', { p_lote_id: loteId });
  if (error) throw new Error(error.message);
}

// ── Etapas do lote ─────────────────────────────────────────────
export async function getEtapasDoLote(loteId: string): Promise<EtapaLote[]> {
  return unwrap<EtapaLote[]>(
    await producao().from('etapas_lote').select('*').eq('lote_id', loteId),
  );
}

export async function iniciarEtapa(loteId: string, etapaCodigo: string): Promise<void> {
  const { data: existing, error: selErr } = await producao()
    .from('etapas_lote')
    .select('id')
    .eq('lote_id', loteId)
    .eq('etapa_codigo', etapaCodigo)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);

  const agora = new Date().toISOString();
  if (existing) {
    const res = await producao()
      .from('etapas_lote')
      .update({ iniciado_em: agora })
      .eq('id', existing.id);
    if (res.error) throw new Error(res.error.message);
  } else {
    const res = await producao()
      .from('etapas_lote')
      .insert({ lote_id: loteId, etapa_codigo: etapaCodigo, iniciado_em: agora });
    if (res.error) throw new Error(res.error.message);
  }
}

export async function finalizarEtapa(loteId: string, etapaCodigo: string): Promise<void> {
  const { data: existing, error: selErr } = await producao()
    .from('etapas_lote')
    .select('id')
    .eq('lote_id', loteId)
    .eq('etapa_codigo', etapaCodigo)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);
  if (!existing) throw new Error('Etapa não foi iniciada.');

  const res = await producao()
    .from('etapas_lote')
    .update({ finalizado_em: new Date().toISOString() })
    .eq('id', existing.id);
  if (res.error) throw new Error(res.error.message);
}

// ── Registros e movimentos ─────────────────────────────────────
export async function getRegistrosDoLote(loteId: string): Promise<RegistroEtapa[]> {
  return unwrap<RegistroEtapa[]>(
    await producao()
      .from('registros_etapa')
      .select('*')
      .eq('lote_id', loteId)
      .order('registrado_em', { ascending: true }),
  );
}

export async function getMovimentosDoLote(loteId: string): Promise<MovimentoEstoque[]> {
  return unwrap<MovimentoEstoque[]>(
    await producao()
      .from('movimentos_estoque')
      .select('*')
      .eq('lote_id', loteId)
      .order('ocorrido_em', { ascending: true }),
  );
}

// Recebimentos consumidos por um lote (rastreabilidade pra trás)
export async function getRecebimentosDoLote(loteId: string): Promise<Recebimento[]> {
  const consumo = unwrap<{ recebimento_id: string }[]>(
    await producao().from('consumo_materia_prima').select('recebimento_id').eq('lote_id', loteId),
  );
  const ids = consumo.map((c) => c.recebimento_id);
  if (ids.length === 0) return [];
  return unwrap<Recebimento[]>(
    await producao().from('recebimentos').select('*').in('id', ids),
  );
}

// ── Recebimentos ───────────────────────────────────────────────
export async function listRecebimentos(): Promise<Recebimento[]> {
  return unwrap<Recebimento[]>(
    await producao()
      .from('recebimentos')
      .select('*')
      .order('recebido_em', { ascending: false }),
  );
}

// Cargas recebidas num intervalo de datas — fonte da raiz p/ rendimento diário.
export async function listRecebimentosPeriodo(de: string, ate: string): Promise<Recebimento[]> {
  return unwrap<Recebimento[]>(
    await producao()
      .from('recebimentos')
      .select('*')
      .gte('recebido_em', `${de}T00:00:00`)
      .lte('recebido_em', `${ate}T23:59:59`)
      .order('recebido_em'),
  );
}

export async function criarRecebimento(payload: NovoRecebimento): Promise<Recebimento> {
  const res = await producao().from('recebimentos').insert(payload).select('*').single();
  if (res.error) throw new Error(res.error.message);
  return res.data as Recebimento;
}

export async function atualizarRecebimento(id: string, patch: Partial<NovoRecebimento>): Promise<void> {
  const res = await producao().from('recebimentos').update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function excluirRecebimento(id: string): Promise<void> {
  const res = await producao().from('recebimentos').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function listEquipamentos(): Promise<{ id: string; nome: string }[]> {
  return unwrap<{ id: string; nome: string }[]>(
    await core().from('equipamentos').select('id,nome').order('nome'),
  );
}

export async function listFuncionarios(): Promise<{ id: string; nome: string }[]> {
  return unwrap<{ id: string; nome: string }[]>(
    await core().from('funcionarios').select('id,nome').order('nome'),
  );
}

// ── Qualidade ──────────────────────────────────────────────────
export async function listPontosControle(): Promise<PontoControle[]> {
  return unwrap<PontoControle[]>(
    await qualidade().from('pontos_controle').select('*').eq('ativo', true).order('ordem'),
  );
}

export async function getMonitoramentosDoLote(loteId: string): Promise<Monitoramento[]> {
  return unwrap<Monitoramento[]>(
    await qualidade()
      .from('monitoramentos')
      .select('*')
      .eq('lote_id', loteId)
      .order('registrado_em', { ascending: false }),
  );
}

export async function criarMonitoramento(payload: NovoMonitoramento): Promise<Monitoramento> {
  const res = await qualidade().from('monitoramentos').insert(payload).select('*').single();
  if (res.error) throw new Error(res.error.message);
  return res.data as Monitoramento;
}

export async function listLotesPendentesLiberacao(): Promise<Lote[]> {
  return unwrap<Lote[]>(
    await producao()
      .from('lotes')
      .select('*')
      .eq('status', 'aguardando_liberacao')
      .order('created_at', { ascending: false }),
  );
}

// ── Especificações (limites por produto × cliente) ─────────────
export async function listEspecificacoes(): Promise<Especificacao[]> {
  return unwrap<Especificacao[]>(
    await qualidade().from('especificacoes').select('*').eq('vigente', true).order('created_at', { ascending: false }),
  );
}

export async function getParametrosDaEspecificacao(espId: string): Promise<EspecificacaoParametro[]> {
  return unwrap<EspecificacaoParametro[]>(
    await qualidade().from('especificacao_parametros').select('*').eq('especificacao_id', espId).order('ordem'),
  );
}

export async function criarEspecificacao(payload: NovaEspecificacao): Promise<Especificacao> {
  const res = await qualidade().from('especificacoes').insert(payload).select('*').single();
  if (res.error) throw new Error(res.error.message);
  return res.data as Especificacao;
}

export async function criarParametro(payload: NovoParametro): Promise<void> {
  const res = await qualidade().from('especificacao_parametros').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

// Especificação aplicável a um produto (preferindo a do cliente, senão a interna)
export async function getEspecificacaoAplicavel(
  produtoId: string,
  clienteId: string | null,
): Promise<{ especificacao: Especificacao; parametros: EspecificacaoParametro[] } | null> {
  const especs = unwrap<Especificacao[]>(
    await qualidade().from('especificacoes').select('*').eq('produto_id', produtoId).eq('vigente', true),
  );
  const escolhida =
    (clienteId ? especs.find((e) => e.cliente_id === clienteId) : undefined) ??
    especs.find((e) => e.cliente_id == null) ??
    especs[0];
  if (!escolhida) return null;
  const parametros = await getParametrosDaEspecificacao(escolhida.id);
  return { especificacao: escolhida, parametros };
}

// ── Acompanhamento de Processo (análise por bag) ───────────────
export async function listAnalisesProcesso(): Promise<AnaliseProcesso[]> {
  return unwrap<AnaliseProcesso[]>(
    await qualidade().from('analises_processo').select('*')
      .order('data', { ascending: false }).order('numero', { ascending: false }),
  );
}

export async function getValoresDaAnalise(analiseId: string): Promise<AnaliseProcessoValor[]> {
  return unwrap<AnaliseProcessoValor[]>(
    await qualidade().from('analise_processo_valores').select('*').eq('analise_id', analiseId).order('ordem'),
  );
}

// Cria a análise + valores por ensaio numa tacada.
export async function criarAnaliseProcesso(
  cabecalho: NovaAnaliseProcesso,
  valores: NovoAnaliseValor[],
): Promise<void> {
  const res = await qualidade().from('analises_processo').insert(cabecalho).select('id').single();
  if (res.error) throw new Error(res.error.message);
  const analiseId = (res.data as { id: string }).id;
  if (valores.length > 0) {
    const linhas = valores.map((v, i) => ({ ...v, analise_id: analiseId, ordem: v.ordem ?? i }));
    const resv = await qualidade().from('analise_processo_valores').insert(linhas);
    if (resv.error) throw new Error(resv.error.message);
  }
}

export async function excluirAnaliseProcesso(id: string): Promise<void> {
  const res = await qualidade().from('analises_processo').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// ── Contraprovas ───────────────────────────────────────────────
export async function listContraprovas(): Promise<Contraprova[]> {
  return unwrap<Contraprova[]>(
    await qualidade().from('contraprovas').select('*').order('numero_caixa', { ascending: false }),
  );
}

export async function listRetencoes(): Promise<ContraprovaRetencao[]> {
  return unwrap<ContraprovaRetencao[]>(
    await qualidade().from('contraprova_retencao').select('*').eq('ativo', true).order('rotulo'),
  );
}

export async function criarContraprova(payload: NovaContraprova): Promise<void> {
  const res = await qualidade().from('contraprovas').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function atualizarContraprova(
  id: string,
  patch: Partial<NovaContraprova & { em_estoque: boolean; descartado_em: string | null }>,
): Promise<void> {
  const res = await qualidade().from('contraprovas').update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function excluirContraprova(id: string): Promise<void> {
  const res = await qualidade().from('contraprovas').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function criarRetencao(payload: NovaRetencao): Promise<void> {
  const res = await qualidade().from('contraprova_retencao').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function atualizarRetencao(id: string, patch: Partial<NovaRetencao & { ativo: boolean }>): Promise<void> {
  const res = await qualidade().from('contraprova_retencao').update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function excluirRetencao(id: string): Promise<void> {
  const res = await qualidade().from('contraprova_retencao').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// ── Insumos do Laboratório ─────────────────────────────────────
export async function listInsumosLaboratorio(): Promise<InsumoLaboratorio[]> {
  return unwrap<InsumoLaboratorio[]>(
    await qualidade().from('insumos_laboratorio').select('*').eq('ativo', true).order('nome'),
  );
}

export async function criarInsumoLaboratorio(payload: NovoInsumoLaboratorio): Promise<void> {
  const res = await qualidade().from('insumos_laboratorio').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function atualizarInsumoLaboratorio(
  id: string,
  patch: Partial<NovoInsumoLaboratorio & { solicitado: boolean; ativo: boolean }>,
): Promise<void> {
  const res = await qualidade().from('insumos_laboratorio').update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function excluirInsumoLaboratorio(id: string): Promise<void> {
  const res = await qualidade().from('insumos_laboratorio').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// ── Calibração diária do pHmetro ───────────────────────────────
export async function listCalibracoesPhmetro(): Promise<CalibracaoPhmetro[]> {
  return unwrap<CalibracaoPhmetro[]>(
    await qualidade().from('calibracoes_phmetro').select('*')
      .order('data', { ascending: false }).order('hora', { ascending: false }),
  );
}

export async function criarCalibracaoPhmetro(payload: NovaCalibracaoPhmetro): Promise<void> {
  const res = await qualidade().from('calibracoes_phmetro').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function excluirCalibracaoPhmetro(id: string): Promise<void> {
  const res = await qualidade().from('calibracoes_phmetro').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// ── Monitoramento de Cloro/pH da água ──────────────────────────
export async function listMonitoramentosAgua(): Promise<MonitoramentoAgua[]> {
  return unwrap<MonitoramentoAgua[]>(
    await qualidade().from('monitoramentos_agua').select('*')
      .order('data', { ascending: false }).order('hora', { ascending: false }),
  );
}

export async function criarMonitoramentoAgua(payload: NovoMonitoramentoAgua): Promise<void> {
  const res = await qualidade().from('monitoramentos_agua').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function excluirMonitoramentoAgua(id: string): Promise<void> {
  const res = await qualidade().from('monitoramentos_agua').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// ── Laudos internos ────────────────────────────────────────────
export async function getLaudosDoLote(loteId: string): Promise<LaudoInterno[]> {
  return unwrap<LaudoInterno[]>(
    await qualidade().from('laudos_internos').select('*').eq('lote_id', loteId).order('emitido_em', { ascending: false }),
  );
}

export async function getLaudo(id: string): Promise<LaudoInterno | null> {
  const res = await qualidade().from('laudos_internos').select('*').eq('id', id).maybeSingle();
  if (res.error) throw new Error(res.error.message);
  return res.data as LaudoInterno | null;
}

export async function getResultadosDoLaudo(laudoId: string): Promise<LaudoResultado[]> {
  return unwrap<LaudoResultado[]>(
    await qualidade().from('laudo_resultados').select('*').eq('laudo_id', laudoId).order('ordem'),
  );
}

export async function criarLaudo(
  laudo: NovoLaudo,
  resultados: Omit<NovoResultadoLaudo, 'laudo_id'>[],
): Promise<LaudoInterno> {
  const res = await qualidade().from('laudos_internos').insert(laudo).select('*').single();
  if (res.error) throw new Error(res.error.message);
  const novo = res.data as LaudoInterno;
  if (resultados.length > 0) {
    const linhas = resultados.map((r, i) => ({ ...r, laudo_id: novo.id, ordem: r.ordem ?? i }));
    const resR = await qualidade().from('laudo_resultados').insert(linhas);
    if (resR.error) throw new Error(resR.error.message);
  }
  return novo;
}

// ── Não Conformidades ──────────────────────────────────────────
export async function listNaoConformidades(): Promise<NaoConformidade[]> {
  return unwrap<NaoConformidade[]>(
    await qualidade().from('nao_conformidades').select('*').order('numero', { ascending: false }),
  );
}

export async function getNaoConformidadesDoLote(loteId: string): Promise<NaoConformidade[]> {
  return unwrap<NaoConformidade[]>(
    await qualidade().from('nao_conformidades').select('*').eq('lote_id', loteId).order('numero', { ascending: false }),
  );
}

export async function criarNaoConformidade(payload: NovaNaoConformidade): Promise<NaoConformidade> {
  const res = await qualidade().from('nao_conformidades').insert(payload).select('*').single();
  if (res.error) throw new Error(res.error.message);
  return res.data as NaoConformidade;
}

export async function atualizarStatusNC(
  id: string,
  status: StatusNC,
  extra?: { disposicao?: string | null; eficacia?: string | null; encerrada_em?: string | null },
): Promise<void> {
  const patch: Record<string, unknown> = { status, ...extra };
  if (status === 'concluida' && !extra?.encerrada_em) patch.encerrada_em = new Date().toISOString();
  const res = await qualidade().from('nao_conformidades').update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function getCorrecoesDaNC(ncId: string): Promise<NcCorrecao[]> {
  return unwrap<NcCorrecao[]>(
    await qualidade().from('nc_correcoes').select('*').eq('nc_id', ncId).order('created_at'),
  );
}

export async function criarCorrecaoNC(payload: {
  nc_id: string;
  descricao: string;
  responsavel_id?: string | null;
  data_implementacao?: string | null;
}): Promise<void> {
  const res = await qualidade().from('nc_correcoes').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

// ── PCC Físico: detector de metais ─────────────────────────────
export async function listDetectoresMetais(): Promise<DetectorMetais[]> {
  return unwrap<DetectorMetais[]>(
    await qualidade().from('detectores_metais').select('*').eq('ativo', true).order('linha'),
  );
}

export async function listVerificacoesDM(limite = 30): Promise<VerificacaoDM[]> {
  return unwrap<VerificacaoDM[]>(
    await qualidade().from('verificacoes_dm').select('*').order('registrado_em', { ascending: false }).limit(limite),
  );
}

export async function criarVerificacaoDM(payload: NovaVerificacaoDM): Promise<void> {
  const res = await qualidade().from('verificacoes_dm').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

// ── PCC Físico: imãs ───────────────────────────────────────────
export async function listImas(): Promise<Ima[]> {
  return unwrap<Ima[]>(await qualidade().from('imas').select('*').eq('ativo', true).order('local'));
}

export async function listVerificacoesIma(limite = 30): Promise<VerificacaoIma[]> {
  return unwrap<VerificacaoIma[]>(
    await qualidade().from('verificacoes_ima').select('*').order('registrado_em', { ascending: false }).limit(limite),
  );
}

export async function criarVerificacaoIma(payload: NovaVerificacaoIma): Promise<void> {
  const res = await qualidade().from('verificacoes_ima').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

// ── PCC Físico: quebra de vidros ───────────────────────────────
export async function listQuebrasVidro(limite = 30): Promise<QuebraVidro[]> {
  return unwrap<QuebraVidro[]>(
    await qualidade().from('quebras_vidro').select('*').order('registrado_em', { ascending: false }).limit(limite),
  );
}

export async function criarQuebraVidro(payload: NovaQuebraVidro): Promise<void> {
  const res = await qualidade().from('quebras_vidro').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

// ── Checklist genérico (coringa) ───────────────────────────────
export async function getItensDoChecklist(checklistId: string): Promise<ChecklistItem[]> {
  return unwrap<ChecklistItem[]>(
    await qualidade().from('checklist_itens').select('*').eq('checklist_id', checklistId).order('ordem'),
  );
}

export async function criarChecklistComItens(
  contexto: string,
  nome: string,
  itens: string[],
): Promise<Checklist> {
  const res = await qualidade().from('checklists').insert({ contexto, nome }).select('*').single();
  if (res.error) throw new Error(res.error.message);
  const checklist = res.data as Checklist;
  if (itens.length > 0) {
    const linhas = itens.map((item, i) => ({ checklist_id: checklist.id, item, ordem: i }));
    const resI = await qualidade().from('checklist_itens').insert(linhas);
    if (resI.error) throw new Error(resI.error.message);
  }
  return checklist;
}

export async function getExecucoesDoChecklist(checklistId: string, limite = 30): Promise<ChecklistExecucao[]> {
  return unwrap<ChecklistExecucao[]>(
    await qualidade()
      .from('checklist_execucoes')
      .select('*')
      .eq('checklist_id', checklistId)
      .order('registrado_em', { ascending: false })
      .limit(limite),
  );
}

export async function getRespostasDaExecucao(execucaoId: string): Promise<ChecklistResposta[]> {
  return unwrap<ChecklistResposta[]>(
    await qualidade().from('checklist_respostas').select('*').eq('execucao_id', execucaoId).order('ordem'),
  );
}

export async function registrarExecucaoChecklist(
  execucao: NovaExecucaoChecklist,
  respostas: Omit<NovaRespostaChecklist, 'execucao_id'>[],
): Promise<ChecklistExecucao> {
  const res = await qualidade().from('checklist_execucoes').insert(execucao).select('*').single();
  if (res.error) throw new Error(res.error.message);
  const exec = res.data as ChecklistExecucao;
  if (respostas.length > 0) {
    const linhas = respostas.map((r, i) => ({ ...r, execucao_id: exec.id, ordem: r.ordem ?? i }));
    const resR = await qualidade().from('checklist_respostas').insert(linhas);
    if (resR.error) throw new Error(resR.error.message);
  }
  return exec;
}

// ── PPHO ───────────────────────────────────────────────────────
export async function listPphos(): Promise<Ppho[]> {
  return unwrap<Ppho[]>(await qualidade().from('pphos').select('*').eq('ativo', true).order('codigo'));
}

export async function criarPpho(ficha: Omit<NovaPpho, 'checklist_id'>, itens: string[]): Promise<Ppho> {
  const checklist = await criarChecklistComItens('ppho', ficha.nome, itens);
  const res = await qualidade().from('pphos').insert({ ...ficha, checklist_id: checklist.id }).select('*').single();
  if (res.error) throw new Error(res.error.message);
  return res.data as Ppho;
}

// ── Manutenção: Ordens de Serviço ──────────────────────────────
export async function listOrdensServico(): Promise<OrdemServico[]> {
  return unwrap<OrdemServico[]>(
    await manutencao().from('ordens_servico').select('*').order('numero', { ascending: false }),
  );
}

export async function criarOrdemServico(payload: NovaOrdemServico): Promise<OrdemServico> {
  const res = await manutencao().from('ordens_servico').insert(payload).select('*').single();
  if (res.error) throw new Error(res.error.message);
  return res.data as OrdemServico;
}

export async function atualizarStatusOS(
  id: string,
  status: StatusOS,
  descricao_realizada?: string | null,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (descricao_realizada !== undefined) patch.descricao_realizada = descricao_realizada;
  if (status === 'concluida') patch.concluida_em = new Date().toISOString();
  const res = await manutencao().from('ordens_servico').update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// ── Manutenção: plano preventivo + execuções ───────────────────
export async function listPlanoPreventivo(): Promise<PlanoPreventivo[]> {
  return unwrap<PlanoPreventivo[]>(
    await manutencao().from('plano_preventivo').select('*').eq('ativo', true).order('componente'),
  );
}

export async function criarItemPreventivo(payload: {
  equipamento_id?: string | null;
  componente: string;
  periodicidade?: string | null;
}): Promise<void> {
  const res = await manutencao().from('plano_preventivo').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function listExecucoesPreventiva(limite = 50): Promise<ExecucaoPreventiva[]> {
  return unwrap<ExecucaoPreventiva[]>(
    await manutencao().from('execucoes_preventiva').select('*').order('realizada_em', { ascending: false }).limit(limite),
  );
}

export async function registrarExecucaoPreventiva(payload: {
  plano_item_id: string;
  realizada_em?: string;
  executor_id?: string | null;
  observacao?: string | null;
}): Promise<void> {
  const res = await manutencao().from('execucoes_preventiva').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

// ── Calibração: instrumentos + calibrações ─────────────────────
export async function listInstrumentos(): Promise<Instrumento[]> {
  return unwrap<Instrumento[]>(
    await qualidade().from('instrumentos').select('*').eq('ativo', true).order('codigo'),
  );
}

export async function criarInstrumento(payload: NovoInstrumento): Promise<Instrumento> {
  const res = await qualidade().from('instrumentos').insert(payload).select('*').single();
  if (res.error) throw new Error(res.error.message);
  return res.data as Instrumento;
}

export async function listCalibracoes(limite = 100): Promise<Calibracao[]> {
  return unwrap<Calibracao[]>(
    await qualidade().from('calibracoes').select('*').order('calibrado_em', { ascending: false }).limit(limite),
  );
}

export async function criarCalibracao(payload: NovaCalibracao): Promise<void> {
  const res = await qualidade().from('calibracoes').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

// ── Análises de risco (Food Defense / Food Fraud / APPCC) ──────
export async function listAnalisesRisco(tipo: TipoAnaliseRisco): Promise<AnaliseRisco[]> {
  return unwrap<AnaliseRisco[]>(
    await qualidade().from('analises_risco').select('*').eq('tipo', tipo).order('avaliado_em', { ascending: false }),
  );
}

export async function criarAnaliseRisco(payload: NovaAnaliseRisco): Promise<void> {
  const res = await qualidade().from('analises_risco').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

// ── Auditoria interna ──────────────────────────────────────────
export async function listAuditorias(): Promise<Auditoria[]> {
  return unwrap<Auditoria[]>(
    await qualidade().from('auditorias').select('*').order('numero', { ascending: false }),
  );
}

export async function criarAuditoria(payload: NovaAuditoria): Promise<Auditoria> {
  const res = await qualidade().from('auditorias').insert(payload).select('*').single();
  if (res.error) throw new Error(res.error.message);
  return res.data as Auditoria;
}

export async function atualizarStatusAuditoria(id: string, status: StatusAuditoria): Promise<void> {
  const res = await qualidade().from('auditorias').update({ status }).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function getItensDaAuditoria(auditoriaId: string): Promise<AuditoriaItem[]> {
  return unwrap<AuditoriaItem[]>(
    await qualidade().from('auditoria_itens').select('*').eq('auditoria_id', auditoriaId).order('ordem'),
  );
}

export async function criarItemAuditoria(payload: NovoItemAuditoria): Promise<void> {
  const res = await qualidade().from('auditoria_itens').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

// ── Verificação de PPR ─────────────────────────────────────────
export async function listVerificacoesPpr(limite = 50): Promise<VerificacaoPpr[]> {
  return unwrap<VerificacaoPpr[]>(
    await qualidade().from('verificacoes_ppr').select('*').order('verificado_em', { ascending: false }).limit(limite),
  );
}

export async function criarVerificacaoPpr(payload: {
  programa: string;
  registro_codigo?: string | null;
  frequencia?: string | null;
  conforme: boolean;
  acao?: string | null;
}): Promise<void> {
  const res = await qualidade().from('verificacoes_ppr').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

// ── Ambiental & pragas ─────────────────────────────────────────
export async function listPontosAmostragem(): Promise<PontoAmostragem[]> {
  return unwrap<PontoAmostragem[]>(
    await qualidade().from('pontos_amostragem').select('*').eq('ativo', true).order('area'),
  );
}

export async function criarPontoAmostragem(payload: NovoPontoAmostragem): Promise<void> {
  const res = await qualidade().from('pontos_amostragem').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function listMonitoramentoAmbiental(limite = 80): Promise<MonitoramentoAmbiental[]> {
  return unwrap<MonitoramentoAmbiental[]>(
    await qualidade().from('monitoramento_ambiental').select('*').order('enviado_em', { ascending: false }).limit(limite),
  );
}

export async function criarMonitoramentoAmbiental(payload: NovoMonitoramentoAmbiental): Promise<void> {
  const res = await qualidade().from('monitoramento_ambiental').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

// ── Inspeção de recebimento (reusa o motor de checklist) ───────
// Garante um checklist para o contexto (cria com itens padrão na 1ª vez).
export async function garantirChecklist(
  contexto: string,
  nome: string,
  itensPadrao: string[],
): Promise<{ checklist: Checklist; itens: ChecklistItem[] }> {
  const existentes = unwrap<Checklist[]>(
    await qualidade().from('checklists').select('*').eq('contexto', contexto).limit(1),
  );
  const existente = existentes[0];
  if (existente) {
    const itens = await getItensDoChecklist(existente.id);
    return { checklist: existente, itens };
  }
  const novo = await criarChecklistComItens(contexto, nome, itensPadrao);
  const itens = await getItensDoChecklist(novo.id);
  return { checklist: novo, itens };
}

export async function listInspecoesRecebimento(limite = 50): Promise<InspecaoRecebimento[]> {
  return unwrap<InspecaoRecebimento[]>(
    await qualidade().from('inspecoes_recebimento').select('*').order('inspecionado_em', { ascending: false }).limit(limite),
  );
}

export async function registrarInspecaoRecebimento(payload: {
  tipo: TipoInspecao;
  fornecedor_id?: string | null;
  recebimento_id?: string | null;
  execucao_id?: string | null;
  placa?: string | null;
  ticket?: string | null;
  variedade?: string | null;
  conforme: boolean;
  observacao?: string | null;
}): Promise<void> {
  const res = await qualidade().from('inspecoes_recebimento').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

// ── Fornecedores: homologação ──────────────────────────────────
export async function listHomologacoes(): Promise<Homologacao[]> {
  return unwrap<Homologacao[]>(
    await qualidade().from('homologacoes').select('*').order('avaliado_em', { ascending: false }),
  );
}

export async function criarHomologacao(payload: NovaHomologacao): Promise<void> {
  const res = await qualidade().from('homologacoes').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

// ── Fornecedores: laudos / documentos (PDF no Storage) ─────────
export async function listDocumentosFornecedor(): Promise<DocumentoFornecedor[]> {
  return unwrap<DocumentoFornecedor[]>(
    await qualidade().from('documentos_fornecedor').select('*'),
  );
}

export async function getDocumentosDoFornecedor(
  fornecedorId: string,
): Promise<DocumentoFornecedor[]> {
  return unwrap<DocumentoFornecedor[]>(
    await qualidade()
      .from('documentos_fornecedor')
      .select('*')
      .eq('fornecedor_id', fornecedorId)
      .order('ano', { ascending: false, nullsFirst: false })
      .order('numero_laudo', { ascending: false, nullsFirst: false }),
  );
}

// Sobe o arquivo ao bucket privado e registra o documento.
export async function enviarDocumentoFornecedor(
  meta: NovoDocumentoFornecedor,
  arquivo: File,
): Promise<DocumentoFornecedor> {
  const path = `${meta.fornecedor_id}/${Date.now()}-${arquivo.name}`;
  const up = await supabase.storage
    .from('fornecedores')
    .upload(path, arquivo, { upsert: false, contentType: arquivo.type || undefined });
  if (up.error) throw new Error(up.error.message);

  const res = await qualidade()
    .from('documentos_fornecedor')
    .insert({
      tipo: 'laudo_laboratorial',
      resultado: 'pendente',
      ...meta,
      arquivo_bucket: 'fornecedores',
      arquivo_path: path,
      arquivo_nome: arquivo.name,
    })
    .select('*')
    .single();
  if (res.error) {
    await supabase.storage.from('fornecedores').remove([path]);
    throw new Error(res.error.message);
  }
  return res.data as DocumentoFornecedor;
}

export async function atualizarResultadoDocumento(
  documentoId: string,
  resultado: DocumentoFornecedor['resultado'],
): Promise<void> {
  const res = await qualidade()
    .from('documentos_fornecedor')
    .update({ resultado })
    .eq('id', documentoId);
  if (res.error) throw new Error(res.error.message);
}

// URL temporária (bucket privado) para visualizar/baixar o laudo.
export async function urlAssinadaDocumento(
  path: string,
  bucket = 'fornecedores',
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

// ── PCP: linhas de produção ────────────────────────────────────
export async function listLinhas(): Promise<Linha[]> {
  return unwrap<Linha[]>(
    await producao().from('linhas').select('*').eq('ativo', true).order('codigo'),
  );
}

// ── PCP: programação de produção ───────────────────────────────
export async function listProgramacao(de: string, ate: string): Promise<Programacao[]> {
  return unwrap<Programacao[]>(
    await producao()
      .from('programacao')
      .select('*')
      .gte('data', de)
      .lte('data', ate)
      .order('data')
      .order('turno'),
  );
}

export async function criarProgramacao(payload: NovaProgramacao): Promise<void> {
  const res = await producao().from('programacao').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function atualizarProgramacao(id: string, patch: Partial<NovaProgramacao>): Promise<void> {
  const res = await producao().from('programacao').update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function excluirProgramacao(id: string): Promise<void> {
  const res = await producao().from('programacao').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// ── PCP: apontamento & rendimento ──────────────────────────────
// Apontamentos de um lote — usado no apontamento direto pela página do lote.
export async function getApontamentosDoLote(loteId: string): Promise<Apontamento[]> {
  return unwrap<Apontamento[]>(
    await producao()
      .from('apontamentos')
      .select('*')
      .eq('lote_id', loteId)
      .order('data', { ascending: false })
      .order('apontado_em', { ascending: false }),
  );
}

export async function listApontamentos(de: string, ate: string): Promise<Apontamento[]> {
  return unwrap<Apontamento[]>(
    await producao()
      .from('apontamentos')
      .select('*')
      .gte('data', de)
      .lte('data', ate)
      .order('data', { ascending: false })
      .order('apontado_em', { ascending: false }),
  );
}

export async function criarApontamento(payload: NovoApontamento): Promise<void> {
  const res = await producao().from('apontamentos').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function excluirApontamento(id: string): Promise<void> {
  const res = await producao().from('apontamentos').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// ── ERP: Estoque & Inventário ──────────────────────────────────
export async function listLocaisEstoque(): Promise<LocalEstoque[]> {
  return unwrap<LocalEstoque[]>(
    await producao().from('locais_estoque').select('*').eq('ativo', true).order('barracao').order('rua'),
  );
}

export async function listPosicoesEstoque(): Promise<PosicaoEstoque[]> {
  return unwrap<PosicaoEstoque[]>(
    await producao().from('posicoes_estoque').select('*').order('alocado_em', { ascending: false }),
  );
}

export async function alocarPosicao(payload: NovaPosicao): Promise<void> {
  const res = await producao().from('posicoes_estoque').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function liberarPosicao(id: string): Promise<void> {
  const res = await producao().from('posicoes_estoque').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// ── ERP: Pedidos (Clientes) ────────────────────────────────────
export async function listPedidos(): Promise<Pedido[]> {
  return unwrap<Pedido[]>(
    await producao().from('pedidos').select('*').order('numero', { ascending: false }),
  );
}

export async function criarPedido(payload: NovoPedido): Promise<void> {
  const res = await producao().from('pedidos').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function atualizarPedido(id: string, patch: Partial<NovoPedido>): Promise<void> {
  const res = await producao().from('pedidos').update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function definirStatusPedido(
  id: string,
  campo: 'status' | 'situacao',
  valor: StatusPedido | SituacaoPedido,
): Promise<void> {
  const res = await producao().from('pedidos').update({ [campo]: valor }).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function excluirPedido(id: string): Promise<void> {
  const res = await producao().from('pedidos').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// ── ERP: Expedição & Carregamentos ─────────────────────────────
export async function listCarregamentos(): Promise<Carregamento[]> {
  return unwrap<Carregamento[]>(
    await producao().from('carregamentos').select('*').order('numero', { ascending: false }),
  );
}

// Registra a carga → trigger dá baixa no estoque e marca o pedido carregado.
export async function criarCarregamento(payload: NovoCarregamento): Promise<void> {
  const res = await producao().from('carregamentos').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function atualizarCarregamento(id: string, patch: Partial<NovoCarregamento>): Promise<void> {
  const res = await producao().from('carregamentos').update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function cancelarCarregamento(id: string): Promise<void> {
  const res = await producao().from('carregamentos').update({ status: 'cancelado' }).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function excluirCarregamento(id: string): Promise<void> {
  const res = await producao().from('carregamentos').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// ── ERP: Embalagens ────────────────────────────────────────────
export async function listEmbalagens(): Promise<Embalagem[]> {
  return unwrap<Embalagem[]>(
    await producao().from('embalagens').select('*').order('nome'),
  );
}

export async function criarEmbalagem(payload: NovaEmbalagem): Promise<void> {
  const res = await producao().from('embalagens').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function atualizarEmbalagem(id: string, patch: Partial<NovaEmbalagem & { ativo: boolean }>): Promise<void> {
  const res = await producao().from('embalagens').update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function listMovimentosEmbalagem(embalagemId: string): Promise<MovimentoEmbalagem[]> {
  return unwrap<MovimentoEmbalagem[]>(
    await producao().from('movimentos_embalagem').select('*').eq('embalagem_id', embalagemId)
      .order('data', { ascending: false }).order('created_at', { ascending: false }),
  );
}

// Movimento manual → trigger ajusta o saldo.
export async function lancarMovimentoEmbalagem(payload: NovoMovimentoEmbalagem): Promise<void> {
  const res = await producao().from('movimentos_embalagem').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

// ── ERP: Pallets (CHEP + próprios) ─────────────────────────────
export async function listPallets(): Promise<Pallet[]> {
  return unwrap<Pallet[]>(await producao().from('pallets').select('*').order('tipo'));
}

export async function listMovimentosPallet(): Promise<MovimentoPallet[]> {
  return unwrap<MovimentoPallet[]>(
    await producao().from('movimentos_pallet').select('*')
      .order('data', { ascending: false }).order('created_at', { ascending: false }),
  );
}

export async function lancarMovimentoPallet(payload: NovoMovimentoPallet): Promise<void> {
  const res = await producao().from('movimentos_pallet').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

// ── ERP/Qualidade: Reprocesso ──────────────────────────────────
export async function listReprocessos(): Promise<Reprocesso[]> {
  return unwrap<Reprocesso[]>(
    await producao().from('reprocessos').select('*').order('numero', { ascending: false }),
  );
}

export async function criarReprocesso(payload: NovoReprocesso): Promise<void> {
  const res = await producao().from('reprocessos').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function atualizarReprocesso(id: string, patch: Partial<Reprocesso>): Promise<void> {
  const res = await producao().from('reprocessos').update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function excluirReprocesso(id: string): Promise<void> {
  const res = await producao().from('reprocessos').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// ── Catálogo de Desvios (Legenda) ──────────────────────────────
export async function listDesvios(): Promise<Desvio[]> {
  return unwrap<Desvio[]>(
    await producao().from('desvios').select('*').order('codigo'),
  );
}

export async function criarDesvio(payload: NovoDesvio): Promise<void> {
  const res = await producao().from('desvios').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function atualizarDesvio(id: string, patch: Partial<NovoDesvio & { ativo: boolean }>): Promise<void> {
  const res = await producao().from('desvios').update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function excluirDesvio(id: string): Promise<void> {
  const res = await producao().from('desvios').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// ── PCM: cadastros (F1) ────────────────────────────────────────
export async function listColaboradoresPcm(): Promise<ColaboradorPcm[]> {
  return unwrap<ColaboradorPcm[]>(
    await manutencao().from('colaboradores').select('*').eq('ativo', true).order('nome'),
  );
}

export async function listEquipamentosPcm(): Promise<EquipamentoPcm[]> {
  return unwrap<EquipamentoPcm[]>(
    await manutencao().from('equipamentos').select('*').eq('ativo', true).order('setor').order('nome'),
  );
}

export async function listComponentesPcm(): Promise<ComponenteEquipamento[]> {
  return unwrap<ComponenteEquipamento[]>(
    await manutencao().from('equipamento_componentes').select('*').order('nome'),
  );
}

export async function listPlanosPcm(): Promise<PlanoPcm[]> {
  return unwrap<PlanoPcm[]>(
    await manutencao().from('planos').select('*').order('setor').order('equip'),
  );
}

export async function listLubrificacaoPcm(): Promise<LubrificacaoPcm[]> {
  return unwrap<LubrificacaoPcm[]>(
    await manutencao().from('lubrificacao').select('*').order('setor').order('equip'),
  );
}

export async function listFerramentasPcm(): Promise<FerramentaPcm[]> {
  return unwrap<FerramentaPcm[]>(
    await manutencao().from('ferramentas').select('*').order('tipo').order('caixa').order('nome'),
  );
}

// ── PCM: Checklist diário de ferramentas (F5) ──────────────────
export async function listEstadosChecklist(
  colaboradorId: string, ano: number, mes: number,
): Promise<EstadoChecklistFerramenta[]> {
  return unwrap<EstadoChecklistFerramenta[]>(
    await manutencao()
      .from('checklist_ferramenta_estado')
      .select('*')
      .eq('colaborador_id', colaboradorId)
      .eq('ano', ano)
      .eq('mes', mes),
  );
}

// Define (upsert) ou limpa (delete) o estado de uma célula ferramenta×dia.
export async function salvarEstadoChecklist(
  colaboradorId: string, ferramentaId: string, ano: number, mes: number, dia: number,
  estado: EstadoChecklist | null,
): Promise<void> {
  if (estado === null) {
    const res = await manutencao()
      .from('checklist_ferramenta_estado')
      .delete()
      .eq('colaborador_id', colaboradorId)
      .eq('ferramenta_id', ferramentaId)
      .eq('ano', ano).eq('mes', mes).eq('dia', dia);
    if (res.error) throw new Error(res.error.message);
    return;
  }
  const res = await manutencao()
    .from('checklist_ferramenta_estado')
    .upsert(
      { colaborador_id: colaboradorId, ferramenta_id: ferramentaId, ano, mes, dia, estado },
      { onConflict: 'org_id,colaborador_id,ferramenta_id,ano,mes,dia' },
    );
  if (res.error) throw new Error(res.error.message);
}

// ── PCM: Ordens de Serviço (F2) ────────────────────────────────
export async function listOrdensPcm(): Promise<OrdemPcm[]> {
  return unwrap<OrdemPcm[]>(
    await manutencao().from('ordens').select('*').order('numero', { ascending: false }),
  );
}

export async function getOrdemPcm(id: string): Promise<OrdemPcm | null> {
  const res = await manutencao().from('ordens').select('*').eq('id', id).maybeSingle();
  if (res.error) throw new Error(res.error.message);
  return (res.data as OrdemPcm | null) ?? null;
}

export async function criarOrdemPcm(payload: NovaOrdemPcm): Promise<void> {
  const res = await manutencao().from('ordens').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function atualizarOrdemPcm(id: string, patch: Partial<NovaOrdemPcm>): Promise<void> {
  const res = await manutencao().from('ordens').update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function excluirOrdemPcm(id: string): Promise<void> {
  const res = await manutencao().from('ordens').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function getExecucoesDaOs(osId: string): Promise<OsExecucao[]> {
  return unwrap<OsExecucao[]>(
    await manutencao().from('os_execucoes').select('*').eq('os_id', osId).order('created_at'),
  );
}

// Persistência do checklist de execução: delete + re-insert (padrão do PCM).
export async function salvarExecucoesDaOs(osId: string, linhas: NovaOsExecucao[]): Promise<void> {
  const del = await manutencao().from('os_execucoes').delete().eq('os_id', osId);
  if (del.error) throw new Error(del.error.message);
  if (linhas.length > 0) {
    const ins = await manutencao().from('os_execucoes').insert(linhas.map((l) => ({ ...l, os_id: osId })));
    if (ins.error) throw new Error(ins.error.message);
  }
}

// CRUD genérico dos cadastros do PCM (tabelas do schema manutencao).
type TabelaPcm = 'equipamentos' | 'equipamento_componentes' | 'planos' | 'lubrificacao' | 'ferramentas' | 'colaboradores';

export async function criarRegistroPcm(tabela: TabelaPcm, payload: Record<string, unknown>): Promise<void> {
  const res = await manutencao().from(tabela).insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function atualizarRegistroPcm(tabela: TabelaPcm, id: string, patch: Record<string, unknown>): Promise<void> {
  const res = await manutencao().from(tabela).update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function excluirRegistroPcm(tabela: TabelaPcm, id: string): Promise<void> {
  const res = await manutencao().from(tabela).delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// ── PCM: Preventiva + Lubrificação (F3) ────────────────────────
export async function listPreventivaPcm(): Promise<PreventivaPcm[]> {
  return unwrap<PreventivaPcm[]>(
    await manutencao().from('preventiva').select('*')
      .order('trimestre').order('equip').order('comp'),
  );
}

export async function criarPreventivaPcm(payload: NovaPreventivaPcm): Promise<void> {
  const res = await manutencao().from('preventiva').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function atualizarPreventivaPcm(id: string, patch: Partial<NovaPreventivaPcm>): Promise<void> {
  const res = await manutencao().from('preventiva').update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function excluirPreventivaPcm(id: string): Promise<void> {
  const res = await manutencao().from('preventiva').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function listLuExecucoes(): Promise<LuExecucao[]> {
  return unwrap<LuExecucao[]>(
    await manutencao().from('lu_execucoes').select('*').order('data', { ascending: false }),
  );
}

export async function criarLuExecucao(payload: NovaLuExecucao): Promise<void> {
  const res = await manutencao().from('lu_execucoes').insert(payload);
  if (res.error) throw new Error(res.error.message);
}

// ── PCM: Indicadores (paradas, produção, custos) ───────────────
export async function listParadas(): Promise<Parada[]> {
  return unwrap<Parada[]>(
    await manutencao().from('paradas').select('*').order('data', { ascending: false }),
  );
}
export async function criarParada(payload: NovaParada): Promise<void> {
  const res = await manutencao().from('paradas').insert(payload);
  if (res.error) throw new Error(res.error.message);
}
export async function atualizarParada(id: string, patch: Partial<NovaParada>): Promise<void> {
  const res = await manutencao().from('paradas').update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}
export async function excluirParada(id: string): Promise<void> {
  const res = await manutencao().from('paradas').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function listProducaoHoras(): Promise<ProducaoHoras[]> {
  return unwrap<ProducaoHoras[]>(
    await manutencao().from('producao_horas').select('*').order('ano', { ascending: false }).order('mes', { ascending: false }),
  );
}
// Upsert por (mes, ano) — o par é único.
export async function salvarProducaoHoras(payload: NovaProducaoHoras): Promise<void> {
  const res = await manutencao().from('producao_horas').upsert(payload, { onConflict: 'org_id,mes,ano' });
  if (res.error) throw new Error(res.error.message);
}
export async function excluirProducaoHoras(id: string): Promise<void> {
  const res = await manutencao().from('producao_horas').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function listCustosManut(): Promise<CustoManut[]> {
  return unwrap<CustoManut[]>(
    await manutencao().from('custos').select('*').order('data', { ascending: false }),
  );
}
export async function criarCustoManut(payload: NovoCustoManut): Promise<void> {
  const res = await manutencao().from('custos').insert(payload);
  if (res.error) throw new Error(res.error.message);
}
export async function atualizarCustoManut(id: string, patch: Partial<NovoCustoManut>): Promise<void> {
  const res = await manutencao().from('custos').update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}
export async function excluirCustoManut(id: string): Promise<void> {
  const res = await manutencao().from('custos').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// ── Updates da varredura de editabilidade ──────────────────────
export async function atualizarApontamento(id: string, patch: Partial<NovoApontamento>): Promise<void> {
  const res = await producao().from('apontamentos').update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function atualizarPosicao(id: string, patch: Partial<NovaPosicao>): Promise<void> {
  const res = await producao().from('posicoes_estoque').update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function atualizarOrdemProducao(id: string, patch: Record<string, unknown>): Promise<void> {
  const res = await producao().from('ordens_producao').update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function atualizarMonitoramentoAgua(id: string, patch: Partial<NovoMonitoramentoAgua>): Promise<void> {
  const res = await qualidade().from('monitoramentos_agua').update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

export async function atualizarCalibracaoPhmetro(id: string, patch: Partial<NovaCalibracaoPhmetro>): Promise<void> {
  const res = await qualidade().from('calibracoes_phmetro').update(patch).eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// Atualiza a análise + substitui os valores por ensaio (delete + re-insert).
export async function atualizarAnaliseProcesso(
  id: string,
  cabecalho: Partial<NovaAnaliseProcesso>,
  valores: NovoAnaliseValor[],
): Promise<void> {
  const res = await qualidade().from('analises_processo').update(cabecalho).eq('id', id);
  if (res.error) throw new Error(res.error.message);
  const del = await qualidade().from('analise_processo_valores').delete().eq('analise_id', id);
  if (del.error) throw new Error(del.error.message);
  if (valores.length > 0) {
    const ins = await qualidade().from('analise_processo_valores')
      .insert(valores.map((v, i) => ({ ...v, analise_id: id, ordem: v.ordem ?? i })));
    if (ins.error) throw new Error(ins.error.message);
  }
}

// ── Helpers de lookup ──────────────────────────────────────────
export function mapBy<T, K extends keyof T>(rows: T[], key: K): Map<T[K], T> {
  return new Map(rows.map((r) => [r[key], r]));
}
