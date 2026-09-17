import { useMemo, useState, type FormEvent } from 'react';
import {
  listLubrificacaoPcm, listLuExecucoes, listColaboradoresPcm, criarLuExecucao,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, hojeLocalISO } from '../../lib/format';
import {
  situacaoLubrificacao, lubrificacaoPedeAcao, compararUrgenciaLubrificacao,
  SITUACAO_LUBRIFICACAO_LABEL, SITUACAO_LUBRIFICACAO_TOM,
} from '@sistema/domain';
import type {
  LubrificacaoPcm, LuExecucao, ColaboradorPcm, SituacaoLubrificacao, SituacaoPonto,
} from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal, ErroCarregamento } from '../../components/ui';
import { IconSearch } from '../../components/icons';
import { useToast } from '../../components/Toast';

export function PcmLubrificacaoPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [executando, setExecutando] = useState<LubrificacaoPcm | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroSit, setFiltroSit] = useState<'todas' | 'pendentes' | SituacaoLubrificacao>('pendentes');
  const { sucesso, erro } = useToast();

  const { data, loading, error } = useAsync(async () => {
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

  const hoje = hojeLocalISO();

  function avaliar(p: LubrificacaoPcm): { ultima: LuExecucao | null; s: SituacaoPonto } {
    const ultima = ultimaExec.get(`${p.setor}|${p.equip}|${p.item}`) ?? null;
    return { ultima, s: situacaoLubrificacao(ultima?.data ?? null, p.frequencia, hoje) };
  }

  const todos = (data?.pontos ?? []).map((p) => ({ p, ...avaliar(p) }));
  const linhas = todos
    .filter(({ p, s }) => {
      if (filtroSit === 'pendentes' && !lubrificacaoPedeAcao(s.situacao)) return false;
      if (filtroSit !== 'todas' && filtroSit !== 'pendentes' && s.situacao !== filtroSit) return false;
      if (!busca.trim()) return true;
      const q = busca.toLowerCase();
      return [p.setor, p.equip, p.item, p.lubrificante].some((v) => (v ?? '').toLowerCase().includes(q));
    })
    // O que já venceu primeiro, e dentro disso o mais atrasado.
    .sort((a, b) => compararUrgenciaLubrificacao(a.s, b.s));

  const vencidas = todos.filter((x) => x.s.situacao === 'vencida').length;
  const vencendo = todos.filter((x) => x.s.situacao === 'vencendo').length;

  return (
    <>
      <PageHeader grupo="Manutenção"
        title="Lubrificação"
        subtitle={`Rota de lubrificação — ${vencidas} vencida(s) e ${vencendo} vencendo`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" placeholder="Buscar setor, equipamento, item, lubrificante…" value={busca} onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-[7px] border border-slate-300 bg-white py-2 pl-9 pr-3 text-[12.5px] outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </div>
        <div className="w-44">
          <Select value={filtroSit} onChange={(e) => setFiltroSit(e.target.value as typeof filtroSit)}>
            <option value="pendentes">A lubrificar</option>
            <option value="todas">Todas</option>
            <option value="vencida">Vencidas</option>
            <option value="vencendo">Vencendo</option>
            <option value="sem_registro">Sem registro</option>
            <option value="em_dia">Em dia</option>
          </Select>
        </div>
      </div>

      {error && <ErroCarregamento mensagem={error} />}
      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}
      {data && linhas.length === 0 && <EmptyState title="Nenhum ponto" description="Ajuste a busca ou o filtro." />}

      {data && linhas.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11.5px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-[11px]">Setor</th>
                <th className="px-3 py-[11px]">Equipamento</th>
                <th className="px-3 py-[11px]">Item</th>
                <th className="hidden px-3 py-[11px] md:table-cell">Lubrificante</th>
                <th className="hidden px-3 py-[11px] lg:table-cell">Bombadas</th>
                <th className="px-3 py-[11px]">Frequência</th>
                <th className="px-3 py-[11px]">Última</th>
                <th className="px-3 py-[11px]">Próxima</th>
                <th className="px-3 py-[11px]">Situação</th>
                <th className="px-3 py-[11px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map(({ p, s, ultima }) => (
                <tr key={p.id} className={`hover:bg-slate-50 ${
                  s.situacao === 'vencida' ? 'bg-red-50/40' : s.situacao === 'vencendo' ? 'bg-amber-50/40' : ''
                }`}>
                  <td className="px-3 py-2.5 text-slate-500">{p.setor ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-700"><span className="line-clamp-1">{p.equip ?? '—'}</span></td>
                  <td className="px-3 py-2.5 text-slate-600">{p.item ?? '—'}</td>
                  <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">{p.lubrificante || '—'}</td>
                  <td className="hidden px-3 py-2.5 text-slate-500 lg:table-cell">{p.bombadas || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-500">{p.frequencia ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-500">{ultima ? formatarData(ultima.data) : '—'}</td>
                  <td className="px-3 py-2.5 text-slate-500">
                    {s.proxima ? formatarData(s.proxima) : '—'}
                    {s.diasRestantes != null && (
                      <span className="block text-[11px] text-slate-400">
                        {s.diasRestantes < 0 ? `${Math.abs(s.diasRestantes)} d de atraso`
                          : s.diasRestantes === 0 ? 'hoje'
                          : `em ${s.diasRestantes} d`}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SITUACAO_LUBRIFICACAO_TOM[s.situacao]}`}>
                      {SITUACAO_LUBRIFICACAO_LABEL[s.situacao]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => setExecutando(p)} className="text-xs font-medium text-brand-600 hover:text-brand-700">Lubrificar</button>
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
        data: String(f.get('data') ?? hojeLocalISO()),
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
          <Field label="Data"><TextInput name="data" type="date" defaultValue={hojeLocalISO()} required /></Field>
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
