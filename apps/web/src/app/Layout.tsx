import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import type { Modulo } from '@sistema/domain';
import {
  IconLotes, IconRecebimento, IconLogout, IconLeaf, IconShield, IconClipboard, IconDoc,
  IconFlask, IconBox, IconCheck, IconClock, IconTruck, IconArrowLeft,
  IconGrid, IconFactory, IconWrench, IconUser, IconLock,
} from '../components/icons';

interface SubItem {
  to: string;
  icon: ReactNode;
  label: string;
  modulo: Modulo;
}

// ── Itens por grupo ────────────────────────────────────────────
const ITENS_PRODUCAO: SubItem[] = [
  { to: '/lotes', icon: <IconLotes width={16} height={16} />, label: 'Lotes', modulo: 'lotes' },
  { to: '/programacao', icon: <IconClipboard width={16} height={16} />, label: 'Programação', modulo: 'pcp' },
  { to: '/apontamento', icon: <IconCheck width={16} height={16} />, label: 'Apontamento', modulo: 'pcp' },
  { to: '/ordens', icon: <IconClipboard width={16} height={16} />, label: 'Ordens de produção', modulo: 'ordens' },
  { to: '/produtos', icon: <IconBox width={16} height={16} />, label: 'Produtos', modulo: 'produtos' },
];

const ITENS_ALMOX: SubItem[] = [
  { to: '/almoxarifado', icon: <IconBox width={16} height={16} />, label: 'Consumíveis', modulo: 'almoxarifado' },
  { to: '/embalagens', icon: <IconBox width={16} height={16} />, label: 'Embalagens', modulo: 'almoxarifado' },
  { to: '/pallets', icon: <IconBox width={16} height={16} />, label: 'Pallets', modulo: 'pallets' },
];

const ITENS_LOGISTICA: SubItem[] = [
  { to: '/estoque', icon: <IconBox width={16} height={16} />, label: 'Estoque', modulo: 'estoque' },
  { to: '/expedicao', icon: <IconTruck width={16} height={16} />, label: 'Expedição', modulo: 'expedicao' },
];

const ITENS_SUPRIMENTOS: SubItem[] = [
  { to: '/recebimentos', icon: <IconRecebimento width={16} height={16} />, label: 'Recebimentos', modulo: 'recebimentos' },
  { to: '/fornecedores', icon: <IconUser width={16} height={16} />, label: 'Fornecedores & QA', modulo: 'fornecedores' },
];

const ITENS_COMERCIAL: SubItem[] = [
  { to: '/carteira', icon: <IconDoc width={16} height={16} />, label: 'Carteira de pedidos', modulo: 'comercial' },
  { to: '/pedidos', icon: <IconDoc width={16} height={16} />, label: 'Pedidos', modulo: 'pedidos' },
  { to: '/analise-vendas', icon: <IconGrid width={16} height={16} />, label: 'Análise de vendas', modulo: 'comercial' },
  { to: '/clientes', icon: <IconUser width={16} height={16} />, label: 'Clientes', modulo: 'comercial' },
];

const ITENS_QUALIDADE: SubItem[] = [
  { to: '/qualidade', icon: <IconShield width={16} height={16} />, label: 'Qualidade', modulo: 'qualidade' },
  { to: '/acompanhamento', icon: <IconFlask width={16} height={16} />, label: 'Acomp. de Processo', modulo: 'acompanhamento' },
  { to: '/monitoramento-agua', icon: <IconFlask width={16} height={16} />, label: 'Cloro & pH (água)', modulo: 'monitoramento_agua' },
  { to: '/pcc-fisico', icon: <IconBox width={16} height={16} />, label: 'PCC Físico', modulo: 'pcc_fisico' },
  { to: '/ppho', icon: <IconCheck width={16} height={16} />, label: 'PPHO & Higiene', modulo: 'ppho' },
  { to: '/especificacoes', icon: <IconFlask width={16} height={16} />, label: 'Especificações', modulo: 'especificacoes' },
  { to: '/calibracao', icon: <IconClock width={16} height={16} />, label: 'Calibração', modulo: 'calibracao' },
  { to: '/calibracao-phmetro', icon: <IconFlask width={16} height={16} />, label: 'Calibração pHmetro', modulo: 'calibracao' },
  { to: '/insumos-lab', icon: <IconBox width={16} height={16} />, label: 'Insumos do Lab', modulo: 'insumos_lab' },
  { to: '/contraprovas', icon: <IconBox width={16} height={16} />, label: 'Contraprovas', modulo: 'contraprovas' },
  { to: '/analise-risco', icon: <IconShield width={16} height={16} />, label: 'Análise de risco', modulo: 'analise_risco' },
  { to: '/auditoria', icon: <IconCheck width={16} height={16} />, label: 'Auditoria & PPR', modulo: 'auditoria' },
  { to: '/ambiental', icon: <IconLeaf width={16} height={16} />, label: 'Ambiental & Pragas', modulo: 'ambiental' },
  { to: '/nao-conformidades', icon: <IconDoc width={16} height={16} />, label: 'Não conformidades', modulo: 'nao_conformidades' },
  { to: '/reprocesso', icon: <IconClock width={16} height={16} />, label: 'Retidos', modulo: 'reprocesso' },
];

