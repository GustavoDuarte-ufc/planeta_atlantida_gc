/** Contract template: RBS keeps one model per event; {{campos}} are filled per brand and per tier. */
export type ContractTierTerms = { value: string; payment: string; benefits: string };

export const CONTRACT_FIELDS: { key: string; label: string; source: "evento" | "marca" | "cota" | "signatário" | "sistema" }[] = [
  { key: "evento", label: "Nome do evento", source: "evento" },
  { key: "datas_evento", label: "Datas do evento", source: "evento" },
  { key: "marca", label: "Nome da marca", source: "marca" },
  { key: "cota", label: "Cota de patrocínio", source: "cota" },
  { key: "valor_investimento", label: "Valor do investimento", source: "cota" },
  { key: "forma_pagamento", label: "Forma de pagamento", source: "cota" },
  { key: "contrapartidas", label: "Contrapartidas da cota", source: "cota" },
  { key: "cortesias", label: "Cortesias da cota", source: "cota" },
  { key: "credenciais", label: "Credenciais da cota", source: "cota" },
  { key: "beneficios_exclusivos", label: "Benefícios exclusivos (pesquisa e Instagram)", source: "cota" },
  { key: "razao_social", label: "Razão social", source: "signatário" },
  { key: "cnpj", label: "CNPJ", source: "signatário" },
  { key: "signatario_nome", label: "Nome de quem assina", source: "signatário" },
  { key: "signatario_cpf", label: "CPF de quem assina", source: "signatário" },
  { key: "signatario_cargo", label: "Cargo de quem assina", source: "signatário" },
  { key: "signatario_email", label: "E-mail de quem assina", source: "signatário" },
  { key: "signatario_telefone", label: "Telefone de quem assina", source: "signatário" },
  { key: "data_geracao", label: "Data de geração", source: "sistema" },
];

export const DEFAULT_CONTRACT_TEMPLATE = `CONTRATO DE PATROCÍNIO — {{evento}}

De um lado, RBS — Grupo RBS, organizadora do evento {{evento}}, a ser realizado em {{datas_evento}}, doravante PATROCINADA; e, de outro, {{razao_social}}, inscrita no CNPJ sob o nº {{cnpj}}, responsável pela marca {{marca}}, doravante PATROCINADORA, neste ato representada por {{signatario_nome}}, {{signatario_cargo}}, CPF {{signatario_cpf}}, têm entre si justo e contratado o seguinte:

CLÁUSULA 1 — OBJETO
A PATROCINADORA adquire a cota {{cota}} de patrocínio do evento {{evento}}, com as contrapartidas descritas neste contrato.

CLÁUSULA 2 — INVESTIMENTO
Pela cota {{cota}}, a PATROCINADORA pagará o valor de {{valor_investimento}}, na seguinte forma: {{forma_pagamento}}.

CLÁUSULA 3 — CONTRAPARTIDAS DA COTA
{{contrapartidas}}

CLÁUSULA 4 — CORTESIAS
A cota {{cota}} dá direito às seguintes cortesias, por dia de evento:
{{cortesias}}

CLÁUSULA 5 — CREDENCIAMENTO
A cota {{cota}} dá direito às seguintes credenciais de trabalho:
{{credenciais}}

CLÁUSULA 6 — RELATÓRIO DE RESULTADOS
{{beneficios_exclusivos}}

CLÁUSULA 7 — COMUNICAÇÃO
As comunicações entre as partes serão feitas pelo Portal do Patrocinador e pelo e-mail {{signatario_email}} / telefone {{signatario_telefone}}.

CLÁUSULA 8 — FORO
Fica eleito o foro da comarca de Porto Alegre/RS para dirimir quaisquer dúvidas oriundas deste contrato.

Porto Alegre, {{data_geracao}}.

_______________________________
RBS — Grupo RBS

_______________________________
{{signatario_nome}} — {{razao_social}}`;

const PLACEHOLDER = /\{\{\s*([a-z_]+)\s*\}\}/g;

/** Field keys used by a template, in order of first appearance. */
export function templateFields(template: string): string[] {
  return [...new Set([...template.matchAll(PLACEHOLDER)].map((m) => m[1] as string))];
}

/** Fields the template uses that have no value yet. */
export function missingContractFields(template: string, values: Record<string, string>): string[] {
  return templateFields(template).filter((key) => !String(values[key] ?? "").trim());
}

/** Fills {{campos}}; empty ones become a visible blank line so nothing is silently dropped. */
export function fillContract(template: string, values: Record<string, string>): string {
  return template.replace(PLACEHOLDER, (_, key: string) => {
    const value = String(values[key] ?? "").trim();
    return value || "________________";
  });
}
