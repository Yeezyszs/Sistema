// Acesso a dados via supabase-js direto (protegido por RLS).
// Schemas de domínio expostos no PostgREST; lookups cruzados são resolvidos
// em JS para evitar dependência de embedding cross-schema.
import { supabase } from './supabaseClient';
import type {
  Lote,
  Produto,
  Fornecedor,
  EtapaLote,
  Etapa,
  Recebimento,
  RegistroEtapa,
  MovimentoEstoque,
  NovoRecebimento,
} from '@sistema/domain';

const producao = () => supabase.schema('producao');
const core = () => supabase.schema('core');

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

export async function getEtapasDoLote(loteId: string): Promise<EtapaLote[]> {
  return unwrap<EtapaLote[]>(
    await producao().from('etapas_lote').select('*').eq('lote_id', loteId),
  );
}

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

// ── Helpers de lookup ──────────────────────────────────────────
export function mapBy<T, K extends keyof T>(rows: T[], key: K): Map<T[K], T> {
  return new Map(rows.map((r) => [r[key], r]));
}
