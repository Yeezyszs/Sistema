// Checklist de expedição (FOR POP 14 1.1). A Logística responde as seções 1
// e 2; a Qualidade, as seções 3 e 4 e o resultado. Só a Qualidade libera — o
// banco recusa qualquer outro perfil.
import { useState } from 'react';
import { atualizarCarregamento, getLaudosDoLote } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { useAuth } from '../../lib/auth';
import { formatarData, formatarDataHora } from '../../lib/format';
import {
  SECOES_EXPEDICAO, LIBERACAO_CARGA_LABEL, pendentesExpedicao, ncsExpedicao, liberacoesPermitidas,
} from '@sistema/domain';
import type { Carregamento, ChecklistExpedicao, LiberacaoCarga, RespostaExpedicao } from '@sistema/domain';
import { Button, Field, TextInput, Modal } from '../../components/ui';
import { useToast } from '../../components/Toast';

const ROTULO: Record<RespostaExpedicao, string> = { c: 'Conforme', nc: 'Não conforme', na: 'N/A' };
const COR: Record<RespostaExpedicao, string> = {
  c: 'border-emerald-600 bg-emerald-600 text-white',
  nc: 'border-red-600 bg-red-600 text-white',
  na: 'border-slate-500 bg-slate-500 text-white',
};

