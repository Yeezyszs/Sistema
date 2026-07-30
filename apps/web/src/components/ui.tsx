// Primitivos de UI — leves, consistentes, com foco em legibilidade.
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';

// ── Botão ──────────────────────────────────────────────────────
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline';
  loading?: boolean;
};

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const styles: Record<string, string> = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300',
    outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
  };
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

// ── Card ───────────────────────────────────────────────────────
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[10px] border border-slate-200 bg-white ${className}`}>
      {children}
    </div>
  );
}

// ── Cabeçalho de página ────────────────────────────────────────
// `grupo` é o rótulo do módulo (breadcrumb); `meta` é a informação à direita.
export function PageHeader({
  title,
  subtitle,
  grupo,
  meta,
  action,
}: {
  title: string;
  subtitle?: string;
  grupo?: string;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {grupo && <p className="mb-0.5 text-xs text-slate-400">{grupo}</p>}
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {meta && <span className="text-xs text-slate-400">{meta}</span>}
        {action}
      </div>
    </div>
  );
}

// ── Cabeçalho de card ──────────────────────────────────────────
export function CardTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className={sub ? 'mb-3.5' : 'mb-3.5'}>
      <h2 className="text-sm font-bold text-slate-900">{children}</h2>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

// ── Pílula de filtro / aba ─────────────────────────────────────
export function Pill({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3.5 py-[7px] text-[12.5px] font-semibold transition ${
        ativo
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

// ── Badge (estado) ─────────────────────────────────────────────
// Cores semânticas, independentes do acento da marca.
export type BadgeTom = 'neutro' | 'info' | 'sucesso' | 'alerta' | 'erro';

const BADGE_TOM: Record<BadgeTom, string> = {
  neutro: 'bg-slate-100 text-slate-600',
  info: 'bg-indigo-100 text-indigo-800',
  sucesso: 'bg-emerald-100 text-emerald-800',
  alerta: 'bg-amber-100 text-amber-800',
  erro: 'bg-red-100 text-red-800',
};

export function Badge({ tom = 'neutro', children }: { tom?: BadgeTom; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[11.5px] font-semibold ${BADGE_TOM[tom]}`}>
      {children}
    </span>
  );
}

// ── Cabeçalho de tabela ────────────────────────────────────────
// Use em <thead>: <tr className={LINHA_CABECALHO}> com <th className="px-4 py-[11px]">
export const LINHA_CABECALHO =
  'border-b border-slate-200 bg-slate-50 text-left text-[11.5px] font-bold uppercase tracking-wide text-slate-500';

// ── Spinner ────────────────────────────────────────────────────
export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin text-current ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
    </svg>
  );
}

export function FullScreen({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-slate-50">{children}</div>;
}

// ── Estado vazio ───────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      {icon && <div className="mb-3 text-slate-300">{icon}</div>}
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p>}
    </div>
  );
}

// ── Campos de formulário ───────────────────────────────────────
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      {...props}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      {...props}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      {...props}
    />
  );
}

// ── Modal ──────────────────────────────────────────────────────
const MODAL_LARGURA: Record<'md' | 'lg' | 'xl', string> = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative z-10 my-auto max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ${MODAL_LARGURA[size]}`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
