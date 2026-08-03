// Lista de fornecedores da homologação documental, com busca e filtros por
// status e risco — e o cadastro (novo/editar), já que os segmentos escolhidos
// aqui são o que define o checklist de cada um.
import { useMemo, useState, type FormEvent } from 'react';
import {
  listFornecedores, listSegmentosFornecedor, listFornecedorSegmentos, getChecklistGeral,
  criarFornecedor, atualizarFornecedor, definirSegmentosDoFornecedor,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData } from '../../lib/format';
import {
  CLASSIFICACAO_RISCO, CLASSIFICACAO_RISCO_LABEL, CLASSIFICACAO_RISCO_COR,
  STATUS_DOCUMENTAL, STATUS_DOCUMENTAL_LABEL, CATEGORIA_SEGMENTO_LABEL,
} from '@sistema/domain';
import type {
  Fornecedor, SegmentoFornecedor, ItemChecklistGeral,
  ClassificacaoRisco, StatusDocumental,
} from '@sistema/domain';
import {
  Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal, LINHA_CABECALHO,
} from '../../components/ui';
import { IconPlus } from '../../components/icons';
import { useToast } from '../../components/Toast';
import { FornecedorDetalhe } from './FornecedorDetalhe';
import { ErroCard, STATUS_CLASS, corVencimento } from './comum';

