import { useMemo, useState, type FormEvent } from 'react';
import {
  listEquipamentosPcm, listComponentesPcm, listPlanosPcm,
  listLubrificacaoPcm, listFerramentasPcm, listColaboradoresPcm,
  criarRegistroPcm, atualizarRegistroPcm, excluirRegistroPcm,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { TIPO_PLANO_PCM_LABEL } from '@sistema/domain';
import type {
  EquipamentoPcm, ComponenteEquipamento, PlanoPcm, LubrificacaoPcm, FerramentaPcm, ColaboradorPcm,
} from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { IconChevronRight, IconSearch, IconPlus } from '../../components/icons';
import { useToast } from '../../components/Toast';

type Aba = 'equipamentos' | 'planos' | 'lubrificacao' | 'ferramentas' | 'colaboradores';
type TabelaPcm = 'equipamentos' | 'equipamento_componentes' | 'planos' | 'lubrificacao' | 'ferramentas' | 'colaboradores';

// ── Modal genérico de registro (novo/editar) ───────────────────
interface CampoSpec {
  nome: string;
  label: string;
  tipo?: 'text' | 'number' | 'select';
  opcoes?: string[]; // para select
  obrigatorio?: boolean;
  placeholder?: string;
}

interface RegistroEmEdicao {
  tabela: TabelaPcm;
  titulo: string;
  campos: CampoSpec[];
  valores: Record<string, unknown>; // valores atuais (vazio = novo)
  id?: string;                       // presente = edição
  extras?: Record<string, unknown>;  // campos fixos (ex.: equipamento_id)
}

function ModalRegistro({ reg, onClose, onSaved }: {
  reg: RegistroEmEdicao; onClose: () => void; onSaved: () => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = { ...(reg.extras ?? {}) };
    for (const c of reg.campos) {
      const v = String(f.get(c.nome) ?? '').trim();
      payload[c.nome] = v === '' ? null : c.tipo === 'number' ? Number(v) : v;
    }
    setSalvando(true);
    try {
      if (reg.id) await atualizarRegistroPcm(reg.tabela, reg.id, payload);
      else await criarRegistroPcm(reg.tabela, payload);
      sucesso('Registro salvo.'); onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={reg.id ? `Editar — ${reg.titulo}` : `Novo — ${reg.titulo}`} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {reg.campos.map((c) => (
            <div key={c.nome}>
              <Field label={c.label}>
                {c.tipo === 'select' ? (
                  <Select name={c.nome} defaultValue={String(reg.valores[c.nome] ?? '')}>
                    <option value="">—</option>
                    {(c.opcoes ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </Select>
                ) : (
                  <TextInput
                    name={c.nome}
                    type={c.tipo === 'number' ? 'number' : 'text'}
                    step={c.tipo === 'number' ? 'any' : undefined}
                    defaultValue={reg.valores[c.nome] != null ? String(reg.valores[c.nome]) : ''}
                    required={c.obrigatorio}
                    placeholder={c.placeholder}
                  />
                )}
              </Field>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}

export function PcmCadastrosPage() {
  const [aba, setAba] = useState<Aba>('equipamentos');
  const [busca, setBusca] = useState('');
  const [filtroSetor, setFiltroSetor] = useState('');
  const [recarregar, setRecarregar] = useState(0);
  const [reg, setReg] = useState<RegistroEmEdicao | null>(null);
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(async () => {
    const [equipamentos, componentes, planos, lubrificacao, ferramentas, colaboradores] = await Promise.all([
      listEquipamentosPcm(), listComponentesPcm(), listPlanosPcm(),
      listLubrificacaoPcm(), listFerramentasPcm(), listColaboradoresPcm(),
    ]);
    return { equipamentos, componentes, planos, lubrificacao, ferramentas, colaboradores };
  }, [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  const setores = useMemo(
    () => [...new Set((data?.equipamentos ?? []).map((e) => e.setor))].sort(),
    [data?.equipamentos],
  );

  async function excluir(tabela: TabelaPcm, id: string) {
    try { await excluirRegistroPcm(tabela, id); sucesso('Registro excluído.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  const q = busca.trim().toLowerCase();

  // Especificações de campos por entidade (modal genérico).
  const specs = {
    equipamentos: (v: Partial<EquipamentoPcm>): RegistroEmEdicao => ({
      tabela: 'equipamentos', titulo: 'Equipamento', id: v.id,
      valores: v as Record<string, unknown>,
      campos: [
        { nome: 'setor', label: 'Setor', obrigatorio: true, placeholder: 'EXTRAÇÃO' },
        { nome: 'nome', label: 'Nome', obrigatorio: true, placeholder: 'Nome do equipamento' },
      ],
    }),
    componente: (equipamentoId: string, v: Partial<ComponenteEquipamento>): RegistroEmEdicao => ({
      tabela: 'equipamento_componentes', titulo: 'Componente', id: v.id,
      valores: v as Record<string, unknown>,
      extras: { equipamento_id: equipamentoId },
      campos: [
        { nome: 'qty', label: 'Qtd', placeholder: '2' },
        { nome: 'nome', label: 'Componente', obrigatorio: true, placeholder: 'MANCAL F 208' },
      ],
    }),
    planos: (v: Partial<PlanoPcm>): RegistroEmEdicao => ({
      tabela: 'planos', titulo: 'Plano', id: v.id,
      valores: v as Record<string, unknown>,
      campos: [
        { nome: 'setor', label: 'Setor' },
        { nome: 'equip', label: 'Equipamento' },
        { nome: 'plano', label: 'Plano', tipo: 'select', opcoes: ['LU', 'PRM', 'IRM'] },
        { nome: 'period', label: 'Periodicidade', placeholder: '30 dias' },
        { nome: 'item', label: 'Item', obrigatorio: true, placeholder: 'Trocar correias' },
        { nome: 'qty', label: 'Qtd', tipo: 'number' },
      ],
    }),
    lubrificacao: (v: Partial<LubrificacaoPcm>): RegistroEmEdicao => ({
      tabela: 'lubrificacao', titulo: 'Ponto de lubrificação', id: v.id,
      valores: v as Record<string, unknown>,
      campos: [
        { nome: 'setor', label: 'Setor' },
        { nome: 'equip', label: 'Equipamento', obrigatorio: true },
        { nome: 'item', label: 'Item', obrigatorio: true, placeholder: 'MANCAL ROLAMENTO' },
        { nome: 'lubrificante', label: 'Lubrificante', placeholder: 'PREMALUBE FG' },
        { nome: 'bombadas', label: 'Bombadas', placeholder: '3 A 4' },
        { nome: 'frequencia', label: 'Frequência', tipo: 'select', opcoes: ['SEMANAL', 'QUINZENAL', 'MENSAL', 'TRIMESTRAL'] },
      ],
    }),
    ferramentas: (v: Partial<FerramentaPcm>): RegistroEmEdicao => ({
      tabela: 'ferramentas', titulo: 'Ferramenta', id: v.id,
      valores: v as Record<string, unknown>,
      campos: [
        { nome: 'nome', label: 'Nome', obrigatorio: true },
        { nome: 'qty', label: 'Qtd', tipo: 'number' },
        { nome: 'tipo', label: 'Checklist (tipo)', tipo: 'select', opcoes: ['eletrica', 'mecanica'] },
        { nome: 'caixa', label: 'Caixa (inventário)', tipo: 'select', opcoes: ['VERDE', 'VERMELHA'] },
        { nome: 'area', label: 'Área', placeholder: 'Secagem / Ensaques' },
      ],
    }),
    colaboradores: (v: Partial<ColaboradorPcm>): RegistroEmEdicao => ({
      tabela: 'colaboradores', titulo: 'Colaborador', id: v.id,
      valores: v as Record<string, unknown>,
      campos: [
        { nome: 'nome', label: 'Nome', obrigatorio: true },
        { nome: 'funcao', label: 'Função', placeholder: 'Técnico Mecânico' },
        { nome: 'setor', label: 'Setor', placeholder: 'Manutenção' },
      ],
    }),
  };

  const botoesNovo: Partial<Record<Aba, () => void>> = {
    equipamentos: () => setReg(specs.equipamentos({})),
    planos: () => setReg(specs.planos({})),
    lubrificacao: () => setReg(specs.lubrificacao({})),
    ferramentas: () => setReg(specs.ferramentas({})),
    colaboradores: () => setReg(specs.colaboradores({})),
  };

  return (
    <>
      <PageHeader
        title="PCM — Cadastros"
        subtitle="Base do Planejamento e Controle de Manutenção"
        action={<Button onClick={botoesNovo[aba]}><IconPlus width={16} height={16} />Novo</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          {([
            ['equipamentos', `Equipamentos (${data?.equipamentos.length ?? 0})`],
            ['planos', `Planos (${data?.planos.length ?? 0})`],
            ['lubrificacao', `Lubrificação (${data?.lubrificacao.length ?? 0})`],
            ['ferramentas', `Ferramentas (${data?.ferramentas.length ?? 0})`],
            ['colaboradores', `Colaboradores (${data?.colaboradores.length ?? 0})`],
          ] as [Aba, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setAba(id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${aba === id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-[180px]">
          <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" placeholder="Buscar…" value={busca} onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </div>
        {aba === 'equipamentos' && (
          <div className="w-44">
            <Select value={filtroSetor} onChange={(e) => setFiltroSetor(e.target.value)}>
              <option value="">Todos os setores</option>
              {setores.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        )}
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}

      {data && aba === 'equipamentos' && (
        <AbaEquipamentos
          equipamentos={data.equipamentos} componentes={data.componentes} q={q} filtroSetor={filtroSetor}
          onEditar={(e) => setReg(specs.equipamentos(e))}
          onExcluir={(id) => void excluir('equipamentos', id)}
          onNovoComp={(eqId) => setReg(specs.componente(eqId, {}))}
          onEditarComp={(eqId, c) => setReg(specs.componente(eqId, c))}
          onExcluirComp={(id) => void excluir('equipamento_componentes', id)}
        />
      )}
      {data && aba === 'planos' && (
        <TabelaCrud<PlanoPcm>
          linhas={data.planos.filter((p) => !q || [p.setor, p.equip, p.item, p.plano, p.period].some((v) => (v ?? '').toLowerCase().includes(q)))}
          colunas={[
            ['Setor', (p) => p.setor ?? '—'],
            ['Equipamento', (p) => p.equip ?? '—'],
            ['Plano', (p) => p.plano ? `${p.plano} · ${TIPO_PLANO_PCM_LABEL[p.plano]}` : '—'],
            ['Item', (p) => p.item ?? '—'],
            ['Periodicidade', (p) => p.period ?? '—'],
            ['Qtd', (p) => (p.qty != null ? String(p.qty) : '—')],
          ]}
          onEditar={(p) => setReg(specs.planos(p))}
          onExcluir={(id) => void excluir('planos', id)}
        />
      )}
      {data && aba === 'lubrificacao' && (
        <TabelaCrud<LubrificacaoPcm>
          linhas={data.lubrificacao.filter((l) => !q || [l.setor, l.equip, l.item, l.lubrificante, l.frequencia].some((v) => (v ?? '').toLowerCase().includes(q)))}
          colunas={[
            ['Setor', (l) => l.setor ?? '—'],
            ['Equipamento', (l) => l.equip ?? '—'],
            ['Item', (l) => l.item ?? '—'],
            ['Lubrificante', (l) => l.lubrificante || '—'],
            ['Bombadas', (l) => l.bombadas || '—'],
            ['Frequência', (l) => l.frequencia ?? '—'],
          ]}
          onEditar={(l) => setReg(specs.lubrificacao(l))}
          onExcluir={(id) => void excluir('lubrificacao', id)}
        />
      )}
      {data && aba === 'ferramentas' && (
        <TabelaCrud<FerramentaPcm>
          linhas={data.ferramentas.filter((f) => !q || [f.nome, f.caixa, f.tipo, f.area].some((v) => (v ?? '').toLowerCase().includes(q)))}
          colunas={[
            ['Nome', (f) => f.nome],
            ['Qtd', (f) => String(f.qty ?? 1)],
            ['Grupo', (f) => f.caixa ? `Caixa ${f.caixa}` : f.tipo === 'eletrica' ? 'Checklist elétrica' : f.tipo === 'mecanica' ? 'Checklist mecânica' : '—'],
            ['Área', (f) => f.area || '—'],
          ]}
          onEditar={(f) => setReg(specs.ferramentas(f))}
          onExcluir={(id) => void excluir('ferramentas', id)}
        />
      )}
      {data && aba === 'colaboradores' && (
        <TabelaCrud<ColaboradorPcm>
          linhas={data.colaboradores.filter((c) => !q || [c.nome, c.funcao, c.setor].some((v) => (v ?? '').toLowerCase().includes(q)))}
          colunas={[
            ['Nome', (c) => c.nome],
            ['Função', (c) => c.funcao ?? '—'],
            ['Setor', (c) => c.setor ?? '—'],
          ]}
          onEditar={(c) => setReg(specs.colaboradores(c))}
          onExcluir={(id) => void excluir('colaboradores', id)}
        />
      )}

      {reg && <ModalRegistro reg={reg} onClose={() => setReg(null)} onSaved={() => { setReg(null); rec(); }} />}
    </>
  );
}

// ── Tabela genérica com editar/excluir ─────────────────────────
function TabelaCrud<T extends { id: string }>({ linhas, colunas, onEditar, onExcluir }: {
  linhas: T[];
  colunas: [string, (r: T) => string][];
  onEditar: (r: T) => void;
  onExcluir: (id: string) => void;
}) {
  if (linhas.length === 0) return <EmptyState title="Nenhum registro" description='Cadastre em "Novo" ou ajuste a busca.' />;
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
            {colunas.map(([h]) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}
            <th className="px-3 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {linhas.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              {colunas.map(([h, fn]) => (
                <td key={h} className="px-3 py-2.5 text-slate-600"><span className="line-clamp-1">{fn(r)}</span></td>
              ))}
              <td className="px-3 py-2.5 text-right whitespace-nowrap">
                <button onClick={() => onEditar(r)} className="mr-3 text-xs font-medium text-slate-500 hover:text-brand-600">Editar</button>
                <button onClick={() => onExcluir(r.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// ── Equipamentos: árvore por setor com componentes editáveis ───
function AbaEquipamentos({
  equipamentos, componentes, q, filtroSetor,
  onEditar, onExcluir, onNovoComp, onEditarComp, onExcluirComp,
}: {
  equipamentos: EquipamentoPcm[]; componentes: ComponenteEquipamento[]; q: string; filtroSetor: string;
  onEditar: (e: EquipamentoPcm) => void;
  onExcluir: (id: string) => void;
  onNovoComp: (equipamentoId: string) => void;
  onEditarComp: (equipamentoId: string, c: ComponenteEquipamento) => void;
  onExcluirComp: (id: string) => void;
}) {
  const [aberto, setAberto] = useState<string | null>(null);

  const compPorEquip = useMemo(() => {
    const m = new Map<string, ComponenteEquipamento[]>();
    for (const c of componentes) {
      const arr = m.get(c.equipamento_id) ?? [];
      arr.push(c);
      m.set(c.equipamento_id, arr);
    }
    return m;
  }, [componentes]);

  const filtrados = equipamentos.filter((e) => {
    if (filtroSetor && e.setor !== filtroSetor) return false;
    if (!q) return true;
    if (e.nome.toLowerCase().includes(q) || e.setor.toLowerCase().includes(q)) return true;
    return (compPorEquip.get(e.id) ?? []).some((c) => c.nome.toLowerCase().includes(q));
  });

  const porSetor = useMemo(() => {
    const m = new Map<string, EquipamentoPcm[]>();
    for (const e of filtrados) {
      const arr = m.get(e.setor) ?? [];
      arr.push(e);
      m.set(e.setor, arr);
    }
    return [...m.entries()];
  }, [filtrados]);

  if (filtrados.length === 0) return <EmptyState title="Nenhum equipamento" description="Ajuste a busca ou o filtro de setor." />;

  return (
    <div className="space-y-6">
      {porSetor.map(([setor, eqs]) => (
        <div key={setor}>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">{setor} <span className="font-normal text-slate-400">· {eqs.length} equipamento(s)</span></h3>
          <Card className="divide-y divide-slate-100">
            {eqs.map((e) => {
              const comps = compPorEquip.get(e.id) ?? [];
              const estaAberto = aberto === e.id;
              return (
                <div key={e.id}>
                  <div className="flex w-full items-center gap-3 px-4 py-3 transition hover:bg-slate-50">
                    <button onClick={() => setAberto(estaAberto ? null : e.id)} className="flex flex-1 items-center gap-3 text-left">
                      <IconChevronRight width={14} height={14}
                        className={`shrink-0 text-slate-400 transition-transform ${estaAberto ? 'rotate-90' : ''}`} />
                      <span className="flex-1 text-sm font-medium text-slate-700">{e.nome}</span>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        {comps.length} componente(s)
                      </span>
                    </button>
                    <button onClick={() => onEditar(e)} className="shrink-0 text-xs font-medium text-slate-400 hover:text-brand-600">Editar</button>
                    <button onClick={() => onExcluir(e.id)} className="shrink-0 text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                  </div>
                  {estaAberto && (
                    <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                      {comps.length > 0 && (
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-slate-100">
                            {comps.map((c) => (
                              <tr key={c.id} className="group">
                                <td className="w-14 py-1.5 pr-3 text-right font-mono text-xs text-slate-400">{c.qty ?? '—'}</td>
                                <td className="py-1.5 text-slate-600">{c.nome}</td>
                                <td className="w-32 py-1.5 text-right whitespace-nowrap">
                                  <button onClick={() => onEditarComp(e.id, c)} className="mr-3 text-xs font-medium text-slate-400 hover:text-brand-600">Editar</button>
                                  <button onClick={() => onExcluirComp(c.id)} className="text-xs font-medium text-slate-300 hover:text-red-600">Excluir</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      <button onClick={() => onNovoComp(e.id)} className="mt-2 text-xs font-medium text-brand-600 hover:text-brand-700">
                        + Adicionar componente
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        </div>
      ))}
    </div>
  );
}
