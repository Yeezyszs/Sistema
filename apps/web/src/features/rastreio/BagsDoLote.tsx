// Bags do lote: nº, horário de saída do ensaque, peso e lacre. O horário é o
// que liga cada bag à carga de mandioca (ver origemDosBags). Dá para lançar
// bag a bag ou gerar a sequência inteira a partir do início e fim da produção.
import { useState, type FormEvent } from 'react';
import { listBagsDoLote, criarBags, excluirBag, excluirBagsDoLote, getRecebimentosDoLote, listRecebimentosPeriodo } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarQuantidade } from '../../lib/format';
import {
  distribuirBags, juntarDataHora, origemDosBags, faixasDeBags, ATRASO_ENSAQUE_MIN, RENDIMENTO_ESTIMADO,
} from '@sistema/domain';
import type { Lote, LoteBag, Recebimento, CargaParaRastreio } from '@sistema/domain';
import { Card, Button, Field, TextInput, Spinner } from '../../components/ui';
import { useToast } from '../../components/Toast';

export type CargaRastreio = CargaParaRastreio & { recebimento: Recebimento };

function diaAnterior(dia: string): string {
  const d = new Date(`${dia}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Cargas candidatas: as ligadas ao lote pelo consumo de MP; se não houver,
 *  as descarregadas no dia da produção e no anterior (turno da noite). */
export async function cargasDoLote(lote: Lote, bags: LoteBag[]): Promise<CargaRastreio[]> {
  let rec = await getRecebimentosDoLote(lote.id);
  if (rec.length === 0) {
    const dia = lote.data_producao ?? bags[0]?.saiu_em.slice(0, 10);
    if (!dia) return [];
    rec = await listRecebimentosPeriodo(diaAnterior(dia), dia);
  }
  return rec
    .filter((r) => r.hora_inicio)
    .map((r) => ({
      id: r.id,
      inicio: juntarDataHora(r.recebido_em, r.hora_inicio!),
      produtor: r.produtor ?? '—',
      quantidade: r.quantidade,
      recebimento: r,
    }));
}

export function hora(iso: string | Date): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function BagsDoLote({ lote }: { lote: Lote }) {
  const [versao, setVersao] = useState(0);
  const [atraso, setAtraso] = useState(String(ATRASO_ENSAQUE_MIN));
  const [rendimento, setRendimento] = useState(String(RENDIMENTO_ESTIMADO * 100));
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  const { data, loading, error } = useAsync(async () => {
    const bags = await listBagsDoLote(lote.id);
    const cargas = await cargasDoLote(lote, bags);
    return { bags, cargas };
  }, [lote.id, versao]);

  const rec = () => setVersao((v) => v + 1);
  const dia = lote.data_producao ?? new Date().toISOString().slice(0, 10);

  async function gerar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const qtd = Number(f.get('qtd') ?? 0);
    const ini = String(f.get('inicio') ?? ''); const fim = String(f.get('fim') ?? '');
    const data_ = String(f.get('data') ?? dia);
    if (!qtd || !ini || !fim) { erro('Informe quantidade de bags, início e fim da produção.'); return; }
    const inicio = juntarDataHora(data_, ini);
    let fimD = juntarDataHora(data_, fim);
    // Produção que vira a meia-noite.
    if (fimD < inicio) fimD = new Date(fimD.getTime() + 86_400_000);
    const peso = String(f.get('peso') ?? '').trim();
    const primeiro = (data?.bags.at(-1)?.numero ?? 0) + 1;
    setSalvando(true);
    try {
      await criarBags(distribuirBags(inicio, fimD, qtd, primeiro).map((b) => ({
        lote_id: lote.id, numero: b.numero, saiu_em: b.saiu_em.toISOString(), peso_kg: peso ? Number(peso) : null,
      })));
      sucesso(`${qtd} bags lançados (nº ${primeiro} a ${primeiro + qtd - 1}).`);
      (e.target as HTMLFormElement).reset();
      rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  async function lancarUm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const h = String(f.get('hora') ?? '');
    if (!h) { erro('Informe o horário de saída do bag.'); return; }
    const numero = Number(f.get('numero') || (data?.bags.at(-1)?.numero ?? 0) + 1);
    const peso = String(f.get('peso') ?? '').trim();
    try {
      await criarBags([{
        lote_id: lote.id, numero, saiu_em: juntarDataHora(String(f.get('data') ?? dia), h).toISOString(),
        peso_kg: peso ? Number(peso) : null, lacre: String(f.get('lacre') ?? '').trim() || null,
      }]);
      (e.target as HTMLFormElement).reset();
      rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  async function limpar() {
    if (!window.confirm('Apagar todos os bags lançados deste lote?')) return;
    try { await excluirBagsDoLote(lote.id); rec(); } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  const origem = data
    ? origemDosBags(data.bags, data.cargas, Number(atraso) || 0, (Number(rendimento) || 0) / 100)
    : null;

  return (
    <Card className="p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Bags do lote e origem da matéria-prima</h2>
        {data && data.bags.length > 0 && (
          <button type="button" onClick={() => void limpar()} className="text-xs font-medium text-slate-400 hover:text-red-600">
            Apagar bags
          </button>
        )}
      </div>

      {loading && <Spinner className="h-5 w-5 text-brand-600" />}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && (
        <div className="space-y-4">
          {data.bags.length === 0 ? (
            <form onSubmit={gerar} className="space-y-2 rounded-lg border border-slate-200 p-3">
              <p className="text-[12.5px] text-slate-600">
                Lance a produção do lote: os bags são distribuídos entre o primeiro e o último horário.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <Field label="Data"><TextInput name="data" type="date" defaultValue={dia} /></Field>
                <Field label="Nº de bags"><TextInput name="qtd" type="number" min="1" placeholder="24" /></Field>
                <Field label="1º bag saiu"><TextInput name="inicio" type="time" /></Field>
                <Field label="Último bag saiu"><TextInput name="fim" type="time" /></Field>
                <Field label="Peso/bag (kg)"><TextInput name="peso" type="number" step="any" placeholder="750" /></Field>
              </div>
              <Button type="submit" loading={salvando}>Gerar bags</Button>
            </form>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3 text-[12.5px]">
                <span className="text-slate-600">
                  {data.bags.length} bags · {hora(data.bags[0]!.saiu_em)} → {hora(data.bags.at(-1)!.saiu_em)}
                </span>
                <label className="flex items-center gap-1.5 text-slate-500">
                  Atraso até o ensaque
                  <input type="number" value={atraso} onChange={(e) => setAtraso(e.target.value)}
                    className="w-16 rounded border border-slate-300 px-1.5 py-0.5 text-right" /> min
                </label>
                <label className="flex items-center gap-1.5 text-slate-500">
                  Rendimento
                  <input type="number" value={rendimento} onChange={(e) => setRendimento(e.target.value)}
                    className="w-14 rounded border border-slate-300 px-1.5 py-0.5 text-right" /> %
                </label>
              </div>
              <TabelaOrigem origem={origem!} />
              <details className="text-[12.5px]">
                <summary className="cursor-pointer font-medium text-slate-600">Ver / lançar bags individualmente</summary>
                <form onSubmit={lancarUm} className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-6">
                  <TextInput name="numero" type="number" placeholder="Nº" />
                  <TextInput name="data" type="date" defaultValue={dia} />
                  <TextInput name="hora" type="time" />
                  <TextInput name="peso" type="number" step="any" placeholder="kg" />
                  <TextInput name="lacre" placeholder="Lacre" />
                  <Button type="submit">Lançar</Button>
                </form>
                <ul className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-4">
                  {data.bags.map((b) => (
                    <li key={b.id} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
                      <span>nº {b.numero} · {hora(b.saiu_em)}{b.peso_kg ? ` · ${b.peso_kg} kg` : ''}</span>
                      <button type="button" aria-label={`Excluir bag ${b.numero}`} onClick={() => void excluirBag(b.id).then(rec)}
                        className="text-slate-400 hover:text-red-600">×</button>
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

export function TabelaOrigem({ origem }: { origem: ReturnType<typeof origemDosBags<CargaRastreio>> }) {
  if (origem.origens.length === 0) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
        Nenhuma carga com horário de descarga encontrada para este lote. Confira a Chegada da carga
        (início da descarga) do dia da produção.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <th className="px-2 py-2">Produtor</th>
            <th className="px-2 py-2">Variedade</th>
            <th className="px-2 py-2">Descarga</th>
            <th className="px-2 py-2">Bags</th>
            <th className="px-2 py-2 text-right">kg bags</th>
            <th className="px-2 py-2 text-right">kg esperado</th>
            <th className="hidden px-2 py-2 sm:table-cell">Ticket</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {origem.origens.map((o) => (
            <tr key={o.carga.id}>
              <td className="px-2 py-1.5 font-medium text-slate-800">{o.carga.produtor}</td>
              <td className="px-2 py-1.5 text-slate-600">{o.carga.recebimento.variedade ?? '—'}</td>
              <td className="px-2 py-1.5 text-slate-600">{hora(o.carga.inicio)} <span className="text-slate-400">→ ensaque {hora(o.entraNoEnsaque)}</span></td>
              <td className="px-2 py-1.5 font-semibold text-slate-800">{faixasDeBags(o.bags)}</td>
              <td className="px-2 py-1.5 text-right text-slate-600">{o.kgBags ? formatarQuantidade(o.kgBags) : '—'}</td>
              <td className="px-2 py-1.5 text-right text-slate-500">{o.kgEsperado != null ? formatarQuantidade(o.kgEsperado) : '—'}</td>
              <td className="hidden px-2 py-1.5 text-slate-500 sm:table-cell">{o.carga.recebimento.ticket ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {origem.semOrigem.length > 0 && (
        <p className="mt-2 text-[12px] text-amber-700">
          Bags {faixasDeBags(origem.semOrigem)} saíram antes de qualquer carga do período chegar ao ensaque — confira as descargas do dia anterior.
        </p>
      )}
    </div>
  );
}
