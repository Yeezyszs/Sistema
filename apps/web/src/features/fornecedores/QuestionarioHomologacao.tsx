// Questionário de homologação do produtor (FOR POP 07 1.1): preencher na
// visita e consultar depois. O status sai das respostas — completo e sem NC é
// qualificado; com NC fica em análise até a Qualidade decidir.
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { criarHomologacao, enviarQuestionarioAssinado, urlAssinadaDocumento } from '../../lib/db';
import { hojeLocalISO, formatarData } from '../../lib/format';
import {
  blocosAplicaveis, resumoHomologacao, statusSugeridoHomologacao,
  AGROTOXICOS_PERMITIDOS, DECLARACAO_AGROTOXICOS,
  STATUS_HOMOLOGACAO, STATUS_HOMOLOGACAO_LABEL,
} from '@sistema/domain';
import type { Homologacao, RespostasHomologacao, RespostaHomologacao, StatusHomologacao, DadosHomologacao } from '@sistema/domain';
import { Button, Field, TextInput, Select } from '../../components/ui';
import { useToast } from '../../components/Toast';

const ROTULO: Record<RespostaHomologacao, string> = { c: 'Conforme', nc: 'Não conforme', na: 'N/A' };
const COR_ATIVA: Record<RespostaHomologacao, string> = {
  c: 'border-emerald-600 bg-emerald-600 text-white',
  nc: 'border-red-600 bg-red-600 text-white',
  na: 'border-slate-500 bg-slate-500 text-white',
};

