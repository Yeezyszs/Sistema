import { useEffect, useState } from 'react';
import { getEspecificacaoAplicavel, criarLaudo } from '../../lib/db';
import { Modal, Button, Field, TextInput } from '../../components/ui';
import { useToast } from '../../components/Toast';

interface LinhaEnsaio {
  ensaio: string;
  resultado: string;
  unidade: string;
  limite_min: string;
  limite_max: string;
}

function conformeLinha(l: LinhaEnsaio): boolean {
  if (l.resultado.trim() === '') return true;
  const v = Number(l.resultado);
  if (Number.isNaN(v)) return true;
  if (l.limite_min !== '' && v < Number(l.limite_min)) return false;
  if (l.limite_max !== '' && v > Number(l.limite_max)) return false;
  return true;
}

const LINHA_VAZIA: LinhaEnsaio = { ensaio: '', resultado: '', unidade: '', limite_min: '', limite_max: '' };

export function LaudoModal({
  open,
  onClose,
  loteId,
  produtoId,
  clienteId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  loteId: string;
  produtoId: string;
  clienteId: string | null;
  onSaved: () => void;
}) {
  const [linhas, setLinhas] = useState<LinhaEnsaio[]>([{ ...LINHA_VAZIA }]);
  const [especId, setEspecId] = useState<string | null>(null);
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  // Ao abrir, tenta puxar a especificação aplicável (limites de referência)
  useEffect(() => {
    if (!open) return;
    setObservacao('');
    getEspecificacaoAplicavel(produtoId, clienteId)
      .then((res) => {
        if (res && res.parametros.length > 0) {
          setEspecId(res.especificacao.id);
          setLinhas(
            res.parametros.map((p) => ({
              ensaio: p.ensaio,
              resultado: '',
              unidade: p.unidade ?? '',
              limite_min: p.limite_min != null ? String(p.limite_min) : '',
              limite_max: p.limite_max != null ? String(p.limite_max) : '',
            })),
          );
        } else {
          setEspecId(null);
          setLinhas([{ ...LINHA_VAZIA }]);
        }
      })
      .catch(() => {
        setEspecId(null);
        setLinhas([{ ...LINHA_VAZIA }]);
      });
  }, [open, produtoId, clienteId]);

  function atualizar(i: number, campo: keyof LinhaEnsaio, valor: string) {
    setLinhas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }

  const linhasPreenchidas = linhas.filter((l) => l.ensaio.trim() !== '');
  const laudoConforme = linhasPreenchidas.every(conformeLinha);

  async function salvar() {
    if (linhasPreenchidas.length === 0) {
      erro('Adicione ao menos um ensaio.');
      return;
    }
    setSalvando(true);
    try {
      await criarLaudo(
        {
          lote_id: loteId,
          produto_id: produtoId,
          especificacao_id: especId,
          conforme: laudoConforme,
          observacao: observacao.trim() || null,
        },
        linhasPreenchidas.map((l, i) => ({
          ensaio: l.ensaio.trim(),
          resultado: l.resultado.trim() ? Number(l.resultado) : null,
          unidade: l.unidade.trim() || null,
          limite_min: l.limite_min.trim() ? Number(l.limite_min) : null,
          limite_max: l.limite_max.trim() ? Number(l.limite_max) : null,
          conforme: conformeLinha(l),
          ordem: i,
        })),
      );
      sucesso(laudoConforme ? 'Laudo emitido (aprovado).' : 'Laudo emitido — atenção: reprovado.');
      onSaved();
      onClose();
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha ao emitir laudo.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Emitir laudo físico-químico" size="xl">
      <div className="space-y-4">
        {especId ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Limites pré-carregados da especificação do produto/cliente.
          </p>
        ) : (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Sem especificação cadastrada — informe os ensaios e limites manualmente.
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-2 pr-2 font-medium">Ensaio</th>
                <th className="pb-2 px-2 font-medium">Resultado</th>
                <th className="pb-2 px-2 font-medium">Un.</th>
                <th className="pb-2 px-2 font-medium">Mín</th>
                <th className="pb-2 px-2 font-medium">Máx</th>
                <th className="pb-2 pl-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => {
                const ok = conformeLinha(l);
                const preenchida = l.ensaio.trim() !== '' && l.resultado.trim() !== '';
                return (
                  <tr key={i}>
                    <td className="py-1 pr-2"><TextInput value={l.ensaio} onChange={(e) => atualizar(i, 'ensaio', e.target.value)} placeholder="Teor de umidade" /></td>
                    <td className="py-1 px-2"><TextInput type="number" step="any" value={l.resultado} onChange={(e) => atualizar(i, 'resultado', e.target.value)} placeholder="0" /></td>
                    <td className="py-1 px-2 w-16"><TextInput value={l.unidade} onChange={(e) => atualizar(i, 'unidade', e.target.value)} placeholder="%" /></td>
                    <td className="py-1 px-2 w-20"><TextInput type="number" step="any" value={l.limite_min} onChange={(e) => atualizar(i, 'limite_min', e.target.value)} /></td>
                    <td className="py-1 px-2 w-20"><TextInput type="number" step="any" value={l.limite_max} onChange={(e) => atualizar(i, 'limite_max', e.target.value)} /></td>
                    <td className="py-1 pl-2 w-24">
                      {preenchida ? (
                        <span className={`text-xs font-semibold ${ok ? 'text-emerald-600' : 'text-red-600'}`}>
                          {ok ? 'Conforme' : 'Não conf.'}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={() => setLinhas((p) => [...p, { ...LINHA_VAZIA }])}
          className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
        >
          + Adicionar ensaio
        </button>

        <Field label="Observação">
          <TextInput value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Observações do laudo" />
        </Field>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className={`text-sm font-semibold ${laudoConforme ? 'text-emerald-600' : 'text-red-600'}`}>
            {laudoConforme ? 'Laudo aprovado' : 'Laudo reprovado'}
          </span>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="button" loading={salvando} onClick={() => void salvar()}>Emitir laudo</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
