import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  listOrdensPcm, listEquipamentosPcm, listColaboradoresPcm,
  criarOrdemPcm, atualizarOrdemPcm, excluirOrdemPcm, salvarExecucoesDaOs, anexarVariosNaOs,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { useAuth } from '../../lib/auth';
import { formatarData, hojeLocalISO } from '../../lib/format';
import {
  TIPO_OS_PCM, NATUREZA_OS, PRIORIDADE_OS_PCM, PRIORIDADE_OS_PCM_TOM, SETORES_PCM,
  STATUS_OS_PCM, STATUS_OS_PCM_TOM, statusAoEncerrarServico, podeConcluirOs, podeRetirarRisco,
} from '@sistema/domain';
import type { OrdemPcm, NovaOsExecucao, ColaboradorPcm, SetorPcm, StatusOs } from '@sistema/domain';
import { ModalVerOs } from './OsDetalhe';
import { EscolherAnexos } from './AnexosOs';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal, ErroCarregamento } from '../../components/ui';
import { IconPlus, IconSearch, IconDoc } from '../../components/icons';
import { useToast } from '../../components/Toast';

export function PcmOrdensPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<OrdemPcm | null>(null);
  const [concluindo, setConcluindo] = useState<OrdemPcm | null>(null);
  const [vendo, setVendo] = useState<OrdemPcm | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todas' | StatusOs>('Em Aberto');
  const { perfis } = useAuth();
  const { sucesso, erro } = useToast();

  const { data, loading, error } = useAsync(async () => {
    const [ordens, equipamentos, colaboradores] = await Promise.all([
      listOrdensPcm(), listEquipamentosPcm(), listColaboradoresPcm(),
    ]);
    // Lista fixa das áreas da fábrica, na ordem do fluxo, mais qualquer setor
    // que já exista nos equipamentos e não esteja nela.
    const extras = [...new Set(equipamentos.map((e) => e.setor))]
      .filter((s) => s && !SETORES_PCM.includes(s as SetorPcm))
      .sort();
    const setores = [...SETORES_PCM, ...extras];
    return { ordens, setores, colaboradores };
  }, [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  const linhas = (data?.ordens ?? []).filter((o) => {
    if (filtroStatus !== 'todas' && o.status !== filtroStatus) return false;
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return [String(o.numero), o.setor ?? '', o.req ?? '', o.descricao ?? '', o.tipo ?? '', o.exec ?? '']
      .some((v) => v.toLowerCase().includes(q));
  });

  const abertas = (data?.ordens ?? []).filter((o) => o.status === 'Em Aberto').length;
  const aguardando = (data?.ordens ?? []).filter((o) => o.status === 'Aguardando Qualidade').length;

  async function remover(id: string) {
    try { await excluirOrdemPcm(id); sucesso('O.S. excluída.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  return (
    <>
      <PageHeader grupo="Manutenção"
        title="Ordens de Serviço"
        subtitle={`Manutenção (PCM) — ${abertas} em aberto${aguardando > 0 ? ` · ${aguardando} aguardando a Qualidade` : ''}`}
        action={<Button onClick={() => setModal(true)}><IconPlus width={16} height={16} />Nova O.S.</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" placeholder="Buscar nº, setor, requisitante, descrição…" value={busca} onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-[7px] border border-slate-300 bg-white py-2 pl-9 pr-3 text-[12.5px] outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </div>
        <div className="w-52">
          <Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as typeof filtroStatus)}>
            {STATUS_OS_PCM.map((st) => (
              <option key={st} value={st}>{st === 'Concluído' ? 'Concluídas' : st}</option>
            ))}
            <option value="todas">Todas</option>
          </Select>
        </div>
      </div>

      {error && <ErroCarregamento mensagem={error} />}
      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}
      {data && linhas.length === 0 && <EmptyState title="Nenhuma O.S." description='Abra a primeira em "Nova O.S.".' />}

      {/* No celular a tabela escondia 4 das 9 colunas — inclusive status,
          prioridade e todos os botoes. Ali a lista vira cartao, e tocar abre a
          O.S. */}
      {data && linhas.length > 0 && (
        <div className="flex flex-col gap-2.5 md:hidden">
          {linhas.map((o) => (
            <button key={o.id} onClick={() => setVendo(o)}
              className="w-full rounded-[10px] border border-slate-200 bg-white px-4 py-3 text-left transition active:bg-slate-50">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-bold text-slate-900">O.S. {o.numero}</span>
                <span className="text-[11.5px] text-slate-400">{formatarData(o.data)}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-[13px] text-slate-700">{o.descricao ?? 'Sem descrição'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {o.setor ?? 'sem setor'}
                </span>
                {o.prioridade && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORIDADE_OS_PCM_TOM[o.prioridade]}`}>
                    {o.prioridade}
                  </span>
                )}
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_OS_PCM_TOM[o.status]}`}>
                  {o.status}
                </span>
                {o.risco_seguranca_alimentos && (
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">Seg. alimentos</span>
                )}
                {o.parada_equip && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">Equip. parado</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {data && linhas.length > 0 && (
        <Card className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11.5px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-[11px]">Nº</th>
                <th className="px-3 py-[11px]">Data</th>
                <th className="px-3 py-[11px]">Setor</th>
                <th className="hidden px-3 py-[11px] md:table-cell">Tipo</th>
                <th className="hidden px-3 py-[11px] lg:table-cell">Demanda</th>
                <th className="px-3 py-[11px]">Descrição</th>
                <th className="px-3 py-[11px]">Prioridade</th>
                <th className="px-3 py-[11px]">Status</th>
                <th className="px-3 py-[11px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map((o) => (
                <tr key={o.id} onClick={() => setVendo(o)} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-medium text-slate-700">{o.numero}</td>
                  <td className="px-3 py-2.5 text-slate-500">{formatarData(o.data)}</td>
                  <td className="px-3 py-2.5 text-slate-600">{o.setor ?? '—'}</td>
                  <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">{o.tipo ?? '—'}</td>
                  <td className="hidden px-3 py-2.5 text-slate-500 lg:table-cell">{o.natureza ?? '—'}</td>
                  <td className="max-w-[280px] px-3 py-2.5 text-slate-600"><span className="line-clamp-1">{o.descricao ?? '—'}</span></td>
                  <td className="px-3 py-2.5">
                    {o.prioridade ? (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORIDADE_OS_PCM_TOM[o.prioridade]}`}>{o.prioridade}</span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_OS_PCM_TOM[o.status]}`}>
                      {o.status}
                    </span>
                    {o.risco_seguranca_alimentos && (
                      <span title="Risco à segurança de alimentos — só a Qualidade libera"
                        className="ml-1 whitespace-nowrap rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                        Seg. alim.
                      </span>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()} className="px-3 py-2.5 text-right whitespace-nowrap">
                    <Link to={`/pcm-os/${o.id}/imprimir`} className="mr-3 inline-flex align-middle text-slate-400 hover:text-slate-700" title="Imprimir O.S.">
                      <IconDoc width={15} height={15} />
                    </Link>
                    <button onClick={() => setEditando(o)} className="mr-3 text-xs font-medium text-slate-500 hover:text-brand-600">Editar</button>
                    {o.status === 'Em Aberto' && (
                      <button onClick={() => setConcluindo(o)} className="mr-3 text-xs font-medium text-brand-600 hover:text-brand-700">
                        {podeConcluirOs(o, perfis) ? 'Concluir' : 'Encerrar'}
                      </button>
                    )}
                    <button onClick={() => void remover(o.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {vendo && (
        <ModalVerOs os={vendo}
          onClose={() => setVendo(null)}
          onEditar={() => { setEditando(vendo); setVendo(null); }}
          onConcluir={() => { setConcluindo(vendo); setVendo(null); }}
          onExcluir={async () => { const alvo = vendo; setVendo(null); await remover(alvo.id); }}
          onMudou={rec}
        />
      )}

      {(modal || editando) && (
        <ModalNovaOs setores={data?.setores ?? []} editando={editando}
          onClose={() => { setModal(false); setEditando(null); }}
          onSaved={() => { setModal(false); setEditando(null); rec(); }} sucesso={sucesso} erro={erro} />
      )}
      {concluindo && (
        <ModalConcluirOs os={concluindo} colaboradores={data?.colaboradores ?? []}
          onClose={() => setConcluindo(null)} onSaved={() => { setConcluindo(null); rec(); }} sucesso={sucesso} erro={erro} />
      )}
    </>
  );
}

type ToastFn = (m: string) => void;

// ── Nova O.S. (com paradas de equipamento/produção) ────────────
function ModalNovaOs({ setores, editando, onClose, onSaved, sucesso, erro }: {
  setores: string[]; editando?: OrdemPcm | null;
  onClose: () => void; onSaved: () => void; sucesso: ToastFn; erro: ToastFn;
}) {
  const { perfis } = useAuth();
  const [salvando, setSalvando] = useState(false);
  const [paradaEquip, setParadaEquip] = useState(editando?.parada_equip ?? false);
  const [paradaProd, setParadaProd] = useState(editando?.parada_prod ?? false);
  // Sem valor inicial na O.S. nova: obriga a pessoa a responder. Um "Não" já
  // marcado de fábrica vira resposta automática de quem tem pressa.
  const [risco, setRisco] = useState<boolean | null>(editando ? editando.risco_seguranca_alimentos : null);
  const [anexos, setAnexos] = useState<File[]>([]);
  // Uma O.S. que já nasceu com risco só a Qualidade pode desmarcar.
  const riscoTravado = !!editando?.risco_seguranca_alimentos && !podeRetirarRisco(perfis);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const txt = (k: string) => String(f.get(k) ?? '').trim() || null;
    if (risco === null) { erro('Informe se o serviço tem risco à segurança de alimentos.'); return; }
    setSalvando(true);
    try {
      const payload = {
        data: String(f.get('data') ?? hojeLocalISO()),
        hora: txt('hora'),
        req: txt('req'),
        setor: txt('setor'),
        tipo: (txt('tipo') as never) ?? null,
        natureza: (txt('natureza') as never) ?? null,
        prioridade: (txt('prioridade') as never) ?? null,
        descricao: txt('descricao'),
        data_prog: txt('data_prog'),
        parada_equip: paradaEquip,
        parada_equip_ini: paradaEquip ? txt('pe_ini') : null,
        parada_equip_ini_h: paradaEquip ? txt('pe_ini_h') : null,
        parada_equip_ret: paradaEquip ? txt('pe_ret') : null,
        parada_equip_ret_h: paradaEquip ? txt('pe_ret_h') : null,
        parada_prod: paradaProd,
        parada_prod_ini: paradaProd ? txt('pp_ini') : null,
        parada_prod_ini_h: paradaProd ? txt('pp_ini_h') : null,
        parada_prod_ret: paradaProd ? txt('pp_ret') : null,
        parada_prod_ret_h: paradaProd ? txt('pp_ret_h') : null,
        risco_seguranca_alimentos: risco,
      };
      let osId: string;
      if (editando) { await atualizarOrdemPcm(editando.id, payload); osId = editando.id; }
      else osId = (await criarOrdemPcm(payload)).id;
      // A O.S. já existe nesta altura: se um vídeo falhar, ela não se perde —
      // o aviso diz qual arquivo não subiu e dá para anexar de novo.
      if (anexos.length > 0) {
        try { await anexarVariosNaOs(osId, 'abertura', anexos); }
        catch (e) {
          erro(`O.S. salva, mas nem todos os anexos subiram. ${e instanceof Error ? e.message : ''}`);
          onSaved();
          return;
        }
      }
      sucesso(editando ? 'O.S. atualizada.' : 'O.S. aberta.'); onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={editando ? `Editar O.S. #${editando.numero}` : "Nova Ordem de Serviço"} size="xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Data"><TextInput name="data" type="date" defaultValue={editando?.data ?? hojeLocalISO()} required /></Field>
          <Field label="Hora"><TextInput name="hora" type="time" defaultValue={editando?.hora ?? ''} /></Field>
          <Field label="Requisitante"><TextInput name="req" defaultValue={editando?.req ?? ''} placeholder="—" /></Field>
          <Field label="Setor">
            <Select name="setor" defaultValue={editando?.setor ?? ""}>
              <option value="">—</option>
              {setores.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Tipo">
            <Select name="tipo" defaultValue={editando?.tipo ?? "Corretiva"}>{TIPO_OS_PCM.map((t) => <option key={t} value={t}>{t}</option>)}</Select>
          </Field>
          <Field label="Demanda">
            <Select name="natureza" defaultValue={editando?.natureza ?? "Mecânica"}>{NATUREZA_OS.map((n) => <option key={n} value={n}>{n}</option>)}</Select>
          </Field>
          <Field label="Prioridade">
            <Select name="prioridade" defaultValue={editando?.prioridade ?? "Normal"}>{PRIORIDADE_OS_PCM.map((p) => <option key={p} value={p}>{p}</option>)}</Select>
          </Field>
          <Field label="Data programada"><TextInput name="data_prog" type="date" defaultValue={editando?.data_prog ?? ''} /></Field>
        </div>
        <Field label="Descrição do serviço"><TextInput name="descricao" defaultValue={editando?.descricao ?? ''} required placeholder="O que precisa ser feito" /></Field>

        {/* Risco à segurança de alimentos */}
        <div className={`rounded-lg border p-3 ${risco ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-800">Risco à segurança de alimentos?</p>
            <div className="flex gap-2" role="radiogroup" aria-label="Risco à segurança de alimentos">
              {([[true, 'Sim'], [false, 'Não']] as const).map(([valor, rotulo]) => (
                <button key={rotulo} type="button" role="radio" aria-checked={risco === valor}
                  disabled={valor === false && riscoTravado}
                  onClick={() => setRisco(valor)}
                  className={`min-w-[64px] rounded-lg border px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    risco === valor
                      ? valor ? 'border-red-600 bg-red-600 text-white' : 'border-slate-800 bg-slate-800 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}>
                  {rotulo}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {risco
              ? 'Só a Qualidade conclui esta O.S. A manutenção encerra o serviço e o equipamento volta à produção depois da liberação.'
              : 'Marque "Sim" quando o serviço puder deixar contaminante no produto: peça solta, cavaco, graxa, solda, vidro.'}
            {riscoTravado && ' Só a Qualidade pode retirar este risco.'}
          </p>
        </div>

        <EscolherAnexos arquivos={anexos} onChange={setAnexos} onErro={erro} titulo="Fotos e vídeos do problema" />

        {/* Paradas */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={paradaEquip} onChange={(e) => setParadaEquip(e.target.checked)} className="accent-brand-600" />
              Parada de equipamento
            </label>
            {paradaEquip && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Field label="Início"><TextInput name="pe_ini" type="date" defaultValue={editando?.parada_equip_ini ?? ''} /></Field>
                <Field label="Hora"><TextInput name="pe_ini_h" type="time" defaultValue={editando?.parada_equip_ini_h ?? ''} /></Field>
                <Field label="Retorno"><TextInput name="pe_ret" type="date" defaultValue={editando?.parada_equip_ret ?? ''} /></Field>
                <Field label="Hora"><TextInput name="pe_ret_h" type="time" defaultValue={editando?.parada_equip_ret_h ?? ''} /></Field>
              </div>
            )}
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={paradaProd} onChange={(e) => setParadaProd(e.target.checked)} className="accent-brand-600" />
              Parada de produção
            </label>
            {paradaProd && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Field label="Início"><TextInput name="pp_ini" type="date" defaultValue={editando?.parada_prod_ini ?? ''} /></Field>
                <Field label="Hora"><TextInput name="pp_ini_h" type="time" defaultValue={editando?.parada_prod_ini_h ?? ''} /></Field>
                <Field label="Retorno"><TextInput name="pp_ret" type="date" defaultValue={editando?.parada_prod_ret ?? ''} /></Field>
                <Field label="Hora"><TextInput name="pp_ret_h" type="time" defaultValue={editando?.parada_prod_ret_h ?? ''} /></Field>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>{editando ? "Salvar" : "Abrir O.S."}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Conclusão com checklist de execução (multi-mantenedor) ─────
interface LinhaExec {
  mantenedor: string;
  data_exec: string;
  hora_ini: string;
  data_fim: string;
  hora_fim: string;
}

function ModalConcluirOs({ os, colaboradores, onClose, onSaved, sucesso, erro }: {
  os: OrdemPcm; colaboradores: ColaboradorPcm[];
  onClose: () => void; onSaved: () => void; sucesso: ToastFn; erro: ToastFn;
}) {
  const hoje = hojeLocalISO();
  const [linhas, setLinhas] = useState<LinhaExec[]>([
    { mantenedor: '', data_exec: hoje, hora_ini: '', data_fim: hoje, hora_fim: '' },
  ]);
  const [realizado, setRealizado] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [anexos, setAnexos] = useState<File[]>([]);
  const { perfis } = useAuth();
  // A Qualidade que conclui está liberando; os demais encerram o serviço e,
  // se houver risco, a O.S. vai para a fila de liberação.
  const novoStatus: StatusOs = podeConcluirOs(os, perfis) ? 'Concluído' : statusAoEncerrarServico(os.risco_seguranca_alimentos);
  const vaiParaQualidade = novoStatus === 'Aguardando Qualidade';

  function mudar(i: number, campo: keyof LinhaExec, v: string) {
    setLinhas((ls) => ls.map((l, x) => (x === i ? { ...l, [campo]: v } : l)));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validas = linhas.filter((l) => l.mantenedor.trim());
    setSalvando(true);
    try {
      const execs: NovaOsExecucao[] = validas.map((l) => ({
        mantenedor: l.mantenedor.trim(),
        data_exec: l.data_exec || null,
        hora_ini: l.hora_ini || null,
        data_fim: l.data_fim || null,
        hora_fim: l.hora_fim || null,
        data_fech: hoje,
      }));
      await salvarExecucoesDaOs(os.id, execs);
      // Anexos antes do status: depois de concluída a O.S., o fechamento já
      // tem de estar documentado.
      if (anexos.length > 0) await anexarVariosNaOs(os.id, 'fechamento', anexos);
      await atualizarOrdemPcm(os.id, {
        status: novoStatus,
        realizado: realizado.trim() || null,
        exec: validas.map((l) => l.mantenedor.trim()).join(' / ') || null,
      });
      sucesso(vaiParaQualidade
        ? `Serviço da O.S. #${os.numero} encerrado — enviada à Qualidade para liberação.`
        : `O.S. #${os.numero} concluída.`);
      onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={`${vaiParaQualidade ? 'Encerrar serviço' : 'Concluir'} — O.S. #${os.numero}`} size="xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{os.descricao}</p>
        {vaiParaQualidade && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            <span className="font-semibold">Risco à segurança de alimentos.</span> Ao encerrar, a O.S. vai para a
            Qualidade, que inspeciona e libera o equipamento. Fotografe o local limpo e as peças conferidas — é
            a evidência que a Qualidade vai olhar.
          </p>
        )}
        <Field label="O que foi realizado">
          <TextInput value={realizado} onChange={(e) => setRealizado(e.target.value)} placeholder="Serviço executado" />
        </Field>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Checklist de execução</p>
          <div className="space-y-2">
            {linhas.map((l, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-6">
                <div className="col-span-2">
                  <Field label="Mantenedor">
                    <TextInput list="colaboradores-pcm" value={l.mantenedor} onChange={(e) => mudar(i, 'mantenedor', e.target.value)} placeholder="Nome" />
                  </Field>
                </div>
                <Field label="Início"><TextInput type="date" value={l.data_exec} onChange={(e) => mudar(i, 'data_exec', e.target.value)} /></Field>
                <Field label="Hora"><TextInput type="time" value={l.hora_ini} onChange={(e) => mudar(i, 'hora_ini', e.target.value)} /></Field>
                <Field label="Fim"><TextInput type="date" value={l.data_fim} onChange={(e) => mudar(i, 'data_fim', e.target.value)} /></Field>
                <Field label="Hora"><TextInput type="time" value={l.hora_fim} onChange={(e) => mudar(i, 'hora_fim', e.target.value)} /></Field>
              </div>
            ))}
          </div>
          <datalist id="colaboradores-pcm">
            {colaboradores.map((c) => <option key={c.id} value={c.nome} />)}
          </datalist>
          <button type="button" onClick={() => setLinhas((ls) => [...ls, { mantenedor: '', data_exec: hoje, hora_ini: '', data_fim: hoje, hora_fim: '' }])}
            className="mt-2 text-xs font-medium text-brand-600 hover:text-brand-700">
            + Adicionar mantenedor
          </button>
        </div>

        <EscolherAnexos arquivos={anexos} onChange={setAnexos} onErro={erro} titulo="Fotos e vídeos do serviço feito" />

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>{vaiParaQualidade ? 'Encerrar e enviar à Qualidade' : 'Concluir O.S.'}</Button>
        </div>
      </form>
    </Modal>
  );
}
