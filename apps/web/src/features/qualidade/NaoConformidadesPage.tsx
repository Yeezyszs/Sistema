import { useState, type FormEvent } from 'react';
import {
  listNaoConformidades,
  listLotes,
  listFornecedores,
  listClientes,
  criarNaoConformidade,
  mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData } from '../../lib/format';
import {
  ORIGEM_NC,
  ORIGEM_NC_LABEL,
  STATUS_NC_LABEL,
  STATUS_NC_TOM,
  DISPOSICAO_NC,
  DISPOSICAO_NC_LABEL,
  TIPO_NC,
  TIPO_NC_LABEL,
  TIPO_NC_CURTO,
  periodoVigente,
  rotuloPeriodo,
  intervaloDoPeriodo,
} from '@sistema/domain';
import type { NaoConformidade, TipoNC } from '@sistema/domain';
import { NcDetalhe } from './NcDetalhe';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, TextArea, Select, Modal, ErroCarregamento } from '../../components/ui';
import { IconShield, IconPlus } from '../../components/icons';
import { useToast } from '../../components/Toast';

const TOM_CLASS: Record<string, string> = {
  erro: 'bg-red-100 text-red-700',
  alerta: 'bg-amber-100 text-amber-700',
  sucesso: 'bg-brand-100 text-brand-700',
  info: 'bg-sky-100 text-sky-700',
};

