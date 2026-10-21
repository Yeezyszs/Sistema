// Controle de retidos (FOR-PQSA 08 1.2) e de resíduos (1.3) num registro só.
//
// Todo produto segregado entra aqui com um destino — Reprocesso, Resíduo ou
// Tipo 2 — e fica "em estoque" até ser destinado. No reprocesso, o lote final
// fecha o rastreio de ida e volta: de onde o produto saiu e em que lote entrou.
import { useMemo, useState, type FormEvent } from 'react';
import {
  listReprocessos, listLotes, listNaoConformidades,
  listDesvios, criarDesvio, atualizarDesvio, excluirDesvio,
  criarReprocesso, atualizarReprocesso, excluirReprocesso, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade, hojeLocalISO } from '../../lib/format';
import {
  STATUS_REPROCESSO_LABEL, STATUS_REPROCESSO_TOM, DESTINO_REPROCESSO, DESTINO_REPROCESSO_LABEL,
  PRODUTOS_RETIDO, EMBALAGENS_RETIDO, retidoVencendo, somarKgPor,
} from '@sistema/domain';
import type { Reprocesso, Desvio, DestinoReprocesso, NovoReprocesso } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal, ErroCarregamento } from '../../components/ui';
import { IconPlus, IconSearch } from '../../components/icons';
import { useToast } from '../../components/Toast';
import { useAbaUrl } from '../../lib/useAbaUrl';

const TOM_CLASS: Record<string, string> = {
  alerta: 'bg-amber-100 text-amber-700', sucesso: 'bg-brand-100 text-brand-700',
};
const DESTINO_COR: Record<DestinoReprocesso, string> = {
  reprocesso: 'bg-sky-100 text-sky-700', residuo: 'bg-slate-200 text-slate-700', tipo2: 'bg-violet-100 text-violet-700',
};
// Como a planilha anota o turno.
const TURNOS = ['1° Turno', '2° Turno'];

const ABAS = ['retidos', 'painel', 'legenda'] as const;
const PAGINA = 150;

