import { useState, type FormEvent } from 'react';
import {
  listAlmoxItens, criarAlmoxItem, atualizarAlmoxItem, excluirAlmoxItem,
  listAlmoxMovimentos, criarAlmoxMovimento,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade, hojeLocalISO } from '../../lib/format';
import {
  CATEGORIA_ALMOX, CATEGORIA_ALMOX_LABEL, UNIDADE_ALMOX,
  TIPO_MOV_ALMOX_LABEL, abaixoDoMinimo,
} from '@sistema/domain';
import type { AlmoxItem, CategoriaAlmox, TipoMovAlmox, AlmoxMovimento } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { IconPlus, IconSearch } from '../../components/icons';
import { useToast } from '../../components/Toast';

function reais(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const SETORES = ['Produção', 'Manutenção', 'Qualidade', 'Limpeza', 'Administrativo'];

export function AlmoxarifadoPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [busca, setBusca] = useState('');
  const [cat, setCat] = useState<'todas' | CategoriaAlmox>('todas');
  const [modalItem, setModalItem] = useState(false);
  const [editando, setEditando] = useState<AlmoxItem | null>(null);
  const [movimentando, setMovimentando] = useState<AlmoxItem | null>(null);
  const [extrato, setExtrato] = useState<AlmoxItem | null>(null);
  const [excluindo, setExcluindo] = useState<AlmoxItem | null>(null);
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(() => listAlmoxItens(), [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  const itens = (data ?? []).filter((i) => {
    if (cat !== 'todas' && i.categoria !== cat) return false;
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return [i.nome, i.codigo, i.localizacao].some((v) => (v ?? '').toLowerCase().includes(q));
  });

  const totalValor = (data ?? []).reduce((s, i) => s + i.saldo * i.custo_medio, 0);
  const noMinimo = (data ?? []).filter(abaixoDoMinimo).length;

  async function salvarItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const nome = String(f.get('nome') ?? '').trim();
    if (!nome) { erro('Informe o nome.'); return; }
    const payload = {
      nome,
      codigo: String(f.get('codigo') ?? '').trim() || null,
      categoria: String(f.get('categoria') ?? 'pecas_manutencao') as CategoriaAlmox,
      unidade: String(f.get('unidade') ?? 'un'),
      estoque_minimo: Number(f.get('estoque_minimo') ?? 0) || 0,
      localizacao: String(f.get('localizacao') ?? '').trim() || null,
      capacidade_kg: Number(f.get('capacidade_kg') ?? 0) || null,
    };
    setSalvando(true);
    try {
      if (editando) { await atualizarAlmoxItem(editando.id, payload); sucesso('Item atualizado.'); }
      else { await criarAlmoxItem(payload); sucesso('Item cadastrado.'); }
      setModalItem(false); setEditando(null); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  async function onExcluir() {
    if (!excluindo) return;
    setSalvando(true);
    try { await excluirAlmoxItem(excluindo.id); sucesso('Item excluído.'); setExcluindo(null); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <>
      <PageHeader
        title="Almoxarifado"
        subtitle="Estoque de consumíveis — peças, limpeza e EPI"
        action={<Button onClick={() => { setEditando(null); setModalItem(true); }}><IconPlus width={16} height={16} />Novo item</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Mini titulo="Itens cadastrados" valor={String(data?.length ?? 0)} />
        <Mini titulo="Itens no mínimo" valor={String(noMinimo)} tom={noMinimo > 0 ? 'alerta' : 'ok'} />
        <Mini titulo="Valor em estoque" valor={reais(totalValor)} tom="destaque" />
      </div>

      <div className="mt-5 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" placeholder="Buscar item, código, local…" value={busca} onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </div>
        {(['todas', ...CATEGORIA_ALMOX] as const).map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${cat === c ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
            {c === 'todas' ? 'Todas' : CATEGORIA_ALMOX_LABEL[c]}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}
      {data && itens.length === 0 && <EmptyState title="Nenhum item" description="Cadastre itens em 'Novo item'." />}

      {data && itens.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Categoria</th>
                <th className="px-4 py-3 text-right font-medium">Saldo</th>
                <th className="hidden px-4 py-3 text-right font-medium md:table-cell">Mínimo</th>
                <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">Custo médio</th>
                <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">Valor</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itens.map((i) => {
                const baixo = abaixoDoMinimo(i);
                return (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{i.nome}</span>
                      {(i.codigo || i.localizacao) && (
                        <span className="block text-xs text-slate-400">{[i.codigo, i.localizacao].filter(Boolean).join(' · ')}</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">{CATEGORIA_ALMOX_LABEL[i.categoria]}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={`font-semibold ${baixo ? 'text-amber-600' : 'text-slate-700'}`}>{formatarQuantidade(i.saldo)}</span>
                      <span className="ml-1 text-xs text-slate-400">{i.unidade}</span>
                      {baixo && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">MÍN</span>}
                    </td>
                    <td className="hidden px-4 py-3 text-right tabular-nums text-slate-500 md:table-cell">{formatarQuantidade(i.estoque_minimo)}</td>
                    <td className="hidden px-4 py-3 text-right tabular-nums text-slate-500 lg:table-cell">{reais(i.custo_medio)}</td>
                    <td className="hidden px-4 py-3 text-right tabular-nums font-medium text-slate-700 lg:table-cell">{reais(i.saldo * i.custo_medio)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => setMovimentando(i)} className="text-xs font-medium text-brand-600 hover:text-brand-700">Movimentar</button>
                      <button onClick={() => setExtrato(i)} className="ml-3 text-xs font-medium text-slate-500 hover:text-slate-800">Extrato</button>
                      <button onClick={() => { setEditando(i); setModalItem(true); }} className="ml-3 text-xs font-medium text-slate-400 hover:text-slate-700">Editar</button>
                      <button onClick={() => setExcluindo(i)} className="ml-3 text-xs font-medium text-slate-300 hover:text-red-600">Excluir</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Modal item */}
      <Modal open={modalItem} onClose={() => { setModalItem(false); setEditando(null); }} title={editando ? 'Editar item' : 'Novo item'} size="lg">
        <form onSubmit={salvarItem} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><Field label="Nome"><TextInput name="nome" defaultValue={editando?.nome ?? ''} required autoFocus /></Field></div>
            <Field label="Código"><TextInput name="codigo" defaultValue={editando?.codigo ?? ''} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Categoria">
              <Select name="categoria" defaultValue={editando?.categoria ?? 'pecas_manutencao'}>
                {CATEGORIA_ALMOX.map((c) => <option key={c} value={c}>{CATEGORIA_ALMOX_LABEL[c]}</option>)}
              </Select>
            </Field>
            <Field label="Unidade">
              <Select name="unidade" defaultValue={editando?.unidade ?? 'un'}>
                {UNIDADE_ALMOX.map((u) => <option key={u} value={u}>{u}</option>)}
              </Select>
            </Field>
            <Field label="Estoque mínimo"><TextInput name="estoque_minimo" type="number" step="any" min="0" defaultValue={editando?.estoque_minimo ?? ''} placeholder="0" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Localização"><TextInput name="localizacao" defaultValue={editando?.localizacao ?? ''} placeholder="Ex.: Prateleira A3" /></Field>
            <Field label="Capacidade (kg/un) — embalagem"><TextInput name="capacidade_kg" type="number" step="any" min="0" defaultValue={editando?.capacidade_kg ?? ''} placeholder="Ex.: 1000" /></Field>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => { setModalItem(false); setEditando(null); }}>Cancelar</Button>
            <Button type="submit" loading={salvando}>{editando ? 'Salvar' : 'Cadastrar'}</Button>
          </div>
        </form>
      </Modal>

      {movimentando && <ModalMovimento item={movimentando} onClose={() => setMovimentando(null)} onSaved={() => { setMovimentando(null); rec(); }} />}
      {extrato && <ModalExtrato item={extrato} onClose={() => setExtrato(null)} />}

      <Modal open={excluindo != null} onClose={() => setExcluindo(null)} title="Excluir item">
        <p className="text-sm text-slate-600">Excluir <span className="font-semibold">{excluindo?.nome}</span>? Todos os movimentos do item também serão apagados.</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setExcluindo(null)}>Cancelar</Button>
          <Button type="button" loading={salvando} className="bg-red-600 hover:bg-red-700 disabled:bg-red-300" onClick={() => void onExcluir()}>Excluir</Button>
        </div>
      </Modal>
    </>
  );
}

function ModalMovimento({ item, onClose, onSaved }: { item: AlmoxItem; onClose: () => void; onSaved: () => void }) {
  const [tipo, setTipo] = useState<TipoMovAlmox>('entrada');
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const qtd = Number(f.get('quantidade') ?? 0);
    if (!qtd) { erro('Informe a quantidade.'); return; }
    const num = (k: string) => { const v = String(f.get(k) ?? '').trim(); return v ? Number(v) : null; };
    const txt = (k: string) => String(f.get(k) ?? '').trim() || null;
    setSalvando(true);
    try {
      await criarAlmoxMovimento({
        item_id: item.id,
        tipo,
        quantidade: qtd,
        valor_unitario: tipo === 'entrada' ? num('valor_unitario') : null,
        setor: tipo === 'saida' ? txt('setor') : null,
        solicitante: tipo === 'saida' ? txt('solicitante') : null,
        fornecedor: tipo === 'entrada' ? txt('fornecedor') : null,
        nota_fiscal: tipo === 'entrada' ? txt('nota_fiscal') : null,
        observacao: txt('observacao'),
        data: String(f.get('data') ?? hojeLocalISO()),
      });
      sucesso('Movimento registrado.');
      onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={`Movimentar — ${item.nome}`} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Saldo atual: <span className="font-semibold text-slate-700">{formatarQuantidade(item.saldo)} {item.unidade}</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovAlmox)}>
              {(['entrada', 'saida', 'ajuste'] as TipoMovAlmox[]).map((t) => <option key={t} value={t}>{TIPO_MOV_ALMOX_LABEL[t]}</option>)}
            </Select>
          </Field>
          <Field label="Data"><TextInput name="data" type="date" defaultValue={hojeLocalISO()} required /></Field>
        </div>
        <Field label={tipo === 'ajuste' ? `Quantidade (com sinal, em ${item.unidade})` : `Quantidade (${item.unidade})`}>
          <TextInput name="quantidade" type="number" step="any" placeholder={tipo === 'ajuste' ? 'ex.: -2' : '0'} required autoFocus />
        </Field>

        {tipo === 'entrada' && (
          <div className="grid grid-cols-3 gap-3">
            <Field label="Valor unitário (R$)"><TextInput name="valor_unitario" type="number" step="any" min="0" placeholder="0,00" /></Field>
            <Field label="Fornecedor"><TextInput name="fornecedor" /></Field>
            <Field label="Nota fiscal"><TextInput name="nota_fiscal" /></Field>
          </div>
        )}
        {tipo === 'saida' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Setor">
              <TextInput name="setor" list="setores-almox" placeholder="Ex.: Manutenção" />
              <datalist id="setores-almox">{SETORES.map((s) => <option key={s} value={s} />)}</datalist>
            </Field>
            <Field label="Solicitante"><TextInput name="solicitante" placeholder="Quem retirou" /></Field>
          </div>
        )}
        <Field label="Observação"><TextInput name="observacao" placeholder="—" /></Field>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Registrar</Button>
        </div>
      </form>
    </Modal>
  );
}

function ModalExtrato({ item, onClose }: { item: AlmoxItem; onClose: () => void }) {
  const { data, loading } = useAsync(() => listAlmoxMovimentos(item.id), [item.id]);
  const tom = (t: AlmoxMovimento['tipo']) => t === 'entrada' ? 'text-emerald-600' : t === 'saida' ? 'text-red-600' : 'text-slate-500';
  const sinal = (t: AlmoxMovimento['tipo']) => t === 'entrada' ? '+' : t === 'saida' ? '−' : '±';
  return (
    <Modal open onClose={onClose} title={`Extrato — ${item.nome}`} size="lg">
      {loading && <div className="flex justify-center py-8"><Spinner className="h-6 w-6 text-brand-600" /></div>}
      {data && data.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Nenhum movimento.</p>}
      {data && data.length > 0 && (
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-3 font-medium">Data</th>
                <th className="py-2 pr-3 font-medium">Tipo</th>
                <th className="py-2 pr-3 text-right font-medium">Qtd</th>
                <th className="py-2 font-medium">Detalhe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((m) => (
                <tr key={m.id}>
                  <td className="py-2 pr-3 text-slate-500">{formatarData(m.data)}</td>
                  <td className={`py-2 pr-3 font-medium ${tom(m.tipo)}`}>{TIPO_MOV_ALMOX_LABEL[m.tipo]}</td>
                  <td className={`py-2 pr-3 text-right tabular-nums font-semibold ${tom(m.tipo)}`}>{sinal(m.tipo)}{formatarQuantidade(Math.abs(m.quantidade))}</td>
                  <td className="py-2 text-xs text-slate-500">
                    {[m.setor, m.solicitante, m.fornecedor, m.nota_fiscal ? `NF ${m.nota_fiscal}` : null, m.observacao].filter(Boolean).join(' · ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function Mini({ titulo, valor, tom }: { titulo: string; valor: string; tom?: 'destaque' | 'alerta' | 'ok' }) {
  const barra = tom === 'alerta' ? 'bg-amber-500' : tom === 'destaque' ? 'bg-brand-600' : tom === 'ok' ? 'bg-emerald-500' : 'bg-slate-300';
  return (
    <Card className="relative overflow-hidden p-5">
      <span className={`absolute inset-y-0 left-0 w-1 ${barra}`} />
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{titulo}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{valor}</p>
    </Card>
  );
}
