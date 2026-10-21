// Laudo microbiológico externo do laudo interno: anexar o PDF do laboratório
// e abrir o que já foi anexado. Só-inclusão — anexo errado se corrige
// anexando o certo.
import { useRef, useState } from 'react';
import { listAnexosDosLaudos, anexarMicroNoLaudo, urlAssinadaDocumento } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { useToast } from '../../components/Toast';

export function MicroDoLaudo({ laudoId }: { laudoId: string }) {
  const [versao, setVersao] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const { sucesso, erro } = useToast();
  const { data } = useAsync(() => listAnexosDosLaudos([laudoId]), [laudoId, versao]);

  async function enviar(arquivo: File | undefined) {
    if (!arquivo) return;
    setEnviando(true);
    try { await anexarMicroNoLaudo(laudoId, arquivo); sucesso('Laudo microbiológico anexado.'); setVersao((v) => v + 1); }
    catch (e) { erro(e instanceof Error ? e.message : 'Falha ao anexar.'); }
    finally { setEnviando(false); if (entrada.current) entrada.current.value = ''; }
  }

  async function abrir(caminho: string) {
    try { window.open(await urlAssinadaDocumento(caminho, 'fornecedores'), '_blank', 'noopener'); }
    catch (e) { erro(e instanceof Error ? e.message : 'Falha ao abrir.'); }
  }

  const ultimo = data?.at(-1);
  return (
    <span className="flex items-center gap-2">
      {ultimo ? (
        <button type="button" onClick={() => void abrir(ultimo.caminho)} title={ultimo.nome ?? undefined}
          className="text-xs font-medium text-brand-600 hover:text-brand-700">
          Micro
        </button>
      ) : (
        <button type="button" disabled={enviando} onClick={() => entrada.current?.click()}
          className="text-xs font-medium text-amber-700 hover:text-amber-800 disabled:opacity-50">
          {enviando ? 'Enviando…' : '+ Micro'}
        </button>
      )}
      <input ref={entrada} type="file" accept="application/pdf,image/*" className="hidden"
        onChange={(e) => void enviar(e.target.files?.[0])} />
    </span>
  );
}