export function RetidosPage() {
  const [aba, setAba] = useAbaUrl('aba', ABAS, 'retidos');
  const [recarregar, setRecarregar] = useState(0);
  const { sucesso, erro } = useToast();

  const { data, loading, error } = useAsync(async () => {
    const [retidos, lotes, ncs, desvios] = await Promise.all([
      listReprocessos(), listLotes(), listNaoConformidades(), listDesvios(),
    ]);
    return {
      retidos, lotes, ncs, desvios,
      lotesMap: mapBy(lotes, 'id'),
      lotePorCodigo: new Map(lotes.map((l) => [l.codigo.toUpperCase(), l.id])),
      desviosMap: mapBy(desvios, 'id'),
    };
  }, [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  return (
    <>
      <PageHeader grupo="Qualidade" title="Controle de Retidos"
        subtitle="Retidos, resíduos e tipo 2 — FOR-PQSA 08 1.2 / 1.3" />

      <div className="mb-5 flex flex-wrap gap-2">
        {([['retidos', 'Retidos'], ['painel', 'Painel'], ['legenda', 'Legenda de desvios']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)}
            className={`rounded-full border px-3.5 py-[7px] text-[12.5px] font-semibold transition ${aba === id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {error && <ErroCarregamento mensagem={error} />}
      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}

      {data && aba === 'retidos' && <AbaRetidos data={data} rec={rec} sucesso={sucesso} erro={erro} />}
      {data && aba === 'painel' && <AbaPainel retidos={data.retidos} desviosMap={data.desviosMap} />}
      {data && aba === 'legenda' && <AbaLegenda desvios={data.desvios} rec={rec} sucesso={sucesso} erro={erro} />}
    </>
  );
}

type DataShape = {
  retidos: Reprocesso[];
  lotes: { id: string; codigo: string }[];
  ncs: { id: string; numero: number; descricao: string }[];
  desvios: Desvio[];
  lotesMap: Map<string, { codigo: string }>;
  lotePorCodigo: Map<string, string>;
  desviosMap: Map<string, Desvio>;
};
type ToastFn = (m: string) => void;

function nomeProduto(r: Reprocesso): string {
  return r.produto_texto ?? '—';
}
function codigoLote(r: Reprocesso, d: DataShape): string {
  return r.lote_codigo ?? (r.lote_id ? d.lotesMap.get(r.lote_id)?.codigo ?? '—' : '—');
}

// ── Aba Retidos ────────────────────────────────────────────────
function AbaRetidos({ data, rec, sucesso, erro }: { data: DataShape; rec: () => void; sucesso: ToastFn; erro: ToastFn }) {
  const [modal, setModal] = useState(false);
  const [editandoRet, setEditandoRet] = useState<Reprocesso | null>(null);
  const [concluir, setConcluir] = useState<Reprocesso | null>(null);
  const [busca, setBusca] = useState('');
  const [destino, setDestino] = useState<'todos' | DestinoReprocesso>('todos');
  const [filtro, setFiltro] = useState<'todos' | 'em_estoque' | 'concluido'>('em_estoque');
  const [limite, setLimite] = useState(PAGINA);
  const hoje = hojeLocalISO();

  const linhas = data.retidos.filter((r) => {
    if (filtro !== 'todos' && r.status !== filtro) return false;
    if (destino !== 'todos' && r.destino !== destino) return false;
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    const desv = r.desvio_id ? data.desviosMap.get(r.desvio_id)?.codigo ?? '' : '';
    return [nomeProduto(r), codigoLote(r, data), desv, r.lacre ?? '', r.motivo, r.lote_final ?? '', String(r.numero)]
      .some((v) => v.toLowerCase().includes(q));
  });
  const kgFiltrado = linhas.reduce((s, r) => s + (r.quantidade_kg ?? 0), 0);

  async function remover(r: Reprocesso) {
    if (!window.confirm(`Excluir o retido nº ${r.numero}?`)) return;
    try { await excluirReprocesso(r.id); sucesso('Retido excluído.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" placeholder="Buscar nº, produto, lote, lacre, desvio, lote final…" value={busca}
            onChange={(e) => { setBusca(e.target.value); setLimite(PAGINA); }}
            className="w-full rounded-[7px] border border-slate-300 bg-white py-2 pl-9 pr-3 text-[12.5px] outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </div>
        <div className="w-40">
          <Select value={filtro} onChange={(e) => { setFiltro(e.target.value as typeof filtro); setLimite(PAGINA); }}>
            <option value="em_estoque">Em estoque</option>
            <option value="concluido">Concluídos</option>
            <option value="todos">Todos</option>
          </Select>
        </div>
        <Button onClick={() => setModal(true)}><IconPlus width={16} height={16} />Novo retido</Button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['todos', ...DESTINO_REPROCESSO] as const).map((d) => (
          <button key={d} onClick={() => { setDestino(d); setLimite(PAGINA); }}
            className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition ${destino === d ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
            {d === 'todos' ? 'Todos os destinos' : DESTINO_REPROCESSO_LABEL[d]}
          </button>
        ))}
        <span className="ml-auto text-[12px] text-slate-500">{linhas.length} registro(s) · {formatarQuantidade(kgFiltrado, 'kg')}</span>
      </div>

      {linhas.length === 0 && <EmptyState title="Nenhum retido" description="Nada com estes filtros." />}

      {linhas.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11.5px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-[11px]">Nº</th>
                <th className="px-3 py-[11px]">Data</th>
                <th className="px-3 py-[11px]">Produto</th>
                <th className="hidden px-3 py-[11px] lg:table-cell">Lote</th>
                <th className="hidden px-3 py-[11px] xl:table-cell">Lacre</th>
                <th className="px-3 py-[11px] text-right">Kg</th>
                <th className="px-3 py-[11px]">Destino</th>
                <th className="hidden px-3 py-[11px] md:table-cell">Desvio</th>
                <th className="hidden px-3 py-[11px] xl:table-cell">Validade</th>
                <th className="hidden px-3 py-[11px] md:table-cell">Lote final</th>
                <th className="px-3 py-[11px]">Status</th>
                <th className="px-3 py-[11px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.slice(0, limite).map((r) => {
                const desv = r.desvio_id ? data.desviosMap.get(r.desvio_id) : null;
                const vence = retidoVencendo(r, hoje);
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-medium text-slate-700">{r.numero}</td>
                    <td className="px-3 py-2.5 text-slate-500">{formatarData(r.data)}</td>
                    <td className="px-3 py-2.5 text-slate-600">
                      <span className="line-clamp-1" title={r.descricao_ocorrencia ?? r.motivo}>{nomeProduto(r)}</span>
                    </td>
                    <td className="hidden px-3 py-2.5 text-slate-500 lg:table-cell">{codigoLote(r, data)}</td>
                    <td className="hidden px-3 py-2.5 text-slate-500 xl:table-cell">{r.lacre ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{r.quantidade_kg != null ? formatarQuantidade(r.quantidade_kg) : '—'}</td>
                    <td className="px-3 py-2.5">
                      {r.destino && <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${DESTINO_COR[r.destino]}`}>{DESTINO_REPROCESSO_LABEL[r.destino]}</span>}
                    </td>
                    <td className="hidden px-3 py-2.5 md:table-cell">
                      {desv ? <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600" title={desv.descricao}>{desv.codigo}</span> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className={`hidden px-3 py-2.5 xl:table-cell ${vence ? 'font-semibold text-red-700' : 'text-slate-500'}`}
                      title={vence ? 'Shelf life vencendo em até 30 dias' : undefined}>
                      {r.validade ? formatarData(r.validade) : '—'}
                    </td>
                    <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">{r.lote_final ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TOM_CLASS[STATUS_REPROCESSO_TOM[r.status]]}`}>
                        {STATUS_REPROCESSO_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <button onClick={() => setEditandoRet(r)} className="mr-3 text-xs font-medium text-slate-500 hover:text-brand-600">Editar</button>
                      {r.status === 'em_estoque' && (
                        <button onClick={() => setConcluir(r)} className="mr-3 text-xs font-medium text-brand-600 hover:text-brand-700">Destinar</button>
                      )}
                      <button onClick={() => void remover(r)} className="text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {linhas.length > limite && (
            <button type="button" onClick={() => setLimite((n) => n + PAGINA)}
              className="w-full border-t border-slate-100 py-2.5 text-[12.5px] font-semibold text-brand-700 hover:bg-slate-50">
              Mostrar mais ({linhas.length - limite} restantes)
            </button>
          )}
        </Card>
      )}

      {(modal || editandoRet) && (
        <ModalRetido data={data} editando={editandoRet}
          onClose={() => { setModal(false); setEditandoRet(null); }}
          onSaved={() => { setModal(false); setEditandoRet(null); rec(); }} sucesso={sucesso} erro={erro} />
      )}
      {concluir && <ModalDestinar retido={concluir} data={data} onClose={() => setConcluir(null)} onSaved={() => { setConcluir(null); rec(); }} sucesso={sucesso} erro={erro} />}
    </>
  );
}

