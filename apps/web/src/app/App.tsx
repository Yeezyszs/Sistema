import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from '../lib/auth';
import { FullScreen, Spinner } from '../components/ui';
import { ToastProvider } from '../components/Toast';
import type { Modulo } from '@sistema/domain';
import { Layout } from './Layout';
import { LoginPage } from './LoginPage';
import { LotesPage } from '../features/lotes/LotesPage';
import { LotePage } from '../features/lotes/LotePage';
import { RecebimentosPage } from '../features/recebimentos/RecebimentosPage';
import { QualidadePage } from '../features/qualidade/QualidadePage';
import { AcompanhamentoPage } from '../features/acompanhamento/AcompanhamentoPage';
import { MonitoramentoAguaPage } from '../features/qualidade/MonitoramentoAguaPage';
import { CalibracaoPhmetroPage } from '../features/qualidade/CalibracaoPhmetroPage';
import { InsumosLaboratorioPage } from '../features/qualidade/InsumosLaboratorioPage';
import { ContraprovasPage } from '../features/qualidade/ContraprovasPage';
import { PcmCadastrosPage } from '../features/pcm/PcmCadastrosPage';
import { PcmIndicadoresPage } from '../features/pcm/PcmIndicadoresPage';
import { PcmChecklistPage } from '../features/pcm/PcmChecklistPage';
import { PainelPage } from '../features/painel/PainelPage';
import { NaoConformidadesPage } from '../features/qualidade/NaoConformidadesPage';
import { EspecificacoesPage } from '../features/qualidade/EspecificacoesPage';
import { PccFisicoPage } from '../features/qualidade/PccFisicoPage';
import { PphoPage } from '../features/qualidade/PphoPage';
import { CalibracaoPage } from '../features/qualidade/CalibracaoPage';
import { PcmOrdensPage } from '../features/pcm/PcmOrdensPage';
import { PcmPreventivaPage } from '../features/pcm/PcmPreventivaPage';
import { PcmLubrificacaoPage } from '../features/pcm/PcmLubrificacaoPage';
import { PcmOsPrint } from '../features/pcm/PcmOsPrint';
import { OrdemProducaoPrint } from '../features/ordens/OrdemProducaoPrint';
import { AnaliseRiscoPage } from '../features/qualidade/AnaliseRiscoPage';
import { AuditoriaPage } from '../features/qualidade/AuditoriaPage';
import { AmbientalPage } from '../features/qualidade/AmbientalPage';
import { FornecedoresPage } from '../features/fornecedores/FornecedoresPage';
import { LaudoPrint } from '../features/lotes/LaudoPrint';
import { OrdensPage } from '../features/ordens/OrdensPage';
import { OrdemPage } from '../features/ordens/OrdemPage';
import { ProgramacaoPage } from '../features/pcp/ProgramacaoPage';
import { ProdutosPage } from '../features/produtos/ProdutosPage';
import { ApontamentoPage } from '../features/pcp/ApontamentoPage';
import { EstoquePage } from '../features/estoque/EstoquePage';
import { PedidosPage } from '../features/pedidos/PedidosPage';
import { ExpedicaoPage } from '../features/expedicao/ExpedicaoPage';
import { EmbalagensPage } from '../features/embalagens/EmbalagensPage';
import { PalletsPage } from '../features/pallets/PalletsPage';
import { RetidosPage } from '../features/retidos/RetidosPage';

