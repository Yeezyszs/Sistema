import { useState, type FormEvent } from 'react';
import {
  listPontosAmostragem, criarPontoAmostragem,
  listMonitoramentoAmbiental, criarMonitoramentoAmbiental, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, hojeLocalISO } from '../../lib/format';
import { MATRIZ_AMBIENTAL, MATRIZ_AMBIENTAL_LABEL, situacaoEnvio, SITUACAO_ENVIO_LABEL } from '@sistema/domain';
import type { SituacaoEnvio } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { IconPlus } from '../../components/icons';
import { useToast } from '../../components/Toast';

const SIT_CLASS: Record<SituacaoEnvio, string> = {
  em_dia: 'bg-brand-100 text-brand-700', a_vencer: 'bg-amber-100 text-amber-700',
  em_atraso: 'bg-red-100 text-red-700', sem_previsao: 'bg-slate-100 text-slate-500',
};

export function AmbientalPage() {
  const [aba, setAba] = useState<'monitoramentos' | 'pontos'>('monitoramentos');
  const [recarregar, setRecarregar] = useState(0);
  const [modalPonto, setModalPonto] = useState(false);
  const [modalMon, setModalMon] = useState(false);
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(async () => {
    const [pontos, monitoramentos] = await Promise.all([listPontosAmostragem(), listMonitoramentoAmbiental()]);
    return { pontos, pontosMap: mapBy(pontos, 'id'), monitoramentos };
  }, [recarregar]);

  const rec = () => setRecarregar((n) => n + 1);

  async function onCriarPonto(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const area = String(f.get('area') ?? '').trim();
    if (!area) return;
    try {
      await criarPontoAmostragem({
        area,
        patogeno: String(f.get('patogeno') ?? '').trim() || null,
        ponto_numero: String(f.get('ponto_numero') ?? '').trim() || null,
        zona: String(f.get('zona') ?? '').trim() || null,
        frequencia: String(f.get('frequencia') ?? '').trim() || null,
        descricao: String(f.get('descricao') ?? '').trim() || null,
      });
      sucesso('Ponto de amostragem criado.'); setModalPonto(false); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  async function onCriarMon(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const ponto_id = String(f.get('ponto_id') ?? '');
    if (!ponto_id) return;
    try {
      await criarMonitoramentoAmbiental({
        ponto_id,
        matriz: String(f.get('matriz') ?? 'superficie') as never,
        ensaio: String(f.get('ensaio') ?? '').trim() || null,
        enviado_em: String(f.get('enviado_em') ?? '').trim() || undefined,
        proxima_em: String(f.get('proxima_em') ?? '').trim() || null,
        resultado: String(f.get('resultado') ?? '').trim() || null,
        limite: String(f.get('limite') ?? '').trim() || null,
        conforme: String(f.get('conforme') ?? 'sim') === 'sim',
      });
      sucesso('Resultado registrado.'); setModalMon(false); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  return (
    <>
      <PageHeader
        title="Ambiental & Pragas"
        subtitle="Monitoramento microbiológico por ponto/zona de higiene"
        action={
          <Button onClick={() => (aba === 'monitoramentos' ? setModalMon(true) : setModalPonto(true))}>
            <IconPlus width={16} height={16} />{aba === 'monitoramentos' ? 'Registrar resultado' : 'Novo ponto'}
          </Button>
        }
      />

      <div className="mb-5 flex gap-2">
        {([['monitoramentos', 'Resultados'], ['pontos', 'Pontos de amostragem']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${aba === id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}

      {data && aba === 'pontos' && (
        data.pontos.length === 0 ? (
          <EmptyState title="Nenhum ponto de amostragem" description='Cadastre os pontos do plano ambiental.' />
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Área</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">Ponto</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">Patógeno</th>
                  <th className="px-5 py-3 font-medium">Zona</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">Frequência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.pontos.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{p.area}</td>
                    <td className="hidden px-5 py-3 text-slate-500 sm:table-cell">{p.ponto_numero ?? '—'}</td>
                    <td className="hidden px-5 py-3 text-slate-500 md:table-cell">{p.patogeno ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{p.zona ?? '—'}</td>
                    <td className="hidden px-5 py-3 text-slate-500 md:table-cell">{p.frequencia ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}

      {data && aba === 'monitoramentos' && (
        data.monitoramentos.length === 0 ? (
          <EmptyState title="Nenhum resultado" description="Registre os resultados das coletas." />
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Ponto / área</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">Ensaio</th>
                  <th className="px-5 py-3 font-medium">Resultado</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">Próxima coleta</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.monitoramentos.map((m) => {
                  const ponto = data.pontosMap.get(m.ponto_id);
                  const sit = situacaoEnvio(m.proxima_em);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-700">{ponto?.area ?? '—'}{ponto?.ponto_numero ? ` (${ponto.ponto_numero})` : ''}</td>
                      <td className="hidden px-5 py-3 text-slate-500 sm:table-cell">{m.ensaio ?? MATRIZ_AMBIENTAL_LABEL[m.matriz]}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold ${m.conforme ? 'text-brand-600' : 'text-red-600'}`}>
                          {m.conforme ? 'Conforme' : 'Não conforme'}
                        </span>
                        {m.resultado && <span className="ml-2 text-xs text-slate-400">{m.resultado}</span>}
                      </td>
                      <td className="hidden px-5 py-3 text-slate-500 md:table-cell">{m.proxima_em ? formatarData(m.proxima_em) : '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SIT_CLASS[sit]}`}>{SITUACAO_ENVIO_LABEL[sit]}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )
      )}

      <Modal open={modalPonto} onClose={() => setModalPonto(false)} title="Novo ponto de amostragem" size="lg">
        <form onSubmit={onCriarPonto} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Área"><TextInput name="area" required placeholder="Sala de ensaque" /></Field>
            <Field label="Ponto (nº)"><TextInput name="ponto_numero" placeholder="P-01" /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Patógeno"><TextInput name="patogeno" placeholder="Salmonella" /></Field>
            <Field label="Zona"><TextInput name="zona" placeholder="1 / 2 / 3" /></Field>
            <Field label="Frequência"><TextInput name="frequencia" placeholder="Semestral" /></Field>
          </div>
          <Field label="Descrição"><TextInput name="descricao" placeholder="Descrição do ponto" /></Field>
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setModalPonto(false)}>Cancelar</Button><Button type="submit">Criar ponto</Button></div>
        </form>
      </Modal>

      <Modal open={modalMon} onClose={() => setModalMon(false)} title="Registrar resultado" size="lg">
        <form onSubmit={onCriarMon} className="space-y-4">
          <Field label="Ponto de amostragem">
            <Select name="ponto_id" defaultValue="" required>
              <option value="" disabled>Selecione…</option>
              {(data?.pontos ?? []).map((p) => <option key={p.id} value={p.id}>{p.area}{p.ponto_numero ? ` (${p.ponto_numero})` : ''}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Matriz"><Select name="matriz" defaultValue="superficie">{MATRIZ_AMBIENTAL.map((m) => <option key={m} value={m}>{MATRIZ_AMBIENTAL_LABEL[m]}</option>)}</Select></Field>
            <Field label="Enviado em"><TextInput name="enviado_em" type="date" defaultValue={hojeLocalISO()} /></Field>
            <Field label="Próxima coleta"><TextInput name="proxima_em" type="date" /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Ensaio"><TextInput name="ensaio" placeholder="Enterobactérias" /></Field>
            <Field label="Resultado"><TextInput name="resultado" placeholder="Ausente / <10 UFC" /></Field>
            <Field label="Limite"><TextInput name="limite" placeholder="Ausência" /></Field>
          </div>
          <Field label="Situação"><Select name="conforme" defaultValue="sim"><option value="sim">Conforme</option><option value="nao">Não conforme</option></Select></Field>
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setModalMon(false)}>Cancelar</Button><Button type="submit">Registrar</Button></div>
        </form>
      </Modal>
    </>
  );
}
