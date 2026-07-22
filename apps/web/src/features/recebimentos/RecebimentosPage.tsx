import { useState, type FormEvent } from 'react';
import {
  listRecebimentos, listProdutos, listFornecedores,
  criarRecebimento, atualizarRecebimento, excluirRecebimento, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade, hojeLocalISO } from '../../lib/format';
import { TURNO, TURNO_LABEL } from '@sistema/domain';
import type { Turno, Recebimento, NovoRecebimento, Produto, Fornecedor } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { IconRecebimento, IconSearch } from '../../components/icons';
import { useToast } from '../../components/Toast';

// Monta o payload a partir do formulário (usado no cadastro e na edição).
function montarPayload(form: FormData, fornecedores: Fornecedor[]): NovoRecebimento {
  const num = (k: string) => {
    const v = String(form.get(k) ?? '').trim();
    return v ? Number(v) : null;
  };
  const txt = (k: string) => String(form.get(k) ?? '').trim() || null;
  const dataStr = String(form.get('data') ?? '').trim();
  const recebido_em = dataStr ? new Date(`${dataStr}T12:00:00`).toISOString() : new Date().toISOString();
  const produtor = txt('produtor');
  const forn = fornecedores.find((f) => f.razao_social.toLowerCase() === (produtor ?? '').toLowerCase());
  return {
    produto_id: String(form.get('produto_id') ?? ''),
    produtor,
    fornecedor_id: forn?.id ?? null,
    variedade: txt('variedade'),
    turno: txt('turno') as Turno | null,
    ticket: txt('ticket'),
    cancha: txt('cancha'),
    quantidade: num('quantidade'),
    renda: num('renda'),
    hora_inicio: txt('hora_inicio'),
    hora_fim: txt('hora_fim'),
    recebido_em,
  };
}

// Campos do formulário — reutilizados no cadastro e na edição.
function CamposCarga({ materiasPrimas, fornecedores, carga }: {
  materiasPrimas: Produto[]; fornecedores: Fornecedor[]; carga?: Recebimento;
}) {
  const dataDefault = carga?.recebido_em ? carga.recebido_em.slice(0, 10) : hojeLocalISO();
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Turno">
          <Select name="turno" defaultValue={carga?.turno ?? ''}>
            <option value="">—</option>
            {TURNO.map((t) => <option key={t} value={t}>{TURNO_LABEL[t]}</option>)}
          </Select>
        </Field>
        <Field label="Data">
          <TextInput name="data" type="date" defaultValue={dataDefault} />
        </Field>
      </div>
      <Field label="Produto (matéria-prima)">
        <Select name="produto_id" defaultValue={carga?.produto_id ?? ''} required>
          <option value="" disabled>Selecione…</option>
          {materiasPrimas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </Select>
      </Field>
      <Field label="Produtor">
        <TextInput name="produtor" list="produtores" defaultValue={carga?.produtor ?? ''} placeholder="Nome do produtor" />
        <datalist id="produtores">
          {fornecedores.map((f) => <option key={f.id} value={f.razao_social} />)}
        </datalist>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Variedade">
          <TextInput name="variedade" list="variedades" defaultValue={carga?.variedade ?? ''} placeholder="Paraguaia" />
          <datalist id="variedades">
            <option value="Paraguaia" /><option value="Oguçu" /><option value="OJ" /><option value="Cascuda" />
          </datalist>
        </Field>
        <Field label="Ticket">
          <TextInput name="ticket" defaultValue={carga?.ticket ?? ''} placeholder="19474" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Início da descarga">
          <TextInput name="hora_inicio" type="time" defaultValue={carga?.hora_inicio?.slice(0, 5) ?? ''} />
        </Field>
        <Field label="Fim da descarga">
          <TextInput name="hora_fim" type="time" defaultValue={carga?.hora_fim?.slice(0, 5) ?? ''} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Peso (kg)">
          <TextInput name="quantidade" type="number" step="any" min="0" defaultValue={carga?.quantidade ?? ''} placeholder="0" />
        </Field>
        <Field label="Renda">
          <TextInput name="renda" type="number" step="any" min="0" defaultValue={carga?.renda ?? ''} placeholder="618" />
        </Field>
        <Field label="Cancha">
          <Select name="cancha" defaultValue={carga?.cancha ?? ''}>
            <option value="">—</option>
            <option value="1">1</option>
            <option value="2">2</option>
          </Select>
        </Field>
      </div>
    </>
  );
}