export function FornecedoresDocumentos() {
  const [recarregar, setRecarregar] = useState(0);
  const [aberto, setAberto] = useState<string | null>(null);
  const [editando, setEditando] = useState<Fornecedor | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<StatusDocumental | ''>('');
  const [risco, setRisco] = useState<ClassificacaoRisco | ''>('');

  const { data, loading, error } = useAsync(async () => {
    const [fornecedores, segmentos, vinculos] = await Promise.all([
      listFornecedores(), listSegmentosFornecedor(), listFornecedorSegmentos(),
    ]);
    // O checklist é secundário aqui: se falhar, a lista ainda serve.
    let checklist: ItemChecklistGeral[] = [];
    let checklistFalhou = false;
    try {
      checklist = await getChecklistGeral();
    } catch {
      checklistFalhou = true;
    }
    return { fornecedores, segmentos, vinculos, checklist, checklistFalhou };
  }, [recarregar]);

  const rec = () => setRecarregar((n) => n + 1);

  const proximoVencimento = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const i of data?.checklist ?? []) {
      if (!i.proxima_validade) continue;
      const atual = mapa.get(i.fornecedor_id);
      if (!atual || i.proxima_validade < atual) mapa.set(i.fornecedor_id, i.proxima_validade);
    }
    return mapa;
  }, [data?.checklist]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (data?.fornecedores ?? []).filter((f) => {
      if (status && f.status_documental !== status) return false;
      if (risco && f.classificacao_risco !== risco) return false;
      if (termo && !(f.razao_social.toLowerCase().includes(termo) || (f.cnpj ?? '').includes(termo))) return false;
      return true;
    });
  }, [data?.fornecedores, busca, status, risco]);

  if (error) return <ErroCard mensagem={error} />;
  if (loading || !data) return <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-brand-600" /></div>;

  // Detalhe ocupa a tela inteira do módulo, como no sistema de origem.
  if (aberto) {
    const f = data.fornecedores.find((x) => x.id === aberto);
    if (f) {
      return (
        <FornecedorDetalhe
          fornecedor={f}
          segmentos={data.segmentos}
          vinculos={data.vinculos.filter((v) => v.fornecedor_id === f.id)}
          onVoltar={() => setAberto(null)}
          onEditar={() => setEditando(f)}
          onMudou={rec}
        />
      );
    }
  }

  const segsDe = (id: string) =>
    data.vinculos
      .filter((v) => v.fornecedor_id === id)
      .map((v) => data.segmentos.find((s) => s.id === v.segmento_id)?.nome)
      .filter((n): n is string => Boolean(n));

  return (
    <>
      <Card className="mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[220px] flex-1">
          <Field label="Buscar">
            <TextInput value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Razão social ou CNPJ" />
          </Field>
        </div>
        <div className="w-52">
          <Field label="Situação documental">
            <Select value={status} onChange={(e) => setStatus(e.target.value as StatusDocumental | '')}>
              <option value="">Todas</option>
              {STATUS_DOCUMENTAL.map((s) => <option key={s} value={s}>{STATUS_DOCUMENTAL_LABEL[s]}</option>)}
            </Select>
          </Field>
        </div>
        <div className="w-40">
          <Field label="Risco">
            <Select value={risco} onChange={(e) => setRisco(e.target.value as ClassificacaoRisco | '')}>
              <option value="">Todos</option>
              {CLASSIFICACAO_RISCO.map((r) => <option key={r} value={r}>{CLASSIFICACAO_RISCO_LABEL[r]}</option>)}
            </Select>
          </Field>
        </div>
        <Button onClick={() => setNovoAberto(true)}>
          <IconPlus width={16} height={16} />Novo fornecedor
        </Button>
      </Card>

      {data.checklistFalhou && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Não foi possível consultar os documentos agora — a coluna de vencimento pode estar
          incompleta. <strong className="font-semibold">Não considere como "tudo em dia".</strong>
        </div>
      )}

      {filtrados.length === 0 ? (
        <EmptyState
          title="Nenhum fornecedor"
          description={data.fornecedores.length === 0 ? 'Cadastre o primeiro em "Novo fornecedor".' : 'Nenhum resultado para os filtros aplicados.'}
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className={LINHA_CABECALHO}>
                <th className="px-5 py-[11px]">Fornecedor</th>
                <th className="hidden px-5 py-[11px] md:table-cell">Segmentos</th>
                <th className="px-5 py-[11px]">Situação</th>
                <th className="hidden px-5 py-[11px] sm:table-cell">Risco</th>
                <th className="hidden px-5 py-[11px] lg:table-cell">Próximo vencimento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((f) => {
                const segs = segsDe(f.id);
                const prox = proximoVencimento.get(f.id);
                const cor = f.classificacao_risco ? CLASSIFICACAO_RISCO_COR[f.classificacao_risco] : null;
                return (
                  <tr key={f.id} onClick={() => setAberto(f.id)} className="cursor-pointer hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <span className="block font-medium text-slate-800">{f.razao_social}</span>
                      <span className="block text-xs text-slate-400">{f.cnpj ?? 'sem CNPJ'}</span>
                    </td>
                    <td className="hidden px-5 py-3 text-slate-500 md:table-cell">
                      {segs.length === 0 ? <span className="text-amber-700">sem segmento</span>
                        : segs.length === 1 ? segs[0] : `${segs[0]} +${segs.length - 1}`}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[f.status_documental]}`}>
                        {STATUS_DOCUMENTAL_LABEL[f.status_documental]}
                      </span>
                    </td>
                    <td className="hidden px-5 py-3 sm:table-cell">
                      {cor ? (
                        <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-700">
                          <span className="h-2 w-2 rounded-full" style={{ background: cor }} />
                          {CLASSIFICACAO_RISCO_LABEL[f.classificacao_risco!]}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className={`hidden px-5 py-3 lg:table-cell ${prox ? corVencimento(prox) : 'text-slate-400'}`}>
                      {prox ? formatarData(prox) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {(novoAberto || editando) && (
        <ModalFornecedor
          fornecedor={editando}
          segmentos={data.segmentos}
          segmentosAtuais={editando ? data.vinculos.filter((v) => v.fornecedor_id === editando.id).map((v) => v.segmento_id) : []}
          onClose={() => { setNovoAberto(false); setEditando(null); }}
          onSaved={rec}
        />
      )}
    </>
  );
}

// ── Cadastro ───────────────────────────────────────────────────
function ModalFornecedor({
  fornecedor, segmentos, segmentosAtuais, onClose, onSaved,
}: {
  fornecedor: Fornecedor | null;
  segmentos: SegmentoFornecedor[];
  segmentosAtuais: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selecionados, setSelecionados] = useState<string[]>(segmentosAtuais);
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  function alternar(id: string) {
    setSelecionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      razao_social: String(f.get('razao_social') ?? '').trim(),
      cnpj: String(f.get('cnpj') ?? '').trim() || null,
      telefone: String(f.get('telefone') ?? '').trim() || null,
      email: String(f.get('email') ?? '').trim() || null,
      classificacao_risco: (String(f.get('classificacao_risco') ?? '') || null) as ClassificacaoRisco | null,
    };
    if (!payload.razao_social) return;
    setSalvando(true);
    try {
      const id = fornecedor
        ? (await atualizarFornecedor(fornecedor.id, payload), fornecedor.id)
        : (await criarFornecedor(payload)).id;
      await definirSegmentosDoFornecedor(id, selecionados);
      sucesso('Fornecedor salvo.'); onSaved(); onClose();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={fornecedor ? 'Editar fornecedor' : 'Novo fornecedor'} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Razão social">
          <TextInput name="razao_social" defaultValue={fornecedor?.razao_social ?? ''} required autoFocus />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="CNPJ">
            <TextInput name="cnpj" defaultValue={fornecedor?.cnpj ?? ''} placeholder="00.000.000/0000-00" />
          </Field>
          <Field label="Classificação de risco">
            <Select name="classificacao_risco" defaultValue={fornecedor?.classificacao_risco ?? ''}>
              <option value="">— não informado</option>
              {CLASSIFICACAO_RISCO.map((r) => <option key={r} value={r}>{CLASSIFICACAO_RISCO_LABEL[r]}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Telefone"><TextInput name="telefone" defaultValue={fornecedor?.telefone ?? ''} /></Field>
          <Field label="E-mail"><TextInput name="email" type="email" defaultValue={fornecedor?.email ?? ''} /></Field>
        </div>

        <div>
          <span className="text-sm font-medium text-slate-700">Segmentos de atuação</span>
          <p className="text-xs text-slate-500">Definem o checklist de documentos exigidos.</p>
          <div className="mt-2 grid max-h-64 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2 sm:grid-cols-2">
            {segmentos.filter((s) => s.ativo || selecionados.includes(s.id)).map((s) => (
              <label key={s.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-50">
                <input type="checkbox" checked={selecionados.includes(s.id)} onChange={() => alternar(s.id)}
                  className="h-4 w-4 shrink-0 rounded border-slate-300" />
                <span className="min-w-0 truncate">
                  {s.nome}
                  <span className="ml-1.5 text-xs text-slate-400">{CATEGORIA_SEGMENTO_LABEL[s.categoria]}</span>
                </span>
              </label>
            ))}
            {segmentos.length === 0 && (
              <p className="px-2 py-1 text-sm text-slate-400">Nenhum segmento cadastrado — crie um no Catálogo.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}
