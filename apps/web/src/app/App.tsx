// Shell mínimo da aplicação. Sidebar + topbar + rotas (Lotes, Lote,
// Recebimento) entram na Etapa 5, reusando os tipos de @sistema/domain.
export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold">Sistema — MES Sumaré</h1>
        <p className="text-sm text-slate-500">Fase 1 · monorepo inicializado</p>
      </header>
      <main className="p-6">
        <p className="text-slate-600">
          Estrutura pronta. As telas (Lotes, Lote, Recebimento) entram na Etapa 5.
        </p>
      </main>
    </div>
  );
}
