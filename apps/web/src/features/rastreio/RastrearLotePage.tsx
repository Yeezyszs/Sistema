// Rastrear lote (FOR POP 08 1.6): digita o lote e o sistema monta o que a
// Qualidade cruzava à mão — de quais cargas e produtores veio, por quais
// controles passou e para quem foi. No fim, registra o teste de recolhimento.
import { useState, type FormEvent } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  getLotePorCodigo, getProduto, listBagsDoLote, listFornecedores, listFornoDoLote, listVerificacoesDmDoLote,
  listVerificacoesImaDoDia, listRetidosDoLote, listCarregamentosDoLote, listClientes, getLaudosDoLote,
  listAnexosDosLaudos, listTestesRastreabilidade, criarTesteRastreabilidade, listOrdensProducao,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade, hojeLocalISO } from '../../lib/format';
import {
  origemDosBags, situacaoInspecaoCarga, LIBERACAO_CARGA_LABEL, DESTINO_REPROCESSO_LABEL,
  eficaciaRecolhimento, minutosEntre, STATUS_LOTE_LABEL,
} from '@sistema/domain';
import { PageHeader, Card, Spinner, Button, Field, TextInput } from '../../components/ui';
import { IconSearch } from '../../components/icons';
import { useToast } from '../../components/Toast';
import { cargasDoLote, TabelaOrigem, hora } from './BagsDoLote';
import type { CargaRastreio } from './BagsDoLote';

