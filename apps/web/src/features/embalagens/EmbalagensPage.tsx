import { useState, type FormEvent } from 'react';
import {
  listEmbalagensAlmox, criarAlmoxItem, atualizarAlmoxItem, excluirAlmoxItem,
  listEventosEmbalagem, criarEventoEmbalagem,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade, hojeLocalISO } from '../../lib/format';
import {
  TIPO_EVENTO_EMBALAGEM, TIPO_EVENTO_EMBALAGEM_LABEL,
  embalagemEmPosse, embalagemTotal,
} from '@sistema/domain';
import type { AlmoxItem, TipoEventoEmbalagem, EmbalagemEvento } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal, ErroCarregamento } from '../../components/ui';
import { IconPlus } from '../../components/icons';
import { useToast } from '../../components/Toast';

function reais(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
const q = (n: number) => formatarQuantidade(n);

export function EmbalagensPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [modalItem, setModalItem] = useState(false);
  const [editando, setEditando] = useState<AlmoxItem | null>(null);
  const [movimentando, setMovimentando] = useState<AlmoxItem | null>(null);
  const [extrato, setExtrato] = useState<AlmoxItem | null>(null);
  const [excluindo, setExcluindo] = useState<AlmoxItem | null>(null);
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  const { data, loading, error } = useAsync(() => listEmbalagensAlmox(), [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);
  const itens = data ?? [];

  // Totais consolidados.
  const tot = itens.reduce((a, i) => ({
    estoque: a.estoque + i.saldo,
    uso: a.uso + i.qtd_uso,
    reparo: a.reparo + i.qtd_reparo,
    terceiros: a.terceiros + i.qtd_terceiros,
    posseValor: a.posseValor + embalagemEmPosse(i) * i.custo_medio,
    manutencao: a.manutencao + i.custo_manutencao,
  }), { estoque: 0, uso: 0, reparo: 0, terceiros: 0, posseValor: 0, manutencao: 0 });

  async function salvarItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const nome = String(f.get('nome') ?? '').trim();
    if (!nome) { erro('Informe o nome.'); return; }
    const payload = {
      nome,
      codigo: String(f.get('codigo') ?? '').trim() || null,
      categoria: 'embalagem' as const,
      unidade: 'un',
      capacidade_kg: Number(f.get('capacidade_kg') ?? 0) || null,
      estoque_minimo: Number(f.get('estoque_minimo') ?? 0) || 0,
    };
    setSalvando(true);
    try {
      if (editando) { await atualizarAlmoxItem(editando.id, payload); sucesso('Embalagem atualizada.'); }
      else { await criarAlmoxItem(payload); sucesso('Embalagem cadastrada.'); }
      setModalItem(false); setEditando(null); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  async function onExcluir() {
    if (!excluindo) return;
    setSalvando(true);
    try { await excluirAlmoxItem(excluindo.id); sucesso('Embalagem excluída.'); setExcluindo(null); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <>
      <PageHeader grupo="Almoxarifado"
        title="Embalagens"
        subtitle="Controle por estado — estoque, uso, reparo e terceiros"
        action={<Button onClick={() => { setEditando(null); setModalItem(true); }}><IconPlus width={16} height={16} />Nova embalagem</Button>}
      />

      {/* KPIs consolidados */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi titulo="Em estoque" valor={q(tot.estoque)} sub="un. disponíveis" tom="ok" />
        <Kpi titulo="Em uso" valor={q(tot.uso)} sub="un. em operação" tom="info" />
        <Kpi titulo="Em reparo" valor={q(tot.reparo)} sub="un. na assistência" tom="alerta" />
        <Kpi titulo="Com terceiros" valor={q(tot.terceiros)} sub="un. não devolvidas" tom="neutro" />
        <Kpi titulo="Valor em posse" valor={reais(tot.posseValor)} sub="estoque + uso + reparo" tom="destaque" />
        <Kpi titulo="Gasto em manutenção" valor={reais(tot.manutencao)} sub="acumulado" tom="alerta" />
        <Kpi titulo="Total de unidades" valor={q(tot.estoque + tot.uso + tot.reparo + tot.terceiros)} sub="todos os estados" />
        <Kpi titulo="Tipos cadastrados" valor={String(itens.length)} />
      </div>

      {error && <ErroCarregamento mensagem={error} />}
      {loading && <div className="mt-6 flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}
      {data && itens.length === 0 && <div className="mt-6"><EmptyState title="Nenhuma embalagem" description="Cadastre em 'Nova embalagem'." /></div>}

      {data && itens.length > 0 && (
        <Card className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11.5px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-[11px]">Embalagem</th>
                <th className="px-4 py-[11px] text-right">Estoque</th>
                <th className="px-4 py-[11px] text-right">Em uso</th>
                <th className="px-4 py-[11px] text-right">Reparo</th>
                <th className="px-4 py-[11px] text-right">Terceiros</th>
                <th className="px-4 py-[11px] text-right">Total</th>
                <th className="hidden px-4 py-[11px] text-right lg:table-cell">Valor em posse</th>
                <th className="hidden px-4 py-[11px] text-right lg:table-cell">Manut.</th>
                <th className="px-4 py-[11px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itens.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{i.nome}</span>
                    {i.capacidade_kg != null && <span className="ml-1.5 text-xs text-slate-400">{i.capacidade_kg} kg/un</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-700">{q(i.saldo)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-sky-700">{q(i.qtd_uso)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber-700">{q(i.qtd_reparo)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500">{q(i.qtd_terceiros)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-800">{q(embalagemTotal(i))}</td>
                  <td className="hidden px-4 py-3 text-right tabular-nums text-slate-600 lg:table-cell">{reais(embalagemEmPosse(i) * i.custo_medio)}</td>
                  <td className="hidden px-4 py-3 text-right tabular-nums text-slate-500 lg:table-cell">{reais(i.custo_manutencao)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setMovimentando(i)} className="text-xs font-medium text-brand-600 hover:text-brand-700">Movimentar</button>
                    <button onClick={() => setExtrato(i)} className="ml-3 text-xs font-medium text-slate-500 hover:text-slate-800">Extrato</button>
                    <button onClick={() => { setEditando(i); setModalItem(true); }} className="ml-3 text-xs font-medium text-slate-400 hover:text-slate-700">Editar</button>
                    <button onClick={() => setExcluindo(i)} className="ml-3 text-xs font-medium text-slate-300 hover:text-red-600">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Modal cadastro */}
      <Modal open={modalItem} onClose={() => { setModalItem(false); setEditando(null); }} title={editando ? 'Editar embalagem' : 'Nova embalagem'} size="lg">
        <form onSubmit={salvarItem} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><Field label="Nome"><TextInput name="nome" defaultValue={editando?.nome ?? ''} required autoFocus placeholder="Ex.: Big Bag 1000kg GM" /></Field></div>
            <Field label="Código"><TextInput name="codigo" defaultValue={editando?.codigo ?? ''} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Capacidade (kg/un)"><TextInput name="capacidade_kg" type="number" step="any" min="0" defaultValue={editando?.capacidade_kg ?? ''} placeholder="Ex.: 1000" /></Field>
            <Field label="Estoque mínimo"><TextInput name="estoque_minimo" type="number" step="any" min="0" defaultValue={editando?.estoque_minimo ?? ''} placeholder="0" /></Field>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => { setModalItem(false); setEditando(null); }}>Cancelar</Button>
            <Button type="submit" loading={salvando}>{editando ? 'Salvar' : 'Cadastrar'}</Button>
          </div>
        </form>
      </Modal>

      {movimentando && <ModalEvento item={movimentando} onClose={() => setMovimentando(null)} onSaved={() => { setMovimentando(null); rec(); }} />}
      {extrato && <ModalExtrato item={extrato} onClose={() => setExtrato(null)} />}

      <Modal open={excluindo != null} onClose={() => setExcluindo(null)} title="Excluir embalagem">
        <p className="text-sm text-slate-600">Excluir <span className="font-semibold">{excluindo?.nome}</span>? O histórico de eventos também será apagado.</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setExcluindo(null)}>Cancelar</Button>
          <Button type="button" loading={salvando} className="bg-red-600 hover:bg-red-700 disabled:bg-red-300" onClick={() => void onExcluir()}>Excluir</Button>
        </div>
      </Modal>
    </>
  );
}

function ModalEvento({ item, onClose, onSaved }: { item: AlmoxItem; onClose: () => void; onSaved: () => void }) {
  const [tipo, setTipo] = useState<TipoEventoEmbalagem>('compra');
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();
  const temValor = tipo === 'compra' || tipo === 'retorno_reparo';
  const temContraparte = tipo === 'para_terceiros' || tipo === 'retorno_terceiros' || tipo === 'para_reparo' || tipo === 'retorno_reparo';

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const quantidade = Number(f.get('quantidade') ?? 0);
    if (!quantidade || quantidade <= 0) { erro('Informe a quantidade.'); return; }
    setSalvando(true);
    try {
      await criarEventoEmbalagem({
        item_id: item.id,
        tipo,
        quantidade,
        valor: temValor ? (Number(f.get('valor') ?? 0) || null) : null,
        contraparte: temContraparte ? (String(f.get('contraparte') ?? '').trim() || null) : null,
        observacao: String(f.get('observacao') ?? '').trim() || null,
        data: String(f.get('data') ?? hojeLocalISO()),
      });
      sucesso('Evento registrado.');
      onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={`Movimentar — ${item.nome}`} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-4 gap-2 rounded-lg bg-slate-50 px-3 py-2 text-center text-xs">
          <div><p className="text-slate-400">Estoque</p><p className="font-semibold text-emerald-700">{q(item.saldo)}</p></div>
          <div><p className="text-slate-400">Em uso</p><p className="font-semibold text-sky-700">{q(item.qtd_uso)}</p></div>
          <div><p className="text-slate-400">Reparo</p><p className="font-semibold text-amber-700">{q(item.qtd_reparo)}</p></div>
          <div><p className="text-slate-400">Terceiros</p><p className="font-semibold text-slate-600">{q(item.qtd_terceiros)}</p></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Evento">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoEventoEmbalagem)}>
              {TIPO_EVENTO_EMBALAGEM.map((t) => <option key={t} value={t}>{TIPO_EVENTO_EMBALAGEM_LABEL[t]}</option>)}
            </Select>
          </Field>
          <Field label="Data"><TextInput name="data" type="date" defaultValue={hojeLocalISO()} required /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantidade (un.)"><TextInput name="quantidade" type="number" step="any" min="0" placeholder="0" required autoFocus /></Field>
          {temValor && (
            <Field label={tipo === 'compra' ? 'Valor unitário (R$)' : 'Custo da manutenção (R$)'}>
              <TextInput name="valor" type="number" step="any" min="0" placeholder="0,00" />
            </Field>
          )}
        </div>
        {temContraparte && (
          <Field label={tipo.includes('terceiros') ? 'Terceiro (quem está com elas)' : 'Assistência / oficina'}>
            <TextInput name="contraparte" placeholder="Nome" />
          </Field>
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
  const { data, loading, error } = useAsync(() => listEventosEmbalagem(item.id), [item.id]);
  const entra = (t: EmbalagemEvento['tipo']) => t === 'compra' || t.startsWith('retorno');
  return (
    <Modal open onClose={onClose} title={`Extrato — ${item.nome}`} size="lg">
      {loading && <div className="flex justify-center py-8"><Spinner className="h-6 w-6 text-brand-600" /></div>}
      {data && data.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Nenhum evento.</p>}
      {data && data.length > 0 && (
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11.5px] font-bold uppercase tracking-wide text-slate-500">
                <th className="py-[11px] pr-3">Data</th>
                <th className="py-[11px] pr-3">Evento</th>
                <th className="py-[11px] pr-3 text-right">Qtd</th>
                <th className="py-[11px] pr-3 text-right">Valor</th>
                <th className="py-[11px]">Detalhe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((m) => (
                <tr key={m.id}>
                  <td className="py-2 pr-3 text-slate-500">{formatarData(m.data)}</td>
                  <td className={`py-2 pr-3 font-medium ${entra(m.tipo) ? 'text-emerald-600' : 'text-slate-600'}`}>{TIPO_EVENTO_EMBALAGEM_LABEL[m.tipo]}</td>
                  <td className="py-2 pr-3 text-right tabular-nums font-semibold">{q(m.quantidade)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-slate-500">{m.valor != null ? reais(m.valor) : '—'}</td>
                  <td className="py-2 text-xs text-slate-500">{[m.contraparte, m.observacao].filter(Boolean).join(' · ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function Kpi({ titulo, valor, sub, tom = 'neutro' }: {
  titulo: string; valor: string; sub?: string; tom?: 'neutro' | 'ok' | 'info' | 'alerta' | 'destaque';
}) {
  const barra = tom === 'ok' ? 'bg-emerald-500' : tom === 'info' ? 'bg-sky-500' : tom === 'alerta' ? 'bg-amber-500' : tom === 'destaque' ? 'bg-brand-600' : 'bg-slate-300';
  return (
    <Card className="relative overflow-hidden p-5">
      <span className={`absolute inset-y-0 left-0 w-1 ${barra}`} />
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{titulo}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{valor}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </Card>
  );
}
