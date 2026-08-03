// Catálogo da homologação: segmentos, tipos de documento e a montagem do
// checklist (quais documentos cada segmento exige). É o que a Qualidade
// mantém — o checklist de cada fornecedor sai daqui.
import { useState, type FormEvent } from 'react';
import {
  listSegmentosFornecedor, criarSegmentoFornecedor, atualizarSegmentoFornecedor,
  listDocumentosExigidos, criarDocumentoExigido, atualizarDocumentoExigido,
  listSegmentoDocumentos, vincularDocumentoAoSegmento, desvincularDocumentoDoSegmento,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import {
  CATEGORIA_SEGMENTO, CATEGORIA_SEGMENTO_LABEL,
  EXIGENCIA, EXIGENCIA_LABEL, ORIGEM_DOCUMENTO, ORIGEM_DOCUMENTO_LABEL,
} from '@sistema/domain';
import type {
  SegmentoFornecedor, DocumentoExigido, CategoriaSegmento, Exigencia, OrigemDocumento,
} from '@sistema/domain';
import {
  Card, CardTitle, Spinner, EmptyState, Button, Field, TextInput, Select, Modal, LINHA_CABECALHO,
} from '../../components/ui';
import { IconPlus } from '../../components/icons';
import { useToast } from '../../components/Toast';

export function CatalogoFornecedores() {
  const [recarregar, setRecarregar] = useState(0);
  const [aba, setAba] = useState<'checklist' | 'documentos'>('checklist');
  const [segAtivo, setSegAtivo] = useState<string | null>(null);
  const [modalSeg, setModalSeg] = useState(false);
  const [editSeg, setEditSeg] = useState<SegmentoFornecedor | null>(null);
  const [modalDoc, setModalDoc] = useState(false);
  const [editDoc, setEditDoc] = useState<DocumentoExigido | null>(null);
  const { erro, sucesso } = useToast();

  const { data, loading, error } = useAsync(async () => {
    const [segmentos, documentos, vinculos] = await Promise.all([
      listSegmentosFornecedor(), listDocumentosExigidos(), listSegmentoDocumentos(),
    ]);
    return { segmentos, documentos, vinculos };
  }, [recarregar]);

  const rec = () => setRecarregar((n) => n + 1);

  // Se a consulta falhar, não invente catálogo vazio: mostre o erro.
  if (error) {
    return (
      <Card className="p-5">
        <p className="text-sm font-semibold text-red-700">Não foi possível carregar o catálogo.</p>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
      </Card>
    );
  }
  if (loading || !data) return <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-brand-600" /></div>;

  const segSel = data.segmentos.find((s) => s.id === segAtivo) ?? data.segmentos[0] ?? null;
  const docsMap = new Map(data.documentos.map((d) => [d.id, d]));
  const vinculosDoSeg = segSel ? data.vinculos.filter((v) => v.segmento_id === segSel.id) : [];
  const jaVinculados = new Set(vinculosDoSeg.map((v) => v.documento_exigido_id));

  async function vincular(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!segSel) return;
    const f = new FormData(e.currentTarget);
    const doc = String(f.get('documento_exigido_id') ?? '');
    if (!doc) return;
    try {
      await vincularDocumentoAoSegmento(segSel.id, doc, String(f.get('exigencia') ?? 'obrigatorio') as Exigencia);
      (e.target as HTMLFormElement).reset();
      rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  async function remover(id: string) {
    try { await desvincularDocumentoDoSegmento(id); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  async function alternarAtivoDoc(d: DocumentoExigido) {
    try {
      await atualizarDocumentoExigido(d.id, { ativo: !d.ativo });
      sucesso(d.ativo ? 'Documento desativado.' : 'Documento reativado.');
      rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {([['checklist', 'Segmentos & checklist'], ['documentos', 'Tipos de documento']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setAba(id)}
              className={`rounded-full border px-3.5 py-[7px] text-[12.5px] font-semibold transition ${aba === id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
        </div>
        <Button variant="outline" onClick={() => (aba === 'checklist' ? (setEditSeg(null), setModalSeg(true)) : (setEditDoc(null), setModalDoc(true)))}>
          <IconPlus width={16} height={16} />{aba === 'checklist' ? 'Novo segmento' : 'Novo tipo de documento'}
        </Button>
      </div>

      {aba === 'checklist' && (
        data.segmentos.length === 0 ? (
          <EmptyState title="Nenhum segmento cadastrado" description="O segmento é a atividade do fornecedor — é ele que define quais documentos são exigidos." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <Card className="overflow-hidden">
              <ul className="divide-y divide-slate-100">
                {data.segmentos.map((s) => {
                  const qtd = data.vinculos.filter((v) => v.segmento_id === s.id).length;
                  return (
                    <li key={s.id}>
                      <button onClick={() => setSegAtivo(s.id)}
                        className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition ${segSel?.id === s.id ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                        <span className="min-w-0">
                          <span className="block truncate">{s.nome}</span>
                          <span className="block text-[11px] font-normal text-slate-400">
                            {CATEGORIA_SEGMENTO_LABEL[s.categoria]}{s.ativo ? '' : ' · inativo'}
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] text-slate-400">{qtd}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>

            {segSel && (
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle>Documentos exigidos — {segSel.nome}</CardTitle>
                  <button onClick={() => { setEditSeg(segSel); setModalSeg(true); }}
                    className="shrink-0 text-xs font-semibold text-brand-700 hover:underline">Editar segmento</button>
                </div>

                {vinculosDoSeg.length === 0 ? (
                  <p className="mt-3 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">Nenhum documento exigido ainda.</p>
                ) : (
                  <table className="mt-3 w-full text-sm">
                    <thead>
                      <tr className={LINHA_CABECALHO}>
                        <th className="px-3 py-[11px]">Documento</th>
                        <th className="px-3 py-[11px]">Exigência</th>
                        <th className="hidden px-3 py-[11px] sm:table-cell">Validade</th>
                        <th className="px-3 py-[11px]" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vinculosDoSeg.map((v) => {
                        const d = docsMap.get(v.documento_exigido_id);
                        return (
                          <tr key={v.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2.5 text-slate-700">{d?.nome ?? '—'}</td>
                            <td className="px-3 py-2.5">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${v.exigencia === 'obrigatorio' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'}`}>
                                {EXIGENCIA_LABEL[v.exigencia]}
                              </span>
                            </td>
                            <td className="hidden px-3 py-2.5 text-slate-500 sm:table-cell">
                              {d?.tem_validade ? 'Controla vencimento' : '—'}{d?.permite_multiplos ? ' · vários arquivos' : ''}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <button onClick={() => void remover(v.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">Remover</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                <form onSubmit={vincular} className="mt-5 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-5">
                  <div className="min-w-[220px] flex-1">
                  <Field label="Adicionar documento">
                    <Select name="documento_exigido_id" defaultValue="" required>
                      <option value="" disabled>Selecione…</option>
                      {data.documentos.filter((d) => d.ativo && !jaVinculados.has(d.id)).map((d) => (
                        <option key={d.id} value={d.id}>{d.nome}</option>
                      ))}
                    </Select>
                  </Field>
                  </div>
                  <Field label="Exigência">
                    <Select name="exigencia" defaultValue="obrigatorio">
                      {EXIGENCIA.map((x) => <option key={x} value={x}>{EXIGENCIA_LABEL[x]}</option>)}
                    </Select>
                  </Field>
                  <Button type="submit">Adicionar</Button>
                </form>
              </Card>
            )}
          </div>
        )
      )}

      {aba === 'documentos' && (
        data.documentos.length === 0 ? (
          <EmptyState title="Nenhum tipo de documento" description="Cadastre os tipos que os fornecedores precisam apresentar." />
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className={LINHA_CABECALHO}>
                  <th className="px-5 py-[11px]">Documento</th>
                  <th className="hidden px-5 py-[11px] sm:table-cell">Origem</th>
                  <th className="px-5 py-[11px]">Validade</th>
                  <th className="hidden px-5 py-[11px] md:table-cell">Arquivos</th>
                  <th className="px-5 py-[11px]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.documentos.map((d) => (
                  <tr key={d.id} className={`hover:bg-slate-50 ${d.ativo ? '' : 'opacity-50'}`}>
                    <td className="px-5 py-3 text-slate-700">{d.nome}</td>
                    <td className="hidden px-5 py-3 text-slate-500 sm:table-cell">{ORIGEM_DOCUMENTO_LABEL[d.origem]}</td>
                    <td className="px-5 py-3 text-slate-500">{d.tem_validade ? 'Controla vencimento' : '—'}</td>
                    <td className="hidden px-5 py-3 text-slate-500 md:table-cell">{d.permite_multiplos ? 'Vários vigentes' : 'Um vigente'}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => { setEditDoc(d); setModalDoc(true); }} className="text-xs font-medium text-brand-700 hover:underline">Editar</button>
                      <button onClick={() => void alternarAtivoDoc(d)} className="ml-3 text-xs font-medium text-slate-400 hover:text-slate-700">
                        {d.ativo ? 'Desativar' : 'Reativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}

      {modalSeg && <ModalSegmento segmento={editSeg} onClose={() => setModalSeg(false)} onSaved={rec} />}
      {modalDoc && <ModalDocumentoExigido documento={editDoc} onClose={() => setModalDoc(false)} onSaved={rec} />}
    </div>
  );
}

// ── Segmento ───────────────────────────────────────────────────
function ModalSegmento({
  segmento, onClose, onSaved,
}: { segmento: SegmentoFornecedor | null; onClose: () => void; onSaved: () => void }) {
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      nome: String(f.get('nome') ?? '').trim(),
      categoria: String(f.get('categoria') ?? 'servico') as CategoriaSegmento,
      ativo: f.get('ativo') === 'on',
    };
    if (!payload.nome) return;
    setSalvando(true);
    try {
      if (segmento) await atualizarSegmentoFornecedor(segmento.id, payload);
      else await criarSegmentoFornecedor(payload);
      sucesso('Segmento salvo.'); onSaved(); onClose();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={segmento ? 'Editar segmento' : 'Novo segmento'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nome"><TextInput name="nome" defaultValue={segmento?.nome ?? ''} placeholder="Controle de pragas" required /></Field>
        <Field label="Categoria">
          <Select name="categoria" defaultValue={segmento?.categoria ?? 'servico'}>
            {CATEGORIA_SEGMENTO.map((c) => <option key={c} value={c}>{CATEGORIA_SEGMENTO_LABEL[c]}</option>)}
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="ativo" defaultChecked={segmento?.ativo ?? true} className="h-4 w-4 rounded border-slate-300" />
          Segmento ativo
        </label>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Tipo de documento ──────────────────────────────────────────
function ModalDocumentoExigido({
  documento, onClose, onSaved,
}: { documento: DocumentoExigido | null; onClose: () => void; onSaved: () => void }) {
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      nome: String(f.get('nome') ?? '').trim(),
      origem: String(f.get('origem') ?? 'fornecedor') as OrigemDocumento,
      tem_validade: f.get('tem_validade') === 'on',
      permite_multiplos: f.get('permite_multiplos') === 'on',
      ativo: f.get('ativo') === 'on',
    };
    if (!payload.nome) return;
    setSalvando(true);
    try {
      if (documento) await atualizarDocumentoExigido(documento.id, payload);
      else await criarDocumentoExigido(payload);
      sucesso('Tipo de documento salvo.'); onSaved(); onClose();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={documento ? 'Editar tipo de documento' : 'Novo tipo de documento'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nome"><TextInput name="nome" defaultValue={documento?.nome ?? ''} placeholder="Licença sanitária" required /></Field>
        <Field label="Origem">
          <Select name="origem" defaultValue={documento?.origem ?? 'fornecedor'}>
            {ORIGEM_DOCUMENTO.map((o) => <option key={o} value={o}>{ORIGEM_DOCUMENTO_LABEL[o]}</option>)}
          </Select>
        </Field>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" name="tem_validade" defaultChecked={documento?.tem_validade ?? false} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
          <span>Controla vencimento<span className="block text-xs text-slate-400">Liga o alerta de documento vencido / a vencer.</span></span>
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" name="permite_multiplos" defaultChecked={documento?.permite_multiplos ?? false} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
          <span>Aceita vários arquivos vigentes<span className="block text-xs text-slate-400">Sem isso, enviar um novo arquiva o anterior.</span></span>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="ativo" defaultChecked={documento?.ativo ?? true} className="h-4 w-4 rounded border-slate-300" />
          Documento ativo
        </label>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}
