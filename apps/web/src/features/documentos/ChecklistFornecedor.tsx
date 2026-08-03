// Checklist documental de um fornecedor.
// O estado de cada item é calculado no banco (qualidade.checklist_fornecedor);
// aqui só se exibe e se age: enviar, substituir, ver, excluir, histórico.
import { useState, type FormEvent } from 'react';
import {
  getChecklistFornecedor, getHistoricoDocumento,
  enviarDocumentoFornecedor, excluirDocumentoFornecedor, urlAssinadaDocumento,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarDataHora } from '../../lib/format';
import { ESTADO_ITEM_LABEL, EXIGENCIA_LABEL } from '@sistema/domain';
import type {
  Fornecedor, ItemChecklistFornecedor, ArquivoChecklist, DocumentoFornecedor,
} from '@sistema/domain';
import { Card, Spinner, EmptyState, Button, Field, TextInput, Modal } from '../../components/ui';
import { IconDoc, IconDownload } from '../../components/icons';
import { useToast } from '../../components/Toast';
import { ErroCard, ESTADO_CLASS, corVencimento } from './comum';

const TIPOS_ACEITOS = 'application/pdf,image/jpeg,image/png';
const TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10MB

function nomeArquivo(a: ArquivoChecklist): string {
  if (a.arquivo_nome) return a.arquivo_nome;
  const base = (a.arquivo_path ?? '').split('/').pop() ?? 'Documento';
  return base.replace(/^\d+-/, '');
}

// `proxima_validade` só traz data ainda no prazo. Quando tudo já venceu ela
// vem nula — dizer "sem data de validade" aí seria mentira.
function legenda(it: ItemChecklistFornecedor): string {
  if (it.arquivos.length === 0) return 'Nenhum arquivo enviado';
  if (it.permite_multiplos) return `${it.arquivos.length} arquivo(s) vigente(s) · aceita vários`;
  if (it.proxima_validade) return `Válido até ${formatarData(it.proxima_validade)}`;
  if (!it.tem_validade) return 'Enviado';
  const datas = it.arquivos.map((a) => a.validade).filter((v): v is string => Boolean(v));
  if (datas.length === 0) return 'Enviado · sem data de validade';
  return `Venceu em ${formatarData(datas.sort().at(-1)!)}`;
}

