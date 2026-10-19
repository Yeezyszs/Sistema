// Anexos da O.S.: escolher fotos e vídeos antes de salvar, e ver o que já foi
// anexado. Separados em dois componentes porque o primeiro trabalha com
// arquivos ainda no aparelho, e o segundo com o que já está no Storage.
import { useEffect, useMemo, useRef, useState } from 'react';
import { listAnexosDaOs, urlDoAnexo, excluirAnexoDaOs } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { problemaNoAnexo, ETAPA_ANEXO_OS, ETAPA_ANEXO_OS_LABEL } from '@sistema/domain';
import type { OsAnexo, EtapaAnexoOs } from '@sistema/domain';
import { Spinner } from '../../components/ui';

// ── Escolher arquivos (ainda não enviados) ─────────────────────
export function EscolherAnexos({ arquivos, onChange, onErro, titulo = 'Fotos e vídeos' }: {
  arquivos: File[];
  onChange: (arquivos: File[]) => void;
  onErro: (mensagem: string) => void;
  titulo?: string;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  // URL local para a miniatura. Revogada ao sair, senão o navegador segura o
  // vídeo inteiro na memória enquanto a aba estiver aberta.
  const previas = useMemo(() => arquivos.map((a) => URL.createObjectURL(a)), [arquivos]);
  useEffect(() => () => previas.forEach((u) => URL.revokeObjectURL(u)), [previas]);

  function adicionar(lista: FileList | null) {
    if (!lista) return;
    const aceitos: File[] = [];
    for (const a of Array.from(lista)) {
      const problema = problemaNoAnexo(a);
      if (problema) onErro(problema);
      else aceitos.push(a);
    }
    if (aceitos.length > 0) onChange([...arquivos, ...aceitos]);
    if (entrada.current) entrada.current.value = '';
  }

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">{titulo}</p>
        <button type="button" onClick={() => entrada.current?.click()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          + Adicionar foto ou vídeo
        </button>
        {/* Sem `capture`: no celular ele forçaria a câmera e impediria escolher
            uma foto que já está na galeria. Sem ele, o próprio celular oferece
            as duas opções. */}
        <input ref={entrada} type="file" accept="image/*,video/*" multiple className="hidden"
          onChange={(e) => adicionar(e.target.files)} />
      </div>

      {arquivos.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">Nenhum arquivo. Até 50 MB cada.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {arquivos.map((a, i) => (
            <li key={`${a.name}-${i}`} className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-50">
              {a.type.startsWith('video/') ? (
                <video src={previas[i]} className="aspect-square w-full object-cover" muted />
              ) : (
                <img src={previas[i]} alt={a.name} className="aspect-square w-full object-cover" />
              )}
              {a.type.startsWith('video/') && (
                <span className="absolute left-1 top-1 rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  vídeo
                </span>
              )}
              <button type="button" onClick={() => onChange(arquivos.filter((_, j) => j !== i))}
                aria-label={`Remover ${a.name}`}
                className="absolute right-1 top-1 h-6 w-6 rounded-full bg-white/90 text-xs font-bold text-slate-700 shadow hover:bg-white">
                ×
              </button>
              <p className="truncate px-1.5 py-1 text-[10px] text-slate-500">{tamanho(a.size)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function tamanho(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
}

// ── Galeria do que já foi anexado ──────────────────────────────
export function GaleriaAnexos({ osId, recarregar = 0, podeExcluir = false, onErro }: {
  osId: string;
  recarregar?: number;
  podeExcluir?: boolean;
  onErro?: (m: string) => void;
}) {
  const [versao, setVersao] = useState(0);
  const { data, loading, error } = useAsync(async () => {
    const anexos = await listAnexosDaOs(osId);
    // Link temporário (o bucket é privado): vale uma hora, que é mais do que
    // alguém fica com a O.S. aberta na tela.
    const urls = await Promise.all(anexos.map((a) => urlDoAnexo(a.caminho).catch(() => null)));
    return anexos.map((a, i) => ({ anexo: a, url: urls[i] ?? null }));
  }, [osId, recarregar, versao]);

  const [aberto, setAberto] = useState<{ anexo: OsAnexo; url: string } | null>(null);

  if (loading) return <div className="py-3"><Spinner className="h-5 w-5 text-brand-600" /></div>;
  if (error) return <p className="text-xs text-red-600">Não foi possível carregar os anexos: {error}</p>;
  if (!data || data.length === 0) return <p className="text-xs text-slate-400">Nenhuma foto ou vídeo anexado.</p>;

  async function excluir(a: OsAnexo) {
    try { await excluirAnexoDaOs(a); setVersao((v) => v + 1); }
    catch (e) { onErro?.(e instanceof Error ? e.message : 'Falha ao excluir o anexo.'); }
  }

  return (
    <div className="space-y-3">
      {ETAPA_ANEXO_OS.map((etapa: EtapaAnexoOs) => {
        const itens = data.filter((d) => d.anexo.etapa === etapa);
        if (itens.length === 0) return null;
        return (
          <div key={etapa}>
            <p className="mb-1.5 text-[11px] font-semibold text-slate-500">{ETAPA_ANEXO_OS_LABEL[etapa]}</p>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {itens.map(({ anexo, url }) => (
                <li key={anexo.id} className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                  {url ? (
                    <button type="button" onClick={() => setAberto({ anexo, url })} className="block w-full">
                      {anexo.mime?.startsWith('video/') ? (
                        <video src={url} className="aspect-square w-full object-cover" muted preload="metadata" />
                      ) : (
                        <img src={url} alt={anexo.nome ?? 'anexo'} className="aspect-square w-full object-cover" loading="lazy" />
                      )}
                    </button>
                  ) : (
                    <div className="flex aspect-square items-center justify-center text-[10px] text-slate-400">indisponível</div>
                  )}
                  {anexo.mime?.startsWith('video/') && (
                    <span className="pointer-events-none absolute left-1 top-1 rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      vídeo
                    </span>
                  )}
                  {podeExcluir && (
                    <button type="button" onClick={() => void excluir(anexo)} aria-label="Excluir anexo"
                      className="absolute right-1 top-1 h-6 w-6 rounded-full bg-white/90 text-xs font-bold text-slate-700 shadow hover:bg-white">
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {/* Visualização grande — foto inteira ou vídeo com controles. */}
      {aberto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 p-4"
          onClick={() => setAberto(null)}>
          <div className="max-h-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            {aberto.anexo.mime?.startsWith('video/') ? (
              <video src={aberto.url} controls autoPlay className="max-h-[80vh] w-full rounded-lg bg-black" />
            ) : (
              <img src={aberto.url} alt={aberto.anexo.nome ?? 'anexo'} className="max-h-[80vh] w-auto rounded-lg" />
            )}
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-300">
              <span className="truncate">{aberto.anexo.nome}</span>
              <span className="flex shrink-0 gap-4">
                <a href={aberto.url} target="_blank" rel="noreferrer" className="font-semibold text-white hover:underline">Abrir original</a>
                <button type="button" onClick={() => setAberto(null)} className="font-semibold text-white hover:underline">Fechar</button>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
