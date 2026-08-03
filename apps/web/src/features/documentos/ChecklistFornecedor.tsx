// Gestão de Documentos — o checklist documental de cada fornecedor.
// O estado de cada item é calculado no banco (qualidade.checklist_fornecedor);
// aqui só se exibe e se age: enviar, substituir, ver, excluir, histórico.
import { useState, type FormEvent } from 'react';
import {
  listFornecedores, listSegmentosFornecedor, listFornecedorSegmentos,
  vincularSegmentoAoFornecedor, desvincularSegmentoDoFornecedor,
  getStatusDocumentalGeral, getChecklistFornecedor, getHistoricoDocumento,
  enviarDocumentoFornecedor, excluirDocumentoFornecedor, urlAssinadaDocumento,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarDataHora } from '../../lib/format';
import {
  ESTADO_ITEM_LABEL, EXIGENCIA_LABEL, STATUS_DOCUMENTAL_LABEL, CATEGORIA_SEGMENTO_LABEL,
} from '@sistema/domain';
import type {
  Fornecedor, ItemChecklistFornecedor, ArquivoChecklist,
  EstadoItemChecklist, StatusDocumental, DocumentoFornecedor,
} from '@sistema/domain';
import {
  Card, CardTitle, Spinner, EmptyState, Button, Field, TextInput, Modal,
} from '../../components/ui';
import { IconDoc, IconDownload } from '../../components/icons';
import { useToast } from '../../components/Toast';

const ESTADO_CLASS: Record<EstadoItemChecklist, string> = {
  ok: 'bg-emerald-100 text-emerald-800',
  faltando: 'bg-red-100 text-red-700',
  vencido: 'bg-red-100 text-red-700',
  aguardando: 'bg-amber-100 text-amber-700',
};

const STATUS_CLASS: Record<StatusDocumental, string> = {
  ok: 'bg-emerald-100 text-emerald-800',
  pendente: 'bg-red-100 text-red-700',
  sem_documentos: 'bg-slate-100 text-slate-600',
};

function ErroCard({ mensagem }: { mensagem: string }) {
  // Consulta falhou: não dá para afirmar que está tudo em dia.
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-red-700">Não foi possível carregar a situação documental.</p>
      <p className="mt-1 text-sm text-slate-500">{mensagem}</p>
    </Card>
  );
}

