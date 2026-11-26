import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listColaboradoresPcm, listFerramentasPcm, listEstadosChecklist, salvarEstadoChecklist,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import {
  ESTADO_CHECKLIST, ESTADO_CHECKLIST_LABEL, ESTADO_CHECKLIST_TOM,
  proximoEstadoChecklist, diasNoMes,
} from '@sistema/domain';
import type { EstadoChecklist } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Field, Select, ErroCarregamento } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../lib/auth';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const chave = (ferramentaId: string, dia: number) => `${ferramentaId}|${dia}`;
// Só usado nos cliques e ao mesclar leituras, nunca para desenhar a tela.
const agoraMs = () => Date.now();

export function PcmChecklistPage() {
  const hoje = new Date();
  const [colaboradorId, setColaboradorId] = useState('');
  // Lista do formulário: Elétrica, Mecânica ou Encarregado (uma folha cada).
  const [lista, setLista] = useState<'' | 'eletrica' | 'mecanica' | 'encarregado'>('');
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  // Estado local por célula (ferramenta|dia -> estado), sincronizado do banco.
  const [estados, setEstados] = useState<Map<string, EstadoChecklist>>(new Map());
  const { erro } = useToast();
  // Só Qualidade, Manutenção e Almoxarifado marcam o checklist; os demais só consultam.
  // O banco aplica a mesma regra (manutencao.pode_editar_checklist).
  const { perfis } = useAuth();
  const podeEditar = perfis.some((p) => p === 'qualidade' || p === 'manutencao' || p === 'almoxarifado');

  const { data, loading, error } = useAsync(async () => {
    const [colaboradores, ferramentas] = await Promise.all([
      listColaboradoresPcm(), listFerramentasPcm(),
    ]);
    const doChecklist = ferramentas.filter((f) => !f.caixa); // caixa null = tipo checklist
    const linhas = colaboradorId ? await listEstadosChecklist(colaboradorId, ano, mes) : [];
    return { colaboradores, todas: doChecklist, linhas };
  }, [colaboradorId, ano, mes]);

  // Cliques recentes ainda não confirmados pela leitura do banco. A tela
  // recarrega sozinha (tempo real, voltar à aba) e a leitura pode ter saído
  // antes de as gravações terminarem: sem isto, ela devolvia a foto antiga e
  // apagava da tela o que o usuário acabou de marcar — embora estivesse salvo.
  const locais = useRef(new Map<string, { estado: EstadoChecklist | null; em: number }>());
  // Gravações em fila por célula, para dois cliques rápidos não chegarem
  // ao banco fora de ordem.
  const filas = useRef(new Map<string, Promise<void>>());

  useEffect(() => { locais.current.clear(); }, [colaboradorId, ano, mes]);

  // Recarrega o mapa local sempre que os dados do período mudam, mantendo por
  // cima os cliques recentes que a leitura ainda não trouxe.
  useEffect(() => {
    const m = new Map<string, EstadoChecklist>();
    for (const l of data?.linhas ?? []) m.set(chave(l.ferramenta_id, l.dia), l.estado);
    const agora = agoraMs();
    for (const [k, v] of locais.current) {
      if ((m.get(k) ?? null) === v.estado || agora - v.em > 60_000) { locais.current.delete(k); continue; }
      if (v.estado === null) m.delete(k); else m.set(k, v.estado);
    }
    setEstados(m);
  }, [data?.linhas]);

  const dias = diasNoMes(ano, mes);
  // Sem escolha, a lista segue a função do colaborador (técnico mecânico →
  // mecânica); quem não tem função definida vê todas.
  const colaborador = data?.colaboradores.find((c) => c.id === colaboradorId);
  const funcao = (colaborador?.funcao ?? '').toLowerCase();
  const listaEfetiva = lista || (funcao.includes('encarreg') ? 'encarregado' : funcao.includes('mec') ? 'mecanica' : funcao.includes('elét') || funcao.includes('elet') ? 'eletrica' : '');
  const ferramentas = (data?.todas ?? []).filter((f) => !listaEfetiva || f.tipo === listaEfetiva);
  const anos = [hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1];

  async function clicar(ferramentaId: string, dia: number) {
    if (!colaboradorId || !podeEditar) return;
    const k = chave(ferramentaId, dia);
    const atual = estados.get(k) ?? null;
    const proximo = proximoEstadoChecklist(atual);
    locais.current.set(k, { estado: proximo, em: agoraMs() });
    // Otimista
    setEstados((prev) => {
      const n = new Map(prev);
      if (proximo === null) n.delete(k); else n.set(k, proximo);
      return n;
    });
    try {
      const anterior = filas.current.get(k) ?? Promise.resolve();
      const gravacao = anterior.catch(() => undefined)
        .then(() => salvarEstadoChecklist(colaboradorId, ferramentaId, ano, mes, dia, proximo));
      filas.current.set(k, gravacao);
      await gravacao;
    } catch (err) {
      locais.current.delete(k);
      // Reverte em caso de falha
      setEstados((prev) => {
        const n = new Map(prev);
        if (atual === null) n.delete(k); else n.set(k, atual);
        return n;
      });
      erro(err instanceof Error ? err.message : 'Falha ao salvar.');
    }
  }

  return (
    <>
      <PageHeader grupo="Manutenção"
        title="Checklist de ferramentas"
        subtitle="Verificação diária por colaborador — grade mensal (PCM)"
      />

      {!podeEditar && (
        <p className="mb-4 rounded-lg bg-slate-100 px-4 py-2 text-[13px] text-slate-600">
          Somente consulta — só a Qualidade, a Manutenção e o Almoxarifado podem marcar o checklist.
        </p>
      )}

      {/* Filtros */}
      <div className="mb-4 grid gap-3 sm:grid-cols-4 lg:max-w-3xl">
        <Field label="Colaborador">
          <Select value={colaboradorId} onChange={(e) => setColaboradorId(e.target.value)}>
            <option value="">Selecione…</option>
            {(data?.colaboradores ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </Select>
        </Field>
        <Field label="Ferramentas">
          <Select value={listaEfetiva} onChange={(e) => setLista(e.target.value as typeof lista)}>
            <option value="">Todas</option>
            <option value="mecanica">Mecânica</option>
            <option value="eletrica">Elétrica</option>
            <option value="encarregado">Encarregado</option>
          </Select>
        </Field>
        <Field label="Mês">
          <Select value={mes} onChange={(e) => setMes(Number(e.target.value))}>
            {MESES.map((nome, i) => <option key={nome} value={i + 1}>{nome}</option>)}
          </Select>
        </Field>
        <Field label="Ano">
          <Select value={ano} onChange={(e) => setAno(Number(e.target.value))}>
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
        </Field>
      </div>

      {/* Legenda */}
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {ESTADO_CHECKLIST.map((e) => (
          <span key={e} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${ESTADO_CHECKLIST_TOM[e]}`}>
            <span className="font-bold">{e}</span> {ESTADO_CHECKLIST_LABEL[e]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-slate-400 ring-1 ring-slate-200">
          Clique numa célula para avançar o estado
        </span>
        {colaboradorId && (
          <Link to={`/imprimir/ferramentas/${colaboradorId}~${ano}-${mes}~${listaEfetiva || 'todas'}`}
            className="ml-auto inline-flex items-center rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
            Imprimir checklist
          </Link>
        )}
      </div>

      {error && <ErroCarregamento mensagem={error} />}
      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}

      {data && !colaboradorId && (
        <EmptyState title="Selecione um colaborador" description="Escolha o colaborador para preencher a grade do mês." />
      )}

      {data && colaboradorId && ferramentas.length === 0 && (
        <EmptyState title="Nenhuma ferramenta de checklist" description="Cadastre ferramentas sem caixa (tipo checklist) em Cadastros (PCM)." />
      )}

      {data && colaboradorId && ferramentas.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="min-w-max text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-400">
                <th className="sticky left-0 z-10 bg-white px-3 py-[11px] text-left">Ferramenta</th>
                {Array.from({ length: dias }, (_, i) => i + 1).map((d) => (
                  <th key={d} className="w-8 px-0 py-[11px] text-center">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ferramentas.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50/60">
                  <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium text-slate-700 whitespace-nowrap">
                    {f.nome}
                    {f.tipo && <span className="ml-1.5 text-xs font-normal text-slate-400">{f.tipo}</span>}
                  </td>
                  {Array.from({ length: dias }, (_, i) => i + 1).map((d) => {
                    const estado = estados.get(chave(f.id, d)) ?? null;
                    return (
                      <td key={d} className="p-0.5 text-center">
                        <button
                          onClick={() => void clicar(f.id, d)}
                          disabled={!podeEditar}
                          title={estado ? ESTADO_CHECKLIST_LABEL[estado] : 'Vazio'}
                          className={`h-7 w-7 rounded text-xs font-bold transition ${
                            estado ? ESTADO_CHECKLIST_TOM[estado] : 'bg-slate-50 text-slate-300 hover:bg-slate-100'
                          } ${podeEditar ? '' : 'cursor-default'}`}
                        >
                          {estado ?? '·'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
