// Impressão dos formulários da Qualidade no layout do papel: cabeçalho com a
// empresa, o código e a versão do formulário — o que a auditoria pede.
// Página cheia, fora do Layout, como a impressão do laudo.
//   /imprimir/forno/:registroId        FOR PQSA 8
//   /imprimir/detector/:dia            FOR PQSA 11 1.2
//   /imprimir/imas/:dia                FOR PQSA 09 1.3
//   /imprimir/carga/:recebimentoId     FOR POP 09 1.2 + 1.5
//   /imprimir/expedicao/:cargaId       FOR POP 14 1.1
//   /imprimir/homologacao/:id          FOR POP 07 1.1
//   /imprimir/ferramentas/:colab~ano-mes~lista  Check-list do uso de ferramentas (manutenção)
//   /imprimir/fechamento/:loteCodigo   FOR-CQ-001 (General Mills) / FOR-CQ-002 (Pódium)
import type { ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getFornoRegistro, listLeiturasForno, listPontosControle, getLote, listDetectoresMetais, listVerificacoesDmDoDia,
  listImas, listVerificacoesImaDoDia, getRecebimento, getCarregamento, getCliente, getHomologacao, getFornecedor,
  nomeDoUsuario, getFechamentoDoLote, listColaboradoresPcm, listFerramentasPcm, listEstadosChecklist,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarDataHora } from '../../lib/format';
import {
  desviosLeituraForno, TIPO_TESTE_DM_LABEL, AREAS_IMA, ITENS_INSPECAO_CARGA, TIPO_MP_LABEL, SECOES_EXPEDICAO,
  LIBERACAO_CARGA_LABEL, blocosAplicaveis, resumoHomologacao, STATUS_HOMOLOGACAO_LABEL,
  fechamentoDoLote, limiteTexto, diasNoMes, TIPO_FARINHA_LABEL, TURNO_ANALISE_LABEL,
} from '@sistema/domain';
import type { TipoFarinha, TurnoAnalise } from '@sistema/domain';
import { Spinner, ErroCarregamento } from '../../components/ui';

const EMPRESA = 'INDÚSTRIA E COMÉRCIO DE ALIMENTOS SUMARÉ';
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const R = { c: 'C', nc: 'NC', na: 'N/A' } as const;

function Folha({ codigo, versao, titulo, children, paisagem = false }: { codigo: string; versao: string; titulo: string; children: ReactNode; paisagem?: boolean }) {
  const navegar = useNavigate();
  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      {paisagem && <style>{'@page { size: A4 landscape; margin: 8mm; }'}</style>}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 print:hidden">
        <button type="button" onClick={() => navegar(-1)} className="text-sm text-slate-500 hover:text-slate-800">← Voltar</button>
        <button type="button" onClick={() => window.print()}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Imprimir / Salvar PDF
        </button>
      </div>
      <div className={`mx-auto my-6 ${paisagem ? 'max-w-[297mm]' : 'max-w-[210mm]'} bg-white p-8 text-[12px] text-slate-900 shadow-sm print:my-0 print:p-4 print:shadow-none`}>
        <header className="mb-4 grid grid-cols-[1fr_auto] border border-slate-400">
          <div className="border-r border-slate-400 px-3 py-2">
            <p className="font-bold">{EMPRESA}</p>
            <p className="mt-1 text-[13px] font-semibold uppercase">{titulo}</p>
          </div>
          <div className="px-3 py-2 text-right">
            <p className="font-bold">{codigo}</p>
            <p>{versao}</p>
          </div>
        </header>
        {children}
        <p className="mt-6 text-[10px] text-slate-400">Emitido pelo sistema em {formatarDataHora(new Date().toISOString())}.</p>
      </div>
    </div>
  );
}

