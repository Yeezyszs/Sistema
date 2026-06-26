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

// ── Helpers de lookup ──────────────────────────────────────────
export function mapBy<T, K extends keyof T>(rows: T[], key: K): Map<T[K], T> {
  return new Map(rows.map((r) => [r[key], r]));
}
