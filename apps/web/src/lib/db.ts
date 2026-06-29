// Acesso a dados via supabase-js direto (protegido por RLS).
// Schemas de domínio expostos no PostgREST; lookups cruzados são resolvidos
// em JS para evitar dependência de embedding cross-schema.
import { supabase } from './supabaseClient';
import type {
  Lote,
  NovoLote,
  Produto,
  Fornecedor,
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
} from '@sistema/domain';

const producao = () => supabase.schema('producao');
const core = () => supabase.schema('core');
const qualidade = () => supabase.schema('qualidade');

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

// ── Catálogos / dados-mestre ───────────────────────────────────
export async function listEtapas(): Promise<Etapa[]> {
  return unwrap<Etapa[]>(await producao().from('etapas').select('*').order('ordem'));
}

export async function listProdutos(): Promise<Produto[]> {
  return unwrap<Produto[]>(await core().from('produtos').select('*').order('nome'));
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

export async function criarRecebimento(payload: NovoRecebimento): Promise<Recebimento> {
  const res = await producao().from('recebimentos').insert(payload).select('*').single();
  if (res.error) throw new Error(res.error.message);
  return res.data as Recebimento;
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

// ── Helpers de lookup ──────────────────────────────────────────
export function mapBy<T, K extends keyof T>(rows: T[], key: K): Map<T[K], T> {
  return new Map(rows.map((r) => [r[key], r]));
}
