import { Link, useParams } from 'react-router-dom';
import { getOrdemPcm, getExecucoesDaOs } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData } from '../../lib/format';
import { Spinner } from '../../components/ui';
import { IconArrowLeft, IconLeaf } from '../../components/icons';

// Formulário de O.S. para impressão (A4 paisagem) — espelha o template do PCM.
export function PcmOsPrint() {
  const { id = '' } = useParams();
  const { data, loading } = useAsync(async () => {
    const os = await getOrdemPcm(id);
    const execucoes = os ? await getExecucoesDaOs(id) : [];
    return { os, execucoes };
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>;
  if (!data?.os) return <p className="p-8 text-sm text-slate-500">O.S. não encontrada.</p>;
  const { os, execucoes } = data;

  return (
    <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <style>{'@media print { @page { size: A4 landscape; margin: 10mm; } .no-print { display: none !important; } }'}</style>

      <div className="no-print mx-auto mb-4 flex max-w-4xl items-center justify-between">
        <Link to="/manutencao" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <IconArrowLeft width={16} height={16} /> O.S.
        </Link>
        <button onClick={() => window.print()} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Imprimir
        </button>
      </div>

      <div className="mx-auto max-w-4xl border border-slate-300 bg-white p-6 text-sm text-slate-800 print:border-0">
        {/* Cabeçalho */}
        <div className="mb-4 flex items-center justify-between border-b-2 border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded bg-brand-700 text-white"><IconLeaf width={22} height={22} /></span>
            <div>
              <p className="font-bold leading-tight">INDÚSTRIA E COMÉRCIO ALIMENTOS SUMARÉ</p>
              <p className="text-xs text-slate-500">Bepi Mataruco · Manutenção — PCM</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">ORDEM DE SERVIÇO</p>
            <p className="font-mono text-2xl font-bold">Nº {String(os.numero).padStart(4, '0')}</p>
          </div>
        </div>

        {/* Dados */}
        <div className="mb-4 grid grid-cols-4 gap-x-6 gap-y-2">
          <Campo t="Data" v={formatarData(os.data)} />
          <Campo t="Hora" v={os.hora?.slice(0, 5) ?? '—'} />
          <Campo t="Requisitante" v={os.req ?? '—'} />
          <Campo t="Setor" v={os.setor ?? '—'} />
          <Campo t="Tipo" v={os.tipo ?? '—'} />
          <Campo t="Demanda" v={os.natureza ?? '—'} />
          <Campo t="Prioridade" v={os.prioridade ?? '—'} />
          <Campo t="Programada para" v={os.data_prog ? formatarData(os.data_prog) : '—'} />
        </div>

        <Bloco titulo="Descrição do serviço">{os.descricao ?? '—'}</Bloco>
        <Bloco titulo="Serviço realizado">{os.realizado ?? ''}</Bloco>

        {/* Paradas */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="border border-slate-300 p-2">
            <p className="mb-1 text-xs font-bold uppercase">Parada de equipamento: {os.parada_equip ? 'SIM' : 'NÃO'}</p>
            {os.parada_equip && (
              <p className="text-xs">
                Início {os.parada_equip_ini ? formatarData(os.parada_equip_ini) : '—'} {os.parada_equip_ini_h?.slice(0, 5) ?? ''} ·
                Retorno {os.parada_equip_ret ? formatarData(os.parada_equip_ret) : '—'} {os.parada_equip_ret_h?.slice(0, 5) ?? ''}
              </p>
            )}
          </div>
          <div className="border border-slate-300 p-2">
            <p className="mb-1 text-xs font-bold uppercase">Parada de produção: {os.parada_prod ? 'SIM' : 'NÃO'}</p>
            {os.parada_prod && (
              <p className="text-xs">
                Início {os.parada_prod_ini ? formatarData(os.parada_prod_ini) : '—'} {os.parada_prod_ini_h?.slice(0, 5) ?? ''} ·
                Retorno {os.parada_prod_ret ? formatarData(os.parada_prod_ret) : '—'} {os.parada_prod_ret_h?.slice(0, 5) ?? ''}
              </p>
            )}
          </div>
        </div>

        {/* Execução */}
        <p className="mb-1 text-xs font-bold uppercase">Execução</p>
        <table className="mb-6 w-full border-collapse text-xs">
          <thead>
            <tr>
              {['Mantenedor', 'Início', 'Hora', 'Fim', 'Hora', 'Fechamento', 'Assinatura'].map((h) => (
                <th key={h} className="border border-slate-400 bg-slate-100 px-2 py-1 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(execucoes.length > 0 ? execucoes : [null, null]).map((ex, i) => (
              <tr key={ex?.id ?? i}>
                <td className="border border-slate-400 px-2 py-2">{ex?.mantenedor ?? ''}</td>
                <td className="border border-slate-400 px-2 py-2">{ex?.data_exec ? formatarData(ex.data_exec) : ''}</td>
                <td className="border border-slate-400 px-2 py-2">{ex?.hora_ini?.slice(0, 5) ?? ''}</td>
                <td className="border border-slate-400 px-2 py-2">{ex?.data_fim ? formatarData(ex.data_fim) : ''}</td>
                <td className="border border-slate-400 px-2 py-2">{ex?.hora_fim?.slice(0, 5) ?? ''}</td>
                <td className="border border-slate-400 px-2 py-2">{ex?.data_fech ? formatarData(ex.data_fech) : ''}</td>
                <td className="border border-slate-400 px-2 py-2"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Assinaturas */}
        <div className="grid grid-cols-2 gap-12 pt-6">
          <div className="border-t border-slate-500 pt-1 text-center text-xs">Requisitante</div>
          <div className="border-t border-slate-500 pt-1 text-center text-xs">Supervisor de Manutenção</div>
        </div>
      </div>
    </div>
  );
}

function Campo({ t, v }: { t: string; v: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t}</p>
      <p className="font-medium">{v}</p>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: string }) {
  return (
    <div className="mb-4">
      <p className="mb-1 text-xs font-bold uppercase">{titulo}</p>
      <div className="min-h-[48px] border border-slate-300 p-2">{children}</div>
    </div>
  );
}
