import { useState, type FormEvent } from 'react';
import {
  listNaoConformidades,
  listLotes,
  listFornecedores,
  listClientes,
  criarNaoConformidade,
  atualizarStatusNC,
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
} from '@sistema/domain';
import type { StatusNC } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, TextArea, Select, Modal } from '../../components/ui';
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
      clientes,
    };
  }, [recarregar]);

  const ncsVisiveis = (data?.ncs ?? []).filter((nc) =>
    filtro === 'abertas' ? nc.status !== 'concluida' : true,
  );

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
      setRecarregar((n) => n + 1);
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha ao registrar NC.');
    } finally {
      setSalvando(false);
    }
  }

  async function mudarStatus(id: string, status: StatusNC) {
    try {
      await atualizarStatusNC(id, status);
      sucesso('Status atualizado.');
      setRecarregar((n) => n + 1);
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha.');
    }
  }

  return (
    <>
      <PageHeader
        title="Não conformidades"
        subtitle="RNC e notificações de ocorrência (FSSC 22000)"
        action={
          <Button onClick={() => setModalAberto(true)}>
            <IconPlus width={16} height={16} />
            Nova NC
          </Button>
        }
      />

      <div className="mb-4 flex gap-2">
        {(['abertas', 'todas'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filtro === f ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {f === 'abertas' ? 'Em aberto' : 'Todas'}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <Spinner className="h-7 w-7 text-brand-600" />
        </div>
      )}
      {error && <Card className="p-4 text-sm text-red-600">Erro: {error}</Card>}

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
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">NC nº {nc.numero}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TOM_CLASS[STATUS_NC_TOM[nc.status]]}`}>
                      {STATUS_NC_LABEL[nc.status]}
                    </span>
                    <span className="text-xs text-slate-400">{ORIGEM_NC_LABEL[nc.origem]}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{nc.descricao}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    {nc.lote_id && <span>Lote: {data.lotesMap.get(nc.lote_id)?.codigo ?? '—'}</span>}
                    {nc.qtd_nao_conforme_kg != null && <span>{nc.qtd_nao_conforme_kg} kg NC</span>}
                    {nc.disposicao && <span>Disposição: {DISPOSICAO_NC_LABEL[nc.disposicao]}</span>}
                    <span>Aberta em {formatarData(nc.aberta_em)}</span>
                  </div>
                </div>
                <div className="shrink-0">
                  {nc.status !== 'concluida' ? (
                    <div className="flex flex-col gap-2">
                      {nc.status === 'aberta' && (
                        <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={() => void mudarStatus(nc.id, 'em_andamento')}>
                          Iniciar tratativa
                        </Button>
                      )}
                      <Button
                        className="px-3 py-1.5 text-xs"
                        onClick={() => void mudarStatus(nc.id, 'concluida')}
                      >
                        Concluir
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Encerrada {formatarData(nc.encerrada_em)}</span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title="Nova não conformidade" size="lg">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
    </>
  );
}
