// Produtores de mandioca — o cadastro do comprador.
//
// São 161 nomes, mas só um punhado entrega de fato. Por isso a tela abre na
// lista de trabalho (os ativos) e o resto fica a uma aba de distância: quem
// decide quem está em qual lado é o comprador, não o sistema.
import { useState, type FormEvent } from 'react';
import { listProdutores, criarProdutor, atualizarProdutor, excluirProdutor } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { FORMA_PAGAMENTO, FORMA_PAGAMENTO_LABEL, VARIEDADES_MANDIOCA } from '@sistema/domain';
import type { Fornecedor, FormaPagamento } from '@sistema/domain';
import {
  PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal,
  ErroCarregamento, LINHA_CABECALHO,
} from '../../components/ui';
import { IconPlus, IconSearch } from '../../components/icons';
import { useToast } from '../../components/Toast';
import { useAbaUrl } from '../../lib/useAbaUrl';

const ABAS = ['ativos', 'contatos'] as const;

export function ProdutoresPage() {
  const [aba, setAba] = useAbaUrl('lista', ABAS, 'ativos');
  const [recarregar, setRecarregar] = useState(0);
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<Fornecedor | null>(null);
  const [novo, setNovo] = useState(false);
  const [excluindo, setExcluindo] = useState<Fornecedor | null>(null);
  const { sucesso, erro } = useToast();

  const { data, loading, error } = useAsync(() => listProdutores(), [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  const todos = data ?? [];
  const ativos = todos.filter((p) => p.ativo);
  const contatos = todos.filter((p) => !p.ativo);

  const q = busca.trim().toLowerCase();
  const lista = (aba === 'ativos' ? ativos : contatos).filter((p) =>
    !q || [p.razao_social, p.contato, p.cidade, p.telefone].some((v) => (v ?? '').toLowerCase().includes(q)),
  );

  async function alternarAtivo(p: Fornecedor) {
    try {
      await atualizarProdutor(p.id, { ativo: !p.ativo });
      sucesso(p.ativo ? `${p.razao_social} saiu da lista de trabalho.` : `${p.razao_social} entrou na lista.`);
      rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    try {
      await excluirProdutor(excluindo.id);
      sucesso('Produtor excluído.');
      setExcluindo(null);
      rec();
    } catch (err) {
      // Chave estrangeira: já tem carga ou previsão apontando para ele.
      erro(
        err instanceof Error && /foreign key|violates/i.test(err.message)
          ? 'Este produtor já tem carga ou previsão registrada. Em vez de excluir, tire-o da lista de trabalho.'
          : err instanceof Error ? err.message : 'Falha.',
      );
    }
  }

  return (
    <>
      <PageHeader
        grupo="Suprimentos"
        title="Produtores de mandioca"
        subtitle="Quem está na lista de trabalho da semana — e quem é só contato"
        action={<Button onClick={() => { setEditando(null); setNovo(true); }}>
          <IconPlus width={16} height={16} />Novo produtor
        </Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          {ABAS.map((id) => (
            <button key={id} onClick={() => setAba(id)}
              className={`rounded-full border px-3.5 py-[7px] text-[12.5px] font-semibold transition ${
                aba === id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}>
              {id === 'ativos' ? `Lista de trabalho (${ativos.length})` : `Só contato (${contatos.length})`}
            </button>
          ))}
        </div>
        <div className="relative min-w-[200px] flex-1">
          <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" placeholder="Buscar nome, contato, cidade ou telefone…"
            value={busca} onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-[7px] border border-slate-300 bg-white py-2 pl-9 pr-3 text-[12.5px] outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </div>
      </div>

      {error && <ErroCarregamento mensagem={error} />}
      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}

      {data && lista.length === 0 && (
        <EmptyState
          title={q ? 'Nenhum produtor encontrado' : aba === 'ativos' ? 'Lista de trabalho vazia' : 'Nenhum contato'}
          description={q ? 'Tente outro termo.' : aba === 'ativos'
            ? 'Traga alguém de "Só contato" ou cadastre um produtor novo.'
            : undefined} />
      )}

      {data && lista.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={LINHA_CABECALHO}>
                <th className="px-4 py-[11px]">Produtor</th>
                <th className="hidden px-4 py-[11px] md:table-cell">Cidade</th>
                <th className="hidden px-4 py-[11px] lg:table-cell">Telefone</th>
                <th className="hidden px-4 py-[11px] lg:table-cell">Pagamento</th>
                <th className="px-4 py-[11px]" />
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <span className="font-semibold text-slate-900">{p.razao_social}</span>
                    {p.contato && p.contato !== p.razao_social && (
                      <span className="block text-[11px] text-slate-400">{p.contato}</span>
                    )}
                    {p.variedades && p.variedades.length > 0 && (
                      <span className="mt-1 block text-[11px] text-slate-500">{p.variedades.join(' · ')}</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-2.5 text-slate-600 md:table-cell">
                    {p.cidade ? `${p.cidade}${p.uf ? ` · ${p.uf}` : ''}` : '—'}
                  </td>
                  <td className="hidden px-4 py-2.5 text-slate-600 lg:table-cell">{p.telefone ?? '—'}</td>
                  <td className="hidden px-4 py-2.5 lg:table-cell">
                    {p.pagamento_padrao ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {FORMA_PAGAMENTO_LABEL[p.pagamento_padrao]}
                      </span>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    <button onClick={() => void alternarAtivo(p)}
                      className="mr-3 text-xs font-semibold text-brand-700 hover:underline">
                      {p.ativo ? 'Tirar da lista' : 'Pôr na lista'}
                    </button>
                    <button onClick={() => { setEditando(p); setNovo(true); }}
                      className="mr-3 text-xs font-medium text-slate-500 hover:text-brand-600">Editar</button>
                    <button onClick={() => setExcluindo(p)}
                      className="text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {data && aba === 'contatos' && lista.length > 0 && (
        <p className="mt-3 rounded-[10px] border border-dashed border-slate-300 bg-white px-4 py-3 text-xs leading-relaxed text-slate-600">
          Estes vieram da planilha de contatos e <strong className="font-semibold text-slate-800">nunca
          apareceram numa previsão</strong>. Ficam aqui para consulta, sem poluir a lista da semana —
          basta "pôr na lista" quando um deles voltar a fornecer.
        </p>
      )}

      {novo && (
        <ModalProdutor produtor={editando} onClose={() => { setNovo(false); setEditando(null); }} onSaved={rec} />
      )}

      {excluindo && (
        <Modal open onClose={() => setExcluindo(null)} title="Excluir produtor">
          <p className="text-[13.5px] text-slate-600">
            Excluir <strong className="font-semibold text-slate-900">{excluindo.razao_social}</strong> do cadastro?
          </p>
          <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Se ele já tiver carga ou previsão registrada, a exclusão é recusada — apagar levaria o
            histórico junto. Nesse caso use <strong className="font-semibold text-slate-800">"tirar da
            lista"</strong>, que some da rotina e preserva o que já aconteceu.
          </p>
          <div className="mt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setExcluindo(null)}>Cancelar</Button>
            <Button type="button" variant="perigo" onClick={() => void confirmarExclusao()}>Excluir</Button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ── Cadastro / edição ──────────────────────────────────────────
function ModalProdutor({ produtor, onClose, onSaved }: {
  produtor: Fornecedor | null; onClose: () => void; onSaved: () => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const [variedades, setVariedades] = useState<string[]>(produtor?.variedades ?? []);
  const { sucesso, erro } = useToast();

  function alternarVariedade(v: string) {
    setVariedades((atual) => (atual.includes(v) ? atual.filter((x) => x !== v) : [...atual, v]));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const txt = (k: string) => String(f.get(k) ?? '').trim() || null;
    const nome = String(f.get('razao_social') ?? '').trim();
    if (!nome) return;

    const distancia = String(f.get('distancia_km') ?? '').trim();
    const payload = {
      razao_social: nome,
      contato: txt('contato'),
      telefone: txt('telefone'),
      cidade: txt('cidade'),
      uf: txt('uf')?.toUpperCase() ?? null,
      distancia_km: distancia ? Number(distancia) : null,
      variedades: variedades.length > 0 ? variedades : null,
      pagamento_padrao: (txt('pagamento_padrao') as FormaPagamento | null) ?? null,
      observacao: txt('observacao'),
      ativo: f.get('ativo') === 'on',
    };

    setSalvando(true);
    try {
      if (produtor) await atualizarProdutor(produtor.id, payload);
      else await criarProdutor(payload);
      sucesso('Produtor salvo.');
      onSaved(); onClose();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={produtor ? 'Editar produtor' : 'Novo produtor'} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nome">
          <TextInput name="razao_social" defaultValue={produtor?.razao_social ?? ''}
            placeholder="Aparecido Mataruco" required autoFocus />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Pessoa de contato">
            <TextInput name="contato" defaultValue={produtor?.contato ?? ''} placeholder="Aparecido" />
          </Field>
          <Field label="Telefone / WhatsApp">
            <TextInput name="telefone" defaultValue={produtor?.telefone ?? ''} placeholder="(44)99999 0000" />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <Field label="Cidade">
            <TextInput name="cidade" defaultValue={produtor?.cidade ?? ''} placeholder="Paranavaí" />
          </Field>
          <Field label="UF">
            <TextInput name="uf" defaultValue={produtor?.uf ?? ''} placeholder="PR" maxLength={2} />
          </Field>
          <Field label="Distância (km)">
            <TextInput name="distancia_km" type="number" min="0" step="1"
              defaultValue={produtor?.distancia_km ?? ''} />
          </Field>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Variedades que planta</span>
          <div className="flex flex-wrap gap-2">
            {[...new Set([...VARIEDADES_MANDIOCA, ...variedades])].map((v) => (
              <button key={v} type="button" onClick={() => alternarVariedade(v)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  variedades.includes(v)
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <Field label="Forma de pagamento padrão">
          <Select name="pagamento_padrao" defaultValue={produtor?.pagamento_padrao ?? ''}>
            <option value="">—</option>
            {FORMA_PAGAMENTO.map((p) => (
              <option key={p} value={p}>{FORMA_PAGAMENTO_LABEL[p]}</option>
            ))}
          </Select>
        </Field>

        <Field label="Observação">
          <TextInput name="observacao" defaultValue={produtor?.observacao ?? ''}
            placeholder="Combinado, restrição, referência…" />
        </Field>

        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" name="ativo" defaultChecked={produtor?.ativo ?? true}
            className="mt-0.5 h-4 w-4 rounded border-slate-300" />
          <span>
            Na lista de trabalho
            <span className="block text-xs text-slate-400">
              Aparece na previsão da semana. Desmarcado, vira só contato.
            </span>
          </span>
        </label>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}
