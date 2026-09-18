// Devoluções de cliente — o que voltou, de quem, por quê e quanto custou.
//
// Registro próprio, não linha negativa de venda. O motivo é obrigatório porque
// é ele que diz o que fazer: avaria no transporte é conversa com a
// transportadora, desvio de qualidade abre não conformidade.
import { useState, type FormEvent } from 'react';
import {
  listDevolucoes, listClientes, listProdutos, listCarregamentos,
  criarDevolucao, atualizarDevolucao, excluirDevolucao, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade, formatarReais, hojeLocalISO } from '../../lib/format';
import {
  MOTIVO_DEVOLUCAO, MOTIVO_DEVOLUCAO_LABEL, MOTIVO_DEVOLUCAO_TOM,
} from '@sistema/domain';
import type { Devolucao, NovaDevolucao, MotivoDevolucao, Carregamento } from '@sistema/domain';
import {
  PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, TextArea, Select, Modal,
  ErroCarregamento,
} from '../../components/ui';
import { IconPlus, IconSearch } from '../../components/icons';
import { useToast } from '../../components/Toast';

export function DevolucoesPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<Devolucao | 'nova' | null>(null);
  const [excluindo, setExcluindo] = useState<Devolucao | null>(null);
  const { sucesso, erro } = useToast();

  const { data, loading, error } = useAsync(async () => {
    const [devolucoes, clientes, produtos, carregamentos] = await Promise.all([
      listDevolucoes(), listClientes(), listProdutos(), listCarregamentos(),
    ]);
    return {
      devolucoes, clientes, produtos, carregamentos,
      clientesMap: mapBy(clientes, 'id'),
      produtosMap: mapBy(produtos, 'id'),
    };
  }, [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  const nomeCliente = (id: string | null) => (id ? data?.clientesMap.get(id)?.nome ?? '—' : '—');
  const nomeProduto = (id: string | null) => (id ? data?.produtosMap.get(id)?.nome ?? '—' : '—');

  const linhas = (data?.devolucoes ?? []).filter((d) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return [nomeCliente(d.cliente_id), nomeProduto(d.produto_id), d.nota_fiscal ?? '',
      MOTIVO_DEVOLUCAO_LABEL[d.motivo]].some((v) => v.toLowerCase().includes(q));
  });

  const mes = hojeLocalISO().slice(0, 7);
  const doMes = (data?.devolucoes ?? []).filter((d) => d.data?.startsWith(mes));
  const pesoMes = doMes.reduce((s, d) => s + (d.peso_kg ?? 0), 0);
  const valorMes = doMes.reduce((s, d) => s + (d.valor_total_rs ?? 0), 0);

  async function excluir() {
    if (!excluindo) return;
    try {
      await excluirDevolucao(excluindo.id);
      sucesso('Devolução excluída.');
      setExcluindo(null);
      rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha ao excluir.'); }
  }

  return (
    <>
      <PageHeader grupo="Comercial"
        title="Devoluções"
        subtitle={doMes.length > 0
          ? `${doMes.length} no mês · ${formatarQuantidade(pesoMes)} kg · ${formatarReais(valorMes)}`
          : 'O que voltou do cliente, por quê e quanto custou'}
        action={<Button onClick={() => setEditando('nova')}><IconPlus width={16} height={16} />Nova devolução</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" placeholder="Buscar cliente, produto, NF, motivo…"
            value={busca} onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-[7px] border border-slate-300 bg-white py-2 pl-9 pr-3 text-[12.5px] outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </div>
      </div>

      {error && <ErroCarregamento mensagem={error} />}
      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}
      {data && linhas.length === 0 && (
        <EmptyState title="Nenhuma devolução"
          description='Registre a primeira em "Nova devolução". Sem lançamento, o painel de vendas mostra a venda bruta como se fosse líquida.' />
      )}

      {data && linhas.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11.5px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-[11px]">Nº</th>
                <th className="px-3 py-[11px]">Data</th>
                <th className="px-3 py-[11px]">Cliente</th>
                <th className="hidden px-3 py-[11px] lg:table-cell">Produto</th>
                <th className="px-3 py-[11px]">Motivo</th>
                <th className="hidden px-3 py-[11px] md:table-cell">NF</th>
                <th className="px-3 py-[11px] text-right">Peso</th>
                <th className="px-3 py-[11px] text-right">Valor</th>
                <th className="px-3 py-[11px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-medium text-slate-700">{d.numero ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-500">{formatarData(d.data)}</td>
                  <td className="px-3 py-2.5 text-slate-700">{nomeCliente(d.cliente_id)}</td>
                  <td className="hidden px-3 py-2.5 text-slate-500 lg:table-cell">{nomeProduto(d.produto_id)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${MOTIVO_DEVOLUCAO_TOM[d.motivo]}`}>
                      {MOTIVO_DEVOLUCAO_LABEL[d.motivo]}
                    </span>
                  </td>
                  <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">{d.nota_fiscal ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
                    {d.peso_kg != null ? `${formatarQuantidade(d.peso_kg)} kg` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-red-700">
                    {d.valor_total_rs ? `− ${formatarReais(d.valor_total_rs)}` : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <button onClick={() => setEditando(d)} className="text-xs font-medium text-slate-500 hover:text-brand-600">Editar</button>
                    <button onClick={() => setExcluindo(d)} className="ml-3 text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {editando && data && (
        <ModalDevolucao
          devolucao={editando === 'nova' ? null : editando}
          clientes={data.clientes}
          produtos={data.produtos}
          carregamentos={data.carregamentos}
          onClose={() => setEditando(null)}
          onSaved={() => { setEditando(null); rec(); }}
          sucesso={sucesso} erro={erro}
        />
      )}

      <Modal open={excluindo != null} onClose={() => setExcluindo(null)} title="Excluir devolução">
        <p className="text-sm text-slate-600">
          Excluir a devolução nº <span className="font-semibold">{excluindo?.numero}</span>? Esta ação
          não pode ser desfeita.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setExcluindo(null)}>Cancelar</Button>
          <Button type="button" variant="perigo" onClick={() => void excluir()}>Excluir</Button>
        </div>
      </Modal>
    </>
  );
}

function ModalDevolucao({
  devolucao, clientes, produtos, carregamentos, onClose, onSaved, sucesso, erro,
}: {
  devolucao: Devolucao | null;
  clientes: { id: string; nome: string }[];
  produtos: { id: string; nome: string }[];
  carregamentos: Carregamento[];
  onClose: () => void; onSaved: () => void;
  sucesso: (m: string) => void; erro: (m: string) => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const [peso, setPeso] = useState(devolucao?.peso_kg?.toString() ?? '');
  const [valor, setValor] = useState(devolucao?.valor_rs?.toString() ?? '');
  const [clienteId, setClienteId] = useState(devolucao?.cliente_id ?? '');

  // Só as cargas do cliente escolhido: procurar a carga certa numa lista de
  // todas é o tipo de atrito que faz o campo ficar vazio para sempre.
  const cargasDoCliente = carregamentos.filter(
    (c) => c.status === 'carregado' && (!clienteId || c.cliente_id === clienteId),
  );

  const total = Number(peso) > 0 && Number(valor) > 0 ? Number(peso) * Number(valor) : null;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const txt = (k: string) => String(f.get(k) ?? '').trim() || null;
    const num = (k: string) => {
      const v = String(f.get(k) ?? '').trim();
      return v ? Number(v) : null;
    };
    const payload: NovaDevolucao = {
      data: String(f.get('data') ?? hojeLocalISO()),
      cliente_id: txt('cliente_id'),
      produto_id: txt('produto_id'),
      carregamento_id: txt('carregamento_id'),
      peso_kg: num('peso_kg'),
      valor_rs: num('valor_rs'),
      motivo: (txt('motivo') ?? 'outro') as MotivoDevolucao,
      nota_fiscal: txt('nota_fiscal'),
      observacao: txt('observacao'),
    };
    if (payload.peso_kg != null && payload.peso_kg <= 0) { erro('O peso precisa ser maior que zero.'); return; }
    setSalvando(true);
    try {
      if (devolucao) {
        await atualizarDevolucao(devolucao.id, payload);
        sucesso('Devolução atualizada.');
      } else {
        await criarDevolucao(payload);
        sucesso('Devolução registrada.');
      }
      onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha ao salvar.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={devolucao ? `Editar devolução nº ${devolucao.numero}` : 'Nova devolução'} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Data">
            <TextInput name="data" type="date" defaultValue={devolucao?.data?.slice(0, 10) ?? hojeLocalISO()} required />
          </Field>
          <Field label="Cliente">
            <Select name="cliente_id" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">— não informado —</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Produto">
            <Select name="produto_id" defaultValue={devolucao?.produto_id ?? ''}>
              <option value="">— não informado —</option>
              {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </Select>
          </Field>
          <Field label="Carga de origem">
            <Select name="carregamento_id" defaultValue={devolucao?.carregamento_id ?? ''}>
              <option value="">— não identificada —</option>
              {cargasDoCliente.map((c) => (
                <option key={c.id} value={c.id}>
                  nº {c.numero} · {formatarData(c.data)}{c.nota_fiscal ? ` · NF ${c.nota_fiscal}` : ''}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Motivo">
          <Select name="motivo" defaultValue={devolucao?.motivo ?? ''} required>
            <option value="" disabled>Selecione…</option>
            {MOTIVO_DEVOLUCAO.map((m) => (
              <option key={m} value={m}>{MOTIVO_DEVOLUCAO_LABEL[m]}</option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Peso devolvido (kg)">
            <TextInput name="peso_kg" type="number" step="any" min="0" value={peso}
              onChange={(e) => setPeso(e.target.value)} placeholder="0" />
          </Field>
          <Field label="Preço por kg (R$)">
            <TextInput name="valor_rs" type="number" step="any" min="0" value={valor}
              onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </Field>
          <Field label="Nota fiscal">
            <TextInput name="nota_fiscal" defaultValue={devolucao?.nota_fiscal ?? ''} placeholder="19481" />
          </Field>
        </div>

        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {total != null
            ? <>Valor da devolução: <span className="font-semibold text-red-700">{formatarReais(total)}</span> — sai do líquido do mês.</>
            : 'Informe peso e preço por kg para calcular o valor. Sem eles a devolução conta em quilos, mas não em reais.'}
        </p>

        <Field label="Observação">
          <TextArea name="observacao" defaultValue={devolucao?.observacao ?? ''} placeholder="Opcional" />
        </Field>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>{devolucao ? 'Salvar alterações' : 'Registrar devolução'}</Button>
        </div>
      </form>
    </Modal>
  );
}
