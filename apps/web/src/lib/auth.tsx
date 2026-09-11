import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { podeAcessar, type Modulo, type Perfil } from '@sistema/domain';

interface AuthState {
  session: Session | null;
  loading: boolean;
  /** Os perfis já chegaram para a sessão atual. Enquanto for false, nenhuma
   *  guarda de módulo pode decidir: `perfis` ainda é [] e negaria tudo. */
  perfisProntos: boolean;
  perfis: Perfil[];
  podeAcessarModulo: (modulo: Modulo) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

async function carregarPerfis(): Promise<Perfil[]> {
  const { data, error } = await supabase.schema('core').rpc('meus_perfis');
  if (error || !data) return [];
  return data as Perfil[];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [perfisProntos, setPerfisProntos] = useState(false);

  // De quem são os perfis já carregados. Serve para não buscar de novo quando o
  // evento de autenticação é só a renovação do token do mesmo usuário.
  const usuarioCarregado = useRef<string | null>(null);

  useEffect(() => {
    let vivo = true;

    async function sincronizar(s: Session | null, inicial: boolean) {
      setSession(s);

      if (!s) {
        usuarioCarregado.current = null;
        setPerfis([]);
        setPerfisProntos(false);
        if (inicial) setLoading(false);
        return;
      }

      // O supabase-js renova o token quando a aba volta a ficar visível, e cada
      // renovação dispara este evento. Antes, toda volta de aba recarregava os
      // perfis e punha `loading` em true — o que desmonta a tela inteira e faz
      // o usuário perder o que estava fazendo. O token mudou; os perfis, não.
      if (usuarioCarregado.current === s.user.id) {
        if (inicial) setLoading(false);
        return;
      }

      // Usuário novo (login, ou troca de conta): os perfis do anterior não
      // valem mais, e a guarda precisa esperar em vez de negar.
      usuarioCarregado.current = s.user.id;
      setPerfisProntos(false);
      const lista = await carregarPerfis();
      if (!vivo) return;
      setPerfis(lista);
      setPerfisProntos(true);
      // `loading` só cobre a abertura do sistema. Depois disso a sessão já foi
      // resolvida uma vez, e segurar a tela de novo custaria mais do que
      // protege: na troca de usuário os perfis chegam em seguida.
      if (inicial) setLoading(false);
    }

    void supabase.auth.getSession().then(({ data }) => sincronizar(data.session, true));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      void sincronizar(s, false);
    });

    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  function podeAcessarModulo(modulo: Modulo): boolean {
    return podeAcessar(perfis, modulo);
  }

  return (
    <AuthContext.Provider value={{ session, loading, perfisProntos, perfis, podeAcessarModulo, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
