// Monitoramento do forno (FOR PQSA 8): o PCC térmico da farinha.
//
// Uma folha por lote; cada linha é uma leitura. Os limites não ficam no
// código: vêm dos pontos de controle (CCP-01 temperatura, CCP-02 umidade),
// que a Qualidade ajusta no cadastro.

export interface FornoRegistro {
  id: string;
  org_id: string;
  lote_id: string | null;
  forno: string | null;
  produto: string | null;
  peneira: string | null;
  cliente: string | null;
  embalagem: string | null;
  data: string;
  observacao: string | null;
  validado_em: string | null;
  validado_por: string | null;
  created_at: string;
  created_by: string | null;
}

export type NovoFornoRegistro = Partial<Pick<FornoRegistro,
  'lote_id' | 'forno' | 'produto' | 'peneira' | 'cliente' | 'embalagem' | 'data' | 'observacao'>>;

export interface FornoLeitura {
  id: string;
  org_id: string;
  registro_id: string;
  registrado_em: string;
  temp_saida: number | null;
  temp_entrada: number | null;
  hz_dosadeira: number | null;
  umidade: number | null;
  n_embalagem: string | null;
  conforme: boolean;
  acao_corretiva: string | null;
  created_at: string;
  created_by: string | null;
}

export type NovaFornoLeitura = Partial<Omit<FornoLeitura, 'id' | 'org_id' | 'created_at' | 'created_by'>> & { registro_id: string };

export interface LimitesForno {
  /** CCP-01: temperatura de saída mínima (°C). */
  tempSaidaMin: number | null;
  tempSaidaMax: number | null;
  /** CCP-02: umidade final máxima (%). */
  umidadeMax: number | null;
}

/** Os desvios de uma leitura frente aos limites. Vazio = conforme. */
export function desviosLeituraForno(
  l: Pick<FornoLeitura, 'temp_saida' | 'umidade'>,
  lim: LimitesForno,
): string[] {
  const d: string[] = [];
  if (l.temp_saida != null) {
    if (lim.tempSaidaMin != null && l.temp_saida < lim.tempSaidaMin) d.push(`Temperatura de saída abaixo de ${lim.tempSaidaMin} °C`);
    if (lim.tempSaidaMax != null && l.temp_saida > lim.tempSaidaMax) d.push(`Temperatura de saída acima de ${lim.tempSaidaMax} °C`);
  }
  if (l.umidade != null && lim.umidadeMax != null && l.umidade > lim.umidadeMax) {
    d.push(`Umidade acima de ${lim.umidadeMax} %`);
  }
  return d;
}
