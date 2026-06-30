import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../lib/auth';
import { FullScreen, Spinner } from '../components/ui';
import { ToastProvider } from '../components/Toast';
import { Layout } from './Layout';
import { LoginPage } from './LoginPage';
import { LotesPage } from '../features/lotes/LotesPage';
import { LotePage } from '../features/lotes/LotePage';
import { RecebimentosPage } from '../features/recebimentos/RecebimentosPage';
import { QualidadePage } from '../features/qualidade/QualidadePage';
import { NaoConformidadesPage } from '../features/qualidade/NaoConformidadesPage';
import { EspecificacoesPage } from '../features/qualidade/EspecificacoesPage';
import { PccFisicoPage } from '../features/qualidade/PccFisicoPage';
import { PphoPage } from '../features/qualidade/PphoPage';
import { CalibracaoPage } from '../features/qualidade/CalibracaoPage';
import { ManutencaoPage } from '../features/manutencao/ManutencaoPage';
import { AnaliseRiscoPage } from '../features/qualidade/AnaliseRiscoPage';
import { AuditoriaPage } from '../features/qualidade/AuditoriaPage';
import { AmbientalPage } from '../features/qualidade/AmbientalPage';
import { FornecedoresPage } from '../features/fornecedores/FornecedoresPage';
import { LaudoPrint } from '../features/lotes/LaudoPrint';
import { OrdensPage } from '../features/ordens/OrdensPage';
import { OrdemPage } from '../features/ordens/OrdemPage';

function Protected({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuth();
  if (loading)
    return (
      <FullScreen>
        <Spinner className="h-8 w-8 text-emerald-600" />
      </FullScreen>
    );
  if (!session) return <Navigate to="/login" replace />;
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
          <Route
            element={
              <Protected>
                <Layout />
              </Protected>
            }
          >
            <Route path="/" element={<Navigate to="/lotes" replace />} />
            <Route path="/ordens" element={<OrdensPage />} />
            <Route path="/ordens/:id" element={<OrdemPage />} />
            <Route path="/lotes" element={<LotesPage />} />
            <Route path="/lotes/:id" element={<LotePage />} />
            <Route path="/recebimentos" element={<RecebimentosPage />} />
            <Route path="/qualidade" element={<QualidadePage />} />
            <Route path="/nao-conformidades" element={<NaoConformidadesPage />} />
            <Route path="/especificacoes" element={<EspecificacoesPage />} />
            <Route path="/pcc-fisico" element={<PccFisicoPage />} />
            <Route path="/ppho" element={<PphoPage />} />
            <Route path="/calibracao" element={<CalibracaoPage />} />
            <Route path="/manutencao" element={<ManutencaoPage />} />
            <Route path="/analise-risco" element={<AnaliseRiscoPage />} />
            <Route path="/auditoria" element={<AuditoriaPage />} />
            <Route path="/ambiental" element={<AmbientalPage />} />
            <Route path="/fornecedores" element={<FornecedoresPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/lotes" replace />} />
        </Routes>
      </HashRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
