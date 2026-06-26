import { useState, type FormEvent } from 'react';
import {
  listRecebimentos,
  listProdutos,
  listFornecedores,
  criarRecebimento,
  mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarDataHora, formatarQuantidade } from '../../lib/format';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select } from '../../components/ui';
import { IconRecebimento } from '../../components/icons';

export function RecebimentosPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  const { data, loading, error } = useAsync(async () => {
    const [recebimentos, produtos, fornecedores] = await Promise.all([
      listRecebimentos(),
      listProdutos(),
      listFornecedores(),
    ]);
    return {
      recebimentos,
      produtos,
      fornecedores,
      produtosMap: mapBy(produtos, 'id'),
      fornecedoresMap: mapBy(fornecedores, 'id'),
    };
  }, [recarregar]);

  const materiasPrimas = data?.produtos.filter((p) => p.tipo === 'materia_prima') ?? [];

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErroForm(null);
    const form = new FormData(e.currentTarget);
    const produto_id = String(form.get('produto_id') ?? '');
    if (!produto_id) {
      setErroForm('Selecione o produto.');
      return;
    }
    const fornecedor = String(form.get('fornecedor_id') ?? '');
    const qtd = String(form.get('quantidade') ?? '').trim();

    setSalvando(true);
    try {
      await criarRecebimento({
        produto_id,
        fornecedor_id: fornecedor || null,
        lote_mp: (String(form.get('lote_mp') ?? '').trim() || null) as string | null,
        variedade: (String(form.get('variedade') ?? '').trim() || null) as string | null,
        quantidade: qtd ? Number(qtd) : null,
        recebido_em: new Date().toISOString(),
      });
      (e.target as HTMLFormElement).reset();
      setRecarregar((n) => n + 1);
    } catch (err) {
      setErroForm(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <PageHeader title="Recebimentos" subtitle="Entrada de matéria-prima (etapa Descarga)" />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Formulário */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Novo recebimento
          </h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Produto (matéria-prima)">
              <Select name="produto_id" defaultValue="" required>
                <option value="" disabled>
                  Selecione…
                </option>
                {materiasPrimas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Fornecedor">
              <Select name="fornecedor_id" defaultValue="">
                <option value="">— não informado —</option>
                {data?.fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.razao_social}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lote da MP">
                <TextInput name="lote_mp" placeholder="MP-0001" />
              </Field>
              <Field label="Variedade">
                <TextInput name="variedade" placeholder="Cascuda" />
              </Field>
            </div>
            <Field label="Quantidade (kg)">
              <TextInput name="quantidade" type="number" step="any" min="0" placeholder="0" />
            </Field>
            {erroForm && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erroForm}</p>
            )}
            <Button type="submit" loading={salvando} className="w-full">
              Registrar recebimento
            </Button>
          </form>
        </Card>

        {/* Lista */}
        <div className="lg:col-span-3">
          {loading && (
            <div className="flex justify-center py-20">
              <Spinner className="h-7 w-7 text-emerald-600" />
            </div>
          )}
          {error && <Card className="p-4 text-sm text-red-600">Erro: {error}</Card>}
          {data && data.recebimentos.length === 0 && (
            <EmptyState
              icon={<IconRecebimento width={40} height={40} />}
              title="Nenhum recebimento"
              description="Os recebimentos de matéria-prima aparecerão aqui."
            />
          )}
          {data && data.recebimentos.length > 0 && (
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 font-medium">Produto</th>
                    <th className="hidden px-5 py-3 font-medium sm:table-cell">Fornecedor</th>
                    <th className="px-5 py-3 font-medium">Qtd.</th>
                    <th className="hidden px-5 py-3 font-medium md:table-cell">Recebido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recebimentos.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-slate-800">
                          {data.produtosMap.get(r.produto_id)?.nome ?? '—'}
                        </span>
                        {r.variedade && (
                          <span className="ml-2 text-xs text-slate-400">{r.variedade}</span>
                        )}
                      </td>
                      <td className="hidden px-5 py-3.5 text-slate-600 sm:table-cell">
                        {r.fornecedor_id ? data.fornecedoresMap.get(r.fornecedor_id)?.razao_social ?? '—' : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {formatarQuantidade(r.quantidade, 'kg')}
                      </td>
                      <td className="hidden px-5 py-3.5 text-slate-500 md:table-cell">
                        {formatarDataHora(r.recebido_em)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
