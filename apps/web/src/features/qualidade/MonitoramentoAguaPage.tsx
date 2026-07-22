import { useState, type FormEvent } from 'react';
import {
  listMonitoramentosAgua, criarMonitoramentoAgua, atualizarMonitoramentoAgua, excluirMonitoramentoAgua,
} from '../../lib/db';
import type { MonitoramentoAgua } from '@sistema/domain';
import { useAsync } from '../../lib/useAsync';
import { formatarData, hojeLocalISO } from '../../lib/format';
import {
  aguaConforme, AGUA_CLORO_MIN, AGUA_CLORO_MAX, AGUA_PH_MIN, AGUA_PH_MAX,
} from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Modal } from '../../components/ui';
import { IconPlus } from '../../components/icons';
import { useToast } from '../../components/Toast';

export function MonitoramentoAguaPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<MonitoramentoAgua | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [cloro, setCloro] = useState('');
  const [ph, setPh] = useState('');
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(() => listMonitoramentosAgua(), [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  const preConforme = aguaConforme(cloro ? Number(cloro) : null, ph ? Number(ph) : null);

  async function onCriar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSalvando(true);
    try {
      const payload = {
        data: String(f.get('data') ?? hojeLocalISO()),
        hora: String(f.get('hora') ?? '') || null,
        ponto_coleta: String(f.get('ponto_coleta') ?? '').trim() || null,
        cloro_ppm: cloro ? Number(cloro) : null,
        ph: ph ? Number(ph) : null,
        aspecto: String(f.get('aspecto') ?? '').trim() || null,
        responsavel: String(f.get('responsavel') ?? '').trim() || null,
        validado_por: String(f.get('validado_por') ?? '').trim() || null,
        observacao: String(f.get('observacao') ?? '').trim() || null,
      };
      if (editando) await atualizarMonitoramentoAgua(editando.id, payload);
      else await criarMonitoramentoAgua(payload);
      sucesso(editando ? 'Medição atualizada.' : 'Medição registrada.');
      setModal(false); setEditando(null); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  async function remover(id: string) {
    try { await excluirMonitoramentoAgua(id); sucesso('Registro excluído.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  function abrir() { setCloro(''); setPh(''); setEditando(null); setModal(true); }

  function abrirEdicao(m: MonitoramentoAgua) {
    setCloro(m.cloro_ppm != null ? String(m.cloro_ppm) : '');
    setPh(m.ph != null ? String(m.ph) : '');
    setEditando(m); setModal(true);
  }

  return (
    <>
      <PageHeader
        title="Monitoramento de Cloro & pH"
        subtitle={`Água — cloro ${AGUA_CLORO_MIN}–${AGUA_CLORO_MAX} ppm · pH ${AGUA_PH_MIN}–${AGUA_PH_MAX} · 1x ao dia`}
        action={<Button onClick={abrir}><IconPlus width={16} height={16} />Nova medição</Button>}
      />

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}
      {data && data.length === 0 && (
        <EmptyState title="Sem medições" description='Registre a primeira em "Nova medição".' />
      )}

      {data && data.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-medium">Data</th>
                <th className="hidden px-3 py-3 font-medium sm:table-cell">Hora</th>
                <th className="px-3 py-3 font-medium">Ponto</th>
                <th className="px-3 py-3 font-medium text-right">Cloro (ppm)</th>
                <th className="px-3 py-3 font-medium text-right">pH</th>
                <th className="hidden px-3 py-3 font-medium md:table-cell">Aspecto</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="hidden px-3 py-3 font-medium lg:table-cell">Validação QA</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((m) => {
                const cloroFora = m.cloro_ppm != null && (m.cloro_ppm < AGUA_CLORO_MIN || m.cloro_ppm > AGUA_CLORO_MAX);
                const phFora = m.ph != null && (m.ph < AGUA_PH_MIN || m.ph > AGUA_PH_MAX);
                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-slate-600">{formatarData(m.data)}</td>
                    <td className="hidden px-3 py-2.5 text-slate-500 sm:table-cell">{m.hora?.slice(0, 5) ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{m.ponto_coleta ?? '—'}</td>
                    <td className={`px-3 py-2.5 text-right font-medium ${cloroFora ? 'text-red-600' : 'text-slate-700'}`}>{m.cloro_ppm ?? '—'}</td>
                    <td className={`px-3 py-2.5 text-right font-medium ${phFora ? 'text-red-600' : 'text-slate-700'}`}>{m.ph ?? '—'}</td>
                    <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">{m.aspecto ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.conforme ? 'bg-brand-100 text-brand-700' : 'bg-red-100 text-red-700'}`}>
                        {m.conforme ? 'Conforme' : 'Não conforme'}
                      </span>
                    </td>
                    <td className="hidden px-3 py-2.5 text-slate-500 lg:table-cell">{m.validado_por ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <button onClick={() => abrirEdicao(m)} className="mr-3 text-xs font-medium text-slate-500 hover:text-brand-600">Editar</button>
                      <button onClick={() => void remover(m.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modal} onClose={() => { setModal(false); setEditando(null); }} title={editando ? "Editar medição" : "Nova medição de água"} size="lg">
        <form onSubmit={onCriar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Data"><TextInput name="data" type="date" defaultValue={editando?.data ?? hojeLocalISO()} required /></Field>
            <Field label="Hora"><TextInput name="hora" type="time" defaultValue={editando?.hora?.slice(0, 5) ?? ''} /></Field>
            <Field label="Ponto de coleta"><TextInput name="ponto_coleta" defaultValue={editando?.ponto_coleta ?? "Laboratório"} /></Field>
            <Field label="Aspecto"><TextInput name="aspecto" defaultValue={editando?.aspecto ?? ''} placeholder="Incolor" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Cloro residual (ppm) — ${AGUA_CLORO_MIN} a ${AGUA_CLORO_MAX}`}>
              <TextInput type="number" step="any" value={cloro} onChange={(e) => setCloro(e.target.value)} placeholder="0,0" />
            </Field>
            <Field label={`pH — ${AGUA_PH_MIN} a ${AGUA_PH_MAX}`}>
              <TextInput type="number" step="any" value={ph} onChange={(e) => setPh(e.target.value)} placeholder="0,0" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Responsável"><TextInput name="responsavel" defaultValue={editando?.responsavel ?? ''} placeholder="—" /></Field>
            <Field label="Validação da Qualidade"><TextInput name="validado_por" defaultValue={editando?.validado_por ?? ''} placeholder="—" /></Field>
          </div>
          <Field label="Observação"><TextInput name="observacao" defaultValue={editando?.observacao ?? ''} placeholder="—" /></Field>
          <div className={`rounded-lg px-3 py-2 text-sm font-medium ${preConforme ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-700'}`}>
            {preConforme ? 'Dentro dos padrões.' : 'Fora do padrão — comunique a Qualidade imediatamente.'}
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => { setModal(false); setEditando(null); }}>Cancelar</Button>
            <Button type="submit" loading={salvando}>Registrar</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
