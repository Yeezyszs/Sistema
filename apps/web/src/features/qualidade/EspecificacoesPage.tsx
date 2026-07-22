import { useState, type FormEvent } from 'react';
import {
  listEspecificacoes,
  getParametrosDaEspecificacao,
  criarEspecificacao,
  criarParametro,
  listProdutos,
  listClientes,
  mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { limiteTexto, TEMPLATE_FISICO_QUIMICO } from '@sistema/domain';
import type { EspecificacaoParametro } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { IconFlask, IconPlus, IconChevronRight } from '../../components/icons';
import { useToast } from '../../components/Toast';

interface LinhaParam {
  ensaio: string;
  limite_min: string;
  limite_max: string;
  unidade: string;
  metodologia: string;
}

const LINHA_VAZIA: LinhaParam = { ensaio: '', limite_min: '', limite_max: '', unidade: '', metodologia: '' };

export function EspecificacoesPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<LinhaParam[]>([{ ...LINHA_VAZIA }]);
  const { sucesso, erro } = useToast();

  const { data, loading, error } = useAsync(async () => {
    const [especs, produtos, clientes] = await Promise.all([
      listEspecificacoes(),
      listProdutos(),
      listClientes(),
    ]);
    return { especs, produtos: mapBy(produtos, 'id'), produtosList: produtos, clientes: mapBy(clientes, 'id'), clientesList: clientes };
  }, [recarregar]);

  function carregarTemplate() {
    setLinhas(
      TEMPLATE_FISICO_QUIMICO.map((t) => ({
        ensaio: t.ensaio,
        limite_min: t.limite_min != null ? String(t.limite_min) : '',
        limite_max: t.limite_max != null ? String(t.limite_max) : '',
        unidade: t.unidade,
        metodologia: t.metodologia,
      })),
    );
  }

  function abrirModal() {
    setLinhas([{ ...LINHA_VAZIA }]);
    setModalAberto(true);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const produto_id = String(form.get('produto_id') ?? '');
    if (!produto_id) return;
    const params = linhas.filter((l) => l.ensaio.trim() !== '');
    if (params.length === 0) {
      erro('Adicione ao menos um parâmetro.');
      return;
    }
    const shelf = String(form.get('shelf_life_dias') ?? '').trim();
    setSalvando(true);
    try {
      const esp = await criarEspecificacao({
        produto_id,
        cliente_id: String(form.get('cliente_id') ?? '') || null,
        nome: String(form.get('nome') ?? '').trim() || null,
        shelf_life_dias: shelf ? Number(shelf) : null,
      });
      let ordem = 0;
      for (const p of params) {
        await criarParametro({
          especificacao_id: esp.id,
          ensaio: p.ensaio.trim(),
          limite_min: p.limite_min.trim() ? Number(p.limite_min) : null,
          limite_max: p.limite_max.trim() ? Number(p.limite_max) : null,
          unidade: p.unidade.trim() || null,
          metodologia: p.metodologia.trim() || null,
          ordem: ordem++,
        });
      }
      sucesso('Especificação cadastrada.');
      setModalAberto(false);
      setRecarregar((n) => n + 1);
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Especificações"
        subtitle="Limites de referência por produto × cliente (base dos laudos)"
        action={
          <Button onClick={abrirModal}>
            <IconPlus width={16} height={16} />
            Nova especificação
          </Button>
        }
      />

      {loading && (
        <div className="flex justify-center py-20">
          <Spinner className="h-7 w-7 text-brand-600" />
        </div>
      )}
      {error && <Card className="p-4 text-sm text-red-600">Erro: {error}</Card>}

      {data && data.especs.length === 0 && (
        <EmptyState
          icon={<IconFlask width={36} height={36} />}
          title="Nenhuma especificação"
          description="Cadastre os limites por produto/cliente para os laudos puxarem automaticamente."
        />
      )}

      {data && data.especs.length > 0 && (
        <div className="space-y-3">
          {data.especs.map((esp) => (
            <EspecCard
              key={esp.id}
              titulo={esp.nome ?? data.produtos.get(esp.produto_id)?.nome ?? 'Especificação'}
              produto={data.produtos.get(esp.produto_id)?.nome ?? '—'}
              cliente={esp.cliente_id ? data.clientes.get(esp.cliente_id)?.nome ?? null : null}
              shelf={esp.shelf_life_dias}
              aberta={expandida === esp.id}
              onToggle={() => setExpandida((v) => (v === esp.id ? null : esp.id))}
              especId={esp.id}
            />
          ))}
        </div>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title="Nova especificação" size="xl">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2">
              <Field label="Produto">
                <Select name="produto_id" defaultValue="" required>
                  <option value="" disabled>Selecione…</option>
                  {(data?.produtosList ?? []).map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Cliente">
              <Select name="cliente_id" defaultValue="">
                <option value="">Padrão (interna)</option>
                {(data?.clientesList ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </Select>
            </Field>
            <Field label="Shelf life (dias)">
              <TextInput name="shelf_life_dias" type="number" min="0" placeholder="180" />
            </Field>
          </div>
          <Field label="Rótulo (opcional)">
            <TextInput name="nome" placeholder="Ex.: GM Farinha Crua 5%" />
          </Field>

          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Parâmetros</p>
            <button type="button" onClick={carregarTemplate} className="text-xs font-medium text-brand-600 hover:text-brand-700">
              Carregar padrão (farinha)
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pr-2 font-medium">Ensaio</th>
                  <th className="pb-2 px-2 font-medium">Mín</th>
                  <th className="pb-2 px-2 font-medium">Máx</th>
                  <th className="pb-2 pl-2 font-medium">Unidade</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-2"><TextInput value={l.ensaio} onChange={(e) => setLinhas((p) => p.map((x, idx) => idx === i ? { ...x, ensaio: e.target.value } : x))} placeholder="Teor de umidade" /></td>
                    <td className="py-1 px-2 w-20"><TextInput type="number" step="any" value={l.limite_min} onChange={(e) => setLinhas((p) => p.map((x, idx) => idx === i ? { ...x, limite_min: e.target.value } : x))} /></td>
                    <td className="py-1 px-2 w-20"><TextInput type="number" step="any" value={l.limite_max} onChange={(e) => setLinhas((p) => p.map((x, idx) => idx === i ? { ...x, limite_max: e.target.value } : x))} /></td>
                    <td className="py-1 pl-2 w-24"><TextInput value={l.unidade} onChange={(e) => setLinhas((p) => p.map((x, idx) => idx === i ? { ...x, unidade: e.target.value } : x))} placeholder="%" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={() => setLinhas((p) => [...p, { ...LINHA_VAZIA }])} className="text-xs font-medium text-brand-600 hover:text-brand-700">
            + Adicionar parâmetro
          </button>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button type="submit" loading={salvando}>Salvar especificação</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function EspecCard({
  titulo, produto, cliente, shelf, aberta, onToggle, especId,
}: {
  titulo: string; produto: string; cliente: string | null; shelf: number | null;
  aberta: boolean; onToggle: () => void; especId: string;
}) {
  const { data: params } = useAsync(async () => (aberta ? getParametrosDaEspecificacao(especId) : null), [especId, aberta]);
  return (
    <Card className="overflow-hidden">
      <div className="flex cursor-pointer items-center justify-between gap-4 p-5 hover:bg-slate-50" onClick={onToggle}>
        <div>
          <p className="font-semibold text-slate-900">{titulo}</p>
          <p className="text-xs text-slate-400">
            {produto}{cliente ? ` · ${cliente}` : ' · interna'}{shelf != null ? ` · shelf ${shelf}d` : ''}
          </p>
        </div>
        <IconChevronRight className={`text-slate-300 transition-transform ${aberta ? 'rotate-90' : ''}`} />
      </div>
      {aberta && (
        <div className="border-t border-slate-100 px-5 py-4">
          {params == null ? (
            <Spinner className="h-5 w-5 text-brand-600" />
          ) : params.length === 0 ? (
            <p className="text-sm text-slate-400">Sem parâmetros.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {params.map((p: EspecificacaoParametro) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-2 text-slate-700">{p.ensaio}</td>
                    <td className="py-2 px-2 text-slate-500">{limiteTexto(p)}</td>
                    <td className="py-2 pl-2 text-xs text-slate-400">{p.metodologia ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </Card>
  );
}
