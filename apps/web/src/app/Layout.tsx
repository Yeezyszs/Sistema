import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useState, type ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import type { Modulo } from '@sistema/domain';
import {
  IconLotes, IconRecebimento, IconLogout, IconLeaf, IconShield, IconClipboard, IconDoc,
  IconFlask, IconBox, IconCheck, IconClock, IconChevronRight, IconTruck,
} from '../components/icons';

function NavItem({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
          isActive
            ? 'bg-emerald-50 text-emerald-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

interface SubItem {
  to: string;
  icon: ReactNode;
  label: string;
  modulo: Modulo;
}

function NavGroup({ icon, label, items }: { icon: ReactNode; label: string; items: SubItem[] }) {
  const location = useLocation();
  const algumAtivo = items.some((i) => location.pathname.startsWith(i.to));
  const [aberto, setAberto] = useState(algumAtivo);

  if (items.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setAberto((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
          algumAtivo && !aberto
            ? 'bg-emerald-50 text-emerald-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        {icon}
        <span className="flex-1 text-left">{label}</span>
        <IconChevronRight
          width={14}
          height={14}
          className={`shrink-0 transition-transform ${aberto ? 'rotate-90' : ''}`}
        />
      </button>
      {aberto && (
        <div className="mt-1 space-y-1 border-l border-slate-200 pl-3">
          {items.map((item) => (
            <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} />
          ))}
        </div>
      )}
    </div>
  );
}

const ITENS_TOPO: SubItem[] = [
  { to: '/lotes', icon: <IconLotes />, label: 'Lotes', modulo: 'lotes' },
  { to: '/recebimentos', icon: <IconRecebimento />, label: 'Recebimentos', modulo: 'recebimentos' },
  { to: '/fornecedores', icon: <IconRecebimento />, label: 'Fornecedores & QA', modulo: 'fornecedores' },
];

const ITENS_PCP: SubItem[] = [
  { to: '/programacao', icon: <IconClipboard width={18} height={18} />, label: 'Programação', modulo: 'pcp' },
  { to: '/apontamento', icon: <IconCheck width={18} height={18} />, label: 'Apontamento', modulo: 'pcp' },
  { to: '/ordens', icon: <IconClipboard width={18} height={18} />, label: 'Ordens de produção', modulo: 'ordens' },
  { to: '/estoque', icon: <IconBox width={18} height={18} />, label: 'Estoque', modulo: 'estoque' },
  { to: '/pedidos', icon: <IconDoc width={18} height={18} />, label: 'Pedidos', modulo: 'pedidos' },
  { to: '/expedicao', icon: <IconTruck width={18} height={18} />, label: 'Expedição', modulo: 'expedicao' },
  { to: '/embalagens', icon: <IconBox width={18} height={18} />, label: 'Embalagens', modulo: 'embalagens' },
  { to: '/pallets', icon: <IconBox width={18} height={18} />, label: 'Pallets', modulo: 'pallets' },
  { to: '/reprocesso', icon: <IconClock width={18} height={18} />, label: 'Retidos', modulo: 'reprocesso' },
];

const ITENS_QUALIDADE: SubItem[] = [
  { to: '/qualidade', icon: <IconShield width={18} height={18} />, label: 'Qualidade', modulo: 'qualidade' },
  { to: '/acompanhamento', icon: <IconFlask width={18} height={18} />, label: 'Acomp. de Processo', modulo: 'acompanhamento' },
  { to: '/monitoramento-agua', icon: <IconFlask width={18} height={18} />, label: 'Cloro & pH (água)', modulo: 'monitoramento_agua' },
  { to: '/pcc-fisico', icon: <IconBox width={18} height={18} />, label: 'PCC Físico', modulo: 'pcc_fisico' },
  { to: '/ppho', icon: <IconCheck width={18} height={18} />, label: 'PPHO & Higiene', modulo: 'ppho' },
  { to: '/especificacoes', icon: <IconFlask width={18} height={18} />, label: 'Especificações', modulo: 'especificacoes' },
  { to: '/calibracao', icon: <IconClock width={18} height={18} />, label: 'Calibração', modulo: 'calibracao' },
  { to: '/calibracao-phmetro', icon: <IconFlask width={18} height={18} />, label: 'Calibração pHmetro', modulo: 'calibracao' },
  { to: '/insumos-lab', icon: <IconBox width={18} height={18} />, label: 'Insumos do Lab', modulo: 'insumos_lab' },
  { to: '/contraprovas', icon: <IconBox width={18} height={18} />, label: 'Contraprovas', modulo: 'contraprovas' },
  { to: '/analise-risco', icon: <IconShield width={18} height={18} />, label: 'Análise de risco', modulo: 'analise_risco' },
  { to: '/auditoria', icon: <IconCheck width={18} height={18} />, label: 'Auditoria & PPR', modulo: 'auditoria' },
  { to: '/ambiental', icon: <IconLeaf width={18} height={18} />, label: 'Ambiental & Pragas', modulo: 'ambiental' },
  { to: '/nao-conformidades', icon: <IconDoc width={18} height={18} />, label: 'Não conformidades', modulo: 'nao_conformidades' },
  { to: '/manutencao', icon: <IconClipboard width={18} height={18} />, label: 'Manutenção — O.S.', modulo: 'manutencao' },
  { to: '/pcm-cadastros', icon: <IconBox width={18} height={18} />, label: 'PCM — Cadastros', modulo: 'manutencao' },
];

export function Layout() {
  const { session, signOut, podeAcessarModulo, perfis } = useAuth();
  const email = session?.user.email ?? '';

  const itensTopo = ITENS_TOPO.filter((i) => podeAcessarModulo(i.modulo));
  const itensPcp = ITENS_PCP.filter((i) => podeAcessarModulo(i.modulo));
  const itensQualidade = ITENS_QUALIDADE.filter((i) => podeAcessarModulo(i.modulo));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2.5 px-6 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <IconLeaf width={20} height={20} />
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight text-slate-900">Sumaré</p>
            <p className="text-xs text-slate-400">MES · Rastreabilidade</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {itensTopo.map((item) => (
            <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} />
          ))}
          <NavGroup icon={<IconClipboard />} label="PCP" items={itensPcp} />
          <NavGroup icon={<IconShield />} label="Qualidade" items={itensQualidade} />
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="px-3 py-2">
            <p className="truncate text-xs text-slate-400">Conectado como</p>
            <p className="truncate text-sm font-medium text-slate-700">{email}</p>
            {perfis.length > 0 && (
              <p className="truncate text-xs text-emerald-600">{perfis.join(', ')}</p>
            )}
          </div>
          <button
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            <IconLogout />
            Sair
          </button>
        </div>
      </aside>

      {/* Topbar (mobile) */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <IconLeaf width={18} height={18} />
          </span>
          <span className="font-semibold text-slate-900">Sumaré</span>
        </div>
        <button onClick={() => void signOut()} className="text-slate-500" aria-label="Sair">
          <IconLogout />
        </button>
      </header>

      {/* Conteúdo */}
      <main className="px-4 py-6 md:ml-64 md:px-10 md:py-8">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