const ITENS_MANUTENCAO: SubItem[] = [
  { to: '/manutencao', icon: <IconClipboard width={16} height={16} />, label: 'Ordens de Serviço', modulo: 'manutencao' },
  { to: '/preventiva', icon: <IconCheck width={16} height={16} />, label: 'Preventiva', modulo: 'manutencao' },
  { to: '/lubrificacao', icon: <IconClock width={16} height={16} />, label: 'Lubrificação', modulo: 'manutencao' },
  { to: '/pcm-indicadores', icon: <IconGrid width={16} height={16} />, label: 'Indicadores', modulo: 'manutencao' },
  { to: '/pcm-checklist', icon: <IconCheck width={16} height={16} />, label: 'Checklist de ferramentas', modulo: 'manutencao' },
  { to: '/pcm-cadastros', icon: <IconBox width={16} height={16} />, label: 'Cadastros (PCM)', modulo: 'manutencao' },
];

const ITENS_ADMIN: SubItem[] = [
  { to: '/usuarios', icon: <IconUser width={16} height={16} />, label: 'Usuários & perfis', modulo: 'usuarios' },
];

interface Grupo {
  key: string;
  label: string;
  icon: ReactNode;
  itens: SubItem[];
  restrito?: boolean; // exibe cadeado (área de time específico)
}

const GRUPOS: Grupo[] = [
  { key: 'producao', label: 'Produção', icon: <IconFactory width={19} height={19} />, itens: ITENS_PRODUCAO },
  { key: 'almoxarifado', label: 'Almoxarifado', icon: <IconBox width={19} height={19} />, itens: ITENS_ALMOX },
  { key: 'logistica', label: 'Logística', icon: <IconTruck width={19} height={19} />, itens: ITENS_LOGISTICA },
  { key: 'suprimentos', label: 'Suprimentos', icon: <IconRecebimento width={19} height={19} />, itens: ITENS_SUPRIMENTOS },
  { key: 'comercial', label: 'Comercial', icon: <IconDoc width={19} height={19} />, itens: ITENS_COMERCIAL },
  { key: 'qualidade', label: 'Qualidade', icon: <IconShield width={19} height={19} />, itens: ITENS_QUALIDADE, restrito: true },
  { key: 'manutencao', label: 'Manutenção', icon: <IconWrench width={19} height={19} />, itens: ITENS_MANUTENCAO },
  { key: 'admin', label: 'Administração', icon: <IconUser width={19} height={19} />, itens: ITENS_ADMIN, restrito: true },
];

