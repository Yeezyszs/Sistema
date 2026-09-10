// Peças compartilhadas entre os painéis (operação, almoxarifado, compras).
import { Card } from '../../components/ui';

// Tile de número. `tom` colore só quando o número pede ação — no estado neutro
// ele fica igual ao KPI comum, para que a cor continue significando algo.
export function Kpi({ label, valor, sub, tom = 'neutro' }: {
  label: string;
  valor: string;
  sub?: string;
  tom?: 'neutro' | 'alerta' | 'critico';
}) {
  const borda = tom === 'critico' ? 'border-red-200 bg-red-50'
    : tom === 'alerta' ? 'border-amber-200'
    : '';
  const corValor = tom === 'critico' ? 'text-red-700'
    : tom === 'alerta' ? 'text-amber-700'
    : 'text-slate-900';
  const corSub = tom === 'critico' ? 'text-red-600' : 'text-slate-500';

  return (
    <Card className={`px-[18px] py-4 ${borda}`}>
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold leading-none tabular-nums ${corValor}`}>{valor}</p>
      {sub && <p className={`mt-1.5 text-xs ${corSub}`}>{sub}</p>}
    </Card>
  );
}
