import { useMemo, useState, type FormEvent } from 'react';
import {
  listParadas, listProducaoHoras, listCustosManut, listOrdensPcm, listEquipamentosPcm,
  criarParada, atualizarParada, excluirParada,
  salvarProducaoHoras, excluirProducaoHoras,
  criarCustoManut, atualizarCustoManut, excluirCustoManut,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData } from '../../lib/format';
import {
  TIPO_PARADA, TURNO_PARADA, horasEntre, calcularIndicadores,
} from '@sistema/domain';
import type { Parada, ProducaoHoras, CustoManut, TipoParada } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { IconPlus } from '../../components/icons';
import { useToast } from '../../components/Toast';

const MESES = ['—', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
type Aba = 'dashboard' | 'paradas' | 'producao' | 'custos';
type ToastFn = (m: string) => void;

function reais(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function h1(v: number | null): string {
  return v == null ? '—' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`;
}

export function PcmIndicadoresPage() {
  const [aba, setAba] = useState<Aba>('dashboard');
  const [meses, setMeses] = useState(6);
  const [recarregar, setRecarregar] = useState(0);
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(async () => {
    const [paradas, producao, custos, ordens, equipamentos] = await Promise.all([
      listParadas(), listProducaoHoras(), listCustosManut(), listOrdensPcm(), listEquipamentosPcm(),
    ]);
    const setores = [...new Set(equipamentos.map((e) => e.setor))].sort();
    return { paradas, producao, custos, ordens, setores };
  }, [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  // Período: últimos N meses a partir de hoje.
  const desde = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() - meses + 1); d.setDate(1); return d; }, [meses]);
  const desdeISO = desde.toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="Indicadores de Manutenção" subtitle="Disponibilidade · MTTR · MTBF (PCM)" />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-2">
          {([
            ['dashboard', 'Indicadores'], ['paradas', `Paradas (${data?.paradas.length ?? 0})`],
            ['producao', 'Produção (horas)'], ['custos', `Custos (${data?.custos.length ?? 0})`],
          ] as [Aba, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setAba(id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${aba === id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
        </div>
        {aba === 'dashboard' && (
          <div className="ml-auto w-40">
            <Select value={String(meses)} onChange={(e) => setMeses(Number(e.target.value))}>
              <option value="3">Últimos 3 meses</option>
              <option value="6">Últimos 6 meses</option>
              <option value="12">Últimos 12 meses</option>
            </Select>
          </div>
        )}
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-emerald-600" /></div>}

      {data && aba === 'dashboard' && <Dashboard data={data} desde={desde} desdeISO={desdeISO} meses={meses} />}
      {data && aba === 'paradas' && <AbaParadas data={data} rec={rec} sucesso={sucesso} erro={erro} />}
      {data && aba === 'producao' && <AbaProducao producao={data.producao} rec={rec} sucesso={sucesso} erro={erro} />}
      {data && aba === 'custos' && <AbaCustos custos={data.custos} rec={rec} sucesso={sucesso} erro={erro} />}
    </>
  );
}

type DataShape = {
  paradas: Parada[]; producao: ProducaoHoras[]; custos: CustoManut[];
  ordens: { id: string; numero: number }[]; setores: string[];
};

// ── Dashboard ──────────────────────────────────────────────────
function Dashboard({ data, desde, desdeISO, meses }: { data: DataShape; desde: Date; desdeISO: string; meses: number }) {
  const paradasPer = data.paradas.filter((p) => p.data >= desdeISO);
  // Produção planejada dos meses do período.
  const mesesPeriodo: { mes: number; ano: number }[] = [];
  for (let i = 0; i < meses; i++) {
    const d = new Date(desde); d.setMonth(desde.getMonth() + i);
    mesesPeriodo.push({ mes: d.getMonth() + 1, ano: d.getFullYear() });
  }
  const horasPlan = data.producao
    .filter((pr) => mesesPeriodo.some((m) => m.mes === pr.mes && m.ano === pr.ano))
    .reduce((s, pr) => s + pr.horas, 0);

  const kpi = calcularIndicadores(paradasPer, horasPlan);

  const somaPor = (chave: (p: Parada) => string) => {
    const m = new Map<string, number>();
    for (const p of paradasPer) { const k = chave(p) || 'Não informado'; m.set(k, (m.get(k) ?? 0) + p.horas); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const porTipo = somaPor((p) => p.tipo);
  const porSetor = somaPor((p) => p.setor ?? '').slice(0, 10);
  const porTurno = somaPor((p) => p.turno ?? '');
  const custosPer = data.custos.filter((c) => c.data >= desdeISO);
  const custoTotal = custosPer.reduce((s, c) => s + c.valor, 0);
  const custoPorCat = (() => {
    const m = new Map<string, number>();
    for (const c of custosPer) { const k = c.categoria || 'Sem categoria'; m.set(k, (m.get(k) ?? 0) + c.valor); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  })();

  if (horasPlan === 0 && paradasPer.length === 0) {
    return <EmptyState title="Sem dados no período" description="Lance horas de produção e paradas para calcular os indicadores." />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Disponibilidade" valor={kpi.disponibilidade != null ? `${kpi.disponibilidade.toFixed(1)}%` : '—'}
          tom={kpi.disponibilidade != null && kpi.disponibilidade >= 90 ? 'ok' : 'alerta'} rodape={`${h1(kpi.horasOperacao)} operando`} />
        <Kpi titulo="MTTR" valor={h1(kpi.mttr)} rodape="tempo médio de reparo" />
        <Kpi titulo="MTBF" valor={h1(kpi.mtbf)} rodape="tempo médio entre falhas" />
        <Kpi titulo="Falhas (Manut.)" valor={String(kpi.nFalhas)} rodape={`${h1(kpi.horasManutencao)} paradas`} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi titulo="Horas planejadas" valor={h1(kpi.horasPlanejadas)} rodape="no período" />
        <Kpi titulo="Horas paradas (todas)" valor={h1(kpi.horasParadas)} rodape={`${paradasPer.length} parada(s)`} />
        <Kpi titulo="Custo de manutenção" valor={reais(custoTotal)} rodape="no período" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Barras titulo="Horas paradas por tipo" itens={porTipo} unidade="h" />
        <Barras titulo="Horas paradas por turno" itens={porTurno} unidade="h" />
        <Barras titulo="Horas paradas por setor (top 10)" itens={porSetor} unidade="h" />
        <Barras titulo="Custos por categoria" itens={custoPorCat} money />
      </div>
    </div>
  );
}

function Kpi({ titulo, valor, rodape, tom }: { titulo: string; valor: string; rodape?: string; tom?: 'ok' | 'alerta' }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{titulo}</p>
      <p className={`mt-1 text-2xl font-semibold ${tom === 'ok' ? 'text-emerald-600' : tom === 'alerta' ? 'text-amber-600' : 'text-slate-800'}`}>{valor}</p>
      {rodape && <p className="text-xs text-slate-400">{rodape}</p>}
    </Card>
  );
}

function Barras({ titulo, itens, unidade, money }: { titulo: string; itens: [string, number][]; unidade?: string; money?: boolean }) {
  const max = Math.max(1, ...itens.map(([, v]) => v));
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{titulo}</h3>
      {itens.length === 0 ? <p className="text-sm text-slate-400">Sem dados.</p> : (
        <div className="space-y-2">
          {itens.map(([nome, valor]) => (
            <div key={nome}>
              <div className="mb-0.5 flex justify-between text-xs">
                <span className="text-slate-600">{nome}</span>
                <span className="font-medium text-slate-700">{money ? reais(valor) : `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${unidade ? ` ${unidade}` : ''}`}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(valor / max) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Aba Paradas ────────────────────────────────────────────────
function AbaParadas({ data, rec, sucesso, erro }: { data: DataShape; rec: () => void; sucesso: ToastFn; erro: ToastFn }) {
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Parada | null>(null);

  async function remover(id: string) {
    try { await excluirParada(id); sucesso('Parada excluída.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setModal(true)}><IconPlus width={16} height={16} />Nova parada</Button>
      </div>
      {data.paradas.length === 0 ? <EmptyState title="Sem paradas" description='Registre a primeira em "Nova parada".' /> : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-medium">Data</th>
                <th className="px-3 py-3 font-medium">Tipo</th>
                <th className="hidden px-3 py-3 font-medium md:table-cell">Setor</th>
                <th className="hidden px-3 py-3 font-medium sm:table-cell">Turno</th>
                <th className="px-3 py-3 font-medium text-right">Horas</th>
                <th className="hidden px-3 py-3 font-medium lg:table-cell">Motivo</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.paradas.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 text-slate-500">{formatarData(p.data)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.tipo === 'Manutenção / Quebra' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{p.tipo}</span>
                  </td>
                  <td className="hidden px-3 py-2.5 text-slate-600 md:table-cell">{p.setor ?? '—'}</td>
                  <td className="hidden px-3 py-2.5 text-slate-500 sm:table-cell">{p.turno ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-slate-700">{p.horas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</td>
                  <td className="hidden max-w-[240px] px-3 py-2.5 text-slate-500 lg:table-cell"><span className="line-clamp-1">{p.motivo ?? '—'}</span></td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => setEditando(p)} className="mr-3 text-xs font-medium text-slate-500 hover:text-emerald-600">Editar</button>
                    <button onClick={() => void remover(p.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {(modal || editando) && (
        <ModalParada setores={data.setores} ordens={data.ordens} editando={editando}
          onClose={() => { setModal(false); setEditando(null); }}
          onSaved={() => { setModal(false); setEditando(null); rec(); }} sucesso={sucesso} erro={erro} />
      )}
    </>
  );
}

function ModalParada({ setores, ordens, editando, onClose, onSaved, sucesso, erro }: {
  setores: string[]; ordens: { id: string; numero: number }[]; editando?: Parada | null;
  onClose: () => void; onSaved: () => void; sucesso: ToastFn; erro: ToastFn;
}) {
  const [ini, setIni] = useState(editando?.hora_inicio ?? '');
  const [fim, setFim] = useState(editando?.hora_fim ?? '');
  const [horas, setHoras] = useState(editando?.horas != null ? String(editando.horas) : '');
  const [salvando, setSalvando] = useState(false);

  // Sugere horas a partir de início/fim, mas o campo é editável.
  const horasAuto = horasEntre(ini || null, fim || null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const txt = (k: string) => String(f.get(k) ?? '').trim() || null;
    const horasFinal = horas ? Number(horas) : horasAuto;
    setSalvando(true);
    try {
      const payload = {
        data: String(f.get('data') ?? new Date().toISOString().slice(0, 10)),
        tipo: String(f.get('tipo') ?? 'Outro') as TipoParada,
        setor: txt('setor'),
        turno: txt('turno'),
        hora_inicio: ini || null,
        hora_fim: fim || null,
        horas: horasFinal,
        motivo: txt('motivo'),
        os_id: String(f.get('os_id') ?? '') || null,
      };
      if (editando) await atualizarParada(editando.id, payload);
      else await criarParada(payload);
      sucesso(editando ? 'Parada atualizada.' : 'Parada registrada.'); onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={editando ? 'Editar parada' : 'Nova parada'} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Data"><TextInput name="data" type="date" defaultValue={editando?.data ?? new Date().toISOString().slice(0, 10)} required /></Field>
          <Field label="Tipo">
            <Select name="tipo" defaultValue={editando?.tipo ?? 'Manutenção / Quebra'}>
              {TIPO_PARADA.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Setor">
            <Select name="setor" defaultValue={editando?.setor ?? ''}>
              <option value="">—</option>
              {setores.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Turno">
            <Select name="turno" defaultValue={editando?.turno ?? ''}>
              <option value="">—</option>
              {TURNO_PARADA.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Hora início"><TextInput type="time" value={ini} onChange={(e) => setIni(e.target.value)} /></Field>
          <Field label="Hora fim"><TextInput type="time" value={fim} onChange={(e) => setFim(e.target.value)} /></Field>
          <Field label="Horas">
            <TextInput type="number" step="any" min="0" value={horas} onChange={(e) => setHoras(e.target.value)}
              placeholder={horasAuto ? `auto: ${horasAuto}` : '0'} />
          </Field>
        </div>
        <Field label="OS vinculada (opcional)">
          <Select name="os_id" defaultValue={editando?.os_id ?? ''}>
            <option value="">—</option>
            {ordens.map((o) => <option key={o.id} value={o.id}>O.S. #{o.numero}</option>)}
          </Select>
        </Field>
        <Field label="Motivo"><TextInput name="motivo" defaultValue={editando?.motivo ?? ''} placeholder="Descrição da parada" /></Field>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>{editando ? 'Salvar' : 'Registrar'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Aba Produção (horas planejadas por mês) ────────────────────
function AbaProducao({ producao, rec, sucesso, erro }: { producao: ProducaoHoras[]; rec: () => void; sucesso: ToastFn; erro: ToastFn }) {
  const [modal, setModal] = useState(false);

  async function remover(id: string) {
    try { await excluirProducaoHoras(id); sucesso('Registro excluído.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setModal(true)}><IconPlus width={16} height={16} />Lançar horas</Button>
      </div>
      {producao.length === 0 ? <EmptyState title="Sem horas lançadas" description="Informe as horas planejadas de fábrica por mês." /> : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-medium">Mês</th>
                <th className="px-3 py-3 font-medium">Ano</th>
                <th className="px-3 py-3 font-medium text-right">Horas planejadas</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {producao.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 text-slate-700">{MESES[p.mes]}</td>
                  <td className="px-3 py-2.5 text-slate-500">{p.ano}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-slate-700">{p.horas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h</td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => void remover(p.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {modal && <ModalProducao onClose={() => setModal(false)} onSaved={() => { setModal(false); rec(); }} sucesso={sucesso} erro={erro} />}
    </>
  );
}

function ModalProducao({ onClose, onSaved, sucesso, erro }: { onClose: () => void; onSaved: () => void; sucesso: ToastFn; erro: ToastFn }) {
  const [salvando, setSalvando] = useState(false);
  const hoje = new Date();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSalvando(true);
    try {
      await salvarProducaoHoras({ mes: Number(f.get('mes')), ano: Number(f.get('ano')), horas: Number(f.get('horas') ?? 0) });
      sucesso('Horas salvas.'); onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }
  return (
    <Modal open onClose={onClose} title="Horas planejadas do mês">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Mês">
            <Select name="mes" defaultValue={String(hoje.getMonth() + 1)}>
              {MESES.slice(1).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Ano"><TextInput name="ano" type="number" defaultValue={hoje.getFullYear()} required /></Field>
          <Field label="Horas"><TextInput name="horas" type="number" step="any" min="0" required placeholder="720" /></Field>
        </div>
        <p className="text-xs text-slate-400">Se já houver lançamento para o mês/ano, ele é atualizado.</p>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Aba Custos ─────────────────────────────────────────────────
function AbaCustos({ custos, rec, sucesso, erro }: { custos: CustoManut[]; rec: () => void; sucesso: ToastFn; erro: ToastFn }) {
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<CustoManut | null>(null);

  async function remover(id: string) {
    try { await excluirCustoManut(id); sucesso('Custo excluído.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }
  const total = custos.reduce((s, c) => s + c.valor, 0);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        {custos.length > 0 && <span className="text-sm text-slate-500">Total: <span className="font-semibold text-slate-800">{reais(total)}</span></span>}
        <Button onClick={() => setModal(true)} className="ml-auto"><IconPlus width={16} height={16} />Novo custo</Button>
      </div>
      {custos.length === 0 ? <EmptyState title="Sem custos" description='Lance o primeiro em "Novo custo".' /> : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-medium">Data</th>
                <th className="px-3 py-3 font-medium">Categoria</th>
                <th className="px-3 py-3 font-medium">Descrição</th>
                <th className="px-3 py-3 font-medium text-right">Valor</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {custos.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 text-slate-500">{formatarData(c.data)}</td>
                  <td className="px-3 py-2.5 text-slate-600">{c.categoria ?? '—'}</td>
                  <td className="max-w-[280px] px-3 py-2.5 text-slate-600"><span className="line-clamp-1">{c.descricao ?? '—'}</span></td>
                  <td className="px-3 py-2.5 text-right font-medium text-slate-700">{reais(c.valor)}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => setEditando(c)} className="mr-3 text-xs font-medium text-slate-500 hover:text-emerald-600">Editar</button>
                    <button onClick={() => void remover(c.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {(modal || editando) && (
        <ModalCusto editando={editando} onClose={() => { setModal(false); setEditando(null); }}
          onSaved={() => { setModal(false); setEditando(null); rec(); }} sucesso={sucesso} erro={erro} />
      )}
    </>
  );
}

function ModalCusto({ editando, onClose, onSaved, sucesso, erro }: {
  editando?: CustoManut | null; onClose: () => void; onSaved: () => void; sucesso: ToastFn; erro: ToastFn;
}) {
  const [salvando, setSalvando] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSalvando(true);
    try {
      const payload = {
        data: String(f.get('data') ?? new Date().toISOString().slice(0, 10)),
        categoria: String(f.get('categoria') ?? '').trim() || null,
        descricao: String(f.get('descricao') ?? '').trim() || null,
        valor: Number(f.get('valor') ?? 0),
      };
      if (editando) await atualizarCustoManut(editando.id, payload);
      else await criarCustoManut(payload);
      sucesso(editando ? 'Custo atualizado.' : 'Custo lançado.'); onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }
  return (
    <Modal open onClose={onClose} title={editando ? 'Editar custo' : 'Novo custo'} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data"><TextInput name="data" type="date" defaultValue={editando?.data ?? new Date().toISOString().slice(0, 10)} required /></Field>
          <Field label="Categoria"><TextInput name="categoria" defaultValue={editando?.categoria ?? ''} list="cats-custo" placeholder="Peças, Serviço externo…" /></Field>
        </div>
        <datalist id="cats-custo">
          <option value="Peças" /><option value="Serviço externo" /><option value="Lubrificantes" /><option value="Ferramentas" /><option value="Outros" />
        </datalist>
        <Field label="Descrição"><TextInput name="descricao" defaultValue={editando?.descricao ?? ''} placeholder="—" /></Field>
        <Field label="Valor (R$)"><TextInput name="valor" type="number" step="any" min="0" defaultValue={editando?.valor ?? ''} required placeholder="0,00" /></Field>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>{editando ? 'Salvar' : 'Lançar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
