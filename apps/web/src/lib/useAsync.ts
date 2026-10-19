import { useEffect, useRef, useState } from 'react';
import { aoMudarBanco } from './aoVivo';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Carregamento de dados com cancelamento ao desmontar — e ao vivo.
//
// Dois jeitos de buscar de novo, com comportamento diferente de propósito:
//
//   · quando `deps` muda (outra semana, outro filtro, o contador que a tela
//     incrementa depois de salvar), a busca é das antigas: limpa e mostra o
//     carregando. Mostrar a semana passada enquanto a nova chega confundiria.
//
//   · quando o banco avisa que algo mudou (registro feito em outro computador),
//     a busca é silenciosa: a tela continua mostrando o que tinha e só troca
//     quando o novo chega. Piscar a tela inteira a cada lançamento de outra
//     pessoa seria pior do que o F5 que isto veio substituir. Se essa busca
//     silenciosa falhar, fica o que já estava na tela.
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const [versaoAoVivo, setVersaoAoVivo] = useState(0);
  const silenciosa = useRef(false);

  useEffect(() => aoMudarBanco(() => {
    silenciosa.current = true;
    setVersaoAoVivo((v) => v + 1);
  }), []);

  useEffect(() => {
    let alive = true;
    const eraSilenciosa = silenciosa.current;
    silenciosa.current = false;
    if (!eraSilenciosa) setState({ data: null, loading: true, error: null });
    fn()
      .then((data) => {
        if (alive) setState({ data, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const erro = e instanceof Error ? e.message : String(e);
        // Silenciosa com algo já na tela: mantém o que estava. Sem nada na tela
        // (a busca silenciosa atropelou a primeira), mostra o erro — senão o
        // carregando ficaria girando para sempre.
        setState((ant) => (eraSilenciosa && ant.data !== null ? ant : { data: null, loading: false, error: erro }));
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, versaoAoVivo]);

  return state;
}
