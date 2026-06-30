import { useState, type FormEvent } from 'react';
import {
  listInspecoesRecebimento, garantirChecklist, registrarExecucaoChecklist, registrarInspecaoRecebimento,
  listHomologacoes, criarHomologacao,
  listFornecedores, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarDataHora } from '../../lib/format';
import {
  TIPO_INSPECAO, TIPO_INSPECAO_LABEL, ITENS_INSPECAO,
  STATUS_HOMOLOGACAO_LABEL, STATUS_HOMOLOGACAO_TOM, classificarFornecedor, execucaoConforme,
} from '@sistema/domain';
import type { TipoInspecao, RespostaChecklist, ChecklistItem } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { IconPlus } from '../../components/icons';
import { useToast } from '../../components/Toast';

const TOM_CLASS: Record<string, string> = {
  alerta: 'bg-amber-100 text-amber-700', sucesso: 'bg-emerald-100 text-emerald-700', erro: 'bg-red-100 text-red-700',
};

export function FornecedoresPage() {
  const [aba, setAba] = useState<'inspecoes' | 'homologacao'>('inspecoes');
  const [recarregar, setRecarregar] = useState(0);
  const [modalInsp, setModalInsp] = useState(false);
  const [modalHom, setModalHom] = useState(false);

  const { data, loading } = useAsync(async () => {
    const [inspecoes, homologacoes, fornecedores] = await Promise.all([
      listInspecoesRecebimento(), listHomologacoes(), listFornecedores(),
    ]);
    return { inspecoes, homologacoes, fornecedores, fornecedoresMap: mapBy(fornecedores, 'id') };
  }, [recarregar]);

  const rec = () => setRecarregar((n) => n + 1);

  return (
    <>
      <PageHeader
        title="Fornecedores & Recebimento"
        subtitle="Inspeção de matéria-prima e homologação de fornecedores"
        action={
          <Button onClick={() => (aba === 'inspecoes' ? setModalInsp(true) : setModalHom(true))}>
            <IconPlus width={16} height={16} />{aba === 'inspecoes' ? 'Nova inspeção' : 'Nova homologação'}
          </Button>
        }
      />

      <div className="mb-5 flex gap-2">
        {([['inspecoes', 'Inspeções de recebimento'], ['homologacao', 'Homologação']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${aba === id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-emerald-600" /></div>}

      {data && aba === 'inspecoes' && (
        data.inspecoes.length === 0 ? (
          <EmptyState title="Nenhuma inspeção" description='Registre a inspeção de uma carga em "Nova inspeção".' />
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">Fornecedor</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">Variedade / placa</th>
                  <th className="px-5 py-3 font-medium">Quando</th>
                  <th className="px-5 py-3 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.inspecoes.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-700">{TIPO_INSPECAO_LABEL[i.tipo]}</td>
                    <td className="hidden px-5 py-3 text-slate-500 sm:table-cell">{i.fornecedor_id ? data.fornecedoresMap.get(i.fornecedor_id)?.razao_social ?? '—' : '—'}</td>
                    <td className="hidden px-5 py-3 text-slate-500 md:table-cell">{[i.variedade, i.placa].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{formatarDataHora(i.inspecionado_em)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold ${i.conforme ? 'text-emerald-600' : 'text-red-600'}`}>{i.conforme ? 'Conforme' : 'Não conforme'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}

      {data && aba === 'homologacao' && (
        <div className="space-y-3">
          {data.fornecedores.length === 0 && <EmptyState title="Nenhum fornecedor cadastrado" />}
          {data.fornecedores.map((f) => {
            const hist = data.homologacoes.filter((h) => h.fornecedor_id === f.id);
            const atual = hist[0];
            return (
              <Card key={f.id} className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{f.razao_social}</span>
                      {f.homologado && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Homologado</span>}
                    </div>
                    {atual ? (
                      <p className="mt-1 text-xs text-slate-400">
                        <span className={`rounded-full px-2 py-0.5 font-medium ${TOM_CLASS[STATUS_HOMOLOGACAO_TOM[atual.status]]}`}>{STATUS_HOMOLOGACAO_LABEL[atual.status]}</span>
                        {atual.classificacao ? ` · Classe ${atual.classificacao}` : ''}{atual.pontuacao != null ? ` · ${atual.pontuacao} pts` : ''}
                        {atual.validade ? ` · validade ${formatarData(atual.validade)}` : ''}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-400">Sem homologação registrada</p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {modalInsp && <ModalInspecao fornecedores={data?.fornecedores ?? []} onClose={() => setModalInsp(false)} onSaved={rec} />}

      <Modal open={modalHom} onClose={() => setModalHom(false)} title="Nova homologação" size="lg">
        <FormHomologacao fornecedores={data?.fornecedores ?? []} onClose={() => setModalHom(false)} onSaved={rec} />
      </Modal>
    </>
  );
}

// ── Inspeção: usa o motor de checklist ─────────────────────────
function ModalInspecao({
  fornecedores, onClose, onSaved,
}: {
  fornecedores: { id: string; razao_social: string }[]; onClose: () => void; onSaved: () => void;
}) {
  const [tipo, setTipo] = useState<TipoInspecao>('mp');
  const [respostas, setRespostas] = useState<Record<string, RespostaChecklist>>({});
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  const { data: cl } = useAsync(
    async () => garantirChecklist(`inspecao_${tipo}`, `Inspeção de ${TIPO_INSPECAO_LABEL[tipo]}`, ITENS_INSPECAO[tipo]),
    [tipo],
  );
  const itens: ChecklistItem[] = cl?.itens ?? [];
  const resp = (id: string): RespostaChecklist => respostas[id] ?? 'conforme';

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cl) return;
    const f = new FormData(e.currentTarget);
    const linhas = itens.map((it, i) => ({ item: it.item, resposta: resp(it.id), ordem: i }));
    const conforme = execucaoConforme(linhas);
    setSalvando(true);
    try {
      const exec = await registrarExecucaoChecklist(
        { checklist_id: cl.checklist.id, contexto: `inspecao_${tipo}`, conforme, observacao: String(f.get('observacao') ?? '').trim() || null },
        linhas,
      );
      await registrarInspecaoRecebimento({
        tipo,
        fornecedor_id: String(f.get('fornecedor_id') ?? '') || null,
        execucao_id: exec.id,
        placa: String(f.get('placa') ?? '').trim() || null,
        ticket: String(f.get('ticket') ?? '').trim() || null,
        variedade: String(f.get('variedade') ?? '').trim() || null,
        conforme,
      });
      sucesso(conforme ? 'Inspeção registrada (conforme).' : 'Inspeção registrada — há itens não conformes.');
      setRespostas({}); onSaved(); onClose();
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha.');
    } finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title="Nova inspeção de recebimento" size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo"><Select value={tipo} onChange={(e) => { setTipo(e.target.value as TipoInspecao); setRespostas({}); }}>{TIPO_INSPECAO.map((t) => <option key={t} value={t}>{TIPO_INSPECAO_LABEL[t]}</option>)}</Select></Field>
          <Field label="Fornecedor / produtor"><Select name="fornecedor_id" defaultValue=""><option value="">—</option>{fornecedores.map((f) => <option key={f.id} value={f.id}>{f.razao_social}</option>)}</Select></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Variedade"><TextInput name="variedade" placeholder="Cascuda" /></Field>
          <Field label="Placa"><TextInput name="placa" placeholder="ABC-1D23" /></Field>
          <Field label="Ticket"><TextInput name="ticket" /></Field>
        </div>

        <div className="space-y-2">
          {itens.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
              <span className="text-sm text-slate-700">{it.item}</span>
              <div className="flex shrink-0 gap-1">
                {(['conforme', 'nao_conforme', 'na'] as RespostaChecklist[]).map((r) => (
                  <button key={r} type="button" onClick={() => setRespostas((p) => ({ ...p, [it.id]: r }))}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition ${resp(it.id) === r ? (r === 'conforme' ? 'bg-emerald-600 text-white' : r === 'nao_conforme' ? 'bg-red-600 text-white' : 'bg-slate-500 text-white') : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    {r === 'conforme' ? 'C' : r === 'nao_conforme' ? 'NC' : 'N/A'}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Field label="Observação"><TextInput name="observacao" placeholder="—" /></Field>
        <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" loading={salvando}>Registrar inspeção</Button></div>
      </form>
    </Modal>
  );
}

// ── Homologação ────────────────────────────────────────────────
function FormHomologacao({
  fornecedores, onClose, onSaved,
}: {
  fornecedores: { id: string; razao_social: string }[]; onClose: () => void; onSaved: () => void;
}) {
  const [nota, setNota] = useState('');
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();
  const calc = nota.trim() ? classificarFornecedor(Number(nota)) : null;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const fornecedor_id = String(f.get('fornecedor_id') ?? '');
    if (!fornecedor_id) return;
    setSalvando(true);
    try {
      await criarHomologacao({
        fornecedor_id,
        status: calc ? calc.status : 'em_analise',
        pontuacao: nota.trim() ? Number(nota) : null,
        classificacao: calc?.letra ?? null,
        validade: String(f.get('validade') ?? '').trim() || null,
        observacao: String(f.get('observacao') ?? '').trim() || null,
      });
      sucesso('Homologação registrada.'); onSaved(); onClose();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Fornecedor">
        <Select name="fornecedor_id" defaultValue="" required>
          <option value="" disabled>Selecione…</option>
          {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.razao_social}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nota (0–100)"><TextInput type="number" min="0" max="100" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="85" /></Field>
        <Field label="Validade"><TextInput name="validade" type="date" /></Field>
      </div>
      {calc && (
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <span className="text-slate-600">Classe <span className="font-semibold text-slate-900">{calc.letra}</span></span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TOM_CLASS[STATUS_HOMOLOGACAO_TOM[calc.status]]}`}>{STATUS_HOMOLOGACAO_LABEL[calc.status]}</span>
        </div>
      )}
      <Field label="Observação"><TextInput name="observacao" placeholder="—" /></Field>
      <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" loading={salvando}>Registrar</Button></div>
    </form>
  );
}
