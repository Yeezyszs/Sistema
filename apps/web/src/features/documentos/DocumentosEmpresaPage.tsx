// Documentos regulatórios da empresa — alvará, licenças, CLCB, MAPA, IBAMA…
// Todos os setores consultam; Qualidade, Gestão e Administrador mantêm (o
// banco aplica a mesma regra). O alerta no topo lista o que vence em até 30
// dias ou já venceu.
import { useState, type FormEvent } from 'react';
import {
  listDocumentosEmpresa, salvarDocumentoEmpresa, excluirDocumentoEmpresa,
  anexarArquivoDocumentoEmpresa, urlAssinadaDocumento,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { useAuth } from '../../lib/auth';
import { formatarData } from '../../lib/format';
import { situacaoCalibracao } from '@sistema/domain';
import type { DocumentoEmpresa, SituacaoCalibracao } from '@sistema/domain';
import {
  PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Modal, ErroCarregamento,
} from '../../components/ui';
import { IconPlus, IconDownload } from '../../components/icons';
import { useToast } from '../../components/Toast';

// Mesma regra de 30 dias da calibração; sem validade = sem vencimento.
const SITUACAO: Record<SituacaoCalibracao, { rotulo: string; tom: string }> = {
  vigente: { rotulo: 'Vigente', tom: 'bg-emerald-100 text-emerald-800' },
  a_vencer: { rotulo: 'Vence em até 30 dias', tom: 'bg-amber-100 text-amber-800' },
  vencida: { rotulo: 'Vencido', tom: 'bg-red-100 text-red-700' },
  sem_registro: { rotulo: 'Sem vencimento', tom: 'bg-slate-100 text-slate-600' },
};

function diasAte(iso: string): number {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number) as [number, number, number];
  const hoje = new Date();
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((new Date(a, m - 1, d).getTime() - base.getTime()) / 86_400_000);
}