/** Itens de uma parte do checklist (Logística ou Qualidade). */
export function SecoesChecklist({ quem, respostas, onChange, desabilitado = false }: {
  quem: 'logistica' | 'qualidade';
  respostas: ChecklistExpedicao;
  onChange: (r: ChecklistExpedicao) => void;
  desabilitado?: boolean;
}) {
  return (
    <div className="space-y-3">
      {SECOES_EXPEDICAO.filter((s) => s.quem === quem).map((secao) => (
        <div key={secao.titulo} className="rounded-lg border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-[12px] font-bold uppercase tracking-wide text-slate-600">{secao.titulo}</p>
            {!desabilitado && (
              <button type="button" onClick={() => onChange({ ...respostas, ...Object.fromEntries(secao.itens.map((i) => [i.chave, 'c'])) })}
                className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10.5px] font-semibold text-slate-500 hover:bg-slate-100">
                Tudo conforme
              </button>
            )}
          </div>
          <ul className="divide-y divide-slate-100 px-3">
            {secao.itens.map((item) => (
              <li key={item.chave} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-[12rem] flex-1 break-words text-[12.5px] text-slate-700">{item.texto}</span>
                <span className="flex shrink-0 gap-1">
                  {(item.permiteNa ? (['c', 'nc', 'na'] as const) : (['c', 'nc'] as const)).map((r) => (
                    <button key={r} type="button" disabled={desabilitado} aria-pressed={respostas[item.chave] === r}
                      onClick={() => onChange({ ...respostas, [item.chave]: r })}
                      className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed ${
                        respostas[item.chave] === r ? COR[r] : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-60'
                      }`}>
                      {ROTULO[r]}
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function ModalInspecaoCarga({ carga, cliente, lote, onClose, onSaved }: {
  carga: Carregamento;
  cliente: string;
  lote: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { perfis } = useAuth();
  const ehQualidade = perfis.includes('qualidade');
  const [respostas, setRespostas] = useState<ChecklistExpedicao>(carga.checklist ?? {});
  const [liberacao, setLiberacao] = useState<LiberacaoCarga | ''>(carga.liberacao ?? '');
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();
  const liberada = carga.liberacao != null;

  // "Acompanha laudo?": o sistema confere se o lote tem laudo emitido.
  const { data: laudos } = useAsync(
    async () => (carga.lote_id ? getLaudosDoLote(carga.lote_id) : []),
    [carga.lote_id],
  );
  const permitidas = liberacoesPermitidas(respostas);
  const ncs = ncsExpedicao(respostas);

  async function salvar(form: HTMLFormElement) {
    const f = new FormData(form);
    const txt = (k: string) => String(f.get(k) ?? '').trim() || null;
    const pendLog = pendentesExpedicao(respostas, 'logistica');
    if (pendLog.length > 0) { erro('Responda todos os itens das seções 1 e 2 (Logística).'); return; }
    const vaiLiberar = ehQualidade && liberacao !== '';
    if (vaiLiberar && pendentesExpedicao(respostas, 'qualidade').length > 0) {
      erro('Responda as seções 3 e 4 antes de dar o resultado.'); return;
    }
    if (vaiLiberar && liberacao === 'aprovado_restricao' && !txt('liberacao_justificativa')) {
      erro('Aprovado com restrição: descreva a justificativa.'); return;
    }
    setSalvando(true);
    try {
      await atualizarCarregamento(carga.id, {
        ultimo_produto: txt('ultimo_produto'),
        checklist: respostas,
        checklist_obs: txt('checklist_obs'),
        ...(ehQualidade ? {
          inspecao_obs: txt('inspecao_obs'),
          liberacao: liberacao || null,
          liberacao_justificativa: txt('liberacao_justificativa'),
        } : {}),
      });
      sucesso(vaiLiberar ? `Carga ${LIBERACAO_CARGA_LABEL[liberacao as LiberacaoCarga].toLowerCase()}.` : 'Checklist salvo.');
      onSaved();
    } catch (e) { erro(e instanceof Error ? e.message : 'Falha ao salvar.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={`Checklist de expedição — carga nº ${carga.numero}`} size="xl">
      <form onSubmit={(e) => { e.preventDefault(); void salvar(e.currentTarget); }} className="space-y-4">
        <dl className="grid gap-x-4 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-[12.5px] sm:grid-cols-3">
          {([
            ['Data', formatarData(carga.data)], ['Cliente', cliente], ['Lote', lote ?? '—'],
            ['NF', carga.nota_fiscal ?? '—'], ['Placa', carga.placa ?? '—'], ['Motorista', carga.motorista ?? '—'],
            ['Transportadora', carga.transportadora ?? '—'], ['Peso', carga.peso_kg != null ? `${carga.peso_kg} kg` : '—'],
          ] as const).map(([t, v]) => (
            <div key={t} className="flex gap-2"><dt className="w-24 shrink-0 text-slate-400">{t}</dt><dd className="text-slate-800">{v}</dd></div>
          ))}
        </dl>

        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Logística</p>
        <Field label="Último produto transportado pelo veículo">
          <TextInput name="ultimo_produto" defaultValue={carga.ultimo_produto ?? ''} disabled={liberada} placeholder="Ex.: farinha, grãos, ração…" />
        </Field>
        <SecoesChecklist quem="logistica" respostas={respostas} onChange={setRespostas} desabilitado={liberada} />
        <Field label="Observação da Logística">
          <TextInput name="checklist_obs" defaultValue={carga.checklist_obs ?? ''} disabled={liberada} />
        </Field>

        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Inspeção da Qualidade</p>
        <p className={`rounded-lg px-3 py-2 text-[12px] ${laudos && laudos.length > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
          {!carga.lote_id ? 'Carga sem lote vinculado — não há como conferir o laudo.'
            : laudos == null ? 'Conferindo laudo do lote…'
              : laudos.length > 0 ? `Lote com laudo interno nº ${laudos[0]!.numero} emitido em ${formatarData(laudos[0]!.emitido_em)}.`
                : 'Este lote ainda não tem laudo interno emitido.'}
        </p>
        {ehQualidade ? (
          <>
            <SecoesChecklist quem="qualidade" respostas={respostas} onChange={setRespostas} desabilitado={liberada} />
            <Field label="Observação da Qualidade">
              <TextInput name="inspecao_obs" defaultValue={carga.inspecao_obs ?? ''} disabled={liberada} />
            </Field>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-[12.5px] font-semibold text-slate-700">Expedição aprovada?</p>
              <div className="flex flex-wrap gap-1.5">
                {(['aprovado', 'aprovado_restricao', 'reprovado'] as const).map((l) => {
                  const pode = permitidas.includes(l);
                  return (
                    <button key={l} type="button" disabled={liberada || !pode} aria-pressed={liberacao === l}
                      onClick={() => setLiberacao(l)}
                      title={!pode ? 'Há item não conforme — não pode ser aprovado direto' : undefined}
                      className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        liberacao === l
                          ? l === 'reprovado' ? 'border-red-600 bg-red-600 text-white' : l === 'aprovado' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-amber-500 bg-amber-500 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}>
                      {LIBERACAO_CARGA_LABEL[l]}
                    </button>
                  );
                })}
              </div>
              {ncs.length > 0 && <p className="mt-2 text-[11.5px] text-red-700">Itens não conformes: {ncs.join(', ')}.</p>}
              {liberacao === 'aprovado_restricao' && (
                <div className="mt-2">
                  <TextInput name="liberacao_justificativa" defaultValue={carga.liberacao_justificativa ?? ''} disabled={liberada}
                    placeholder="Justificativa da restrição (obrigatória)" />
                </div>
              )}
              {liberada && carga.liberado_em && (
                <p className="mt-2 text-[11.5px] text-slate-500">Liberado em {formatarDataHora(carga.liberado_em)}.</p>
              )}
            </div>
          </>
        ) : (
          <p className="text-[12px] text-slate-500">
            {liberada ? `Resultado da Qualidade: ${LIBERACAO_CARGA_LABEL[carga.liberacao!]}.` : 'As seções 3 e 4 e a liberação são feitas pela Qualidade.'}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
          {!liberada && <Button type="submit" loading={salvando}>{ehQualidade && liberacao ? 'Registrar resultado' : 'Salvar checklist'}</Button>}
        </div>
      </form>
    </Modal>
  );
}
