// Liberação pós-manutenção — a fila da Qualidade.
//
// O.S. com risco à segurança de alimentos não se fecha na mão da manutenção:
// ela encerra o serviço e a O.S. cai aqui. A Qualidade inspeciona o
// equipamento, olha as fotos do fechamento e libera — ou devolve dizendo o que
// falta. Só depois disso o equipamento volta à produção.
import { useState } from 'react';
import { listOrdensPcm } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarDataHora } from '../../lib/format';
import { PRIORIDADE_OS_PCM_TOM } from '@sistema/domain';
import type { OrdemPcm } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, ErroCarregamento } from '../../components/ui';
import { useAbaUrl } from '../../lib/useAbaUrl';
import { ModalVerOs } from '../pcm/OsDetalhe';

const ABAS = ['aguardando', 'liberadas', 'em_execucao'] as const;
type Aba = (typeof ABAS)[number];

export function LiberacaoOsPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [vendo, setVendo] = useState<OrdemPcm | null>(null);
  const [aba, setAba] = useAbaUrl('aba', ABAS, 'aguardando');

  const { data, loading, error } = useAsync(async () => {
    const ordens = await listOrdensPcm();
    return ordens.filter((o) => o.risco_seguranca_alimentos);
  }, [recarregar]);

  const aguardando = (data ?? []).filter((o) => o.status === 'Aguardando Qualidade');
  const liberadas = (data ?? [])
    .filter((o) => o.status === 'Concluído')
    .sort((a, b) => (b.liberado_em ?? '').localeCompare(a.liberado_em ?? ''));
  // Ainda com a manutenção: a Qualidade vê o que está vindo, sem poder agir.
  const emExecucao = (data ?? []).filter((o) => o.status === 'Em Aberto');

  const linhas = aba === 'aguardando' ? aguardando : aba === 'liberadas' ? liberadas.slice(0, 50) : emExecucao;

  const abas: [Aba, string, number][] = [
    ['aguardando', 'Aguardando liberação', aguardando.length],
    ['em_execucao', 'Em execução', emExecucao.length],
    ['liberadas', 'Liberadas', liberadas.length],
  ];

  return (
    <>
      <PageHeader grupo="Qualidade"
        title="Liberação pós-manutenção"
        subtitle={aguardando.length > 0
          ? `${aguardando.length} equipamento(s) esperando liberação para voltar à produção`
          : 'O.S. com risco à segurança de alimentos — só a Qualidade libera'}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {abas.map(([id, rotulo, n]) => (
          <button key={id} onClick={() => setAba(id)}
            className={`rounded-full border px-3.5 py-[7px] text-[12.5px] font-semibold transition ${
              aba === id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}>
            {rotulo}
            <span className={`ml-1.5 rounded-full px-1.5 text-[11px] ${
              aba === id ? 'bg-white/20' : id === 'aguardando' && n > 0 ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-500'
            }`}>{n}</span>
          </button>
        ))}
      </div>

      {error && <ErroCarregamento mensagem={error} />}
      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}
      {data && linhas.length === 0 && (
        <EmptyState
          title={aba === 'aguardando' ? 'Nada esperando liberação' : aba === 'liberadas' ? 'Nenhuma liberação ainda' : 'Nenhuma O.S. em execução'}
          description={aba === 'aguardando'
            ? 'Quando a manutenção encerrar um serviço com risco à segurança de alimentos, ele aparece aqui.'
            : undefined} />
      )}

      {data && linhas.length > 0 && (
        <div className="space-y-2.5">
          {linhas.map((o) => (
            <Card key={o.id} className="p-0">
              <button onClick={() => setVendo(o)} className="w-full px-4 py-3 text-left transition hover:bg-slate-50">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className="text-[13.5px] font-bold text-slate-900">
                    O.S. {o.numero}
                    <span className="ml-2 text-[12px] font-medium text-slate-500">{o.setor ?? 'sem setor'}</span>
                  </span>
                  <span className="text-[11.5px] text-slate-400">
                    {aba === 'liberadas' && o.liberado_em
                      ? `liberada em ${formatarDataHora(o.liberado_em)}`
                      : `aberta em ${formatarData(o.data)}`}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] text-slate-700">{o.descricao ?? 'Sem descrição'}</p>
                {o.realizado && (
                  <p className="mt-1 line-clamp-1 text-[12px] text-slate-500">Feito: {o.realizado}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {o.prioridade && (
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORIDADE_OS_PCM_TOM[o.prioridade]}`}>
                      {o.prioridade}
                    </span>
                  )}
                  {o.parada_prod && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">Produção parada</span>
                  )}
                  {o.exec && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{o.exec}</span>
                  )}
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}

      {vendo && (
        <ModalVerOs os={vendo} onClose={() => setVendo(null)} onMudou={() => setRecarregar((n) => n + 1)} />
      )}
    </>
  );
}