export function Layout() {
  const { session, signOut, podeAcessarModulo, perfis } = useAuth();
  const email = session?.user.email ?? '';
  const location = useLocation();
  const [aberto, setAberto] = useState<string | null>(null);

  // Fecha o flyout ao navegar, no Escape e no clique fora.
  useEffect(() => setAberto(null), [location.pathname]);
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [aberto]);

  const grupos = GRUPOS
    .map((g) => ({ ...g, itens: g.itens.filter((i) => podeAcessarModulo(i.modulo)) }))
    .filter((g) => g.itens.length > 0);

  const veePainel = podeAcessarModulo('painel');
  const mostrarVoltarPainel = veePainel && location.pathname !== '/painel';

  return (
    <div className="min-h-screen bg-slate-100 text-[13px] text-slate-900">
      {/* Camada que captura o clique fora do flyout */}
      {aberto && <div className="fixed inset-0 z-20" onClick={() => setAberto(null)} />}

      {/* ── RAIL ── */}
      <nav className="fixed inset-y-0 left-0 z-30 flex w-14 flex-col items-center gap-1 bg-rail py-3.5">
        <Link to={veePainel ? '/painel' : '/lotes'}
          className="mb-4 flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-rail-hover text-emerald-300"
          title="Sumaré — MES">
          <IconLeaf width={19} height={19} />
        </Link>

        {/* Painel (link direto) */}
        {veePainel && (
          <RailLink to="/painel" label="Painel" ativo={location.pathname === '/painel'}>
            <IconGrid width={19} height={19} />
          </RailLink>
        )}

        {/* Grupos (abrem flyout) */}
        {grupos.map((g) => {
          const ativo = g.itens.some((i) => location.pathname.startsWith(i.to));
          const estaAberto = aberto === g.key;
          return (
            <div key={g.key} className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setAberto(estaAberto ? null : g.key); }}
                aria-label={g.label}
                aria-expanded={estaAberto}
                className={`peer relative flex h-10 w-10 items-center justify-center rounded-lg transition ${
                  ativo || estaAberto ? 'bg-rail-active text-white' : 'text-rail-icon hover:bg-rail-hover hover:text-slate-100'
                }`}
              >
                {g.icon}
                {g.restrito && (
                  <IconLock width={10} height={10} strokeWidth={2.6} className="absolute bottom-0.5 right-0.5 text-slate-400" />
                )}
              </button>

              {/* Tooltip (só quando o flyout está fechado) */}
              {!estaAberto && (
                <span className="pointer-events-none absolute left-full top-1/2 z-40 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white opacity-0 transition-opacity peer-hover:opacity-100">
                  {g.label}{g.restrito ? ' · acesso restrito' : ''}
                </span>
              )}

              {/* Flyout */}
              {estaAberto && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-full top-0 z-40 ml-2 min-w-[210px] rounded-[10px] border border-slate-200 bg-white p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.14)]"
                >
                  <p className="px-2.5 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {g.label}
                  </p>
                  {g.itens.map((i) => (
                    <NavLink
                      key={i.to}
                      to={i.to}
                      onClick={() => setAberto(null)}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] transition ${
                          isActive ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-800 hover:bg-slate-100'
                        }`
                      }
                    >
                      <span className="shrink-0 text-slate-400">{i.icon}</span>
                      {i.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Usuário / sair */}
        <div className="relative mt-auto">
          <button
            onClick={(e) => { e.stopPropagation(); setAberto(aberto === 'usuario' ? null : 'usuario'); }}
            aria-label="Conta"
            className={`peer flex h-10 w-10 items-center justify-center rounded-lg transition ${
              aberto === 'usuario' ? 'bg-rail-active text-white' : 'text-rail-icon hover:bg-rail-hover hover:text-slate-100'
            }`}
          >
            <IconUser width={19} height={19} />
          </button>
          {aberto !== 'usuario' && (
            <span className="pointer-events-none absolute bottom-1/2 left-full z-40 ml-2 translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white opacity-0 transition-opacity peer-hover:opacity-100">
              Conta
            </span>
          )}
          {aberto === 'usuario' && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 left-full z-40 ml-2 min-w-[220px] rounded-[10px] border border-slate-200 bg-white p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.14)]"
            >
              <div className="px-2.5 py-2">
                <p className="truncate text-[13px] font-medium text-slate-800">{email}</p>
                {perfis.length > 0 && (
                  <p className="mt-0.5 truncate text-[11.5px] capitalize text-brand-700">{perfis.join(' · ')}</p>
                )}
              </div>
              <button
                onClick={() => void signOut()}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] text-slate-700 transition hover:bg-slate-100"
              >
                <IconLogout width={16} height={16} className="text-slate-400" />
                Sair
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ── CONTEÚDO ── */}
      <main className="ml-14 px-5 pb-14 pt-6 sm:px-8">
        <div className="mx-auto max-w-[1440px]">
          {mostrarVoltarPainel && (
            <Link
              to="/painel"
              className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-500 transition hover:text-brand-700"
            >
              <IconArrowLeft width={15} height={15} />
              Voltar ao painel
            </Link>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// Item do rail que é um link direto (sem flyout).
function RailLink({ to, label, ativo, children }: {
  to: string; label: string; ativo: boolean; children: ReactNode;
}) {
  return (
    <div className="relative">
      <Link
        to={to}
        aria-label={label}
        className={`peer flex h-10 w-10 items-center justify-center rounded-lg transition ${
          ativo ? 'bg-rail-active text-white' : 'text-rail-icon hover:bg-rail-hover hover:text-slate-100'
        }`}
      >
        {children}
      </Link>
      <span className="pointer-events-none absolute left-full top-1/2 z-40 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white opacity-0 transition-opacity peer-hover:opacity-100">
        {label}
      </span>
    </div>
  );
}