export function ChecklistDoFornecedor({
  fornecedor, recarregarPai,
}: { fornecedor: Fornecedor; recarregarPai: () => void }) {
  const [recarregar, setRecarregar] = useState(0);
  const [enviarPara, setEnviarPara] = useState<ItemChecklistFornecedor | null>(null);
  const [excluir, setExcluir] = useState<{ item: ItemChecklistFornecedor; arquivo: ArquivoChecklist } | null>(null);
  const [historicoDe, setHistoricoDe] = useState<ItemChecklistFornecedor | null>(null);
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const { erro } = useToast();

  const { data: itens, loading, error } = useAsync(
    () => getChecklistFornecedor(fornecedor.id),
    [fornecedor.id, recarregar],
  );

  const rec = () => { setRecarregar((n) => n + 1); recarregarPai(); };

  async function abrirArquivo(a: ArquivoChecklist) {
    if (!a.arquivo_path) { erro('Sem arquivo anexado.'); return; }
    setAbrindo(a.id);
    try {
      window.open(await urlAssinadaDocumento(a.arquivo_path, a.arquivo_bucket ?? 'fornecedores'), '_blank', 'noopener');
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha ao abrir.'); }
    finally { setAbrindo(null); }
  }

  if (error) return <ErroCard mensagem={error} />;
  if (loading || !itens) return <div className="flex justify-center py-10"><Spinner className="h-6 w-6 text-brand-600" /></div>;
  if (itens.length === 0) {
    return <EmptyState title="Checklist vazio" description="Vincule um segmento ao fornecedor para carregar os documentos exigidos." />;
  }

  return (
    <>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {itens.map((it) => (
            <li key={it.documento_exigido_id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{it.documento}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ESTADO_CLASS[it.estado]}`}>
                      {ESTADO_ITEM_LABEL[it.estado]}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">{EXIGENCIA_LABEL[it.exigencia]}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{legenda(it)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {it.arquivos.length > 0 && (
                    <button onClick={() => setHistoricoDe(it)} className="text-xs font-medium text-slate-400 hover:text-slate-700">
                      Histórico
                    </button>
                  )}
                  <Button variant="outline" onClick={() => setEnviarPara(it)}>
                    {it.arquivos.length === 0 ? 'Enviar' : it.permite_multiplos ? '+ Adicionar' : 'Substituir'}
                  </Button>
                </div>
              </div>

              {it.arquivos.length > 0 && (
                <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {it.arquivos.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <IconDoc width={14} height={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-slate-700">{nomeArquivo(a)}</p>
                        <p className="truncate text-[11px] text-slate-400">
                          {[a.emitido_em ? `emitido ${formatarData(a.emitido_em)}` : null,
                            a.numero_laudo ? `nº ${a.numero_laudo}` : null].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </div>
                      {it.tem_validade && (
                        <span className={`shrink-0 text-[12px] ${corVencimento(a.validade)}`}>
                          {a.validade ? `vence ${formatarData(a.validade)}` : 'sem validade'}
                        </span>
                      )}
                      <button onClick={() => void abrirArquivo(a)} disabled={abrindo === a.id || !a.arquivo_path}
                        title="Abrir arquivo"
                        className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40">
                        {abrindo === a.id ? <Spinner className="h-4 w-4" /> : <IconDownload width={16} height={16} />}
                      </button>
                      <button onClick={() => setExcluir({ item: it, arquivo: a })}
                        className="shrink-0 text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {enviarPara && (
        <ModalEnvio fornecedorId={fornecedor.id} item={enviarPara} onClose={() => setEnviarPara(null)} onSaved={rec} />
      )}
      {excluir && (
        <ModalExclusao arquivo={excluir.arquivo} documento={excluir.item.documento}
          permiteMultiplos={excluir.item.permite_multiplos}
          onClose={() => setExcluir(null)} onSaved={rec} />
      )}
      {historicoDe && (
        <ModalHistorico fornecedorId={fornecedor.id} item={historicoDe} onClose={() => setHistoricoDe(null)} />
      )}
    </>
  );
}

// ── Envio / substituição ───────────────────────────────────────
function ModalEnvio({
  fornecedorId, item, onClose, onSaved,
}: { fornecedorId: string; item: ItemChecklistFornecedor; onClose: () => void; onSaved: () => void }) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [sobre, setSobre] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const { sucesso, erro } = useToast();

  // Valida aqui para o usuário saber na hora, não depois do upload falhar.
  function escolher(f: File | null | undefined) {
    if (!f) return;
    if (!TIPOS_ACEITOS.split(',').includes(f.type)) { erro('Formato não aceito — use PDF, JPG ou PNG.'); return; }
    if (f.size > TAMANHO_MAXIMO) { erro('Arquivo maior que 10MB.'); return; }
    setArquivo(f);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!arquivo) { erro('Selecione um arquivo.'); return; }
    const f = new FormData(e.currentTarget);
    setEnviando(true);
    try {
      await enviarDocumentoFornecedor({
        fornecedor_id: fornecedorId,
        documento_exigido_id: item.documento_exigido_id,
        tipo: 'documento_homologacao',
        resultado: 'aprovado',
        emitido_em: String(f.get('emitido_em') ?? '').trim() || null,
        validade: String(f.get('validade') ?? '').trim() || null,
        numero_laudo: String(f.get('numero_laudo') ?? '').trim() || null,
        observacao: String(f.get('observacao') ?? '').trim() || null,
      }, arquivo);
      sucesso(item.permite_multiplos || item.arquivos.length === 0
        ? 'Documento anexado.'
        : 'Documento substituído — a versão anterior foi arquivada.');
      onSaved(); onClose();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha ao enviar.'); }
    finally { setEnviando(false); }
  }

  const inputId = `arquivo-${item.documento_exigido_id}`;

  return (
    <Modal open onClose={onClose} title={item.documento} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setSobre(true); }}
          onDragLeave={() => setSobre(false)}
          onDrop={(e) => { e.preventDefault(); setSobre(false); escolher(e.dataTransfer.files?.[0]); }}
          className={`rounded-[10px] border-2 border-dashed p-6 text-center transition-colors ${
            sobre ? 'border-brand-600 bg-brand-50' : 'border-slate-300 bg-slate-50'
          }`}
        >
          {arquivo ? (
            <p className="text-[13.5px] font-semibold text-slate-700">{arquivo.name}</p>
          ) : (
            <>
              <p className="text-[13.5px] font-semibold text-slate-700">Arraste o arquivo aqui</p>
              <p className="mt-1 text-xs text-slate-500">PDF, JPG ou PNG até 10MB</p>
            </>
          )}
          <input id={inputId} type="file" accept={TIPOS_ACEITOS} className="hidden"
            onChange={(e) => escolher(e.target.files?.[0])} />
          <label htmlFor={inputId}
            className="mt-3 inline-block cursor-pointer rounded-lg bg-brand-700 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-600">
            {arquivo ? 'Trocar arquivo' : 'Selecionar arquivo'}
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Emitido em"><TextInput name="emitido_em" type="date" /></Field>
          <Field label={item.tem_validade ? 'Validade (obrigatória)' : 'Validade'}>
            <TextInput name="validade" type="date" required={item.tem_validade} />
          </Field>
          <Field label="Nº do documento"><TextInput name="numero_laudo" placeholder="—" /></Field>
        </div>
        <Field label="Observação"><TextInput name="observacao" placeholder="—" /></Field>

        {!item.permite_multiplos && item.arquivos.length > 0 && (
          <p className="text-xs text-slate-500">
            A versão atual será arquivada no histórico — nada é apagado.
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={enviando} disabled={!arquivo}>Enviar documento</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Exclusão (soft delete com motivo) ──────────────────────────
function ModalExclusao({
  arquivo, documento, permiteMultiplos, onClose, onSaved,
}: {
  arquivo: ArquivoChecklist; documento: string; permiteMultiplos: boolean;
  onClose: () => void; onSaved: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  async function confirmar() {
    if (!motivo.trim()) { erro('Informe o motivo da exclusão.'); return; }
    setSalvando(true);
    try {
      await excluirDocumentoFornecedor(arquivo.id, motivo.trim());
      sucesso('Documento excluído.'); onSaved(); onClose();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title="Excluir documento">
      <p className="text-[13.5px] text-slate-600">
        Excluir <strong className="font-semibold text-slate-900">{nomeArquivo(arquivo)}</strong> de{' '}
        <strong className="font-semibold text-slate-900">{documento}</strong>?
      </p>
      <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        O arquivo sai da tela e do cálculo de status, mas o registro permanece no banco com autor,
        data e motivo — a rastreabilidade da auditoria é preservada.
        {!permiteMultiplos && ' Se houver uma versão anterior, ela volta a ser a vigente.'}
      </p>
      <div className="mt-4">
        <Field label="Motivo da exclusão">
          <TextInput value={motivo} onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: documento divergente, lançado no fornecedor errado…" required autoFocus />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => void confirmar()} loading={salvando} disabled={!motivo.trim()}
          className="!bg-red-600 hover:!bg-red-700">Excluir documento</Button>
      </div>
    </Modal>
  );
}

// ── Histórico de versões ───────────────────────────────────────
function ModalHistorico({
  fornecedorId, item, onClose,
}: { fornecedorId: string; item: ItemChecklistFornecedor; onClose: () => void }) {
  const { data, loading, error } = useAsync(
    () => getHistoricoDocumento(fornecedorId, item.documento_exigido_id),
    [fornecedorId, item.documento_exigido_id],
  );

  function situacao(d: DocumentoFornecedor): string {
    if (d.excluido_em) return `Excluído em ${formatarDataHora(d.excluido_em)}${d.motivo_exclusao ? ` — ${d.motivo_exclusao}` : ''}`;
    if (!d.is_atual) return 'Arquivado (substituído por versão mais recente)';
    return 'Vigente';
  }

  return (
    <Modal open onClose={onClose} title={`Histórico — ${item.documento}`} size="lg">
      {loading && <div className="flex justify-center py-8"><Spinner className="h-6 w-6 text-brand-600" /></div>}
      {error && <p className="text-sm text-red-700">{error}</p>}
      {data && data.length === 0 && <p className="text-sm text-slate-500">Nenhuma versão registrada.</p>}
      {data && data.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {data.map((d) => (
            <li key={d.id} className="px-3 py-2.5">
              <p className="text-[13px] text-slate-700">
                {d.arquivo_nome ?? 'Documento'}
                {d.validade && <span className="ml-1.5 text-slate-400">validade {formatarData(d.validade)}</span>}
              </p>
              <p className="text-[11px] text-slate-400">
                Enviado em {formatarDataHora(d.created_at)} · {situacao(d)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex justify-end"><Button onClick={onClose}>Fechar</Button></div>
    </Modal>
  );
}
