// Detalhe do fornecedor: identificação, segmentos e o checklist documental.
import { CLASSIFICACAO_RISCO_LABEL, CLASSIFICACAO_RISCO_COR, STATUS_DOCUMENTAL_LABEL } from '@sistema/domain';
import type { Fornecedor, SegmentoFornecedor, FornecedorSegmento } from '@sistema/domain';
import { formatarData } from '../../lib/format';
import { Card, Button } from '../../components/ui';
import { STATUS_CLASS } from './comum';
import { ChecklistDoFornecedor } from './ChecklistFornecedor';

export function FornecedorDetalhe({
  fornecedor, segmentos, vinculos, onVoltar, onEditar, onMudou,
}: {
  fornecedor: Fornecedor;
  segmentos: SegmentoFornecedor[];
  vinculos: FornecedorSegmento[];
  onVoltar: () => void;
  onEditar: () => void;
  onMudou: () => void;
}) {
  const nomes = vinculos
    .map((v) => segmentos.find((s) => s.id === v.segmento_id)?.nome)
    .filter((n): n is string => Boolean(n));
  const risco = fornecedor.classificacao_risco;

  return (
    <>
      <button onClick={onVoltar} className="mb-4 text-[13px] font-semibold text-slate-500 hover:text-brand-700">
        ← Fornecedores
      </button>

      <Card className="mb-4 flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900">{fornecedor.razao_social}</h2>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[fornecedor.status_documental]}`}>
              {STATUS_DOCUMENTAL_LABEL[fornecedor.status_documental]}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-slate-500">
            {fornecedor.cnpj ?? 'sem CNPJ'}
            {nomes.length > 0 && ` · ${nomes.join(', ')}`}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px] text-slate-700">
            {risco ? (
              <>
                <span className="h-2 w-2 rounded-full" style={{ background: CLASSIFICACAO_RISCO_COR[risco] }} />
                Risco {CLASSIFICACAO_RISCO_LABEL[risco]}
              </>
            ) : <span className="text-slate-400">Risco não informado</span>}
            <span className="mx-1 text-slate-300">•</span>
            <span className="text-slate-500">Cadastrado em {formatarData(fornecedor.data_cadastro)}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-4">
          <div className="text-right text-[13px] text-slate-500">
            {fornecedor.telefone && <div>{fornecedor.telefone}</div>}
            {fornecedor.email && <div>{fornecedor.email}</div>}
          </div>
          <Button variant="outline" onClick={onEditar}>Editar</Button>
        </div>
      </Card>

      {nomes.length === 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Sem segmento definido — o checklist fica vazio. Use "Editar" para vincular os segmentos
          de atuação; são eles que determinam os documentos exigidos.
        </div>
      )}

      <ChecklistDoFornecedor fornecedor={fornecedor} recarregarPai={onMudou} />
    </>
  );
}
