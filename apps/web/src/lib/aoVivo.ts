// Tempo real: avisa as telas abertas quando algo muda no banco.
//
// Sem isso, um registro feito em outro computador só aparecia com F5: cada
// tela buscava os dados uma vez, ao abrir, e não sabia de mais nada.
//
// Um canal só para o sistema inteiro, escutando os quatro schemas. Cada aviso
// chega filtrado pelo RLS — o navegador só sabe do que o usuário pode ler — e
// não traz o dado em si: ele só diz "mudou algo", e a tela busca de novo pelo
// mesmo caminho de sempre. Assim não existe uma segunda forma de montar a
// lista que possa discordar da primeira.
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

type Ouvinte = () => void;

const SCHEMAS = ['core', 'producao', 'qualidade', 'manutencao'] as const;

// Várias linhas mudam juntas (uma O.S. com três execuções, uma importação de
// cem notas). Esperar um instante junta tudo numa busca só, em vez de uma por
// linha.
const ESPERA_MS = 400;

const ouvintes = new Set<Ouvinte>();
let canal: RealtimeChannel | null = null;
let temporizador: ReturnType<typeof setTimeout> | null = null;

function avisarTodos() {
  if (temporizador) clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    temporizador = null;
    ouvintes.forEach((o) => o());
  }, ESPERA_MS);
}

function ligar() {
  if (canal) return;
  let c = supabase.channel('sistema-mudancas');
  for (const schema of SCHEMAS) {
    c = c.on('postgres_changes', { event: '*', schema }, avisarTodos);
  }
  canal = c.subscribe((status) => {
    // Voltou depois de cair (rede da fábrica, celular que dormiu): o que mudou
    // nesse meio tempo não foi avisado, então busca tudo de novo.
    if (status === 'SUBSCRIBED') avisarTodos();
  });
}

function desligar() {
  if (!canal) return;
  void supabase.removeChannel(canal);
  canal = null;
}

// Aba que volta a ficar visível: o navegador pode ter suspendido a conexão
// enquanto ela estava em segundo plano. Uma busca ao voltar fecha esse buraco.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ouvintes.size > 0) avisarTodos();
  });
}

// O canal precisa do token do usuário para o RLS valer; sem sessão não liga.
supabase.auth.onAuthStateChange((_evento, sessao) => {
  if (sessao && ouvintes.size > 0) ligar();
  if (!sessao) desligar();
});

/** Registra uma função a chamar quando o banco mudar. Devolve o cancelamento. */
export function aoMudarBanco(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte);
  ligar();
  return () => {
    ouvintes.delete(ouvinte);
    // Ninguém mais escutando (tela de login): solta a conexão.
    if (ouvintes.size === 0) desligar();
  };
}
