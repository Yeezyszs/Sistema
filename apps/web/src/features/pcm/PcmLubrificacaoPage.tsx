import { useMemo, useState, type FormEvent } from 'react';
import {
  listLubrificacaoPcm, listLuExecucoes, listColaboradoresPcm, criarLuExecucao,
  criarPontoLubrificacao, atualizarPontoLubrificacao, excluirPontoLubrificacao,
} from '../../lib/db';
import type { CamposPontoLubrificacao } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, hojeLocalISO } from '../../lib/format';
import {
  situacaoLubrificacao, lubrificacaoPedeAcao, compararUrgenciaLubrificacao,
  SITUACAO_LUBRIFICACAO_LABEL, SITUACAO_LUBRIFICACAO_TOM, frequenciaEmDias, janelaDeAviso,
} from '@sistema/domain';
import type {
  LubrificacaoPcm, LuExecucao, ColaboradorPcm, SituacaoLubrificacao, SituacaoPonto,
} from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal, ErroCarregamento } from '../../components/ui';
import { IconSearch, IconPlus } from '../../components/icons';
import { useToast } from '../../components/Toast';

export function PcmLubrificacaoPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [executando, setExecutando] = useState<LubrificacaoPcm | null>(null);
  // `null` = fechado; `'novo'` = cadastro; um ponto = edição.
  const [editando, setEditando] = useState<LubrificacaoPcm | 'novo' | null>(null);
  const [excluindo, setExcluindo] = useState<LubrificacaoPcm | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroSit, setFiltroSit] = useState<'todas' | 'pendentes' | SituacaoLubrificacao>('pendentes');
  const { sucesso, erro } = useToast();

  const { data, loading, error } = useAsync(async () => {
    const [pontos, execucoes, colaboradores] = await Promise.all([
      listLubrificacaoPcm(), listLuExecucoes(), listColaboradoresPcm(),
    ]);
    return { pontos, execucoes, colaboradores };
  }, [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  // Última execução por ponto (setor|equip|item).
  const ultimaExec = useMemo(() => {
    const m = new Map<string, LuExecucao>();
    for (const e of data?.execucoes ?? []) {
      const k = `${e.setor}|${e.equip}|${e.item}`;
      const prev = m.get(k);
      if (!prev || e.data > prev.data) m.set(k, e);
    }
    return m;
  }, [data?.execucoes]);

  const hoje = hojeLocalISO();

  function avaliar(p: LubrificacaoPcm): { ultima: LuExecucao | null; s: SituacaoPonto } {
    const ultima = ultimaExec.get(`${p.setor}|${p.equip}|${p.item}`) ?? null;
    return { ultima, s: situacaoLubrificacao(ultima?.data ?? null, p.frequencia, hoje) };
  }

  const todos = (data?.pontos ?? []).map((p) => ({ p, ...avaliar(p) }));
  const linhas = todos
    .filter(({ p, s }) => {
      if (filtroSit === 'pendentes' && !lubrificacaoPedeAcao(s.situacao)) return false;
      if (filtroSit !== 'todas' && filtroSit !== 'pendentes' && s.situacao !== filtroSit) return false;
      if (!busca.trim()) return true;
      const q = busca.toLowerCase();
      return [p.setor, p.equip, p.item, p.lubrificante].some((v) => (v ?? '').toLowerCase().includes(q));
    })
    // O que já venceu primeiro, e dentro disso o mais atrasado.
    .sort((a, b) => compararUrgenciaLubrificacao(a.s, b.s));

  const vencidas = todos.filter((x) => x.s.situacao === 'vencida').length;
  const vencendo = todos.filter((x) => x.s.situacao === 'vencendo').length;

  return (
    <>
      <PageHeader grupo="Manutenção"
        title="Lubrificação"
        subtitle={`Rota de lubrificação — ${vencidas} vencida(s) e ${vencendo} vencendo`}
        action={
          <Button onClick={() => setEditando('novo')}>
            <IconPlus width={16} height={16} />
            Novo ponto
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" placeholder="Buscar setor, equipamento, item, lubrificante…" value={busca} onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-[7px] border border-slate-300 bg-white py-2 pl-9 pr-3 text-[12.5px] outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </div>
        <div className="w-44">
          <Select value={filtroSit} onChange={(e) => setFiltroSit(e.target.value as typeof filtroSit)}>
            <option value="pendentes">A lubrificar</option>
            <option value="todas">Todas</option>
            <option value="vencida">Vencidas</option>
            <option value="vencendo">Vencendo</option>
            <option value="sem_registro">Sem registro</option>
            <option value="em_dia">Em dia</option>
          </Select>
        </div>
      </div>

      {error && <ErroCarregamento mensagem={error} />}
      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}
      {data && linhas.length === 0 && <EmptyState title="Nenhum ponto" description="Ajuste a busca ou o filtro." />}

      {data && linhas.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11.5px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-[11px]">Setor</th>
                <th className="px-3 py-[11px]">Equipamento</th>
                <th className="px-3 py-[11px]">Item</th>
                <th className="hidden px-3 py-[11px] md:table-cell">Lubrificante</th>
                <th className="hidden px-3 py-[11px] lg:table-cell">Bombadas</th>
                <th className="px-3 py-[11px]">Frequência</th>
                <th className="px-3 py-[11px]">Última</th>
                <th className="px-3 py-[11px]">Próxima</th>
                <th className="px-3 py-[11px]">Situação</th>
                <th className="px-3 py-[11px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map(({ p, s, ultima }) => (
                <tr key={p.id} className={`hover:bg-slate-50 ${
                  s.situacao === 'vencida' ? 'bg-red-50/40' : s.situacao === 'vencendo' ? 'bg-amber-50/40' : ''
                }`}>
                  <td className="px-3 py-2.5 text-slate-500">{p.setor ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-700"><span className="line-clamp-1">{p.equip ?? '—'}</span></td>
                  <td className="px-3 py-2.5 text-slate-600">{p.item ?? '—'}</td>
                  <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">{p.lubrificante || '—'}</td>
                  <td className="hidden px-3 py-2.5 text-slate-500 lg:table-cell">{p.bombadas || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-500">{p.frequencia ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-500">{ultima ? formatarData(ultima.data) : '—'}</td>
                  <td className="px-3 py-2.5 text-slate-500">
                    {s.proxima ? formatarData(s.proxima) : '—'}
                    {s.diasRestantes != null && (
                      <span className="block text-[11px] text-slate-400">
                        {s.diasRestantes < 0 ? `${Math.abs(s.diasRestantes)} d de atraso`
                          : s.diasRestantes === 0 ? 'hoje'
                          : `em ${s.diasRestantes} d`}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SITUACAO_LUBRIFICACAO_TOM[s.situacao]}`}>
                      {SITUACAO_LUBRIFICACAO_LABEL[s.situacao]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => setExecutando(p)} className="text-xs font-semibold text-brand-600 hover:text-brand-700">Lubrificar</button>
                    <button onClick={() => setEditando(p)} className="ml-3 text-xs font-medium text-slate-500 hover:text-slate-800">Editar</button>
                    <button onClick={() => setExcluindo(p)} className="ml-3 text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {executando && (
        <ModalExecutar ponto={executando} colaboradores={data?.colaboradores ?? []}
          onClose={() => setExecutando(null)} onSaved={() => { setExecutando(null); rec(); }} sucesso={sucesso} erro={erro} />
      )}

      {editando && (
        <ModalPonto
          ponto={editando === 'novo' ? null : editando}
          pontos={data?.pontos ?? []}
          onClose={() => setEditando(null)}
          onSaved={() => { setEditando(null); rec(); }}
          sucesso={sucesso} erro={erro}
        />
      )}

      {excluindo && (
        <ModalExcluir ponto={excluindo}
          execucoes={(data?.execucoes ?? []).filter((e) =>
            mesmoTexto(e.setor, excluindo.setor) && mesmoTexto(e.equip, excluindo.equip) && mesmoTexto(e.item, excluindo.item)).length}
          onClose={() => setExcluindo(null)}
          onDone={() => { setExcluindo(null); rec(); }}
          sucesso={sucesso} erro={erro} />
      )}
    </>
  );
}

function ModalExecutar({ ponto, colaboradores, onClose, onSaved, sucesso, erro }: {
  ponto: LubrificacaoPcm; colaboradores: ColaboradorPcm[];
  onClose: () => void; onSaved: () => void;
  sucesso: (m: string) => void; erro: (m: string) => void;
}) {
  const [salvando, setSalvando] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSalvando(true);
    try {
      await criarLuExecucao({
        setor: ponto.setor,
        equip: ponto.equip,
        item: ponto.item,
        data: String(f.get('data') ?? hojeLocalISO()),
        exec: String(f.get('exec') ?? '').trim() || null,
        obs: String(f.get('obs') ?? '').trim() || null,
      });
      sucesso('Lubrificação registrada.'); onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }
  return (
    <Modal open onClose={onClose} title="Registrar lubrificação">
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {ponto.setor} · {ponto.equip} · {ponto.item}
          {ponto.lubrificante && <> — {ponto.lubrificante}{ponto.bombadas ? ` (${ponto.bombadas})` : ''}</>}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data"><TextInput name="data" type="date" defaultValue={hojeLocalISO()} required /></Field>
          <Field label="Executor">
            <TextInput name="exec" list="colabs-lu" placeholder="Nome" />
            <datalist id="colabs-lu">{colaboradores.map((c) => <option key={c.id} value={c.nome} />)}</datalist>
          </Field>
        </div>
        <Field label="Observação"><TextInput name="obs" placeholder="—" /></Field>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Registrar</Button>
        </div>
      </form>
    </Modal>
  );
}

// Frequências que o sistema sabe converter em prazo. Não é uma lista fechada —
// o campo aceita qualquer texto, mas avisa quando o que foi digitado não vira
// prazo nenhum, que é a diferença entre um ponto controlado e um ponto solto.
const FREQUENCIAS = ['DIÁRIA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL'];

function ModalPonto({ ponto, pontos, onClose, onSaved, sucesso, erro }: {
  ponto: LubrificacaoPcm | null;
  pontos: LubrificacaoPcm[];
  onClose: () => void; onSaved: () => void;
  sucesso: (m: string) => void; erro: (m: string) => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const [frequencia, setFrequencia] = useState(ponto?.frequencia ?? '');
  const dias = frequenciaEmDias(frequencia);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const txt = (k: string) => String(f.get(k) ?? '').trim() || null;
    const campos: CamposPontoLubrificacao = {
      setor: txt('setor'), equip: txt('equip'), item: txt('item'),
      lubrificante: txt('lubrificante'), bombadas: txt('bombadas'), frequencia: txt('frequencia'),
    };
    if (!campos.equip || !campos.item) { erro('Equipamento e item são obrigatórios.'); return; }

    // Dois pontos com a mesma identidade se confundiriam: a execução casa por
    // setor + equipamento + item, então o histórico de um cairia no outro.
    const duplicado = pontos.some((p) =>
      p.id !== ponto?.id &&
      mesmoTexto(p.setor, campos.setor) && mesmoTexto(p.equip, campos.equip) && mesmoTexto(p.item, campos.item));
    if (duplicado) { erro('Já existe um ponto com este setor, equipamento e item.'); return; }

    setSalvando(true);
    try {
      if (ponto) {
        await atualizarPontoLubrificacao(ponto.id, ponto, campos);
        sucesso('Ponto atualizado.');
      } else {
        await criarPontoLubrificacao(campos);
        sucesso('Ponto cadastrado.');
      }
      onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha ao salvar.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={ponto ? 'Editar ponto' : 'Novo ponto de lubrificação'} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Setor">
            <TextInput name="setor" list="setores-lu" defaultValue={ponto?.setor ?? ''} placeholder="ENSAQUE 1" />
            <datalist id="setores-lu">
              {[...new Set(pontos.map((p) => p.setor).filter(Boolean))].map((s) => (
                <option key={s as string} value={s as string} />
              ))}
            </datalist>
          </Field>
          <Field label="Equipamento">
            <TextInput name="equip" defaultValue={ponto?.equip ?? ''} placeholder="MOINHO" required />
          </Field>
          <Field label="Item">
            <TextInput name="item" defaultValue={ponto?.item ?? ''} placeholder="MANCAL ROLAMENTO" required />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Lubrificante">
            <TextInput name="lubrificante" list="lubrificantes-lu" defaultValue={ponto?.lubrificante ?? ''} placeholder="PREMALUBE FG" />
            <datalist id="lubrificantes-lu">
              {[...new Set(pontos.map((p) => p.lubrificante).filter(Boolean))].map((s) => (
                <option key={s as string} value={s as string} />
              ))}
            </datalist>
          </Field>
          <Field label="Bombadas">
            <TextInput name="bombadas" defaultValue={ponto?.bombadas ?? ''} placeholder="3 A 4" />
          </Field>
          <Field label="Frequência">
            <TextInput name="frequencia" list="frequencias-lu" value={frequencia}
              onChange={(e) => setFrequencia(e.target.value)} placeholder="SEMANAL" />
            <datalist id="frequencias-lu">
              {FREQUENCIAS.map((f) => <option key={f} value={f} />)}
            </datalist>
          </Field>
        </div>

        {/* O prazo do painel nasce daqui: vale dizer na hora o que o sistema entendeu. */}
        <p className={`rounded-lg px-3 py-2 text-xs ${
          dias != null ? 'bg-slate-50 text-slate-600' : 'bg-amber-50 text-amber-800'
        }`}>
          {frequencia.trim() === ''
            ? 'Sem frequência, o ponto entra na rota mas não recebe prazo — não aparecerá como vencido nem vencendo.'
            : dias != null
              ? `O sistema entende: lubrificar a cada ${dias} dia(s). O aviso começa ${janelaDeAviso(dias)} dia(s) antes do vencimento.`
              : 'O sistema não reconhece esta frequência, então não calculará prazo para este ponto. Use uma das sugeridas se quiser acompanhamento automático.'}
        </p>

        {ponto && (
          <p className="text-xs text-slate-400">
            Mudar setor, equipamento ou item leva junto as lubrificações já registradas deste ponto.
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>{ponto ? 'Salvar alterações' : 'Cadastrar ponto'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ModalExcluir({ ponto, execucoes, onClose, onDone, sucesso, erro }: {
  ponto: LubrificacaoPcm;
  // Quantas lubrificações já foram lançadas neste ponto — a pessoa merece saber
  // o tamanho do histórico antes de tirar a linha do plano. O número sai da
  // lista que a tela já carregou; não vale uma consulta só para isto.
  execucoes: number;
  onClose: () => void; onDone: () => void;
  sucesso: (m: string) => void; erro: (m: string) => void;
}) {
  const [excluindo, setExcluindo] = useState(false);

  async function excluir() {
    setExcluindo(true);
    try {
      await excluirPontoLubrificacao(ponto.id);
      sucesso('Ponto removido da rota.');
      onDone();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha ao excluir.'); }
    finally { setExcluindo(false); }
  }

  return (
    <Modal open onClose={onClose} title="Excluir ponto da rota">
      <p className="text-sm text-slate-600">
        Remover <span className="font-semibold text-slate-900">
          {[ponto.setor, ponto.equip, ponto.item].filter(Boolean).join(' · ')}
        </span> do plano de lubrificação?
      </p>
      {execucoes > 0 && (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Este ponto tem <span className="font-semibold">{execucoes} lubrificação(ões)</span> registrada(s).
          Elas continuam no histórico — o que sai é a linha do plano, não o registro do que foi feito.
        </p>
      )}
      <div className="mt-5 flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="button" variant="perigo" loading={excluindo} onClick={() => void excluir()}>Excluir</Button>
      </div>
    </Modal>
  );
}

function mesmoTexto(a: string | null, b: string | null): boolean {
  return (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();
}
