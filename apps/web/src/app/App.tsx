import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from '../lib/auth';
import { FullScreen, Spinner } from '../components/ui';
import { ToastProvider } from '../components/Toast';
import type { Modulo } from '@sistema/domain';
import { Layout } from './Layout';
import { LoginPage } from './LoginPage';

// Cada tela é baixada só quando é aberta: o primeiro acesso não precisa
// carregar o sistema inteiro (antes era um arquivo único de 1,1 MB).
const LotesPage = lazy(() => import('../features/lotes/LotesPage').then((m) => ({ default: m.LotesPage })));
const LotePage = lazy(() => import('../features/lotes/LotePage').then((m) => ({ default: m.LotePage })));
const RecebimentosPage = lazy(() => import('../features/recebimentos/RecebimentosPage').then((m) => ({ default: m.RecebimentosPage })));
const QualidadePage = lazy(() => import('../features/qualidade/QualidadePage').then((m) => ({ default: m.QualidadePage })));
const AcompanhamentoPage = lazy(() => import('../features/acompanhamento/AcompanhamentoPage').then((m) => ({ default: m.AcompanhamentoPage })));
const PcmCadastrosPage = lazy(() => import('../features/pcm/PcmCadastrosPage').then((m) => ({ default: m.PcmCadastrosPage })));
const PcmIndicadoresPage = lazy(() => import('../features/pcm/PcmIndicadoresPage').then((m) => ({ default: m.PcmIndicadoresPage })));
const PcmChecklistPage = lazy(() => import('../features/pcm/PcmChecklistPage').then((m) => ({ default: m.PcmChecklistPage })));
const PainelPage = lazy(() => import('../features/painel/PainelPage').then((m) => ({ default: m.PainelPage })));
const ClientesPage = lazy(() => import('../features/comercial/ClientesPage').then((m) => ({ default: m.ClientesPage })));
const CarteiraPage = lazy(() => import('../features/comercial/CarteiraPage').then((m) => ({ default: m.CarteiraPage })));
const AnaliseVendasPage = lazy(() => import('../features/comercial/AnaliseVendasPage').then((m) => ({ default: m.AnaliseVendasPage })));
const DevolucoesPage = lazy(() => import('../features/comercial/DevolucoesPage').then((m) => ({ default: m.DevolucoesPage })));
const LiberacaoOsPage = lazy(() => import('../features/qualidade/LiberacaoOsPage').then((m) => ({ default: m.LiberacaoOsPage })));
const RastrearLotePage = lazy(() => import('../features/rastreio/RastrearLotePage').then((m) => ({ default: m.RastrearLotePage })));
const ImprimirFormularioPage = lazy(() => import('../features/impressao/ImprimirFormularioPage').then((m) => ({ default: m.ImprimirFormularioPage })));
const AlmoxarifadoPage = lazy(() => import('../features/almoxarifado/AlmoxarifadoPage').then((m) => ({ default: m.AlmoxarifadoPage })));
const EmbalagensPage = lazy(() => import('../features/embalagens/EmbalagensPage').then((m) => ({ default: m.EmbalagensPage })));
const UsuariosPage = lazy(() => import('../features/usuarios/UsuariosPage').then((m) => ({ default: m.UsuariosPage })));
const EspecificacoesPage = lazy(() => import('../features/qualidade/EspecificacoesPage').then((m) => ({ default: m.EspecificacoesPage })));
const PccFisicoPage = lazy(() => import('../features/qualidade/PccFisicoPage').then((m) => ({ default: m.PccFisicoPage })));
const CalibracaoPage = lazy(() => import('../features/qualidade/CalibracaoPage').then((m) => ({ default: m.CalibracaoPage })));
const PcmOrdensPage = lazy(() => import('../features/pcm/PcmOrdensPage').then((m) => ({ default: m.PcmOrdensPage })));
const PcmPreventivaPage = lazy(() => import('../features/pcm/PcmPreventivaPage').then((m) => ({ default: m.PcmPreventivaPage })));
const PcmLubrificacaoPage = lazy(() => import('../features/pcm/PcmLubrificacaoPage').then((m) => ({ default: m.PcmLubrificacaoPage })));
const PcmOsPrint = lazy(() => import('../features/pcm/PcmOsPrint').then((m) => ({ default: m.PcmOsPrint })));
const OrdemProducaoPrint = lazy(() => import('../features/ordens/OrdemProducaoPrint').then((m) => ({ default: m.OrdemProducaoPrint })));
const FornecedoresPage = lazy(() => import('../features/fornecedores/FornecedoresPage').then((m) => ({ default: m.FornecedoresPage })));
const DocumentosPage = lazy(() => import('../features/documentos/DocumentosPage').then((m) => ({ default: m.DocumentosPage })));
const ProdutoresPage = lazy(() => import('../features/suprimentos/ProdutoresPage').then((m) => ({ default: m.ProdutoresPage })));
const SemanaPage = lazy(() => import('../features/suprimentos/SemanaPage').then((m) => ({ default: m.SemanaPage })));
const LaudoPrint = lazy(() => import('../features/lotes/LaudoPrint').then((m) => ({ default: m.LaudoPrint })));
const OrdensPage = lazy(() => import('../features/ordens/OrdensPage').then((m) => ({ default: m.OrdensPage })));
const OrdemPage = lazy(() => import('../features/ordens/OrdemPage').then((m) => ({ default: m.OrdemPage })));
const ProgramacaoPage = lazy(() => import('../features/pcp/ProgramacaoPage').then((m) => ({ default: m.ProgramacaoPage })));
const ProdutosPage = lazy(() => import('../features/produtos/ProdutosPage').then((m) => ({ default: m.ProdutosPage })));
const ApontamentoPage = lazy(() => import('../features/pcp/ApontamentoPage').then((m) => ({ default: m.ApontamentoPage })));
const EstoquePage = lazy(() => import('../features/estoque/EstoquePage').then((m) => ({ default: m.EstoquePage })));
const PedidosPage = lazy(() => import('../features/pedidos/PedidosPage').then((m) => ({ default: m.PedidosPage })));
const ExpedicaoPage = lazy(() => import('../features/expedicao/ExpedicaoPage').then((m) => ({ default: m.ExpedicaoPage })));
const PalletsPage = lazy(() => import('../features/pallets/PalletsPage').then((m) => ({ default: m.PalletsPage })));
const RetidosPage = lazy(() => import('../features/retidos/RetidosPage').then((m) => ({ default: m.RetidosPage })));

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