function umAnoDepois(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function FormQuestionarioHomologacao({ fornecedores, fornecedorInicial, onClose, onSaved }: {
  fornecedores: { id: string; razao_social: string }[];
  fornecedorInicial?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [organico, setOrganico] = useState(false);
  const [respostas, setRespostas] = useState<RespostasHomologacao>({});
  const [citacoes, setCitacoes] = useState<Record<string, string>>({});
  const [agro, setAgro] = useState<string[]>([]);
  const [dataAval, setDataAval] = useState(hojeLocalISO());
  const [statusManual, setStatusManual] = useState<StatusHomologacao | ''>('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  const resumo = resumoHomologacao(respostas, organico);
  const sugerido = statusSugeridoHomologacao(resumo);
  const status = statusManual || sugerido;

  function responderBloco(itens: { n: number }[], r: RespostaHomologacao) {
    setRespostas((ant) => ({ ...ant, ...Object.fromEntries(itens.map((i) => [String(i.n), r])) }));
  }

  function alternarAgro(nome: string) {
    setAgro((ant) => {
      if (nome === 'Não aplicável') return ant.includes(nome) ? [] : [nome];
      const sem = ant.filter((a) => a !== 'Não aplicável');
      return sem.includes(nome) ? sem.filter((a) => a !== nome) : [...sem, nome];
    });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const fornecedor_id = String(f.get('fornecedor_id') ?? '');
    if (!fornecedor_id) { erro('Selecione o produtor.'); return; }
    if (!resumo.completo) {
      erro(`Faltam ${resumo.total - resumo.respondidos} item(ns) do questionário.`);
      return;
    }
    if (resumo.naoConformes.length > 0 && !String(f.get('observacao') ?? '').trim()) {
      erro('Há itens não conformes: registre a evidência em Observações.');
      return;
    }
    if (agro.length === 0) { erro('Marque os agrotóxicos declarados (ou Não aplicável).'); return; }
    const txt = (k: string) => String(f.get(k) ?? '').trim() || undefined;
    const dados: DadosHomologacao = {
      propriedade: txt('propriedade'), codigo_produtor: txt('codigo_produtor'), localizacao: txt('localizacao'),
      variedades: txt('variedades'), comprador: txt('comprador'), area_cultivada: txt('area_cultivada'),
      tipo_producao: organico ? 'organica' : 'convencional',
    };
    // Respostas do bloco orgânico ficam de fora no convencional.
    const aplicaveis = new Set(blocosAplicaveis(organico).flatMap((b) => b.itens.map((i) => String(i.n))));
    setSalvando(true);
    try {
      const arquivo_path = arquivo ? await enviarQuestionarioAssinado(fornecedor_id, arquivo) : null;
      await criarHomologacao({
        fornecedor_id,
        status,
        pontuacao: resumo.pontuacao,
        classificacao: null,
        validade: txt('validade') ?? null,
        observacao: txt('observacao') ?? null,
        questionario: Object.fromEntries(Object.entries(respostas).filter(([k]) => aplicaveis.has(k))),
        citacoes: Object.fromEntries(Object.entries(citacoes).filter(([k, v]) => aplicaveis.has(k) && v.trim())),
        dados,
        agrotoxicos: agro,
        arquivo_path,
        arquivo_nome: arquivo?.name ?? null,
        avaliado_em: new Date(`${dataAval}T12:00:00`).toISOString(),
      });
      sucesso(status === 'qualificado' ? 'Homologação registrada — produtor homologado.' : 'Homologação registrada.');
      onSaved(); onClose();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha ao salvar.'); }
    finally { setSalvando(false); }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Cabeçalho */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Produtor">
          <Select name="fornecedor_id" defaultValue={fornecedorInicial ?? ''} required>
            <option value="" disabled>Selecione…</option>
            {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.razao_social}</option>)}
          </Select>
        </Field>
        <Field label="Propriedade"><TextInput name="propriedade" /></Field>
        <Field label="Código do produtor"><TextInput name="codigo_produtor" /></Field>
        <Field label="Localização"><TextInput name="localizacao" placeholder="Município / coordenadas" /></Field>
        <Field label="Variedades cultivadas"><TextInput name="variedades" placeholder="Paraguaia, Olho Junto" /></Field>
        <Field label="Comprador"><TextInput name="comprador" /></Field>
        <Field label="Área cultivada"><TextInput name="area_cultivada" placeholder="ex.: 12 alqueires" /></Field>
        <Field label="Tipo de produção">
          <Select value={organico ? 'organica' : 'convencional'} onChange={(e) => setOrganico(e.target.value === 'organica')}>
            <option value="convencional">Convencional</option>
            <option value="organica">Orgânica</option>
          </Select>
        </Field>
        <Field label="Data da avaliação">
          <TextInput type="date" value={dataAval} onChange={(e) => setDataAval(e.target.value)} />
        </Field>
        <Field label="Validade da homologação">
          <TextInput key={dataAval} name="validade" type="date" defaultValue={umAnoDepois(dataAval)} />
        </Field>
      </div>

      {/* Blocos */}
      {blocosAplicaveis(organico).map((bloco) => (
        <div key={bloco.titulo} className="rounded-lg border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-[12px] font-bold uppercase tracking-wide text-slate-600">{bloco.titulo}</p>
            <span className="flex gap-1">
              {(['c', 'na'] as const).map((r) => (
                <button key={r} type="button" onClick={() => responderBloco(bloco.itens, r)}
                  className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10.5px] font-semibold text-slate-500 hover:bg-slate-100">
                  Tudo {ROTULO[r]}
                </button>
              ))}
            </span>
          </div>
          <ul className="divide-y divide-slate-100 px-3">
            {bloco.itens.map((item) => {
              const atual = respostas[String(item.n)];
              return (
                <li key={item.n} className="py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-[12rem] flex-1 break-words text-[12.5px] text-slate-700">{item.n}. {item.texto}</span>
                    <span className="flex shrink-0 gap-1">
                      {(['c', 'nc', 'na'] as const).map((r) => (
                        <button key={r} type="button" aria-pressed={atual === r}
                          onClick={() => setRespostas((ant) => ({ ...ant, [String(item.n)]: r }))}
                          className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition ${
                            atual === r ? COR_ATIVA[r] : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                          }`}>
                          {ROTULO[r]}
                        </button>
                      ))}
                    </span>
                  </div>
                  {item.citar && (
                    <div className="mt-1.5">
                      <TextInput placeholder={`${item.citar}…`} value={citacoes[String(item.n)] ?? ''}
                        onChange={(e) => setCitacoes((c) => ({ ...c, [String(item.n)]: e.target.value }))} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {/* Declaração */}
      <div className="rounded-lg border border-slate-200 p-3">
        <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-600">Declaração — agrotóxicos permitidos</p>
        <div className="flex flex-wrap gap-1.5">
          {[...AGROTOXICOS_PERMITIDOS, 'Não aplicável'].map((a) => {
            const ativo = agro.includes(a);
            return (
              <button key={a} type="button" aria-pressed={ativo} onClick={() => alternarAgro(a)}
                className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition ${
                  ativo ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}>
                {a}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{DECLARACAO_AGROTOXICOS}</p>
      </div>

      <Field label={resumo.naoConformes.length > 0 ? 'Observações / evidências (obrigatório)' : 'Observações / evidências'}>
        <textarea name="observacao" rows={2}
          className="w-full rounded-[7px] border border-slate-300 px-3 py-2 text-[12.5px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
      </Field>

      <Field label="Questionário assinado (foto ou PDF)">
        <input type="file" accept="image/*,application/pdf" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          className="block w-full text-[12.5px] text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700" />
      </Field>

      {/* Resultado */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm">
        <span className="text-slate-600">
          {resumo.respondidos}/{resumo.total} respondidos
          {resumo.pontuacao != null && <> · <span className="font-semibold text-slate-900">{resumo.pontuacao}%</span> conforme</>}
          {resumo.naoConformes.length > 0 && <span className="text-red-700"> · NC nos itens {resumo.naoConformes.join(', ')}</span>}
        </span>
        <Select value={status} onChange={(e) => setStatusManual(e.target.value as StatusHomologacao)}>
          {STATUS_HOMOLOGACAO.map((s) => (
            <option key={s} value={s} disabled={s === 'qualificado' && sugerido !== 'qualificado'}>
              {STATUS_HOMOLOGACAO_LABEL[s]}{s === sugerido ? ' (sugerido)' : ''}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" loading={salvando}>Registrar homologação</Button>
      </div>
    </form>
  );
}

// ── Consulta ───────────────────────────────────────────────────
export function VerQuestionarioHomologacao({ h }: { h: Homologacao }) {
  const { erro } = useToast();
  const organico = h.dados?.tipo_producao === 'organica';
  const resp = h.questionario ?? {};
  const resumo = resumoHomologacao(resp, organico);
  const d = h.dados ?? {};

  async function abrirArquivo() {
    if (!h.arquivo_path) return;
    try { window.open(await urlAssinadaDocumento(h.arquivo_path, 'fornecedores'), '_blank', 'noopener'); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha ao abrir.'); }
  }

  return (
    <div className="space-y-4 text-[12.5px]">
      <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {([
          ['Avaliado em', formatarData(h.avaliado_em)], ['Validade', h.validade ? formatarData(h.validade) : '—'],
          ['Propriedade', d.propriedade], ['Código do produtor', d.codigo_produtor], ['Localização', d.localizacao],
          ['Variedades', d.variedades], ['Comprador', d.comprador], ['Área cultivada', d.area_cultivada],
          ['Tipo de produção', organico ? 'Orgânica' : 'Convencional'],
          ['Resultado', `${resumo.pontuacao ?? '—'}% conforme · ${STATUS_HOMOLOGACAO_LABEL[h.status]}`],
        ] as const).map(([t, v]) => (
          <div key={t} className="flex gap-2"><dt className="w-32 shrink-0 text-slate-400">{t}</dt><dd className="text-slate-800">{v || '—'}</dd></div>
        ))}
      </dl>
      {blocosAplicaveis(organico).map((b) => (
        <div key={b.titulo}>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{b.titulo}</p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {b.itens.map((i) => {
              const r = resp[String(i.n)];
              const cit = h.citacoes?.[String(i.n)];
              return (
                <li key={i.n} className="flex items-start justify-between gap-3 px-3 py-1.5">
                  <span className="text-slate-700">{i.n}. {i.texto}{cit && <span className="block text-slate-500">→ {cit}</span>}</span>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10.5px] font-semibold ${
                    r === 'nc' ? 'bg-red-100 text-red-700' : r === 'c' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>{r ? ROTULO[r] : '—'}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p><span className="text-slate-400">Agrotóxicos declarados: </span>{h.agrotoxicos?.join(', ') || '—'}</p>
      {h.observacao && <p><span className="text-slate-400">Observações: </span>{h.observacao}</p>}
      <Link to={`/imprimir/homologacao/${h.id}`} className="mr-4 font-semibold text-brand-700 hover:underline">Imprimir questionário</Link>
      {h.arquivo_path && (
        <button type="button" onClick={() => void abrirArquivo()} className="font-semibold text-brand-700 hover:underline">
          Abrir questionário assinado ({h.arquivo_nome ?? 'arquivo'})
        </button>
      )}
    </div>
  );
}
