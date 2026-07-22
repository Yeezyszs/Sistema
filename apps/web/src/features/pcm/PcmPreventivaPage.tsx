import { useState, type FormEvent } from 'react';
import {
  listPreventivaPcm, listEquipamentosPcm, listColaboradoresPcm,
  criarPreventivaPcm, atualizarPreventivaPcm, excluirPreventivaPcm,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, hojeLocalISO } from '../../lib/format';
import { TRIMESTRE_PCM } from '@sistema/domain';
import type { PreventivaPcm, TrimestrePcm, ColaboradorPcm } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { IconPlus, IconSearch } from '../../components/icons';
import { useToast } from '../../components/Toast';

export function PcmPreventivaPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<PreventivaPcm | null>(null);
  const [realizando, setRealizando] = useState<PreventivaPcm | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroTri, setFiltroTri] = useState<'todos' | TrimestrePcm>('todos');
  const [filtroSit, setFiltroSit] = useState<'todas' | 'pendentes' | 'realizadas'>('pendentes');
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(async () => {
    const [preventivas, equipamentos, colaboradores] = await Promise.all([
      listPreventivaPcm(), listEquipamentosPcm(), listColaboradoresPcm(),
    ]);
    return { preventivas, equipamentos, colaboradores };
  }, [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  const linhas = (data?.preventivas ?? []).filter((p) => {
    if (filtroTri !== 'todos' && p.trimestre !== filtroTri) return false;
    if (filtroSit === 'pendentes' && p.realizada) return false;
    if (filtroSit === 'realizadas' && !p.realizada) return false;
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return [p.equip, p.comp, p.exec ?? ''].some((v) => v.toLowerCase().includes(q));
  });

  const pendentes = (data?.preventivas ?? []).filter((p) => !p.realizada).length;

  async function remover(id: string) {
    try { await excluirPreventivaPcm(id); sucesso('Preventiva removida.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  return (
    <>
      <PageHeader
        title="Manutenção Preventiva"
        subtitle={`Plano trimestral por componente — ${pendentes} pendente(s)`}
        action={<Button onClick={() => setModal(true)}><IconPlus width={16} height={16} />Nova preventiva</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" placeholder="Buscar equipamento, componente, executor…" value={busca} onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </div>
        <div className="w-36">
          <Select value={filtroTri} onChange={(e) => setFiltroTri(e.target.value as typeof filtroTri)}>
            <option value="todos">Trimestres</option>
            {TRIMESTRE_PCM.map((t) => <option key={t} value={t}>{t} trimestre</option>)}
          </Select>
        </div>
        <div className="w-36">
          <Select value={filtroSit} onChange={(e) => setFiltroSit(e.target.value as typeof filtroSit)}>
            <option value="pendentes">Pendentes</option>
            <option value="realizadas">Realizadas</option>
            <option value="todas">Todas</option>
          </Select>
        </div>
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}
      {data && linhas.length === 0 && <EmptyState title="Nenhuma preventiva" description="Ajuste os filtros ou cadastre uma nova." />}

      {data && linhas.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-medium">Trim.</th>
                <th className="px-3 py-3 font-medium">Equipamento</th>
                <th className="px-3 py-3 font-medium">Componente</th>
                <th className="px-3 py-3 font-medium">Planejada</th>
                <th className="px-3 py-3 font-medium">Realizada</th>
                <th className="hidden px-3 py-3 font-medium md:table-cell">Executores</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map((p) => {
                const atrasada = !p.realizada && p.planejada && new Date(`${p.planejada}T00:00:00`) < new Date();
                return (
                  <tr key={p.id} className={`hover:bg-slate-50 ${atrasada ? 'bg-red-50/40' : ''}`}>
                    <td className="px-3 py-2.5 font-medium text-slate-600">{p.trimestre ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-700"><span className="line-clamp-1">{p.equip}</span></td>
                    <td className="max-w-[280px] px-3 py-2.5 text-slate-600"><span className="line-clamp-1">{p.comp}</span></td>
                    <td className={`px-3 py-2.5 ${atrasada ? 'font-medium text-red-600' : 'text-slate-500'}`}>{p.planejada ? formatarData(p.planejada) : '—'}</td>
                    <td className="px-3 py-2.5">
                      {p.realizada
                        ? <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">{formatarData(p.realizada)}</span>
                        : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Pendente</span>}
                    </td>
                    <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">{p.exec ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <button onClick={() => setEditando(p)} className="mr-3 text-xs font-medium text-slate-500 hover:text-brand-600">Editar</button>
                      {!p.realizada && (
                        <button onClick={() => setRealizando(p)} className="mr-3 text-xs font-medium text-brand-600 hover:text-brand-700">Realizar</button>
                      )}
                      <button onClick={() => void remover(p.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {(modal || editando) && (
        <ModalNovaPreventiva
          equipamentos={[...new Set((data?.equipamentos ?? []).map((e) => e.nome))]}
          editando={editando}
          onClose={() => { setModal(false); setEditando(null); }}
          onSaved={() => { setModal(false); setEditando(null); rec(); }} sucesso={sucesso} erro={erro}
        />
      )}
      {realizando && (
        <ModalRealizar preventiva={realizando} colaboradores={data?.colaboradores ?? []}
          onClose={() => setRealizando(null)} onSaved={() => { setRealizando(null); rec(); }} sucesso={sucesso} erro={erro} />
      )}
    </>
  );
}

type ToastFn = (m: string) => void;

function ModalNovaPreventiva({ equipamentos, editando, onClose, onSaved, sucesso, erro }: {
  equipamentos: string[]; editando?: PreventivaPcm | null;
  onClose: () => void; onSaved: () => void; sucesso: ToastFn; erro: ToastFn;
}) {
  const [salvando, setSalvando] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSalvando(true);
    try {
      const payload = {
        equip: String(f.get('equip') ?? '').trim(),
        comp: String(f.get('comp') ?? '').trim(),
        trimestre: (String(f.get('trimestre') ?? '') || null) as never,
        planejada: String(f.get('planejada') ?? '') || null,
      };
      if (editando) await atualizarPreventivaPcm(editando.id, payload);
      else await criarPreventivaPcm(payload);
      sucesso(editando ? 'Preventiva atualizada.' : 'Preventiva cadastrada.'); onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }
  return (
    <Modal open onClose={onClose} title={editando ? "Editar preventiva" : "Nova preventiva"} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Equipamento">
          <TextInput name="equip" list="equips-pcm" defaultValue={editando?.equip ?? ''} required placeholder="Nome do equipamento" />
          <datalist id="equips-pcm">{equipamentos.map((e) => <option key={e} value={e} />)}</datalist>
        </Field>
        <Field label="Componente"><TextInput name="comp" defaultValue={editando?.comp ?? ''} required placeholder="Ex.: 02 - MANCAIS F 215" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Trimestre">
            <Select name="trimestre" defaultValue={editando?.trimestre ?? ""}>
              <option value="">—</option>
              {TRIMESTRE_PCM.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Data planejada"><TextInput name="planejada" type="date" defaultValue={editando?.planejada ?? ''} /></Field>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>{editando ? "Salvar" : "Cadastrar"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ModalRealizar({ preventiva, colaboradores, onClose, onSaved, sucesso, erro }: {
  preventiva: PreventivaPcm; colaboradores: ColaboradorPcm[];
  onClose: () => void; onSaved: () => void; sucesso: ToastFn; erro: ToastFn;
}) {
  const [salvando, setSalvando] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSalvando(true);
    try {
      await atualizarPreventivaPcm(preventiva.id, {
        realizada: String(f.get('realizada') ?? hojeLocalISO()),
        exec: String(f.get('exec') ?? '').trim() || null,
      });
      sucesso('Preventiva realizada.'); onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }
  return (
    <Modal open onClose={onClose} title="Registrar realização">
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{preventiva.equip} · {preventiva.comp}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data realizada"><TextInput name="realizada" type="date" defaultValue={hojeLocalISO()} required /></Field>
          <Field label="Executores">
            <TextInput name="exec" list="colabs-prev" placeholder="Valmir / Luan" />
            <datalist id="colabs-prev">{colaboradores.map((c) => <option key={c.id} value={c.nome} />)}</datalist>
          </Field>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Registrar</Button>
        </div>
      </form>
    </Modal>
  );
}
