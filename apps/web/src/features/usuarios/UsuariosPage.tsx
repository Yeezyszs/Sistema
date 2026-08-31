import { useState } from 'react';
import {
  listUsuarios, listPerfisCatalogo, atribuirPerfil, removerPerfil, atualizarUsuarioAtivo, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { PERFIL_LABEL, MODULOS_POR_PERFIL } from '@sistema/domain';
import type { Perfil } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, ErroCarregamento } from '../../components/ui';
import { useToast } from '../../components/Toast';

const TOM_PERFIL: Record<Perfil, string> = {
  gestao: 'bg-brand-600 text-white',
  qualidade: 'bg-emerald-600 text-white',
  operador: 'bg-sky-600 text-white',
  manutencao: 'bg-amber-600 text-white',
  compras: 'bg-violet-600 text-white',
  almoxarifado: 'bg-teal-600 text-white',
};

export function UsuariosPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const { sucesso, erro } = useToast();

  const { data, loading, error } = useAsync(async () => {
    const [usuarios, perfis] = await Promise.all([listUsuarios(), listPerfisCatalogo()]);
    return { usuarios, perfis, perfilPorId: mapBy(perfis, 'id'), perfilPorNome: mapBy(perfis, 'nome') };
  }, [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  async function toggle(usuarioId: string, perfilId: string, tem: boolean) {
    setOcupado(usuarioId + perfilId);
    try {
      if (tem) await removerPerfil(usuarioId, perfilId);
      else await atribuirPerfil(usuarioId, perfilId);
      rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setOcupado(null); }
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    try { await atualizarUsuarioAtivo(id, !ativo); sucesso(ativo ? 'Usuário desativado.' : 'Usuário ativado.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  return (
    <>
      <PageHeader grupo="Administração" title="Usuários & perfis" subtitle="Quem acessa o quê — o perfil define os módulos visíveis" />

      {error && <ErroCarregamento mensagem={error} />}
      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}
      {data && data.usuarios.length === 0 && <EmptyState title="Nenhum usuário" />}

      {data && data.usuarios.length > 0 && (
        <div className="space-y-3">
          {data.usuarios.map((u) => {
            const idsDoUsuario = new Set(u.usuario_perfis.map((x) => x.perfil_id));
            const nomesPerfil = u.usuario_perfis.map((x) => data.perfilPorId.get(x.perfil_id)?.nome).filter(Boolean) as Perfil[];
            const ehGestao = nomesPerfil.includes('gestao');
            return (
              <Card key={u.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{u.nome}</span>
                      {!u.ativo && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Inativo</span>}
                    </div>
                    <p className="text-sm text-slate-400">{u.email}</p>
                  </div>
                  <button onClick={() => void toggleAtivo(u.id, u.ativo)}
                    className="text-xs font-medium text-slate-400 hover:text-slate-700">
                    {u.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </div>

                {/* Perfis (clicáveis) */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {data.perfis.map((p) => {
                    const tem = idsDoUsuario.has(p.id);
                    const nome = p.nome as Perfil;
                    return (
                      <button key={p.id} disabled={ocupado === u.id + p.id}
                        onClick={() => void toggle(u.id, p.id, tem)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                          tem ? TOM_PERFIL[nome] ?? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}>
                        {PERFIL_LABEL[nome] ?? p.nome}
                      </button>
                    );
                  })}
                </div>

                {/* Módulos que os perfis liberam */}
                <p className="mt-3 text-xs text-slate-400">
                  {ehGestao
                    ? 'Gestão — acesso a todos os módulos.'
                    : nomesPerfil.length === 0
                      ? 'Sem perfil — não acessa nenhum módulo.'
                      : `Acessa: ${modulosDeArray(nomesPerfil)}`}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">
        Clique num perfil para conceder ou remover. A mudança vale no próximo carregamento do sistema para o usuário.
        Para <span className="font-medium">criar contas de login</span>, veja as opções com o administrador do sistema.
      </p>
    </>
  );
}

// União dos módulos liberados pelos perfis (sem gestão).
function modulosDeArray(perfis: Perfil[]): string {
  const set = new Set<string>();
  for (const pf of perfis) for (const m of MODULOS_POR_PERFIL[pf]) if (m !== 'painel') set.add(m);
  const mods = [...set].map((m) => m.replace(/_/g, ' '));
  return `${set.size} módulo(s) — ${mods.slice(0, 8).join(', ')}${mods.length > 8 ? '…' : ''}`;
}
