import { useState, type FormEvent } from 'react';
import {
  listPphos,
  criarPpho,
  getItensDoChecklist,
  getExecucoesDoChecklist,
  registrarExecucaoChecklist,
  listEquipamentos,
  listFuncionarios,
  mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarDataHora } from '../../lib/format';
import { FREQUENCIA_PPHO, RESPOSTA_CHECKLIST_LABEL, execucaoConforme } from '@sistema/domain';
import type { Ppho, ChecklistItem, RespostaChecklist } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, TextArea, Select, Modal } from '../../components/ui';
import { IconPlus, IconCheck } from '../../components/icons';
import { useToast } from '../../components/Toast';

export function PphoPage() {
  const [aba, setAba] = useState<'fichas' | 'higienizacao'>('higienizacao');
  const [recarregar, setRecarregar] = useState(0);
  const [modalFicha, setModalFicha] = useState(false);

  const { data, loading } = useAsync(async () => {
    const [pphos, equipamentos, funcionarios] = await Promise.all([
      listPphos(),
      listEquipamentos(),
      listFuncionarios(),
    ]);
    return { pphos, equipamentos, equipamentosMap: mapBy(equipamentos, 'id'), funcionarios };
  }, [recarregar]);

  return (
    <>
      <PageHeader
        title="PPHO & Higienização"
        subtitle="Fichas de higienização por equipamento e registro de execução"
        action={
          <Button onClick={() => setModalFicha(true)}>
            <IconPlus width={16} height={16} />
            Nova ficha PPHO
          </Button>
        }
      />

      <div className="mb-5 flex gap-2">
        {([['higienizacao', 'Registrar higienização'], ['fichas', 'Fichas PPHO']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              aba === id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <Spinner className="h-7 w-7 text-emerald-600" />
        </div>
      )}

      {data && aba === 'fichas' && (
        <FichasAba pphos={data.pphos} equipamentosMap={data.equipamentosMap} />
      )}
      {data && aba === 'higienizacao' && (
        <HigienizacaoAba pphos={data.pphos} funcionarios={data.funcionarios} onSaved={() => setRecarregar((n) => n + 1)} />
      )}

      <Modal open={modalFicha} onClose={() => setModalFicha(false)} title="Nova ficha PPHO" size="lg">
        <FormFicha
          equipamentos={data?.equipamentos ?? []}
          onSaved={() => {
            setModalFicha(false);
            setRecarregar((n) => n + 1);
          }}
        />
      </Modal>
    </>
  );
}

// ── Fichas: listagem ───────────────────────────────────────────
function FichasAba({ pphos, equipamentosMap }: { pphos: Ppho[]; equipamentosMap: Map<string, { nome: string }> }) {
  if (pphos.length === 0)
    return (
      <EmptyState
        icon={<IconCheck width={36} height={36} />}
        title="Nenhuma ficha PPHO"
        description='Crie a primeira ficha em "Nova ficha PPHO".'
      />
    );
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="px-5 py-3 font-medium">Código</th>
            <th className="px-5 py-3 font-medium">Nome</th>
            <th className="hidden px-5 py-3 font-medium sm:table-cell">Equipamento</th>
            <th className="hidden px-5 py-3 font-medium md:table-cell">Frequência</th>
            <th className="hidden px-5 py-3 font-medium md:table-cell">Químico</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {pphos.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <td className="px-5 py-3 font-mono text-xs text-slate-500">{p.codigo}</td>
              <td className="px-5 py-3 font-medium text-slate-800">{p.nome}</td>
              <td className="hidden px-5 py-3 text-slate-600 sm:table-cell">
                {p.equipamento_id ? equipamentosMap.get(p.equipamento_id)?.nome ?? '—' : '—'}
              </td>
              <td className="hidden px-5 py-3 text-slate-500 md:table-cell">{p.frequencia ?? '—'}</td>
              <td className="hidden px-5 py-3 text-slate-500 md:table-cell">
                {p.quimico ?? '—'}{p.concentracao ? ` (${p.concentracao})` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// ── Form: criar ficha PPHO ─────────────────────────────────────
function FormFicha({ equipamentos, onSaved }: { equipamentos: { id: string; nome: string }[]; onSaved: () => void }) {
  const [itens, setItens] = useState<string[]>(['', '', '']);
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const codigo = String(form.get('codigo') ?? '').trim();
    const nome = String(form.get('nome') ?? '').trim();
    if (!codigo || !nome) return;
    const itensLimpos = itens.map((i) => i.trim()).filter(Boolean);
    if (itensLimpos.length === 0) {
      erro('Adicione ao menos um item de verificação.');
      return;
    }
    setSalvando(true);
    try {
      await criarPpho(
        {
          codigo,
          nome,
          equipamento_id: String(form.get('equipamento_id') ?? '') || null,
          frequencia: String(form.get('frequencia') ?? '') || null,
          quimico: String(form.get('quimico') ?? '').trim() || null,
          concentracao: String(form.get('concentracao') ?? '').trim() || null,
        },
        itensLimpos,
      );
      sucesso('Ficha PPHO criada.');
      onSaved();
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Código"><TextInput name="codigo" placeholder="PPHO-EXT-001" required /></Field>
        <Field label="Frequência">
          <Select name="frequencia" defaultValue="">
            <option value="">—</option>
            {FREQUENCIA_PPHO.map((f) => <option key={f} value={f}>{f}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Nome / equipamento ou área"><TextInput name="nome" placeholder="Higienização das roscas" required /></Field>
      <Field label="Equipamento">
        <Select name="equipamento_id" defaultValue="">
          <option value="">— não vinculado —</option>
          {equipamentos.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Produto químico"><TextInput name="quimico" placeholder="Detergente alcalino clorado" /></Field>
        <Field label="Concentração"><TextInput name="concentracao" placeholder="2%" /></Field>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Itens de verificação</p>
        <div className="space-y-2">
          {itens.map((it, i) => (
            <TextInput
              key={i}
              value={it}
              onChange={(e) => setItens((p) => p.map((x, idx) => (idx === i ? e.target.value : x)))}
              placeholder={`Item ${i + 1} (ex.: remoção de resíduos)`}
            />
          ))}
        </div>
        <button type="button" onClick={() => setItens((p) => [...p, ''])} className="mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700">
          + Adicionar item
        </button>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
        <Button type="submit" loading={salvando}>Criar ficha</Button>
      </div>
    </form>
  );
}

// ── Higienização: executar checklist de uma ficha ──────────────
function HigienizacaoAba({
  pphos, funcionarios, onSaved,
}: {
  pphos: Ppho[]; funcionarios: { id: string; nome: string }[]; onSaved: () => void;
}) {
  const [pphoId, setPphoId] = useState('');
  const ppho = pphos.find((p) => p.id === pphoId);

  const { data: itens } = useAsync(
    async () => (ppho ? getItensDoChecklist(ppho.checklist_id) : null),
    [ppho?.checklist_id ?? ''],
  );
  const { data: execucoes } = useAsync(
    async () => (ppho ? getExecucoesDoChecklist(ppho.checklist_id) : null),
    [ppho?.checklist_id ?? '', pphoId],
  );

  if (pphos.length === 0)
    return <EmptyState title="Nenhuma ficha PPHO" description="Crie uma ficha antes de registrar a higienização." />;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="p-6 lg:col-span-3">
        <Field label="Ficha PPHO">
          <Select value={pphoId} onChange={(e) => setPphoId(e.target.value)}>
            <option value="">Selecione…</option>
            {pphos.map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>)}
          </Select>
        </Field>
        {ppho && itens && (
          <ExecForm ppho={ppho} itens={itens} funcionarios={funcionarios} onSaved={onSaved} />
        )}
      </Card>

      <div className="lg:col-span-2">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Histórico</h2>
        {!ppho ? (
          <Card className="p-4 text-sm text-slate-400">Selecione uma ficha.</Card>
        ) : !execucoes ? (
          <Spinner className="h-5 w-5 text-emerald-600" />
        ) : execucoes.length === 0 ? (
          <Card className="p-4 text-sm text-slate-400">Nenhuma higienização registrada.</Card>
        ) : (
          <div className="space-y-2">
            {execucoes.map((ex) => (
              <Card key={ex.id} className="flex items-center justify-between p-3">
                <span className="text-sm text-slate-600">{formatarDataHora(ex.registrado_em)}</span>
                <span className={`text-xs font-semibold ${ex.conforme ? 'text-emerald-600' : 'text-red-600'}`}>
                  {ex.conforme ? 'Conforme' : 'Não conforme'}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExecForm({
  ppho, itens, funcionarios, onSaved,
}: {
  ppho: Ppho; itens: ChecklistItem[]; funcionarios: { id: string; nome: string }[]; onSaved: () => void;
}) {
  const [respostas, setRespostas] = useState<Record<string, RespostaChecklist>>({});
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  function resp(itemId: string): RespostaChecklist {
    return respostas[itemId] ?? 'conforme';
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const linhas = itens.map((it, i) => ({ item: it.item, resposta: resp(it.id), ordem: i }));
    const conforme = execucaoConforme(linhas);
    setSalvando(true);
    try {
      await registrarExecucaoChecklist(
        {
          checklist_id: ppho.checklist_id,
          contexto: 'ppho',
          turno: String(form.get('turno') ?? '').trim() || null,
          executor_id: String(form.get('executor_id') ?? '') || null,
          conforme,
          observacao: String(form.get('observacao') ?? '').trim() || null,
        },
        linhas,
      );
      sucesso(conforme ? 'Higienização registrada (conforme).' : 'Higienização registrada — há itens não conformes.');
      setRespostas({});
      onSaved();
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4 border-t border-slate-100 pt-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Responsável">
          <Select name="executor_id" defaultValue="">
            <option value="">—</option>
            {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </Select>
        </Field>
        <Field label="Turno"><TextInput name="turno" placeholder="1º / 2º" /></Field>
      </div>

      <div className="space-y-2">
        {itens.map((it) => (
          <div key={it.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
            <span className="text-sm text-slate-700">{it.item}</span>
            <div className="flex shrink-0 gap-1">
              {(['conforme', 'nao_conforme', 'na'] as RespostaChecklist[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRespostas((p) => ({ ...p, [it.id]: r }))}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                    resp(it.id) === r
                      ? r === 'conforme' ? 'bg-emerald-600 text-white' : r === 'nao_conforme' ? 'bg-red-600 text-white' : 'bg-slate-500 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {RESPOSTA_CHECKLIST_LABEL[r]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Field label="Observação"><TextInput name="observacao" placeholder="—" /></Field>
      <Button type="submit" loading={salvando} className="w-full">Registrar higienização</Button>
    </form>
  );
}
