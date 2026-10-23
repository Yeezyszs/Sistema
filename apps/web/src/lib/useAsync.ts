import { useEffect, useRef, useState } from 'react';
import { aoMudarBanco } from './aoVivo';

const INTERVALO_AO_VIVO_MS = 15_000;

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

  // Numa fábrica com lançamentos a todo momento, cada aviso do banco recarregava
  // todas as telas abertas. Agora a tela recarrega no máximo a cada 15 s (os
  // avisos no meio do intervalo viram uma busca só, no fim dele) e nada é
  // buscado com a aba em segundo plano — ao voltar, o aoVivo já avisa.
  const ultimaAoVivo = useRef(0);
  const pendente = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // A carga inicial conta como recente: o aviso que o canal dá ao conectar
    // não dispara uma segunda busca logo depois da primeira.
    ultimaAoVivo.current = Date.now();
    const recarregar = () => {
      pendente.current = null;
      ultimaAoVivo.current = Date.now();
      silenciosa.current = true;
      setVersaoAoVivo((v) => v + 1);
    };
    const parar = aoMudarBanco(() => {
      if (document.visibilityState === 'hidden' || pendente.current) return;
      const espera = ultimaAoVivo.current + INTERVALO_AO_VIVO_MS - Date.now();
      if (espera <= 0) recarregar();
      else pendente.current = setTimeout(recarregar, espera);
    });
    return () => {
      parar();
      if (pendente.current) clearTimeout(pendente.current);
    };
  }, []);

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
