import { NavLink, Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import { IconLotes, IconRecebimento, IconLogout, IconLeaf, IconShield, IconClipboard, IconDoc, IconFlask, IconBox } from '../components/icons';

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

export function Layout() {
  const { session, signOut } = useAuth();
  const email = session?.user.email ?? '';

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

        <nav className="flex-1 space-y-1 px-3 py-2">
          <NavItem to="/ordens" icon={<IconClipboard />} label="Ordens de produção" />
          <NavItem to="/lotes" icon={<IconLotes />} label="Lotes" />
          <NavItem to="/recebimentos" icon={<IconRecebimento />} label="Recebimentos" />
          <NavItem to="/qualidade" icon={<IconShield />} label="Qualidade" />
          <NavItem to="/pcc-fisico" icon={<IconBox />} label="PCC Físico" />
          <NavItem to="/especificacoes" icon={<IconFlask />} label="Especificações" />
          <NavItem to="/nao-conformidades" icon={<IconDoc />} label="Não conformidades" />
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="px-3 py-2">
            <p className="truncate text-xs text-slate-400">Conectado como</p>
            <p className="truncate text-sm font-medium text-slate-700">{email}</p>
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
