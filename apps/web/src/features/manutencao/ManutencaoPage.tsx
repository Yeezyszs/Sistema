import { useState, type FormEvent } from 'react';
import {
  listOrdensServico,
  criarOrdemServico,
  atualizarStatusOS,
  listPlanoPreventivo,
  criarItemPreventivo,
  listExecucoesPreventiva,
  registrarExecucaoPreventiva,
  listEquipamentos,
  listFuncionarios,
  mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData } from '../../lib/format';
import {
  TIPO_OS, TIPO_OS_LABEL, STATUS_OS_LABEL, STATUS_OS_TOM, PRIORIDADE_OS, PRIORIDADE_OS_LABEL,
} from '@sistema/domain';
import type { StatusOS } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, TextArea, Select, Modal } from '../../components/ui';
import { IconPlus } from '../../components/icons';
import { useToast } from '../../components/Toast';

const TOM_CLASS: Record<string, string> = {
  erro: 'bg-red-100 text-red-700', alerta: 'bg-amber-100 text-amber-700', sucesso: 'bg-emerald-100 text-emerald-700',
};

export function ManutencaoPage() {
  const [aba, setAba] = useState<'os' | 'preventiva'>('os');
  const [recarregar, setRecarregar] = useState(0);
  const [modalOS, setModalOS] = useState(false);
  const [modalPrev, setModalPrev] = useState(false);
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(async () => {
    const [oss, planos, execucoes, equipamentos, funcionarios] = await Promise.all([
      listOrdensServico(), listPlanoPreventivo(), listExecucoesPreventiva(), listEquipamentos(), listFuncionarios(),
    ]);
    return {
      oss, planos, execucoes,
      equipamentos, equipamentosMap: mapBy(equipamentos, 'id'),
      funcionarios, funcionariosMap: mapBy(funcionarios, 'id'),
      planosMap: mapBy(planos, 'id'),
    };
  }, [recarregar]);

  const rec = () => setRecarregar((n) => n + 1);

  async function mudarStatus(id: string, status: StatusOS) {
    try { await atualizarStatusOS(id, status); sucesso('OS atualizada.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  async function onCriarOS(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const descricao_solicitada = String(f.get('descricao_solicitada') ?? '').trim();
    if (!descricao_solicitada) return;
    try {
      await criarOrdemServico({
        descricao_solicitada,
        tipo: String(f.get('tipo') ?? 'corretiva') as never,
        prioridade: String(f.get('prioridade') ?? 'media') as never,
        equipamento_id: String(f.get('equipamento_id') ?? '') || null,
        solicitante_id: String(f.get('solicitante_id') ?? '') || null,
      });
      sucesso('Ordem de serviço aberta.'); setModalOS(false); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  async function onCriarPrev(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const componente = String(f.get('componente') ?? '').trim();
    if (!componente) return;
    try {
      await criarItemPreventivo({
        componente,
        equipamento_id: String(f.get('equipamento_id') ?? '') || null,
        periodicidade: String(f.get('periodicidade') ?? '').trim() || null,
      });
      sucesso('Item de plano preventivo criado.'); setModalPrev(false); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  async function registrarPrev(planoItemId: string) {
    try { await registrarExecucaoPreventiva({ plano_item_id: planoItemId }); sucesso('Execução registrada.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  return (
    <>
      <PageHeader
        title="Manutenção"
        subtitle="Ordens de serviço e plano de manutenção preventiva"
        action={
          <Button onClick={() => (aba === 'os' ? setModalOS(true) : setModalPrev(true))}>
            <IconPlus width={16} height={16} />
            {aba === 'os' ? 'Nova OS' : 'Novo item preventivo'}
          </Button>
        }
      />

      <div className="mb-5 flex gap-2">
        {([['os', 'Ordens de serviço'], ['preventiva', 'Preventiva']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${aba === id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-emerald-600" /></div>}

      {data && aba === 'os' && (
        data.oss.length === 0 ? (
          <EmptyState title="Nenhuma ordem de serviço" description='Abra a primeira em "Nova OS".' />
        ) : (
          <div className="space-y-3">
            {data.oss.map((os) => (
              <Card key={os.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">OS nº {os.numero}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TOM_CLASS[STATUS_OS_TOM[os.status]]}`}>{STATUS_OS_LABEL[os.status]}</span>
                      <span className="text-xs text-slate-400">{TIPO_OS_LABEL[os.tipo]} · {PRIORIDADE_OS_LABEL[os.prioridade]}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{os.descricao_solicitada}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {os.equipamento_id ? data.equipamentosMap.get(os.equipamento_id)?.nome ?? '' : ''} · aberta {formatarData(os.aberta_em)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    {os.status === 'aberta' && <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={() => void mudarStatus(os.id, 'em_execucao')}>Iniciar</Button>}
                    {os.status !== 'concluida' && <Button className="px-3 py-1.5 text-xs" onClick={() => void mudarStatus(os.id, 'concluida')}>Concluir</Button>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {data && aba === 'preventiva' && (
        data.planos.length === 0 ? (
          <EmptyState title="Nenhum item no plano preventivo" description='Adicione em "Novo item preventivo".' />
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Componente</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">Equipamento</th>
                  <th className="px-5 py-3 font-medium">Periodicidade</th>
                  <th className="px-5 py-3 font-medium">Última execução</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.planos.map((p) => {
                  const ultima = data.execucoes.filter((e) => e.plano_item_id === p.id)[0];
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-800">{p.componente}</td>
                      <td className="hidden px-5 py-3 text-slate-600 sm:table-cell">{p.equipamento_id ? data.equipamentosMap.get(p.equipamento_id)?.nome ?? '—' : '—'}</td>
                      <td className="px-5 py-3 text-slate-500">{p.periodicidade ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-500">{ultima ? formatarData(ultima.realizada_em) : '—'}</td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={() => void registrarPrev(p.id)}>Registrar execução</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )
      )}

      <Modal open={modalOS} onClose={() => setModalOS(false)} title="Nova ordem de serviço" size="lg">
        <form onSubmit={onCriarOS} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Tipo"><Select name="tipo" defaultValue="corretiva">{TIPO_OS.map((t) => <option key={t} value={t}>{TIPO_OS_LABEL[t]}</option>)}</Select></Field>
            <Field label="Prioridade"><Select name="prioridade" defaultValue="media">{PRIORIDADE_OS.map((p) => <option key={p} value={p}>{PRIORIDADE_OS_LABEL[p]}</option>)}</Select></Field>
            <Field label="Equipamento"><Select name="equipamento_id" defaultValue=""><option value="">—</option>{(data?.equipamentos ?? []).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</Select></Field>
          </div>
          <Field label="Solicitante"><Select name="solicitante_id" defaultValue=""><option value="">—</option>{(data?.funcionarios ?? []).map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</Select></Field>
          <Field label="Serviço solicitado"><TextArea name="descricao_solicitada" required placeholder="Descreva o problema / serviço…" /></Field>
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setModalOS(false)}>Cancelar</Button><Button type="submit">Abrir OS</Button></div>
        </form>
      </Modal>

      <Modal open={modalPrev} onClose={() => setModalPrev(false)} title="Novo item de plano preventivo">
        <form onSubmit={onCriarPrev} className="space-y-4">
          <Field label="Equipamento"><Select name="equipamento_id" defaultValue=""><option value="">—</option>{(data?.equipamentos ?? []).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</Select></Field>
          <Field label="Componente"><TextInput name="componente" required placeholder="Ex.: Rolamento UC 213" /></Field>
          <Field label="Periodicidade"><TextInput name="periodicidade" placeholder="TRIMESTRAL" /></Field>
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setModalPrev(false)}>Cancelar</Button><Button type="submit">Adicionar</Button></div>
        </form>
      </Modal>
    </>
  );
}
