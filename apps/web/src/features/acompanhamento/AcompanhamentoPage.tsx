import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  listAnalisesProcesso, getValoresDaAnalise, criarAnaliseProcesso, atualizarAnaliseProcesso,
  excluirAnaliseProcesso, listClientes, listProdutos, listLotes, getEspecificacaoAplicavel, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData } from '../../lib/format';
import {
  TURNO_ANALISE, TURNO_ANALISE_LABEL, valorDentroDoLimite, limiteTexto,
} from '@sistema/domain';
import type {
  AnaliseProcesso, AnaliseProcessoValor, EspecificacaoParametro, NovoAnaliseValor,
} from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { IconPlus, IconSearch } from '../../components/icons';
import { useToast } from '../../components/Toast';

export function AcompanhamentoPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<AnaliseProcesso | null>(null);
  const [detalhe, setDetalhe] = useState<AnaliseProcesso | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(async () => {
    const [analises, clientes, produtos, lotes] = await Promise.all([
      listAnalisesProcesso(), listClientes(), listProdutos(), listLotes(),
    ]);
    return {
      analises, clientes, produtos, lotes,
      clientesMap: mapBy(clientes, 'id'), produtosMap: mapBy(produtos, 'id'), lotesMap: mapBy(lotes, 'id'),
    };
  }, [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  const linhas = (data?.analises ?? []).filter((a) => {
    if (filtroCliente && a.cliente_id !== filtroCliente) return false;
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    const cli = a.cliente_id ? data?.clientesMap.get(a.cliente_id)?.nome ?? '' : '';
    const prod = a.produto_id ? data?.produtosMap.get(a.produto_id)?.nome ?? '' : '';
    const lote = a.lote_id ? data?.lotesMap.get(a.lote_id)?.codigo ?? '' : '';
    return [cli, prod, lote, a.numero_bag ?? '', String(a.numero)].some((v) => v.toLowerCase().includes(q));
  });

  async function remover(id: string) {
    try { await excluirAnaliseProcesso(id); sucesso('Análise excluída.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  return (
    <>
      <PageHeader
        title="Acompanhamento de Processo"
        subtitle="Análise por bag contra a especificação do cliente"
        action={<Button onClick={() => setModal(true)}><IconPlus width={16} height={16} />Nova análise</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" placeholder="Buscar nº, cliente, produto, lote, bag…" value={busca} onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        </div>
        <div className="w-52">
          <Select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}>
            <option value="">Todos os clientes</option>
            {(data?.clientes ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </div>
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-emerald-600" /></div>}
      {data && linhas.length === 0 && (
        <EmptyState title="Nenhuma análise" description='Registre a primeira em "Nova análise".' />
      )}

      {data && linhas.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-medium">Nº</th>
                <th className="px-3 py-3 font-medium">Data</th>
                <th className="px-3 py-3 font-medium">Cliente</th>
                <th className="px-3 py-3 font-medium">Produto</th>
                <th className="hidden px-3 py-3 font-medium lg:table-cell">Lote</th>
                <th className="px-3 py-3 font-medium">Bag</th>
                <th className="px-3 py-3 font-medium">Conformidade</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map((a) => (
                <tr key={a.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setDetalhe(a)}>
                  <td className="px-3 py-2.5 font-medium text-slate-700">{a.numero}</td>
                  <td className="px-3 py-2.5 text-slate-500">{formatarData(a.data)}</td>
                  <td className="px-3 py-2.5 text-slate-700">{a.cliente_id ? data.clientesMap.get(a.cliente_id)?.nome ?? '—' : '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600"><span className="line-clamp-1">{a.produto_id ? data.produtosMap.get(a.produto_id)?.nome ?? '—' : '—'}</span></td>
                  <td className="hidden px-3 py-2.5 text-slate-500 lg:table-cell">{a.lote_id ? data.lotesMap.get(a.lote_id)?.codigo ?? '—' : '—'}</td>
                  <td className="px-3 py-2.5 text-slate-500">{a.numero_bag ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.conforme ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {a.conforme ? 'Aprovado' : 'Reprovado'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button onClick={(e) => { e.stopPropagation(); setEditando(a); }} className="mr-3 text-xs font-medium text-slate-500 hover:text-emerald-600">Editar</button>
                    <button onClick={(e) => { e.stopPropagation(); void remover(a.id); }} className="text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {(modal || editando) && (
        <ModalNovaAnalise
          clientes={data?.clientes ?? []}
          produtos={data?.produtos ?? []}
          lotes={data?.lotes ?? []}
          editando={editando}
          onClose={() => { setModal(false); setEditando(null); }}
          onSaved={() => { setModal(false); setEditando(null); rec(); }}
        />
      )}

      <DetalheModal analise={detalhe} onClose={() => setDetalhe(null)} />
    </>
  );
}

function ModalNovaAnalise({
  clientes, produtos, lotes, editando, onClose, onSaved,
}: {
  clientes: { id: string; nome: string }[];
  produtos: { id: string; nome: string }[];
  lotes: { id: string; codigo: string }[];
  editando?: AnaliseProcesso | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [clienteId, setClienteId] = useState(editando?.cliente_id ?? '');
  const [produtoId, setProdutoId] = useState(editando?.produto_id ?? '');
  const [espId, setEspId] = useState<string | null>(null);
  const [parametros, setParametros] = useState<EspecificacaoParametro[]>([]);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [carregandoEsp, setCarregandoEsp] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  // Resolve a especificação aplicável quando cliente+produto mudam.
  useEffect(() => {
    if (!produtoId) { setParametros([]); setEspId(null); return; }
    let cancelado = false;
    setCarregandoEsp(true);
    getEspecificacaoAplicavel(produtoId, clienteId || null)
      .then(async (r) => {
        if (cancelado) return;
        const params = r?.parametros ?? [];
        setParametros(params);
        setEspId(r?.especificacao.id ?? null);
        // Em edição, pré-carrega os valores gravados casando pelo nome do ensaio.
        if (editando) {
          const vals = await getValoresDaAnalise(editando.id);
          if (cancelado) return;
          const mapa: Record<string, string> = {};
          for (const p of params) {
            const v = vals.find((x) => x.ensaio === p.ensaio);
            if (v?.valor != null) mapa[p.id] = String(v.valor);
          }
          setValores(mapa);
        } else {
          setValores({});
        }
      })
      .catch(() => { if (!cancelado) { setParametros([]); setEspId(null); } })
      .finally(() => { if (!cancelado) setCarregandoEsp(false); });
    return () => { cancelado = true; };
  }, [produtoId, clienteId]);

  // Pré-avaliação de conformidade ao vivo.
  const preAvaliacao = useMemo(() => {
    return parametros.map((p) => {
      const raw = valores[p.id];
      const v = raw != null && raw !== '' ? Number(raw) : null;
      return { p, valor: v, conforme: valorDentroDoLimite(p.limite_min, p.limite_max, v) };
    });
  }, [parametros, valores]);

  const algumReprovado = preAvaliacao.some((x) => x.conforme === false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSalvando(true);
    try {
      const linhas: NovoAnaliseValor[] = preAvaliacao.map((x, i) => ({
        ensaio: x.p.ensaio,
        valor: x.valor,
        unidade: x.p.unidade,
        limite_min: x.p.limite_min,
        limite_max: x.p.limite_max,
        conforme: x.conforme,
        ordem: i,
      }));
      const conforme = !algumReprovado;
      const cabecalho = {
          data: String(f.get('data') ?? new Date().toISOString().slice(0, 10)),
          horario: String(f.get('horario') ?? '') || null,
          turno: String(f.get('turno') ?? '') || null,
          produto_id: produtoId || null,
          cliente_id: clienteId || null,
          lote_id: String(f.get('lote_id') ?? '') || null,
          especificacao_id: espId,
          numero_bag: String(f.get('numero_bag') ?? '').trim() || null,
          cor: String(f.get('cor') ?? '').trim() || null,
          odor: String(f.get('odor') ?? '').trim() || null,
          aparencia: String(f.get('aparencia') ?? '').trim() || null,
          conforme,
          motivo: String(f.get('motivo') ?? '').trim() || null,
          observacao: String(f.get('observacao') ?? '').trim() || null,
        };
      if (editando) await atualizarAnaliseProcesso(editando.id, cabecalho, linhas);
      else await criarAnaliseProcesso(cabecalho, linhas);
      sucesso(editando ? 'Análise atualizada.' : 'Análise registrada.'); onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={editando ? `Editar análise #${editando.numero}` : "Nova análise de processo"} size="xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Cliente">
            <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">—</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </Field>
          <Field label="Produto">
            <Select value={produtoId} onChange={(e) => setProdutoId(e.target.value)} required>
              <option value="">—</option>
              {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </Select>
          </Field>
          <Field label="Lote">
            <Select name="lote_id" defaultValue={editando?.lote_id ?? ""}>
              <option value="">—</option>
              {lotes.map((l) => <option key={l.id} value={l.id}>{l.codigo}</option>)}
            </Select>
          </Field>
          <Field label="Nº do bag"><TextInput name="numero_bag" defaultValue={editando?.numero_bag ?? ''} placeholder="ex.: 4" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Data"><TextInput name="data" type="date" defaultValue={editando?.data ?? new Date().toISOString().slice(0, 10)} required /></Field>
          <Field label="Horário"><TextInput name="horario" type="time" defaultValue={editando?.horario?.slice(0, 5) ?? ''} /></Field>
          <Field label="Turno">
            <Select name="turno" defaultValue={editando?.turno ?? ""}>
              <option value="">—</option>
              {TURNO_ANALISE.map((t) => <option key={t} value={t}>{TURNO_ANALISE_LABEL[t]}</option>)}
            </Select>
          </Field>
        </div>

        {/* Ensaios da especificação aplicável */}
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Ensaios da especificação</p>
          {carregandoEsp && <p className="py-3 text-sm text-slate-400">Carregando especificação…</p>}
          {!carregandoEsp && produtoId && parametros.length === 0 && (
            <p className="py-3 text-sm text-amber-600">Nenhuma especificação vigente para este produto/cliente. Cadastre em Especificações.</p>
          )}
          {!carregandoEsp && !produtoId && <p className="py-3 text-sm text-slate-400">Selecione o produto para carregar os ensaios.</p>}
          {parametros.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {preAvaliacao.map(({ p, conforme }) => (
                <div key={p.id}>
                  <label className="mb-1 flex items-center justify-between text-sm font-medium text-slate-600">
                    <span>{p.ensaio}</span>
                    <span className="text-xs font-normal text-slate-400">{limiteTexto(p)}</span>
                  </label>
                  <div className="relative">
                    <TextInput
                      type="number" step="any"
                      value={valores[p.id] ?? ''}
                      onChange={(e) => setValores((v) => ({ ...v, [p.id]: e.target.value }))}
                      placeholder="valor"
                    />
                    {conforme != null && (
                      <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold ${conforme ? 'text-emerald-600' : 'text-red-600'}`}>
                        {conforme ? '✓' : '✗'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sensorial */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Cor"><TextInput name="cor" defaultValue={editando?.cor ?? ''} placeholder="Creme" /></Field>
          <Field label="Odor"><TextInput name="odor" defaultValue={editando?.odor ?? ''} placeholder="Característico" /></Field>
          <Field label="Aparência"><TextInput name="aparencia" defaultValue={editando?.aparencia ?? ''} placeholder="Fina" /></Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Motivo (se reprovado)"><TextInput name="motivo" defaultValue={editando?.motivo ?? ''} placeholder="—" /></Field>
          <Field label="Observação"><TextInput name="observacao" defaultValue={editando?.observacao ?? ''} placeholder="—" /></Field>
        </div>

        <div className={`rounded-lg px-3 py-2 text-sm font-medium ${algumReprovado ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          Conformidade prévia: {algumReprovado ? 'Reprovado — há ensaio fora do limite' : 'Aprovado'}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>{editando ? "Salvar" : "Registrar análise"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function DetalheModal({ analise, onClose }: { analise: AnaliseProcesso | null; onClose: () => void }) {
  const { data, loading } = useAsync(
    () => (analise ? getValoresDaAnalise(analise.id) : Promise.resolve([] as AnaliseProcessoValor[])),
    [analise?.id],
  );
  return (
    <Modal open={!!analise} onClose={onClose} title={analise ? `Análise #${analise.numero}` : ''} size="lg">
      {analise && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Info label="Data" valor={formatarData(analise.data)} />
            <Info label="Turno" valor={analise.turno ? (analise.turno === '1t' ? '1º' : '2º') : '—'} />
            <Info label="Bag" valor={analise.numero_bag ?? '—'} />
            <Info label="Conformidade" valor={analise.conforme ? 'Aprovado' : 'Reprovado'} />
          </div>
          {loading && <div className="flex justify-center py-8"><Spinner className="h-6 w-6 text-emerald-600" /></div>}
          {data && data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-2 py-2 font-medium">Ensaio</th>
                    <th className="px-2 py-2 font-medium text-right">Valor</th>
                    <th className="px-2 py-2 font-medium">Limite</th>
                    <th className="px-2 py-2 font-medium">OK</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((v) => (
                    <tr key={v.id}>
                      <td className="px-2 py-2 text-slate-700">{v.ensaio}</td>
                      <td className="px-2 py-2 text-right font-medium text-slate-800">{v.valor ?? '—'}{v.unidade ? ` ${v.unidade}` : ''}</td>
                      <td className="px-2 py-2 text-slate-500">{limiteTexto({ limite_min: v.limite_min, limite_max: v.limite_max, unidade: v.unidade })}</td>
                      <td className="px-2 py-2">
                        {v.conforme == null ? '—' : (
                          <span className={v.conforme ? 'text-emerald-600' : 'text-red-600'}>{v.conforme ? '✓' : '✗'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <Info label="Cor" valor={analise.cor ?? '—'} />
            <Info label="Odor" valor={analise.odor ?? '—'} />
            <Info label="Aparência" valor={analise.aparencia ?? '—'} />
          </div>
          {analise.motivo && <Info label="Motivo" valor={analise.motivo} />}
          {analise.observacao && <Info label="Observação" valor={analise.observacao} />}
        </div>
      )}
    </Modal>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-slate-700">{valor}</p>
    </div>
  );
}
