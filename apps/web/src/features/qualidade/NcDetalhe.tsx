// Tratativa de uma não conformidade: causa raiz, ações corretivas e eficácia.
//
// A tela de lista abre e fecha NC; o ciclo completo exigido pela FSSC mora
// aqui — 5 porquês, o que foi feito, e a verificação de que funcionou. Quando
// a verificação diz que não funcionou, a NC vira reincidência de si mesma numa
// nova abertura, e é esse número que pesa na avaliação do fornecedor.
import { useState } from 'react';
import {
  getCorrecoesDaNC, criarCorrecaoNC, atualizarNaoConformidade, listFuncionarios, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData } from '../../lib/format';
import {
  STATUS_NC_LABEL, ORIGEM_NC_LABEL, TIPO_NC_CURTO,
  DISPOSICAO_NC, DISPOSICAO_NC_LABEL, EFICACIA_NC, EFICACIA_NC_LABEL,
  porquesPreenchidos,
} from '@sistema/domain';
import type { NaoConformidade, EficaciaNC, DisposicaoNC } from '@sistema/domain';
import {
  Modal, Button, Field, TextInput, TextArea, Select, Spinner, ErroCarregamento,
} from '../../components/ui';
import { useToast } from '../../components/Toast';

const N_PORQUES = 5;