function Tabela({ cab, linhas }: { cab: string[]; linhas: ReactNode[][] }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>{cab.map((c) => <th key={c} className="border border-slate-400 bg-slate-100 px-1.5 py-1 text-left text-[10.5px] font-semibold uppercase">{c}</th>)}</tr>
      </thead>
      <tbody>
        {linhas.length === 0 && <tr><td colSpan={cab.length} className="border border-slate-400 px-1.5 py-2 text-center text-slate-400">Sem registros.</td></tr>}
        {linhas.map((l, i) => (
          <tr key={i}>{l.map((c, j) => <td key={j} className="border border-slate-400 px-1.5 py-1 align-top">{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

function Campos({ itens }: { itens: [string, ReactNode][] }) {
  return (
    <dl className="mb-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
      {itens.map(([t, v]) => (
        <div key={t} className="flex gap-1.5"><dt className="font-semibold">{t}:</dt><dd>{v || '—'}</dd></div>
      ))}
    </dl>
  );
}

function Assinatura({ rotulo, nome, quando }: { rotulo: string; nome?: string | null; quando?: string | null }) {
  return (
    <p className="mt-3"><span className="font-semibold">{rotulo}:</span> {nome ?? '______________________________'}{quando ? ` · ${formatarDataHora(quando)}` : ''}</p>
  );
}

export function ImprimirFormularioPage() {
  const { tipo = '', id = '' } = useParams();
  const { data, loading, error } = useAsync(() => carregar(tipo, id), [tipo, id]);
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner className="h-7 w-7 text-brand-600" /></div>;
  if (error) return <ErroCarregamento mensagem={error} />;
  if (!data) return <div className="p-10 text-sm text-red-600">Registro não encontrado.</div>;
  return data;
}

const num = (v: number | null) => (v == null ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: 3 }));

async function carregar(tipo: string, id: string): Promise<ReactNode | null> {
  switch (tipo) {
    case 'ferramentas': {
      const [colabId = '', periodo = '', lista = 'todas'] = id.split('~');
      const [ano, mes] = periodo.split('-').map(Number);
      if (!ano || !mes) return null;
      const [colabs, todas, estados] = await Promise.all([listColaboradoresPcm(), listFerramentasPcm(), listEstadosChecklist(colabId, ano, mes)]);
      const colab = colabs.find((c) => c.id === colabId);
      if (!colab) return null;
      const ferramentas = todas.filter((f) => !f.caixa && (lista === 'todas' || f.tipo === lista));
      const dias = Array.from({ length: diasNoMes(ano, mes) }, (_, i) => i + 1);
      const marca = new Map(estados.map((e) => [`${e.ferramenta_id}|${e.dia}`, e.estado]));
      // "Todas conformes?" do dia: só responde quando todas as ferramentas foram marcadas.
      const conformeNoDia = (d: number) => {
        const v = ferramentas.map((f) => marca.get(`${f.id}|${d}`));
        if (v.some((x) => !x)) return '';
        return v.every((x) => x === 'C') ? 'S' : v.some((x) => x === 'NC') ? 'N' : '';
      };
      const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      const cel = 'border border-slate-400 px-0.5 text-center text-[9px]';
      return (
        <Folha paisagem codigo="Manutenção" versao={lista === 'eletrica' ? 'Elétrica' : lista === 'mecanica' ? 'Mecânica' : 'Ferramentas'}
          titulo="Check-list do uso de ferramentas">
          <Campos itens={[['Nome', colab.nome], ['Mês', `${MESES[mes - 1]} / ${ano}`], ['Setor', colab.setor],
            ['Função', colab.funcao], ['Supervisor responsável', '______________________'], ['Turno', '__________']]} />
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-slate-400 bg-slate-100 px-1 text-left text-[9.5px]">LISTA DE FERRAMENTAS</th>
                <th className="border border-slate-400 bg-slate-100 px-0.5 text-[9.5px]">QTD</th>
                {dias.map((d) => <th key={d} className={`${cel} bg-slate-100 font-semibold`}>{String(d).padStart(2, '0')}</th>)}
              </tr>
            </thead>
            <tbody>
              {ferramentas.map((f) => (
                <tr key={f.id}>
                  <td className="whitespace-nowrap border border-slate-400 px-1 text-[9.5px]">{f.nome}</td>
                  <td className={cel}>{f.qty ?? ''}</td>
                  {dias.map((d) => {
                    const e = marca.get(`${f.id}|${d}`);
                    return <td key={d} className={`${cel} ${e === 'NC' ? 'font-bold text-red-700' : ''}`}>{e ?? ''}</td>;
                  })}
                </tr>
              ))}
              <tr>
                <td colSpan={2} className="border border-slate-400 px-1 text-[9.5px] font-semibold">TODAS FERRAMENTAS CONFORMES?</td>
                {dias.map((d) => <td key={d} className={`${cel} font-semibold`}>{conformeNoDia(d)}</td>)}
              </tr>
            </tbody>
          </table>
          <p className="mt-1.5 text-[10px]">Preencher os campos com C (Conforme), NC (Não Conforme), F (Folga), FE (Férias), A (Atestado) — quando houver NC, reportar ao supervisor responsável o ocorrido.</p>
          <p className="mt-2 text-[11px]"><span className="font-semibold">Observações:</span> ____________________________________________________________________________________________</p>
          <div className="mt-4 grid grid-cols-2 gap-6 text-[11px]">
            <p>Assinatura colaborador: ______________________________ Data: ___/___/______</p>
            <p>Assinatura supervisor: ______________________________ Data: ___/___/______</p>
          </div>
          <div className="mt-4 break-inside-avoid">
            <Tabela cab={['Horário da NC', 'Descrição da não conformidade', 'Tipo de ação', 'Descrição da ação corretiva ou preventiva', 'Responsável pela ação', 'Verificação da eficácia', 'Responsável verificação']}
              linhas={Array.from({ length: 4 }, () => ['', '', '( ) Corretiva  ( ) Preventiva', '', '', 'Horário: ____ ( ) Conforme', ''].map((t) => <span className="block min-h-[22px] text-[9.5px]">{t}</span>))} />
          </div>
        </Folha>
      );
    }
    case 'fechamento': {
      const codigo = decodeURIComponent(id).toUpperCase();
      const { analises, valores } = await getFechamentoDoLote(codigo);
      if (analises.length === 0) return null;
      const a0 = analises[0]!;
      const cliente = a0.cliente_id ? await getCliente(a0.cliente_id) : null;
      const podium = /p[oó]dium/i.test(cliente?.nome ?? '');
      const resumo = fechamentoDoLote(analises, valores);
      const ensaios = resumo.ensaios.map((e) => e.ensaio);
      // Limite de cada ensaio como estava na análise (snapshot).
      const limite = new Map(valores.map((v) => [v.ensaio, limiteTexto(v)]));
      const porAnalise = new Map<string, Map<string, (typeof valores)[number]>>();
      for (const v of valores) {
        const m = porAnalise.get(v.analise_id) ?? new Map();
        m.set(v.ensaio, v);
        porAnalise.set(v.analise_id, m);
      }
      const datas = analises.map((a) => a.data).sort();
      return (
        <Folha codigo={podium ? 'FOR-CQ-002' : 'FOR-CQ-001'} versao={podium ? 'Ver 0.1' : 'Rev. 01'}
          titulo={`Controle de análise de fechamento de lote — ${codigo}`}>
          <Campos itens={[['Cliente', cliente?.nome], ['Produto', a0.tipo_farinha ? TIPO_FARINHA_LABEL[a0.tipo_farinha as TipoFarinha] : null],
            ['Lote', codigo], ['Período', datas[0] === datas[datas.length - 1] ? formatarData(datas[0]!) : `${formatarData(datas[0]!)} a ${formatarData(datas[datas.length - 1]!)}`],
            ['Análises', String(resumo.analises)], ['Reprovadas', String(resumo.reprovadas)]]} />
          <Tabela cab={['Data', 'Hora', 'Turno', 'Bag', ...ensaios.map((e) => `${e} (${limite.get(e) ?? ''})`), 'Cor', 'Odor', 'Aparência', 'Resultado']}
            linhas={analises.map((a) => {
              const vs = porAnalise.get(a.id);
              return [formatarData(a.data), a.horario?.slice(0, 5) ?? '', a.turno ? TURNO_ANALISE_LABEL[a.turno as TurnoAnalise] ?? a.turno : '', a.numero_bag ?? '',
                ...ensaios.map((e) => {
                  const v = vs?.get(e);
                  return v?.conforme === false ? <b className="text-red-700">{num(v.valor)}</b> : num(v?.valor ?? null);
                }),
                a.cor ?? '', a.odor ?? '', a.aparencia ?? '',
                a.conforme ? 'Aprovado' : <b className="text-red-700">{a.motivo ?? 'Reprovado'}</b>];
            })} />
          <p className="mb-1 mt-4 font-semibold uppercase">Resumo do lote</p>
          <Tabela cab={['Ensaio', 'Limite', 'Leituras', 'Mín.', 'Máx.', 'Média', 'Fora do limite']}
            linhas={resumo.ensaios.map((e) => [e.ensaio, limite.get(e.ensaio) ?? '', e.n, num(e.min), num(e.max), num(e.media), e.foraDoLimite || '—'])} />
          <p className="mt-3 text-[13px]"><span className="font-semibold">Conclusão:</span> {resumo.aprovado ? 'Lote APROVADO — todas as análises conformes.' : `Lote com ${resumo.reprovadas} análise(s) reprovada(s) — avaliar destino.`}</p>
          <Assinatura rotulo="Responsável pela Qualidade" />
        </Folha>
      );
    }
    case 'forno': {
      const reg = await getFornoRegistro(id);
      if (!reg) return null;
      const [leituras, pontos, lote, validador] = await Promise.all([
        listLeiturasForno([reg.id]), listPontosControle(), reg.lote_id ? getLote(reg.lote_id) : null,
        reg.validado_por ? nomeDoUsuario(reg.validado_por) : null,
      ]);
      const c1 = pontos.find((p) => p.codigo === 'CCP-01'); const c2 = pontos.find((p) => p.codigo === 'CCP-02');
      const lim = { tempSaidaMin: c1?.limite_min ?? null, tempSaidaMax: c1?.limite_max ?? null, umidadeMax: c2?.limite_max ?? null };
      return (
        <Folha codigo="FOR PQSA 8" versao="Rev. 10" titulo="Registro de monitoramento do forno">
          <Campos itens={[['Data', formatarData(reg.data)], ['Forno', reg.forno], ['Produto', reg.produto], ['Peneira', reg.peneira],
            ['Lote', lote?.codigo], ['Cliente', reg.cliente], ['Embalagem', reg.embalagem]]} />
          <Tabela cab={['Hora', `T. saída °C (PCC mín ${lim.tempSaidaMin ?? '—'})`, 'T. entrada °C', 'Dosadeira Hz', `Umidade % (PCC máx ${lim.umidadeMax ?? '—'})`, 'Nº emb.', 'Ação corretiva']}
            linhas={leituras.map((l) => {
              const dv = desviosLeituraForno(l, lim);
              return [hora(l.registrado_em), l.temp_saida ?? '—', l.temp_entrada ?? '—', l.hz_dosadeira ?? '—', l.umidade ?? '—', l.n_embalagem ?? '—',
                dv.length ? `${dv.join('; ')}. ${l.acao_corretiva ?? ''}` : ''];
            })} />
          <p className="mt-3"><span className="font-semibold">Ocorrências:</span> {reg.observacao ?? '—'}</p>
          <Assinatura rotulo="Validação da Qualidade" nome={validador} quando={reg.validado_em} />
        </Folha>
      );
    }
    case 'detector': {
      const [detectores, verifs] = await Promise.all([listDetectoresMetais(), listVerificacoesDmDoDia(id)]);
      const det = new Map(detectores.map((d) => [d.id, d]));
      const r = (b: boolean) => (b ? 'Detecta/rejeita' : 'NÃO detecta');
      return (
        <Folha codigo="FOR PQSA 11 1.2" versao="Ver 02" titulo={`Registro de verificação do detector de metais — ${formatarData(id)}`}>
          <p className="mb-2">Frequência: a cada 2 horas, início e fim da produção, após parada &gt; 8 h, troca de produto e manutenção. Tolerância de 15 min.</p>
          <Tabela cab={['Hora', 'Detector', 'Teste', 'Ferroso', 'Não ferroso', 'Inox', 'Observação / correção', 'Validado']}
            linhas={verifs.map((v) => [hora(v.registrado_em), det.get(v.detector_id)?.linha ?? '—',
              v.nhp ? 'NHP' : TIPO_TESTE_DM_LABEL[v.tipo_teste], v.nhp ? '—' : r(v.resultado_ferroso), v.nhp ? '—' : r(v.resultado_nao_ferroso), v.nhp ? '—' : r(v.resultado_inox),
              [v.observacao, !v.conforme && `Líder: ${v.lider_informado ?? '—'}; linha parada: ${v.linha_parada ? 'sim' : 'não'}; produção retida: ${v.producao_retida ? 'sim' : 'não'}; ação: ${v.acao_corretiva ?? '—'}`].filter(Boolean).join(' · '),
              v.validado_em ? formatarData(v.validado_em) : ''])} />
        </Folha>
      );
    }
    case 'imas': {
      const [imas, verifs] = await Promise.all([listImas(), listVerificacoesImaDoDia(id)]);
      const porIma = new Map(verifs.map((v) => [v.ima_id, v]));
      return (
        <Folha codigo="FOR PQSA 09 1.3" versao="Ver 01" titulo={`Verificação e limpeza dos ímãs — ${formatarData(id)}`}>
          {AREAS_IMA.map((area) => (
            <div key={area} className="mb-3 break-inside-avoid">
              <p className="mb-1 font-semibold uppercase">{area}</p>
              <Tabela cab={['Ponto', 'Hora', 'Material no ímã', 'Peso (g)', 'Material', 'Ação corretiva', 'Validado']}
                linhas={imas.filter((i) => i.area === area).map((i) => {
                  const v = porIma.get(i.id);
                  return [i.local, v ? hora(v.registrado_em) : '', v ? (v.nhp ? 'NHP' : v.tem_material ? 'Sim' : 'Não') : 'PENDENTE',
                    v?.peso_g ?? '', v?.material ?? '', v?.acao ?? '', v?.validado_em ? formatarData(v.validado_em) : ''];
                })} />
            </div>
          ))}
        </Folha>
      );
    }
    case 'carga': {
      const r = await getRecebimento(id);
      if (!r) return null;
      return (
        <Folha codigo="FOR POP 09 1.2 · 1.5" versao="Ver 02" titulo="Ficha de acompanhamento da descarga e checklist de inspeção da carga">
          <Campos itens={[['Data', formatarData(r.recebido_em)], ['Carga nº', r.numero], ['Turno', r.turno], ['Produtor', r.produtor],
            ['Variedade', r.variedade], ['Tipo de MP', r.tipo_mp ? TIPO_MP_LABEL[r.tipo_mp] : ''], ['Placa', r.placa], ['Ticket', r.ticket],
            ['Descarga', r.hora_inicio ? `${r.hora_inicio.slice(0, 5)} → ${r.hora_fim?.slice(0, 5) ?? '—'}` : ''], ['Toneladas', r.quantidade != null ? (r.quantidade / 1000).toFixed(2) : ''],
            ['Impureza %', r.impureza], ['Cancha (rosca)', r.cancha]]} />
          <Tabela cab={['Renda 1', 'Renda 2', 'Renda 3', 'Renda 4', 'Renda 5', 'Renda média']}
            linhas={[[...[0, 1, 2, 3, 4].map((i) => r.rendas?.[i] ?? ''), r.renda ?? '']]} />
          <p className="mb-1 mt-4 font-semibold uppercase">Checklist de inspeção da carga</p>
          <Tabela cab={['Nº', 'Item avaliado', 'Resultado']}
            linhas={ITENS_INSPECAO_CARGA.map((it, i) => [i + 1, it.texto, r.inspecao?.[it.chave] === 'c' ? 'Conforme' : r.inspecao?.[it.chave] === 'nc' ? 'NÃO CONFORME' : '—'])} />
          <p className="mt-3"><span className="font-semibold">Observações:</span> {r.inspecao_obs ?? '—'}</p>
          <Assinatura rotulo="Responsável pelo recebimento" />
        </Folha>
      );
    }
    case 'expedicao': {
      const c = await getCarregamento(id);
      if (!c) return null;
      const [cliente, lote, liberador] = await Promise.all([
        c.cliente_id ? getCliente(c.cliente_id) : null, c.lote_id ? getLote(c.lote_id) : null,
        c.liberado_por ? nomeDoUsuario(c.liberado_por) : null,
      ]);
      return (
        <Folha codigo="FOR POP 14 1.1" versao="Ver 05" titulo="Checklist de expedição">
          <Campos itens={[['Data', formatarData(c.data)], ['NF', c.nota_fiscal], ['Cliente', cliente?.nome], ['Lote', lote?.codigo],
            ['Quantidade (kg)', c.peso_kg], ['Placa', c.placa], ['Motorista', c.motorista], ['Transportadora', c.transportadora],
            ['Último produto transportado', c.ultimo_produto]]} />
          {SECOES_EXPEDICAO.map((s) => (
            <div key={s.titulo} className="mb-3 break-inside-avoid">
              <p className="mb-1 font-semibold uppercase">{s.titulo}</p>
              <Tabela cab={['Item', 'Critério', 'Avaliação']}
                linhas={s.itens.map((it, i) => [i + 1, it.texto, c.checklist?.[it.chave] ? R[c.checklist[it.chave]!] : '—'])} />
            </div>
          ))}
          <p><span className="font-semibold">Observação (Logística):</span> {c.checklist_obs ?? '—'}</p>
          <p><span className="font-semibold">Observação (Qualidade):</span> {c.inspecao_obs ?? '—'}</p>
          <p className="mt-2"><span className="font-semibold">Expedição aprovada?</span> {c.liberacao ? LIBERACAO_CARGA_LABEL[c.liberacao] : 'Aguardando a Qualidade'}
            {c.liberacao_justificativa ? ` — ${c.liberacao_justificativa}` : ''}</p>
          <Assinatura rotulo="Responsável pela liberação da carga" nome={liberador} quando={c.liberado_em} />
        </Folha>
      );
    }
    case 'homologacao': {
      const h = await getHomologacao(id);
      if (!h) return null;
      const f = await getFornecedor(h.fornecedor_id);
      const organico = h.dados?.tipo_producao === 'organica';
      const resumo = resumoHomologacao(h.questionario ?? {}, organico);
      const d = h.dados ?? {};
      return (
        <Folha codigo="FOR POP 07 1.1" versao="Ver 01" titulo="Homologação de matéria-prima">
          <Campos itens={[['Produtor', f?.razao_social], ['Propriedade', d.propriedade], ['Código do produtor', d.codigo_produtor],
            ['Localização', d.localizacao], ['Variedades cultivadas', d.variedades], ['Comprador', d.comprador],
            ['Tipo de produção', organico ? 'Orgânica' : 'Convencional'], ['Área cultivada', d.area_cultivada], ['Data da avaliação', formatarData(h.avaliado_em)]]} />
          {blocosAplicaveis(organico).map((b) => (
            <div key={b.titulo} className="mb-3 break-inside-avoid">
              <p className="mb-1 font-semibold uppercase">{b.titulo}</p>
              <Tabela cab={['Nº', 'Ponto de verificação', 'Resultado']}
                linhas={b.itens.map((i) => {
                  const resp = h.questionario?.[String(i.n)];
                  const cit = h.citacoes?.[String(i.n)];
                  return [i.n, cit ? `${i.texto} — ${cit}` : i.texto, resp ? R[resp] : '—'];
                })} />
            </div>
          ))}
          <p><span className="font-semibold">Agrotóxicos declarados:</span> {h.agrotoxicos?.join(', ') ?? '—'}</p>
          <p><span className="font-semibold">Observações:</span> {h.observacao ?? '—'}</p>
          <p className="mt-2"><span className="font-semibold">Resultado:</span> {resumo.pontuacao ?? '—'}% conforme · {STATUS_HOMOLOGACAO_LABEL[h.status]}{h.validade ? ` · válida até ${formatarData(h.validade)}` : ''}</p>
          <Assinatura rotulo="Assinatura do comprador" />
          <Assinatura rotulo="Assinatura do produtor" />
        </Folha>
      );
    }
    default:
      return null;
  }
}