export function RecebimentosPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroTurno, setFiltroTurno] = useState<'todos' | Turno>('todos');
  const [editando, setEditando] = useState<Recebimento | null>(null);
  const [excluindo, setExcluindo] = useState<Recebimento | null>(null);
  const { sucesso, erro } = useToast();

  const { data, loading, error } = useAsync(async () => {
    const [recebimentos, produtos, fornecedores] = await Promise.all([
      listRecebimentos(),
      listProdutos(),
      listFornecedores(),
    ]);
    return {
      recebimentos, produtos, fornecedores,
      produtosMap: mapBy(produtos, 'id'),
      fornecedoresMap: mapBy(fornecedores, 'id'),
    };
  }, [recarregar]);

  const materiasPrimas = data?.produtos.filter((p) => p.tipo === 'materia_prima') ?? [];

  function nomeProdutor(r: { produtor: string | null; fornecedor_id: string | null }): string {
    if (r.produtor) return r.produtor;
    return r.fornecedor_id ? data?.fornecedoresMap.get(r.fornecedor_id)?.razao_social ?? '—' : '—';
  }

  const linhas = (data?.recebimentos ?? []).filter((r) => {
    if (filtroTurno !== 'todos' && r.turno !== filtroTurno) return false;
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    const produto = data?.produtosMap.get(r.produto_id)?.nome ?? '';
    return [nomeProdutor(r), produto, r.variedade ?? '', r.ticket ?? ''].some((v) => v.toLowerCase().includes(q));
  });

  async function onCriar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = montarPayload(form, data?.fornecedores ?? []);
    if (!payload.produto_id) { erro('Selecione o produto.'); return; }
    setSalvando(true);
    try {
      await criarRecebimento(payload);
      (e.target as HTMLFormElement).reset();
      sucesso('Carga registrada.');
      setRecarregar((n) => n + 1);
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha ao salvar.'); }
    finally { setSalvando(false); }
  }

  async function onEditar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editando) return;
    const form = new FormData(e.currentTarget);
    const payload = montarPayload(form, data?.fornecedores ?? []);
    if (!payload.produto_id) { erro('Selecione o produto.'); return; }
    setSalvando(true);
    try {
      await atualizarRecebimento(editando.id, payload);
      sucesso('Carga atualizada.');
      setEditando(null);
      setRecarregar((n) => n + 1);
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha ao salvar.'); }
    finally { setSalvando(false); }
  }

  async function onExcluir() {
    if (!excluindo) return;
    setSalvando(true);
    try {
      await excluirRecebimento(excluindo.id);
      sucesso('Carga excluída.');
      setExcluindo(null);
      setRecarregar((n) => n + 1);
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha ao excluir. A carga pode estar vinculada a um lote.');
    } finally { setSalvando(false); }
  }

  return (
    <>
      <PageHeader title="Recebimentos" subtitle="Controle de cargas — entrada de matéria-prima (Descarga)" />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Cadastro */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Nova carga</h2>
          <form onSubmit={onCriar} className="space-y-4">
            <CamposCarga materiasPrimas={materiasPrimas} fornecedores={data?.fornecedores ?? []} />
            <Button type="submit" loading={salvando} className="w-full">Registrar carga</Button>
          </form>
        </Card>

        {/* Lista */}
        <div className="lg:col-span-3">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Buscar produtor, variedade, ticket…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            {(['todos', ...TURNO] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFiltroTurno(t)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  filtroTurno === t ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {t === 'todos' ? 'Todos' : TURNO_LABEL[t]}
              </button>
            ))}
          </div>

          {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}
          {error && <Card className="p-4 text-sm text-red-600">Erro: {error}</Card>}
          {data && linhas.length === 0 && (
            <EmptyState icon={<IconRecebimento width={40} height={40} />} title="Nenhuma carga" description="As cargas da descarga aparecerão aqui." />
          )}

          {data && linhas.length > 0 && (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-3 font-medium">Nº</th>
                    <th className="px-3 py-3 font-medium">Turno</th>
                    <th className="px-3 py-3 font-medium">Data</th>
                    <th className="px-3 py-3 font-medium">Ticket</th>
                    <th className="px-3 py-3 font-medium">Produtor</th>
                    <th className="hidden px-3 py-3 font-medium lg:table-cell">Variedade</th>
                    <th className="hidden px-3 py-3 font-medium md:table-cell">Descarga</th>
                    <th className="px-3 py-3 font-medium text-right">Peso</th>
                    <th className="px-3 py-3 font-medium text-right">Renda</th>
                    <th className="px-3 py-3 font-medium text-center">Cancha</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {linhas.map((r) => (
                    <tr key={r.id} className="group hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-medium text-slate-700">{r.numero ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        {r.turno ? (
                          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${r.turno === 'noturno' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                            {TURNO_LABEL[r.turno]}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">{formatarData(r.recebido_em)}</td>
                      <td className="px-3 py-2.5 text-slate-500">{r.ticket ?? '—'}</td>
                      <td className="px-3 py-2.5 text-slate-700">{nomeProdutor(r)}</td>
                      <td className="hidden px-3 py-2.5 text-slate-500 lg:table-cell">{r.variedade ?? '—'}</td>
                      <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">
                        {r.hora_inicio || r.hora_fim
                          ? `${r.hora_inicio?.slice(0, 5) ?? '—'} → ${r.hora_fim?.slice(0, 5) ?? '—'}`
                          : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{formatarQuantidade(r.quantidade)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{r.renda ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center text-slate-500">{r.cancha ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <button onClick={() => setEditando(r)} className="text-xs font-medium text-slate-500 hover:text-brand-600">Editar</button>
                        <button onClick={() => setExcluindo(r)} className="ml-3 text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </div>

      {/* Modal de edição */}
      <Modal open={editando != null} onClose={() => setEditando(null)} title={`Editar carga nº ${editando?.numero ?? ''}`} size="lg">
        {editando && (
          <form onSubmit={onEditar} className="space-y-4">
            <CamposCarga materiasPrimas={materiasPrimas} fornecedores={data?.fornecedores ?? []} carga={editando} />
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
              <Button type="submit" loading={salvando}>Salvar alterações</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirmação de exclusão */}
      <Modal open={excluindo != null} onClose={() => setExcluindo(null)} title="Excluir carga">
        <p className="text-sm text-slate-600">
          Tem certeza que deseja excluir a carga nº <span className="font-semibold">{excluindo?.numero}</span>
          {excluindo?.ticket ? ` (ticket ${excluindo.ticket})` : ''}? Esta ação não pode ser desfeita.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setExcluindo(null)}>Cancelar</Button>
          <Button
            type="button"
            loading={salvando}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-300"
            onClick={() => void onExcluir()}
          >
            Excluir
          </Button>
        </div>
      </Modal>
    </>
  );
}
