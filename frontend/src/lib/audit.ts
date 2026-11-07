/**
 * Histórico de atividades do portal: compara o estado antes e depois de cada alteração
 * e gera um registro por ação, com quem fez, quando, o quê e em qual marca.
 */
export type AuditAction = "create" | "send" | "update" | "delete" | "login" | "logout";

export type AuditActor = { id: string; name: string; email: string; role: "rbs" | "sponsor" };

export type AuditEntry = {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: "rbs" | "sponsor";
  action: AuditAction;
  area: string;
  target: string;
  detail?: string | undefined;
  message?: string | undefined;
  eventId?: string | undefined;
  sponsorId?: string | undefined;
  sponsorName?: string | undefined;
  count?: number | undefined;
};

export const AUDIT_LIMIT = 2000;
/** Agrupa em um único registro quando muitos itens do mesmo tipo mudam juntos (ex.: sincronização de 30 dias). */
const GROUP_THRESHOLD = 3;

export const ACTION_LABELS: Record<AuditAction, string> = {
  create: "Criou",
  send: "Enviou",
  update: "Modificou",
  delete: "Excluiu",
  login: "Entrou",
  logout: "Saiu",
};

type Item = Record<string, unknown> & { id: string };
type Collection = {
  key: string;
  area: string;
  /** Inclusões nesta coleção são "envios" (arquivos, mensagens, materiais). */
  addIsSend?: boolean;
  /** Campos que mudam sozinhos (leitura de mensagem etc.) e não contam como modificação. */
  ignore?: string[];
  /** Campos que não podem aparecer no histórico. */
  hidden?: string[];
};

export const AUDIT_COLLECTIONS: Collection[] = [
  { key: "events", area: "Evento" },
  { key: "sponsors", area: "Marca" },
  { key: "users", area: "Acesso", hidden: ["password"] },
  { key: "deliveries", area: "Prazo de entrega" },
  { key: "fileRequests", area: "Solicitação de arquivo" },
  { key: "files", area: "Arquivo", addIsSend: true, hidden: ["data"] },
  { key: "contents", area: "Mídia e conteúdo", addIsSend: true },
  { key: "tickets", area: "Cortesia" },
  { key: "credentials", area: "Credenciamento" },
  { key: "messages", area: "Mensagem", addIsSend: true, ignore: ["readByRbs", "readBySponsor"] },
  { key: "results", area: "Resultados do evento" },
  { key: "metrics", area: "Métricas do Instagram" },
  { key: "faq", area: "Dúvidas frequentes" },
];

const FIELD_LABELS: Record<string, string> = {
  name: "nome", title: "título", tier: "cota", contact: "contato", email: "e-mail", phone: "WhatsApp", responsibility: "responsabilidade", password: "senha", role: "perfil", accessLevel: "nível de acesso",
  dates: "datas", status: "situação", dueDate: "prazo", category: "categoria", description: "descrição", body: "texto", url: "link",
  courtesy: "cortesias", courtesySectors: "setores de cortesia", courtesyByTier: "cortesias por cota", courtesyBySponsor: "cortesias por marca", credentialGridByTier: "credenciais por cota", credentialGridBySponsor: "credenciais por marca", credentialByTier: "credenciais por cota",
  openStaffOpen: "cadastro do Open Staff", openStaffUrl: "link do Open Staff", openStaffCheck: "conferência do Open Staff", openStaffHistory: "histórico do Open Staff",
  instagramId: "conta do Instagram", instagramSyncedAt: "sincronização do Instagram", instagramAuto: "atualização automática do Instagram",
  loungeInfo: "informações do Lounge", surveyQuestions: "perguntas da pesquisa", surveyQuestionsAt: "data das perguntas", signer: "dados de quem assina", implementations: "implementações específicas",
  mediaType: "tipo de mídia", document: "documento", area: "área", group: "público", sector: "setor", passType: "dia",
  newFollowers: "novos seguidores", posts: "postagens", likes: "curtidas", shares: "compartilhamentos", comments: "comentários", reach: "alcance",
  surveyResponses: "respostas da pesquisa", satisfaction: "satisfação", surveyHighlights: "destaques da pesquisa", notes: "observações",
  question: "pergunta", answer: "resposta", tiers: "cotas", source: "fonte",
  slot: "local do arquivo", requestId: "solicitação", deliveryId: "entrega", sponsorId: "marca", eventId: "evento",
};

const labelOf = (item: Item | undefined) => {
  if (!item) return "";
  for (const key of ["name", "title", "question", "date", "email"]) if (typeof item[key] === "string" && item[key]) return String(item[key]);
  if (typeof item["text"] === "string") return String(item["text"]).slice(0, 60);
  return String(item.id);
};

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