function Listas({ data }: { data: DataShape }) {
  return (
    <>
      <datalist id="produtos-retido">{PRODUTOS_RETIDO.map((p) => <option key={p} value={p} />)}</datalist>
      <datalist id="lotes-retido">{data.lotes.slice(0, 400).map((l) => <option key={l.id} value={l.codigo} />)}</datalist>
    </>
  );
}

function ModalRetido({ data, editando, onClose, onSaved, sucesso, erro }: {
  data: DataShape; editando?: Reprocesso | null;
  onClose: () => void; onSaved: () => void; sucesso: ToastFn; erro: ToastFn;
}) {
  const [desvioId, setDesvioId] = useState(editando?.desvio_id ?? '');
  const [destino, setDestino] = useState<DestinoReprocesso>(editando?.destino ?? 'reprocesso');
  const [salvando, setSalvando] = useState(false);
  const desvio = data.desvios.find((d) => d.id === desvioId);
  const bloqueado = destino === 'reprocesso' && desvio?.reprocessa === false;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (bloqueado) { erro(`${desvio?.codigo} não pode ser reprocessado: destine a Tipo 2 ou Resíduo.`); return; }
    const f = new FormData(e.currentTarget);
    const txt = (k: string) => String(f.get(k) ?? '').trim() || null;
    const num = (k: string) => { const v = txt(k); return v ? Number(v.replace(',', '.')) : null; };
    const loteCodigo = txt('lote_codigo')?.toUpperCase() ?? null;
    if (!txt('produto_texto')) { erro('Informe o produto.'); return; }
    if (num('quantidade_kg') == null) { erro('Informe a quantidade (kg).'); return; }
    const payload: NovoReprocesso = {
      data: txt('data') ?? hojeLocalISO(),
      turno: txt('turno'),
      produto_texto: txt('produto_texto'),
      lote_codigo: loteCodigo,
      lote_id: loteCodigo ? data.lotePorCodigo.get(loteCodigo) ?? null : null,
      lacre: txt('lacre'),
      embalagem: txt('embalagem'),
      qtd_bags: num('qtd_bags'),
      quantidade_kg: num('quantidade_kg'),
      destino,
      desvio_id: desvioId || null,
      motivo: txt('descricao_ocorrencia') ?? desvio?.descricao ?? 'Retido',
      onde_reprocessar: txt('onde_reprocessar') ?? desvio?.onde_reprocessar ?? null,
      descricao_ocorrencia: txt('descricao_ocorrencia'),
      shelf_life_anos: num('shelf_life_anos') ?? 1,
      // Mudou data ou shelf life: o banco recalcula a validade.
      validade: null,
      colaborador_lab: txt('colaborador_lab'),
      nc_id: txt('nc_id'),
      observacao: txt('observacao'),
    };
    setSalvando(true);
    try {
      if (editando) await atualizarReprocesso(editando.id, payload);
      else await criarReprocesso(payload);
      sucesso(editando ? 'Retido atualizado.' : 'Retido registrado.'); onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={editando ? `Editar retido nº ${editando.numero}` : 'Novo retido'} size="xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <Listas data={data} />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Dados da produção</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Data de produção"><TextInput name="data" type="date" defaultValue={editando?.data ?? hojeLocalISO()} required /></Field>
          <Field label="Turno">
            <Select name="turno" defaultValue={editando?.turno ?? ''}>
              <option value="">—</option>
              {TURNOS.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Produto"><TextInput name="produto_texto" list="produtos-retido" defaultValue={editando?.produto_texto ?? ''} placeholder="Farinha Crua P.16" /></Field>
          <Field label="Lote"><TextInput name="lote_codigo" list="lotes-retido" defaultValue={editando ? codigoLote(editando, data).replace('—', '') : ''} placeholder="MA0918" /></Field>
          <Field label="Lacre"><TextInput name="lacre" defaultValue={editando?.lacre ?? ''} placeholder="9677" /></Field>
          <Field label="Embalagem">
            <Select name="embalagem" defaultValue={editando?.embalagem ?? 'Big Bag'}>
              {EMBALAGENS_RETIDO.map((e) => <option key={e}>{e}</option>)}
            </Select>
          </Field>
          <Field label="Qtd (bags)"><TextInput name="qtd_bags" type="number" step="any" min="0" defaultValue={editando?.qtd_bags ?? ''} /></Field>
          <Field label="Quantidade (kg)"><TextInput name="quantidade_kg" type="number" step="any" min="0" defaultValue={editando?.quantidade_kg ?? ''} placeholder="750" /></Field>
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Desvio e destino</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Desvio (legenda)">
            <Select value={desvioId} onChange={(e) => {
              setDesvioId(e.target.value);
              const d = data.desvios.find((x) => x.id === e.target.value);
              if (d && !d.reprocessa && destino === 'reprocesso') setDestino('tipo2');
            }}>
              <option value="">— sem código</option>
              {data.desvios.filter((d) => d.ativo).map((d) => <option key={d.id} value={d.id}>{d.codigo} · {d.produto_afetado ?? d.descricao.slice(0, 40)}</option>)}
            </Select>
          </Field>
          <Field label="Destino">
            <Select value={destino} onChange={(e) => setDestino(e.target.value as DestinoReprocesso)}>
              {DESTINO_REPROCESSO.map((d) => <option key={d} value={d}>{DESTINO_REPROCESSO_LABEL[d]}</option>)}
            </Select>
          </Field>
        </div>
        {desvio && (
          <div className={`rounded-lg px-3 py-2 text-xs ${bloqueado ? 'bg-red-50 text-red-800' : 'bg-slate-50 text-slate-600'}`}>
            <p>{desvio.descricao}</p>
            {desvio.onde_reprocessar && <p className="mt-1"><span className="font-medium">Onde reprocessar:</span> {desvio.onde_reprocessar}</p>}
            {bloqueado && <p className="mt-1 font-semibold">Este desvio não volta ao processo — escolha Tipo 2 ou Resíduo.</p>}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Onde pode ser reprocessado">
            <TextInput name="onde_reprocessar" key={desvioId} defaultValue={editando?.onde_reprocessar ?? desvio?.onde_reprocessar ?? ''} placeholder="Farinha Crua ou Torrada" />
          </Field>
          <Field label="NC vinculada (opcional)">
            <Select name="nc_id" defaultValue={editando?.nc_id ?? ''}>
              <option value="">— sem NC</option>
              {data.ncs.map((n) => <option key={n.id} value={n.id}>#{n.numero} · {n.descricao.slice(0, 40)}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Descrição da ocorrência">
          <TextInput name="descricao_ocorrencia" defaultValue={editando?.descricao_ocorrencia ?? ''} placeholder="Durante o start de linha no ensaque 1…" />
        </Field>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Shelf life (anos)"><TextInput name="shelf_life_anos" type="number" step="any" min="0" defaultValue={editando?.shelf_life_anos ?? 1} /></Field>
          <Field label="Colaborador laboratório"><TextInput name="colaborador_lab" defaultValue={editando?.colaborador_lab ?? ''} /></Field>
          <Field label="Observação"><TextInput name="observacao" defaultValue={editando?.observacao ?? ''} /></Field>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando} disabled={bloqueado}>{editando ? 'Salvar' : 'Registrar retido'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// Destinar = concluir o retido. No reprocesso, registra a diluição e o lote
// que recebeu o produto; no resíduo e no tipo 2, só a data da destinação.
function ModalDestinar({ retido, data, onClose, onSaved, sucesso, erro }: {
  retido: Reprocesso; data: DataShape; onClose: () => void; onSaved: () => void; sucesso: ToastFn; erro: ToastFn;
}) {
  const [salvando, setSalvando] = useState(false);
  const reprocesso = retido.destino === 'reprocesso';
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const txt = (k: string) => String(f.get(k) ?? '').trim() || null;
    const loteFinal = txt('lote_final')?.toUpperCase() ?? null;
    if (reprocesso && !loteFinal) { erro('Informe o lote final — é ele que fecha a rastreabilidade.'); return; }
    setSalvando(true);
    try {
      await atualizarReprocesso(retido.id, {
        status: 'concluido',
        data_reprocesso: txt('data_reprocesso') ?? hojeLocalISO(),
        horario_diluicao: reprocesso ? txt('horario_diluicao') : null,
        turno_reprocesso: reprocesso ? txt('turno_reprocesso') : null,
        colaborador_secagem: reprocesso ? txt('colaborador_secagem') : null,
        lote_final: loteFinal,
        lote_final_id: loteFinal ? data.lotePorCodigo.get(loteFinal) ?? null : null,
        observacao: txt('observacao') ?? retido.observacao,
      });
      sucesso(reprocesso ? `Reprocessado no lote ${loteFinal}.` : 'Retido destinado.'); onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }
  return (
    <Modal open onClose={onClose} title={`Destinar retido nº ${retido.numero} — ${retido.destino ? DESTINO_REPROCESSO_LABEL[retido.destino] : ''}`}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Listas data={data} />
        <p className="text-sm text-slate-600">
          {nomeProduto(retido)} · {formatarQuantidade(retido.quantidade_kg, 'kg')}{retido.lacre ? ` · lacre ${retido.lacre}` : ''}
          {retido.onde_reprocessar ? <span className="block text-xs text-slate-500">Onde reprocessar: {retido.onde_reprocessar}</span> : null}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label={reprocesso ? 'Data do reprocesso' : 'Data da destinação'}>
            <TextInput name="data_reprocesso" type="date" defaultValue={hojeLocalISO()} />
          </Field>
          {reprocesso && <Field label="Lote final"><TextInput name="lote_final" list="lotes-retido" placeholder="Lote que recebeu" /></Field>}
          {reprocesso && <Field label="Horário da diluição"><TextInput name="horario_diluicao" type="time" /></Field>}
          {reprocesso && (
            <Field label="Turno">
              <Select name="turno_reprocesso" defaultValue="">
                <option value="">—</option>
                {TURNOS.map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
          )}
          {reprocesso && <Field label="Colaborador secagem"><TextInput name="colaborador_secagem" /></Field>}
          {!reprocesso && <Field label="Observação"><TextInput name="observacao" placeholder="Ex.: vendido como tipo 2" /></Field>}
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
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11.5px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-[11px]">Código</th>
              <th className="hidden px-3 py-[11px] md:table-cell">Categoria</th>
              <th className="px-3 py-[11px]">Descrição</th>
              <th className="hidden px-3 py-[11px] lg:table-cell">Onde reprocessar</th>
              <th className="px-3 py-[11px]" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {desvios.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-3 py-2.5">
                  <span className="font-mono text-xs font-medium text-slate-700">{d.codigo}</span>
                  {!d.reprocessa && <span className="ml-1.5 rounded bg-red-100 px-1 py-0.5 text-[10px] font-semibold text-red-700">não reprocessa</span>}
                </td>
                <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">{d.categoria ?? '—'}</td>
                <td className="px-3 py-2.5 text-slate-600"><span className="line-clamp-2">{d.descricao}</span></td>
                <td className="hidden px-3 py-2.5 text-slate-500 lg:table-cell"><span className="line-clamp-2">{d.onde_reprocessar ?? '—'}</span></td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right">
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
  const [reprocessa, setReprocessa] = useState(desvio?.reprocessa ?? true);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      codigo: String(f.get('codigo') ?? '').trim(),
      categoria: String(f.get('categoria') ?? '').trim() || null,
      descricao: String(f.get('descricao') ?? '').trim(),
      produto_afetado: String(f.get('produto_afetado') ?? '').trim() || null,
      onde_reprocessar: String(f.get('onde_reprocessar') ?? '').trim() || null,
      reprocessa,
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
        <label className="flex items-center gap-2 text-[12.5px] text-slate-700">
          <input type="checkbox" checked={!reprocessa} onChange={(e) => setReprocessa(!e.target.checked)} />
          Não pode ser reprocessado (bloqueia o destino Reprocesso)
        </label>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Aba Painel ─────────────────────────────────────────────────
// Substitui as abas "QT Produto em Estoque" e "QT Produto por Desvio" da
// planilha (que estavam com #REF!): agora é conta feita sobre os registros.
function AbaPainel({ retidos, desviosMap }: { retidos: Reprocesso[]; desviosMap: Map<string, Desvio> }) {
  const hoje = hojeLocalISO();
  const emEstoque = useMemo(() => retidos.filter((r) => r.status === 'em_estoque'), [retidos]);
  const cod = (r: Reprocesso) => (r.desvio_id ? desviosMap.get(r.desvio_id)?.codigo ?? 'Sem código' : 'Sem código');
  const porProduto = somarKgPor(emEstoque, nomeProduto);
  const porDestino = somarKgPor(emEstoque, (r) => (r.destino ? DESTINO_REPROCESSO_LABEL[r.destino] : '—'));
  const desvioEstoque = new Map(somarKgPor(emEstoque, cod));
  const desvioTotal = somarKgPor(retidos, cod);
  const vencendo = emEstoque.filter((r) => retidoVencendo(r, hoje));
  const totalKg = emEstoque.reduce((s, r) => s + (r.quantidade_kg ?? 0), 0);
  const anoAtual = hoje.slice(0, 4);
  const reprocessadoAno = retidos.filter((r) => r.status === 'concluido' && r.destino === 'reprocesso' && (r.data_reprocesso ?? r.data).startsWith(anoAtual))
    .reduce((s, r) => s + (r.quantidade_kg ?? 0), 0);
  const residuoAno = retidos.filter((r) => r.destino === 'residuo' && r.data.startsWith(anoAtual))
    .reduce((s, r) => s + (r.quantidade_kg ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi titulo="Retido em estoque" valor={formatarQuantidade(totalKg, 'kg')} sub={`${emEstoque.length} registro(s)`} />
        <Kpi titulo="Shelf life vencendo (30 dias)" valor={String(vencendo.length)} sub={formatarQuantidade(vencendo.reduce((s, r) => s + (r.quantidade_kg ?? 0), 0), 'kg')} alerta={vencendo.length > 0} />
        <Kpi titulo={`Reprocessado em ${anoAtual}`} valor={formatarQuantidade(reprocessadoAno, 'kg')} />
        <Kpi titulo={`Resíduo em ${anoAtual}`} valor={formatarQuantidade(residuoAno, 'kg')} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <BarrasCard titulo="Em estoque por produto (kg)" itens={porProduto} />
        <BarrasCard titulo="Em estoque por destino (kg)" itens={porDestino} />
      </div>
      <Card className="overflow-x-auto">
        <h3 className="px-4 pt-4 text-sm font-semibold text-slate-700">Quantidade por desvio</h3>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11.5px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2">Desvio</th>
              <th className="px-4 py-2 text-right">Em estoque (kg)</th>
              <th className="px-4 py-2 text-right">Total (kg)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {desvioTotal.map(([c, total]) => (
              <tr key={c}>
                <td className="px-4 py-2 font-mono text-xs text-slate-700">{c}</td>
                <td className="px-4 py-2 text-right text-slate-600">{formatarQuantidade(desvioEstoque.get(c) ?? 0)}</td>
                <td className="px-4 py-2 text-right text-slate-600">{formatarQuantidade(total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Kpi({ titulo, valor, sub, alerta }: { titulo: string; valor: string; sub?: string; alerta?: boolean }) {
  return (
    <Card className={`p-4 ${alerta ? 'border-red-200 bg-red-50' : ''}`}>
      <p className="text-xs uppercase tracking-wide text-slate-400">{titulo}</p>
      <p className={`mt-1 text-2xl font-semibold ${alerta ? 'text-red-700' : 'text-slate-800'}`}>{valor}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </Card>
  );
}

function BarrasCard({ titulo, itens }: { titulo: string; itens: [string, number][] }) {
  const max = Math.max(1, ...itens.map(([, v]) => v));
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{titulo}</h3>
      {itens.length === 0 && <p className="text-xs text-slate-400">Nada em estoque.</p>}
      <div className="space-y-2">
        {itens.map(([nome, valor]) => (
          <div key={nome}>
            <div className="mb-0.5 flex justify-between text-xs">
              <span className="text-slate-600">{nome}</span>
              <span className="font-medium text-slate-700">{formatarQuantidade(valor)}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(valor / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
