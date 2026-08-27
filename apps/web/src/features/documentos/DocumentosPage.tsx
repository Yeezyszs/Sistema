// Gestão de Documentos — módulo próprio.
//
// Não confundir com os laudos de matéria-prima em Fornecedores & Recebimento:
// lá é o QA da carga que chega; aqui é a documentação legal e de certificação
// que habilita o fornecedor a fornecer (homologação, FOR-POP 7).
import { useState } from 'react';
import { PageHeader } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { DashboardDocumentos } from './DashboardDocumentos';
import { FornecedoresDocumentos } from './FornecedoresDocumentos';
import { RelatoriosDocumentos } from './RelatoriosDocumentos';
import { CatalogoFornecedores } from './CatalogoFornecedores';

type Aba = 'painel' | 'fornecedores' | 'relatorios' | 'catalogo';

export function DocumentosPage() {
  const { perfis } = useAuth();
  // O catálogo define a régua documental da homologação. Quem opera o módulo
  // no dia a dia (compras) precisa dele para cadastrar o que cada segmento
  // exige; a qualidade continua fora por enquanto, a pedido.
  const podeCatalogo = perfis.includes('gestao') || perfis.includes('compras');
  const [aba, setAba] = useState<Aba>('painel');

  const abas: [Aba, string][] = [
    ['painel', 'Visão geral'],
    ['fornecedores', 'Fornecedores'],
    ['relatorios', 'Relatórios'],
    ...(podeCatalogo ? ([['catalogo', 'Catálogo']] as [Aba, string][]) : []),
  ];

  return (
    <>
      <PageHeader
        grupo="Gestão de Documentos"
        title="Homologação de fornecedores"
        subtitle="O que cada fornecedor precisa apresentar, o que está em dia e o que vence"
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {abas.map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)}
            className={`rounded-full border px-3.5 py-[7px] text-[12.5px] font-semibold transition ${aba === id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {aba === 'painel' && <DashboardDocumentos onAbrirFornecedores={() => setAba('fornecedores')} />}
      {aba === 'fornecedores' && <FornecedoresDocumentos />}
      {aba === 'relatorios' && <RelatoriosDocumentos />}
      {aba === 'catalogo' && podeCatalogo && <CatalogoFornecedores />}
    </>
  );
}