export function changedFields(before: Item, after: Item, collection: Collection) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => !(collection.ignore ?? []).includes(key) && !same(before[key], after[key]));
}

type Snapshot = Record<string, unknown>;

/** Gera os registros de histórico entre dois estados do banco de dados. */
export function diffAudit(prev: Snapshot, next: Snapshot, actor: AuditActor, now = new Date(), makeId = () => `${now.getTime()}-${Math.random().toString(16).slice(2)}`): AuditEntry[] {
  const sponsors = new Map<string, string>();
  for (const list of [prev["sponsors"], next["sponsors"]]) for (const sp of (list as Item[] | undefined) ?? []) sponsors.set(sp.id, String(sp["name"] ?? ""));
  const entries: AuditEntry[] = [];
  const base = { at: now.toISOString(), actorId: actor.id, actorName: actor.name, actorEmail: actor.email, actorRole: actor.role };

  for (const collection of AUDIT_COLLECTIONS) {
    const before = (prev[collection.key] as Item[] | undefined) ?? [];
    const after = (next[collection.key] as Item[] | undefined) ?? [];
    if (before === after) continue;
    const beforeById = new Map(before.map((item) => [item.id, item]));
    const afterById = new Map(after.map((item) => [item.id, item]));
    const groups: Record<"add" | "update" | "delete", { item: Item; fields?: string[] }[]> = { add: [], update: [], delete: [] };
    for (const item of after) {
      const old = beforeById.get(item.id);
      if (!old) groups.add.push({ item });
      else if (old !== item) { const fields = changedFields(old, item, collection); if (fields.length) groups.update.push({ item, fields }); }
    }
    for (const item of before) if (!afterById.has(item.id)) groups.delete.push({ item });

    for (const kind of ["add", "update", "delete"] as const) {
      const list = groups[kind];
      if (!list.length) continue;
      const action: AuditAction = kind === "add" ? (collection.addIsSend ? "send" : "create") : kind;
      const scope = (item: Item) => {
        const eventId = collection.key === "events" ? item.id : (item["eventId"] as string | undefined);
        const sponsorId = collection.key === "sponsors" ? item.id : (item["sponsorId"] as string | undefined);
        return { eventId, sponsorId, sponsorName: sponsorId ? sponsors.get(sponsorId) || undefined : undefined };
      };
      const describe = (fields?: string[]) => fields?.length ? `Alterou ${[...new Set(fields.map((f) => FIELD_LABELS[f] ?? f))].join(", ")}` : undefined;
      if (list.length > GROUP_THRESHOLD) {
        const first = list[0]!.item;
        const sameSponsor = list.every(({ item }) => scope(item).sponsorId === scope(first).sponsorId);
        const s = scope(first);
        entries.push({ ...base, id: makeId(), action, area: collection.area, target: `${list.length} registros`, count: list.length, detail: list.slice(0, 5).map(({ item }) => labelOf(item)).join(", ") + (list.length > 5 ? "…" : ""), eventId: s.eventId, sponsorId: sameSponsor ? s.sponsorId : undefined, sponsorName: sameSponsor ? s.sponsorName : undefined });
      } else {
        for (const { item, fields } of list) entries.push({ ...base, id: makeId(), action, area: collection.area, target: labelOf(item), detail: describe(fields), ...scope(item) });
      }
    }
  }
  return entries;
}

/** Junta novos registros ao histórico (mais recentes primeiro), respeitando o limite guardado no navegador. */
export const appendAudit = (current: AuditEntry[] | undefined, entries: AuditEntry[]) => entries.length ? [...entries.slice().reverse(), ...(current ?? [])].slice(0, AUDIT_LIMIT) : current ?? [];

/** A mensagem de confirmação mostrada na tela vira a descrição dos registros que acabaram de ser criados. */
export function attachMessage(current: AuditEntry[] | undefined, actorId: string, message: string, now = Date.now()) {
  if (!current?.length) return current;
  let touched = false;
  const next = current.map((entry) => {
    if (entry.message || entry.actorId !== actorId || now - new Date(entry.at).getTime() > 1500) return entry;
    touched = true;
    return { ...entry, message };
  });
  return touched ? next : current;
}

export function auditCsv(entries: AuditEntry[]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Data e hora", "Pessoa", "E-mail", "Perfil", "Ação", "Área", "Item", "Marca", "Descrição", "Detalhes"];
  const rows = entries.map((e) => [new Date(e.at).toLocaleString("pt-BR"), e.actorName, e.actorEmail, e.actorRole === "rbs" ? "Equipe RBS" : "Marca", ACTION_LABELS[e.action], e.area, e.target, e.sponsorName ?? "", e.message ?? "", e.detail ?? ""]);
  return [head, ...rows].map((row) => row.map(esc).join(";")).join("\n");
}
