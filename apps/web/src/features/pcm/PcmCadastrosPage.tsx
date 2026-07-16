import { useMemo, useState } from 'react';
import {
  listEquipamentosPcm, listComponentesPcm, listPlanosPcm,
  listLubrificacaoPcm, listFerramentasPcm, listColaboradoresPcm,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { TIPO_PLANO_PCM_LABEL } from '@sistema/domain';
import type {
  EquipamentoPcm, ComponenteEquipamento, PlanoPcm, LubrificacaoPcm, FerramentaPcm, ColaboradorPcm,
} from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Select } from '../../components/ui';
import { IconChevronRight, IconSearch } from '../../components/icons';

type Aba = 'equipamentos' | 'planos' | 'lubrificacao' | 'ferramentas' | 'colaboradores';

export function PcmCadastrosPage() {
  const [aba, setAba] = useState<Aba>('equipamentos');
  const [busca, setBusca] = useState('');
  const [filtroSetor, setFiltroSetor] = useState('');

  const { data, loading } = useAsync(async () => {
    const [equipamentos, componentes, planos, lubrificacao, ferramentas, colaboradores] = await Promise.all([
      listEquipamentosPcm(), listComponentesPcm(), listPlanosPcm(),
      listLubrificacaoPcm(), listFerramentasPcm(), listColaboradoresPcm(),
    ]);
    return { equipamentos, componentes, planos, lubrificacao, ferramentas, colaboradores };
  }, []);

  const setores = useMemo(
    () => [...new Set((data?.equipamentos ?? []).map((e) => e.setor))].sort(),
    [data?.equipamentos],
  );

  const q = busca.trim().toLowerCase();

  return (
    <>
      <PageHeader
        title="PCM — Cadastros"
        subtitle="Base do Planejamento e Controle de Manutenção (portada do PCM)"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-2">
          {([
            ['equipamentos', `Equipamentos (${data?.equipamentos.length ?? 0})`],
            ['planos', `Planos (${data?.planos.length ?? 0})`],
            ['lubrificacao', `Lubrificação (${data?.lubrificacao.length ?? 0})`],
            ['ferramentas', `Ferramentas (${data?.ferramentas.length ?? 0})`],
            ['colaboradores', `Colaboradores (${data?.colaboradores.length ?? 0})`],
          ] as [Aba, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setAba(id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${aba === id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-[180px]">
          <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" placeholder="Buscar…" value={busca} onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        </div>
        {aba === 'equipamentos' && (
          <div className="w-44">
            <Select value={filtroSetor} onChange={(e) => setFiltroSetor(e.target.value)}>
              <option value="">Todos os setores</option>
              {setores.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        )}
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-emerald-600" /></div>}

      {data && aba === 'equipamentos' && (
        <AbaEquipamentos equipamentos={data.equipamentos} componentes={data.componentes} q={q} filtroSetor={filtroSetor} />
      )}
      {data && aba === 'planos' && <AbaPlanos planos={data.planos.filter((p) =>
        !q || [p.setor, p.equip, p.item, p.plano, p.period].some((v) => (v ?? '').toLowerCase().includes(q)))} />}
      {data && aba === 'lubrificacao' && <AbaLubrificacao pontos={data.lubrificacao.filter((l) =>
        !q || [l.setor, l.equip, l.item, l.lubrificante, l.frequencia].some((v) => (v ?? '').toLowerCase().includes(q)))} />}
      {data && aba === 'ferramentas' && <AbaFerramentas ferramentas={data.ferramentas.filter((f) =>
        !q || [f.nome, f.caixa, f.tipo, f.area].some((v) => (v ?? '').toLowerCase().includes(q)))} />}
      {data && aba === 'colaboradores' && <AbaColaboradores colaboradores={data.colaboradores.filter((c) =>
        !q || [c.nome, c.funcao, c.setor].some((v) => (v ?? '').toLowerCase().includes(q)))} />}
    </>
  );
}

// ── Equipamentos: árvore por setor com componentes expansíveis ──
function AbaEquipamentos({ equipamentos, componentes, q, filtroSetor }: {
  equipamentos: EquipamentoPcm[]; componentes: ComponenteEquipamento[]; q: string; filtroSetor: string;
}) {
  const [aberto, setAberto] = useState<string | null>(null);

  const compPorEquip = useMemo(() => {
    const m = new Map<string, ComponenteEquipamento[]>();
    for (const c of componentes) {
      const arr = m.get(c.equipamento_id) ?? [];
      arr.push(c);
      m.set(c.equipamento_id, arr);
    }
    return m;
  }, [componentes]);

  const filtrados = equipamentos.filter((e) => {
    if (filtroSetor && e.setor !== filtroSetor) return false;
    if (!q) return true;
    if (e.nome.toLowerCase().includes(q) || e.setor.toLowerCase().includes(q)) return true;
    return (compPorEquip.get(e.id) ?? []).some((c) => c.nome.toLowerCase().includes(q));
  });

  const porSetor = useMemo(() => {
    const m = new Map<string, EquipamentoPcm[]>();
    for (const e of filtrados) {
      const arr = m.get(e.setor) ?? [];
      arr.push(e);
      m.set(e.setor, arr);
    }
    return [...m.entries()];
  }, [filtrados]);

  if (filtrados.length === 0) return <EmptyState title="Nenhum equipamento" description="Ajuste a busca ou o filtro de setor." />;

  return (
    <div className="space-y-6">
      {porSetor.map(([setor, eqs]) => (
        <div key={setor}>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">{setor} <span className="font-normal text-slate-400">· {eqs.length} equipamento(s)</span></h3>
          <Card className="divide-y divide-slate-100">
            {eqs.map((e) => {
              const comps = compPorEquip.get(e.id) ?? [];
              const estaAberto = aberto === e.id;
              return (
                <div key={e.id}>
                  <button onClick={() => setAberto(estaAberto ? null : e.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50">
                    <IconChevronRight width={14} height={14}
                      className={`shrink-0 text-slate-400 transition-transform ${estaAberto ? 'rotate-90' : ''}`} />
                    <span className="flex-1 text-sm font-medium text-slate-700">{e.nome}</span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {comps.length} componente(s)
                    </span>
                  </button>
                  {estaAberto && comps.length > 0 && (
                    <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-slate-100">
                          {comps.map((c) => (
                            <tr key={c.id}>
                              <td className="w-14 py-1.5 pr-3 text-right font-mono text-xs text-slate-400">{c.qty ?? '—'}</td>
                              <td className="py-1.5 text-slate-600">{c.nome}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {estaAberto && comps.length === 0 && (
                    <p className="border-t border-slate-100 bg-slate-50/60 px-11 py-3 text-sm text-slate-400">Sem componentes cadastrados.</p>
                  )}
                </div>
              );
            })}
          </Card>
        </div>
      ))}
    </div>
  );
}

function AbaPlanos({ planos }: { planos: PlanoPcm[] }) {
  if (planos.length === 0) return <EmptyState title="Nenhum plano" />;
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="px-3 py-3 font-medium">Setor</th>
            <th className="px-3 py-3 font-medium">Equipamento</th>
            <th className="px-3 py-3 font-medium">Plano</th>
            <th className="px-3 py-3 font-medium">Item</th>
            <th className="px-3 py-3 font-medium">Periodicidade</th>
            <th className="px-3 py-3 font-medium text-right">Qtd</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {planos.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <td className="px-3 py-2.5 text-slate-500">{p.setor ?? '—'}</td>
              <td className="px-3 py-2.5 text-slate-700">{p.equip ?? '—'}</td>
              <td className="px-3 py-2.5">
                {p.plano ? (
                  <span className={`rounded px-1.5 py-0.5 font-mono text-xs font-medium ${
                    p.plano === 'LU' ? 'bg-sky-100 text-sky-700' : p.plano === 'PRM' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`} title={TIPO_PLANO_PCM_LABEL[p.plano]}>{p.plano}</span>
                ) : '—'}
              </td>
              <td className="px-3 py-2.5 text-slate-600">{p.item ?? '—'}</td>
              <td className="px-3 py-2.5 text-slate-500">{p.period ?? '—'}</td>
              <td className="px-3 py-2.5 text-right text-slate-500">{p.qty ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function AbaLubrificacao({ pontos }: { pontos: LubrificacaoPcm[] }) {
  if (pontos.length === 0) return <EmptyState title="Nenhum ponto de lubrificação" />;
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="px-3 py-3 font-medium">Setor</th>
            <th className="px-3 py-3 font-medium">Equipamento</th>
            <th className="px-3 py-3 font-medium">Item</th>
            <th className="px-3 py-3 font-medium">Lubrificante</th>
            <th className="px-3 py-3 font-medium">Bombadas</th>
            <th className="px-3 py-3 font-medium">Frequência</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {pontos.map((l) => (
            <tr key={l.id} className="hover:bg-slate-50">
              <td className="px-3 py-2.5 text-slate-500">{l.setor ?? '—'}</td>
              <td className="px-3 py-2.5 text-slate-700">{l.equip ?? '—'}</td>
              <td className="px-3 py-2.5 text-slate-600">{l.item ?? '—'}</td>
              <td className="px-3 py-2.5 text-slate-600">{l.lubrificante || '—'}</td>
              <td className="px-3 py-2.5 text-slate-500">{l.bombadas || '—'}</td>
              <td className="px-3 py-2.5 text-slate-500">{l.frequencia ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function AbaFerramentas({ ferramentas }: { ferramentas: FerramentaPcm[] }) {
  if (ferramentas.length === 0) return <EmptyState title="Nenhuma ferramenta" />;
  const grupos: [string, FerramentaPcm[]][] = [
    ['Checklist — Elétrica', ferramentas.filter((f) => f.tipo === 'eletrica' && !f.caixa)],
    ['Checklist — Mecânica', ferramentas.filter((f) => f.tipo === 'mecanica' && !f.caixa)],
    ['Caixa VERDE', ferramentas.filter((f) => f.caixa === 'VERDE')],
    ['Caixa VERMELHA', ferramentas.filter((f) => f.caixa === 'VERMELHA')],
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {grupos.filter(([, itens]) => itens.length > 0).map(([titulo, itens]) => (
        <Card key={titulo} className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">{titulo} <span className="font-normal text-slate-400">· {itens.length} item(ns)</span></h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {itens.map((f) => (
                <tr key={f.id}>
                  <td className="w-10 py-1.5 pr-3 text-right font-mono text-xs text-slate-400">{f.qty ?? 1}</td>
                  <td className="py-1.5 text-slate-600">{f.nome}</td>
                  <td className="py-1.5 text-right text-xs text-slate-400">{f.area || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}
    </div>
  );
}

function AbaColaboradores({ colaboradores }: { colaboradores: ColaboradorPcm[] }) {
  if (colaboradores.length === 0) return <EmptyState title="Nenhum colaborador" />;
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="px-3 py-3 font-medium">Nome</th>
            <th className="px-3 py-3 font-medium">Função</th>
            <th className="px-3 py-3 font-medium">Setor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {colaboradores.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className="px-3 py-2.5 font-medium text-slate-700">{c.nome}</td>
              <td className="px-3 py-2.5 text-slate-600">{c.funcao ?? '—'}</td>
              <td className="px-3 py-2.5 text-slate-500">{c.setor ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
