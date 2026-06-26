// Cliente / destino das ordens de produção e lotes (core.clientes).
export interface Cliente {
  id: string;
  org_id: string;
  nome: string;
  cnpj: string | null;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
}

export interface NovoCliente {
  nome: string;
  cnpj?: string | null;
}
