import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  listOrdensPcm, listEquipamentosPcm, listColaboradoresPcm,
  criarOrdemPcm, atualizarOrdemPcm, excluirOrdemPcm, salvarExecucoesDaOs,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData } from '../../lib/format';
import { TIPO_OS_PCM, NATUREZA_OS, PRIORIDADE_OS_PCM, PRIORIDADE_OS_PCM_TOM } from '@sistema/domain';
import type { OrdemPcm, NovaOsExecucao, ColaboradorPcm } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { IconPlus, IconSearch, IconDoc } from '../../components/icons';
import { useToast } from '../../components/Toast';

export function PcmOrdensPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [modal, setModal] = useState(false);
  const [concluindo, setConcluindo] = useState<OrdemPcm | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'Em Aberto' | 'Concluído'>('Em Aberto');
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(async () => {
    const [ordens, equipamentos, colaboradores] = await Promise.all([
      listOrdensPcm(), listEquipamentosPcm(), listColaboradoresPcm(),
    ]);
    const setores = [...new Set(equipamentos.map((e) => e.setor))].sort();
    return { ordens, setores, colaboradores };
  }, [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  const linhas = (data?.ordens ?? []).filter((o) => {
    if (filtroStatus !== 'todas' && o.status !== filtroStatus) return false;
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return [String(o.numero), o.setor ?? '', o.req ?? '', o.descricao ?? '', o.tipo ?? '', o.exec ?? '']
      .some((v) => v.toLowerCase().includes(q));
  });

  const abertas = (data?.ordens ?? []).filter((o) => o.status === 'Em Aberto').length;

  async function remover(id: string) {
    try { await excluirOrdemPcm(id); sucesso('O.S. excluída.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  return (
    <>
      <PageHeader
        title="Ordens de Serviço"
        subtitle={`Manutenção (PCM) — ${abertas} em aberto`}
        action={<Button onClick={() => setModal(true)}><IconPlus width={16} height={16} />Nova O.S.</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" placeholder="Buscar nº, setor, requisitante, descrição…" value={busca} onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        </div>
        <div className="w-40">
          <Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as typeof filtroStatus)}>
            <option value="Em Aberto">Em aberto</option>
            <option value="Concluído">Concluídas</option>
            <option value="todas">Todas</option>
          </Select>
        </div>
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-emerald-600" /></div>}
      {data && linhas.length === 0 && <EmptyState title="Nenhuma O.S." description='Abra a primeira em "Nova O.S.".' />}

      {data && linhas.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-medium">Nº</th>
                <th className="px-3 py-3 font-medium">Data</th>
                <th className="px-3 py-3 font-medium">Setor</th>
                <th className="hidden px-3 py-3 font-medium md:table-cell">Tipo</th>
                <th className="hidden px-3 py-3 font-medium lg:table-cell">Demanda</th>
                <th className="px-3 py-3 font-medium">Descrição</th>
                <th className="px-3 py-3 font-medium">Prioridade</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-medium text-slate-700">{o.numero}</td>
                  <td className="px-3 py-2.5 text-slate-500">{formatarData(o.data)}</td>
                  <td className="px-3 py-2.5 text-slate-600">{o.setor ?? '—'}</td>
                  <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">{o.tipo ?? '—'}</td>
                  <td className="hidden px-3 py-2.5 text-slate-500 lg:table-cell">{o.natureza ?? '—'}</td>
                  <td className="max-w-[280px] px-3 py-2.5 text-slate-600"><span className="line-clamp-1">{o.descricao ?? '—'}</span></td>
                  <td className="px-3 py-2.5">
                    {o.prioridade ? (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORIDADE_OS_PCM_TOM[o.prioridade]}`}>{o.prioridade}</span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${o.status === 'Concluído' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <Link to={`/pcm-os/${o.id}/imprimir`} className="mr-3 inline-flex align-middle text-slate-400 hover:text-slate-700" title="Imprimir O.S.">
                      <IconDoc width={15} height={15} />
                    </Link>
                    {o.status === 'Em Aberto' && (
                      <button onClick={() => setConcluindo(o)} className="mr-3 text-xs font-medium text-emerald-600 hover:text-emerald-700">Concluir</button>
                    )}
                    <button onClick={() => void remover(o.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {modal && (
        <ModalNovaOs setores={data?.setores ?? []} onClose={() => setModal(false)}
          onSaved={() => { setModal(false); rec(); }} sucesso={sucesso} erro={erro} />
      )}
      {concluindo && (
        <ModalConcluirOs os={concluindo} colaboradores={data?.colaboradores ?? []}
          onClose={() => setConcluindo(null)} onSaved={() => { setConcluindo(null); rec(); }} sucesso={sucesso} erro={erro} />
      )}
    </>
  );
}

type ToastFn = (m: string) => void;

// ── Nova O.S. (com paradas de equipamento/produção) ────────────
function ModalNovaOs({ setores, onClose, onSaved, sucesso, erro }: {
  setores: string[]; onClose: () => void; onSaved: () => void; sucesso: ToastFn; erro: ToastFn;
}) {
  const [salvando, setSalvando] = useState(false);
  const [paradaEquip, setParadaEquip] = useState(false);
  const [paradaProd, setParadaProd] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const txt = (k: string) => String(f.get(k) ?? '').trim() || null;
    setSalvando(true);
    try {
      await criarOrdemPcm({
        data: String(f.get('data') ?? new Date().toISOString().slice(0, 10)),
        hora: txt('hora'),
        req: txt('req'),
        setor: txt('setor'),
        tipo: (txt('tipo') as never) ?? null,
        natureza: (txt('natureza') as never) ?? null,
        prioridade: (txt('prioridade') as never) ?? null,
        descricao: txt('descricao'),
        data_prog: txt('data_prog'),
        parada_equip: paradaEquip,
        parada_equip_ini: paradaEquip ? txt('pe_ini') : null,
        parada_equip_ini_h: paradaEquip ? txt('pe_ini_h') : null,
        parada_equip_ret: paradaEquip ? txt('pe_ret') : null,
        parada_equip_ret_h: paradaEquip ? txt('pe_ret_h') : null,
        parada_prod: paradaProd,
        parada_prod_ini: paradaProd ? txt('pp_ini') : null,
        parada_prod_ini_h: paradaProd ? txt('pp_ini_h') : null,
        parada_prod_ret: paradaProd ? txt('pp_ret') : null,
        parada_prod_ret_h: paradaProd ? txt('pp_ret_h') : null,
      });
      sucesso('O.S. aberta.'); onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title="Nova Ordem de Serviço" size="xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Data"><TextInput name="data" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Field>
          <Field label="Hora"><TextInput name="hora" type="time" /></Field>
          <Field label="Requisitante"><TextInput name="req" placeholder="—" /></Field>
          <Field label="Setor">
            <Select name="setor" defaultValue="">
              <option value="">—</option>
              {setores.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Tipo">
            <Select name="tipo" defaultValue="Corretiva">{TIPO_OS_PCM.map((t) => <option key={t} value={t}>{t}</option>)}</Select>
          </Field>
          <Field label="Demanda">
            <Select name="natureza" defaultValue="Mecânica">{NATUREZA_OS.map((n) => <option key={n} value={n}>{n}</option>)}</Select>
          </Field>
          <Field label="Prioridade">
            <Select name="prioridade" defaultValue="Normal">{PRIORIDADE_OS_PCM.map((p) => <option key={p} value={p}>{p}</option>)}</Select>
          </Field>
          <Field label="Data programada"><TextInput name="data_prog" type="date" /></Field>
        </div>
        <Field label="Descrição do serviço"><TextInput name="descricao" required placeholder="O que precisa ser feito" /></Field>

        {/* Paradas */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={paradaEquip} onChange={(e) => setParadaEquip(e.target.checked)} className="accent-emerald-600" />
              Parada de equipamento
            </label>
            {paradaEquip && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Field label="Início"><TextInput name="pe_ini" type="date" /></Field>
                <Field label="Hora"><TextInput name="pe_ini_h" type="time" /></Field>
                <Field label="Retorno"><TextInput name="pe_ret" type="date" /></Field>
                <Field label="Hora"><TextInput name="pe_ret_h" type="time" /></Field>
              </div>
            )}
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={paradaProd} onChange={(e) => setParadaProd(e.target.checked)} className="accent-emerald-600" />
              Parada de produção
            </label>
            {paradaProd && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Field label="Início"><TextInput name="pp_ini" type="date" /></Field>
                <Field label="Hora"><TextInput name="pp_ini_h" type="time" /></Field>
                <Field label="Retorno"><TextInput name="pp_ret" type="date" /></Field>
                <Field label="Hora"><TextInput name="pp_ret_h" type="time" /></Field>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Abrir O.S.</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Conclusão com checklist de execução (multi-mantenedor) ─────
interface LinhaExec {
  mantenedor: string;
  data_exec: string;
  hora_ini: string;
  data_fim: string;
  hora_fim: string;
}

function ModalConcluirOs({ os, colaboradores, onClose, onSaved, sucesso, erro }: {
  os: OrdemPcm; colaboradores: ColaboradorPcm[];
  onClose: () => void; onSaved: () => void; sucesso: ToastFn; erro: ToastFn;
}) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [linhas, setLinhas] = useState<LinhaExec[]>([
    { mantenedor: '', data_exec: hoje, hora_ini: '', data_fim: hoje, hora_fim: '' },
  ]);
  const [realizado, setRealizado] = useState('');
  const [salvando, setSalvando] = useState(false);

  function mudar(i: number, campo: keyof LinhaExec, v: string) {
    setLinhas((ls) => ls.map((l, x) => (x === i ? { ...l, [campo]: v } : l)));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validas = linhas.filter((l) => l.mantenedor.trim());
    setSalvando(true);
    try {
      const execs: NovaOsExecucao[] = validas.map((l) => ({
        mantenedor: l.mantenedor.trim(),
        data_exec: l.data_exec || null,
        hora_ini: l.hora_ini || null,
        data_fim: l.data_fim || null,
        hora_fim: l.hora_fim || null,
        data_fech: hoje,
      }));
      await salvarExecucoesDaOs(os.id, execs);
      await atualizarOrdemPcm(os.id, {
        status: 'Concluído',
        realizado: realizado.trim() || null,
        exec: validas.map((l) => l.mantenedor.trim()).join(' / ') || null,
      });
      sucesso(`O.S. #${os.numero} concluída.`); onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={`Concluir O.S. #${os.numero}`} size="xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{os.descricao}</p>
        <Field label="O que foi realizado">
          <TextInput value={realizado} onChange={(e) => setRealizado(e.target.value)} placeholder="Serviço executado" />
        </Field>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Checklist de execução</p>
          <div className="space-y-2">
            {linhas.map((l, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-6">
                <div className="col-span-2">
                  <Field label="Mantenedor">
                    <TextInput list="colaboradores-pcm" value={l.mantenedor} onChange={(e) => mudar(i, 'mantenedor', e.target.value)} placeholder="Nome" />
                  </Field>
                </div>
                <Field label="Início"><TextInput type="date" value={l.data_exec} onChange={(e) => mudar(i, 'data_exec', e.target.value)} /></Field>
                <Field label="Hora"><TextInput type="time" value={l.hora_ini} onChange={(e) => mudar(i, 'hora_ini', e.target.value)} /></Field>
                <Field label="Fim"><TextInput type="date" value={l.data_fim} onChange={(e) => mudar(i, 'data_fim', e.target.value)} /></Field>
                <Field label="Hora"><TextInput type="time" value={l.hora_fim} onChange={(e) => mudar(i, 'hora_fim', e.target.value)} /></Field>
              </div>
            ))}
          </div>
          <datalist id="colaboradores-pcm">
            {colaboradores.map((c) => <option key={c.id} value={c.nome} />)}
          </datalist>
          <button type="button" onClick={() => setLinhas((ls) => [...ls, { mantenedor: '', data_exec: hoje, hora_ini: '', data_fim: hoje, hora_fim: '' }])}
            className="mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700">
            + Adicionar mantenedor
          </button>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Concluir O.S.</Button>
        </div>
      </form>
    </Modal>
  );
}
