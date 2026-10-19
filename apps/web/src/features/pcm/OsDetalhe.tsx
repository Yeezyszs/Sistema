// Detalhe da O.S. — usado pela manutenção (lista de O.S.) e pela Qualidade
// (fila de liberação). É aqui que a Qualidade libera ou devolve uma O.S. com
// risco à segurança de alimentos.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { atualizarOrdemPcm, anexarVariosNaOs, nomeDoUsuario } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { useAuth } from '../../lib/auth';
import { formatarData, formatarDataHora } from '../../lib/format';
import { PRIORIDADE_OS_PCM_TOM, STATUS_OS_PCM_TOM, podeConcluirOs } from '@sistema/domain';
import type { OrdemPcm } from '@sistema/domain';
import { Button, Field, Modal, TextArea } from '../../components/ui';
import { IconDoc } from '../../components/icons';
import { useToast } from '../../components/Toast';
import { EscolherAnexos, GaleriaAnexos } from './AnexosOs';

export function ModalVerOs({ os, onClose, onEditar, onConcluir, onExcluir, onMudou }: {
  os: OrdemPcm;
  onClose: () => void;
  /** Ausentes na tela da Qualidade: lá só se libera ou devolve. */
  onEditar?: () => void;
  onConcluir?: () => void;
  onExcluir?: () => void;
  onMudou?: () => void;
}) {
  const { perfis } = useAuth();
  const { sucesso, erro } = useToast();
  const emAberto = os.status === 'Em Aberto';
  const aguardando = os.status === 'Aguardando Qualidade';
  const ehQualidade = perfis.includes('qualidade');

  const { data: liberadoPor } = useAsync(
    async () => (os.liberado_por ? nomeDoUsuario(os.liberado_por) : null),
    [os.liberado_por],
  );

  // ── Liberação pela Qualidade ──
  const [obs, setObs] = useState('');
  const [anexos, setAnexos] = useState<File[]>([]);
  const [salvando, setSalvando] = useState<'liberar' | 'devolver' | null>(null);
  const [recarregarGaleria, setRecarregarGaleria] = useState(0);

  async function decidir(acao: 'liberar' | 'devolver') {
    // Devolver sem dizer o porquê deixa a manutenção adivinhando o que refazer.
    if (acao === 'devolver' && !obs.trim()) {
      erro('Diga o que precisa ser corrigido antes de devolver à manutenção.');
      return;
    }
    setSalvando(acao);
    try {
      if (anexos.length > 0) await anexarVariosNaOs(os.id, 'liberacao', anexos);
      await atualizarOrdemPcm(os.id, {
        status: acao === 'liberar' ? 'Concluído' : 'Em Aberto',
        liberacao_obs: obs.trim() || null,
      });
      sucesso(acao === 'liberar'
        ? `O.S. ${os.numero} liberada — equipamento pode voltar à produção.`
        : `O.S. ${os.numero} devolvida à manutenção.`);
      setRecarregarGaleria((n) => n + 1);
      onMudou?.();
      onClose();
    } catch (e) { erro(e instanceof Error ? e.message : 'Falha.'); }
    finally { setSalvando(null); }
  }

  // Botão de concluir: para O.S. com risco, quem não é Qualidade "encerra o
  // serviço" — a O.S. vai para a fila de liberação, não se fecha.
  const rotuloConcluir = podeConcluirOs(os, perfis) ? 'Concluir' : 'Encerrar serviço';

  return (
    <Modal open onClose={onClose} title={`O.S. ${os.numero}`} size="lg">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_OS_PCM_TOM[os.status]}`}>
          {os.status}
        </span>
        {os.risco_seguranca_alimentos && (
          <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white">
            Risco à segurança de alimentos
          </span>
        )}
        {os.prioridade && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORIDADE_OS_PCM_TOM[os.prioridade]}`}>
            {os.prioridade}
          </span>
        )}
        {os.parada_equip && (
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">Equipamento parado</span>
        )}
        {os.parada_prod && (
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">Produção parada</span>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Dado t="Data" v={formatarData(os.data)} />
        <Dado t="Hora" v={os.hora?.slice(0, 5) ?? '—'} />
        <Dado t="Setor" v={os.setor ?? '—'} />
        <Dado t="Requisitante" v={os.req ?? '—'} />
        <Dado t="Tipo" v={os.tipo ?? '—'} />
        <Dado t="Demanda" v={os.natureza ?? '—'} />
        <Dado t="Programada para" v={os.data_prog ? formatarData(os.data_prog) : '—'} />
        <Dado t="Concluída em" v={os.data_concl ? formatarData(os.data_concl) : '—'} />
      </dl>

      <Texto titulo="Descrição do serviço">{os.descricao}</Texto>
      <Texto titulo="Serviço realizado" vazio="Ainda não preenchido.">{os.realizado}</Texto>
      {os.exec && <Texto titulo="Executante">{os.exec}</Texto>}

      <div className="mt-4">
        <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Fotos e vídeos</p>
        <GaleriaAnexos osId={os.id} recarregar={recarregarGaleria} onErro={erro}
          podeExcluir={emAberto} podeDetalhar={!ehQualidade || perfis.includes('manutencao')} />
      </div>

      {/* Liberação já feita */}
      {os.risco_seguranca_alimentos && os.status === 'Concluído' && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-900">
          <span className="font-semibold">Liberado pela Qualidade</span>
          {os.liberado_em && <> em {formatarDataHora(os.liberado_em)}</>}
          {liberadoPor && <> por {liberadoPor}</>}.
          {os.liberacao_obs && <p className="mt-1 text-emerald-800">{os.liberacao_obs}</p>}
        </div>
      )}

      {/* Devolvida pela Qualidade: a manutenção precisa ver o porquê. */}
      {os.risco_seguranca_alimentos && emAberto && os.liberacao_obs && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900">
          <span className="font-semibold">Devolvida pela Qualidade:</span> {os.liberacao_obs}
        </div>
      )}

      {/* Fila de liberação */}
      {aguardando && !ehQualidade && (
        <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5 text-[13px] text-violet-900">
          Serviço encerrado. O equipamento só volta à produção depois que a Qualidade inspecionar e liberar esta O.S.
        </div>
      )}
      {aguardando && ehQualidade && (
        <div className="mt-5 space-y-3 rounded-lg border border-violet-300 bg-violet-50/60 p-3">
          <p className="text-sm font-semibold text-violet-900">Liberação da Qualidade</p>
          <Field label="Observação da inspeção">
            <TextArea value={obs} onChange={(e) => setObs(e.target.value)}
              placeholder="O que foi conferido. Obrigatório para devolver." />
          </Field>
          <EscolherAnexos arquivos={anexos} onChange={setAnexos} onErro={erro} titulo="Evidência da inspeção" />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" loading={salvando === 'devolver'}
              disabled={salvando !== null} onClick={() => void decidir('devolver')}>
              Devolver à manutenção
            </Button>
            <Button type="button" loading={salvando === 'liberar'}
              disabled={salvando !== null} onClick={() => void decidir('liberar')}>
              Liberar equipamento
            </Button>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
        {onExcluir && <Button type="button" variant="ghost" onClick={onExcluir}>Excluir</Button>}
        <Link to={`/pcm-os/${os.id}/imprimir`}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <IconDoc width={15} height={15} /> Imprimir
        </Link>
        {onEditar && <Button type="button" variant="outline" onClick={onEditar}>Editar</Button>}
        {emAberto && onConcluir && <Button type="button" onClick={onConcluir}>{rotuloConcluir}</Button>}
      </div>
    </Modal>
  );
}

function Dado({ t, v }: { t: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{t}</dt>
      <dd className="mt-0.5 break-words text-[13px] font-medium text-slate-800">{v}</dd>
    </div>
  );
}

function Texto({ titulo, children, vazio = '—' }: {
  titulo: string; children: string | null; vazio?: string;
}) {
  return (
    <div className="mt-4">
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{titulo}</p>
      <p className={`mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-[13px] ${children ? 'text-slate-800' : 'text-slate-400'}`}>
        {children || vazio}
      </p>
    </div>
  );
}