export function NaoConformidadesPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [filtro, setFiltro] = useState<'todas' | 'abertas'>('abertas');
  const [fornecedorFiltro, setFornecedorFiltro] = useState('');
  const [periodoFiltro, setPeriodoFiltro] = useState('');
  const [aberta, setAberta] = useState<NaoConformidade | null>(null);
  const [reincidenciaDe, setReincidenciaDe] = useState<number | null>(null);
  const { sucesso, erro } = useToast();

  const { data, loading, error } = useAsync(async () => {
    const [ncs, lotes, fornecedores, clientes] = await Promise.all([
      listNaoConformidades(),
      listLotes(),
      listFornecedores(),
      listClientes(),
    ]);
    return {
      ncs,
      lotes,
      lotesMap: mapBy(lotes, 'id'),
      fornecedores,
      fornecedoresMap: mapBy(fornecedores, 'id'),
      clientes,
    };
  }, [recarregar]);

  // Os filtros por fornecedor e por semestre existem para responder à pergunta
  // que a avaliação de desempenho faz: quantas NCs este fornecedor teve no
  // período? É o 4º critério do FOR-POP 07.
  const ncsVisiveis = (data?.ncs ?? []).filter((nc) => {
    if (filtro === 'abertas' && nc.status === 'concluida') return false;
    if (fornecedorFiltro && nc.fornecedor_id !== fornecedorFiltro) return false;
    if (periodoFiltro) {
      const [inicio, fim] = intervaloDoPeriodo(periodoFiltro);
      const dia = (nc.aberta_em ?? '').slice(0, 10);
      if (dia < inicio || dia > fim) return false;
    }
    return true;
  });

  // A NC aberta no detalhe precisa vir da lista recarregada, senão o modal
  // segue mostrando o estado anterior depois de salvar.
  const ncAberta = aberta ? data?.ncs.find((n) => n.id === aberta.id) ?? aberta : null;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const descricao = String(form.get('descricao') ?? '').trim();
    const origem = String(form.get('origem') ?? '') as (typeof ORIGEM_NC)[number];
    if (!descricao || !origem) return;
    const qtd = String(form.get('qtd_nao_conforme_kg') ?? '').trim();
    setSalvando(true);
    try {
      await criarNaoConformidade({
        tipo: (String(form.get('tipo') ?? 'rnc') as TipoNC),
        reincidencia_de: reincidenciaDe,
        origem,
        descricao,
        lote_id: String(form.get('lote_id') ?? '') || null,
        fornecedor_id: String(form.get('fornecedor_id') ?? '') || null,
        cliente_id: String(form.get('cliente_id') ?? '') || null,
        qtd_nao_conforme_kg: qtd ? Number(qtd) : null,
        disposicao: (String(form.get('disposicao') ?? '') || null) as never,
      });
      sucesso('Não conformidade registrada.');
      setModalAberto(false);
      setReincidenciaDe(null);
      setRecarregar((n) => n + 1);
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha ao registrar NC.');
    } finally {
      setSalvando(false);
    }
  }


  return (
    <>
      <PageHeader grupo="Qualidade"
        title="Não conformidades"
        subtitle="RNC e notificações de ocorrência (FSSC 22000)"
        action={
          <Button onClick={() => setModalAberto(true)}>
            <IconPlus width={16} height={16} />
            Nova NC
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-2">
        {(['abertas', 'todas'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-full border px-3.5 py-[7px] text-[12.5px] font-semibold transition ${
              filtro === f ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {f === 'abertas' ? 'Em aberto' : 'Todas'}
          </button>
        ))}
        <Select value={fornecedorFiltro} onChange={(e) => setFornecedorFiltro(e.target.value)} className="!w-56">
          <option value="">Todos os fornecedores</option>
          {(data?.fornecedores ?? []).map((f) => (
            <option key={f.id} value={f.id}>{f.razao_social}</option>
          ))}
        </Select>
        <Select value={periodoFiltro} onChange={(e) => setPeriodoFiltro(e.target.value)} className="!w-44">
          <option value="">Todos os períodos</option>
          {ultimosSemestres().map((p) => (
            <option key={p} value={p}>{rotuloPeriodo(p)}</option>
          ))}
        </Select>
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <Spinner className="h-7 w-7 text-brand-600" />
        </div>
      )}
      {error && <ErroCarregamento mensagem={error} />}

      {data && ncsVisiveis.length === 0 && (
        <EmptyState
          icon={<IconShield width={36} height={36} />}
          title={filtro === 'abertas' ? 'Nenhuma NC em aberto' : 'Nenhuma NC registrada'}
          description="As não conformidades aparecerão aqui."
        />
      )}

      {data && ncsVisiveis.length > 0 && (
        <div className="space-y-3">
          {ncsVisiveis.map((nc) => (
            <Card key={nc.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <button type="button" onClick={() => setAberta(nc)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">NC nº {nc.numero}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TOM_CLASS[STATUS_NC_TOM[nc.status]]}`}>
                      {STATUS_NC_LABEL[nc.status]}
                    </span>
                    <span className="text-xs text-slate-400">{TIPO_NC_CURTO[nc.tipo]}</span>
                    <span className="text-xs text-slate-400">{ORIGEM_NC_LABEL[nc.origem]}</span>
                    {nc.reincidencia_de != null && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        Reincidência da nº {nc.reincidencia_de}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{nc.descricao}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    {nc.lote_id && <span>Lote: {data.lotesMap.get(nc.lote_id)?.codigo ?? '—'}</span>}
                    {nc.qtd_nao_conforme_kg != null && <span>{nc.qtd_nao_conforme_kg} kg NC</span>}
                    {nc.disposicao && <span>Disposição: {DISPOSICAO_NC_LABEL[nc.disposicao]}</span>}
                    {nc.fornecedor_id && <span>Fornecedor: {data.fornecedoresMap.get(nc.fornecedor_id)?.razao_social ?? '—'}</span>}
                    <span>Aberta em {formatarData(nc.aberta_em)}</span>
                  </div>
                </button>
                <div className="shrink-0">
                  {nc.status !== 'concluida' ? (
                    <Button className="px-3 py-1.5 text-xs" onClick={() => setAberta(nc)}>
                      Tratar
                    </Button>
                  ) : (
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs text-slate-400">Encerrada {formatarData(nc.encerrada_em)}</span>
                      {nc.eficacia === 'ineficaz' && (
                        <Button variant="outline" className="px-3 py-1.5 text-xs"
                          onClick={() => { setReincidenciaDe(nc.numero); setModalAberto(true); }}>
                          Abrir reincidência
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalAberto} onClose={() => { setModalAberto(false); setReincidenciaDe(null); }}
        title={reincidenciaDe ? `Reincidência da NC nº ${reincidenciaDe}` : 'Nova não conformidade'} size="lg">
        <form onSubmit={onSubmit} className="space-y-4">
          {reincidenciaDe != null && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              Esta NC nasce ligada à nº {reincidenciaDe}, cuja ação corretiva não foi eficaz.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <Select name="tipo" defaultValue="rnc">
                {TIPO_NC.map((t) => (
                  <option key={t} value={t}>{TIPO_NC_LABEL[t]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Origem">
              <Select name="origem" defaultValue="" required>
                <option value="" disabled>Selecione…</option>
                {ORIGEM_NC.map((o) => (
                  <option key={o} value={o}>{ORIGEM_NC_LABEL[o]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Lote afetado">
              <Select name="lote_id" defaultValue="">
                <option value="">— nenhum —</option>
                {(data?.lotes ?? []).map((l) => (
                  <option key={l.id} value={l.id}>{l.codigo}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Descrição">
            <TextArea name="descricao" required placeholder="Descreva o desvio identificado…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fornecedor (se aplicável)">
              <Select name="fornecedor_id" defaultValue="">
                <option value="">— nenhum —</option>
                {(data?.fornecedores ?? []).map((f) => (
                  <option key={f.id} value={f.id}>{f.razao_social}</option>
                ))}
              </Select>
            </Field>
            <Field label="Cliente (se aplicável)">
              <Select name="cliente_id" defaultValue="">
                <option value="">— nenhum —</option>
                {(data?.clientes ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Qtd. não conforme (kg)">
              <TextInput name="qtd_nao_conforme_kg" type="number" step="any" min="0" placeholder="0" />
            </Field>
            <Field label="Disposição do produto">
              <Select name="disposicao" defaultValue="">
                <option value="">— a definir —</option>
                {DISPOSICAO_NC.map((d) => (
                  <option key={d} value={d}>{DISPOSICAO_NC_LABEL[d]}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button type="submit" loading={salvando}>Registrar NC</Button>
          </div>
        </form>
      </Modal>

      {ncAberta && data && (
        <NcDetalhe
          nc={ncAberta}
          fornecedorNome={ncAberta.fornecedor_id ? data.fornecedoresMap.get(ncAberta.fornecedor_id)?.razao_social ?? null : null}
          loteCodigo={ncAberta.lote_id ? data.lotesMap.get(ncAberta.lote_id)?.codigo ?? null : null}
          onFechar={() => setAberta(null)}
          onMudou={() => setRecarregar((n) => n + 1)}
        />
      )}
    </>
  );
}

// Os semestres do formulário FOR-POP 07, do mais recente para trás.
function ultimosSemestres(): string[] {
  const vigente = periodoVigente();
  const lista: string[] = [];
  for (let ano = Number(vigente.slice(0, 4)); ano >= 2022; ano--) {
    for (const mes of ['07', '01']) {
      const p = `${ano}-${mes}`;
      if (p <= vigente) lista.push(p);
    }
  }
  return lista;
}
