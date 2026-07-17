import { useState } from 'react';
import { produtoPorCodigo } from '@sistema/domain';
import { Field, TextInput, Select } from './ui';

interface ProdutoLite {
  id: string;
  nome: string;
  codigo: string | null;
  nome_curto?: string | null;
}

// Seletor de produto com atalho por código: digitar o código (ex.: 16229)
// puxa o produto direto; o select continua disponível como alternativa.
export function ProdutoPicker({
  produtos, value, onChange, label = 'Produto', obrigatorio = false,
}: {
  produtos: ProdutoLite[];
  value: string; // produto_id selecionado ('' = nenhum)
  onChange: (produtoId: string) => void;
  label?: string;
  obrigatorio?: boolean;
}) {
  const [codigo, setCodigo] = useState('');
  const selecionado = produtos.find((p) => p.id === value) ?? null;
  const codigoNaoEncontrado = codigo.trim() !== '' && produtoPorCodigo(produtos, codigo) == null;

  function onCodigoChange(v: string) {
    setCodigo(v);
    const p = produtoPorCodigo(produtos, v);
    if (p) onChange(p.id);
  }

  function onSelectChange(id: string) {
    onChange(id);
    const p = produtos.find((x) => x.id === id);
    setCodigo(p?.codigo ?? '');
  }

  return (
    <Field label={label}>
      <div className="flex gap-2">
        <div className="w-24 shrink-0">
          <TextInput
            value={codigo}
            onChange={(e) => onCodigoChange(e.target.value)}
            placeholder="Cód."
            aria-label="Código do produto"
          />
        </div>
        <div className="flex-1">
          <Select value={value} onChange={(e) => onSelectChange(e.target.value)} required={obrigatorio}>
            <option value="">—</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} · ` : ''}{p.nome_curto || p.nome}</option>
            ))}
          </Select>
        </div>
      </div>
      {codigoNaoEncontrado && (
        <p className="mt-1 text-xs text-amber-600">Código não encontrado.</p>
      )}
      {selecionado && !codigoNaoEncontrado && (
        <p className="mt-1 truncate text-xs text-slate-400">{selecionado.nome}</p>
      )}
    </Field>
  );
}
