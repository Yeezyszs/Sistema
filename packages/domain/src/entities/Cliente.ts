// Cliente / destino das ordens de produção e lotes (core.clientes).
export interface Cliente {
  id: string;
  org_id: string;
  nome: string;
  cnpj: string | null;
  contato: string | null;
  telefone: string | null;
  email: string | null;
  endereco_entrega: string | null;
  condicao_pagamento: string | null;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
}

export interface NovoCliente {
  nome: string;
  cnpj?: string | null;
  contato?: string | null;
  telefone?: string | null;
  email?: string | null;
  endereco_entrega?: string | null;
  condicao_pagamento?: string | null;
}

export type AtualizacaoCliente = Partial<NovoCliente> & { ativo?: boolean };
