import { useState, type FormEvent } from 'react';
import {
  listContraprovas, listRetencoes, listClientes,
  criarContraprova, atualizarContraprova, excluirContraprova,
  criarRetencao, atualizarRetencao, excluirRetencao, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, hojeLocalISO } from '../../lib/format';
import { elegivelDescarte, vencimentoContraprova } from '@sistema/domain';
import type { Contraprova, ContraprovaRetencao } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { IconPlus, IconSearch } from '../../components/icons';
import { useToast } from '../../components/Toast';

type Aba = 'caixas' | 'retencao';
type ToastFn = (m: string) => void;

export function ContraprovasPage() {
  const [aba, setAba] = useState<Aba>('caixas');
  const [recarregar, setRecarregar] = useState(0);
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(async () => {
    const [contraprovas, retencoes, clientes] = await Promise.all([
      listContraprovas(), listRetencoes(), listClientes(),
    ]);
    return { contraprovas, retencoes, clientes, clientesMap: mapBy(clientes, 'id'), retencoesMap: mapBy(retencoes, 'id') };
  }, [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  return (
    <>
      <PageHeader title="Contraprovas" subtitle="Amostras de retenção (FOR-PO06)" />
      <div className="mb-5 flex gap-2">
        {([['caixas', 'Caixas'], ['retencao', 'Tempo de retenção']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${aba === id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-emerald-600" /></div>}
      {data && aba === 'caixas' && <AbaCaixas data={data} rec={rec} sucesso={sucesso} erro={erro} />}
      {data && aba === 'retencao' && <AbaRetencao retencoes={data.retencoes} rec={rec} sucesso={sucesso} erro={erro} />}
    </>
  );
}

type DataShape = {
  contraprovas: Contraprova[];
  retencoes: ContraprovaRetencao[];
  clientes: { id: string; nome: string }[];
  clientesMap: Map<string, { nome: string }>;
  retencoesMap: Map<string, ContraprovaRetencao>;
};

function AbaCaixas({ data, rec, sucesso, erro }: { data: DataShape; rec: () => void; sucesso: ToastFn; erro: ToastFn }) {
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Contraprova | null>(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todas' | 'estoque' | 'descarte' | 'descartadas'>('todas');

  const linhas = data.contraprovas.filter((c) => {
    const eleg = elegivelDescarte(c);
    if (filtro === 'estoque' && !c.em_estoque) return false;
    if (filtro === 'descarte' && !eleg) return false;
    if (filtro === 'descartadas' && c.em_estoque) return false;
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    const cli = c.cliente_id ? data.clientesMap.get(c.cliente_id)?.nome ?? '' : '';
    return [cli, c.lotes ?? '', String(c.numero_caixa)].some((v) => v.toLowerCase().includes(q));
  });

  const elegiveis = data.contraprovas.filter((c) => elegivelDescarte(c)).length;

  async function marcarDescarte(c: Contraprova) {
    try { await atualizarContraprova(c.id, { em_estoque: false }); sucesso('Contraprova descartada.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }
  async function remover(id: string) {
    try { await excluirContraprova(id); sucesso('Registro excluído.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  return (
    <>
      {elegiveis > 0 && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700">
          {elegiveis} caixa(s) com prazo vencido — elegíveis a descarte.
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" placeholder="Buscar nº caixa, cliente, lotes…" value={busca} onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        </div>
        <div className="w-48">
          <Select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)}>
            <option value="todas">Todas</option>
            <option value="estoque">Em estoque</option>
            <option value="descarte">Elegíveis a descarte</option>
            <option value="descartadas">Descartadas</option>
          </Select>
        </div>
        <Button onClick={() => setModal(true)}><IconPlus width={16} height={16} />Nova caixa</Button>
      </div>

      {linhas.length === 0 && <EmptyState title="Nenhuma contraprova" description='Registre a primeira em "Nova caixa".' />}

      {linhas.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-medium">Caixa</th>
                <th className="px-3 py-3 font-medium">Lançamento</th>
                <th className="px-3 py-3 font-medium">Cliente</th>
                <th className="hidden px-3 py-3 font-medium lg:table-cell">Lotes</th>
                <th className="hidden px-3 py-3 font-medium md:table-cell">Vence em</th>
                <th className="px-3 py-3 font-medium">Situação</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map((c) => {
                const venc = vencimentoContraprova(c.data_lancamento, c.dias_retencao);
                const eleg = elegivelDescarte(c);
                return (
                  <tr key={c.id} className={`hover:bg-slate-50 ${eleg ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-3 py-2.5 font-semibold text-slate-700">{c.numero_caixa}</td>
                    <td className="px-3 py-2.5 text-slate-500">{formatarData(c.data_lancamento)}</td>
                    <td className="px-3 py-2.5 text-slate-600">{c.cliente_id ? data.clientesMap.get(c.cliente_id)?.nome ?? '—' : '—'}</td>
                    <td className="hidden px-3 py-2.5 text-slate-500 lg:table-cell"><span className="line-clamp-1">{c.lotes ?? '—'}</span></td>
                    <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">{venc ? formatarData(venc.toISOString()) : '—'}</td>
                    <td className="px-3 py-2.5">
                      {!c.em_estoque ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Descartada {c.descartado_em ? `· ${formatarData(c.descartado_em)}` : ''}</span>
                      ) : eleg ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Vencida</span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Em estoque</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <button onClick={() => setEditando(c)} className="mr-3 text-xs font-medium text-slate-500 hover:text-emerald-600">Editar</button>
                      {c.em_estoque && (
                        <button onClick={() => void marcarDescarte(c)} className="mr-3 text-xs font-medium text-amber-600 hover:text-amber-700">Descartar</button>
                      )}
                      <button onClick={() => void remover(c.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {(modal || editando) && (
        <ModalNovaCaixa data={data} editando={editando}
          onClose={() => { setModal(false); setEditando(null); }}
          onSaved={() => { setModal(false); setEditando(null); rec(); }} sucesso={sucesso} erro={erro} />
      )}
    </>
  );
}

function ModalNovaCaixa({ data, editando, onClose, onSaved, sucesso, erro }: {
  data: DataShape; editando?: Contraprova | null;
  onClose: () => void; onSaved: () => void; sucesso: ToastFn; erro: ToastFn;
}) {
  const [retencaoId, setRetencaoId] = useState(editando?.retencao_id ?? '');
  const [salvando, setSalvando] = useState(false);
  const retencao = data.retencoes.find((r) => r.id === retencaoId);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSalvando(true);
    try {
      const payload = {
        data_lancamento: String(f.get('data_lancamento') ?? hojeLocalISO()),
        lotes: String(f.get('lotes') ?? '').trim() || null,
        cliente_id: String(f.get('cliente_id') ?? '') || null,
        retencao_id: retencaoId || null,
        dias_retencao: retencao?.dias ?? null,
        local_estoque: String(f.get('local_estoque') ?? 'Laboratório').trim() || 'Laboratório',
        observacao: String(f.get('observacao') ?? '').trim() || null,
      };
      if (editando) await atualizarContraprova(editando.id, payload);
      else await criarContraprova(payload);
      sucesso(editando ? 'Contraprova atualizada.' : 'Contraprova registrada.'); onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={editando ? `Editar caixa ${editando.numero_caixa}` : "Nova caixa de contraprova"} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data de lançamento"><TextInput name="data_lancamento" type="date" defaultValue={editando?.data_lancamento ?? hojeLocalISO()} required /></Field>
          <Field label="Cliente">
            <Select name="cliente_id" defaultValue={editando?.cliente_id ?? ""}>
              <option value="">—</option>
              {data.clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Lotes"><TextInput name="lotes" defaultValue={editando?.lotes ?? ''} placeholder="MD2147 - MD2248 - ..." /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tempo de retenção">
            <Select value={retencaoId} onChange={(e) => setRetencaoId(e.target.value)}>
              <option value="">— sem prazo</option>
              {data.retencoes.map((r) => <option key={r.id} value={r.id}>{r.rotulo} ({r.dias}d)</option>)}
            </Select>
          </Field>
          <Field label="Local de estoque"><TextInput name="local_estoque" defaultValue={editando?.local_estoque ?? "Laboratório"} /></Field>
        </div>
        {retencao && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Prazo de {retencao.dias} dias — poderá ser descartada após esse período.
          </p>
        )}
        <Field label="Observação"><TextInput name="observacao" defaultValue={editando?.observacao ?? ''} placeholder="—" /></Field>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>{editando ? "Salvar" : "Registrar"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Aba Tempo de retenção ──────────────────────────────────────
function AbaRetencao({ retencoes, rec, sucesso, erro }: { retencoes: ContraprovaRetencao[]; rec: () => void; sucesso: ToastFn; erro: ToastFn }) {
  const [edit, setEdit] = useState<ContraprovaRetencao | null>(null);
  const [novo, setNovo] = useState(false);

  async function remover(id: string) {
    try { await excluirRetencao(id); sucesso('Regra removida.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setNovo(true)}><IconPlus width={16} height={16} />Nova regra</Button>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-3 py-3 font-medium">Cliente / rótulo</th>
              <th className="px-3 py-3 font-medium text-right">Tempo de retenção</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {retencoes.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-3 py-2.5 font-medium text-slate-700">{r.rotulo}</td>
                <td className="px-3 py-2.5 text-right text-slate-600">{r.dias} dias</td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <button onClick={() => setEdit(r)} className="mr-3 text-xs font-medium text-slate-500 hover:text-slate-800">Editar</button>
                  <button onClick={() => void remover(r.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {(novo || edit) && (
        <ModalRetencao retencao={edit} onClose={() => { setNovo(false); setEdit(null); }} onSaved={() => { setNovo(false); setEdit(null); rec(); }} sucesso={sucesso} erro={erro} />
      )}
    </>
  );
}

function ModalRetencao({ retencao, onClose, onSaved, sucesso, erro }: {
  retencao: ContraprovaRetencao | null; onClose: () => void; onSaved: () => void; sucesso: ToastFn; erro: ToastFn;
}) {
  const [salvando, setSalvando] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = { rotulo: String(f.get('rotulo') ?? '').trim(), dias: Number(f.get('dias') ?? 0) };
    setSalvando(true);
    try {
      if (retencao) await atualizarRetencao(retencao.id, payload);
      else await criarRetencao(payload);
      sucesso('Regra salva.'); onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }
  return (
    <Modal open onClose={onClose} title={retencao ? `Editar — ${retencao.rotulo}` : 'Nova regra de retenção'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Cliente / rótulo"><TextInput name="rotulo" defaultValue={retencao?.rotulo ?? ''} required placeholder="General Mills - Crua" /></Field>
        <Field label="Tempo de retenção (dias)"><TextInput name="dias" type="number" min="1" defaultValue={retencao?.dias ?? ''} required placeholder="60" /></Field>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}
