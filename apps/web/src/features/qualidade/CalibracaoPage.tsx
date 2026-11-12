// Calibração — FOR-POP 05 1.4 Ver 02 (Avaliação dos certificados de
// calibração). Uma linha por instrumento com o certificado vigente; o alerta
// no topo lista o que vence em até 30 dias (ou já venceu) para dar tempo de
// agendar a calibração antes de o equipamento ficar sem certificado.
import { useMemo, useState, type FormEvent } from 'react';
import {
  listInstrumentos,
  criarInstrumento,
  listCalibracoes,
  criarCalibracao,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, hojeLocalISO } from '../../lib/format';
import {
  TIPO_CALIBRACAO, TIPO_CALIBRACAO_LABEL, situacaoCalibracao, SITUACAO_CALIBRACAO_LABEL,
  ultimaCalibracaoPorInstrumento, calibracoesEmAlerta,
} from '@sistema/domain';
import type { SituacaoCalibracao, Calibracao, Instrumento } from '@sistema/domain';
import {
  PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, TextArea, Select, Modal, ErroCarregamento,
} from '../../components/ui';
import { IconPlus } from '../../components/icons';
import { useToast } from '../../components/Toast';

const SIT_CLASS: Record<SituacaoCalibracao, string> = {
  vigente: 'bg-brand-100 text-brand-700',
  a_vencer: 'bg-amber-100 text-amber-700',
  vencida: 'bg-red-100 text-red-700',
  sem_registro: 'bg-slate-100 text-slate-500',
};

function diasAte(iso: string | null): number | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const hoje = new Date();
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() - base.getTime()) / 86_400_000);
}

