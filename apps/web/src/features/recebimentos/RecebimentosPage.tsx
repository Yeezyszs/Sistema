import { useState, type FormEvent } from 'react';
import { listRecebimentos, listProdutos, listFornecedores, criarRecebimento, mapBy } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade } from '../../lib/format';
import { TURNO, TURNO_LABEL } from '@sistema/domain';
import type { Turno } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select } from '../../components/ui';
import { IconRecebimento, IconSearch } from '../../components/icons';
import { useToast } from '../../components/Toast';

export function RecebimentosPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroTurno, setFiltroTurno] = useState<'todos' | Turno>('todos');
  const { sucesso, erro } = useToast();

  const { data, loading, error } = useAsync(async () => {
    const [recebimentos, produtos, fornecedores] = await Promise.all([
      listRecebimentos(),
      listProdutos(),
      listFornecedores(),
    ]);
    return {
      recebimentos,
      produtos,
      fornecedores,
      produtosMap: mapBy(produtos, 'id'),
      fornecedoresMap: mapBy(fornecedores, 'id'),
    };
  }, [recarregar]);

  const materiasPrimas = data?.produtos.filter((p) => p.tipo === 'materia_prima') ?? [];

  const linhas = (data?.recebimentos ?? []).filter((r) => {
    if (filtroTurno !== 'todos' && r.turno !== filtroTurno) return false;
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    const produto = data?.produtosMap.get(r.produto_id)?.nome ?? '';
    return [nomeProdutor(r), produto, r.variedade ?? '', r.ticket ?? ''].some((v) => v.toLowerCase().includes(q));
  });

  function nomeProdutor(r: { produtor: string | null; fornecedor_id: string | null }): string {
    if (r.produtor) return r.produtor;
    return r.fornecedor_id ? data?.fornecedoresMap.get(r.fornecedor_id)?.razao_social ?? '—' : '—';
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const produto_id = String(form.get('produto_id') ?? '');
    if (!produto_id) {
      erro('Selecione o produto.');
      return;
    }
    const num = (k: string) => {
      const v = String(form.get(k) ?? '').trim();
      return v ? Number(v) : null;
    };
    const txt = (k: string) => String(form.get(k) ?? '').trim() || null;
    const dataStr = String(form.get('data') ?? '').trim();
    const recebido_em = dataStr ? new Date(`${dataStr}T12:00:00`).toISOString() : new Date().toISOString();

    setSalvando(true);
    try {
      const produtor = txt('produtor');
      // vincula ao fornecedor cadastrado se o nome bater (rastreabilidade)
      const forn = data?.fornecedores.find(
        (f) => f.razao_social.toLowerCase() === (produtor ?? '').toLowerCase(),
      );
      await criarRecebimento({
        produto_id,
        produtor,
        fornecedor_id: forn?.id ?? null,
        variedade: txt('variedade'),
        turno: (txt('turno') as Turno | null),
        ticket: txt('ticket'),
        cancha: txt('cancha'),
        quantidade: num('quantidade'),
        renda: num('renda'),
        recebido_em,
      });
      (e.target as HTMLFormElement).reset();
      sucesso('Carga registrada.');
      setRecarregar((n) => n + 1);
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <PageHeader title="Recebimentos" subtitle="Controle de cargas — entrada de matéria-prima (Descarga)" />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Formulário — espelha o Controle de Cargas */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Nova carga</h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Turno">
                <Select name="turno" defaultValue="">
                  <option value="">—</option>
                  {TURNO.map((t) => <option key={t} value={t}>{TURNO_LABEL[t]}</option>)}
                </Select>
              </Field>
              <Field label="Data">
                <TextInput name="data" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
              </Field>
            </div>
            <Field label="Produto (matéria-prima)">
              <Select name="produto_id" defaultValue="" required>
                <option value="" disabled>Selecione…</option>
                {materiasPrimas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </Select>
            </Field>
            <Field label="Produtor">
              <TextInput name="produtor" list="produtores" placeholder="Nome do produtor" />
              <datalist id="produtores">
                {data?.fornecedores.map((f) => <option key={f.id} value={f.razao_social} />)}
              </datalist>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Variedade">
                <TextInput name="variedade" list="variedades" placeholder="Paraguaia" />
                <datalist id="variedades">
                  <option value="Paraguaia" /><option value="Oguçu" /><option value="OJ" /><option value="Cascuda" />
                </datalist>
              </Field>
              <Field label="Ticket">
                <TextInput name="ticket" placeholder="19474" />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Peso (kg)">
                <TextInput name="quantidade" type="number" step="any" min="0" placeholder="0" />
              </Field>
              <Field label="Renda">
                <TextInput name="renda" type="number" step="any" min="0" placeholder="618" />
              </Field>
              <Field label="Cancha">
                <Select name="cancha" defaultValue="">
                  <option value="">—</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                </Select>
              </Field>
            </div>
            <Button type="submit" loading={salvando} className="w-full">Registrar carga</Button>
          </form>
        </Card>

        {/* Lista — Controle de Cargas */}
        <div className="lg:col-span-3">
          {/* Filtros */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Buscar produtor, variedade, ticket…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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

          {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-emerald-600" /></div>}
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
                    <th className="px-3 py-3 font-medium text-right">Peso</th>
                    <th className="px-3 py-3 font-medium text-right">Renda</th>
                    <th className="px-3 py-3 font-medium text-center">Cancha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {linhas.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
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
                      <td className="px-3 py-2.5 text-right text-slate-600">{formatarQuantidade(r.quantidade)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{r.renda ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center text-slate-500">{r.cancha ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
