import { useState, type FormEvent } from 'react';
import {
  listAuditorias, criarAuditoria, atualizarStatusAuditoria, getItensDaAuditoria, criarItemAuditoria,
  listVerificacoesPpr, criarVerificacaoPpr, listFuncionarios, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarDataHora } from '../../lib/format';
import {
  STATUS_AUDITORIA_LABEL, STATUS_AUDITORIA_TOM, CLASSIFICACAO_ITEM, CLASSIFICACAO_ITEM_LABEL, itemEhNaoConforme,
} from '@sistema/domain';
import type { Auditoria, StatusAuditoria, ClassificacaoItem } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, TextArea, Select, Modal } from '../../components/ui';
import { IconPlus, IconChevronRight } from '../../components/icons';
import { useToast } from '../../components/Toast';

const TOM_CLASS: Record<string, string> = {
  info: 'bg-sky-100 text-sky-700', alerta: 'bg-amber-100 text-amber-700', sucesso: 'bg-emerald-100 text-emerald-700',
};
const CLASS_TOM: Record<ClassificacaoItem, string> = {
  conforme: 'text-emerald-600', nc_critica: 'text-red-700', nc_maior: 'text-red-600', nc_menor: 'text-amber-600', na: 'text-slate-400',
};

export function AuditoriaPage() {
  const [aba, setAba] = useState<'auditorias' | 'ppr'>('auditorias');
  const [recarregar, setRecarregar] = useState(0);
  const [modalAud, setModalAud] = useState(false);
  const [modalPpr, setModalPpr] = useState(false);
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(async () => {
    const [auditorias, ppr, funcionarios] = await Promise.all([
      listAuditorias(), listVerificacoesPpr(), listFuncionarios(),
    ]);
    return { auditorias, ppr, funcionarios };
  }, [recarregar]);

  const rec = () => setRecarregar((n) => n + 1);

  async function onCriarAud(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data_aud = String(f.get('data') ?? '').trim();
    if (!data_aud) return;
    try {
      await criarAuditoria({
        data: data_aud,
        norma: String(f.get('norma') ?? '').trim() || null,
        escopo: String(f.get('escopo') ?? '').trim() || null,
        unidade: String(f.get('unidade') ?? '').trim() || null,
        auditor_id: String(f.get('auditor_id') ?? '') || null,
      });
      sucesso('Auditoria criada.'); setModalAud(false); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  async function onCriarPpr(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const programa = String(f.get('programa') ?? '').trim();
    if (!programa) return;
    try {
      await criarVerificacaoPpr({
        programa,
        registro_codigo: String(f.get('registro_codigo') ?? '').trim() || null,
        frequencia: String(f.get('frequencia') ?? '').trim() || null,
        conforme: String(f.get('conforme') ?? 'sim') === 'sim',
        acao: String(f.get('acao') ?? '').trim() || null,
      });
      sucesso('Verificação registrada.'); setModalPpr(false); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  return (
    <>
      <PageHeader
        title="Auditoria & PPR"
        subtitle="Auditoria interna FSSC 22000 e verificação de PPRs"
        action={
          <Button onClick={() => (aba === 'auditorias' ? setModalAud(true) : setModalPpr(true))}>
            <IconPlus width={16} height={16} />{aba === 'auditorias' ? 'Nova auditoria' : 'Verificar PPR'}
          </Button>
        }
      />

      <div className="mb-5 flex gap-2">
        {([['auditorias', 'Auditorias'], ['ppr', 'Verificação de PPR']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${aba === id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-emerald-600" /></div>}

      {data && aba === 'auditorias' && (
        data.auditorias.length === 0 ? (
          <EmptyState title="Nenhuma auditoria" description='Crie a primeira em "Nova auditoria".' />
        ) : (
          <div className="space-y-3">
            {data.auditorias.map((a) => (
              <AuditoriaCard key={a.id} auditoria={a} funcionarios={data.funcionarios} onChange={rec} />
            ))}
          </div>
        )
      )}

      {data && aba === 'ppr' && (
        data.ppr.length === 0 ? (
          <EmptyState title="Nenhuma verificação de PPR" description="Registre a verificação mensal dos programas." />
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Programa</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">Registro</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">Frequência</th>
                  <th className="px-5 py-3 font-medium">Quando</th>
                  <th className="px-5 py-3 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.ppr.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{v.programa}</td>
                    <td className="hidden px-5 py-3 text-slate-500 sm:table-cell">{v.registro_codigo ?? '—'}</td>
                    <td className="hidden px-5 py-3 text-slate-500 md:table-cell">{v.frequencia ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{formatarDataHora(v.verificado_em)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold ${v.conforme ? 'text-emerald-600' : 'text-red-600'}`}>
                        {v.conforme ? 'Conforme' : 'Não conforme'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}

      <Modal open={modalAud} onClose={() => setModalAud(false)} title="Nova auditoria" size="lg">
        <form onSubmit={onCriarAud} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Norma"><TextInput name="norma" placeholder="ISO 22000:2018" /></Field>
            <Field label="Data"><TextInput name="data" type="date" required defaultValue={new Date().toISOString().slice(0,10)} /></Field>
          </div>
          <Field label="Escopo"><TextInput name="escopo" placeholder="Processo / setores auditados" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unidade"><TextInput name="unidade" placeholder="Sumaré" /></Field>
            <Field label="Auditor"><Select name="auditor_id" defaultValue=""><option value="">—</option>{(data?.funcionarios ?? []).map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</Select></Field>
          </div>
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setModalAud(false)}>Cancelar</Button><Button type="submit">Criar auditoria</Button></div>
        </form>
      </Modal>

      <Modal open={modalPpr} onClose={() => setModalPpr(false)} title="Verificar PPR">
        <form onSubmit={onCriarPpr} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Programa"><TextInput name="programa" required placeholder="POP01 / PQSA11" /></Field>
            <Field label="Registro"><TextInput name="registro_codigo" placeholder="CHK-EXT-POP01-001" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Frequência"><TextInput name="frequencia" placeholder="Diário / Semanal" /></Field>
            <Field label="Situação"><Select name="conforme" defaultValue="sim"><option value="sim">Conforme</option><option value="nao">Não conforme</option></Select></Field>
          </div>
          <Field label="Ação (se não conforme)"><TextInput name="acao" placeholder="—" /></Field>
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setModalPpr(false)}>Cancelar</Button><Button type="submit">Registrar</Button></div>
        </form>
      </Modal>
    </>
  );
}

function AuditoriaCard({
  auditoria, funcionarios, onChange,
}: {
  auditoria: Auditoria; funcionarios: { id: string; nome: string }[]; onChange: () => void;
}) {
  const [aberta, setAberta] = useState(false);
  const [recItens, setRecItens] = useState(0);
  const [agindo, setAgindo] = useState(false);
  const { sucesso, erro } = useToast();
  const fmap = mapBy(funcionarios, 'id');

  const { data: itens } = useAsync(async () => (aberta ? getItensDaAuditoria(auditoria.id) : null), [auditoria.id, aberta, recItens]);

  async function addItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const requisito = String(f.get('requisito') ?? '').trim();
    if (!requisito) return;
    try {
      await criarItemAuditoria({
        auditoria_id: auditoria.id,
        clausula: String(f.get('clausula') ?? '').trim() || null,
        requisito,
        classificacao: String(f.get('classificacao') ?? 'conforme') as ClassificacaoItem,
        evidencia: String(f.get('evidencia') ?? '').trim() || null,
      });
      (e.target as HTMLFormElement).reset();
      setRecItens((n) => n + 1);
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  async function mudarStatus(status: StatusAuditoria) {
    setAgindo(true);
    try {
      await atualizarStatusAuditoria(auditoria.id, status);
      sucesso(status === 'concluida' ? 'Auditoria concluída — NCs geradas para os itens não conformes.' : 'Auditoria atualizada.');
      onChange();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setAgindo(false); }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex cursor-pointer items-center justify-between gap-4 p-5 hover:bg-slate-50" onClick={() => setAberta((v) => !v)}>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-900">Auditoria #{auditoria.numero}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TOM_CLASS[STATUS_AUDITORIA_TOM[auditoria.status]]}`}>{STATUS_AUDITORIA_LABEL[auditoria.status]}</span>
          <span className="text-xs text-slate-400">{auditoria.norma ?? '—'} · {formatarData(auditoria.data)}</span>
        </div>
        <IconChevronRight className={`text-slate-300 transition-transform ${aberta ? 'rotate-90' : ''}`} />
      </div>

      {aberta && (
        <div className="border-t border-slate-100 p-5 space-y-4">
          {auditoria.escopo && <p className="text-sm text-slate-600">{auditoria.escopo}{auditoria.auditor_id ? ` · Auditor: ${fmap.get(auditoria.auditor_id)?.nome ?? ''}` : ''}</p>}

          {itens == null ? (
            <Spinner className="h-5 w-5 text-emerald-600" />
          ) : itens.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum item avaliado ainda.</p>
          ) : (
            <ul className="space-y-2">
              {itens.map((it) => (
                <li key={it.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <div>
                    <p className="text-slate-700">{it.clausula ? <span className="font-medium">{it.clausula} · </span> : null}{it.requisito}</p>
                    {it.evidencia && <p className="text-xs text-slate-400">{it.evidencia}</p>}
                  </div>
                  <span className={`shrink-0 text-xs font-semibold ${CLASS_TOM[it.classificacao]}`}>
                    {CLASSIFICACAO_ITEM_LABEL[it.classificacao]}{it.nc_gerada ? ' · NC' : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {auditoria.status !== 'concluida' && (
            <form onSubmit={addItem} className="rounded-lg bg-slate-50 p-3 space-y-2">
              <div className="grid grid-cols-4 gap-2">
                <TextInput name="clausula" placeholder="Cláusula (4.1)" />
                <div className="col-span-2"><TextInput name="requisito" placeholder="Requisito avaliado" /></div>
                <Select name="classificacao" defaultValue="conforme">
                  {CLASSIFICACAO_ITEM.map((c) => <option key={c} value={c}>{CLASSIFICACAO_ITEM_LABEL[c]}</option>)}
                </Select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1"><TextInput name="evidencia" placeholder="Evidência / observação" /></div>
                <Button type="submit" variant="outline" className="px-3 py-1.5 text-xs">Adicionar item</Button>
              </div>
            </form>
          )}

          <div className="flex gap-2">
            {auditoria.status === 'planejada' && <Button variant="outline" loading={agindo} onClick={() => void mudarStatus('em_andamento')}>Iniciar</Button>}
            {auditoria.status !== 'concluida' && <Button loading={agindo} onClick={() => void mudarStatus('concluida')}>Concluir e gerar NCs</Button>}
          </div>
        </div>
      )}
    </Card>
  );
}