export function CalibracaoPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [modalInstr, setModalInstr] = useState(false);
  const [registrarPara, setRegistrarPara] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<Instrumento | null>(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todos' | SituacaoCalibracao>('todos');
  const { sucesso, erro } = useToast();

  const { data, loading, error } = useAsync(async () => {
    const [instrumentos, calibracoes] = await Promise.all([listInstrumentos(), listCalibracoes()]);
    return { instrumentos, calibracoes, ultima: ultimaCalibracaoPorInstrumento(calibracoes) };
  }, [recarregar]);

  const rec = () => setRecarregar((n) => n + 1);

  const alerta = useMemo(() => {
    if (!data) return [];
    const porId = new Map(data.instrumentos.map((i) => [i.id, i]));
    return calibracoesEmAlerta(data.instrumentos, data.calibracoes)
      .map((c) => ({ c, inst: porId.get(c.instrumento_id)!, dias: diasAte(c.valido_ate) ?? 0 }))
      .sort((a, b) => a.dias - b.dias);
  }, [data]);

  const linhas = (data?.instrumentos ?? []).filter((i) => {
    const t = busca.trim().toLowerCase();
    if (t && ![i.codigo, i.nome, i.area, i.numero_serie].some((v) => v?.toLowerCase().includes(t))) return false;
    if (filtro === 'todos') return true;
    return situacaoCalibracao(data?.ultima.get(i.id)?.valido_ate ?? null) === filtro;
  });

  async function onCriarInstr(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const txt = (k: string) => String(f.get(k) ?? '').trim() || null;
    const codigo = txt('codigo');
    const nome = txt('nome');
    if (!codigo || !nome) return;
    try {
      await criarInstrumento({
        codigo, nome, area: txt('area'), numero_serie: txt('numero_serie'),
        faixa: txt('faixa'), criterio_aceitacao: txt('criterio_aceitacao'),
      });
      sucesso('Instrumento cadastrado.'); setModalInstr(false); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  async function onCriarCalib(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const txt = (k: string) => String(f.get(k) ?? '').trim() || null;
    const instrumento_id = String(f.get('instrumento_id') ?? '');
    const calibrado_em = txt('calibrado_em');
    if (!instrumento_id || !calibrado_em) return;
    try {
      await criarCalibracao({
        instrumento_id,
        tipo: String(f.get('tipo') ?? 'calibracao') as never,
        calibrado_em,
        valido_ate: txt('valido_ate'),
        recalibrar_ate: txt('recalibrar_ate'),
        empresa: txt('empresa'),
        certificado_numero: txt('certificado_numero'),
        faixa_calibrada: txt('faixa_calibrada'),
        criterio_aceitacao: txt('criterio_aceitacao'),
        incerteza: txt('incerteza'),
        conforme: String(f.get('conforme') ?? 'sim') === 'sim',
        analise_critica: txt('analise_critica'),
        verificado_em: txt('verificado_em'),
        verificado_por: txt('verificado_por'),
      });
      sucesso('Certificado registrado.'); setRegistrarPara(null); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  const instRegistro = data?.instrumentos.find((i) => i.id === registrarPara);

  return (
    <>
      <PageHeader grupo="Qualidade"
        title="Calibração"
        subtitle="FOR-POP 05 1.4 — avaliação dos certificados de calibração (anual)"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setModalInstr(true)}>Novo instrumento</Button>
            <Button onClick={() => setRegistrarPara('')}><IconPlus width={16} height={16} />Registrar certificado</Button>
          </div>
        }
      />

      {error && <ErroCarregamento mensagem={error} />}
      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}

      {alerta.length > 0 && (
        <Card className="mb-4 border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            ⚠ {alerta.length} certificado(s) vencendo em até 30 dias ou vencido(s) — agende a calibração
          </p>
          <ul className="mt-2 space-y-1 text-[13px]">
            {alerta.map(({ c, inst, dias }) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-2">
                <button type="button" onClick={() => setDetalhe(inst)} className="font-medium text-slate-900 underline-offset-2 hover:underline">
                  {inst.codigo} — {inst.nome}{inst.area ? ` (${inst.area})` : ''}
                </button>
                <span className={dias < 0 ? 'font-semibold text-red-700' : 'text-amber-800'}>
                  {dias < 0 ? `vencido há ${-dias} dia(s)` : dias === 0 ? 'vence hoje' : `vence em ${dias} dia(s)`} · validade {formatarData(c.valido_ate!)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {data && data.instrumentos.length === 0 && (
        <EmptyState title="Nenhum instrumento" description="Cadastre um instrumento para controlar sua calibração." />
      )}

      {data && data.instrumentos.length > 0 && (
        <>
          <Card className="mb-4 flex flex-wrap items-end gap-3 p-4">
            <Field label="Buscar">
              <TextInput value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Código, equipamento, área ou série…" />
            </Field>
            <Field label="Situação">
              <Select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} className="!w-44">
                <option value="todos">Todas</option>
                {(['vigente', 'a_vencer', 'vencida', 'sem_registro'] as const).map((s) => (
                  <option key={s} value={s}>{SITUACAO_CALIBRACAO_LABEL[s]}</option>
                ))}
              </Select>
            </Field>
          </Card>

          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11.5px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-[11px]">Código</th>
                  <th className="px-4 py-[11px]">Equipamento</th>
                  <th className="hidden px-4 py-[11px] lg:table-cell">Nº de série</th>
                  <th className="hidden px-4 py-[11px] md:table-cell">Calibração</th>
                  <th className="hidden px-4 py-[11px] md:table-cell">Vencimento</th>
                  <th className="px-4 py-[11px]">Validade</th>
                  <th className="hidden px-4 py-[11px] lg:table-cell">Certificado</th>
                  <th className="px-4 py-[11px]">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {linhas.map((inst) => {
                  const ultima = data.ultima.get(inst.id);
                  const sit = situacaoCalibracao(ultima?.valido_ate ?? null);
                  return (
                    <tr key={inst.id} onClick={() => setDetalhe(inst)} className="cursor-pointer hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{inst.codigo}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{inst.nome}</p>
                        {inst.area && <p className="text-xs text-slate-400">{inst.area}</p>}
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-slate-500 lg:table-cell">{inst.numero_serie ?? '—'}</td>
                      <td className="hidden px-4 py-3 text-slate-500 md:table-cell">{ultima ? formatarData(ultima.calibrado_em) : '—'}</td>
                      <td className="hidden px-4 py-3 text-slate-500 md:table-cell">{ultima?.recalibrar_ate ? formatarData(ultima.recalibrar_ate) : '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{ultima?.valido_ate ? formatarData(ultima.valido_ate) : '—'}</td>
                      <td className="hidden px-4 py-3 text-xs text-slate-500 lg:table-cell">
                        {ultima?.certificado_numero ?? '—'}
                        {ultima && !ultima.conforme && <span className="ml-1 font-semibold text-red-700">NC</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${SIT_CLASS[sit]}`}>{SITUACAO_CALIBRACAO_LABEL[sit]}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {linhas.length === 0 && <p className="p-6 text-center text-sm text-slate-400">Nenhum instrumento com esse filtro.</p>}
          </Card>
        </>
      )}

      {detalhe && data && (
        <ModalDetalhe
          inst={detalhe}
          certificados={data.calibracoes.filter((c) => c.instrumento_id === detalhe.id)}
          onFechar={() => setDetalhe(null)}
          onNovo={() => { setRegistrarPara(detalhe.id); setDetalhe(null); }}
        />
      )}

      <Modal open={modalInstr} onClose={() => setModalInstr(false)} title="Novo instrumento">
        <form onSubmit={onCriarInstr} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Código do equipamento"><TextInput name="codigo" placeholder="BL01" required /></Field>
            <Field label="Equipamento"><TextInput name="nome" placeholder="Balança" required /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Área / Local"><TextInput name="area" placeholder="Ensaque 1" /></Field>
            <Field label="Número de série"><TextInput name="numero_serie" /></Field>
          </div>
          <Field label="Faixa de uso do equipamento"><TextInput name="faixa" placeholder="0 – 100 kg" /></Field>
          <Field label="Critério de aceitação"><TextInput name="criterio_aceitacao" placeholder="0,2 kg" /></Field>
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setModalInstr(false)}>Cancelar</Button><Button type="submit">Cadastrar</Button></div>
        </form>
      </Modal>

      <Modal open={registrarPara !== null} onClose={() => setRegistrarPara(null)} title="Registrar certificado de calibração" size="lg">
        <form key={registrarPara ?? ''} onSubmit={onCriarCalib} className="space-y-4">
          <Field label="Instrumento">
            <Select name="instrumento_id" defaultValue={registrarPara ?? ''} required>
              <option value="" disabled>Selecione…</option>
              {(data?.instrumentos ?? []).map((i) => (
                <option key={i.id} value={i.id}>{i.codigo} — {i.nome}{i.area ? ` (${i.area})` : ''}</option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Tipo"><Select name="tipo" defaultValue="calibracao">{TIPO_CALIBRACAO.map((t) => <option key={t} value={t}>{TIPO_CALIBRACAO_LABEL[t]}</option>)}</Select></Field>
            <Field label="Data de calibração"><TextInput name="calibrado_em" type="date" required defaultValue={hojeLocalISO()} /></Field>
            <Field label="Vencimento (recalibrar até)"><TextInput name="recalibrar_ate" type="date" /></Field>
            <Field label="Validade do certificado"><TextInput name="valido_ate" type="date" required /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Empresa"><TextInput name="empresa" placeholder="Laboratório de calibração" /></Field>
            <Field label="Nº do certificado"><TextInput name="certificado_numero" /></Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Faixa de medição calibrada"><TextInput name="faixa_calibrada" placeholder="20kg/40kg/60kg" /></Field>
            <Field label="Critério de aceitação"><TextInput name="criterio_aceitacao" defaultValue={instRegistro?.criterio_aceitacao ?? ''} /></Field>
            <Field label="Erro + incerteza expandida"><TextInput name="incerteza" placeholder="0,2 kg" /></Field>
          </div>
          <Field label="Análise crítica"><TextArea name="analise_critica" rows={3} placeholder="Certificado avaliado. Erro combinado inferior ao critério…" /></Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Resultado"><Select name="conforme" defaultValue="sim"><option value="sim">Conforme</option><option value="nao">Não conforme</option></Select></Field>
            <Field label="Verificado em"><TextInput name="verificado_em" type="date" defaultValue={hojeLocalISO()} /></Field>
            <Field label="Responsável pela verificação"><TextInput name="verificado_por" /></Field>
          </div>
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setRegistrarPara(null)}>Cancelar</Button><Button type="submit">Registrar</Button></div>
        </form>
      </Modal>
    </>
  );
}

function ModalDetalhe({ inst, certificados, onFechar, onNovo }: {
  inst: Instrumento; certificados: Calibracao[]; onFechar: () => void; onNovo: () => void;
}) {
  const ordenados = [...certificados].sort((a, b) => b.calibrado_em.localeCompare(a.calibrado_em));
  const linha = (rotulo: string, valor: string | null | undefined) => (
    <div><dt className="text-xs text-slate-400">{rotulo}</dt><dd className="text-[13px] text-slate-800">{valor || '—'}</dd></div>
  );
  return (
    <Modal open onClose={onFechar} title={`${inst.codigo} — ${inst.nome}`} size="lg">
      <div className="space-y-5">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {linha('Área / Local', inst.area)}
          {linha('Nº de série', inst.numero_serie)}
          {linha('Faixa de uso', inst.faixa)}
          {linha('Critério de aceitação', inst.criterio_aceitacao)}
        </dl>
        {ordenados.length === 0 && <p className="text-sm text-slate-400">Nenhum certificado registrado.</p>}
        {ordenados.map((c, i) => {
          const sit = situacaoCalibracao(c.valido_ate);
          return (
            <div key={c.id} className={`rounded-lg border p-3 ${i === 0 ? 'border-slate-300' : 'border-slate-200 opacity-70'}`}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-800">Certificado {c.certificado_numero ?? 's/ nº'}</p>
                {i === 0 ? (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SIT_CLASS[sit]}`}>{SITUACAO_CALIBRACAO_LABEL[sit]}</span>
                ) : <span className="text-xs text-slate-400">substituído</span>}
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.conforme ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                  {c.conforme ? 'Conforme' : 'Não conforme'}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {linha('Calibração', c.calibrado_em ? formatarData(c.calibrado_em) : null)}
                {linha('Vencimento', c.recalibrar_ate ? formatarData(c.recalibrar_ate) : null)}
                {linha('Validade', c.valido_ate ? formatarData(c.valido_ate) : null)}
                {linha('Empresa', c.empresa)}
                {linha('Faixa calibrada', c.faixa_calibrada)}
                {linha('Critério', c.criterio_aceitacao)}
                {linha('Erro + incerteza', c.incerteza)}
                {linha('Verificação', c.verificado_em ? `${formatarData(c.verificado_em)}${c.verificado_por ? ` · ${c.verificado_por}` : ''}` : c.verificado_por)}
              </dl>
              {c.analise_critica && <p className="mt-2 text-[13px] leading-relaxed text-slate-600"><span className="font-semibold text-slate-700">Análise crítica: </span>{c.analise_critica}</p>}
            </div>
          );
        })}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onFechar}>Fechar</Button>
          <Button onClick={onNovo}><IconPlus width={16} height={16} />Novo certificado</Button>
        </div>
      </div>
    </Modal>
  );
}
