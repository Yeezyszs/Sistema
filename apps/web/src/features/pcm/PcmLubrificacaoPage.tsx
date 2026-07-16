import { useMemo, useState, type FormEvent } from 'react';
import {
  listLubrificacaoPcm, listLuExecucoes, listColaboradoresPcm, criarLuExecucao,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData } from '../../lib/format';
import type { LubrificacaoPcm, LuExecucao, ColaboradorPcm } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { IconSearch } from '../../components/icons';
import { useToast } from '../../components/Toast';

// Converte a frequência textual do plano em dias (para calcular vencimento).
function frequenciaDias(freq: string | null): number | null {
  if (!freq) return null;
  const f = freq.toUpperCase();
  if (f.includes('SEMANAL')) return 7;
  if (f.includes('QUINZEN')) return 15;
  if (f.includes('MENSAL')) return 30;
  if (f.includes('TRIMESTRAL')) return 90;
  return null;
}

type Situacao = 'sem_registro' | 'vencida' | 'em_dia';

export function PcmLubrificacaoPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [executando, setExecutando] = useState<LubrificacaoPcm | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroSit, setFiltroSit] = useState<'todas' | Situacao>('todas');
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(async () => {
    const [pontos, execucoes, colaboradores] = await Promise.all([
      listLubrificacaoPcm(), listLuExecucoes(), listColaboradoresPcm(),
    ]);
    return { pontos, execucoes, colaboradores };
  }, [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  // Última execução por ponto (setor|equip|item).
  const ultimaExec = useMemo(() => {
    const m = new Map<string, LuExecucao>();
    for (const e of data?.execucoes ?? []) {
      const k = `${e.setor}|${e.equip}|${e.item}`;
      const prev = m.get(k);
      if (!prev || e.data > prev.data) m.set(k, e);
    }
    return m;
  }, [data?.execucoes]);

  function situacao(p: LubrificacaoPcm): { sit: Situacao; ultima: LuExecucao | null; proxima: Date | null } {
    const ultima = ultimaExec.get(`${p.setor}|${p.equip}|${p.item}`) ?? null;
    const dias = frequenciaDias(p.frequencia);
    if (!ultima) return { sit: 'sem_registro', ultima: null, proxima: null };
    if (dias == null) return { sit: 'em_dia', ultima, proxima: null };
    const prox = new Date(`${ultima.data}T00:00:00`);
    prox.setDate(prox.getDate() + dias);
    return { sit: new Date() >= prox ? 'vencida' : 'em_dia', ultima, proxima: prox };
  }

  const linhas = (data?.pontos ?? [])
    .map((p) => ({ p, ...situacao(p) }))
    .filter(({ p, sit }) => {
      if (filtroSit !== 'todas' && sit !== filtroSit) return false;
      if (!busca.trim()) return true;
      const q = busca.toLowerCase();
      return [p.setor, p.equip, p.item, p.lubrificante].some((v) => (v ?? '').toLowerCase().includes(q));
    });

  const vencidas = (data?.pontos ?? []).filter((p) => situacao(p).sit !== 'em_dia').length;

  return (
    <>
      <PageHeader
        title="Lubrificação"
        subtitle={`Rota de lubrificação — ${vencidas} ponto(s) a lubrificar`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" placeholder="Buscar setor, equipamento, item, lubrificante…" value={busca} onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        </div>
        <div className="w-44">
          <Select value={filtroSit} onChange={(e) => setFiltroSit(e.target.value as typeof filtroSit)}>
            <option value="todas">Todas</option>
            <option value="vencida">Vencidas</option>
            <option value="sem_registro">Sem registro</option>
            <option value="em_dia">Em dia</option>
          </Select>
        </div>
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-emerald-600" /></div>}
      {data && linhas.length === 0 && <EmptyState title="Nenhum ponto" description="Ajuste a busca ou o filtro." />}

      {data && linhas.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-medium">Setor</th>
                <th className="px-3 py-3 font-medium">Equipamento</th>
                <th className="px-3 py-3 font-medium">Item</th>
                <th className="hidden px-3 py-3 font-medium md:table-cell">Lubrificante</th>
                <th className="hidden px-3 py-3 font-medium lg:table-cell">Bombadas</th>
                <th className="px-3 py-3 font-medium">Frequência</th>
                <th className="px-3 py-3 font-medium">Última</th>
                <th className="px-3 py-3 font-medium">Situação</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map(({ p, sit, ultima }) => (
                <tr key={p.id} className={`hover:bg-slate-50 ${sit === 'vencida' ? 'bg-red-50/40' : ''}`}>
                  <td className="px-3 py-2.5 text-slate-500">{p.setor ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-700"><span className="line-clamp-1">{p.equip ?? '—'}</span></td>
                  <td className="px-3 py-2.5 text-slate-600">{p.item ?? '—'}</td>
                  <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">{p.lubrificante || '—'}</td>
                  <td className="hidden px-3 py-2.5 text-slate-500 lg:table-cell">{p.bombadas || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-500">{p.frequencia ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-500">{ultima ? formatarData(ultima.data) : '—'}</td>
                  <td className="px-3 py-2.5">
                    {sit === 'em_dia' && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Em dia</span>}
                    {sit === 'vencida' && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Vencida</span>}
                    {sit === 'sem_registro' && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Sem registro</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => setExecutando(p)} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">Lubrificar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {executando && (
        <ModalExecutar ponto={executando} colaboradores={data?.colaboradores ?? []}
          onClose={() => setExecutando(null)} onSaved={() => { setExecutando(null); rec(); }} sucesso={sucesso} erro={erro} />
      )}
    </>
  );
}

function ModalExecutar({ ponto, colaboradores, onClose, onSaved, sucesso, erro }: {
  ponto: LubrificacaoPcm; colaboradores: ColaboradorPcm[];
  onClose: () => void; onSaved: () => void;
  sucesso: (m: string) => void; erro: (m: string) => void;
}) {
  const [salvando, setSalvando] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSalvando(true);
    try {
      await criarLuExecucao({
        setor: ponto.setor,
        equip: ponto.equip,
        item: ponto.item,
        data: String(f.get('data') ?? new Date().toISOString().slice(0, 10)),
        exec: String(f.get('exec') ?? '').trim() || null,
        obs: String(f.get('obs') ?? '').trim() || null,
      });
      sucesso('Lubrificação registrada.'); onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }
  return (
    <Modal open onClose={onClose} title="Registrar lubrificação">
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {ponto.setor} · {ponto.equip} · {ponto.item}
          {ponto.lubrificante && <> — {ponto.lubrificante}{ponto.bombadas ? ` (${ponto.bombadas})` : ''}</>}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data"><TextInput name="data" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Field>
          <Field label="Executor">
            <TextInput name="exec" list="colabs-lu" placeholder="Nome" />
            <datalist id="colabs-lu">{colaboradores.map((c) => <option key={c.id} value={c.nome} />)}</datalist>
          </Field>
        </div>
        <Field label="Observação"><TextInput name="obs" placeholder="—" /></Field>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Registrar</Button>
        </div>
      </form>
    </Modal>
  );
}
