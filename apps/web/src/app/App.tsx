import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../lib/auth';
import { FullScreen, Spinner } from '../components/ui';
import { Layout } from './Layout';
import { LoginPage } from './LoginPage';
import { LotesPage } from '../features/lotes/LotesPage';
import { LotePage } from '../features/lotes/LotePage';
import { RecebimentosPage } from '../features/recebimentos/RecebimentosPage';

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
          </Route>
          <Route path="*" element={<Navigate to="/lotes" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
