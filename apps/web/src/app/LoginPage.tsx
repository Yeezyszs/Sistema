import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button, Card, Field, TextInput } from '../components/ui';
import { IconLeaf } from '../components/icons';

export function LoginPage() {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to="/lotes" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    const { error } = await signIn(email.trim(), senha);
    setLoading(false);
    if (error) {
      setErro('E-mail ou senha inválidos.');
      return;
    }
    navigate('/lotes', { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
            <IconLeaf width={26} height={26} />
          </span>
          <h1 className="text-xl font-semibold text-slate-900">Indústria Sumaré</h1>
          <p className="text-sm text-slate-500">Sistema de produção e rastreabilidade</p>
        </div>

        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="E-mail">
              <TextInput
                type="email"
                autoComplete="email"
                placeholder="voce@sumare.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Senha">
              <TextInput
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </Field>
            {erro && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erro}</p>
            )}
            <Button type="submit" loading={loading} className="w-full">
              Entrar
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
