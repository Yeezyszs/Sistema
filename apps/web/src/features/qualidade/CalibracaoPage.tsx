import { useState, type FormEvent } from 'react';
import {
  listInstrumentos,
  criarInstrumento,
  listCalibracoes,
  criarCalibracao,
  mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, hojeLocalISO } from '../../lib/format';
import {
  TIPO_CALIBRACAO, TIPO_CALIBRACAO_LABEL, situacaoCalibracao, SITUACAO_CALIBRACAO_LABEL,
} from '@sistema/domain';
import type { SituacaoCalibracao, Calibracao } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { IconPlus } from '../../components/icons';
import { useToast } from '../../components/Toast';

const SIT_CLASS: Record<SituacaoCalibracao, string> = {
  vigente: 'bg-emerald-100 text-emerald-700',
  a_vencer: 'bg-amber-100 text-amber-700',
  vencida: 'bg-red-100 text-red-700',
  sem_registro: 'bg-slate-100 text-slate-500',
};

export function CalibracaoPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [modalInstr, setModalInstr] = useState(false);
  const [modalCalib, setModalCalib] = useState(false);
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(async () => {
    const [instrumentos, calibracoes] = await Promise.all([listInstrumentos(), listCalibracoes()]);
    // calibração mais recente por instrumento
    const ultimaPorInstr = new Map<string, Calibracao>();
    for (const c of calibracoes) if (!ultimaPorInstr.has(c.instrumento_id)) ultimaPorInstr.set(c.instrumento_id, c);
    return { instrumentos, calibracoes, instrumentosMap: mapBy(instrumentos, 'id'), ultimaPorInstr };
  }, [recarregar]);

  const rec = () => setRecarregar((n) => n + 1);

  async function onCriarInstr(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const codigo = String(f.get('codigo') ?? '').trim();
    const nome = String(f.get('nome') ?? '').trim();
    if (!codigo || !nome) return;
    try {
      await criarInstrumento({
        codigo, nome,
        faixa: String(f.get('faixa') ?? '').trim() || null,
        criterio_aceitacao: String(f.get('criterio_aceitacao') ?? '').trim() || null,
      });
      sucesso('Instrumento cadastrado.'); setModalInstr(false); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  async function onCriarCalib(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const instrumento_id = String(f.get('instrumento_id') ?? '');
    const calibrado_em = String(f.get('calibrado_em') ?? '').trim();
    if (!instrumento_id || !calibrado_em) return;
    try {
      await criarCalibracao({
        instrumento_id,
        tipo: String(f.get('tipo') ?? 'calibracao') as never,
        calibrado_em,
        valido_ate: String(f.get('valido_ate') ?? '').trim() || null,
        empresa: String(f.get('empresa') ?? '').trim() || null,
        certificado_numero: String(f.get('certificado_numero') ?? '').trim() || null,
        incerteza: String(f.get('incerteza') ?? '').trim() || null,
        conforme: String(f.get('conforme') ?? 'sim') === 'sim',
      });
      sucesso('Calibração registrada.'); setModalCalib(false); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  return (
    <>
      <PageHeader
        title="Calibração"
        subtitle="Instrumentos de medição e controle de validade de calibração"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setModalInstr(true)}>Novo instrumento</Button>
            <Button onClick={() => setModalCalib(true)}><IconPlus width={16} height={16} />Registrar calibração</Button>
          </div>
        }
      />

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-emerald-600" /></div>}

      {data && data.instrumentos.length === 0 && (
        <EmptyState title="Nenhum instrumento" description='Cadastre um instrumento para controlar sua calibração.' />
      )}

      {data && data.instrumentos.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Código</th>
                <th className="px-5 py-3 font-medium">Instrumento</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">Última calibração</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">Válido até</th>
                <th className="px-5 py-3 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.instrumentos.map((inst) => {
                const ultima = data.ultimaPorInstr.get(inst.id);
                const sit = situacaoCalibracao(ultima?.valido_ate ?? null);
                return (
                  <tr key={inst.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{inst.codigo}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{inst.nome}</td>
                    <td className="hidden px-5 py-3 text-slate-500 md:table-cell">{ultima ? formatarData(ultima.calibrado_em) : '—'}</td>
                    <td className="hidden px-5 py-3 text-slate-500 md:table-cell">{ultima?.valido_ate ? formatarData(ultima.valido_ate) : '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SIT_CLASS[sit]}`}>{SITUACAO_CALIBRACAO_LABEL[sit]}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modalInstr} onClose={() => setModalInstr(false)} title="Novo instrumento">
        <form onSubmit={onCriarInstr} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Código"><TextInput name="codigo" placeholder="BL01" required /></Field>
            <Field label="Nome"><TextInput name="nome" placeholder="Balança de ensaque" required /></Field>
          </div>
          <Field label="Faixa de medição"><TextInput name="faixa" placeholder="0 – 50 kg" /></Field>
          <Field label="Critério de aceitação"><TextInput name="criterio_aceitacao" placeholder="± 0,1%" /></Field>
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setModalInstr(false)}>Cancelar</Button><Button type="submit">Cadastrar</Button></div>
        </form>
      </Modal>

      <Modal open={modalCalib} onClose={() => setModalCalib(false)} title="Registrar calibração" size="lg">
        <form onSubmit={onCriarCalib} className="space-y-4">
          <Field label="Instrumento">
            <Select name="instrumento_id" defaultValue="" required>
              <option value="" disabled>Selecione…</option>
              {(data?.instrumentos ?? []).map((i) => <option key={i.id} value={i.id}>{i.codigo} — {i.nome}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Tipo"><Select name="tipo" defaultValue="calibracao">{TIPO_CALIBRACAO.map((t) => <option key={t} value={t}>{TIPO_CALIBRACAO_LABEL[t]}</option>)}</Select></Field>
            <Field label="Calibrado em"><TextInput name="calibrado_em" type="date" required defaultValue={hojeLocalISO()} /></Field>
            <Field label="Válido até"><TextInput name="valido_ate" type="date" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Empresa"><TextInput name="empresa" placeholder="Lab. de calibração" /></Field>
            <Field label="Nº do certificado"><TextInput name="certificado_numero" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Incerteza"><TextInput name="incerteza" placeholder="± 0,02" /></Field>
            <Field label="Conforme?"><Select name="conforme" defaultValue="sim"><option value="sim">Sim</option><option value="nao">Não</option></Select></Field>
          </div>
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setModalCalib(false)}>Cancelar</Button><Button type="submit">Registrar</Button></div>
        </form>
      </Modal>
    </>
  );
}