export function RastrearLotePage() {
  const [params, setParams] = useSearchParams();
  const codigo = (params.get('lote') ?? '').trim();
  const [texto, setTexto] = useState(codigo);
  const [versao, setVersao] = useState(0);

  const { data, loading, error } = useAsync(async () => {
    if (!codigo) return null;
    const lote = await getLotePorCodigo(codigo);
    if (!lote) return { lote: null } as const;
    const bags = await listBagsDoLote(lote.id);
    const dia = lote.data_producao ?? bags[0]?.saiu_em.slice(0, 10) ?? null;
    const [produto, cargas, fornecedores, forno, dm, imas, retidos, cargasSaida, clientes, laudos, testes, ops] = await Promise.all([
      getProduto(lote.produto_id), cargasDoLote(lote, bags), listFornecedores(), listFornoDoLote(lote.id),
      listVerificacoesDmDoLote(lote.id), dia ? listVerificacoesImaDoDia(dia) : Promise.resolve([]),
      listRetidosDoLote(lote.id, lote.codigo), listCarregamentosDoLote(lote.id), listClientes(),
      getLaudosDoLote(lote.id), listTestesRastreabilidade(lote.id), listOrdensProducao(),
    ]);
    const anexos = await listAnexosDosLaudos(laudos.map((l) => l.id));
    return {
      lote, produto, bags, cargas, forno, dm, imas, retidos, cargasSaida, laudos, anexos, testes, dia,
      op: ops.find((o) => o.id === lote.ordem_producao_id) ?? null,
      fornecedores: new Map(fornecedores.map((f) => [f.id, f])),
      clientes: new Map(clientes.map((c) => [c.id, c.nome])),
    };
  }, [codigo, versao]);

  function buscar(e: FormEvent) {
    e.preventDefault();
    setParams(texto.trim() ? { lote: texto.trim().toUpperCase() } : {});
  }

  return (
    <>
      <PageHeader grupo="Qualidade" title="Rastrear lote"
        subtitle="Da carga de mandioca ao cliente — FOR POP 08 1.6" />

      <form onSubmit={buscar} className="mb-5 flex max-w-md gap-2 print:hidden">
        <div className="relative flex-1">
          <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Código do lote (ex.: MH2739)"
            className="w-full rounded-[7px] border border-slate-300 bg-white py-2 pl-9 pr-3 text-[13px] uppercase outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </div>
        <Button type="submit">Rastrear</Button>
      </form>

      {loading && <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-brand-600" /></div>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {data && data.lote === null && <p className="text-sm text-slate-500">Lote {codigo} não encontrado.</p>}
      {data && data.lote && <Relatorio d={data} onSaved={() => setVersao((v) => v + 1)} />}
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Relatorio({ d, onSaved }: { d: any; onSaved: () => void }) {
  const origem = origemDosBags(d.bags, d.cargas as CargaRastreio[]);
  const kgBags = d.bags.reduce((s: number, b: { peso_kg: number | null }) => s + (b.peso_kg ?? 0), 0);
  const kgVendido = d.cargasSaida.filter((c: { status: string }) => c.status === 'carregado')
    .reduce((s: number, c: { peso_kg: number | null }) => s + (c.peso_kg ?? 0), 0);
  const leituras = d.forno.leituras as { conforme: boolean }[];
  const dmFalhas = d.dm.filter((v: { conforme: boolean }) => !v.conforme).length;
  const imasMaterial = d.imas.filter((v: { tem_material: boolean | null }) => v.tem_material).length;
  const saiu = d.retidos.filter((r: { lote_id: string | null; lote_codigo: string | null }) =>
    r.lote_id === d.lote.id || r.lote_codigo === d.lote.codigo.toUpperCase());
  const entrou = d.retidos.filter((r: { lote_final_id: string | null; lote_final: string | null }) =>
    r.lote_final_id === d.lote.id || r.lote_final === d.lote.codigo.toUpperCase());

  const documentos: [string, boolean, string][] = [
    ['Chegada da carga / ficha de descarga', origem.origens.length > 0, `${origem.origens.length} carga(s)`],
    ['Checklist de inspeção da carga', origem.origens.some((o) => situacaoInspecaoCarga(o.carga.recebimento.inspecao) !== 'sem_inspecao'), ''],
    ['Ordem de produção (PCP)', !!d.op, d.op ? `OP nº ${d.op.numero}` : ''],
    ['Monitoramento do forno (FOR PQSA 8)', d.forno.registros.length > 0, `${leituras.length} leitura(s)`],
    ['Detector de metais (FOR PQSA 11)', d.dm.length > 0, `${d.dm.length} teste(s)`],
    ['Ímãs do dia (FOR PQSA 09 1.3)', d.imas.length > 0, `${d.imas.length} verificação(ões)`],
    ['Controle de retidos (FOR PQSA 08 1.2)', true, `${saiu.length} saíram · ${entrou.length} entraram`],
    ['Laudo interno', d.laudos.length > 0, d.laudos[0] ? `nº ${d.laudos[0].numero}` : ''],
    ['Checklist de expedição (FOR POP 14)', d.cargasSaida.some((c: { checklist: unknown }) => c.checklist), ''],
    ['Nota fiscal de saída', d.cargasSaida.some((c: { nota_fiscal: string | null }) => c.nota_fiscal), ''],
  ];

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xl font-semibold text-slate-900">Lote {d.lote.codigo}</p>
            <p className="text-[13px] text-slate-600">
              {d.produto?.nome ?? '—'} · produção {d.lote.data_producao ? formatarData(d.lote.data_producao) : '—'} · {STATUS_LOTE_LABEL[d.lote.status as keyof typeof STATUS_LOTE_LABEL] ?? d.lote.status}
            </p>
            <p className="text-[12.5px] text-slate-500">
              {d.bags.length} bags{d.bags.length > 0 && <> · {hora(d.bags[0].saiu_em)} → {hora(d.bags.at(-1).saiu_em)}</>}
              {kgBags > 0 && <> · {formatarQuantidade(kgBags, 'kg')}</>}
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Link to={`/lotes/${d.lote.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Abrir lote</Link>
            <Button type="button" variant="outline" onClick={() => window.print()}>Imprimir</Button>
          </div>
        </div>
      </Card>

      <Secao titulo="1. Matéria-prima — de onde veio">
        {d.bags.length === 0 ? (
          <p className="text-[12.5px] text-amber-700">Lote sem bags lançados — lance os bags na página do lote para ligar cada um à carga.</p>
        ) : <TabelaOrigem origem={origem} />}
        {origem.origens.length > 0 && (
          <ul className="mt-3 space-y-1 text-[12.5px] text-slate-600">
            {origem.origens.map((o) => {
              const r = o.carga.recebimento;
              const f = r.fornecedor_id ? d.fornecedores.get(r.fornecedor_id) : null;
              const insp = situacaoInspecaoCarga(r.inspecao);
              return (
                <li key={o.carga.id}>
                  <span className="font-medium text-slate-800">{o.carga.produtor}</span>
                  {' · '}{f?.homologado ? <span className="text-emerald-700">homologado</span> : <span className="text-red-700">não homologado</span>}
                  {' · '}inspeção da carga: {insp === 'conforme' ? 'OK' : insp === 'nao_conforme' ? <span className="text-red-700">com NC</span> : insp === 'incompleta' ? 'incompleta' : 'não feita'}
                  {r.placa ? ` · placa ${r.placa}` : ''}{r.ticket ? ` · ticket ${r.ticket}` : ''}
                </li>
              );
            })}
          </ul>
        )}
      </Secao>

      <Secao titulo="2. Processo — controles do lote">
        <ul className="grid gap-2 text-[12.5px] sm:grid-cols-2">
          <Item ok={d.forno.registros.length > 0 && leituras.every((l) => l.conforme)}
            titulo="Forno (PCC)" texto={d.forno.registros.length === 0 ? 'sem folha' : `${leituras.length} leituras · ${leituras.filter((l) => !l.conforme).length} fora do limite`} />
          <Item ok={d.dm.length > 0 && dmFalhas === 0} titulo="Detector de metais"
            texto={d.dm.length === 0 ? 'nenhum teste ligado ao lote' : `${d.dm.length} testes · ${dmFalhas} falha(s)`} />
          <Item ok={d.imas.length > 0} titulo={`Ímãs ${d.dia ? `em ${formatarData(d.dia)}` : ''}`}
            texto={d.imas.length === 0 ? 'sem verificação no dia' : `${d.imas.length} pontos · ${imasMaterial} com material`} />
          <Item ok={d.laudos.length > 0 && d.laudos.every((l: { conforme: boolean }) => l.conforme)} titulo="Laudo interno"
            texto={d.laudos.length === 0 ? 'não emitido' : d.laudos.map((l: { numero: number; conforme: boolean }) => `nº ${l.numero} ${l.conforme ? 'aprovado' : 'reprovado'}`).join(', ') + (d.anexos.length ? ' · micro anexo' : ' · sem micro')} />
        </ul>
        {(saiu.length > 0 || entrou.length > 0) && (
          <div className="mt-3 text-[12.5px] text-slate-600">
            <p className="font-medium text-slate-700">Retidos</p>
            {saiu.map((r: { id: string; numero: number; quantidade_kg: number | null; destino: keyof typeof DESTINO_REPROCESSO_LABEL; lote_final: string | null }) => (
              <p key={r.id}>Saiu do lote: nº {r.numero} · {formatarQuantidade(r.quantidade_kg, 'kg')} · {DESTINO_REPROCESSO_LABEL[r.destino]}{r.lote_final ? ` → lote ${r.lote_final}` : ''}</p>
            ))}
            {entrou.map((r: { id: string; numero: number; quantidade_kg: number | null; lote_codigo: string | null }) => (
              <p key={r.id}>Entrou no lote: retido nº {r.numero} · {formatarQuantidade(r.quantidade_kg, 'kg')}{r.lote_codigo ? ` (veio do lote ${r.lote_codigo})` : ''}</p>
            ))}
          </div>
        )}
      </Secao>

      <Secao titulo="3. Saída — para onde foi">
        {d.cargasSaida.length === 0 ? <p className="text-[12.5px] text-slate-500">Nenhum carregamento deste lote.</p> : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2">Data</th><th className="px-2 py-2">Cliente</th><th className="px-2 py-2">NF</th>
                <th className="px-2 py-2 text-right">kg</th><th className="px-2 py-2">Expedição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {d.cargasSaida.map((c: { id: string; data: string; cliente_id: string | null; nota_fiscal: string | null; peso_kg: number | null; status: string; liberacao: keyof typeof LIBERACAO_CARGA_LABEL | null }) => (
                <tr key={c.id} className={c.status === 'cancelado' ? 'text-slate-400 line-through' : ''}>
                  <td className="px-2 py-1.5">{formatarData(c.data)}</td>
                  <td className="px-2 py-1.5">{c.cliente_id ? d.clientes.get(c.cliente_id) ?? '—' : '—'}</td>
                  <td className="px-2 py-1.5">{c.nota_fiscal ?? '—'}</td>
                  <td className="px-2 py-1.5 text-right">{formatarQuantidade(c.peso_kg)}</td>
                  <td className="px-2 py-1.5">{c.liberacao ? LIBERACAO_CARGA_LABEL[c.liberacao] : 'sem liberação'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Secao>

      <Secao titulo="Documentos e registros relacionados">
        <ul className="grid gap-1 text-[12.5px] sm:grid-cols-2">
          {documentos.map(([t, ok, extra], i) => (
            <li key={t} className="flex gap-2">
              <span className={ok ? 'text-emerald-600' : 'text-red-600'}>{ok ? '✓' : '✗'}</span>
              <span className="text-slate-700">{String(i + 1).padStart(2, '0')}) {t}</span>
              {extra && <span className="text-slate-400">— {extra}</span>}
            </li>
          ))}
        </ul>
      </Secao>

      <TesteRecolhimento loteId={d.lote.id} testes={d.testes} kgVendido={kgVendido}
        cliente={d.cargasSaida[0]?.cliente_id ? d.clientes.get(d.cargasSaida[0].cliente_id) ?? '' : ''} onSaved={onSaved} />
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Card className="min-w-0 p-5 print:break-inside-avoid print:shadow-none">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{titulo}</h2>
      {children}
    </Card>
  );
}

function Item({ ok, titulo, texto }: { ok: boolean; titulo: string; texto: string }) {
  return (
    <li className={`rounded-lg px-3 py-2 ${ok ? 'bg-emerald-50' : 'bg-amber-50'}`}>
      <span className="font-semibold text-slate-800">{titulo}</span>
      <span className="block text-slate-600">{texto}</span>
    </li>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TesteRecolhimento({ loteId, testes, kgVendido, cliente, onSaved }: { loteId: string; testes: any[]; kgVendido: number; cliente: string; onSaved: () => void }) {
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const t = (k: string) => String(f.get(k) ?? '').trim() || null;
    const n = (k: string) => { const v = t(k); return v ? Number(v) : null; };
    setSalvando(true);
    try {
      await criarTesteRastreabilidade({
        lote_id: loteId, data: t('data') ?? hojeLocalISO(), inicio_rastreio: t('inicio_rastreio'), fim_rastreio: t('fim_rastreio'),
        cliente: t('cliente'), contato_em: t('contato_em'), resposta_em: t('resposta_em'),
        kg_vendido: n('kg_vendido'), kg_no_cliente: n('kg_no_cliente'), kg_recuperavel: n('kg_recuperavel'), conclusao: t('conclusao'),
      });
      sucesso('Teste de rastreabilidade registrado.');
      (e.target as HTMLFormElement).reset();
      onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Secao titulo="4. Teste de rastreabilidade e recolhimento">
      {testes.length > 0 && (
        <ul className="mb-4 space-y-2 text-[12.5px]">
          {testes.map((t) => {
            const ef = eficaciaRecolhimento(t);
            const rastreio = minutosEntre(t.inicio_rastreio, t.fim_rastreio);
            const resposta = minutosEntre(t.contato_em, t.resposta_em);
            return (
              <li key={t.id} className="rounded-lg bg-slate-50 px-3 py-2 text-slate-700">
                <span className="font-semibold">{formatarData(t.data)}</span>
                {rastreio != null && <> · rastreio em {rastreio} min</>}
                {resposta != null && <> · cliente respondeu em {resposta} min</>}
                {t.kg_vendido != null && <> · vendido {formatarQuantidade(t.kg_vendido, 'kg')}, no cliente {formatarQuantidade(t.kg_no_cliente, 'kg')}</>}
                {ef != null && <> · <span className="font-semibold">eficácia {ef}%</span></>}
                {t.conclusao && <span className="block text-slate-500">{t.conclusao}</span>}
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={salvar} className="space-y-3 print:hidden">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Data"><TextInput name="data" type="date" defaultValue={hojeLocalISO()} /></Field>
          <Field label="Início do rastreio"><TextInput name="inicio_rastreio" type="time" /></Field>
          <Field label="Fim do rastreio"><TextInput name="fim_rastreio" type="time" /></Field>
          <Field label="Cliente"><TextInput name="cliente" defaultValue={cliente} /></Field>
          <Field label="Contato com o cliente"><TextInput name="contato_em" type="time" /></Field>
          <Field label="Resposta do cliente"><TextInput name="resposta_em" type="time" /></Field>
          <Field label="kg vendidos"><TextInput name="kg_vendido" type="number" step="any" defaultValue={kgVendido || ''} /></Field>
          <Field label="kg ainda no cliente"><TextInput name="kg_no_cliente" type="number" step="any" /></Field>
          <Field label="kg recuperável (fora do cliente)"><TextInput name="kg_recuperavel" type="number" step="any" /></Field>
        </div>
        <Field label="Conclusão"><TextInput name="conclusao" placeholder="Ex.: tempo satisfatório, dentro das expectativas" /></Field>
        <Button type="submit" loading={salvando}>Registrar teste</Button>
      </form>
    </Secao>
  );
}

