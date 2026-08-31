// Configuração única do monorepo (ESLint 9, flat config).
//
// O objetivo aqui não é estilo — é pegar a classe de erro que já nos custou
// produção: dependência esquecida em hook, que deixa a tela com dado velho ou
// em laço de renderização.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', 'supabase/functions/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // Variável não usada vira erro, menos quando prefixada com _ (descarte
      // intencional) — pega import e estado que sobraram de refatoração.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      // `any` acontece em fronteira com biblioteca; avisa sem travar o CI.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // `useAsync` é o nosso hook de carregamento: recebe lista de dependências
      // como o useEffect e sofre do mesmo problema quando ela fica
      // desatualizada. Incluí-lo aqui encontrou uma tela que não recarregava os
      // valores ao trocar a análise em edição.
      //
      // Fica em `warn` porque o nosso contador de recarga (`setRecarregar`)
      // gera ~40 falsos positivos: o contador é dependência de propósito, para
      // forçar nova busca, mas a função não o referencia e a regra o considera
      // desnecessário. A correção real é `useAsync` expor o próprio recarregar
      // — refatoração de ~40 telas, anotada para depois.
      'react-hooks/exhaustive-deps': ['warn', { additionalHooks: '(useAsync)' }],

      // Regras do React Compiler: apontam padrões que impedem a otimização
      // automática, não defeitos. Nosso `useAsync` sincroniza estado com uma
      // fonte externa — é justamente o caso em que setState no efeito é
      // legítimo. Ficam visíveis como aviso, sem travar o CI por algo que hoje
      // funciona corretamente.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
);
