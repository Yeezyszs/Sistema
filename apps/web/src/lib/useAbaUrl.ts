import { useSearchParams } from 'react-router-dom';

// Guarda a aba escolhida na URL em vez de só na memória do componente.
//
// O motivo é concreto: o Chrome descarta abas em segundo plano para liberar
// memória e recarrega a página quando o usuário volta. Com a aba só em
// `useState`, essa recarga jogava a pessoa de volta na primeira aba do módulo
// — ela saía de Relatórios e voltava na Visão geral. Na URL, a escolha
// sobrevive à recarga, ao remontar do componente e ao F5.
//
// A troca usa `replace` de propósito: o botão Voltar do navegador continua
// significando "página anterior", e não desfaz aba por aba.
export function useAbaUrl<T extends string>(
  chave: string,
  abas: readonly T[],
  padrao: T,
): [T, (aba: T) => void] {
  const [params, setParams] = useSearchParams();

  // Valor da URL só vale se for uma aba conhecida — link velho ou digitado à
  // mão não pode deixar a tela sem conteúdo.
  const bruta = params.get(chave);
  const atual = abas.includes(bruta as T) ? (bruta as T) : padrao;

  function definir(aba: T) {
    const novo = new URLSearchParams(params);
    // A aba padrão sai da URL: ela é o estado inicial, não precisa aparecer.
    if (aba === padrao) novo.delete(chave);
    else novo.set(chave, aba);
    setParams(novo, { replace: true });
  }

  return [atual, definir];
}
