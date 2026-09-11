// Painel do compras: o que precisa comprar e de quem pode comprar.
// O cruzamento entre as duas metades é o ponto: comprar de fornecedor com
// documento vencido é a não conformidade que a auditoria pega.
import { Link } from 'react-router-dom';
import {
  getDocumentosVencendo, getStatusDocumentalGeral, listFornecedoresDocumentais,
  listAlmoxItens, listAlmoxMovimentos,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade } from '../../lib/format';
import { abaixoDoMinimo } from '@sistema/domain';
import type { AlmoxItem, AlmoxMovimento, DocumentoVencendo, StatusDocumental } from '@sistema/domain';
import {
  Card, CardTitle, Spinner, ErroCarregamento, EmptyState, LINHA_CABECALHO,
} from '../../components/ui';
import { Kpi } from './comum';

const reais = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function urgencia(i: AlmoxItem): number {
  return i.estoque_minimo > 0 ? i.saldo / i.estoque_minimo : 1;
}

export function PainelCompras() {
  const { data, loading, error } = useAsync(async () => {
    const [fornecedores, itens, movimentos] = await Promise.all([
      listFornecedoresDocumentais(), listAlmoxItens(), listAlmoxMovimentos(),
    ]);
    // Situação documental é o coração deste painel: se a consulta falhar,
    // dizemos isso em vez de mostrar zero e sugerir que está tudo em dia.
    let vencendo: DocumentoVencendo[] = [];
    let status: { fornecedor_id: string; status_documental: StatusDocumental }[] = [];
    let documentalIndisponivel = false;
    try {
      [vencendo, status] = await Promise.all([getDocumentosVencendo(30), getStatusDocumentalGeral()]);
    } catch {
      documentalIndisponivel = true;
    }
    return { fornecedores, itens, movimentos, vencendo, status, documentalIndisponivel };
  }, []);

  if (error || (loading === false && !data)) return <ErroCarregamento mensagem={error} />;
  if (loading || !data) {
    return <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>;
  }

  const { vencendo, documentalIndisponivel } = data;
  const vencidos = vencendo.filter((d) => d.estado === 'vencido');
  const aVencer = vencendo.filter((d) => d.estado !== 'vencido');
  const maisProximo = aVencer.reduce<number | null>(
    (m, d) => (m == null || d.dias < m ? d.dias : m), null,
  );

  const porStatus = { ok: 0, pendente: 0, sem_documentos: 0 };
  for (const s of data.status) porStatus[s.status_documental] += 1;
  const totalFornecedores = data.fornecedores.length;
  const pendentes = porStatus.pendente + porStatus.sem_documentos;

  // Fornecedor com documento vencido ou vencendo — para marcar na lista de
  // compra sem precisar abrir outra tela.
  const situacaoDoFornecedor = new Map<string, DocumentoVencendo>();
  for (const d of vencendo) {
    const atual = situacaoDoFornecedor.get(d.fornecedor_id);
    if (!atual || d.dias < atual.dias) situacaoDoFornecedor.set(d.fornecedor_id, d);
  }
  const fornecedorPorNome = new Map(
    data.fornecedores.map((f) => [f.razao_social.trim().toLowerCase(), f]),
  );

  const ativos = data.itens.filter((i) => i.ativo);
  const repor = ativos.filter(abaixoDoMinimo).sort((a, b) => urgencia(a) - urgencia(b));

  const ultimaEntrada = new Map<string, AlmoxMovimento>();
  for (const m of data.movimentos) {
    if (m.tipo === 'entrada' && !ultimaEntrada.has(m.item_id)) ultimaEntrada.set(m.item_id, m);
  }
  return (
    <>
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Documentos vencidos"
          valor={documentalIndisponivel ? '—' : String(vencidos.length)}
          sub={documentalIndisponivel ? 'consulta indisponível' : 'não comprar sem regularizar'}
          tom={!documentalIndisponivel && vencidos.length > 0 ? 'critico' : 'neutro'} />
        <Kpi label="Vencem em 30 dias"
          valor={documentalIndisponivel ? '—' : String(aVencer.length)}
          sub={maisProximo != null ? `o mais próximo em ${maisProximo} dia(s)` : 'nenhum no prazo'}
          tom={!documentalIndisponivel && aVencer.length > 0 ? 'alerta' : 'neutro'} />
        <Kpi label="Fornecedores pendentes"
          valor={documentalIndisponivel ? '—' : `${pendentes} / ${totalFornecedores}`}
          sub="checklist incompleto" />
        <Kpi label="Itens a repor" valor={String(repor.length)}
          sub="gatilho: estoque mínimo"
          tom={repor.length > 0 ? 'alerta' : 'neutro'} />
      </div>

      <div className="mt-3.5 grid gap-3.5 lg:grid-cols-[1.55fr_1fr] lg:items-start">
        <div className="flex min-w-0 flex-col gap-3.5">
          {/* Documentos vencidos e a vencer */}
          <Card className="overflow-hidden">
            <div className="px-[18px] pt-[18px]">
              <CardTitle sub="Vencidos ou a vencer nos próximos 30 dias.">
                Documentos de fornecedor
              </CardTitle>
            </div>
            {documentalIndisponivel ? (
              <div className="px-[18px] pb-[18px]">
                <p className="text-sm font-semibold text-red-700">
                  Não foi possível verificar a situação documental.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Não trate esta tela como "tudo em dia" enquanto a consulta não voltar.
                </p>
              </div>
            ) : vencendo.length === 0 ? (
              <div className="px-[18px] pb-[18px]">
                <EmptyState title="Nada vencido nem vencendo"
                  description="Nenhum documento vence nos próximos 30 dias." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={LINHA_CABECALHO}>
                      <th className="px-4 py-[11px]">Documento</th>
                      <th className="hidden px-4 py-[11px] sm:table-cell">Fornecedor</th>
                      <th className="px-4 py-[11px]">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vencendo.slice(0, 10).map((d) => {
                      const vencido = d.estado === 'vencido';
                      return (
                        <tr key={d.documento_id}
                          className={`border-b border-slate-100 last:border-0 border-l-[3px] ${
                            vencido ? 'border-l-red-500' : 'border-l-amber-400'
                          }`}>
                          <td className="px-4 py-2.5">
                            <span className="font-semibold text-slate-900">{d.documento}</span>
                            <span className="block text-[11px] text-slate-400 sm:hidden">
                              {d.fornecedor}
                            </span>
                          </td>
                          <td className="hidden px-4 py-2.5 text-slate-600 sm:table-cell">
                            {d.fornecedor}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              vencido ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {vencido
                                ? `Vencido em ${formatarData(d.validade)}`
                                : `Vence em ${d.dias} dia${d.dias === 1 ? '' : 's'}`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-[18px] py-3 text-xs text-slate-500">
              <span>
                {documentalIndisponivel
                  ? 'situação documental indisponível'
                  : `${vencidos.length} vencido(s) · ${aVencer.length} a vencer`}
                {vencendo.length > 10 ? ` · +${vencendo.length - 10} não exibido(s)` : ''}
              </span>
              <Link to="/gestao-documentos" className="font-semibold text-brand-700 hover:underline">
                Gestão de Documentos →
              </Link>
            </div>
          </Card>

          {/* A comprar */}
          <Card className="overflow-hidden">
            <div className="px-[18px] pt-[18px]">
              <CardTitle sub="Com o último fornecedor e o último preço pago.">A comprar</CardTitle>
            </div>
            {repor.length === 0 ? (
              <div className="px-[18px] pb-[18px]">
                <EmptyState title="Nenhum item abaixo do mínimo" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={LINHA_CABECALHO}>
                      <th className="px-4 py-[11px]">Item</th>
                      <th className="px-4 py-[11px] text-right">Falta</th>
                      <th className="hidden px-4 py-[11px] md:table-cell">Último fornecedor</th>
                      <th className="px-4 py-[11px] text-right">Último preço</th>
                      <th className="hidden px-4 py-[11px] lg:table-cell">Documentação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repor.slice(0, 10).map((i) => {
                      const ult = ultimaEntrada.get(i.id);
                      const falta = Math.max(0, i.estoque_minimo - i.saldo);
                      const forn = ult?.fornecedor
                        ? fornecedorPorNome.get(ult.fornecedor.trim().toLowerCase())
                        : undefined;
                      const sit = forn ? situacaoDoFornecedor.get(forn.id) : undefined;
                      return (
                        <tr key={i.id}
                          className={`border-b border-slate-100 last:border-0 border-l-[3px] ${
                            i.saldo <= 0 ? 'border-l-red-500' : 'border-l-amber-400'
                          }`}>
                          <td className="px-4 py-2.5">
                            <span className="font-semibold text-slate-900">{i.nome}</span>
                            {i.codigo && (
                              <span className="block text-[11px] text-slate-400">{i.codigo}</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                            {falta > 0 ? formatarQuantidade(falta, i.unidade) : '—'}
                          </td>
                          <td className="hidden px-4 py-2.5 text-slate-600 md:table-cell">
                            {ult?.fornecedor ?? <span className="text-slate-400">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                            {ult?.valor_unitario != null ? reais(ult.valor_unitario) : '—'}
                          </td>
                          <td className="hidden px-4 py-2.5 lg:table-cell">
                            {sit ? (
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                sit.estado === 'vencido'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {sit.estado === 'vencido' ? 'Vencido' : `Vence em ${sit.dias} d`}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                {forn ? 'sem pendência' : 'fornecedor não cadastrado'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-[18px] py-3 text-xs text-slate-500">
              <span>
                Fornecedor e preço vêm da última entrada lançada
                {repor.length > 10 ? ` · +${repor.length - 10} não exibido(s)` : ''}
              </span>
              <Link to="/almoxarifado" className="font-semibold text-brand-700 hover:underline">
                Ver almoxarifado →
              </Link>
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-3.5">
          {/* Situação documental dos fornecedores */}
          <Card className="p-[18px]">
            <CardTitle sub={`${totalFornecedores} fornecedor(es) sujeito(s) à homologação.`}>
              Fornecedores
            </CardTitle>
            {documentalIndisponivel ? (
              <p className="text-sm text-slate-500">Situação documental indisponível.</p>
            ) : totalFornecedores === 0 ? (
              <EmptyState title="Nenhum fornecedor cadastrado" />
            ) : (
              <>
                <div className="mb-3.5 flex h-3 overflow-hidden rounded-md bg-slate-100">
                  <Faixa n={porStatus.ok} total={totalFornecedores} cor="#059669" />
                  <Faixa n={porStatus.pendente} total={totalFornecedores} cor="#d97706" />
                  <Faixa n={porStatus.sem_documentos} total={totalFornecedores} cor="#dc2626" />
                </div>
                <ul className="flex flex-col gap-2.5">
                  <LinhaStatus cor="#059669" rotulo="Em dia" n={porStatus.ok} />
                  <LinhaStatus cor="#d97706" rotulo="Checklist pendente" n={porStatus.pendente} />
                  <LinhaStatus cor="#dc2626" rotulo="Sem nenhum documento" n={porStatus.sem_documentos} />
                </ul>
              </>
            )}
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>Produtores de mandioca não entram aqui</span>
              <Link to="/gestao-documentos" className="font-semibold text-brand-700 hover:underline">
                Ver fornecedores →
              </Link>
            </div>
          </Card>

          {/* O que este painel ainda não é. */}
          <div className="rounded-[10px] border border-dashed border-slate-300 bg-white px-4 py-3.5 text-xs leading-relaxed text-slate-600">
            <strong className="font-semibold text-slate-800">Sobre "A comprar":</strong> não existe
            requisição nem pedido de compra no sistema. A lista sai do estoque mínimo, então é um
            sinal do que está acabando — não uma fila de pedidos em andamento.
          </div>
        </div>
      </div>
    </>
  );
}

function Faixa({ n, total, cor }: { n: number; total: number; cor: string }) {
  if (n === 0) return null;
  return <div style={{ width: `${(n / total) * 100}%`, background: cor }} />;
}

function LinhaStatus({ cor, rotulo, n }: { cor: string; rotulo: string; n: number }) {
  return (
    <li className="flex items-center justify-between text-[12.5px]">
      <span className="flex items-center gap-2 text-slate-700">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: cor }} />
        {rotulo}
      </span>
      <span className="tabular-nums text-slate-500">{n}</span>
    </li>
  );
}
