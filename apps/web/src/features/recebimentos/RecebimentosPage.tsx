import { useState, type FormEvent } from 'react';
import {
  listRecebimentos, listProdutos, listProdutores, listPrevisaoDaSemana, listParametrosSemana,
  criarRecebimento, atualizarRecebimento, excluirRecebimento, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade, formatarReais, hojeLocalISO } from '../../lib/format';
import {
  TURNO, TURNO_LABEL, VARIEDADES_MANDIOCA,
  custoTFarinha, valorDaCarga, tetoCusto, segundaDaSemana,
} from '@sistema/domain';
import type {
  Turno, Recebimento, NovoRecebimento, Produto, Fornecedor, ParametrosSemana,
} from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal, ErroCarregamento } from '../../components/ui';
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
  // O produtor é escolhido na lista: antes era texto livre casado por nome
  // exato, e qualquer diferença de grafia deixava a carga sem fornecedor_id —
  // o que fazia a célula da grade da semana nunca marcar a chegada.
  const fornecedorId = txt('fornecedor_id');
  const forn = fornecedores.find((f) => f.id === fornecedorId);
  return {
    produto_id: String(form.get('produto_id') ?? ''),
    produtor: forn?.razao_social ?? null,
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
        <Select name="fornecedor_id" defaultValue={carga?.fornecedor_id ?? ''} required>
          <option value="" disabled>Selecione…</option>
          {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.razao_social}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Variedade">
          <TextInput name="variedade" list="variedades" defaultValue={carga?.variedade ?? ''} placeholder="Paraguaia" />
          <datalist id="variedades">
            {VARIEDADES_MANDIOCA.map((v) => <option key={v} value={v} />)}
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
    const [recebimentos, produtos, fornecedores, parametros] = await Promise.all([
      listRecebimentos(),
      listProdutos(),
      listProdutores(),
      listParametrosSemana(),
    ]);
    return {
      recebimentos, produtos, fornecedores, parametros,
      produtosMap: mapBy(produtos, 'id'),
      fornecedoresMap: mapBy(fornecedores, 'id'),
    };
  }, [recarregar]);

  const materiasPrimas = data?.produtos.filter((p) => p.tipo === 'materia_prima') ?? [];
  // No seletor entra só a lista de trabalho: os produtores importados como
  // inativos não têm o que fazer na portaria. O nome fica gravado em `produtor`,
  // então carga antiga de produtor desativado continua legível.
  const produtoresAtivos = (data?.fornecedores ?? []).filter((f) => f.ativo !== false);
  const paramDaSemana: ParametrosSemana | null =
    data?.parametros.find((p) => p.semana_inicio === segundaDaSemana(hojeLocalISO())) ?? null;

  // Cada carga carrega os preços da sua própria semana, então o teto é
  // comparado com o que estava valendo quando ela chegou — não com o de hoje.
  function acimaDoTeto(r: Recebimento): boolean {
    const custo = custoTFarinha(r.renda, r.preco_renda);
    const teto = tetoCusto(r.preco_farinha, r.teto_pct ?? 58);
    return custo != null && teto != null && custo > teto;
  }

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

  // A carga que chega pertence a uma semana: dela saem a linha da previsão que
  // ela cumpre e os preços que valem hoje. Os preços são copiados para dentro
  // do recebimento — mudar o preço da semana que vem não pode reescrever o
  // custo das cargas já lançadas.
  async function completarComASemana(payload: NovoRecebimento): Promise<NovoRecebimento> {
    const semana = segundaDaSemana(payload.recebido_em.slice(0, 10));
    const param = data?.parametros.find((p) => p.semana_inicio === semana) ?? null;
    let previsaoId: string | null = null;
    if (payload.fornecedor_id) {
      try {
        const linhas = await listPrevisaoDaSemana(semana);
        previsaoId = linhas.find((l) => l.fornecedor_id === payload.fornecedor_id)?.id ?? null;
      } catch {
        // Sem previsão não se recusa a carga: o caminhão está no pátio.
        previsaoId = null;
      }
    }
    return {
      ...payload,
      previsao_id: previsaoId,
      preco_renda: param?.preco_renda ?? null,
      preco_farinha: param?.preco_farinha ?? null,
      teto_pct: param?.teto_pct ?? null,
    };
  }

  async function onCriar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = montarPayload(form, data?.fornecedores ?? []);
    if (!payload.produto_id) { erro('Selecione o produto.'); return; }
    if (!payload.fornecedor_id) { erro('Selecione o produtor.'); return; }
    setSalvando(true);
    try {
      await criarRecebimento(await completarComASemana(payload));
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
      <PageHeader grupo="Suprimentos" title="Chegada da carga"
        subtitle="Controle de cargas — o que chegou, de quem, a que preço" />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Cadastro */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Nova carga</h2>
          {data && !paramDaSemana && (
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Sem preços definidos para esta semana — a carga é registrada, mas fica sem valor.
              Defina na Previsão da semana.
            </p>
          )}
          <form onSubmit={onCriar} className="space-y-4">
            <CamposCarga materiasPrimas={materiasPrimas} fornecedores={produtoresAtivos} />
            <Button type="submit" loading={salvando} className="w-full">Registrar carga</Button>
          </form>
        </Card>

        {/* Lista */}
        {/* `min-w-0`: sem isto o filho do grid assume min-width:auto e a tabela
            larga empurra a coluna inteira, estourando a página no celular. */}
        <div className="min-w-0 lg:col-span-3">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Buscar produtor, variedade, ticket…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full rounded-[7px] border border-slate-300 bg-white py-2 pl-9 pr-3 text-[12.5px] outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            {(['todos', ...TURNO] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFiltroTurno(t)}
                className={`rounded-full border px-3.5 py-[7px] text-[12.5px] font-semibold transition ${
                  filtroTurno === t ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {t === 'todos' ? 'Todos' : TURNO_LABEL[t]}
              </button>
            ))}
          </div>

          {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}
          {error && <ErroCarregamento mensagem={error} />}
          {data && linhas.length === 0 && (
            <EmptyState icon={<IconRecebimento width={40} height={40} />} title="Nenhuma carga" description="As cargas da descarga aparecerão aqui." />
          )}

          {data && linhas.length > 0 && (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11.5px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-[11px]">Nº</th>
                    <th className="hidden px-3 py-[11px] 2xl:table-cell">Turno</th>
                    <th className="px-3 py-[11px]">Data</th>
                    <th className="hidden px-3 py-[11px] 2xl:table-cell">Ticket</th>
                    <th className="px-3 py-[11px]">Produtor</th>
                    <th className="hidden px-3 py-[11px] 2xl:table-cell">Variedade</th>
                    <th className="hidden px-3 py-[11px] 2xl:table-cell">Descarga</th>
                    <th className="px-3 py-[11px] text-right">Peso</th>
                    <th className="px-3 py-[11px] text-right">Renda</th>
                    <th className="px-3 py-[11px] text-right">R$/t farinha</th>
                    <th className="px-3 py-[11px] text-right">Valor</th>
                    <th className="hidden px-3 py-[11px] text-center 2xl:table-cell">Cancha</th>
                    <th className="px-3 py-[11px]" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {linhas.map((r) => (
                    <tr key={r.id} className="group hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-medium text-slate-700">{r.numero ?? '—'}</td>
                      <td className="hidden px-3 py-2.5 2xl:table-cell">
                        {r.turno ? (
                          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${r.turno === 'noturno' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                            {TURNO_LABEL[r.turno]}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">{formatarData(r.recebido_em)}</td>
                      <td className="hidden px-3 py-2.5 text-slate-500 2xl:table-cell">{r.ticket ?? '—'}</td>
                      <td className="px-3 py-2.5 text-slate-700">{nomeProdutor(r)}</td>
                      <td className="hidden px-3 py-2.5 text-slate-500 2xl:table-cell">{r.variedade ?? '—'}</td>
                      <td className="hidden px-3 py-2.5 text-slate-500 2xl:table-cell">
                        {r.hora_inicio || r.hora_fim
                          ? `${r.hora_inicio?.slice(0, 5) ?? '—'} → ${r.hora_fim?.slice(0, 5) ?? '—'}`
                          : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{formatarQuantidade(r.quantidade)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{r.renda ?? '—'}</td>
                      <td className={`px-3 py-2.5 text-right ${acimaDoTeto(r) ? 'font-semibold text-red-700' : 'text-slate-600'}`}
                        title={acimaDoTeto(r) ? 'Custo acima do teto da semana' : undefined}>
                        {formatarReais(custoTFarinha(r.renda, r.preco_renda))}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-600">
                        {formatarReais(valorDaCarga(r.quantidade, r.renda, r.preco_renda))}
                      </td>
                      <td className="hidden px-3 py-2.5 text-center text-slate-500 2xl:table-cell">{r.cancha ?? '—'}</td>
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

      <p className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">
        A carga é ligada sozinha à linha da previsão do produtor naquela semana — é assim que a
        grade marca o que chegou. Os preços da semana são copiados para dentro da carga no
        lançamento, então mudar o preço depois não reescreve o custo do que já entrou.
        Custo em vermelho é carga acima do teto da semana.
      </p>

      {/* Modal de edição */}
      <Modal open={editando != null} onClose={() => setEditando(null)} title={`Editar carga nº ${editando?.numero ?? ''}`} size="lg">
        {editando && (
          <form onSubmit={onEditar} className="space-y-4">
            <CamposCarga materiasPrimas={materiasPrimas} fornecedores={produtoresAtivos} carga={editando} />
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
