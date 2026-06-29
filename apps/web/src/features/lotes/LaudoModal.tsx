import { useEffect, useState } from 'react';
import { criarLaudo } from '../../lib/db';
import {
  TIPO_LAUDO_LABEL,
  TEMPLATE_FISICO_QUIMICO,
  TEMPLATE_VERIFICACAO_VISUAL,
  RESULTADO_VISUAL_OPCOES,
  AMOSTRAGEM_VISUAL_PADRAO,
  resultadoVisualConforme,
} from '@sistema/domain';
import type { TipoLaudo } from '@sistema/domain';
import { Modal, Button, Field, TextInput, TextArea, Select } from '../../components/ui';
import { useToast } from '../../components/Toast';

interface LinhaFQ {
  ensaio: string;
  resultado: string;
  unidade: string;
  referencia_texto: string;
  metodologia: string;
  limite_min: number | null;
  limite_max: number | null;
}
interface LinhaVisual {
  ensaio: string;
  resultado: string;
  referencia_texto: string;
  metodologia: string;
}

function fqConforme(l: LinhaFQ): boolean {
  if (l.resultado.trim() === '') return true;
  const v = Number(l.resultado);
  if (Number.isNaN(v)) return true;
  if (l.limite_min != null && v < l.limite_min) return false;
  if (l.limite_max != null && v > l.limite_max) return false;
  return true;
}

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
  const [tipo, setTipo] = useState<TipoLaudo>('fisico_quimico');
  const [linhasFQ, setLinhasFQ] = useState<LinhaFQ[]>([]);
  const [itensVisual, setItensVisual] = useState<LinhaVisual[]>([]);
  const [bags, setBags] = useState<{ faixa: string; resultado: string }[]>([]);
  const [amostragem, setAmostragem] = useState('');
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  // Carrega os templates ao abrir / trocar de tipo
  useEffect(() => {
    if (!open) return;
    setObservacao('');
    setLinhasFQ(
      TEMPLATE_FISICO_QUIMICO.map((t) => ({
        ensaio: t.ensaio,
        resultado: '',
        unidade: t.unidade,
        referencia_texto: t.referencia_texto,
        metodologia: t.metodologia,
        limite_min: t.limite_min,
        limite_max: t.limite_max,
      })),
    );
    setItensVisual(
      TEMPLATE_VERIFICACAO_VISUAL.map((t) => ({
        ensaio: t.ensaio,
        resultado: t.resultado,
        referencia_texto: t.referencia_texto,
        metodologia: t.metodologia,
      })),
    );
    setBags([
      { faixa: '01/05', resultado: 'Conforme' },
      { faixa: '06/10', resultado: 'Conforme' },
      { faixa: '11/15', resultado: 'Conforme' },
      { faixa: '16/20', resultado: 'Conforme' },
      { faixa: '21/24', resultado: 'Conforme' },
    ]);
    setAmostragem(AMOSTRAGEM_VISUAL_PADRAO);
  }, [open]);

  const fqConformeGeral = linhasFQ.filter((l) => l.resultado.trim() !== '').every(fqConforme);
  const visualConformeGeral =
    itensVisual.every((i) => resultadoVisualConforme(i.resultado)) &&
    bags.every((b) => b.resultado === 'Conforme');
  const conforme = tipo === 'fisico_quimico' ? fqConformeGeral : visualConformeGeral;

  async function salvar() {
    setSalvando(true);
    try {
      if (tipo === 'fisico_quimico') {
        const preenchidas = linhasFQ.filter((l) => l.resultado.trim() !== '');
        if (preenchidas.length === 0) {
          erro('Informe ao menos um resultado.');
          setSalvando(false);
          return;
        }
        await criarLaudo(
          { tipo, lote_id: loteId, produto_id: produtoId, conforme: fqConformeGeral, observacao: observacao.trim() || null },
          linhasFQ.map((l, i) => ({
            ensaio: l.ensaio,
            resultado: l.resultado.trim() ? Number(l.resultado) : null,
            unidade: l.unidade || null,
            limite_min: l.limite_min,
            limite_max: l.limite_max,
            referencia_texto: l.referencia_texto || null,
            metodologia: l.metodologia || null,
            conforme: fqConforme(l),
            ordem: i,
          })),
        );
      } else {
        await criarLaudo(
          {
            tipo,
            lote_id: loteId,
            produto_id: produtoId,
            conforme: visualConformeGeral,
            observacao: observacao.trim() || null,
            dados: { amostragem: amostragem.trim(), bags },
          },
          itensVisual.map((it, i) => ({
            ensaio: it.ensaio,
            texto: it.resultado,
            referencia_texto: it.referencia_texto || null,
            metodologia: it.metodologia || null,
            conforme: resultadoVisualConforme(it.resultado),
            ordem: i,
          })),
        );
      }
      sucesso(conforme ? 'Laudo emitido (aprovado).' : 'Laudo emitido — atenção: reprovado.');
      onSaved();
      onClose();
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha ao emitir laudo.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Emitir laudo" size="xl">
      <div className="space-y-4">
        <Field label="Tipo de laudo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoLaudo)}>
            {(Object.keys(TIPO_LAUDO_LABEL) as TipoLaudo[]).map((t) => (
              <option key={t} value={t}>{TIPO_LAUDO_LABEL[t]}</option>
            ))}
          </Select>
        </Field>

        {tipo === 'fisico_quimico' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pr-2 font-medium">Ensaio</th>
                  <th className="pb-2 px-2 font-medium">Resultado</th>
                  <th className="pb-2 px-2 font-medium">Unidade</th>
                  <th className="pb-2 px-2 font-medium">Referência</th>
                  <th className="pb-2 pl-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {linhasFQ.map((l, i) => {
                  const preenchida = l.resultado.trim() !== '';
                  const ok = fqConforme(l);
                  return (
                    <tr key={i}>
                      <td className="py-1 pr-2 text-slate-700">{l.ensaio}</td>
                      <td className="py-1 px-2 w-28">
                        <TextInput
                          type="number"
                          step="any"
                          value={l.resultado}
                          onChange={(e) =>
                            setLinhasFQ((p) => p.map((x, idx) => (idx === i ? { ...x, resultado: e.target.value } : x)))
                          }
                          placeholder="0"
                        />
                      </td>
                      <td className="py-1 px-2 text-xs text-slate-500">{l.unidade}</td>
                      <td className="py-1 px-2 text-xs text-slate-500">{l.referencia_texto}</td>
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
            <p className="mt-2 text-xs text-slate-400">
              Análises microbiológicas são realizadas em laboratório externo acreditado (ISO/IEC 17025).
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pr-2 font-medium">Contaminante</th>
                  <th className="pb-2 px-2 font-medium">Resultado</th>
                  <th className="pb-2 pl-2 font-medium">Referência</th>
                </tr>
              </thead>
              <tbody>
                {itensVisual.map((it, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-2 text-slate-700">{it.ensaio}</td>
                    <td className="py-1 px-2 w-44">
                      <Select
                        value={it.resultado}
                        onChange={(e) =>
                          setItensVisual((p) => p.map((x, idx) => (idx === i ? { ...x, resultado: e.target.value } : x)))
                        }
                      >
                        {RESULTADO_VISUAL_OPCOES.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </Select>
                    </td>
                    <td className="py-1 pl-2 text-xs text-slate-500">{it.referencia_texto}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Amostras peneiradas (bags)</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {bags.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-14 text-sm text-slate-600">{b.faixa}</span>
                    <Select
                      value={b.resultado}
                      onChange={(e) => setBags((p) => p.map((x, idx) => (idx === i ? { ...x, resultado: e.target.value } : x)))}
                    >
                      <option value="Conforme">Conforme</option>
                      <option value="Não conforme">Não conforme</option>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <Field label="Descrição da amostragem">
              <TextArea value={amostragem} onChange={(e) => setAmostragem(e.target.value)} rows={2} />
            </Field>
          </div>
        )}

        <Field label="Observação">
          <TextInput value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Observações do laudo" />
        </Field>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className={`text-sm font-semibold ${conforme ? 'text-emerald-600' : 'text-red-600'}`}>
            {conforme ? 'Laudo aprovado' : 'Laudo reprovado'}
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
