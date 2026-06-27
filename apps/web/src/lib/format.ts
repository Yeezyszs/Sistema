// Formatadores pt-BR (sem dependências).

export function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatarDataHora(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatarHora(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatarQuantidade(valor: number | null, unidade = ''): string {
  if (valor == null) return '—';
  const n = valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return unidade ? `${n} ${unidade}` : n;
}

// Duração entre dois instantes ISO (ex.: "1h 30min", "45min"); null se incompleto.
export function formatarDuracao(inicio: string | null, fim: string | null): string | null {
  if (!inicio || !fim) return null;
  const ms = new Date(fim).getTime() - new Date(inicio).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (h === 0) return `${min}min`;
  if (min === 0) return `${h}h`;
  return `${h}h ${min}min`;
}
