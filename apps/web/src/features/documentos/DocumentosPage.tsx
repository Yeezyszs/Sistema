// Gestão de Documentos — módulo próprio.
//
// Não confundir com os laudos de matéria-prima em Fornecedores & Recebimento:
// lá é o QA da carga que chega; aqui é a documentação legal e de certificação
// que habilita o fornecedor a fornecer (homologação, FOR-POP 7).
import { useState } from 'react';
import { PageHeader } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { GestaoDocumentos } from './ChecklistFornecedor';
import { CatalogoFornecedores } from './CatalogoFornecedores';

export function DocumentosPage() {
  const { perfis } = useAuth();
  // O catálogo é a régua documental de toda a homologação: só gestão mexe.
  const podeCatalogo = perfis.includes('gestao');
  const [aba, setAba] = useState<'fornecedores' | 'catalogo'>('fornecedores');

  return (
    <>
      <PageHeader
        grupo="Gestão de Documentos"
        title="Documentos de fornecedores"
        subtitle="Homologação documental — o que cada fornecedor precisa apresentar e o que está em dia"
      />

      {podeCatalogo && (
        <div className="mb-5 flex flex-wrap gap-2">
          {([['fornecedores', 'Fornecedores'], ['catalogo', 'Catálogo']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setAba(id)}
              className={`rounded-full border px-3.5 py-[7px] text-[12.5px] font-semibold transition ${aba === id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {aba === 'catalogo' && podeCatalogo ? <CatalogoFornecedores /> : <GestaoDocumentos />}
    </>
  );
}