function Protected({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuth();
  if (loading)
    return (
      <FullScreen>
        <Spinner className="h-8 w-8 text-brand-600" />
      </FullScreen>
    );
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

// Bloqueia acesso a um módulo cujo perfil do usuário não cobre.
// Complementa (não substitui) o RLS do banco, que é a defesa real.
function ModuloGuard({ modulo, children }: { modulo: Modulo; children: ReactNode }) {
  const { podeAcessarModulo, loading } = useAuth();
  if (loading) return null;
  if (!podeAcessarModulo(modulo)) return <Navigate to="/lotes" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* Impressão de laudo — página cheia, fora do Layout */}
          <Route
            path="/laudos/:id/imprimir"
            element={
              <Protected>
                <LaudoPrint />
              </Protected>
            }
          />
          {/* Impressão de O.S. (PCM) — página cheia, fora do Layout */}
          <Route
            path="/pcm-os/:id/imprimir"
            element={
              <Protected>
                <PcmOsPrint />
              </Protected>
            }
          />
          {/* Impressão de Ordem de Produção — página cheia, fora do Layout */}
          <Route
            path="/ordens/:id/imprimir"
            element={
              <Protected>
                <OrdemProducaoPrint />
              </Protected>
            }
          />
          <Route
            element={
              <Protected>
                <Layout />
              </Protected>
            }
          >
            <Route path="/" element={<Navigate to="/painel" replace />} />
            <Route path="/painel" element={<ModuloGuard modulo="painel"><PainelPage /></ModuloGuard>} />
            <Route path="/programacao" element={<ModuloGuard modulo="pcp"><ProgramacaoPage /></ModuloGuard>} />
            <Route path="/produtos" element={<ModuloGuard modulo="produtos"><ProdutosPage /></ModuloGuard>} />
            <Route path="/apontamento" element={<ModuloGuard modulo="pcp"><ApontamentoPage /></ModuloGuard>} />
            <Route path="/estoque" element={<ModuloGuard modulo="estoque"><EstoquePage /></ModuloGuard>} />
            <Route path="/pedidos" element={<ModuloGuard modulo="pedidos"><PedidosPage /></ModuloGuard>} />
            <Route path="/expedicao" element={<ModuloGuard modulo="expedicao"><ExpedicaoPage /></ModuloGuard>} />
            <Route path="/embalagens" element={<ModuloGuard modulo="embalagens"><EmbalagensPage /></ModuloGuard>} />
            <Route path="/pallets" element={<ModuloGuard modulo="pallets"><PalletsPage /></ModuloGuard>} />
            <Route path="/reprocesso" element={<ModuloGuard modulo="reprocesso"><RetidosPage /></ModuloGuard>} />
            <Route path="/ordens" element={<ModuloGuard modulo="ordens"><OrdensPage /></ModuloGuard>} />
            <Route path="/ordens/:id" element={<ModuloGuard modulo="ordens"><OrdemPage /></ModuloGuard>} />
            <Route path="/lotes" element={<ModuloGuard modulo="lotes"><LotesPage /></ModuloGuard>} />
            <Route path="/lotes/:id" element={<ModuloGuard modulo="lotes"><LotePage /></ModuloGuard>} />
            <Route path="/recebimentos" element={<ModuloGuard modulo="recebimentos"><RecebimentosPage /></ModuloGuard>} />
            <Route path="/qualidade" element={<ModuloGuard modulo="qualidade"><QualidadePage /></ModuloGuard>} />
            <Route path="/acompanhamento" element={<ModuloGuard modulo="acompanhamento"><AcompanhamentoPage /></ModuloGuard>} />
            <Route path="/monitoramento-agua" element={<ModuloGuard modulo="monitoramento_agua"><MonitoramentoAguaPage /></ModuloGuard>} />
            <Route path="/nao-conformidades" element={<ModuloGuard modulo="nao_conformidades"><NaoConformidadesPage /></ModuloGuard>} />
            <Route path="/especificacoes" element={<ModuloGuard modulo="especificacoes"><EspecificacoesPage /></ModuloGuard>} />
            <Route path="/pcc-fisico" element={<ModuloGuard modulo="pcc_fisico"><PccFisicoPage /></ModuloGuard>} />
            <Route path="/ppho" element={<ModuloGuard modulo="ppho"><PphoPage /></ModuloGuard>} />
            <Route path="/calibracao" element={<ModuloGuard modulo="calibracao"><CalibracaoPage /></ModuloGuard>} />
            <Route path="/calibracao-phmetro" element={<ModuloGuard modulo="calibracao"><CalibracaoPhmetroPage /></ModuloGuard>} />
            <Route path="/insumos-lab" element={<ModuloGuard modulo="insumos_lab"><InsumosLaboratorioPage /></ModuloGuard>} />
            <Route path="/contraprovas" element={<ModuloGuard modulo="contraprovas"><ContraprovasPage /></ModuloGuard>} />
            <Route path="/manutencao" element={<ModuloGuard modulo="manutencao"><PcmOrdensPage /></ModuloGuard>} />
            <Route path="/pcm-cadastros" element={<ModuloGuard modulo="manutencao"><PcmCadastrosPage /></ModuloGuard>} />
            <Route path="/preventiva" element={<ModuloGuard modulo="manutencao"><PcmPreventivaPage /></ModuloGuard>} />
            <Route path="/lubrificacao" element={<ModuloGuard modulo="manutencao"><PcmLubrificacaoPage /></ModuloGuard>} />
            <Route path="/pcm-indicadores" element={<ModuloGuard modulo="manutencao"><PcmIndicadoresPage /></ModuloGuard>} />
            <Route path="/pcm-checklist" element={<ModuloGuard modulo="manutencao"><PcmChecklistPage /></ModuloGuard>} />
            <Route path="/analise-risco" element={<ModuloGuard modulo="analise_risco"><AnaliseRiscoPage /></ModuloGuard>} />
            <Route path="/auditoria" element={<ModuloGuard modulo="auditoria"><AuditoriaPage /></ModuloGuard>} />
            <Route path="/ambiental" element={<ModuloGuard modulo="ambiental"><AmbientalPage /></ModuloGuard>} />
            <Route path="/fornecedores" element={<ModuloGuard modulo="fornecedores"><FornecedoresPage /></ModuloGuard>} />
          </Route>
          <Route path="*" element={<Navigate to="/painel" replace />} />
        </Routes>
      </HashRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
