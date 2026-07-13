import { useState, type FormEvent } from 'react';
import {
  listCalibracoesPhmetro, criarCalibracaoPhmetro, excluirCalibracaoPhmetro,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData } from '../../lib/format';
import {
  phmetroConforme, PHMETRO_PH4_MIN, PHMETRO_PH4_MAX, PHMETRO_PH7_MIN, PHMETRO_PH7_MAX,
} from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Modal } from '../../components/ui';
import { IconPlus } from '../../components/icons';
import { useToast } from '../../components/Toast';

export function CalibracaoPhmetroPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [modal, setModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [ph4, setPh4] = useState('');
  const [ph7, setPh7] = useState('');
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(() => listCalibracoesPhmetro(), [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  const preConforme = phmetroConforme(ph4 ? Number(ph4) : null, ph7 ? Number(ph7) : null);

  async function onCriar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSalvando(true);
    try {
      await criarCalibracaoPhmetro({
        data: String(f.get('data') ?? new Date().toISOString().slice(0, 10)),
        hora: String(f.get('hora') ?? '') || null,
        tampao_ph4: ph4 ? Number(ph4) : null,
        tampao_ph7: ph7 ? Number(ph7) : null,
        responsavel: String(f.get('responsavel') ?? '').trim() || null,
        validado_por: String(f.get('validado_por') ?? '').trim() || null,
        observacao: String(f.get('observacao') ?? '').trim() || null,
      });
      sucesso('Calibração registrada.'); setModal(false); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  async function remover(id: string) {
    try { await excluirCalibracaoPhmetro(id); sucesso('Registro excluído.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  function abrir() { setPh4(''); setPh7(''); setModal(true); }

  return (
    <>
      <PageHeader
        title="Calibração do pHmetro"
        subtitle={`Tampão pH4 ${PHMETRO_PH4_MIN}–${PHMETRO_PH4_MAX} · pH7 ${PHMETRO_PH7_MIN}–${PHMETRO_PH7_MAX} · antes de cada análise`}
        action={<Button onClick={abrir}><IconPlus width={16} height={16} />Nova calibração</Button>}
      />

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-emerald-600" /></div>}
      {data && data.length === 0 && (
        <EmptyState title="Sem calibrações" description='Registre a primeira em "Nova calibração".' />
      )}

      {data && data.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-medium">Data</th>
                <th className="hidden px-3 py-3 font-medium sm:table-cell">Hora</th>
                <th className="px-3 py-3 font-medium text-right">Tampão pH 4,0</th>
                <th className="px-3 py-3 font-medium text-right">Tampão pH 7,0</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="hidden px-3 py-3 font-medium md:table-cell">Responsável</th>
                <th className="hidden px-3 py-3 font-medium lg:table-cell">Validação QA</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((c) => {
                const ph4Fora = c.tampao_ph4 != null && (c.tampao_ph4 < PHMETRO_PH4_MIN || c.tampao_ph4 > PHMETRO_PH4_MAX);
                const ph7Fora = c.tampao_ph7 != null && (c.tampao_ph7 < PHMETRO_PH7_MIN || c.tampao_ph7 > PHMETRO_PH7_MAX);
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-slate-600">{formatarData(c.data)}</td>
                    <td className="hidden px-3 py-2.5 text-slate-500 sm:table-cell">{c.hora?.slice(0, 5) ?? '—'}</td>
                    <td className={`px-3 py-2.5 text-right font-medium ${ph4Fora ? 'text-red-600' : 'text-slate-700'}`}>{c.tampao_ph4 ?? '—'}</td>
                    <td className={`px-3 py-2.5 text-right font-medium ${ph7Fora ? 'text-red-600' : 'text-slate-700'}`}>{c.tampao_ph7 ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.conforme ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {c.conforme ? 'Conforme' : 'Não conforme'}
                      </span>
                    </td>
                    <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">{c.responsavel ?? '—'}</td>
                    <td className="hidden px-3 py-2.5 text-slate-500 lg:table-cell">{c.validado_por ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button onClick={() => void remover(c.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Nova calibração do pHmetro" size="lg">
        <form onSubmit={onCriar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data"><TextInput name="data" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Field>
            <Field label="Hora"><TextInput name="hora" type="time" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Tampão pH 4,0 — ${PHMETRO_PH4_MIN} a ${PHMETRO_PH4_MAX}`}>
              <TextInput type="number" step="any" value={ph4} onChange={(e) => setPh4(e.target.value)} placeholder="4,00" />
            </Field>
            <Field label={`Tampão pH 7,0 — ${PHMETRO_PH7_MIN} a ${PHMETRO_PH7_MAX}`}>
              <TextInput type="number" step="any" value={ph7} onChange={(e) => setPh7(e.target.value)} placeholder="6,90" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Responsável"><TextInput name="responsavel" placeholder="—" /></Field>
            <Field label="Validação da Qualidade"><TextInput name="validado_por" placeholder="—" /></Field>
          </div>
          <Field label="Observação"><TextInput name="observacao" placeholder="—" /></Field>
          <div className={`rounded-lg px-3 py-2 text-sm font-medium ${preConforme ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {preConforme ? 'Dentro dos padrões.' : 'Fora do padrão — comunique a Qualidade imediatamente.'}
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={salvando}>Registrar</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