export function DocumentosEmpresaPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [editando, setEditando] = useState<DocumentoEmpresa | 'novo' | null>(null);
  const [enviando, setEnviando] = useState(false);
  const { perfis } = useAuth();
  const podeEditar = perfis.some((p) => p === 'qualidade' || p === 'gestao' || p === 'administrador');
  const { sucesso, erro } = useToast();

  const { data, loading, error } = useAsync(() => listDocumentosEmpresa(), [recarregar]);
  const alerta = (data ?? [])
    .filter((d) => ['a_vencer', 'vencida'].includes(situacaoCalibracao(d.validade)))
    .sort((a, b) => (a.validade ?? '').localeCompare(b.validade ?? ''));

  async function onSalvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const txt = (k: string) => String(f.get(k) ?? '').trim() || null;
    const nome = txt('nome');
    if (!nome) return;
    try {
      await salvarDocumentoEmpresa(editando && editando !== 'novo' ? editando.id : null, {
        nome, numero: txt('numero'), validade: txt('validade'),
        validade_obs: txt('validade_obs'), observacao: txt('observacao'),
      });
      sucesso('Documento salvo.'); setEditando(null); setRecarregar((n) => n + 1);
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha ao salvar.'); }
  }

  async function onExcluir(d: DocumentoEmpresa) {
    if (!window.confirm(`Excluir "${d.nome}"?`)) return;
    try {
      await excluirDocumentoEmpresa(d.id);
      sucesso('Documento excluído.'); setEditando(null); setRecarregar((n) => n + 1);
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha ao excluir.'); }
  }

  async function abrirPdf(d: DocumentoEmpresa) {
    if (!d.arquivo_path) return;
    try {
      window.open(await urlAssinadaDocumento(d.arquivo_path, 'documentos-empresa'), '_blank', 'noopener');
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha ao abrir o PDF.'); }
  }

  async function onAnexar(d: DocumentoEmpresa, arquivo: File | undefined) {
    if (!arquivo) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(arquivo.type)) { erro('Use PDF, JPG ou PNG.'); return; }
    if (arquivo.size > 20 * 1024 * 1024) { erro('Arquivo maior que 20MB.'); return; }
    setEnviando(true);
    try {
      await anexarArquivoDocumentoEmpresa(d, arquivo);
      sucesso(d.arquivo_path ? 'Arquivo substituído.' : 'Arquivo anexado.');
      setEditando(null); setRecarregar((n) => n + 1);
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha ao enviar.'); }
    finally { setEnviando(false); }
  }

  const doc = editando && editando !== 'novo' ? editando : null;

  return (
    <>
      <PageHeader grupo="Gestão de Documentos"
        title="Documentos da empresa"
        subtitle="Controle de documentos regulatórios — alvarás, licenças, registros e certidões"
        action={podeEditar ? <Button onClick={() => setEditando('novo')}><IconPlus width={16} height={16} />Novo documento</Button> : undefined}
      />

      {error && <ErroCarregamento mensagem={error} />}
      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}

      {alerta.length > 0 && (
        <Card className="mb-4 border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            ⚠ {alerta.length} documento(s) vencido(s) ou vencendo em até 30 dias — providencie a renovação
          </p>
          <ul className="mt-2 space-y-1 text-[13px]">
            {alerta.map((d) => {
              const dias = diasAte(d.validade!);
              return (
                <li key={d.id}>
                  <span className="font-medium text-slate-900">{d.nome}</span>{' '}
                  <span className={dias < 0 ? 'font-semibold text-red-700' : 'text-amber-800'}>
                    {dias < 0 ? `vencido há ${-dias} dia(s)` : dias === 0 ? 'vence hoje' : `vence em ${dias} dia(s)`} · validade {formatarData(d.validade!)}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {data && data.length === 0 && <EmptyState title="Nenhum documento" description="Cadastre os documentos regulatórios da empresa." />}

      {data && data.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11.5px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-[11px]">Documento</th>
                <th className="px-4 py-[11px]">Número</th>
                <th className="px-4 py-[11px]">Validade</th>
                <th className="px-4 py-[11px]">Situação</th>
                <th className="px-4 py-[11px]">Arquivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((d) => {
                const sit = SITUACAO[situacaoCalibracao(d.validade)];
                return (
                  <tr key={d.id} onClick={podeEditar ? () => setEditando(d) : undefined}
                    className={podeEditar ? 'cursor-pointer hover:bg-slate-50' : ''}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{d.nome}</p>
                      {d.observacao && <p className="text-xs text-slate-400">{d.observacao}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{d.numero ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{d.validade ? formatarData(d.validade) : (d.validade_obs ?? '—')}</td>
                    <td className="px-4 py-3">
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${sit.tom}`}>{sit.rotulo}</span>
                    </td>
                    <td className="px-4 py-3">
                      {d.arquivo_path ? (
                        <button type="button" title={d.arquivo_nome ?? 'Abrir'}
                          onClick={(e) => { e.stopPropagation(); void abrirPdf(d); }}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-700 hover:bg-slate-100">
                          <IconDownload width={14} height={14} />Abrir
                        </button>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={editando !== null} onClose={() => setEditando(null)} title={doc ? 'Editar documento' : 'Novo documento'}>
        <form key={doc?.id ?? 'novo'} onSubmit={onSalvar} className="space-y-4">
          <Field label="Documento"><TextInput name="nome" defaultValue={doc?.nome ?? ''} required placeholder="Alvará municipal" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Número"><TextInput name="numero" defaultValue={doc?.numero ?? ''} /></Field>
            <Field label="Validade"><TextInput name="validade" type="date" defaultValue={doc?.validade ?? ''} /></Field>
          </div>
          <Field label="Se não tiver validade, explique">
            <TextInput name="validade_obs" defaultValue={doc?.validade_obs ?? ''} placeholder="Indeterminado / condicionado ao CLCB vigente" />
          </Field>
          <Field label="Observação"><TextInput name="observacao" defaultValue={doc?.observacao ?? ''} /></Field>
          {doc ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-[13px]">
              <p className="text-slate-600">
                {doc.arquivo_path ? <>Arquivo atual: <b>{doc.arquivo_nome}</b></> : 'Nenhum arquivo anexado.'}
              </p>
              <label className={`mt-2 inline-block cursor-pointer rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 ${enviando ? 'pointer-events-none opacity-60' : ''}`}>
                {enviando ? 'Enviando…' : doc.arquivo_path ? 'Trocar arquivo' : 'Anexar PDF'}
                <input type="file" accept="application/pdf,image/jpeg,image/png" className="hidden"
                  onChange={(e) => void onAnexar(doc, e.target.files?.[0])} />
              </label>
              <p className="mt-1 text-xs text-slate-400">PDF, JPG ou PNG até 20MB.</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Salve o documento para depois anexar o PDF.</p>
          )}
          <div className="flex justify-between gap-3">
            {doc ? <Button type="button" variant="outline" onClick={() => void onExcluir(doc)}>Excluir</Button> : <span />}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
