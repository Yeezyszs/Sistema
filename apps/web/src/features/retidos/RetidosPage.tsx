import { useMemo, useState, type FormEvent } from 'react';
import {
  listReprocessos, listLotes, listProdutos, listNaoConformidades,
  listDesvios, criarDesvio, atualizarDesvio, excluirDesvio,
  criarReprocesso, atualizarReprocesso, excluirReprocesso, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade } from '../../lib/format';
import {
  STATUS_REPROCESSO_LABEL, STATUS_REPROCESSO_TOM,
  DESTINO_REPROCESSO, DESTINO_REPROCESSO_LABEL,
} from '@sistema/domain';
import type { Reprocesso, Desvio, DestinoReprocesso } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { IconPlus, IconSearch } from '../../components/icons';
import { useToast } from '../../components/Toast';

const TOM_CLASS: Record<string, string> = {
  alerta: 'bg-amber-100 text-amber-700', sucesso: 'bg-emerald-100 text-emerald-700',
};

type Aba = 'retidos' | 'legenda' | 'painel';

export function RetidosPage() {
  const [aba, setAba] = useState<Aba>('retidos');
  const [recarregar, setRecarregar] = useState(0);
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(async () => {
    const [retidos, lotes, produtos, ncs, desvios] = await Promise.all([
      listReprocessos(), listLotes(), listProdutos(), listNaoConformidades(), listDesvios(),
    ]);
    return {
      retidos, lotes, produtos, ncs, desvios,
      lotesMap: mapBy(lotes, 'id'), produtosMap: mapBy(produtos, 'id'), desviosMap: mapBy(desvios, 'id'),
    };
  }, [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  return (
    <>
      <PageHeader title="Controle de Retidos" subtitle="Material retido por desvio (FOR-PQSA18)" />

      <div className="mb-5 flex gap-2">
        {([['retidos', 'Retidos'], ['legenda', 'Legenda de desvios'], ['painel', 'Painel']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${aba === id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-emerald-600" /></div>}

      {data && aba === 'retidos' && <AbaRetidos data={data} rec={rec} sucesso={sucesso} erro={erro} />}
      {data && aba === 'legenda' && <AbaLegenda desvios={data.desvios} rec={rec} sucesso={sucesso} erro={erro} />}
      {data && aba === 'painel' && <AbaPainel retidos={data.retidos} produtosMap={data.produtosMap} desviosMap={data.desviosMap} />}
    </>
  );
}

type DataShape = {
  retidos: Reprocesso[];
  lotes: { id: string; codigo: string }[];
  produtos: { id: string; nome: string }[];
  ncs: { id: string; numero: number; descricao: string }[];
  desvios: Desvio[];
  lotesMap: Map<string, { codigo: string }>;
  produtosMap: Map<string, { nome: string }>;
  desviosMap: Map<string, Desvio>;
};
type ToastFn = (m: string) => void;

// ── Aba Retidos ────────────────────────────────────────────────
function AbaRetidos({ data, rec, sucesso, erro }: { data: DataShape; rec: () => void; sucesso: ToastFn; erro: ToastFn }) {
  const [modal, setModal] = useState(false);
  const [concluir, setConcluir] = useState<Reprocesso | null>(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'em_estoque' | 'concluido'>('todos');

  const linhas = data.retidos.filter((r) => {
    if (filtro !== 'todos' && r.status !== filtro) return false;
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    const prod = r.produto_id ? data.produtosMap.get(r.produto_id)?.nome ?? '' : '';
    const lote = r.lote_id ? data.lotesMap.get(r.lote_id)?.codigo ?? '' : '';
    const desv = r.desvio_id ? data.desviosMap.get(r.desvio_id)?.codigo ?? '' : '';
    return [prod, lote, desv, r.lacre ?? '', r.motivo, String(r.numero)].some((v) => v.toLowerCase().includes(q));
  });

  async function remover(id: string) {
    try { await excluirReprocesso(id); sucesso('Retido excluído.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" placeholder="Buscar nº, produto, lote, lacre, desvio…" value={busca} onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        </div>
        <div className="w-44">
          <Select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)}>
            <option value="todos">Todos</option>
            <option value="em_estoque">Em estoque</option>
            <option value="concluido">Concluído</option>
          </Select>
        </div>
        <Button onClick={() => setModal(true)}><IconPlus width={16} height={16} />Novo retido</Button>
      </div>

      {linhas.length === 0 && <EmptyState title="Nenhum retido" description='Registre o primeiro em "Novo retido".' />}

      {linhas.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-medium">Nº</th>
                <th className="px-3 py-3 font-medium">Data</th>
                <th className="px-3 py-3 font-medium">Produto</th>
                <th className="hidden px-3 py-3 font-medium lg:table-cell">Lote</th>
                <th className="hidden px-3 py-3 font-medium xl:table-cell">Lacre</th>
                <th className="px-3 py-3 font-medium text-right">Kg</th>
                <th className="px-3 py-3 font-medium">Desvio</th>
                <th className="hidden px-3 py-3 font-medium md:table-cell">Lote final</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map((r) => {
                const desv = r.desvio_id ? data.desviosMap.get(r.desvio_id) : null;
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-medium text-slate-700">{r.numero}</td>
                    <td className="px-3 py-2.5 text-slate-500">{formatarData(r.data)}</td>
                    <td className="px-3 py-2.5 text-slate-600"><span className="line-clamp-1">{r.produto_id ? data.produtosMap.get(r.produto_id)?.nome ?? '—' : '—'}</span></td>
                    <td className="hidden px-3 py-2.5 text-slate-500 lg:table-cell">{r.lote_id ? data.lotesMap.get(r.lote_id)?.codigo ?? '—' : '—'}</td>
                    <td className="hidden px-3 py-2.5 text-slate-500 xl:table-cell">{r.lacre ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{r.quantidade_kg != null ? formatarQuantidade(r.quantidade_kg) : '—'}</td>
                    <td className="px-3 py-2.5">
                      {desv ? <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600" title={desv.descricao}>{desv.codigo}</span> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">{r.lote_final ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TOM_CLASS[STATUS_REPROCESSO_TOM[r.status]]}`}>
                        {STATUS_REPROCESSO_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {r.status === 'em_estoque' && (
                        <button onClick={() => setConcluir(r)} className="mr-3 text-xs font-medium text-emerald-600 hover:text-emerald-700">Concluir</button>
                      )}
                      <button onClick={() => void remover(r.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {modal && <ModalNovoRetido data={data} onClose={() => setModal(false)} onSaved={() => { setModal(false); rec(); }} sucesso={sucesso} erro={erro} />}
      {concluir && <ModalConcluir retido={concluir} onClose={() => setConcluir(null)} onSaved={() => { setConcluir(null); rec(); }} sucesso={sucesso} erro={erro} />}
    </>
  );
}

function ModalNovoRetido({ data, onClose, onSaved, sucesso, erro }: {
  data: DataShape; onClose: () => void; onSaved: () => void; sucesso: ToastFn; erro: ToastFn;
}) {
  const [desvioId, setDesvioId] = useState('');
  const [salvando, setSalvando] = useState(false);
  const desvio = data.desvios.find((d) => d.id === desvioId);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => { const v = String(f.get(k) ?? '').trim(); return v ? Number(v) : null; };
    const motivo = String(f.get('motivo') ?? '').trim() || desvio?.descricao || 'Retido';
    setSalvando(true);
    try {
      await criarReprocesso({
        data: String(f.get('data') ?? new Date().toISOString().slice(0, 10)),
        produto_id: String(f.get('produto_id') ?? '') || null,
        lote_id: String(f.get('lote_id') ?? '') || null,
        lacre: String(f.get('lacre') ?? '').trim() || null,
        qtd_bags: num('qtd_bags'),
        quantidade_kg: num('quantidade_kg'),
        desvio_id: desvioId || null,
        motivo,
        onde_reprocessar: String(f.get('onde_reprocessar') ?? '').trim() || desvio?.onde_reprocessar || null,
        descricao_ocorrencia: String(f.get('descricao_ocorrencia') ?? '').trim() || null,
        evidencia_url: String(f.get('evidencia_url') ?? '').trim() || null,
        origem: String(f.get('origem') ?? '').trim() || null,
        nc_id: String(f.get('nc_id') ?? '') || null,
        observacao: String(f.get('observacao') ?? '').trim() || null,
      });
      sucesso('Retido registrado.'); onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title="Novo retido" size="xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Data"><TextInput name="data" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Field>
          <Field label="Produto">
            <Select name="produto_id" defaultValue="">
              <option value="">—</option>
              {data.produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </Select>
          </Field>
          <Field label="Lote">
            <Select name="lote_id" defaultValue="">
              <option value="">—</option>
              {data.lotes.map((l) => <option key={l.id} value={l.id}>{l.codigo}</option>)}
            </Select>
          </Field>
          <Field label="Lacre"><TextInput name="lacre" placeholder="ex.: 16706" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Qtd (bags)"><TextInput name="qtd_bags" type="number" step="any" min="0" placeholder="—" /></Field>
          <Field label="Quantidade total (kg)"><TextInput name="quantidade_kg" type="number" step="any" min="0" placeholder="0" /></Field>
        </div>
        <Field label="Desvio (legenda)">
          <Select value={desvioId} onChange={(e) => setDesvioId(e.target.value)}>
            <option value="">— selecione o código</option>
            {data.desvios.map((d) => <option key={d.id} value={d.id}>{d.codigo} · {d.produto_afetado ?? d.descricao.slice(0, 40)}</option>)}
          </Select>
        </Field>
        {desvio && (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <p>{desvio.descricao}</p>
            {desvio.onde_reprocessar && <p className="mt-1"><span className="font-medium">Onde reprocessar:</span> {desvio.onde_reprocessar}</p>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Onde pode ser reprocessado"><TextInput name="onde_reprocessar" defaultValue={desvio?.onde_reprocessar ?? ''} key={desvioId} placeholder="Farinha Crua ou Torrada" /></Field>
          <Field label="Motivo (livre, se sem código)"><TextInput name="motivo" placeholder="—" /></Field>
        </div>
        <Field label="Descrição da ocorrência"><TextInput name="descricao_ocorrencia" placeholder="Detalhe do que ocorreu" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Origem"><TextInput name="origem" placeholder="Linha, estoque, cliente…" /></Field>
          <Field label="Evidência (link)"><TextInput name="evidencia_url" placeholder="URL da foto (opcional)" /></Field>
        </div>
        <Field label="NC vinculada (opcional)">
          <Select name="nc_id" defaultValue="">
            <option value="">— sem NC</option>
            {data.ncs.map((n) => <option key={n.id} value={n.id}>#{n.numero} · {n.descricao.slice(0, 40)}</option>)}
          </Select>
        </Field>
        <Field label="Observação"><TextInput name="observacao" placeholder="—" /></Field>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Registrar retido</Button>
        </div>
      </form>
    </Modal>
  );
}

function ModalConcluir({ retido, onClose, onSaved, sucesso, erro }: {
  retido: Reprocesso; onClose: () => void; onSaved: () => void; sucesso: ToastFn; erro: ToastFn;
}) {
  const [salvando, setSalvando] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSalvando(true);
    try {
      await atualizarReprocesso(retido.id, {
        status: 'concluido',
        destino: String(f.get('destino') ?? 'producao') as DestinoReprocesso,
        lote_final: String(f.get('lote_final') ?? '').trim() || null,
      });
      sucesso('Retido concluído.'); onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }
  return (
    <Modal open onClose={onClose} title={`Concluir retido #${retido.numero}`}>
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-slate-600">{retido.motivo}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Destino">
            <Select name="destino" defaultValue="producao">
              {DESTINO_REPROCESSO.map((d) => <option key={d} value={d}>{DESTINO_REPROCESSO_LABEL[d]}</option>)}
            </Select>
          </Field>
          <Field label="Lote final"><TextInput name="lote_final" placeholder="Lote gerado no reprocesso" /></Field>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Concluir</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Aba Legenda ────────────────────────────────────────────────
function AbaLegenda({ desvios, rec, sucesso, erro }: { desvios: Desvio[]; rec: () => void; sucesso: ToastFn; erro: ToastFn }) {
  const [edit, setEdit] = useState<Desvio | null>(null);
  const [novo, setNovo] = useState(false);

  async function remover(id: string) {
    try { await excluirDesvio(id); sucesso('Desvio removido.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setNovo(true)}><IconPlus width={16} height={16} />Novo desvio</Button>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-3 py-3 font-medium">Código</th>
              <th className="hidden px-3 py-3 font-medium md:table-cell">Categoria</th>
              <th className="px-3 py-3 font-medium">Descrição</th>
              <th className="hidden px-3 py-3 font-medium lg:table-cell">Onde reprocessar</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {desvios.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-3 py-2.5"><span className="font-mono text-xs font-medium text-slate-700">{d.codigo}</span></td>
                <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">{d.categoria ?? '—'}</td>
                <td className="px-3 py-2.5 text-slate-600"><span className="line-clamp-2">{d.descricao}</span></td>
                <td className="hidden px-3 py-2.5 text-slate-500 lg:table-cell"><span className="line-clamp-2">{d.onde_reprocessar ?? '—'}</span></td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <button onClick={() => setEdit(d)} className="mr-3 text-xs font-medium text-slate-500 hover:text-slate-800">Editar</button>
                  <button onClick={() => void remover(d.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {(novo || edit) && (
        <ModalDesvio desvio={edit} onClose={() => { setNovo(false); setEdit(null); }} onSaved={() => { setNovo(false); setEdit(null); rec(); }} sucesso={sucesso} erro={erro} />
      )}
    </>
  );
}

function ModalDesvio({ desvio, onClose, onSaved, sucesso, erro }: {
  desvio: Desvio | null; onClose: () => void; onSaved: () => void; sucesso: ToastFn; erro: ToastFn;
}) {
  const [salvando, setSalvando] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      codigo: String(f.get('codigo') ?? '').trim(),
      categoria: String(f.get('categoria') ?? '').trim() || null,
      descricao: String(f.get('descricao') ?? '').trim(),
      produto_afetado: String(f.get('produto_afetado') ?? '').trim() || null,
      onde_reprocessar: String(f.get('onde_reprocessar') ?? '').trim() || null,
    };
    setSalvando(true);
    try {
      if (desvio) await atualizarDesvio(desvio.id, payload);
      else await criarDesvio(payload);
      sucesso('Desvio salvo.'); onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }
  return (
    <Modal open onClose={onClose} title={desvio ? `Editar ${desvio.codigo}` : 'Novo desvio'} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Código"><TextInput name="codigo" defaultValue={desvio?.codigo ?? ''} required placeholder="PR-COL-001" /></Field>
          <Field label="Categoria"><TextInput name="categoria" defaultValue={desvio?.categoria ?? ''} placeholder="Cor (processo contínuo)" /></Field>
        </div>
        <Field label="Descrição"><TextInput name="descricao" defaultValue={desvio?.descricao ?? ''} required placeholder="Descrição do desvio" /></Field>
        <Field label="Produto afetado / resumo"><TextInput name="produto_afetado" defaultValue={desvio?.produto_afetado ?? ''} placeholder="Cor amarela" /></Field>
        <Field label="Onde reprocessar"><TextInput name="onde_reprocessar" defaultValue={desvio?.onde_reprocessar ?? ''} placeholder="Farinha Crua ou Torrada" /></Field>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Aba Painel ─────────────────────────────────────────────────
function AbaPainel({ retidos, produtosMap, desviosMap }: {
  retidos: Reprocesso[]; produtosMap: Map<string, { nome: string }>; desviosMap: Map<string, Desvio>;
}) {
  const emEstoque = retidos.filter((r) => r.status === 'em_estoque');

  const porProduto = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of emEstoque) {
      const nome = r.produto_id ? produtosMap.get(r.produto_id)?.nome ?? 'Sem produto' : 'Sem produto';
      m.set(nome, (m.get(nome) ?? 0) + (r.quantidade_kg ?? 0));
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [emEstoque, produtosMap]);

  const porDesvio = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of emEstoque) {
      const cod = r.desvio_id ? desviosMap.get(r.desvio_id)?.codigo ?? 'Sem código' : 'Sem código';
      m.set(cod, (m.get(cod) ?? 0) + (r.quantidade_kg ?? 0));
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [emEstoque, desviosMap]);

  const totalKg = emEstoque.reduce((s, r) => s + (r.quantidade_kg ?? 0), 0);
  const maxProd = Math.max(1, ...porProduto.map(([, v]) => v));
  const maxDesv = Math.max(1, ...porDesvio.map(([, v]) => v));

  if (emEstoque.length === 0) return <EmptyState title="Nada em estoque" description="Sem retidos em estoque para somar." />;

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">Total retido em estoque</p>
        <p className="mt-1 text-3xl font-semibold text-slate-800">{formatarQuantidade(totalKg, 'kg')}</p>
        <p className="text-xs text-slate-400">{emEstoque.length} registro(s)</p>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <BarrasCard titulo="Por produto (kg em estoque)" itens={porProduto} max={maxProd} />
        <BarrasCard titulo="Por desvio (kg em estoque)" itens={porDesvio} max={maxDesv} mono />
      </div>
    </div>
  );
}

function BarrasCard({ titulo, itens, max, mono }: { titulo: string; itens: [string, number][]; max: number; mono?: boolean }) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{titulo}</h3>
      <div className="space-y-2">
        {itens.map(([nome, valor]) => (
          <div key={nome}>
            <div className="mb-0.5 flex justify-between text-xs">
              <span className={`text-slate-600 ${mono ? 'font-mono' : ''}`}>{nome}</span>
              <span className="font-medium text-slate-700">{formatarQuantidade(valor)}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(valor / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
