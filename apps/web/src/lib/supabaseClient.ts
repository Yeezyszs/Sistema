import { createClient } from '@supabase/supabase-js';

// Acesso direto ao Supabase a partir do front, protegido por RLS.
// A API própria (apps/api) é reservada para o que tem regra de negócio
// com gate (movimentos de estoque, liberação de lote).
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes — confira o .env',
  );
}

export const supabase = createClient(url ?? '', anonKey ?? '');