// Última parada quando o usuário não tem nenhum módulo para onde ir. Uma tela
// em branco faria o usuário achar que o sistema quebrou; o problema é de
// permissão e quem resolve é o administrador.
function SemAcesso() {
  const { perfis, signOut } = useAuth();
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-xl font-bold text-slate-900">Sem acesso a este módulo</h1>
      <p className="mt-2 text-sm text-slate-600">
        {perfis.length === 0
          ? 'Seu usuário ainda não tem nenhum perfil atribuído.'
          : `Seu perfil (${perfis.join(', ')}) não cobre este módulo.`}{' '}
        Fale com o administrador do sistema.
      </p>
      <button
        onClick={() => void signOut()}
        className="mt-5 rounded-lg border border-slate-300 px-3.5 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
      >
        Sair
      </button>
    </div>
  );
}

// Bloqueia acesso a um módulo cujo perfil do usuário não cobre.
// Complementa (não substitui) o RLS do banco, que é a defesa real.
function ModuloGuard({ modulo, children }: { modulo: Modulo; children: ReactNode }) {
  const { podeAcessarModulo, loading, perfisProntos } = useAuth();
  // Decidir sem os perfis negaria acesso a tudo — e no login isso piscava
  // "sem acesso" antes da tela certa aparecer.
  if (loading || !perfisProntos) return null;
  if (podeAcessarModulo(modulo)) return children;

  // Redirecionar só é seguro se o destino for acessível — senão o destino nega
  // de novo e a navegação entra em laço, que o React derruba deixando a tela
  // em branco. Quando não há para onde mandar, explique.
  if (modulo !== 'painel' && podeAcessarModulo('painel')) {
    return <Navigate to="/painel" replace />;
  }
  return <SemAcesso />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <HashRouter>
        <Suspense fallback={<FullScreen><Spinner className="h-8 w-8 text-brand-600" /></FullScreen>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* Impressão dos formulários da Qualidade — página cheia, fora do Layout */}
          <Route path="/imprimir/:tipo/:id" element={<Protected><ImprimirFormularioPage /></Protected>} />
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
            <Route path="/pallets" element={<ModuloGuard modulo="pallets"><PalletsPage /></ModuloGuard>} />
            <Route path="/reprocesso" element={<ModuloGuard modulo="reprocesso"><RetidosPage /></ModuloGuard>} />
            <Route path="/ordens" element={<ModuloGuard modulo="ordens"><OrdensPage /></ModuloGuard>} />
            <Route path="/ordens/:id" element={<ModuloGuard modulo="ordens"><OrdemPage /></ModuloGuard>} />
            <Route path="/lotes" element={<ModuloGuard modulo="lotes"><LotesPage /></ModuloGuard>} />
            <Route path="/lotes/:id" element={<ModuloGuard modulo="lotes"><LotePage /></ModuloGuard>} />
            <Route path="/recebimentos" element={<ModuloGuard modulo="recebimentos"><RecebimentosPage /></ModuloGuard>} />
            <Route path="/qualidade" element={<ModuloGuard modulo="qualidade"><QualidadePage /></ModuloGuard>} />
            <Route path="/acompanhamento" element={<ModuloGuard modulo="acompanhamento"><AcompanhamentoPage /></ModuloGuard>} />
            <Route path="/rastrear" element={<ModuloGuard modulo="qualidade"><RastrearLotePage /></ModuloGuard>} />
            <Route path="/liberacao-os" element={<ModuloGuard modulo="qualidade"><LiberacaoOsPage /></ModuloGuard>} />
            <Route path="/especificacoes" element={<ModuloGuard modulo="especificacoes"><EspecificacoesPage /></ModuloGuard>} />
            <Route path="/pcc-fisico" element={<ModuloGuard modulo="pcc_fisico"><PccFisicoPage /></ModuloGuard>} />
            <Route path="/calibracao" element={<ModuloGuard modulo="calibracao"><CalibracaoPage /></ModuloGuard>} />
            <Route path="/manutencao" element={<ModuloGuard modulo="manutencao"><PcmOrdensPage /></ModuloGuard>} />
            <Route path="/pcm-cadastros" element={<ModuloGuard modulo="manutencao"><PcmCadastrosPage /></ModuloGuard>} />
            <Route path="/preventiva" element={<ModuloGuard modulo="manutencao"><PcmPreventivaPage /></ModuloGuard>} />
            <Route path="/lubrificacao" element={<ModuloGuard modulo="manutencao"><PcmLubrificacaoPage /></ModuloGuard>} />
            <Route path="/pcm-indicadores" element={<ModuloGuard modulo="manutencao"><PcmIndicadoresPage /></ModuloGuard>} />
            <Route path="/pcm-checklist" element={<ModuloGuard modulo="manutencao"><PcmChecklistPage /></ModuloGuard>} />
            <Route path="/fornecedores" element={<ModuloGuard modulo="fornecedores"><FornecedoresPage /></ModuloGuard>} />
            <Route path="/gestao-documentos" element={<ModuloGuard modulo="documentos"><DocumentosPage /></ModuloGuard>} />
            <Route path="/clientes" element={<ModuloGuard modulo="comercial"><ClientesPage /></ModuloGuard>} />
            <Route path="/carteira" element={<ModuloGuard modulo="comercial"><CarteiraPage /></ModuloGuard>} />
            <Route path="/analise-vendas" element={<ModuloGuard modulo="comercial"><AnaliseVendasPage /></ModuloGuard>} />
            <Route path="/devolucoes" element={<ModuloGuard modulo="comercial"><DevolucoesPage /></ModuloGuard>} />
            <Route path="/semana" element={<ModuloGuard modulo="suprimentos"><SemanaPage /></ModuloGuard>} />
            <Route path="/produtores" element={<ModuloGuard modulo="suprimentos"><ProdutoresPage /></ModuloGuard>} />
            <Route path="/almoxarifado" element={<ModuloGuard modulo="almoxarifado"><AlmoxarifadoPage /></ModuloGuard>} />
            <Route path="/embalagens" element={<ModuloGuard modulo="almoxarifado"><EmbalagensPage /></ModuloGuard>} />
            <Route path="/usuarios" element={<ModuloGuard modulo="usuarios"><UsuariosPage /></ModuloGuard>} />
          </Route>
          {/* Cloro & pH, PPHO, pHmetro, insumos do lab, contraprovas, análise de risco,
              auditoria/PPR, ambiental/pragas e NCs saíram do menu a pedido da Qualidade
              (controlados fora do sistema). Os dados continuam no banco. */}
          <Route path="*" element={<Navigate to="/painel" replace />} />
        </Routes>
        </Suspense>
      </HashRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
