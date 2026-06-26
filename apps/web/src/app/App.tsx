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
          <Route
            element={
              <Protected>
                <Layout />
              </Protected>
            }
          >
            <Route path="/" element={<Navigate to="/lotes" replace />} />
            <Route path="/lotes" element={<LotesPage />} />
            <Route path="/lotes/:id" element={<LotePage />} />
            <Route path="/recebimentos" element={<RecebimentosPage />} />
            <Route path="/qualidade" element={<QualidadePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/lotes" replace />} />
        </Routes>
      </HashRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
