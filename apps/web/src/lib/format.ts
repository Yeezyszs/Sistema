// Formatadores pt-BR (sem dependências).

export function formatarData(iso: string | null): string {
  if (!iso) return '—';
  // Data pura (YYYY-MM-DD) é formatada sem passar pelo Date, senão o JS
  // interpreta como meia-noite UTC e o fuso local (−3h) joga para o dia anterior.
  const soData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (soData) return `${soData[3]}/${soData[2]}/${soData[1]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Data de hoje no fuso local, como YYYY-MM-DD (para default de <input type=date>).
export function hojeLocalISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
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

// Nome de arquivo seguro para chave do Supabase Storage. A chave só aceita um
// conjunto restrito de caracteres — "Alvará de Funcionamento.pdf" era recusado
// com "Invalid key". Tira acento, troca o resto por hífen e preserva a
// extensão. O nome original continua guardado em `arquivo_nome`, então o
// usuário vê e baixa com o nome que ele subiu.
export function nomeArquivoSeguro(nome: string): string {
  const ponto = nome.lastIndexOf('.');
  const temExt = ponto > 0 && ponto < nome.length - 1;
  const base = temExt ? nome.slice(0, ponto) : nome;
  const ext = temExt ? nome.slice(ponto + 1) : '';

  const limpar = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '');

  // Limite de tamanho: a chave completa carrega ainda o id do fornecedor e o
  // timestamp, e nomes vindos de scanner passam fácil de 200 caracteres.
  const baseLimpa = limpar(base).slice(0, 120);
  const extLimpa = limpar(ext).slice(0, 10);
  const seguro = baseLimpa || 'arquivo';
  return extLimpa ? `${seguro}.${extLimpa}` : seguro;
}

/** Valor em reais, ou travessão quando não dá para calcular. */
export function formatarReais(valor: number | null): string {
  if (valor == null || !Number.isFinite(valor)) return '—';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