export function GestaoDocumentos() {
  const [recarregar, setRecarregar] = useState(0);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const { data, loading, error } = useAsync(async () => {
    const [fornecedores, status, segmentos, vinculos] = await Promise.all([
      listFornecedores(), getStatusDocumentalGeral(), listSegmentosFornecedor(), listFornecedorSegmentos(),
    ]);
    return { fornecedores, statusMap: new Map(status.map((s) => [s.fornecedor_id, s])), segmentos, vinculos };
  }, [recarregar]);

  const rec = () => setRecarregar((n) => n + 1);

  if (error) return <ErroCard mensagem={error} />;
  if (loading || !data) return <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-brand-600" /></div>;
  if (data.fornecedores.length === 0) return <EmptyState title="Nenhum fornecedor cadastrado" />;

  const forn = data.fornecedores.find((f) => f.id === selecionado) ?? data.fornecedores[0]!;
  const segsDoForn = data.vinculos.filter((v) => v.fornecedor_id === forn.id);

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {data.fornecedores.map((f) => {
            const st = data.statusMap.get(f.id);
            return (
              <li key={f.id}>
                <button onClick={() => setSelecionado(f.id)}
                  className={`w-full px-4 py-2.5 text-left text-sm transition ${forn.id === f.id ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                  <span className="block truncate">{f.razao_social}</span>
                  <span className="mt-1 flex items-center gap-1.5">
                    <span className={`rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold ${STATUS_CLASS[st?.status_documental ?? 'sem_documentos']}`}>
                      {STATUS_DOCUMENTAL_LABEL[st?.status_documental ?? 'sem_documentos']}
                    </span>
                    {st && st.itens_pendentes > 0 && (
                      <span className="text-[11px] font-normal text-slate-400">{st.itens_pendentes} pend.</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="space-y-4">
        <SegmentosDoFornecedor
          fornecedor={forn}
          segmentos={data.segmentos}
          vinculos={segsDoForn}
          onChange={rec}
        />
        <ChecklistDoFornecedor fornecedor={forn} recarregarPai={rec} />
      </div>
    </div>
  );
}

// ── Segmentos: é o que define o checklist ──────────────────────
function SegmentosDoFornecedor({
  fornecedor, segmentos, vinculos, onChange,
}: {
  fornecedor: Fornecedor;
  segmentos: { id: string; nome: string; categoria: keyof typeof CATEGORIA_SEGMENTO_LABEL; ativo: boolean }[];
  vinculos: { id: string; segmento_id: string }[];
  onChange: () => void;
}) {
  const [abrir, setAbrir] = useState(false);
  const { erro } = useToast();
  const ligados = new Set(vinculos.map((v) => v.segmento_id));

  async function alternar(segId: string) {
    try {
      const v = vinculos.find((x) => x.segmento_id === segId);
      if (v) await desvincularSegmentoDoFornecedor(v.id);
      else await vincularSegmentoAoFornecedor(fornecedor.id, segId);
      onChange();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <CardTitle sub="O segmento é o que define quais documentos são exigidos.">
          Segmentos — {fornecedor.razao_social}
        </CardTitle>
        <button onClick={() => setAbrir(true)} className="shrink-0 text-xs font-semibold text-brand-700 hover:underline">Editar</button>
      </div>
      {vinculos.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Sem segmento definido — o checklist fica vazio até que um seja associado.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {vinculos.map((v) => {
            const s = segmentos.find((x) => x.id === v.segmento_id);
            return (
              <span key={v.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                {s?.nome ?? '—'}
              </span>
            );
          })}
        </div>
      )}

      <Modal open={abrir} onClose={() => setAbrir(false)} title={`Segmentos — ${fornecedor.razao_social}`}>
        <div className="max-h-[60vh] space-y-1 overflow-y-auto">
          {segmentos.filter((s) => s.ativo || ligados.has(s.id)).map((s) => (
            <label key={s.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
              <input type="checkbox" checked={ligados.has(s.id)} onChange={() => void alternar(s.id)} className="h-4 w-4 rounded border-slate-300" />
              <span>{s.nome}<span className="ml-1.5 text-xs text-slate-400">{CATEGORIA_SEGMENTO_LABEL[s.categoria]}</span></span>
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end"><Button onClick={() => setAbrir(false)}>Fechar</Button></div>
      </Modal>
    </Card>
  );
}

// ── Checklist ──────────────────────────────────────────────────
function ChecklistDoFornecedor({
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
    return <EmptyState title="Checklist vazio" description="Associe um segmento ao fornecedor para carregar os documentos exigidos." />;
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
                  <p className="mt-0.5 text-xs text-slate-400">
                    {it.tem_validade
                      ? it.proxima_validade ? `Válido até ${formatarData(it.proxima_validade)}` : 'Controla vencimento'
                      : 'Sem controle de vencimento'}
                    {it.permite_multiplos ? ' · aceita vários arquivos' : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => setHistoricoDe(it)} className="text-xs font-medium text-slate-400 hover:text-slate-700">Histórico</button>
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
                        <p className="truncate text-[13px] text-slate-700">{a.arquivo_nome ?? 'Documento'}</p>
                        <p className="truncate text-[11px] text-slate-400">
                          {[a.validade ? `validade ${formatarData(a.validade)}` : null,
                            a.emitido_em ? `emitido ${formatarData(a.emitido_em)}` : null,
                            a.numero_laudo ? `nº ${a.numero_laudo}` : null].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </div>
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
  const [enviando, setEnviando] = useState(false);
  const { sucesso, erro } = useToast();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const arquivo = f.get('arquivo') as File | null;
    if (!arquivo || arquivo.size === 0) { erro('Selecione um arquivo.'); return; }
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

  return (
    <Modal open onClose={onClose} title={item.documento} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        {!item.permite_multiplos && item.arquivos.length > 0 && (
          <p className="rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            Já existe um arquivo vigente. Enviar um novo arquiva o anterior — nada é apagado.
          </p>
        )}
        <input name="arquivo" type="file" accept=".pdf,.doc,.docx,image/*" required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Emitido em"><TextInput name="emitido_em" type="date" /></Field>
          <Field label={item.tem_validade ? 'Validade (obrigatória)' : 'Validade'}>
            <TextInput name="validade" type="date" required={item.tem_validade} />
          </Field>
          <Field label="Nº do documento"><TextInput name="numero_laudo" placeholder="—" /></Field>
        </div>
        <Field label="Observação"><TextInput name="observacao" placeholder="—" /></Field>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={enviando}>Enviar</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Exclusão (soft delete com motivo) ──────────────────────────
function ModalExclusao({
  arquivo, documento, onClose, onSaved,
}: { arquivo: ArquivoChecklist; documento: string; onClose: () => void; onSaved: () => void }) {
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
    <Modal open onClose={onClose} title={`Excluir — ${documento}`}>
      <p className="text-sm text-slate-600">
        {arquivo.arquivo_nome ?? 'Documento'} sai do checklist, mas continua registrado no
        histórico com o motivo. Rastreabilidade é requisito da FSSC 22000.
      </p>
      <div className="mt-4">
        <Field label="Motivo da exclusão">
          <TextInput value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Lançado no fornecedor errado" required />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => void confirmar()} loading={salvando} disabled={!motivo.trim()}
          className="!bg-red-600 hover:!bg-red-700">Excluir</Button>
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
