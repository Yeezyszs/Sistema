import { useState } from 'react';
import {
  listLocaisEstoque, listPosicoesEstoque, listLotes, listProdutos, listClientes,
  listEmbalagens, alocarPosicao, atualizarPosicao, liberarPosicao, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarQuantidade } from '../../lib/format';
import { posicaoLabel, pesoEstoque } from '@sistema/domain';
import type { LocalEstoque, StatusPosicao, PosicaoEstoque } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, Select, TextInput, Modal } from '../../components/ui';
import { IconBox } from '../../components/icons';
import { useToast } from '../../components/Toast';

export function EstoquePage() {
  const [aba, setAba] = useState<'mapa' | 'saldo'>('mapa');
  const [recarregar, setRecarregar] = useState(0);
  const [alocando, setAlocando] = useState<LocalEstoque | null>(null);
  const [editandoPos, setEditandoPos] = useState<PosicaoEstoque | null>(null);
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(async () => {
    const [locais, posicoes, lotes, produtos, clientes, embalagens] = await Promise.all([
      listLocaisEstoque(), listPosicoesEstoque(), listLotes(), listProdutos(), listClientes(), listEmbalagens(),
    ]);
    return {
      locais, posicoes, lotes, produtos, clientes, embalagens,
      lotesMap: mapBy(lotes, 'id'),
      produtosMap: mapBy(produtos, 'id'),
      clientesMap: mapBy(clientes, 'id'),
      posPorLocal: mapBy(posicoes, 'local_id'),
    };
  }, [recarregar]);

  const rec = () => setRecarregar((n) => n + 1);

  async function liberar(id: string) {
    try { await liberarPosicao(id); sucesso('Rua liberada.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  const barracoes = [...new Set((data?.locais ?? []).map((l) => l.barracao))];

  const saldoPorLote = new Map<string, { qtd: number; peso: number }>();
  for (const p of data?.posicoes ?? []) {
    if (!p.lote_id) continue;
    const prev = saldoPorLote.get(p.lote_id) ?? { qtd: 0, peso: 0 };
    const pu = p.produto_id ? data?.produtosMap.get(p.produto_id)?.peso_unitario ?? null : null;
    prev.qtd += p.qtd_bags ?? 0;
    prev.peso += pesoEstoque(p.qtd_bags, pu) ?? 0;
    saldoPorLote.set(p.lote_id, prev);
  }

  const ocupadas = (data?.posicoes ?? []).length;
  const total = (data?.locais ?? []).length;

  return (
    <>
      <PageHeader
        title="Estoque & Inventário"
        subtitle={`Posição física e saldo por lote — ${ocupadas}/${total} ruas ocupadas`}
      />

      <div className="mb-5 flex gap-2">
        {([['mapa', 'Mapa (posições)'], ['saldo', 'Saldo por lote']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${aba === id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}

      {data && aba === 'mapa' && (
        <div className="space-y-6">
          {barracoes.map((barracao) => (
            <div key={barracao}>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Barração {barracao}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.locais.filter((l) => l.barracao === barracao).map((local) => {
                  const pos = data.posPorLocal.get(local.id);
                  const lote = pos?.lote_id ? data.lotesMap.get(pos.lote_id) : null;
                  const produto = pos?.produto_id ? data.produtosMap.get(pos.produto_id) : null;
                  const cliente = pos?.cliente_id ? data.clientesMap.get(pos.cliente_id) : null;
                  const reprocesso = pos?.status === 'reprocesso';
                  return (
                    <Card key={local.id} className={`p-4 ${pos ? (reprocesso ? 'ring-1 ring-amber-200' : 'ring-1 ring-brand-200') : 'border-dashed'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-slate-500">{posicaoLabel(local)}</span>
                        {pos ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${reprocesso ? 'bg-amber-100 text-amber-700' : 'bg-brand-100 text-brand-700'}`}>
                            {reprocesso ? 'Reprocesso' : 'Ocupado'}
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400">Vazio</span>
                        )}
                      </div>
                      {pos ? (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-slate-800">{lote?.codigo ?? '—'}</p>
                          <p className="text-xs text-slate-500 line-clamp-1">{produto?.nome ?? ''}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {pos.qtd_bags != null ? `${pos.qtd_bags} bags` : ''}{cliente ? ` · ${cliente.nome}` : ''}
                          </p>
                          <div className="mt-2 flex gap-3">
                            <button onClick={() => setEditandoPos(pos)} className="text-xs font-medium text-slate-500 hover:text-brand-600">Editar</button>
                            <button onClick={() => void liberar(pos.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">Liberar rua</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setAlocando(local)} className="mt-3 text-xs font-medium text-brand-600 hover:text-brand-700">+ Alocar lote</button>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {data && aba === 'saldo' && (
        saldoPorLote.size === 0 ? (
          <EmptyState icon={<IconBox width={40} height={40} />} title="Estoque vazio" description="Aloque lotes nas ruas para ver o saldo." />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Lote</th>
                  <th className="px-5 py-3 font-medium">Produto</th>
                  <th className="px-5 py-3 font-medium text-right">Bags</th>
                  <th className="px-5 py-3 font-medium text-right">Peso</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">Posições</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...saldoPorLote.entries()].map(([loteId, s]) => {
                  const lote = data.lotesMap.get(loteId);
                  const produto = lote?.produto_id ? data.produtosMap.get(lote.produto_id) : null;
                  const posicoes = data.posicoes.filter((p) => p.lote_id === loteId)
                    .map((p) => { const l = data.locais.find((x) => x.id === p.local_id); return l ? posicaoLabel(l) : ''; })
                    .filter(Boolean);
                  return (
                    <tr key={loteId} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-800">{lote?.codigo ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-600"><span className="line-clamp-1">{produto?.nome ?? '—'}</span></td>
                      <td className="px-5 py-3 text-right text-slate-600">{s.qtd}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{s.peso ? formatarQuantidade(s.peso, 'kg') : '—'}</td>
                      <td className="hidden px-5 py-3 text-slate-400 md:table-cell">{posicoes.join(', ')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )
      )}

      {editandoPos && (
        <ModalEditarPosicao
          pos={editandoPos}
          clientes={data?.clientes ?? []}
          onClose={() => setEditandoPos(null)}
          onSaved={() => { setEditandoPos(null); rec(); }}
        />
      )}

      {alocando && (
        <ModalAlocar
          local={alocando}
          lotes={data?.lotes ?? []}
          produtosMap={data?.produtosMap ?? new Map()}
          embalagens={data?.embalagens ?? []}
          clientes={data?.clientes ?? []}
          onClose={() => setAlocando(null)}
          onSaved={rec}
        />
      )}
    </>
  );
}

function ModalAlocar({
  local, lotes, produtosMap, embalagens, clientes, onClose, onSaved,
}: {
  local: LocalEstoque;
  lotes: { id: string; codigo: string; produto_id: string; cliente_id: string | null }[];
  produtosMap: Map<string, { nome: string }>;
  embalagens: { id: string; nome: string; unidade: string; saldo: number }[];
  clientes: { id: string; nome: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loteId, setLoteId] = useState('');
  const [qtd, setQtd] = useState('');
  const [embalagemId, setEmbalagemId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [status, setStatus] = useState<StatusPosicao>('ocupado');
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();
  const lote = lotes.find((l) => l.id === loteId);

  async function salvar() {
    setSalvando(true);
    try {
      await alocarPosicao({
        local_id: local.id,
        lote_id: loteId || null,
        produto_id: lote?.produto_id ?? null,
        cliente_id: clienteId || lote?.cliente_id || null,
        embalagem_id: embalagemId || null,
        qtd_bags: qtd ? Number(qtd) : null,
        status,
      });
      sucesso(`Lote alocado em ${posicaoLabel(local)}.`);
      onSaved(); onClose();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={`Alocar em ${posicaoLabel(local)}`}>
      <div className="space-y-4">
        <Field label="Lote">
          <Select value={loteId} onChange={(e) => setLoteId(e.target.value)}>
            <option value="">Selecione…</option>
            {lotes.map((l) => <option key={l.id} value={l.id}>{l.codigo} — {produtosMap.get(l.produto_id)?.nome ?? ''}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Qtd. de bags"><TextInput type="number" step="any" min="0" value={qtd} onChange={(e) => setQtd(e.target.value)} placeholder="0" /></Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as StatusPosicao)}>
              <option value="ocupado">Ocupado</option>
              <option value="reprocesso">Reprocesso</option>
            </Select>
          </Field>
        </div>
        <Field label="Cliente (rastreabilidade)">
          <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">{lote?.cliente_id ? 'Herdar do lote' : '—'}</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </Field>
        <Field label="Embalagem (baixa automática)">
          <Select value={embalagemId} onChange={(e) => setEmbalagemId(e.target.value)}>
            <option value="">— não consumir</option>
            {embalagens.map((e) => <option key={e.id} value={e.id}>{e.nome} · saldo {e.saldo} {e.unidade}</option>)}
          </Select>
        </Field>
        <p className="text-xs text-slate-400">Selecionar a embalagem consome a qtd. de bags do saldo automaticamente.</p>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" loading={salvando} onClick={() => void salvar()}>Alocar</Button>
        </div>
      </div>
    </Modal>
  );
}


// Edição de uma posição ocupada (qtd de bags, cliente, status).
function ModalEditarPosicao({ pos, clientes, onClose, onSaved }: {
  pos: PosicaoEstoque;
  clientes: { id: string; nome: string }[];
  onClose: () => void; onSaved: () => void;
}) {
  const [qtd, setQtd] = useState(pos.qtd_bags != null ? String(pos.qtd_bags) : '');
  const [clienteId, setClienteId] = useState(pos.cliente_id ?? '');
  const [status, setStatus] = useState<StatusPosicao>(pos.status);
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  async function salvar() {
    setSalvando(true);
    try {
      await atualizarPosicao(pos.id, {
        qtd_bags: qtd ? Number(qtd) : null,
        cliente_id: clienteId || null,
        status,
      });
      sucesso('Posição atualizada.');
      onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title="Editar posição">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Qtd. de bags"><TextInput type="number" step="any" min="0" value={qtd} onChange={(e) => setQtd(e.target.value)} /></Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as StatusPosicao)}>
              <option value="ocupado">Ocupado</option>
              <option value="reprocesso">Reprocesso</option>
            </Select>
          </Field>
        </div>
        <Field label="Cliente (rastreabilidade)">
          <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">—</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </Field>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" loading={salvando} onClick={() => void salvar()}>Salvar</Button>
        </div>
      </div>
    </Modal>
  );
}