export function NcDetalhe({
  nc, fornecedorNome, loteCodigo, onFechar, onMudou,
}: {
  nc: NaoConformidade;
  fornecedorNome: string | null;
  loteCodigo: string | null;
  onFechar: () => void;
  onMudou: () => void;
}) {
  const [recarregar, setRecarregar] = useState(0);
  const [porques, setPorques] = useState<string[]>(() => {
    const base = nc.causa_raiz?.porques ?? [];
    return Array.from({ length: N_PORQUES }, (_, i) => base[i] ?? '');
  });
  const [conclusao, setConclusao] = useState(nc.causa_raiz?.conclusao ?? '');
  const [disposicao, setDisposicao] = useState<DisposicaoNC | ''>(nc.disposicao ?? '');
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  const { data, loading, error } = useAsync(async () => {
    const [correcoes, funcionarios] = await Promise.all([getCorrecoesDaNC(nc.id), listFuncionarios()]);
    return { correcoes, funcionarios, funcMap: mapBy(funcionarios, 'id') };
  }, [nc.id, recarregar]);

  const encerrada = nc.status === 'concluida';
  // Encerrar exige causa raiz salva: a verificação de eficácia só faz sentido
  // sobre uma causa. O que conta é o que está gravado, não o que foi digitado.
  const semCausa = porquesPreenchidos(nc.causa_raiz).length === 0;

  async function comErro(fn: () => Promise<void>) {
    setSalvando(true);
    try { await fn(); }
    catch (e) { erro(e instanceof Error ? e.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  const salvarCausa = () => comErro(async () => {
    await atualizarNaoConformidade(nc.id, {
      causa_raiz: { porques: porques.map((p) => p.trim()), conclusao: conclusao.trim() || undefined },
      disposicao: disposicao || null,
      ...(nc.status === 'aberta' ? { status: 'em_andamento' as const } : {}),
    });
    sucesso('Tratativa salva.');
    onMudou();
  });

  const registrarEficacia = (eficacia: EficaciaNC) => comErro(async () => {
    await atualizarNaoConformidade(nc.id, {
      eficacia,
      status: 'concluida',
      encerrada_em: new Date().toISOString(),
    });
    sucesso(eficacia === 'ineficaz'
      ? 'Encerrada como não eficaz — abra uma reincidência.'
      : 'Não conformidade encerrada.');
    onMudou();
    onFechar();
  });

  const adicionarCorrecao = (form: HTMLFormElement) => comErro(async () => {
    const f = new FormData(form);
    const descricao = String(f.get('descricao') ?? '').trim();
    if (!descricao) return;
    await criarCorrecaoNC({
      nc_id: nc.id,
      descricao,
      responsavel_id: String(f.get('responsavel_id') ?? '') || null,
      data_implementacao: String(f.get('data_implementacao') ?? '') || null,
    });
    form.reset();
    sucesso('Ação corretiva registrada.');
    setRecarregar((n) => n + 1);
  });

  return (
    <Modal open onClose={onFechar} title={`NC nº ${nc.numero} — ${TIPO_NC_CURTO[nc.tipo]}`} size="lg">
      <div className="space-y-5">
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-sm text-slate-800">{nc.descricao}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>Origem: {ORIGEM_NC_LABEL[nc.origem]}</span>
            {fornecedorNome && <span>Fornecedor: {fornecedorNome}</span>}
            {loteCodigo && <span>Lote: {loteCodigo}</span>}
            {nc.qtd_nao_conforme_kg != null && <span>{nc.qtd_nao_conforme_kg} kg</span>}
            <span>Aberta em {formatarData(nc.aberta_em)}</span>
            <span>Situação: {STATUS_NC_LABEL[nc.status]}</span>
            {nc.reincidencia_de != null && (
              <span className="font-semibold text-red-700">Reincidência da NC nº {nc.reincidencia_de}</span>
            )}
          </div>
        </div>

        {/* 1. Causa raiz */}
        <section>
          <h3 className="text-sm font-semibold text-slate-800">Causa raiz — 5 porquês</h3>
          <div className="mt-2 space-y-2">
            {porques.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-xs text-slate-400">{i + 1}º porquê</span>
                <TextInput value={p} disabled={encerrada}
                  onChange={(e) => setPorques((ant) => ant.map((v, j) => (j === i ? e.target.value : v)))}
                  placeholder={i === 0 ? 'Por que o desvio aconteceu?' : 'Por quê?'} />
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Causa identificada">
              <TextArea value={conclusao} disabled={encerrada} onChange={(e) => setConclusao(e.target.value)}
                placeholder="Conclusão da análise" />
            </Field>
            <Field label="Disposição do produto">
              <Select value={disposicao} disabled={encerrada}
                onChange={(e) => setDisposicao(e.target.value as DisposicaoNC | '')}>
                <option value="">— a definir —</option>
                {DISPOSICAO_NC.map((d) => <option key={d} value={d}>{DISPOSICAO_NC_LABEL[d]}</option>)}
              </Select>
            </Field>
          </div>
          {!encerrada && (
            <div className="mt-2 flex justify-end">
              <Button className="px-3 py-1.5 text-xs" loading={salvando} onClick={() => void salvarCausa()}>
                Salvar tratativa
              </Button>
            </div>
          )}
        </section>

        {/* 2. Ações corretivas */}
        <section className="border-t border-slate-200 pt-4">
          <h3 className="text-sm font-semibold text-slate-800">Ações corretivas</h3>
          {error && <ErroCarregamento mensagem={error} />}
          {loading && <div className="py-4"><Spinner className="h-5 w-5 text-brand-600" /></div>}
          {data && data.correcoes.length === 0 && (
            <p className="mt-1 text-xs text-slate-400">Nenhuma ação registrada.</p>
          )}
          {data && data.correcoes.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {data.correcoes.map((c) => (
                <li key={c.id} className="rounded-lg border border-slate-200 px-3 py-2">
                  <p className="text-sm text-slate-800">{c.descricao}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {c.responsavel_id ? data.funcMap.get(c.responsavel_id)?.nome ?? '—' : 'Sem responsável'}
                    {c.data_implementacao && ` · implementada em ${formatarData(c.data_implementacao)}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {!encerrada && (
            <form className="mt-3 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_11rem_11rem_auto]"
              onSubmit={(e) => { e.preventDefault(); void adicionarCorrecao(e.currentTarget); }}>
              <Field label="Ação"><TextInput name="descricao" placeholder="O que foi feito" /></Field>
              <Field label="Responsável">
                <Select name="responsavel_id" defaultValue="">
                  <option value="">—</option>
                  {(data?.funcionarios ?? []).map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </Select>
              </Field>
              <Field label="Implementada em"><TextInput name="data_implementacao" type="date" /></Field>
              <Button type="submit" variant="outline" className="px-3 py-2 text-xs">Adicionar</Button>
            </form>
          )}
        </section>

        {/* 3. Eficácia */}
        <section className="border-t border-slate-200 pt-4">
          <h3 className="text-sm font-semibold text-slate-800">Verificação de eficácia</h3>
          {encerrada ? (
            <p className="mt-1 text-sm text-slate-600">
              {nc.eficacia ? EFICACIA_NC_LABEL[nc.eficacia] : 'Sem registro'} · encerrada em {formatarData(nc.encerrada_em)}
            </p>
          ) : (
            <>
              <p className="mt-1 text-xs text-slate-500">
                A FSSC pede a verificação de que a ação resolveu — é ela que encerra a NC.
                {semCausa && ' Registre e salve a causa raiz antes de encerrar.'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EFICACIA_NC.map((e) => (
                  <Button key={e} variant={e === 'ineficaz' ? 'outline' : 'primary'}
                    className="px-3 py-1.5 text-xs" loading={salvando} disabled={semCausa}
                    onClick={() => void registrarEficacia(e)}>
                    {EFICACIA_NC_LABEL[e]}
                  </Button>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </Modal>
  );
}
