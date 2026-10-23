// Central da Qualidade: o que está esperando a Qualidade hoje e o atalho para
// cada formulário. Cada contador abre a tela onde a pendência se resolve.
import { Link } from 'react-router-dom';
import {
  listDetectoresMetais, listVerificacoesDMDesde, listImas, listVerificacoesImaDesde, listFornoRegistros,
  listCarregamentos, listOrdensPcm, listRecebimentosPeriodo, listReprocessos, listHomologacoes,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { hojeLocalISO } from '../../lib/format';
import {
  situacaoDetector, imasPendentesNoDia, situacaoExpedicao, itensNaoConformes, retidoVencendo,
} from '@sistema/domain';
import { Card, Spinner } from '../../components/ui';

interface Pendencia { n: number; label: string; to: string; tom: 'critico' | 'alerta' | 'info' }

const TOM: Record<Pendencia['tom'], string> = {
  critico: 'border-red-200 bg-red-50 text-red-800',
  alerta: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-slate-200 bg-white text-slate-700',
};

// Os formulários da Qualidade, na ordem do fluxo da farinha.
const FORMULARIOS: { codigo: string; nome: string; to: string }[] = [
  { codigo: 'FOR POP 07 1.1', nome: 'Homologação de produtor', to: '/fornecedores?aba=homologacao' },
  { codigo: 'FOR POP 09 1.2 / 1.5', nome: 'Descarga e inspeção da carga', to: '/recebimentos' },
  { codigo: 'FOR PQSA 8', nome: 'Monitoramento do forno', to: '/pcc-fisico?aba=forno' },
  { codigo: 'FOR PQSA 11 1.2', nome: 'Detector de metais', to: '/pcc-fisico?aba=detector' },
  { codigo: 'FOR PQSA 09 1.3', nome: 'Ímãs', to: '/pcc-fisico?aba=imas' },
  { codigo: 'FOR PQSA 08 1.2 / 1.3', nome: 'Retidos, resíduos e tipo 2', to: '/reprocesso' },
  { codigo: 'Laudo interno', nome: 'Especificações e laudos', to: '/especificacoes' },
  { codigo: 'FOR POP 14 1.1', nome: 'Checklist de expedição', to: '/expedicao' },
  { codigo: 'FOR POP 08 1.6', nome: 'Rastrear lote / recolhimento', to: '/rastrear' },
  { codigo: '—', nome: 'Liberação pós-manutenção', to: '/liberacao-os' },
];

export function CentralQualidade() {
  const { data, loading } = useAsync(async () => {
    const hoje = hojeLocalISO();
    const seteDias = new Date(Date.now() - 7 * 86_400_000);
    const desde = seteDias.toISOString();
    const em30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    // Cada fonte falha sozinha: uma tabela fora do ar não apaga a central toda.
    const ok = <T,>(p: Promise<T[]>) => p.catch(() => [] as T[]);
    const [detectores, verifsDm, imas, verifsIma, forno, cargas, os, recebimentos, retidos, homolog] = await Promise.all([
      ok(listDetectoresMetais()), ok(listVerificacoesDMDesde(desde)), ok(listImas()), ok(listVerificacoesImaDesde(desde)),
      ok(listFornoRegistros()), ok(listCarregamentos()), ok(listOrdensPcm()),
      ok(listRecebimentosPeriodo(hojeLocalISO(seteDias), hoje)), ok(listReprocessos()), ok(listHomologacoes()),
    ]);
    // Homologação mais recente de cada produtor.
    const ultima = new Map<string, (typeof homolog)[number]>();
    for (const h of homolog) if (!ultima.has(h.fornecedor_id)) ultima.set(h.fornecedor_id, h);
    const pendencias: Pendencia[] = [
      { n: cargas.filter((c) => situacaoExpedicao(c) === 'aguardando_qualidade').length, label: 'Cargas aguardando inspeção', to: '/expedicao', tom: 'critico' },
      { n: os.filter((o) => o.status === 'Aguardando Qualidade').length, label: 'Equipamentos aguardando liberação', to: '/liberacao-os', tom: 'critico' },
      { n: detectores.filter((d) => situacaoDetector(verifsDm.find((v) => v.detector_id === d.id) ?? null).situacao === 'atrasado').length, label: 'Detector com teste atrasado', to: '/pcc-fisico?aba=detector', tom: 'critico' },
      { n: recebimentos.filter((r) => itensNaoConformes(r.inspecao).length > 0).length, label: 'Cargas de MP com NC (7 dias)', to: '/recebimentos', tom: 'critico' },
      { n: verifsDm.filter((v) => !v.validado_em).length + verifsIma.filter((v) => !v.validado_em).length
          + forno.filter((r) => !r.validado_em && r.data < hoje).length, label: 'Registros de PCC a validar', to: '/pcc-fisico', tom: 'alerta' },
      { n: imasPendentesNoDia(imas.filter((i) => i.area), verifsIma, hoje).length, label: 'Ímãs a verificar hoje', to: '/pcc-fisico?aba=imas', tom: 'info' },
      { n: retidos.filter((r) => retidoVencendo(r, hoje)).length, label: 'Retidos com shelf life vencendo', to: '/reprocesso', tom: 'alerta' },
      { n: [...ultima.values()].filter((h) => h.status === 'qualificado' && h.validade && h.validade <= em30).length, label: 'Homologações vencendo (30 dias)', to: '/fornecedores?aba=homologacao', tom: 'alerta' },
    ];
    return pendencias;
  }, []);

  const abertas = (data ?? []).filter((p) => p.n > 0);

  return (
    <div className="mb-6 space-y-4">
      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Pendências da Qualidade</h2>
        {loading && <Spinner className="h-5 w-5 text-brand-600" />}
        {data && abertas.length === 0 && <p className="text-[13px] text-emerald-700">Nada pendente agora.</p>}
        {abertas.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {abertas.map((p) => (
              <Link key={p.label} to={p.to} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition hover:shadow-sm ${TOM[p.tom]}`}>
                <span className="text-[13px] font-medium">{p.label}</span>
                <span className="text-xl font-semibold">{p.n}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Formulários</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {FORMULARIOS.map((f) => (
            <Link key={f.to} to={f.to} className="rounded-lg border border-slate-200 px-3 py-2 transition hover:border-brand-300 hover:bg-brand-50">
              <span className="block text-[13px] font-medium text-slate-800">{f.nome}</span>
              <span className="text-[11px] text-slate-400">{f.codigo}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
