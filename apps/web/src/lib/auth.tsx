import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { podeAcessar, type Modulo, type Perfil } from '@sistema/domain';

interface AuthState {
  session: Session | null;
  loading: boolean;
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

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) setPerfis(await carregarPerfis());
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        void carregarPerfis().then(setPerfis);
      } else {
        setPerfis([]);
      }
    });
    return () => sub.subscription.unsubscribe();
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
    <AuthContext.Provider value={{ session, loading, perfis, podeAcessarModulo, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
