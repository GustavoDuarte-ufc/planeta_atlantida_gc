import { downloadExcel, savedCsvRows } from "./excelExport";
// @ts-nocheck — copied verbatim from the original Figma Make portal
import { QRCodeSVG } from "qrcode.react";
const campaignLogo = { url: "/pa27-logo.svg" };
const campaignCover = { url: "/branding/banner-pa27.jpg" };
const campaignLogin = { url: "/branding/login-pa27.jpg" };
import { Button } from "@/components/ui/button";
import { readSurvey, simulateSurvey, clearSurvey, replaceSurveyCache, SURVEY_QUESTIONS, type SurveyAnswer } from "@/lib/survey";
import { useEffect, useMemo, useRef, useState } from "react";
import { backend, getApiToken, setApiToken, toFrontendRole, sanitizePortalState, type BackendIdentity } from "@/lib/backend";
import { syncInstagramInsights } from "@/lib/instagram.functions";
import { DEFAULT_FAQ, FAQ_CATEGORIES, faqForTier, searchFaq, faqCategories, type FaqItem } from "@/lib/faq";
import { CONTRACT_FIELDS, DEFAULT_CONTRACT_TEMPLATE, fillContract, missingContractFields, type ContractTierTerms } from "@/lib/contract";
import manualAsset from "@/assets/manual-operacoes.pdf.asset.json";
import { diffAudit, appendAudit, attachMessage, auditCsv, ACTION_LABELS, type AuditEntry, type AuditAction, type AuditActor } from "@/lib/audit";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

type Role = "rbs" | "sponsor";
type SponsorAccess = "admin" | "deliveries" | "hospitality" | "credentials" | "viewer";
type MessageTopic = "general" | "deliveries" | "tickets" | "credentials";
type Page = "dashboard" | "events" | "sponsors" | "profile" | "brand" | "media" | "requests" | "deliveries" | "calendar" | "tickets" | "credentials" | "survey" | "contract" | "analytics" | "reports" | "contact" | "history" | "faq";
type IconName = "clock" | "arrow" | "bell" | "calendar" | "chart" | "check" | "clipboard" | "download" | "edit" | "file" | "gift" | "home" | "lock" | "logout" | "menu" | "message" | "plus" | "search" | "send" | "shield" | "trash" | "upload" | "users" | "x" | "image" | "link" | "pen" | "star" | "user" | "help";
type Status = "Pendente" | "Em análise" | "Concluído";

type EventEdition = { id: string; name: string; dates: string; status: "Planejamento" | "Em andamento" | "Encerrado"; openStaffUrl?: string; openStaffOpen?: boolean; courtesySectors?: string[]; courtesyByTier?: Record<string, Record<string, number>>; courtesyBySponsor?: Record<string, Record<string, number>>; credentialByTier?: Record<string, CredQuotaRow[]>; credentialGridByTier?: Record<string, Record<string, number>>; credentialGridBySponsor?: Record<string, Record<string, number>>; contractTemplate?: string; contractTemplateByTier?: Record<string, string>; contractByTier?: Record<string, ContractTierTerms> };
type CredQuotaRow = { id: string; sector: string; qty: number; area?: string; group?: string };
type OpenStaffCheck = { id?: string; registered: number; checkedAt: string; checkedBy?: string; note?: string; limit?: number };
type BrandImplementation = { id: string; title: string; description: string; status: "Planejada" | "Em andamento" | "Concluída"; createdAt: string };
type Sponsor = { id: string; eventId: string; name: string; tier: string; contact: string; instagramId?: string; instagramSyncedAt?: string; instagramAuto?: boolean; courtesy?: Record<string, number>; loungeInfo?: string; credentialQuota?: { id: string; sector: string; qty: number }[]; openStaffUrl?: string; openStaffCheck?: OpenStaffCheck; openStaffHistory?: OpenStaffCheck[]; surveyQuestions?: string[]; surveyQuestionsAt?: string; signer?: Signer; avatar?: string; implementations?: BrandImplementation[] };
type User = { id: string; name: string; email: string; password: string; role: Role; sponsorId?: string; accessLevel?: SponsorAccess; responsibility?: string; phone?: string };
type Delivery = { id: string; eventId: string; sponsorId: string; title: string; category: string; dueDate: string; status: Status; groupId?: string; tier?: string };
type StoredFile = { id: string; eventId: string; sponsorId: string; deliveryId?: string; requestId?: string; name: string; category: string; size: string; data: string; createdAt: string; slot?: FileSlot; uploadedBy?: Role; mediaType?: MediaType; groupId?: string; tier?: string };
type Ticket = { id: string; eventId: string; sponsorId: string; name: string; email: string; status: "Enviada" | "Utilizada"; sector?: CourtesySector; passType?: PassType };
type Credential = { id: string; eventId: string; sponsorId: string; name: string; document: string; area: string; group?: string; status: Status; createdAt?: string };
type ContactMessage = { id: string; eventId: string; sponsorId: string; participantUserId?: string; senderId?: string; senderRole: Role; senderName: string; topic: MessageTopic; text: string; createdAt: string; readByRbs: boolean; readBySponsor: boolean };
type FileRequest = { id: string; eventId: string; sponsorId: string; title: string; description: string; dueDate: string; mediaType?: MediaType; groupId?: string; tier?: string };
type EventResult = { id: string; eventId: string; sponsorId: string; newFollowers: number; posts: number; likes: number; shares: number; comments: number; reach: number; surveyResponses: number; satisfaction: number; surveyHighlights: string; notes: string };
type DailyMetric = { id: string; eventId: string; sponsorId: string; date: string; source?: "manual" | "instagram"; newFollowers: number; posts: number; likes: number; shares: number; comments: number; reach: number };
type SavedGeneralReport = { id: string; eventId: string; createdAt: string; kind: "general" | "delivery-type"; name: string; csv: string; };
type Database = { savedGeneralReports?: SavedGeneralReport[]; metrics: DailyMetric[]; results: EventResult[]; fileRequests: FileRequest[]; dataVersion: number; events: EventEdition[]; sponsors: Sponsor[]; users: User[]; deliveries: Delivery[]; files: StoredFile[]; tickets: Ticket[]; credentials: Credential[]; messages: ContactMessage[]; contents: ContentItem[]; audit?: AuditEntry[]; faq?: FaqItem[] };
type CourtesySector = string;
type PassType = "Passaporte" | "Sexta" | "Sábado";
type FileSlot = "commercial-plan" | "ticket-template" | "ticket-form" | "miv" | "logo" | "brand-photo" | "client-material" | "media-report" | "survey-results" | "contract";
type Signer = { name: string; cpf: string; role: string; email: string; phone: string; company: string; cnpj: string; updatedAt?: string };
type ContentItem = { id: string; eventId: string; sponsorId: string; kind: "text" | "link"; title: string; body: string; url?: string; author: Role; authorName: string; createdAt: string; mediaType?: MediaType; groupId?: string; tier?: string };
type MediaType = "assinada" | "propria" | "conteudo";
/** Os 3 serviços de mídia: cada material, relatório e link pertence a um deles. */
export const MEDIA_TYPES: { id: MediaType; label: string; title: string; text: string }[] = [
  { id: "assinada", label: "Assinada", title: "Mídia assinada", text: "Peças e inserções com a assinatura da marca nos veículos da RBS." },
  { id: "propria", label: "Própria", title: "Mídia própria", text: "Divulgação da marca nos canais próprios do Planeta Atlântida." },
  { id: "conteudo", label: "Conteúdo de marca", title: "Conteúdo de marca", text: "Conteúdos produzidos sob medida para a marca." },
];
/** Itens antigos, enviados antes da separação por tipo, ficam em Mídia assinada até a RBS mover. */
export const mediaTypeOf = (item: { mediaType?: MediaType }): MediaType => item.mediaType ?? "assinada";

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const STORAGE_KEY = "planeta-portal-mvp-v1";
const SESSION_KEY = "planeta-portal-session";
const ACCESS_LABELS: Record<SponsorAccess, string> = {
  admin: "Administrador da marca",
  deliveries: "Marca e conteúdo",
  hospitality: "Cortesias e convidados",
  credentials: "Credenciamento",
  viewer: "Somente consulta",
};
const ACCESS_PAGES: Record<SponsorAccess, Page[]> = {
  admin: ["dashboard", "profile", "brand", "media", "requests", "deliveries", "calendar", "tickets", "credentials", "survey", "contract", "analytics", "reports", "contact", "faq"],
  deliveries: ["dashboard", "brand", "media", "requests", "deliveries", "calendar", "analytics", "reports", "contact", "faq"],
  hospitality: ["dashboard", "tickets", "analytics", "reports", "contact", "faq"],
  credentials: ["dashboard", "tickets", "credentials", "analytics", "reports", "contact", "faq"],
  viewer: ["dashboard", "analytics", "reports", "contact", "faq"],
};
const ALL_PAGES: Page[] = ["dashboard", "profile", "brand", "media", "requests", "deliveries", "calendar", "tickets", "credentials", "survey", "contract", "analytics", "reports", "contact", "faq", "history"];
const CLIENT_TABS: { page: Page; label: string; short: string; icon: IconName }[] = [
  { page: "profile", label: "Perfil do cliente", short: "Perfil", icon: "user" },
  { page: "brand", label: "Aplicações de marca", short: "Marca", icon: "image" },
  { page: "media", label: "Mídia e conteúdo", short: "Mídia", icon: "file" },
  { page: "tickets", label: "Cortesias", short: "Cortesias", icon: "gift" },
  { page: "credentials", label: "Credenciamento", short: "Credenc.", icon: "clipboard" },
  { page: "survey", label: "Pesquisa da ativação", short: "Pesquisa", icon: "star" },
  { page: "contract", label: "Contrato", short: "Contrato", icon: "pen" },
];
// RBS manages the edition, its sponsors and each client profile on one page (the "profile" tab).
const RBS_HUB_LABEL = "Evento e clientes";
const COMBINED_LABEL = "Cortesia e Credenciamento";
function navFor(role: Role): { page: Page; label: string; icon: IconName }[] {
  return [
    { page: "dashboard", label: "Visão geral", icon: "home" },
    // Cortesias e Credenciamento dividem um único item do menu ("tickets").
    ...CLIENT_TABS.filter((tab) => tab.page !== "credentials" && tab.page !== "survey").map((tab) => ({ page: tab.page, label: role === "rbs" && tab.page === "profile" ? RBS_HUB_LABEL : tab.page === "tickets" ? COMBINED_LABEL : tab.label, icon: role === "rbs" && tab.page === "profile" ? "users" as IconName : tab.icon })),
    { page: "analytics", label: "Dashboard", icon: "chart" },
    { page: "reports", label: "Relatório", icon: "download" },
    { page: "contact", label: "Contato", icon: "message" },
    // Dúvidas frequentes: respostas do Manual de Operações e perguntas cadastradas pela RBS.
    { page: "faq", label: "Dúvidas frequentes", icon: "help" },
    // Histórico de atividades: exclusivo da equipe RBS.
    ...(role === "rbs" ? [{ page: "history" as Page, label: "Histórico", icon: "clock" as IconName }] : []),
  ];
}
const MEDIA_TABS: { page: Page; label: string; icon: IconName }[] = [
  { page: "media", label: "Materiais e mídia", icon: "file" },
  { page: "requests", label: "Arquivos solicitados", icon: "upload" },
  { page: "deliveries", label: "Prazos de entrega", icon: "clipboard" },
];
const MEDIA_PAGES: Page[] = [...MEDIA_TABS.map((tab) => tab.page), "calendar"];
const CLIENT_PAGES: Page[] = [...CLIENT_TABS.map((tab) => tab.page), "requests", "deliveries", "calendar"];
const SECTORS: CourtesySector[] = ["Arena", "Camarote", "Lounge"];
const PASS_TYPES: PassType[] = ["Passaporte", "Sexta", "Sábado"];
const passTypeLabel = (type: PassType) => type === "Passaporte" ? "Passaporte (2 dias)" : type;
const qKey = (sector: string, type: string) => `${sector}|${type}`;
/** Credenciamento: cada área tem quantidades separadas por público (Arena e Camarote para marca e agência; Sala de Imprensa só marca; Sala de Conteúdo só equipe de conteúdo). */
export const CRED_GROUPS = ["Marca patrocinadora", "Agência de ativação", "Equipe de conteúdo"];
export const CRED_GRID: { area: string; groups: string[] }[] = [
  { area: "Arena", groups: ["Marca patrocinadora", "Agência de ativação"] },
  { area: "Camarote", groups: ["Marca patrocinadora", "Agência de ativação"] },
  { area: "Sala de Imprensa", groups: ["Marca patrocinadora"] },
  { area: "Sala de Conteúdo", groups: ["Equipe de conteúdo"] },
];
/** Só a cota Master tem todas as áreas; Subcota G e Subcota têm apenas Arena para a marca patrocinadora. */
export const credGridFor = (tier: string) => tier === "Master" ? CRED_GRID : [{ area: "Arena", groups: ["Marca patrocinadora"] }];
const credKeysFor = (tier: string) => new Set(credGridFor(tier).flatMap((row) => row.groups.map((group) => qKey(row.area, group))));
const MESSAGE_TOPICS: { id: MessageTopic; label: string; icon: IconName }[] = [
  { id: "general", label: "Geral", icon: "message" },
];

const seed: Database = {
  dataVersion: 7,
  faq: DEFAULT_FAQ,
  metrics: Array.from({ length: 70 }, (_, i) => { const d = new Date(Date.UTC(2024, 11, 1) + i * 86400000); const peak = i >= 61 && i <= 62 ? 6 : i >= 50 ? 2.2 : 1; const w = 0.7 + ((i * 37) % 11) / 18; return { id: `met-solar-${i}`, eventId: "evt-2025", sponsorId: "solar", date: d.toISOString().slice(0, 10), newFollowers: Math.round(40 * peak * w), posts: Math.max(0, Math.round((i % 3 === 0 ? 1 : 0) * peak)), likes: Math.round(1100 * peak * w), shares: Math.round(80 * peak * w), comments: Math.round(55 * peak * w), reach: Math.round(11000 * peak * w) }; }),
  results: [
    { id: "res-solar-2025", eventId: "evt-2025", sponsorId: "solar", newFollowers: 4820, posts: 36, likes: 128400, shares: 9150, comments: 6320, reach: 1250000, surveyResponses: 812, satisfaction: 8.7, surveyHighlights: "Público elogiou o espaço de ativação e a distribuição de brindes.", notes: "" },
  ],
  savedGeneralReports: [
    { id: "demo-geral-2025", eventId: "evt-2025", createdAt: "2025-02-05T12:00:00.000Z", kind: "general", name: "relatorio-geral-exemplo-2025.csv", csv: "Marca;Entrega;Tipo;Status\nSolar Bebidas;Enviar logotipo em vetor;Marca;Concluído\nSolar Bebidas;Aprovar peça de mídia;Mídia;Em análise\nBanco do Sul;Aprovar filme para o telão;Mídia;Concluído\nNativa Telecom;Enviar identidade visual da ativação;Marca;Em análise" },
    { id: "demo-tipos-2025", eventId: "evt-2025", createdAt: "2025-02-05T12:05:00.000Z", kind: "delivery-type", name: "entregas-por-tipo-exemplo-2025.csv", csv: "Tipo;Quantidade\nMarca;4\nMídia;2\nContrato;2" },
  ],
  fileRequests: [
    { id: "fr1", eventId: "evt-2025", sponsorId: "solar", title: "Fotos da ativação 2024", description: "Envie as melhores fotos em alta resolução.", dueDate: "2025-01-25" },
    { id: "fr2", eventId: "evt-2025", sponsorId: "solar", title: "Lista de produtos do estande", description: "Planilha com os itens expostos.", dueDate: "2025-01-28" },
    { id: "fr3", eventId: "evt-2025", sponsorId: "banco", title: "Logotipo em alta resolução", description: "Formato PNG ou vetor.", dueDate: "2025-01-24" },
  ],
  events: [
    { id: "evt-2024", name: "Planeta Atlântida 2024", dates: "02 — 03 fev", status: "Encerrado" },
    { id: "evt-2025", name: "Planeta Atlântida 2025", dates: "31 jan — 01 fev", status: "Em andamento", credentialGridByTier: { Master: { "Arena|Marca patrocinadora": 12, "Arena|Agência de ativação": 8, "Camarote|Marca patrocinadora": 4, "Camarote|Agência de ativação": 2, "Sala de Imprensa|Marca patrocinadora": 2, "Sala de Conteúdo|Equipe de conteúdo": 3 } } },
    { id: "evt-2026", name: "Planeta Atlântida 2026", dates: "A definir", status: "Planejamento" },
  ],
  sponsors: [
    { id: "solar", eventId: "evt-2025", name: "Solar Bebidas", tier: "Master", contact: "Marina Alves", courtesy: { "Arena|Sexta": 20, "Arena|Sábado": 20, "Camarote|Sexta": 6, "Camarote|Sábado": 6, "Lounge|Sexta": 4, "Lounge|Sábado": 4 }, loungeInfo: "Lounge Solar ao lado do Palco Planeta, aberto das 18h às 3h nos dois dias. Acesso com a pulseira Premium; cada convidado pode levar um acompanhante.", credentialQuota: [{ id: "cq-solar-1", sector: "Ativação", qty: 12 }, { id: "cq-solar-2", sector: "Produção", qty: 6 }, { id: "cq-solar-3", sector: "Imprensa", qty: 2 }], surveyQuestions: ["Como você avalia o atendimento no espaço Solar?", "Como você avalia a experiência de degustação?", "Qual a chance de você recomendar a Solar Bebidas?"], surveyQuestionsAt: "2025-01-10T12:00:00.000Z" },
    { id: "banco", eventId: "evt-2025", name: "Banco do Sul", tier: "Master", contact: "Felipe Ramos", courtesy: { "Arena|Sexta": 20, "Arena|Sábado": 20, "Camarote|Sexta": 6, "Camarote|Sábado": 6, "Lounge|Sexta": 4, "Lounge|Sábado": 4 } },
    { id: "nativa", eventId: "evt-2025", name: "Nativa Telecom", tier: "Subcota G", contact: "Camila Rocha", courtesy: { "Arena|Sexta": 10, "Arena|Sábado": 10, "Camarote|Sexta": 2, "Camarote|Sábado": 2 } },
    { id: "cooper", eventId: "evt-2026", name: "Cooperativa Horizonte", tier: "Master", contact: "Eduardo Lima" },
    { id: "universo", eventId: "evt-2026", name: "Universo Tech", tier: "Subcota", contact: "Renata Dias" },
    { id: "solar-2024", eventId: "evt-2024", name: "Solar Bebidas", tier: "Master", contact: "Marina Alves" },
  ],
  users: [
    { id: "u-rbs", name: "Admin RBS", email: "admin@rbs.com.br", password: "admin123", role: "rbs", responsibility: "Atendimento aos patrocinadores" },
    { id: "u-solar", name: "Marina Alves", email: "patrocinador@solar.com.br", password: "solar123", role: "sponsor", sponsorId: "solar", accessLevel: "admin" },
    { id: "u-solar-ops", name: "Gabriela Nunes", email: "operacoes@solar.com.br", password: "solar123", role: "sponsor", sponsorId: "solar", accessLevel: "deliveries" },
    { id: "u-solar-hospitality", name: "Lucas Pires", email: "cortesias@solar.com.br", password: "solar123", role: "sponsor", sponsorId: "solar", accessLevel: "hospitality" },
    { id: "u-banco-admin", name: "Felipe Ramos", email: "felipe@bancodosul.com.br", password: "banco123", role: "sponsor", sponsorId: "banco", accessLevel: "admin" },
    { id: "u-nativa-admin", name: "Camila Rocha", email: "camila@nativatelecom.com.br", password: "nativa123", role: "sponsor", sponsorId: "nativa", accessLevel: "admin" },
    { id: "u-nativa-cred", name: "Diego Moreira", email: "credenciamento@nativatelecom.com.br", password: "nativa123", role: "sponsor", sponsorId: "nativa", accessLevel: "credentials" },
    { id: "u-cooper-admin", name: "Eduardo Lima", email: "eduardo@horizonte.coop.br", password: "cooper123", role: "sponsor", sponsorId: "cooper", accessLevel: "admin" },
    { id: "u-universo-admin", name: "Renata Dias", email: "renata@universotech.com.br", password: "universo123", role: "sponsor", sponsorId: "universo", accessLevel: "admin" },
  ],
  deliveries: [
    { id: "d1", eventId: "evt-2025", sponsorId: "solar", title: "Enviar logotipo em vetor", category: "Marca", dueDate: "2025-01-20", status: "Concluído" },
    { id: "d2", eventId: "evt-2025", sponsorId: "solar", title: "Aprovar peça de mídia", category: "Mídia", dueDate: "2025-01-26", status: "Em análise" },
    { id: "d3", eventId: "evt-2025", sponsorId: "solar", title: "Assinar termo de entrega", category: "Contrato", dueDate: "2025-01-28", status: "Pendente" },
    { id: "d4", eventId: "evt-2025", sponsorId: "banco", title: "Enviar manual de marca", category: "Marca", dueDate: "2025-01-22", status: "Pendente" },
    { id: "d5", eventId: "evt-2025", sponsorId: "solar", title: "Validar layout do estande", category: "Marca", dueDate: "2025-01-29", status: "Em análise" },
    { id: "d6", eventId: "evt-2025", sponsorId: "banco", title: "Aprovar filme para o telão", category: "Mídia", dueDate: "2025-01-27", status: "Concluído" },
    { id: "d7", eventId: "evt-2025", sponsorId: "nativa", title: "Enviar identidade visual da ativação", category: "Marca", dueDate: "2025-01-24", status: "Em análise" },
    { id: "d8", eventId: "evt-2025", sponsorId: "nativa", title: "Confirmar plano de conectividade", category: "Contrato", dueDate: "2025-01-30", status: "Pendente" },
    { id: "d9", eventId: "evt-2026", sponsorId: "cooper", title: "Enviar logotipo institucional", category: "Marca", dueDate: "2026-01-15", status: "Pendente" },
    { id: "d10", eventId: "evt-2026", sponsorId: "universo", title: "Apresentar proposta de experiência digital", category: "Mídia", dueDate: "2026-01-20", status: "Pendente" },
  ],
  files: [],
  contents: [
    { id: "ct-solar-1", eventId: "evt-2025", sponsorId: "solar", kind: "link", title: "Post oficial @planetaatlantida · anúncio Solar Bebidas", body: "", url: "https://www.instagram.com/planetaatlantida/", author: "rbs", authorName: "Admin RBS", createdAt: "2025-01-22T15:00:00.000Z" },
    { id: "ct-solar-2", eventId: "evt-2025", sponsorId: "solar", kind: "text", title: "Texto institucional para o telão", body: "Solar Bebidas: o sabor oficial do verão no Planeta Atlântida. Venha conhecer nosso espaço ao lado do Palco Planeta.", author: "sponsor", authorName: "Marina Alves", createdAt: "2025-01-16T13:30:00.000Z" },
  ],
  tickets: [
    { id: "t1", sector: "Arena", passType: "Sexta", eventId: "evt-2025", sponsorId: "solar", name: "João Silva", email: "joao@email.com", status: "Enviada" },
    { id: "t2", sector: "Camarote", passType: "Sexta", eventId: "evt-2025", sponsorId: "solar", name: "Ana Martins", email: "ana.martins@email.com", status: "Utilizada" },
    { id: "t3", sector: "Arena", passType: "Sábado", eventId: "evt-2025", sponsorId: "solar", name: "Rafael Costa", email: "rafael.costa@email.com", status: "Enviada" },
    { id: "t4", sector: "Arena", passType: "Sexta", eventId: "evt-2025", sponsorId: "banco", name: "Beatriz Oliveira", email: "beatriz@email.com", status: "Enviada" },
    { id: "t5", sector: "Camarote", passType: "Sábado", eventId: "evt-2025", sponsorId: "nativa", name: "Marcelo Teixeira", email: "marcelo@email.com", status: "Utilizada" },
    { id: "t6", sector: "Arena", passType: "Sexta", eventId: "evt-2025", sponsorId: "nativa", name: "Luísa Fernandes", email: "luisa@email.com", status: "Enviada" },
  ],
  credentials: [
    { id: "c1", eventId: "evt-2025", sponsorId: "solar", name: "Carla Souza", document: "•••.456.789-••", area: "Arena", group: "Marca patrocinadora", status: "Concluído" },
    { id: "c2", eventId: "evt-2025", sponsorId: "solar", name: "Paulo Mendes", document: "•••.321.654-••", area: "Arena", group: "Agência de ativação", status: "Em análise" },
    { id: "c3", eventId: "evt-2025", sponsorId: "banco", name: "Juliana Freitas", document: "•••.987.123-••", area: "Arena", group: "Marca patrocinadora", status: "Pendente" },
    { id: "c4", eventId: "evt-2025", sponsorId: "nativa", name: "Diego Moreira", document: "•••.741.852-••", area: "Arena", group: "Marca patrocinadora", status: "Concluído" },
    { id: "c5", eventId: "evt-2025", sponsorId: "nativa", name: "Fernanda Luz", document: "•••.159.357-••", area: "Arena", group: "Marca patrocinadora", status: "Em análise" },
  ],
  messages: [
    { id: "m1", eventId: "evt-2025", sponsorId: "solar", participantUserId: "u-solar", senderId: "u-solar", senderRole: "sponsor", senderName: "Marina Alves", topic: "general", text: "Olá, equipe! Podemos centralizar os próximos alinhamentos por aqui?", createdAt: "2025-01-15T10:20:00.000Z", readByRbs: true, readBySponsor: true },
    { id: "m2", eventId: "evt-2025", sponsorId: "solar", participantUserId: "u-solar", senderId: "u-rbs", senderRole: "rbs", senderName: "Admin RBS", topic: "general", text: "Claro, Marina. Este canal será nosso ponto de contato durante o evento.", createdAt: "2025-01-15T10:42:00.000Z", readByRbs: true, readBySponsor: true },
    { id: "m3", eventId: "evt-2025", sponsorId: "solar", participantUserId: "u-solar-ops", senderId: "u-solar-ops", senderRole: "sponsor", senderName: "Gabriela Nunes", topic: "deliveries", text: "Enviei a nova versão do logotipo. Conseguem verificar se o formato está correto?", createdAt: "2025-01-18T14:15:00.000Z", readByRbs: false, readBySponsor: true },
    { id: "m4", eventId: "evt-2025", sponsorId: "solar", participantUserId: "u-solar-hospitality", senderId: "u-rbs", senderRole: "rbs", senderName: "Admin RBS", topic: "tickets", text: "A primeira lista de cortesias já está liberada para conferência.", createdAt: "2025-01-19T16:30:00.000Z", readByRbs: true, readBySponsor: false },
    { id: "m5", eventId: "evt-2025", sponsorId: "banco", participantUserId: "u-banco-admin", senderId: "u-banco-admin", senderRole: "sponsor", senderName: "Felipe Ramos", topic: "credentials", text: "Precisamos incluir mais duas pessoas na equipe de ativação.", createdAt: "2025-01-20T09:10:00.000Z", readByRbs: false, readBySponsor: true },
    { id: "m6", eventId: "evt-2025", sponsorId: "nativa", participantUserId: "u-nativa-admin", senderId: "u-nativa-admin", senderRole: "sponsor", senderName: "Camila Rocha", topic: "general", text: "Olá! Nossa equipe já está disponível para os alinhamentos da ativação.", createdAt: "2025-01-17T11:25:00.000Z", readByRbs: true, readBySponsor: true },
    { id: "m7", eventId: "evt-2025", sponsorId: "nativa", participantUserId: "u-nativa-cred", senderId: "u-rbs", senderRole: "rbs", senderName: "Admin RBS", topic: "credentials", text: "Diego, os primeiros credenciamentos foram revisados. Falta apenas um documento.", createdAt: "2025-01-21T13:40:00.000Z", readByRbs: true, readBySponsor: false },
  ],
};

/** Fills fields added in newer versions from the seed without overwriting saved values. */
function fillFromSeed<T extends { id: string }>(items: T[], seedItems: T[]) {
  return items.map((item) => { const fromSeed = seedItems.find((seedItem) => seedItem.id === item.id); return fromSeed ? { ...fromSeed, ...item } : item; });
}

const OLD_TIERS: Record<string, string> = { "Cota Apresenta": "Master", "Cota Master": "Master", "Cota Premium": "Subcota G", "Cota Parceiro": "Subcota" };
/** Setores de cortesia cadastrados pela RBS no evento; eventos antigos mantêm os setores originais. */
export function courtesySectorsFor(db: Database, eventId: string): CourtesySector[] {
  const event = db.events.find((item) => item.id === eventId);
  if (Array.isArray(event?.courtesySectors)) return event.courtesySectors;
  const fromQuotas = Object.values(event?.courtesyByTier ?? {}).flatMap((quota) => Object.keys(quota).map((key) => key.split("|")[0]).filter(Boolean));
  const fromSponsors = db.sponsors.filter((item) => item.eventId === eventId).flatMap((item) => Object.keys(item.courtesy ?? {}).map((key) => key.split("|")[0]).filter(Boolean));
  return [...new Set([...SECTORS, ...fromQuotas, ...fromSponsors])];
}
/** Uma configuração exclusiva da marca prevalece sobre a configuração geral da cota. */
export function courtesyFor(db: Database, eventId: string, tier: string, sponsorId?: string): Record<string, number> {
  const event = db.events.find((item) => item.id === eventId);
  const hasExclusive = !!sponsorId && Object.prototype.hasOwnProperty.call(event?.courtesyBySponsor ?? {}, sponsorId);
  const byTier = event?.courtesyByTier;
  // Dados antigos: usa as quantidades da primeira marca daquela cota no evento.
  const raw = hasExclusive ? event?.courtesyBySponsor?.[sponsorId!] ?? {} : (byTier && byTier[tier]) || db.sponsors.find((item) => item.eventId === eventId && item.tier === tier && item.courtesy && Object.keys(item.courtesy).length)?.courtesy || {};
  const valid = new Set(courtesySectorsFor(db, eventId).flatMap((sector) => PASS_TYPES.map((type) => `${sector}|${type}`)));
  return Object.fromEntries(Object.entries(raw).filter(([key]) => valid.has(key))) as Record<string, number>;
}
/** Uma configuração exclusiva de credenciais da marca prevalece sobre a configuração da cota. */
export function credentialsFor(db: Database, eventId: string, tier: string, sponsorId?: string): CredQuotaRow[] {
  const grid = credentialGridFor(db, eventId, tier, sponsorId);
  return credGridFor(tier).flatMap((row) => row.groups.map((group) => ({ id: qKey(row.area, group), sector: `${row.area} · ${group}`, area: row.area, group, qty: grid[qKey(row.area, group)] ?? 0 }))).filter((row) => row.qty > 0);
}
/** Quantidades da cota por área e público ("Área|Público"); setores antigos fora da nova estrutura são ignorados. */
export function credentialGridFor(db: Database, eventId: string, tier: string, sponsorId?: string): Record<string, number> {
  const event = db.events.find((item) => item.id === eventId);
  const hasExclusive = !!sponsorId && Object.prototype.hasOwnProperty.call(event?.credentialGridBySponsor ?? {}, sponsorId);
  const raw = hasExclusive ? event?.credentialGridBySponsor?.[sponsorId!] ?? {} : event?.credentialGridByTier?.[tier] ?? {};
  return Object.fromEntries(Object.entries(raw).filter(([key, value]) => credKeysFor(tier).has(key) && Number(value) > 0).map(([key, value]) => [key, Math.floor(Number(value))]));
}
export const credentialTotal = (rows: CredQuotaRow[]) => rows.reduce((sum, row) => sum + (Number(row.qty) || 0), 0);
/** Situação do cadastro no Open Staff comparado ao limite da cota. */
export function openStaffStatus(limit: number, check?: OpenStaffCheck): "Sem conferência" | "Dentro do limite" | "Completo" | "Acima do limite" {
  if (!check) return "Sem conferência";
  if (check.registered > limit) return "Acima do limite";
  if (limit > 0 && check.registered === limit) return "Completo";
  return "Dentro do limite";
}
/** Todas as conferências do Open Staff da marca, da mais antiga para a mais recente (inclui a conferência antiga sem histórico). */
export function openStaffHistoryOf(sponsor: Pick<Sponsor, "openStaffCheck" | "openStaffHistory">): OpenStaffCheck[] {
  const list = sponsor.openStaffHistory?.length ? sponsor.openStaffHistory : sponsor.openStaffCheck ? [sponsor.openStaffCheck] : [];
  return [...list].sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
}
/** Registra uma nova conferência sem apagar as anteriores; a mais recente passa a ser a conferência atual. */
export function recordOpenStaffCheck<T extends Sponsor>(sponsor: T, check: OpenStaffCheck): T {
  const entry = { ...check, id: check.id ?? uid() };
  const history = [...openStaffHistoryOf(sponsor).map((item) => item.id ? item : { ...item, id: uid() }), entry].sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
  return { ...sponsor, openStaffHistory: history, openStaffCheck: history[history.length - 1] };
}
/** Remove uma conferência do histórico; a atual volta a ser a mais recente que sobrou. */
export function removeOpenStaffCheck<T extends Sponsor>(sponsor: T, id: string): T {
  const history = openStaffHistoryOf(sponsor).filter((item) => (item.id ?? item.checkedAt) !== id);
  return { ...sponsor, openStaffHistory: history, openStaffCheck: history[history.length - 1] };
}
function migrateDatabase(raw: Partial<Database>): Database {
  // Only create a new object when an old tier really needs converting; otherwise the save effect would loop forever.
  const parsed = raw.sponsors?.some((sp) => OLD_TIERS[sp.tier]) ? { ...raw, sponsors: raw.sponsors.map((sp) => OLD_TIERS[sp.tier] ? { ...sp, tier: OLD_TIERS[sp.tier] } : sp) } : raw;
  if ((parsed.dataVersion ?? 1) >= seed.dataVersion) return parsed.fileRequests && parsed.results && parsed.metrics && parsed.contents && parsed.faq ? parsed as Database : { ...(parsed as Database), fileRequests: parsed.fileRequests ?? [], results: parsed.results ?? [], metrics: parsed.metrics ?? [], contents: parsed.contents ?? [], faq: parsed.faq ?? DEFAULT_FAQ };
  const mergeSeed = <T extends { id: string }>(savedItems: T[] | undefined, seedItems: T[]) => {
    const existing = savedItems ?? [];
    return [...existing, ...seedItems.filter((seedItem) => !existing.some((item) => item.id === seedItem.id))];
  };
  const users = mergeSeed<User>(parsed.users, seed.users).map((item) => item.role === "sponsor" ? { ...item, accessLevel: item.accessLevel ?? "admin" } : item);
  const savedMessages = mergeSeed<ContactMessage>(parsed.messages, seed.messages);
  return {
    ...seed,
    ...parsed,
    dataVersion: seed.dataVersion,
    events: mergeSeed<EventEdition>(parsed.events, seed.events),
    sponsors: fillFromSeed(mergeSeed<Sponsor>(parsed.sponsors, seed.sponsors), seed.sponsors),
    contents: mergeSeed<ContentItem>(parsed.contents, seed.contents),
    users,
    deliveries: mergeSeed<Delivery>(parsed.deliveries, seed.deliveries),
    fileRequests: mergeSeed<FileRequest>(parsed.fileRequests, seed.fileRequests),
    results: mergeSeed<EventResult>(parsed.results, seed.results),
    metrics: mergeSeed<DailyMetric>(parsed.metrics, seed.metrics),
    tickets: fillFromSeed(mergeSeed<Ticket>(parsed.tickets, seed.tickets), seed.tickets),
    credentials: mergeSeed<Credential>(parsed.credentials, seed.credentials),
    messages: savedMessages.map((item) => {
      const participantUserId = item.participantUserId
        ?? (item.senderRole === "sponsor" ? item.senderId : undefined)
        ?? users.find((user) => user.role === "sponsor" && user.sponsorId === item.sponsorId && user.name === item.senderName)?.id
        ?? users.find((user) => user.role === "sponsor" && user.sponsorId === item.sponsorId)?.id;
      return { ...item, participantUserId, topic: item.topic ?? "general" };
    }),
  };
}

function loadDatabase(): Database {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? migrateDatabase(JSON.parse(saved)) : seed;
  } catch {
    return seed;
  }
}

function Icon({ name, size = 19 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    chart: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    clipboard: <><rect x="5" y="4" width="14" height="18" rx="2" /><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h4" /></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    file: <><path d="M6 2h9l4 4v16H6zM14 2v5h5" /></>,
    gift: <><path d="M3 9h18v4H3zM5 13v8h14v-8M12 9v12M12 9H7.5a2.5 2.5 0 1 1 0-5C11 4 12 9 12 9Zm0 0h4.5a2.5 2.5 0 1 0 0-5C13 4 12 9 12 9Z" /></>,
    home: <><path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-6" /></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    message: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" /><path d="M8 9h8M8 13h5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" /></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
    x: <path d="m6 6 12 12M18 6 6 18" />,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></>,
    link: <><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></>,
    pen: <><path d="M3 21h18" /><path d="M14 4l6 6-9 9H5v-6z" /></>,
    star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.3-2.5 3.8M12 17.2v.1" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Logo() {
  return <div className="brand"><img className="campaign-logo" src={campaignLogo.url} alt="Planeta Atlântida 2027" /><div><strong>PLANETA ATLÂNTIDA</strong><span>PORTAL DO PATROCINADOR</span></div></div>;
}

function Login({ onLogin }: { onLogin: (identity: BackendIdentity) => Promise<void> }) {
  const [email, setEmail] = useState("admin@rbs.com.br");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(""); setLoading(true);
    try { const identity = await backend.login(email.trim(), password); if (!identity.token) throw new Error("O backend não retornou um token de acesso."); setApiToken(identity.token); await onLogin(identity); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível entrar no portal."); }
    finally { setLoading(false); }
  };
  return <main className="login">
    <img className="login-cover" src={campaignLogin.url} alt="Palco e público do Planeta Atlântida" /><section className="login-brand"><Logo /><div><span className="campaign-checker" aria-hidden="true" /><h1>Portal do Patrocinador</h1><p className="campaign-slogan">SÓ QUEM VAI SENTE.</p></div></section>
    <section className="login-form"><form onSubmit={submit}><div className="secure"><Icon name="shield" size={16} /> ACESSO RESTRITO</div><h2>Entrar no portal</h2><p>Use um e-mail previamente autorizado pela RBS.</p><label><span>E-mail</span><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label><label><span>Senha</span><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required /></label>{error && <div className="form-error">{error}</div>}<Button variant="portal" size="portal" className="primary wide" type="submit" disabled={loading}>{loading ? "Conectando..." : "Entrar"} <Icon name="arrow" size={16} /></Button><div className="demo-access"><strong>Acessos de demonstração</strong><Button variant="portal" size="portal" type="button" onClick={() => { setEmail("admin@rbs.com.br"); setPassword(""); }}>RBS: admin@rbs.com.br</Button><Button variant="portal" size="portal" type="button" onClick={() => { setEmail("patrocinador@solar.com.br"); setPassword(""); }}>Patrocinador: patrocinador@solar.com.br</Button></div></form></section>
  </main>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-bg" onMouseDown={onClose}><section className="modal" role="dialog" aria-label={title} aria-modal="true" onMouseDown={(e) => e.stopPropagation()}><div className="modal-title"><h2>{title}</h2><Button variant="portal" size="portal" type="button" onClick={onClose} title="Fechar"><Icon name="x" /></Button></div>{children}</section></div>;
}

function App() {
  const [db, setDb] = useState<Database>(loadDatabase);
  const [userId, setUserId] = useState("");
  const [booting, setBooting] = useState(true);
  const apiReady = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [page, setPage] = useState<Page>("dashboard");
  const [eventId, setEventId] = useState(() => loadDatabase().events[0]?.id ?? "");
  const [selectedSponsorId, setSelectedSponsorId] = useState(() => loadDatabase().sponsors[0]?.id ?? "");
  const [selectedTier, setSelectedTier] = useState<string>(TIERS[0]!);
  // Em Mídia e conteúdo (RBS), a marca escolhida dentro da cota abre a mídia veiculada daquela marca.
  const [mediaBrandId, setMediaBrandId] = useState("");
  const [modal, setModal] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null);
  const [contactTopic, setContactTopic] = useState<MessageTopic>("general");
  const [contactUserId, setContactUserId] = useState("");

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      const token = getApiToken();
      if (!token) { setBooting(false); return; }
      try {
        const identity = await backend.me();
        let remote = await backend.getPortalState();
        if (!remote || !Array.isArray(remote.users) || remote.users.length === 0) {
          if (identity.role !== "ADMIN_RBS") throw new Error("O portal ainda não foi inicializado pela equipe RBS.");
          remote = sanitizePortalState(loadDatabase() as unknown as Record<string, any>);
          await backend.savePortalState(remote);
        }
        const restored = migrateDatabase(remote as Database);
        replaceSurveyCache(Array.isArray(remote.surveyAnswers) ? remote.surveyAnswers : []);
        const role = toFrontendRole(identity.role);
        let currentUser = restored.users.find((u) => u.email.toLowerCase() === identity.email.toLowerCase());
        if (!currentUser) {
          currentUser = { id: `api-${identity.email}`, name: identity.nome, email: identity.email, password: "", role, sponsorId: role === "sponsor" ? identity.frontendSponsorId ?? undefined : undefined, accessLevel: "admin" };
          restored.users = [...restored.users, currentUser];
        } else currentUser = { ...currentUser, name: identity.nome, role, sponsorId: role === "sponsor" ? (identity.frontendSponsorId ?? currentUser.sponsorId) : undefined };
        if (!active) return;
        setDb(restored); setUserId(currentUser.id); apiReady.current = true;
      } catch (error) {
        setApiToken(null);
        if (active) setToast(error instanceof Error ? error.message : "Sessão expirada. Entre novamente.");
      } finally { if (active) setBooting(false); }
    };
    bootstrap();
    return () => { active = false; if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  useEffect(() => {
    if (!apiReady.current || !getApiToken()) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      backend.savePortalState(sanitizePortalState(db as unknown as Record<string, any>)).catch((error) => {
        setToast(error instanceof Error ? `Falha ao salvar no servidor: ${error.message}` : "Falha ao salvar no servidor.");
      });
    }, 350);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [db]);
  const user = db.users.find((item) => item.id === userId);
  const role = user?.role ?? "sponsor";
  const currentSponsorId = role === "sponsor" ? user?.sponsorId ?? "" : selectedSponsorId;
  const currentEvent = db.events.find((item) => item.id === eventId) ?? db.events[0];
  const eventSponsors = db.sponsors.filter((item) => item.eventId === eventId);
  const currentSponsor = db.sponsors.find((item) => item.id === currentSponsorId);
  const mediaBrand = eventSponsors.find((item) => item.id === mediaBrandId && item.tier === selectedTier);
  const accessLevel = user?.accessLevel ?? "admin";
  // A equipe RBS solicita arquivos dentro de Mídia e conteúdo; as páginas separadas ficam só para as marcas.
  const allowedPages: Page[] = (role === "rbs"
    ? ALL_PAGES.filter((p) => p !== "requests" && p !== "deliveries")
    : ACCESS_PAGES[accessLevel]).filter((p) => p !== "survey" || !currentSponsor || hasFullBenefits(currentSponsor.tier));
  const activePage: Page = allowedPages.includes(page) ? page : "dashboard";

  useEffect(() => {
    if (activePage !== page) setPage("dashboard");
  }, [activePage, page]);

  useEffect(() => {
    if (role === "rbs" && !eventSponsors.some((item) => item.id === selectedSponsorId)) setSelectedSponsorId(eventSponsors[0]?.id ?? "");
  }, [eventId, eventSponsors, role, selectedSponsorId]);

  useEffect(() => {
    if (role !== "sponsor" || !user?.sponsorId) return;
    const assignedSponsor = db.sponsors.find((item) => item.id === user.sponsorId);
    if (assignedSponsor && assignedSponsor.eventId !== eventId) setEventId(assignedSponsor.eventId);
  }, [db.sponsors, eventId, role, user?.sponsorId]);

  const actor: AuditActor | null = user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null;
  /** Toda alteração passa por aqui e fica registrada no histórico com quem fez e quando. */
  const update = (fn: (current: Database) => Database) => setDb((current) => {
    const next = fn(current);
    if (next === current || !actor) return next;
    const entries = diffAudit(current as never, next as never, actor);
    return entries.length ? { ...next, audit: appendAudit(next.audit ?? current.audit, entries) } : next;
  });
  const logSession = (who: User, action: AuditAction) => setDb((current) => ({ ...current, audit: appendAudit(current.audit, [{ id: uid(), at: new Date().toISOString(), actorId: who.id, actorName: who.name, actorEmail: who.email, actorRole: who.role, action, area: "Acesso ao portal", target: who.email, sponsorId: who.sponsorId, sponsorName: current.sponsors.find((s) => s.id === who.sponsorId)?.name }]) }));
  const markTopicRead = (topic: MessageTopic, targetSponsorId = currentSponsorId, targetUserId = role === "sponsor" ? user?.id : contactUserId || db.users.find((item) => item.role === "sponsor" && item.sponsorId === targetSponsorId)?.id) => {
    setDb((current) => {
      let changed = false;
      const messages = current.messages.map((message) => {
        const belongsToTopic = message.eventId === eventId && message.sponsorId === targetSponsorId && message.topic === topic;
        const unread = role === "rbs" ? !message.readByRbs && message.senderRole === "sponsor" : !message.readBySponsor && message.senderRole === "rbs";
        if (!belongsToTopic || !unread) return message;
        changed = true;
        return role === "rbs" ? { ...message, readByRbs: true } : { ...message, readBySponsor: true };
      });
      return changed ? { ...current, messages } : current;
    });
  };
  const notify = (message: string) => { if (user) setDb((current) => { const audit = attachMessage(current.audit, user.id, message); return audit === current.audit ? current : { ...current, audit }; }); setToast(message); window.setTimeout(() => setToast(""), 2300); };
  const go = (target: Page) => {
    const next: Page = target === "credentials" ? "tickets" : target;
    const destination = allowedPages.includes(next) ? next : "dashboard";
    if (destination === "contact") markTopicRead(contactTopic);
    setPage(destination);
    setSidebarOpen(false);
  };
  const logout = () => { if (user) logSession(user, "logout"); backend.logout(); localStorage.removeItem(SESSION_KEY); apiReady.current = false; setPage("dashboard"); setNotificationsOpen(false); setUserId(""); };
  const login = async (identity: BackendIdentity) => {
    let remote = await backend.getPortalState();
    if (!remote || !Array.isArray(remote.users) || remote.users.length === 0) {
      if (identity.role !== "ADMIN_RBS") throw new Error("A equipe RBS precisa inicializar o portal antes do primeiro acesso de patrocinadores.");
      remote = sanitizePortalState(loadDatabase() as unknown as Record<string, any>);
      await backend.savePortalState(remote);
    }
    const restored = migrateDatabase(remote as Database);
    replaceSurveyCache(Array.isArray(remote.surveyAnswers) ? remote.surveyAnswers : []);
    const role = toFrontendRole(identity.role);
    let nextUser = restored.users.find((u) => u.email.toLowerCase() === identity.email.toLowerCase());
    if (!nextUser) {
      nextUser = { id: `api-${identity.email}`, name: identity.nome, email: identity.email, password: "", role, sponsorId: role === "sponsor" ? identity.frontendSponsorId ?? undefined : undefined, accessLevel: "admin" };
      restored.users = [...restored.users, nextUser];
    } else nextUser = { ...nextUser, name: identity.nome, role, sponsorId: role === "sponsor" ? (identity.frontendSponsorId ?? nextUser.sponsorId) : undefined };
    setDb(restored); setPage("dashboard"); setNotificationsOpen(false); setUserId(nextUser.id); apiReady.current = true;
  };

  if (booting) return <main className="login"><section className="login-form"><h2>Conectando ao portal...</h2><p>Validando sua sessão com o servidor.</p></section></main>;
  if (!user) return <Login onLogin={login} />;

  const nav = navFor(role);
  const canEditClient = role === "rbs" || accessLevel === "admin";
  const tabProps = { db, eventId, event: currentEvent, sponsor: currentSponsor, role, user, canEdit: canEditClient, update, notify };
  const incomingMessages = db.messages
    .filter((message) => message.eventId === eventId && (role === "rbs" || message.sponsorId === currentSponsorId))
    .filter((message) => role === "rbs" ? message.senderRole === "sponsor" && !message.readByRbs : message.senderRole === "rbs" && !message.readBySponsor)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const openMessage = (message: ContactMessage) => {
    if (role === "rbs") setSelectedSponsorId(message.sponsorId);
    if (message.participantUserId) setContactUserId(message.participantUserId);
    setContactTopic(message.topic);
    markTopicRead(message.topic, message.sponsorId, message.participantUserId);
    setNotificationsOpen(false);
    setPage("contact");
  };

  return <div className={`app ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}><div className="sidebar-top"><Logo /><Button variant="portal" size="portal" type="button" onClick={() => setSidebarOpen(false)}><Icon name="x" /></Button></div><nav>{nav.filter((item) => allowedPages.includes(item.page)).map((item) => <Button variant="portal" size="portal" key={item.page} className={activePage === item.page || item.page === "media" && MEDIA_PAGES.includes(activePage) ? "active" : ""} type="button" onClick={() => go(item.page)}><Icon name={item.icon} /><span>{item.label}</span></Button>)}</nav><div className="session"><span aria-label={role === "rbs" ? "Equipe RBS" : undefined}>{role === "rbs" ? "RBS" : currentSponsor?.avatar ? avatarContent(currentSponsor.name, currentSponsor.avatar) : user.name.slice(0, 2).toUpperCase()}</span><div><strong>{user.name}</strong><small>{role === "rbs" ? "Equipe RBS" : ACCESS_LABELS[accessLevel]}</small></div><Button variant="portal" size="portal" type="button" onClick={logout} title="Sair"><Icon name="logout" size={17} /></Button></div></aside>
    <Button variant="portal" size="portal" className="sidebar-collapse" type="button" aria-label={sidebarCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"} title={sidebarCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"} aria-expanded={!sidebarCollapsed} onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}><Icon name="arrow" size={16} /></Button>
    <div className="main">
      <header><Button variant="portal" size="portal" className="menu" type="button" aria-label="Abrir menu" onClick={() => setSidebarOpen(true)}><Icon name="menu" /></Button><div className="context">{role === "rbs" ? <><label><span>EVENTO</span><select value={eventId} onChange={(e) => { const value = e.target.value; if (value === "__new") { e.target.value = eventId; setEditingEventId(null); setModal("event"); } else { setEventId(value); } }}>{db.events.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}<option value="__new">＋ Novo evento…</option></select></label></> : <div className="fixed-context"><span>EVENTO VINCULADO</span><strong>{currentEvent?.name}</strong></div>}</div><div className="notification-wrap"><Button variant="portal" size="portal" className="notification-button" type="button" onClick={() => setNotificationsOpen((open) => !open)} title="Notificações"><Icon name="bell" size={18} />{incomingMessages.length > 0 && <span>{incomingMessages.length > 9 ? "9+" : incomingMessages.length}</span>}</Button>{notificationsOpen && <section className="notification-popover"><div><strong>Notificações</strong><span>{incomingMessages.length} não lidas</span></div>{incomingMessages.slice(0, 5).map((message) => <Button variant="portal" size="portal" type="button" key={message.id} onClick={() => openMessage(message)}><span><Icon name={MESSAGE_TOPICS.find((item) => item.id === message.topic)?.icon ?? "message"} size={14} /></span><div><strong>{message.senderName} · {MESSAGE_TOPICS.find((item) => item.id === message.topic)?.label}</strong><small>{message.text}</small></div></Button>)}{!incomingMessages.length && <div className="notification-empty"><Icon name="check" size={18} /><span>Você está em dia.</span></div>}</section>}</div><span className={`event-status ${currentEvent?.status.toLowerCase().replace(" ", "-")}`}><i />{currentEvent?.status}</span></header>
      <main className="content">
        {activePage === "dashboard" && <section className="campaign-banner no-print" aria-label="Planeta Atlântida"><img className="campaign-banner-cover" src={campaignCover.url} alt="" /><img className="campaign-banner-logo" src={campaignLogo.url} alt="Planeta Atlântida 2027" /><div><span>PORTAL DO PATROCINADOR</span><strong>Planeta Atlântida</strong><p>SÓ QUEM VAI SENTE.</p><span className="campaign-edition">{currentEvent?.name} · {currentEvent?.dates}</span><span className="campaign-checker" aria-hidden="true" /></div></section>}
        {activePage === "dashboard" && <Dashboard db={db} eventId={eventId} sponsorId={currentSponsorId} role={role} allowedPages={allowedPages} go={go} selectSponsor={setSelectedSponsorId} />}
        {activePage === "profile" && role === "rbs" && <>
          <Heading title={RBS_HUB_LABEL} text="Edição do festival, marcas patrocinadoras e perfil de cada cliente em um só lugar." />
          <Events db={db} eventId={eventId} setEventId={setEventId} role={role} update={update} open={() => { setEditingEventId(null); setModal("event"); }} edit={(id) => { setEditingEventId(id); setModal("event"); }} />
          <Sponsors sponsors={eventSponsors} update={update} eventId={eventId} selectedId={currentSponsorId} select={setSelectedSponsorId} open={() => { setEditingSponsorId(null); setModal("sponsor"); }} edit={(id) => { setEditingSponsorId(id); setModal("sponsor"); }} notify={notify} />
          {currentSponsor && <BrandCustomizations db={db} eventId={eventId} sponsor={currentSponsor} update={update} notify={notify} />}
          <TierCommercialPlans db={db} eventId={eventId} update={update} notify={notify} />
          <EventTicketTemplate db={db} eventId={eventId} update={update} notify={notify} />
        </>}
        {role === "rbs" && activePage === "media" && <section className="brand-workspace by-tier tier-only" aria-label="Cotas"><nav aria-label="Escolher cota">{TIERS.map((tier) => { const n = eventSponsors.filter((item) => item.tier === tier).length; return <Button variant="portal" size="portal" className={selectedTier === tier ? "active" : ""} type="button" key={tier} onClick={() => { setSelectedTier(tier); setMediaBrandId(""); }}><span>{tier}</span><small>{n} {n === 1 ? "marca" : "marcas"}</small></Button>; })}</nav>{eventSponsors.some((item) => item.tier === selectedTier) && <nav className="tier-brands" aria-label={`Marcas da cota ${selectedTier}`}><Button variant="portal" size="portal" className={!mediaBrand ? "active" : ""} type="button" onClick={() => setMediaBrandId("")}><span>Toda a cota</span></Button>{eventSponsors.filter((item) => item.tier === selectedTier).map((item) => <Button variant="portal" size="portal" className={mediaBrand?.id === item.id ? "active" : ""} type="button" key={item.id} onClick={() => setMediaBrandId(item.id)}><span>{item.name}</span></Button>)}</nav>}</section>}
        {role === "rbs" && activePage !== "profile" && activePage !== "tickets" && activePage !== "credentials" && activePage !== "media" && activePage !== "contract" && [...CLIENT_PAGES, "contact", "analytics", "reports"].includes(activePage) && <section className="brand-workspace by-tier" aria-label="Marcas por cota">{TIERS.filter((tier) => eventSponsors.some((item) => item.tier === tier)).map((tier) => <div className="tier-group" key={tier}><span className="tier-group-label">{tier}</span><nav aria-label={`Marcas da cota ${tier}`}>{eventSponsors.filter((item) => item.tier === tier).map((item) => <Button variant="portal" size="portal" className={item.id === currentSponsorId ? "active" : ""} type="button" key={item.id} onClick={() => setSelectedSponsorId(item.id)}><span>{item.name}</span></Button>)}</nav></div>)}{!eventSponsors.length && <span className="tier-group-empty">Nenhuma marca cadastrada neste evento.</span>}</section>}
        {CLIENT_PAGES.includes(activePage) && !(role === "rbs" && (activePage === "tickets" || activePage === "credentials" || activePage === "contract")) && <ClientHeader sponsor={currentSponsor} event={currentEvent} page={activePage} allowedPages={allowedPages} go={go} compact={role === "rbs"} />}
        {CLIENT_PAGES.includes(activePage) && !currentSponsor && !(role === "rbs" && (activePage === "tickets" || activePage === "credentials" || activePage === "media" || activePage === "contract")) && <Empty text="Cadastre uma marca neste evento para abrir a página do cliente." />}
        {currentSponsor && activePage === "deliveries" && <Deliveries db={db} eventId={eventId} sponsorId={currentSponsorId} role={role} update={update} notify={notify} open={() => setModal("delivery")} />}
        {currentSponsor && activePage === "requests" && <FileRequests db={db} eventId={eventId} sponsorId={currentSponsorId} role={role} update={update} notify={notify} open={() => setModal("request")} />}
        {currentSponsor && activePage === "calendar" && <DeliveryCalendar db={db} eventId={eventId} sponsorId={currentSponsorId} role={role} go={go} update={update} notify={notify} />}
        {activePage === "contact" && <ContactPage db={db} eventId={eventId} sponsorId={currentSponsorId} role={role} user={user} topic={contactTopic} setTopic={setContactTopic} selectedUserId={contactUserId} setSelectedUserId={setContactUserId} update={update} notify={notify} />}
        {currentSponsor && activePage === "profile" && <ProfileTab {...tabProps} openUser={() => { setEditingUserId(null); setModal("user"); }} editUser={(id) => { setEditingUserId(id); setModal("user"); }} />}
        {currentSponsor && activePage === "brand" && <BrandTab {...tabProps} />}
        {role === "rbs" && activePage === "media" && <><DeliveryCalendar db={db} eventId={eventId} sponsorId={currentSponsorId} role={role} go={go} update={update} notify={notify} tier={selectedTier} /><TierMediaTab db={db} eventId={eventId} tier={selectedTier} user={user} update={update} notify={notify} />{mediaBrand ? <PublishedMediaPanel key={mediaBrand.id} db={db} eventId={eventId} tier={mediaBrand.tier} sponsorId={mediaBrand.id} brandName={mediaBrand.name} role={role} user={user} update={update} notify={notify} /> : <p className="media-brand-hint">Selecione uma marca da cota {selectedTier} no painel superior para publicar a mídia veiculada dela.</p>}</>}
        {role !== "rbs" && currentSponsor && activePage === "media" && <><DeliveryCalendar db={db} eventId={eventId} sponsorId={currentSponsorId} role={role} go={go} update={update} notify={notify} /><MediaTab {...tabProps} /></>}
        {role === "rbs" && activePage === "tickets" && <TierCourtesy db={db} eventId={eventId} update={update} notify={notify} />}
        {role !== "rbs" && currentSponsor && activePage === "tickets" && user?.accessLevel !== "credentials" && <CourtesyTab {...tabProps} />}
        {role === "rbs" && activePage === "tickets" && <TierCredentials db={db} eventId={eventId} event={currentEvent} user={user} update={update} notify={notify} />}
        {role !== "rbs" && currentSponsor && activePage === "tickets" && allowedPages.includes("credentials") && <CredentialsTab {...tabProps} />}
        {currentSponsor && activePage === "survey" && <SurveyTab {...tabProps} />}
        {role === "rbs" && activePage === "contract" && <TierContract db={db} eventId={eventId} update={update} notify={notify} />}
        {role !== "rbs" && currentSponsor && activePage === "contract" && <ContractTab {...tabProps} />}
        {role === "rbs" && activePage === "credentials" && <TierCredentials db={db} eventId={eventId} event={currentEvent} user={user} update={update} notify={notify} />}
        {role !== "rbs" && currentSponsor && activePage === "credentials" && <CredentialsTab {...tabProps} />}
        {activePage === "faq" && <FaqPage db={db} role={role} tier={currentSponsor?.tier} user={user} update={update} notify={notify} go={go} />}
        {role === "rbs" && activePage === "history" && <HistoryPage db={db} eventId={eventId} event={currentEvent} />}
        {activePage === "analytics" && currentSponsor && <EventResults db={db} eventId={eventId} sponsorId={currentSponsorId} role={role} update={update} notify={notify} />}
        {activePage === "analytics" && currentSponsor && hasFullBenefits(currentSponsor.tier) && allowedPages.includes("survey") && <section className="no-print"><Heading title="Pesquisa da ativação" text="Perguntas personalizadas da marca e resultados da pesquisa feita no espaço de ativação." /><SurveyTab {...tabProps} /></section>}
        {activePage === "reports" && <Reports db={db} eventId={eventId} sponsorId={currentSponsorId} role={role} update={update} notify={notify} />}
      </main>
    </div>

    {modal === "event" && <EventForm close={() => setModal(null)} update={update} setEventId={setEventId} editingEvent={db.events.find((item) => item.id === editingEventId)} notify={notify} />}
    {modal === "sponsor" && <SponsorForm close={() => setModal(null)} update={update} eventId={eventId} setSponsorId={setSelectedSponsorId} editingSponsor={db.sponsors.find((item) => item.id === editingSponsorId)} notify={notify} />}
    {modal === "delivery" && <DeliveryForm close={() => setModal(null)} update={update} eventId={eventId} sponsorId={currentSponsorId} notify={notify} />}
    {modal === "request" && <FileRequestForm close={() => setModal(null)} update={update} eventId={eventId} sponsorId={currentSponsorId} notify={notify} />}
    {modal === "user" && <UserForm close={() => setModal(null)} update={update} sponsor={currentSponsor} users={db.users} editingUser={db.users.find((item) => item.id === editingUserId)} notify={notify} />}
    {toast && <div className="toast"><Icon name="check" size={15} />{toast}</div>}
    {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}
  </div>;
}

function Heading({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return <div className="heading"><div><h1>{title}</h1><p>{text}</p></div>{action}</div>;
}

function Dashboard({ db, eventId, sponsorId, role, allowedPages, go, selectSponsor }: { db: Database; eventId: string; sponsorId: string; role: Role; allowedPages: Page[]; go: (page: Page) => void; selectSponsor: (id: string) => void }) {
  if (role === "rbs") {
    const sponsors = db.sponsors.filter((item) => item.eventId === eventId);
    const progress = sponsors.map((sponsor) => ({ sponsor, steps: clientProgress(db, eventId, sponsor) }));
    const doneSteps = progress.reduce((total, row) => total + row.steps.filter((step) => step.done).length, 0);
    const totalSteps = progress.reduce((total, row) => total + row.steps.length, 0);
    const donePct = totalSteps ? Math.round(doneSteps / totalSteps * 100) : 0;
    const destined = db.tickets.filter((item) => item.eventId === eventId).length;
    const credentials = sponsors.reduce((total, sponsor) => total + credentialTotal(credentialsFor(db, eventId, sponsor.tier, sponsor.id)), 0);
    return <><Heading title="Visão geral" text="Andamento da página de cada cliente neste evento." />
      <div className="stats"><Stat label="Clientes no evento" value={String(sponsors.length)} icon="users" /><Stat label="Abas concluídas" value={`${donePct}%`} icon="check" /><Stat label="Cortesias destinadas" value={String(destined)} icon="gift" /><Stat label="Credenciais liberadas" value={String(credentials)} icon="clipboard" /></div>
      <section className="table overview-table"><div className="table-title"><div><h2>Andamento por cliente</h2><span>Clique em uma aba para abrir a página do cliente</span></div></div>
        <div className="table-head overview-cols"><span>CLIENTE</span>{CLIENT_TABS.map((tab, index) => <span key={tab.page} title={tab.label}>{index + 1}. {tab.short.toUpperCase()}</span>)}<span>PROGRESSO</span></div>
        {progress.map(({ sponsor, steps }) => {
          const done = steps.filter((step) => step.done).length;
          return <div className="table-row overview-cols" key={sponsor.id}><div className="identity"><span>{avatarContent(sponsor.name, sponsor.avatar)}</span><div><strong>{sponsor.name}</strong><small>{sponsor.tier}</small></div></div>{CLIENT_TABS.map((tab) => steps.find((item) => item.page === tab.page)).map((step, i) => !step ? <span key={i} className="step-na" title="Não incluso nesta cota">—</span> : <Button variant="portal" size="portal" type="button" key={step.page} className={`step-dot ${step.done ? "done" : ""}`} title={`${step.label}: ${step.detail}`} aria-label={`${sponsor.name} · ${step.label}: ${step.done ? "concluído" : "pendente"}`} onClick={() => { selectSponsor(sponsor.id); go(step.page); }}><Icon name={step.done ? "check" : step.icon} size={14} /></Button>)}<span className="overview-progress"><span><i style={{ width: `${Math.round(done / steps.length * 100)}%` }} /></span><b>{done}/{steps.length}</b></span></div>;
        })}
        {!sponsors.length && <Empty text="Nenhum cliente cadastrado neste evento." />}
      </section></>;
  }
  const sponsor = db.sponsors.find((item) => item.id === sponsorId);
  if (!sponsor) return <Empty text="Nenhuma marca vinculada a este acesso." />;
  const steps = clientProgress(db, eventId, sponsor).filter((step) => allowedPages.includes(step.page));
  const done = steps.filter((step) => step.done).length;
  return <><Heading title="Visão geral" text={`Página de ${sponsor.name} · ${sponsor.tier}`} />
    <section className="panel client-steps"><div className="panel-title"><div><h2>Sua página no portal</h2><span>{done} de {steps.length} {steps.length === 1 ? "aba concluída" : "abas concluídas"}</span></div><span className="overview-progress wide"><span><i style={{ width: `${steps.length ? Math.round(done / steps.length * 100) : 0}%` }} /></span></span></div>
      {steps.map((step) => <div className="step-row" key={step.page}><span className={`step-num ${step.done ? "done" : ""}`}>{step.done ? <Icon name="check" size={14} /> : step.index}</span><div><strong>{step.label}</strong><small>{step.detail}</small></div><span className={`step-status ${step.done ? "done" : step.waiting ? "waiting" : ""}`}>{step.done ? "Concluído" : step.waiting ? "Aguardando RBS" : "Pendente"}</span><Button variant="portal" size="portal" className="outline" type="button" onClick={() => go(step.page)}>Abrir <Icon name="arrow" size={14} /></Button></div>)}
    </section></>;
}

function Stat({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  return <div className="stat"><span><Icon name={icon} /></span><div><small>{label}</small><strong>{value}</strong></div></div>;
}

function Events({ db, eventId, setEventId, role, update, open, edit }: { db: Database; eventId: string; setEventId: (id: string) => void; role: Role; update: (fn: (db: Database) => Database) => void; open: () => void; edit: (id: string) => void }) {
  const remove = (id: string) => {
    if (!confirm("Excluir este evento e todos os dados relacionados?")) return;
    update((current) => {
      const sponsorIds = current.sponsors.filter((item) => item.eventId === id).map((item) => item.id);
      return { ...current, events: current.events.filter((item) => item.id !== id), sponsors: current.sponsors.filter((item) => item.eventId !== id), users: current.users.filter((item) => !item.sponsorId || !sponsorIds.includes(item.sponsorId)), deliveries: current.deliveries.filter((item) => item.eventId !== id), files: current.files.filter((item) => item.eventId !== id), tickets: current.tickets.filter((item) => item.eventId !== id), credentials: current.credentials.filter((item) => item.eventId !== id), messages: current.messages.filter((item) => item.eventId !== id), contents: (current.contents ?? []).filter((item) => item.eventId !== id) };
    });
  };
  return <section className="hub-section" aria-labelledby="hub-events"><div className="hub-section-title"><div><span>1</span><div><h2 id="hub-events">Evento</h2><p>Edições do Planeta Atlântida. A edição ativa define as marcas e páginas abaixo.</p></div></div>{role === "rbs" && <Button variant="portal" size="portal" className="primary" type="button" onClick={open}><Icon name="plus" size={16} /> Novo evento</Button>}</div><div className="card-grid">{db.events.map((item) => <article className={`event-card ${eventId === item.id ? "selected" : ""}`} key={item.id}><div><span className={`event-status ${item.status.toLowerCase().replace(" ", "-")}`}><i />{item.status}</span><div className="row-actions"><Button variant="portal" size="portal" className="icon-button" type="button" title="Editar evento" onClick={() => edit(item.id)}><Icon name="edit" size={16} /></Button>{role === "rbs" && db.events.length > 1 && <Button variant="portal" size="portal" className="icon-button danger" title="Excluir evento" type="button" onClick={() => remove(item.id)}><Icon name="trash" size={16} /></Button>}</div></div><h2>{item.name}</h2><p><Icon name="calendar" size={15} />{item.dates}</p><Button variant="portal" size="portal" className={eventId === item.id ? "selected-button" : "outline"} type="button" onClick={() => setEventId(item.id)}>{eventId === item.id ? <><Icon name="check" size={15} /> Evento ativo</> : "Acessar evento"}</Button></article>)}</div></section>;
}

function Sponsors({ sponsors, update, eventId, selectedId, select, open, edit, notify }: { sponsors: Sponsor[]; update: (fn: (db: Database) => Database) => void; eventId: string; selectedId: string; select: (id: string) => void; open: () => void; edit: (id: string) => void; notify: (m: string) => void }) {
  const [search, setSearch] = useState("");
  const filtered = sponsors.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
  const remove = (id: string) => { if (!confirm("Excluir patrocinador e todos os dados vinculados?")) return; update((db) => ({ ...db, sponsors: db.sponsors.filter((item) => item.id !== id || item.eventId !== eventId), users: db.users.filter((item) => item.sponsorId !== id), deliveries: db.deliveries.filter((item) => item.sponsorId !== id || item.eventId !== eventId), files: db.files.filter((item) => item.sponsorId !== id || item.eventId !== eventId), tickets: db.tickets.filter((item) => item.sponsorId !== id || item.eventId !== eventId), credentials: db.credentials.filter((item) => item.sponsorId !== id || item.eventId !== eventId), messages: db.messages.filter((item) => item.sponsorId !== id || item.eventId !== eventId), contents: (db.contents ?? []).filter((item) => item.sponsorId !== id || item.eventId !== eventId) })); notify("Patrocinador removido"); };
  return <section className="hub-section" aria-labelledby="hub-sponsors"><div className="hub-section-title"><div><span>2</span><div><h2 id="hub-sponsors">Patrocinadores do evento</h2><p>Selecione uma marca para ver e editar o perfil dela logo abaixo.</p></div></div><Button variant="portal" size="portal" className="primary" type="button" onClick={open}><Icon name="plus" size={16} /> Cadastrar marca</Button></div><div className="toolbar"><div className="search"><Icon name="search" size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar marca..." /></div><span>{filtered.length} marcas</span></div><section className="table"><div className="table-head sponsor-cols"><span>MARCA / EMPRESA</span><span>COTA</span><span>CONTATO</span><span /></div>{filtered.map((item) => <div className={`table-row sponsor-cols ${item.id === selectedId ? "selected" : ""}`} key={item.id}><Button variant="portal" size="portal" type="button" className="identity row-select" aria-pressed={item.id === selectedId} title="Ver perfil do cliente" onClick={() => select(item.id)}><span>{avatarContent(item.name, item.avatar)}</span><strong>{item.name}</strong>{item.id === selectedId && <small>Perfil aberto</small>}</Button><span>{item.tier}</span><span>{item.contact}</span><div className="row-actions"><Button variant="portal" size="portal" className="icon-button" title="Editar marca" type="button" onClick={() => edit(item.id)}><Icon name="edit" size={16} /></Button><Button variant="portal" size="portal" className="icon-button danger" title="Excluir marca" type="button" onClick={() => remove(item.id)}><Icon name="trash" size={16} /></Button></div></div>)}{!filtered.length && <Empty text="Nenhuma marca adicionada a este evento." />}</section></section>;
}

function Deliveries({ db, eventId, sponsorId, role, update, notify, open }: { db: Database; eventId: string; sponsorId: string; role: Role; update: (fn: (db: Database) => Database) => void; notify: (m: string) => void; open: () => void }) {
  const deliveries = db.deliveries.filter((item) => item.eventId === eventId && item.sponsorId === sponsorId);
  const files = db.files.filter((item) => item.eventId === eventId && item.sponsorId === sponsorId);
  const [viewing, setViewing] = useState<StoredFile | null>(null);
  const changeStatus = (id: string, status: Status) => update((current) => ({ ...current, deliveries: current.deliveries.map((item) => item.id === id ? { ...item, status } : item) }));
  const upload = (file: File | undefined, delivery: Delivery) => {
    if (!file) return;
    if (file.size > 750_000) return notify("Use arquivos de até 750 KB neste MVP");
    const reader = new FileReader();
    reader.onload = () => {
      update((current) => ({
        ...current,
        files: [
          { id: uid(), eventId, sponsorId, deliveryId: delivery.id, name: file.name, category: delivery.category, size: formatBytes(file.size), data: String(reader.result), createdAt: new Date().toISOString() },
          ...current.files.filter((item) => item.deliveryId !== delivery.id),
        ],
        deliveries: current.deliveries.map((item) => item.id === delivery.id ? { ...item, status: "Em análise" } : item),
      }));
      notify("Arquivo enviado para análise");
    };
    reader.readAsDataURL(file);
  };
  const download = (file: StoredFile) => { const link = document.createElement("a"); link.href = file.data; link.download = file.name; link.click(); };
  return <><Heading title="Entregas e arquivos" text="Envie cada material diretamente na solicitação correspondente." action={role === "rbs" ? <Button variant="portal" size="portal" className="primary" type="button" onClick={open}><Icon name="plus" size={16} /> Nova entrega</Button> : undefined} /><section className="panel spaced"><div className="panel-title"><div><h2>Checklist de entregas</h2><span>{deliveries.length} itens</span></div></div>{deliveries.map((item) => {
    const attachedFile = files.find((file) => file.deliveryId === item.id);
    return <div className="delivery-row" key={item.id}><span className={`category ${item.category.toLowerCase()}`}>{item.category}</span><div className="delivery-info"><strong>{item.title}</strong><small>Prazo: {formatDate(item.dueDate)}</small>{attachedFile && <Button variant="portal" size="portal" className="attached-file" type="button" onClick={() => setViewing(attachedFile)}><Icon name="file" size={14} /><span>{attachedFile.name}</span><Icon name="download" size={14} /></Button>}</div><div className="delivery-actions"><label className={attachedFile ? "upload-inline replace" : "upload-inline"}><input type="file" onChange={(e) => upload(e.target.files?.[0], item)} /><Icon name="upload" size={15} />{attachedFile ? "Substituir" : "Enviar arquivo"}</label><select value={item.status} onChange={(e) => changeStatus(item.id, e.target.value as Status)}><option>Pendente</option><option>Em análise</option><option>Concluído</option></select></div>{role === "rbs" && <Button variant="portal" size="portal" className="icon-button danger" type="button" onClick={() => update((current) => ({ ...current, deliveries: current.deliveries.filter((delivery) => delivery.id !== item.id), files: current.files.filter((file) => file.deliveryId !== item.id) }))}><Icon name="trash" size={16} /></Button>}</div>;
  })}{!deliveries.length && <Empty text="Nenhuma entrega cadastrada para este patrocinador." />}</section><section className="table file-table"><div className="table-title"><h2>Arquivos enviados</h2><span>{files.length} arquivos</span></div><div className="table-head file-cols"><span>ARQUIVO</span><span>DATA</span><span>TAMANHO</span><span /></div>{files.map((file) => <div className="table-row file-cols" key={file.id}><div className="identity file-name"><span><Icon name="file" size={17} /></span><strong>{file.name}</strong></div><span>{new Date(file.createdAt).toLocaleDateString("pt-BR")}</span><span>{file.size}</span><div className="row-actions"><Button variant="portal" size="portal" className="icon-button" type="button" onClick={() => download(file)}><Icon name="download" size={16} /></Button><Button variant="portal" size="portal" className="icon-button danger" type="button" onClick={() => update((current) => ({ ...current, files: current.files.filter((item) => item.id !== file.id) }))}><Icon name="trash" size={16} /></Button></div></div>)}{!files.length && <Empty text="Nenhum arquivo enviado." />}</section>{viewing && <FileViewer file={viewing} close={() => setViewing(null)} />}</>;
}

function DeliveryCalendar({ db, eventId, sponsorId, role, go, update, notify, tier }: { db: Database; eventId: string; sponsorId: string; role: Role; go: (page: Page) => void; update?: (fn: (db: Database) => Database) => void; notify?: (m: string) => void; tier?: string }) {
  // A RBS pode criar uma tarefa direto no dia selecionado do calendário.
  const canAdd = role === "rbs" && !!update;
  const defaultTarget = `tier:${tier ?? db.sponsors.find((item) => item.id === sponsorId)?.tier ?? TIERS[0]}`;
  // Com uma cota escolhida, a agenda da RBS mostra só as marcas daquela cota.
  const tierIds = tier ? new Set(db.sponsors.filter((item) => item.eventId === eventId && item.tier === tier).map((item) => item.id)) : null;
  const [adding, setAdding] = useState(false);
  const [task, setTask] = useState({ title: "", category: "Mídia", target: defaultTarget });
  useEffect(() => { setTask((t) => ({ ...t, target: defaultTarget })); }, [sponsorId, tier]);
  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    const title = task.title.trim();
    if (!title || !update) return;
    const items = fanOut<Delivery>(db, eventId, task.target, (sid) => ({ eventId, sponsorId: sid, title: title.slice(0, 160), category: task.category, dueDate: selectedDate, status: "Pendente" }));
    if (!items.length) return notify?.(`Nenhuma marca na ${targetText(task.target, db)} neste evento.`);
    update((current) => ({ ...current, deliveries: [...current.deliveries, ...items] }));
    setTask({ ...task, title: "" });
    setAdding(false);
    notify?.(`Tarefa adicionada para ${targetText(task.target, db)} (${items.length} ${items.length === 1 ? "marca" : "marcas"}) em ${formatDate(selectedDate)}`);
  };
  // A agenda mostra os prazos de entrega e também os prazos dos arquivos solicitados pela RBS.
  // Para a RBS, cópias de uma mesma tarefa/solicitação por cota aparecem agrupadas em um item só.
  const deliveries = useMemo(() => {
    const raw: (Delivery & { who?: string })[] = [
      ...db.deliveries,
      ...(db.fileRequests ?? []).map((req) => ({ id: `req-${req.id}`, eventId: req.eventId, sponsorId: req.sponsorId, title: req.title, category: "Arquivo solicitado", dueDate: req.dueDate, status: (db.files.some((file) => file.requestId === req.id) ? "Concluído" : "Pendente") as Status, groupId: req.groupId ? `req-${req.groupId}` : undefined, tier: req.tier })),
    ].filter((item) => item.eventId === eventId && (role === "rbs" ? !tierIds || tierIds.has(item.sponsorId) : item.sponsorId === sponsorId));
    const nameOf = (id: string) => db.sponsors.find((sponsor) => sponsor.id === id)?.name ?? "Marca não encontrada";
    let list = raw;
    if (role === "rbs") {
      const groups = new Map<string, typeof raw>();
      for (const item of raw) { const key = item.groupId ?? item.id; groups.set(key, [...(groups.get(key) ?? []), item]); }
      list = [...groups.entries()].map(([key, items]) => {
        const first = items[0]!;
        const done = items.filter((item) => item.status === "Concluído").length;
        const status: Status = done === items.length ? "Concluído" : items.some((item) => item.status === "Em análise") ? "Em análise" : "Pendente";
        const who = first.tier ? `${tier ? "Todas as marcas" : `Cota ${first.tier}`} · ${done} de ${items.length} ${items.length === 1 ? "concluída" : "concluídas"}` : first.groupId ? `Exclusiva · ${nameOf(first.sponsorId)}` : nameOf(first.sponsorId);
        return { ...first, id: key, status, who };
      });
    }
    return list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [db.deliveries, db.fileRequests, db.files, db.sponsors, eventId, role, sponsorId, tier]);
  // A marca vê a solicitação do dia e entrega o arquivo direto pela agenda.
  const [viewing, setViewing] = useState<StoredFile | null>(null);
  const requestOf = (id: string) => id.startsWith("req-") ? (db.fileRequests ?? []).find((r) => `req-${r.id}` === id) : undefined;
  const deliver = (file: File | undefined, req: FileRequest) => {
    if (!file || !update) return;
    if (file.size > 750_000) return notify?.("Use arquivos de até 750 KB neste MVP");
    const reader = new FileReader();
    reader.onload = () => {
      update((current) => ({ ...current, files: [{ id: uid(), eventId, sponsorId: req.sponsorId, requestId: req.id, name: file.name, category: "Solicitação", size: formatBytes(file.size), data: String(reader.result), createdAt: new Date().toISOString(), uploadedBy: role, mediaType: req.mediaType } as StoredFile, ...current.files.filter((f) => f.requestId !== req.id)] }));
      notify?.(`Arquivo de ${req.title} entregue`);
    };
    reader.readAsDataURL(file);
  };
  const firstDate = deliveries[0]?.dueDate ?? new Date().toISOString().slice(0, 10);
  const [month, setMonth] = useState(() => monthFromDate(firstDate));
  const [selectedDate, setSelectedDate] = useState(firstDate);

  useEffect(() => {
    const nextDate = deliveries[0]?.dueDate ?? new Date().toISOString().slice(0, 10);
    setMonth(monthFromDate(nextDate));
    setSelectedDate(nextDate);
  }, [eventId, sponsorId, tier]);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const leadingDays = new Date(year, monthIndex, 1).getDay();
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const monthDeliveries = deliveries.filter((item) => item.dueDate.startsWith(monthKey));
  const selectedDeliveries = deliveries.filter((item) => item.dueDate === selectedDate);
  const moveMonth = (offset: number) => {
    const next = new Date(year, monthIndex + offset, 1);
    setMonth(next);
    setSelectedDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`);
  };
  const cells = Array.from({ length: leadingDays + totalDays }, (_, index) => index < leadingDays ? null : index - leadingDays + 1);

  return <><Heading title="Agenda de entregas" text="Acompanhe prazos e organize as solicitações no calendário do evento." action={role === "rbs" ? undefined : <Button variant="portal" size="portal" className="outline" type="button" onClick={() => go("deliveries")}><Icon name="clipboard" size={16} /> Ver checklist</Button>} /><div className="calendar-summary"><span><strong>{monthDeliveries.length}</strong> entregas no mês</span><span><i className="pending" />{monthDeliveries.filter((item) => item.status === "Pendente").length} pendentes</span><span><i className="review" />{monthDeliveries.filter((item) => item.status === "Em análise").length} em análise</span><span><i className="done" />{monthDeliveries.filter((item) => item.status === "Concluído").length} concluídas</span></div><div className="calendar-layout"><section className="panel calendar-panel"><div className="calendar-header"><Button variant="portal" size="portal" className="icon-button calendar-previous" type="button" onClick={() => moveMonth(-1)} title="Mês anterior"><Icon name="arrow" size={16} /></Button><div><span>CALENDÁRIO</span><h2>{month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h2></div><Button variant="portal" size="portal" className="icon-button" type="button" onClick={() => moveMonth(1)} title="Próximo mês"><Icon name="arrow" size={16} /></Button></div><div className="calendar-weekdays">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{cells.map((day, index) => {
    if (!day) return <span className="calendar-empty" key={`empty-${index}`} />;
    const date = `${monthKey}-${String(day).padStart(2, "0")}`;
    const dayDeliveries = deliveries.filter((item) => item.dueDate === date);
    return <Button variant="portal" size="portal" type="button" className={`${selectedDate === date ? "selected " : ""}${dayDeliveries.length ? "has-deliveries" : ""}`} key={date} onClick={() => setSelectedDate(date)}><span>{day}</span><div>{dayDeliveries.slice(0, 3).map((item) => <i className={statusClass(item.status)} key={item.id} />)}</div>{dayDeliveries.length > 3 && <small>+{dayDeliveries.length - 3}</small>}</Button>;
  })}</div></section><section className="panel agenda-panel"><div className="panel-title"><div><h2>{formatLongDate(selectedDate)}</h2><span>{selectedDeliveries.length} {selectedDeliveries.length === 1 ? "entrega" : "entregas"}</span></div>{canAdd && !adding && <Button variant="portal" size="portal" className="primary" type="button" onClick={() => setAdding(true)}><Icon name="plus" size={15} /> Nova tarefa</Button>}</div>{canAdd && adding && <form className="panel-form compact" aria-label="Nova tarefa" onSubmit={addTask}><Field label="Tarefa"><input required autoFocus maxLength={160} value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} placeholder="Ex.: Aprovar arte do telão" /></Field><div className="fields"><TargetSelect db={db} eventId={eventId} tier={tier} value={task.target} onChange={(target) => setTask({ ...task, target })} /><Field label="Categoria"><select value={task.category} onChange={(e) => setTask({ ...task, category: e.target.value })}><option>Mídia</option><option>Marca</option><option>Contrato</option><option>Outro</option></select></Field></div><small className="agenda-form-date">Data de entrega: {formatDate(selectedDate)}</small><div className="panel-form-actions"><Button variant="portal" size="portal" className="outline" type="button" onClick={() => { setAdding(false); setTask({ ...task, title: "" }); }}>Cancelar</Button><Button variant="portal" size="portal" className="primary" type="submit" disabled={!task.title.trim()}><Icon name="plus" size={15} /> Adicionar</Button></div></form>}<div className="agenda-list">{selectedDeliveries.map((item) => <div className="agenda-item" key={item.id}><div className={`agenda-marker ${statusClass(item.status)}`}><Icon name={item.status === "Concluído" ? "check" : "calendar"} size={15} /></div><div><span>{item.category}</span><strong>{item.title}</strong>{role === "rbs" && <small>{item.who}</small>}{role !== "rbs" && (() => { const req = requestOf(item.id); if (!req) return null; const file = db.files.find((f) => f.requestId === req.id); return <div className="agenda-request">{req.description && <small>{req.description}</small>}<div className="delivery-actions">{file && <Button variant="portal" size="portal" className="attached-file" type="button" onClick={() => setViewing(file)}><Icon name="file" size={14} /><span>{file.name}</span></Button>}<label className={file ? "upload-inline replace" : "upload-inline"}><input type="file" onChange={(e) => deliver(e.target.files?.[0], req)} /><Icon name="upload" size={15} />{file ? "Substituir" : "Enviar arquivo"}</label></div></div>; })()}</div><StatusBadge status={item.status} /></div>)}{!selectedDeliveries.length && <Empty text="Nenhuma entrega programada para este dia." />}</div></section></div>{viewing && <FileViewer file={viewing} close={() => setViewing(null)} />}</>;
}

function ContactPage({ db, eventId, sponsorId, role, user, topic, setTopic, update, notify }: { db: Database; eventId: string; sponsorId: string; role: Role; user: User; topic: MessageTopic; setTopic: (topic: MessageTopic) => void; selectedUserId: string; setSelectedUserId: (id: string) => void; update: (fn: (db: Database) => Database) => void; notify: (m: string) => void }) {
  const [text, setText] = useState("");
  const sponsor = db.sponsors.find((item) => item.id === sponsorId);
  const rbsContacts = db.users.filter((item) => item.role === "rbs");
  const conversationMessages = db.messages.filter((message) => message.eventId === eventId && message.sponsorId === sponsorId);
  const messages = conversationMessages.filter((message) => message.topic === topic).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const selectTopic = (nextTopic: MessageTopic) => {
    setTopic(nextTopic);
    update((current) => ({
      ...current,
      messages: current.messages.map((message) => {
        if (message.eventId !== eventId || message.sponsorId !== sponsorId || message.topic !== nextTopic) return message;
        return role === "rbs" && message.senderRole === "sponsor"
          ? { ...message, readByRbs: true }
          : role === "sponsor" && message.senderRole === "rbs"
            ? { ...message, readBySponsor: true }
            : message;
      }),
    }));
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const message = text.trim();
    if (!message || !sponsorId) return;
    update((current) => ({
      ...current,
      messages: [...current.messages, {
        id: uid(),
        eventId,
        sponsorId,
        senderId: user.id,
        senderRole: role,
        senderName: user.name,
        topic,
        text: message,
        createdAt: new Date().toISOString(),
        readByRbs: role === "rbs",
        readBySponsor: role === "sponsor",
      }],
    }));
    setText("");
    notify("Mensagem enviada no chat geral");
  };
  return <>
    <Heading title="Contato" text="Um único chat geral entre a marca e a equipe RBS, com os canais diretos da equipe logo abaixo." />
    <div className="message-topics">{MESSAGE_TOPICS.map((item) => {
      const count = conversationMessages.filter((message) => message.topic === item.id).length;
      return <Button variant="portal" size="portal" className={topic === item.id ? "active" : ""} type="button" key={item.id} onClick={() => selectTopic(item.id)}><Icon name={item.icon} size={16} /><span>{item.label}</span>{count > 0 && <small>{count}</small>}</Button>;
    })}</div>
    {role === "rbs" && <RbsContactEditor db={db} user={user} update={update} notify={notify} />}
    <section className="panel conversation general-contact-conversation">
      <div className="conversation-header"><div className="identity"><span><Icon name="message" size={17} /></span><div><strong>Chat geral · {sponsor?.name ?? "Marca patrocinadora"}</strong><small>{role === "rbs" ? "Equipe RBS e todos os responsáveis da marca" : "Sua marca e a equipe RBS"}</small></div></div><span><i /> Canal compartilhado</span></div>
      <div className="message-list">{messages.map((message, index) => {
        const own = message.senderId ? message.senderId === user.id : message.senderRole === role;
        const previous = messages[index - 1];
        const showDate = !previous || new Date(previous.createdAt).toLocaleDateString("pt-BR") !== new Date(message.createdAt).toLocaleDateString("pt-BR");
        return <div className="message-entry" key={message.id}>{showDate && <div className="message-date">{formatMessageDate(message.createdAt)}</div>}<div className={`message-bubble ${own ? "own" : ""}`}><span>{message.text}</span><small>{own ? "Você" : message.senderName} • {new Date(message.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</small></div></div>;
      })}{!messages.length && <div className="conversation-empty"><span><Icon name="message" size={24} /></span><strong>Nenhuma mensagem no chat geral</strong><p>Use este canal para centralizar os alinhamentos entre a marca e toda a equipe RBS.</p></div>}</div>
      <form className="message-form" onSubmit={submit}><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Mensagem para o chat geral..." aria-label="Mensagem no chat geral" /><Button variant="portal" size="portal" className="primary" type="submit" disabled={!text.trim() || !sponsorId}><Icon name="send" size={16} /> Enviar</Button></form>
    </section>
    <section className="table contact-directory">
      <div className="table-title"><div><h2>Contatos da equipe RBS</h2><span>Use estes canais caso prefira falar diretamente com um funcionário por WhatsApp ou e-mail.</span></div></div>
      <div className="table-head contact-directory-cols"><span>NOME</span><span>RESPONSABILIDADE</span><span>WHATSAPP</span><span>E-MAIL</span><span /></div>
      {rbsContacts.map((contact) => { const number = (contact.phone ?? "").replace(/\D/g, ""); return <div className="table-row contact-directory-cols" key={contact.id}><div className="identity"><span>{initials(contact.name)}</span><strong>{contact.name}</strong></div><span>{contact.responsibility || "Equipe RBS"}</span><span>{contact.phone || "Não informado"}</span><span>{contact.email}</span><div className="row-actions">{number.length >= 10 && <a className="whatsapp-link compact" href={`https://wa.me/${number}`} target="_blank" rel="noreferrer noopener"><Icon name="message" size={14} /> WhatsApp</a>}<a className="outline contact-email-link" href={`mailto:${contact.email}`}>E-mail</a></div></div>; })}
      {!rbsContacts.length && <Empty text="Nenhum contato da equipe RBS cadastrado." />}
    </section>
  </>;
}

function RbsContactEditor({ db, user, update, notify }: { db: Database; user: User; update: (fn: (db: Database) => Database) => void; notify: (message: string) => void }) {
  const contacts = db.users.filter((item) => item.role === "rbs");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState({ name: "", responsibility: "", phone: "", email: "" });
  const start = (contact?: User) => {
    setEditingId(contact?.id ?? "new");
    setForm({ name: contact?.name ?? "", responsibility: contact?.responsibility ?? "", phone: contact?.phone ?? "", email: contact?.email ?? "" });
  };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    const responsibility = form.responsibility.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();
    if (!name || !responsibility || !email) return notify("Informe nome, responsabilidade e e-mail do contato.");
    if (phone && phone.replace(/\D/g, "").length < 10) return notify("Informe um número de WhatsApp válido com DDD.");
    if (db.users.some((item) => item.id !== editingId && item.email.toLowerCase() === email.toLowerCase())) return notify("Este e-mail já está cadastrado no portal.");
    update((current) => ({ ...current, users: editingId === "new" ? [...current.users, { id: uid(), name: name.slice(0, 120), responsibility: responsibility.slice(0, 120), phone: phone.slice(0, 30), email: email.slice(0, 160), password: "", role: "rbs" }] : current.users.map((item) => item.id === editingId ? { ...item, name: name.slice(0, 120), responsibility: responsibility.slice(0, 120), phone: phone.slice(0, 30), email: email.slice(0, 160) } : item) }));
    setEditingId(null);
    notify(editingId === "new" ? "Contato da equipe RBS cadastrado" : "Contato da equipe RBS atualizado");
  };
  const remove = (contact: User) => {
    if (contact.id === user.id) return notify("O contato usado na sessão atual não pode ser excluído.");
    if (!confirm(`Excluir o contato de ${contact.name}?`)) return;
    update((current) => ({ ...current, users: current.users.filter((item) => item.id !== contact.id) }));
    notify("Contato da equipe RBS removido");
  };
  return <section className="panel rbs-contact-editor">
    <div className="panel-title"><div><h2>Contatos da equipe RBS</h2><span>Cadastre as pessoas que podem atender as marcas por e-mail ou WhatsApp.</span></div>{!editingId && <Button variant="portal" size="portal" className="primary" type="button" onClick={() => start()}><Icon name="plus" size={15} /> Cadastrar contato</Button>}</div>
    {editingId && <form className="panel-form rbs-contact-form" onSubmit={save}><Field label="Nome"><input required autoFocus maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Responsabilidade"><input required maxLength={120} value={form.responsibility} onChange={(e) => setForm({ ...form, responsibility: e.target.value })} placeholder="Ex.: Atendimento aos patrocinadores" /></Field><Field label="WhatsApp com DDD"><input type="tel" maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Ex.: +55 51 99999-9999" /></Field><Field label="E-mail"><input required type="email" maxLength={160} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field><div className="panel-form-actions"><Button variant="portal" size="portal" className="outline" type="button" onClick={() => setEditingId(null)}>Cancelar</Button><Button variant="portal" size="portal" className="primary" type="submit">{editingId === "new" ? "Cadastrar contato" : "Salvar alterações"}</Button></div></form>}
    <div className="rbs-team-list">{contacts.map((contact) => <div className="rbs-contact-preview" key={contact.id}><span>{initials(contact.name)}</span><div><strong>{contact.name}{contact.id === user.id && <small className="current-user">Você</small>}</strong><small>{contact.responsibility || "Responsabilidade ainda não informada"}</small><p>{contact.phone || "WhatsApp ainda não informado"} · {contact.email}</p></div><div className="row-actions"><Button variant="portal" size="portal" className="icon-button" type="button" title="Editar contato" onClick={() => start(contact)}><Icon name="edit" size={15} /></Button><Button variant="portal" size="portal" className="icon-button danger" type="button" disabled={contact.id === user.id} title={contact.id === user.id ? "Contato da sessão atual" : "Excluir contato"} onClick={() => remove(contact)}><Icon name="trash" size={15} /></Button></div></div>)}</div>
  </section>;
}

function Reports({ db, eventId, sponsorId, role, update, notify }: { db: Database; eventId: string; sponsorId: string; role: Role; update: (fn: (db: Database) => Database) => void; notify: (message: string) => void }) {
  const inScope = (item: { eventId: string; sponsorId: string }) => item.eventId === eventId && (role === "rbs" || item.sponsorId === sponsorId);
  const deliveries = db.deliveries
    .filter((item) => inScope(item) && item.status === "Concluído")
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate) || a.category.localeCompare(b.category));
  const instagramMetrics = (db.metrics ?? []).filter(inScope).sort((a, b) => b.date.localeCompare(a.date));
  const mediaRows = [
    ...db.files.filter((item) => inScope(item) && item.slot === "media-report").map((item) => ({ id: item.id, sponsorId: item.sponsorId, at: item.createdAt, mediaType: mediaTypeOf(item), format: "Arquivo", title: item.name, reference: "" })),
    ...(db.contents ?? []).filter((item) => inScope(item) && item.kind === "link").map((item) => ({ id: item.id, sponsorId: item.sponsorId, at: item.createdAt, mediaType: mediaTypeOf(item), format: "Link", title: item.title, reference: item.url ?? "" })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const surveyAnswers = useSurveyAnswers().filter((item) => item.eventId === eventId && (role === "rbs" || item.sponsorId === sponsorId)).sort((a, b) => b.at.localeCompare(a.at));
  const categories = new Set(deliveries.map((item) => item.category));
  const months = new Set(deliveries.map((item) => item.dueDate.slice(0, 7)));
  const brands = new Set(deliveries.map((item) => item.sponsorId));
  const monthlyTotals = deliveries.reduce<Record<string, number>>((totals, item) => {
    const key = `${item.dueDate.slice(0, 7)}|${item.category}`;
    totals[key] = (totals[key] ?? 0) + 1;
    return totals;
  }, {});
  const sponsorName = (id: string) => db.sponsors.find((item) => item.id === id)?.name ?? "Marca não encontrada";
  const monthLabel = (date: string) => new Date(`${date.slice(0, 7)}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const downloadCsv = (name: string, rows: unknown[][]) => downloadExcel(`${name}-${eventId}.xlsx`, rows);
  const downloadDeliveries = () => downloadCsv("relatorio-entregas-por-tipo", [
      ["Data", "Mês", "Entrega realizada", "Tipo", "Marca", "Total concluído do tipo no mês"],
      ...deliveries.map((item) => [formatDate(item.dueDate), monthLabel(item.dueDate), item.title, item.category, sponsorName(item.sponsorId), monthlyTotals[`${item.dueDate.slice(0, 7)}|${item.category}`] ?? 0]),
  ]);
  const downloadInstagram = () => downloadCsv("relatorio-metricas-instagram", [
    ["Data", "Marca", "Origem", "Novos seguidores", "Postagens", "Curtidas", "Compartilhamentos", "Comentários", "Alcance"],
    ...instagramMetrics.map((item) => [formatDate(item.date), sponsorName(item.sponsorId), item.source === "instagram" ? "Instagram" : "Manual", item.newFollowers, item.posts, item.likes, item.shares, item.comments, item.reach]),
  ]);
  const downloadMedia = () => downloadCsv("relatorio-midias", [
    ["Data", "Marca", "Tipo de mídia", "Formato", "Item", "Referência"],
    ...mediaRows.map((item) => [new Date(item.at).toLocaleDateString("pt-BR"), sponsorName(item.sponsorId), MEDIA_TYPES.find((type) => type.id === item.mediaType)?.title ?? item.mediaType, item.format, item.title, item.reference]),
  ]);
  const downloadSurvey = () => downloadCsv("relatorio-pesquisa-satisfacao", [
    ["Data", "Marca", "Nota média", "Atendimento", "Organização", "Espaço", "Comentário"],
    ...surveyAnswers.map((item) => [new Date(item.at).toLocaleString("pt-BR"), sponsorName(item.sponsorId), item.rating, item.scores?.atendimento ?? "", item.scores?.organizacao ?? "", item.scores?.espaco ?? "", item.comment]),
  ]);
  const generalRows = db.sponsors.filter((item) => item.eventId === eventId).map((sponsor) => {
    const sponsorDeliveries = db.deliveries.filter((item) => item.eventId === eventId && item.sponsorId === sponsor.id && item.status === "Concluído");
    const sponsorMetrics = (db.metrics ?? []).filter((item) => item.eventId === eventId && item.sponsorId === sponsor.id);
    const sponsorMedia = mediaRows.filter((item) => item.sponsorId === sponsor.id);
    const sponsorSurvey = surveyAnswers.filter((item) => item.sponsorId === sponsor.id);
    const satisfaction = sponsorSurvey.length ? Math.round(sponsorSurvey.reduce((sum, item) => sum + item.rating, 0) / sponsorSurvey.length * 10) / 10 : "";
    const sumMetric = (key: keyof DailyMetric) => sponsorMetrics.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
    return [sponsor.name, sponsor.tier, sponsorDeliveries.length, sponsorMedia.length, sumMetric("newFollowers"), sumMetric("posts"), sumMetric("likes"), sumMetric("shares"), sumMetric("comments"), sumMetric("reach"), sponsorSurvey.length, satisfaction, db.tickets.filter((item) => item.eventId === eventId && item.sponsorId === sponsor.id).length, staffOf(db, eventId, sponsor.id).length];
  });
  const downloadGeneral = () => downloadCsv("relatorio-geral-do-evento", [
    ["Marca", "Cota", "Entregas concluídas", "Mídias publicadas", "Novos seguidores", "Postagens", "Curtidas", "Compartilhamentos", "Comentários", "Alcance", "Respostas da pesquisa", "Satisfação média", "Cortesias destinadas", "Pessoas credenciadas"],
    ...generalRows,
  ]);
  const reportCsv = (rows: unknown[][]) => `\uFEFF${rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(";")).join("\n")}`;
  const generalColumns = ["Marca", "Cota", "Entregas concluídas", "Mídias publicadas", "Novos seguidores", "Postagens", "Curtidas", "Compartilhamentos", "Comentários", "Alcance", "Respostas da pesquisa", "Satisfação média", "Cortesias destinadas", "Pessoas credenciadas"];
  const deliveryTypeRows = Object.entries(db.deliveries.filter((item) => item.eventId === eventId && item.status === "Concluído").reduce<Record<string, { count: number; brands: Set<string> }>>((acc, item) => { const key = item.category || "Sem tipo"; if (!acc[key]) acc[key] = { count: 0, brands: new Set() }; acc[key].count++; acc[key].brands.add(item.sponsorId); return acc; }, {})).sort(([a], [b]) => a.localeCompare(b)).map(([type, value]) => [type, value.count, value.brands.size]);
  const saveReport = (kind: SavedGeneralReport["kind"]) => {
    const rows = kind === "general" ? [generalColumns, ...generalRows] : [["Tipo de entrega", "Total concluído", "Marcas com entrega concluída"], ...deliveryTypeRows];
    const name = `${kind === "general" ? "relatorio-geral" : "relatorio-geral-por-tipo"}-${eventId}-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    const report: SavedGeneralReport = { id: uid(), eventId, createdAt: new Date().toISOString(), kind, name, csv: reportCsv(rows) };
    update((current) => ({ ...current, savedGeneralReports: [...(current.savedGeneralReports ?? []), report] }));
    notify("Relatório salvo no portal");
  };
  const savedReports = (db.savedGeneralReports ?? []).filter((report) => report.eventId === eventId);
  const downloadSaved = (report: SavedGeneralReport) => downloadExcel(report.name, savedCsvRows(report.csv), report.kind === "general" ? "Relatório geral" : "Por tipo");
  return <>
    <Heading title="Relatório" text={role === "rbs" ? "Baixe tabelas gerais do evento ou relatórios específicos de todas as marcas para análise no Excel." : "Consulte as entregas concluídas e baixe tabelas específicas para análise no Excel."} />
    {role === "rbs" && <section className="panel" style={{ marginBottom: 16 }}><div className="panel-title"><div><h2>Salvar relatórios consolidados</h2><span>Guarde um retrato dos dados do evento no momento da geração.</span></div></div><div style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: 16 }}><Button variant="portal" size="portal" className="primary" type="button" onClick={() => saveReport("general")}>Salvar relatório geral</Button><Button variant="portal" size="portal" className="outline" type="button" onClick={() => saveReport("delivery-type")}>Salvar geral por tipo de entrega</Button></div><div style={{ padding: 16 }}><h3>Relatórios salvos</h3>{savedReports.map((report) => <div key={report.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 0", flexWrap: "wrap" }}><span>{report.kind === "general" ? "Geral" : "Por tipo de entrega"} · {new Date(report.createdAt).toLocaleString("pt-BR")}</span><div style={{ display: "flex", gap: 8 }}><Button variant="portal" size="portal" className="outline" type="button" onClick={() => downloadSaved(report)}>Baixar Excel</Button><Button variant="portal" size="portal" className="outline" type="button" onClick={() => { if (confirm("Excluir relatório salvo?")) update((current) => ({ ...current, savedGeneralReports: (current.savedGeneralReports ?? []).filter((r) => r.id !== report.id) })); }}>Excluir</Button></div></div>)}{!savedReports.length && <p>Nenhum relatório salvo neste evento.</p>}</div></section>}
    <section className="report-downloads" aria-label="Tabelas disponíveis para download">
      {role === "rbs" && <article className="general-download"><span><Icon name="users" size={18} /></span><div><strong>Dados gerais do evento</strong><small>{generalRows.length} marcas · entregas, mídias, Instagram, pesquisa, cortesias e credenciamento.</small></div><Button variant="portal" size="portal" className="primary" type="button" onClick={downloadGeneral} disabled={!generalRows.length}><Icon name="download" size={15} /> Baixar tabela geral</Button></article>}
      <article><span><Icon name="clipboard" size={18} /></span><div><strong>Entregas por tipo</strong><small>{deliveries.length} entregas concluídas, com soma mensal por tipo.</small></div><Button variant="portal" size="portal" className="outline" type="button" onClick={downloadDeliveries} disabled={!deliveries.length}><Icon name="download" size={15} /> Baixar tabela</Button></article>
      <article><span><Icon name="chart" size={18} /></span><div><strong>Métricas do Instagram</strong><small>{instagramMetrics.length} registros diários de alcance e engajamento.</small></div><Button variant="portal" size="portal" className="outline" type="button" onClick={downloadInstagram} disabled={!instagramMetrics.length}><Icon name="download" size={15} /> Baixar tabela</Button></article>
      <article><span><Icon name="image" size={18} /></span><div><strong>Mídias</strong><small>{mediaRows.length} arquivos e links de mídia publicados.</small></div><Button variant="portal" size="portal" className="outline" type="button" onClick={downloadMedia} disabled={!mediaRows.length}><Icon name="download" size={15} /> Baixar tabela</Button></article>
      <article><span><Icon name="star" size={18} /></span><div><strong>Pesquisa de satisfação</strong><small>{surveyAnswers.length} respostas recebidas do público.</small></div><Button variant="portal" size="portal" className="outline" type="button" onClick={downloadSurvey} disabled={!surveyAnswers.length}><Icon name="download" size={15} /> Baixar tabela</Button></article>
    </section>
    <div className="stats"><Stat label="Entregas concluídas" value={String(deliveries.length)} icon="check" /><Stat label="Tipos realizados" value={String(categories.size)} icon="clipboard" /><Stat label="Meses com conclusão" value={String(months.size)} icon="calendar" /><Stat label={role === "rbs" ? "Marcas atendidas" : "Marca"} value={role === "rbs" ? String(brands.size) : deliveries.length ? "1" : "0"} icon="users" /></div>
    <section className="table delivery-report-table">
      <div className="table-title"><div><h2>Realizações concluídas por mês e tipo</h2><span>{deliveries.length} {deliveries.length === 1 ? "entrega concluída" : "entregas concluídas"} · exportação compatível com Excel</span></div></div>
      <div className="table-head delivery-report-cols"><span>DATA</span><span>MÊS</span><span>ENTREGA REALIZADA</span><span>TIPO</span><span>MARCA</span><span>TOTAL / MÊS</span></div>
      {deliveries.map((item) => <div className="table-row delivery-report-cols" key={item.id}><span>{formatDate(item.dueDate)}</span><span className="month-cell">{monthLabel(item.dueDate)}</span><strong>{item.title}</strong><span>{item.category}</span><span>{sponsorName(item.sponsorId)}</span><strong className="monthly-total">{monthlyTotals[`${item.dueDate.slice(0, 7)}|${item.category}`] ?? 0}</strong></div>)}
      {!deliveries.length && <Empty text="Nenhuma entrega concluída neste evento." />}
    </section>
  </>;
}

function Users({ db, sponsorId, userId, update, open, edit, canManage = true }: { db: Database; sponsorId: string; userId: string; update: (fn: (db: Database) => Database) => void; open: () => void; edit: (id: string) => void; canManage?: boolean }) {
  const users = db.users.filter((item) => item.role === "sponsor" && item.sponsorId === sponsorId);
  return <section className="table access-table"><div className="table-title"><div><h2>E-mails com acesso</h2><span>Cada e-mail liberado pela RBS entra no portal como administrador da marca.</span></div>{canManage && <Button variant="portal" size="portal" className="primary" type="button" onClick={open} disabled={!sponsorId}><Icon name="plus" size={16} /> Liberar e-mail</Button>}</div><div className="table-head user-cols"><span>NOME</span><span>E-MAIL</span><span>ACESSO</span><span /></div>{users.map((item) => <div className="table-row user-cols" key={item.id}><div><strong>{item.name}</strong>{item.id === userId && <small className="current-user">Você</small>}</div><span>{item.email}</span><span className={`role-badge ${item.accessLevel ?? "admin"}`}>{ACCESS_LABELS[item.accessLevel ?? "admin"]}</span>{canManage ? <div className="row-actions"><Button variant="portal" size="portal" title="Editar acesso" className="icon-button" type="button" onClick={() => edit(item.id)}><Icon name="edit" size={16} /></Button><Button variant="portal" size="portal" disabled={item.id === userId} title={item.id === userId ? "Você não pode excluir seu próprio acesso" : "Remover acesso"} className="icon-button danger" type="button" onClick={() => { if (!confirm(`Remover o acesso de ${item.email}?`)) return; update((current) => ({ ...current, users: current.users.filter((user) => user.id !== item.id), messages: current.messages.filter((message) => message.participantUserId !== item.id) })); }}><Icon name="trash" size={16} /></Button></div> : <span />}</div>)}{!users.length && <Empty text="Nenhum e-mail liberado para este cliente." />}</section>;
}

function FormShell({ title, close, submit, children, action = "Salvar" }: { title: string; close: () => void; submit: (e: React.FormEvent) => void; children: React.ReactNode; action?: string }) {
  return <Modal title={title} onClose={close}><form className="form" onSubmit={submit}>{children}<div className="form-actions"><Button variant="portal" size="portal" className="outline" type="button" onClick={close}>Cancelar</Button><Button variant="portal" size="portal" className="primary" type="submit">{action}</Button></div></form></Modal>;
}

function EventForm({ close, update, setEventId, editingEvent, notify }: { close: () => void; update: (fn: (db: Database) => Database) => void; setEventId: (id: string) => void; editingEvent?: EventEdition; notify: (m: string) => void }) {
  const [form, setForm] = useState({ name: editingEvent?.name ?? "", dates: editingEvent?.dates ?? "", status: editingEvent?.status ?? "Planejamento" as EventEdition["status"] });
  const editing = Boolean(editingEvent);
  return <FormShell title={editing ? "Editar evento" : "Novo evento"} close={close} action={editing ? "Salvar alterações" : "Criar evento"} submit={(e) => {
    e.preventDefault();
    const id = editingEvent?.id ?? uid();
    update((db) => ({ ...db, events: editingEvent ? db.events.map((item) => item.id === editingEvent.id ? { id, ...form } : item) : [...db.events, { id, ...form }] }));
    setEventId(id);
    close();
    notify(editing ? "Evento atualizado" : "Evento criado");
  }}><Field label="Nome"><input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Planeta Atlântida 2027" /></Field><div className="fields"><Field label="Datas"><input required value={form.dates} onChange={(e) => setForm({ ...form, dates: e.target.value })} placeholder="05 — 06 fev" /></Field><Field label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EventEdition["status"] })}><option>Planejamento</option><option>Em andamento</option><option>Encerrado</option></select></Field></div></FormShell>;
}
function SponsorForm({ close, update, eventId, setSponsorId, editingSponsor, notify }: { close: () => void; update: (fn: (db: Database) => Database) => void; eventId: string; setSponsorId: (id: string) => void; editingSponsor?: Sponsor; notify: (m: string) => void }) {
  const [form, setForm] = useState({ name: editingSponsor?.name ?? "", tier: editingSponsor?.tier ?? "Master", contact: editingSponsor?.contact ?? "" });
  const editing = Boolean(editingSponsor);
  return <FormShell title={editing ? "Editar marca" : "Cadastrar marca no evento"} close={close} action={editing ? "Salvar alterações" : "Cadastrar marca"} submit={(e) => {
    e.preventDefault();
    const id = editingSponsor?.id ?? uid();
    update((db) => ({ ...db, sponsors: editingSponsor ? db.sponsors.map((item) => item.id === editingSponsor.id ? { ...item, ...form } : item) : [...db.sponsors, { id, eventId, ...form }] }));
    setSponsorId(id);
    close();
    notify(editing ? "Marca atualizada" : "Marca cadastrada no evento");
  }}><Field label="Marca / empresa"><input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome da marca" /></Field><div className="fields"><Field label="Cota"><select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>{TIERS.map((tier) => <option key={tier}>{tier}</option>)}</select></Field><Field label="Contato responsável"><input required value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="Nome do responsável" /></Field></div></FormShell>;
}
function DeliveryForm({ close, update, eventId, sponsorId, notify }: { close: () => void; update: (fn: (db: Database) => Database) => void; eventId: string; sponsorId: string; notify: (m: string) => void }) {
  const [form, setForm] = useState({ title: "", category: "Marca", dueDate: "" });
  return <FormShell title="Nova entrega" close={close} action="Adicionar" submit={(e) => { e.preventDefault(); update((db) => ({ ...db, deliveries: [...db.deliveries, { id: uid(), eventId, sponsorId, ...form, status: "Pendente" }] })); close(); notify("Entrega adicionada"); }}><Field label="Descrição"><input required autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field><div className="fields"><Field label="Categoria"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>Marca</option><option>Mídia</option><option>Contrato</option><option>Outro</option></select></Field><Field label="Prazo"><input required type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field></div></FormShell>;
}
function UserForm({ close, update, sponsor, users, editingUser, notify }: { close: () => void; update: (fn: (db: Database) => Database) => void; sponsor?: Sponsor; users: User[]; editingUser?: User; notify: (m: string) => void }) {
  const [form, setForm] = useState({ name: editingUser?.name ?? "", email: editingUser?.email ?? "", password: "", accessLevel: editingUser?.accessLevel ?? "admin" as SponsorAccess, responsibility: editingUser?.responsibility ?? "", phone: editingUser?.phone ?? "" });
  const [error, setError] = useState("");
  const editing = Boolean(editingUser);
  return <FormShell title={editing ? "Editar acesso" : "Liberar e-mail de acesso"} close={close} action={editing ? "Salvar alterações" : "Liberar acesso"} submit={async (e) => {
    e.preventDefault();
    if (!sponsor) return setError("Selecione uma marca antes de cadastrar o usuário.");
    if (users.some((item) => item.id !== editingUser?.id && item.email.toLowerCase() === form.email.trim().toLowerCase())) return setError("Este e-mail já possui acesso ao portal.");
    if (form.phone.trim() && form.phone.replace(/\D/g, "").length < 10) return setError("Informe um número de WhatsApp válido com DDD.");
    try {
      await backend.saveBrandUser({ frontendSponsorId: sponsor.id, sponsorName: sponsor.name, tier: sponsor.tier,
        nome: form.name.trim(), email: form.email.trim(), senha: form.password,
        previousEmail: editingUser?.email });
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível cadastrar o acesso no servidor."); return; }
    if (editingUser) {
      update((db) => ({ ...db, users: db.users.map((item) => item.id === editingUser.id ? { ...item, name: form.name.trim(), email: form.email.trim(), password: form.password || item.password, accessLevel: form.accessLevel, responsibility: form.responsibility.trim(), phone: form.phone.trim() } : item) }));
    } else {
      update((db) => ({ ...db, users: [...db.users, { id: uid(), name: form.name.trim(), email: form.email.trim(), password: form.password, role: "sponsor", sponsorId: sponsor.id, accessLevel: form.accessLevel, responsibility: form.responsibility.trim(), phone: form.phone.trim() }] }));
    }
    close();
    notify(editing ? "Usuário atualizado" : "Usuário cadastrado para a marca");
  }}><div className="brand-access-summary"><span>{avatarContent(sponsor?.name ?? "Marca", sponsor?.avatar)}</span><div><small>ACESSO VINCULADO À MARCA</small><strong>{sponsor?.name ?? "Nenhuma marca selecionada"}</strong></div></div><Field label="Nome completo"><input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do usuário" /></Field><div className="fields"><Field label="Responsabilidade"><input maxLength={120} value={form.responsibility} onChange={(e) => setForm({ ...form, responsibility: e.target.value })} placeholder="Ex.: Produção da ativação" /></Field><Field label="WhatsApp com DDD"><input type="tel" maxLength={30} value={form.phone} onChange={(e) => { setError(""); setForm({ ...form, phone: e.target.value }); }} placeholder="Ex.: +55 51 99999-9999" /></Field></div><div className="fields"><Field label="E-mail de acesso"><input required type="email" value={form.email} onChange={(e) => { setError(""); setForm({ ...form, email: e.target.value }); }} placeholder="usuario@empresa.com.br" /></Field><Field label={editing ? "Nova senha (opcional)" : "Senha inicial"}><input required={!editing} minLength={8} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? "Manter senha atual" : "Mínimo de 8 caracteres"} /></Field></div><Field label="Tipo de funcionário"><select value={form.accessLevel} onChange={(e) => setForm({ ...form, accessLevel: e.target.value as SponsorAccess })}>{Object.entries(ACCESS_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field><div className="permission-summary"><Icon name="shield" size={16} /><span>{accessDescription(form.accessLevel)}</span></div>{error && <div className="form-error">{error}</div>}</FormShell>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Empty({ text }: { text: string }) { return <div className="empty"><Icon name="file" /><span>{text}</span></div>; }
function StatusBadge({ status }: { status: Status }) { return <span className={`badge ${status.toLowerCase().replace(" ", "-").replace("í", "i")}`}><i />{status}</span>; }
function initials(name: string) { return name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase(); }
/** Brand profile picture when set, initials otherwise. */
function avatarContent(name: string, avatar?: string) { return avatar ? <img className="avatar-img" src={avatar} alt="" /> : initials(name); }
/** Shrinks an uploaded image to a small square-ish data URL so it fits in browser storage. */
function resizeImage(file: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("image"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale)); canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL(file.type === "image/jpeg" ? "image/jpeg" : "image/png", 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
function formatDate(date: string) { if (!date) return "sem prazo"; return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR"); }
function formatLongDate(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }); }
function formatMessageDate(date: string) { const value = new Date(date); const today = new Date(); return value.toDateString() === today.toDateString() ? "Hoje" : value.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }); }
function monthFromDate(date: string) { const parsed = new Date(`${date}T12:00:00`); return new Date(parsed.getFullYear(), parsed.getMonth(), 1); }
function statusClass(status: Status) { return status === "Concluído" ? "done" : status === "Em análise" ? "review" : "pending"; }
function accessDescription(access: SponsorAccess) {
  const descriptions: Record<SponsorAccess, string> = {
    admin: "Acesso completo à marca, incluindo cadastro e edição de outros usuários.",
    deliveries: "Pode enviar MIV, logo e materiais de mídia e acompanhar os prazos de entrega.",
    hospitality: "Pode destinar cortesias aos convidados e acompanhar o dashboard.",
    credentials: "Pode consultar as credenciais liberadas e cadastrar a equipe no Open Staff.",
    viewer: "Pode consultar a visão geral, mensagens e o dashboard, sem alterar dados operacionais.",
  };
  return descriptions[access];
}
function formatBytes(size: number) { return size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`; }

export default App;

function FileViewer({ file, close }: { file: StoredFile; close: () => void }) {
  const mime = file.data.startsWith("data:") ? file.data.slice(5, file.data.indexOf(";")) : "";
  const isImage = mime.startsWith("image/");
  const isPdf = mime === "application/pdf";
  const isText = mime.startsWith("text/");
  const [blobUrl, setBlobUrl] = useState("");
  const [text, setText] = useState("");
  useEffect(() => {
    let url = "";
    if (isPdf) {
      try {
        const bin = atob((file.data.split(",")[1] ?? "").replace(/\s/g, ""));
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        setBlobUrl(url);
      } catch { setBlobUrl(""); }
    } else if (isText) {
      try { setText(decodeURIComponent(escape(atob(file.data.split(",")[1] ?? "")))); } catch { setText(""); }
    } else {
      setBlobUrl(""); setText("");
    }
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [file.id]);
  const download = () => { const link = document.createElement("a"); link.href = file.data; link.download = file.name; link.click(); };
  return <div className="modal-bg" onMouseDown={close}><section className="modal file-modal" role="dialog" aria-label={file.name} aria-modal="true" onMouseDown={(e) => e.stopPropagation()}><div className="modal-title"><h2>{file.name}</h2><div className="viewer-actions"><Button variant="portal" size="portal" type="button" title="Baixar arquivo" onClick={download}><Icon name="download" size={16} /></Button><Button variant="portal" size="portal" type="button" title="Fechar" onClick={close}><Icon name="x" /></Button></div></div><div className="file-view">{isImage && <img src={file.data} alt={file.name} />}{isPdf && (blobUrl ? <iframe src={blobUrl} title={file.name} /> : <p className="viewer-note">Não foi possível exibir este PDF.</p>)}{isText && <pre>{text || "Arquivo vazio."}</pre>}{!isImage && !isPdf && !isText && <div className="viewer-note"><Icon name="file" size={30} /><p>Este tipo de arquivo não pode ser exibido aqui.</p><Button variant="portal" size="portal" className="primary" type="button" onClick={download}>Baixar arquivo</Button><small>{file.size}</small></div>}</div></section></div>;
}

function FileRequests({ db, eventId, sponsorId, role, update, notify, open, embedded = false }: { db: Database; eventId: string; sponsorId: string; role: Role; update: (fn: (db: Database) => Database) => void; notify: (m: string) => void; open: () => void; embedded?: boolean }) {
  const requests = (db.fileRequests ?? []).filter((item) => item.eventId === eventId && item.sponsorId === sponsorId).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const [viewing, setViewing] = useState<StoredFile | null>(null);
  const fileFor = (id: string) => db.files.find((file) => file.requestId === id);
  const delivered = requests.filter((req) => fileFor(req.id)).length;
  const upload = (file: File | undefined, req: FileRequest) => {
    if (!file) return;
    if (file.size > 750_000) return notify("Use arquivos de até 750 KB neste MVP");
    const reader = new FileReader();
    reader.onload = () => {
      update((current) => ({ ...current, files: [{ id: uid(), eventId, sponsorId, requestId: req.id, name: file.name, category: "Solicitação", size: formatBytes(file.size), data: String(reader.result), createdAt: new Date().toISOString() }, ...current.files.filter((item) => item.requestId !== req.id)] }));
      notify("Arquivo entregue");
    };
    reader.readAsDataURL(file);
  };
  const requestButton = role === "rbs" ? <Button variant="portal" size="portal" className="primary" type="button" onClick={open} disabled={!sponsorId}><Icon name="plus" size={16} /> Solicitar arquivo</Button> : undefined;
  const rows = <>{requests.map((req) => { const file = fileFor(req.id); return <div className="delivery-row" key={req.id}><span className="category outro">{file ? "Entregue" : "Pendente"}</span><div className="delivery-info"><strong>{req.title}</strong><small>{req.description ? `${req.description} • ` : ""}Prazo: {formatDate(req.dueDate)}</small>{file && <Button variant="portal" size="portal" className="attached-file" type="button" onClick={() => setViewing(file)}><Icon name="file" size={14} /><span>{file.name}</span><Icon name="download" size={14} /></Button>}</div><div className="delivery-actions"><label className={file ? "upload-inline replace" : "upload-inline"}><input type="file" onChange={(e) => upload(e.target.files?.[0], req)} /><Icon name="upload" size={15} />{file ? "Substituir" : "Enviar arquivo"}</label></div>{role === "rbs" && <Button variant="portal" size="portal" className="icon-button danger" type="button" title="Excluir solicitação" onClick={() => { if (confirm("Excluir esta solicitação?")) update((current) => ({ ...current, fileRequests: (current.fileRequests ?? []).filter((item) => item.id !== req.id), files: current.files.filter((item) => item.requestId !== req.id) })); }}><Icon name="trash" size={16} /></Button>}</div>; })}{!requests.length && <Empty text="Nenhum arquivo solicitado para esta marca." />}</>;
  // Dentro de Mídia e conteúdo (equipe RBS): a solicitação fica em um painel da própria página.
  if (embedded) return <section className="panel spaced file-requests-panel" aria-label="Solicitação de arquivos"><div className="panel-title"><div><h2>Solicitação de arquivos</h2><span>{requests.length} {requests.length === 1 ? "solicitado" : "solicitados"} · {delivered} {delivered === 1 ? "entregue" : "entregues"} · {requests.length - delivered} {requests.length - delivered === 1 ? "pendente" : "pendentes"}</span></div>{requestButton}</div>{rows}{viewing && <FileViewer file={viewing} close={() => setViewing(null)} />}</section>;
  return <><Heading title="Solicitação de arquivos" text="Arquivos pedidos pela RBS para esta marca no evento selecionado." action={requestButton} /><div className="stats"><Stat label="Solicitados" value={String(requests.length)} icon="file" /><Stat label="Entregues" value={String(delivered)} icon="check" /><Stat label="Pendentes" value={String(requests.length - delivered)} icon="upload" /></div><section className="panel spaced"><div className="panel-title"><div><h2>Arquivos solicitados</h2><span>{requests.length} itens</span></div></div>{rows}</section>{viewing && <FileViewer file={viewing} close={() => setViewing(null)} />}</>;
}
function FileRequestForm({ close, update, eventId, sponsorId, notify }: { close: () => void; update: (fn: (db: Database) => Database) => void; eventId: string; sponsorId: string; notify: (m: string) => void }) {
  const [form, setForm] = useState({ title: "", description: "", dueDate: "" });
  return <FormShell title="Solicitar arquivo" close={close} action="Solicitar" submit={(e) => { e.preventDefault(); update((db) => ({ ...db, fileRequests: [...(db.fileRequests ?? []), { id: uid(), eventId, sponsorId, ...form }] })); close(); notify("Arquivo solicitado"); }}><Field label="Arquivo solicitado"><input required autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field><Field label="Instruções"><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field><Field label="Prazo"><input required type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field></FormShell>;
}

const RESULT_FIELDS: { key: keyof EventResult; label: string; group: "social" | "survey" }[] = [
  { key: "newFollowers", label: "Novos seguidores (Instagram)", group: "social" },
  { key: "posts", label: "Postagens feitas", group: "social" },
  { key: "likes", label: "Curtidas", group: "social" },
  { key: "shares", label: "Compartilhamentos", group: "social" },
  { key: "comments", label: "Comentários", group: "social" },
  { key: "reach", label: "Alcance", group: "social" },
  { key: "surveyResponses", label: "Respostas da pesquisa", group: "survey" },
  { key: "satisfaction", label: "Satisfação média (0 a 10)", group: "survey" },
];
const fmtNum = (n: number) => Number(n || 0).toLocaleString("pt-BR");

function EventResults({ db, eventId, sponsorId, role, update, notify }: any) {
  const sponsor = db.sponsors.find((s: Sponsor) => s.id === sponsorId && s.eventId === eventId);
  const event = db.events.find((e: EventEdition) => e.id === eventId);
  const saved: EventResult | undefined = (db.results ?? []).find((r: EventResult) => r.eventId === eventId && r.sponsorId === sponsorId);
  const empty: EventResult = { id: "", eventId, sponsorId, newFollowers: 0, posts: 0, likes: 0, shares: 0, comments: 0, reach: 0, surveyResponses: 0, satisfaction: 0, surveyHighlights: "", notes: "" };
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EventResult>(saved ?? empty);
  useEffect(() => { setForm(saved ?? empty); setEditing(false); }, [eventId, sponsorId, saved?.id]);
  const [survey, setSurvey] = useState<SurveyAnswer[]>(() => readSurvey());
  useEffect(() => {
    const local = () => setSurvey(readSurvey());
    const remote = () => backend.getPortalState().then((state) => replaceSurveyCache(Array.isArray(state.surveyAnswers) ? state.surveyAnswers : [])).catch(local);
    window.addEventListener("survey-updated", local); window.addEventListener("storage", local); window.addEventListener("focus", remote);
    remote();
    return () => { window.removeEventListener("survey-updated", local); window.removeEventListener("storage", local); window.removeEventListener("focus", remote); };
  }, []);
  const [range, setRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [kind, setKind] = useState<"parcial" | "final">("parcial");
  const full = hasFullBenefits(db.sponsors.find((item) => item.id === sponsorId)?.tier);
  const off = full ? 0 : 2;
  if (!sponsor) return null;
  const allDaily = (db.metrics ?? []).filter((m: DailyMetric) => m.eventId === eventId && m.sponsorId === sponsorId);
  const allAnswers = survey.filter((a) => a.eventId === eventId && a.sponsorId === sponsorId);
  const allDates = [...allDaily.map((m: DailyMetric) => m.date), ...allAnswers.map((a) => a.at.slice(0, 10))].sort();
  const minDate = allDates[0] ?? "", maxDate = allDates[allDates.length - 1] ?? "";
  const from = range.from || minDate, to = range.to || maxDate;
  const inRange = (d: string) => (!from || d >= from) && (!to || d <= to);
  const preset = (days: number | null) => { if (days === null) return setRange({ from: "", to: "" }); const end = maxDate || new Date().toISOString().slice(0, 10); const st = new Date(end + "T00:00:00Z"); st.setUTCDate(st.getUTCDate() - days + 1); setRange({ from: st.toISOString().slice(0, 10), to: end }); };
  const fmtD = (d: string) => d ? d.split("-").reverse().join("/") : "—";
  const tickets = db.tickets.filter((t: Ticket) => t.eventId === eventId && t.sponsorId === sponsorId);
  const creds = db.credentials.filter((c: Credential) => c.eventId === eventId && c.sponsorId === sponsorId);
  const credRows = credentialsFor(db, eventId, sponsor.tier, sponsor.id);
  const credTotal = credRows.reduce((a: number, row: any) => a + (Number(row.qty) || 0), 0);
  const courtesyTotal = Object.values(courtesyFor(db, eventId, sponsor.tier, sponsor.id)).reduce((a: number, n: any) => a + (Number(n) || 0), 0);
  const photos = slotFiles(db, eventId, sponsorId, "brand-photo");
  const mediaReports = slotFiles(db, eventId, sponsorId, "media-report");
  const mediaLinks = (db.contents ?? []).filter((c: ContentItem) => c.eventId === eventId && c.sponsorId === sponsorId && c.kind === "link");
  const clientMaterials = slotFiles(db, eventId, sponsorId, "client-material").length + (db.contents ?? []).filter((c: ContentItem) => c.eventId === eventId && c.sponsorId === sponsorId && c.kind === "text").length;
  const resultFiles = slotFiles(db, eventId, sponsorId, "survey-results");
  const labels = surveyLabels(sponsor);
  const daily = allDaily.filter((m: DailyMetric) => inRange(m.date));
  const sum = (k: string) => daily.reduce((a: number, m: any) => a + (m[k] || 0), 0);
  const r: any = daily.length ? { ...(saved ?? empty), newFollowers: sum("newFollowers"), posts: sum("posts"), likes: sum("likes"), shares: sum("shares"), comments: sum("comments"), reach: sum("reach") } : { ...(saved ?? empty) };
  const answers = allAnswers.filter((a) => inRange(a.at.slice(0, 10)));
  if (answers.length) { r.surveyResponses = answers.length; r.satisfaction = Math.round(answers.reduce((a, x) => a + x.rating, 0) / answers.length * 10) / 10; }
  const qAvg = (k: string) => { const v = answers.filter((a) => a.scores).map((a) => a.scores[k]); return v.length ? Math.round(v.reduce((x, y) => x + y, 0) / v.length * 10) / 10 : null; };
  const surveyUrl = `${window.location.origin}/pesquisa?e=${encodeURIComponent(eventId)}&m=${encodeURIComponent(sponsorId)}`;
  const engagement = r.likes + r.shares + r.comments;
  const save = (e: React.FormEvent) => { e.preventDefault(); update((cur: Database) => { const list = cur.results ?? []; const item = { ...form, id: form.id || uid(), eventId, sponsorId }; return { ...cur, results: list.some((x) => x.id === item.id) ? list.map((x) => x.id === item.id ? item : x) : [...list, item] }; }); setEditing(false); notify("Resultados salvos"); };
  return <section className="panel event-results">
    <div className="print-cover"><div className="print-brand">PLANETA ATLÂNTIDA · RBS</div><h1>{kind === "final" ? "Relatório final de patrocínio" : "Relatório parcial de patrocínio"}</h1><h2>{sponsor.name}</h2><dl><div><dt>Evento</dt><dd>{event?.name}</dd></div><div><dt>Período analisado</dt><dd>{fmtD(from)} a {fmtD(to)}</dd></div><div><dt>Emitido em</dt><dd>{new Date().toLocaleDateString("pt-BR")}</dd></div></dl></div>
    <div className="panel-title no-print"><div><h2>Resultados do evento · {sponsor.name}</h2><span>{event?.name} — {event?.dates}</span></div><div className="results-actions">{role === "rbs" && !editing && <Button variant="portal" size="portal" type="button" onClick={() => setEditing(true)}><Icon name="edit" size={15} /> Preencher resultados</Button>}</div></div>
    {!editing && <div className="report-filters no-print">
      <div className="seg"></div>
      {kind === "final" ? <small>{minDate ? `O relatório final considera todo o período do evento: ${fmtD(minDate)} a ${fmtD(maxDate)}.` : "O relatório final considera todo o período do evento."}</small> : <>
        <label></label>
        <label></label>
        <div className="seg"></div>
      </>}
    </div>}
    {editing ? <form className="results-form" onSubmit={save}>
      {RESULT_FIELDS.map((f) => <label key={f.key}><span>{f.label}</span><input type="number" min="0" step={f.key === "satisfaction" ? "0.1" : "1"} max={f.key === "satisfaction" ? "10" : undefined} value={form[f.key] as number} onChange={(e) => setForm({ ...form, [f.key]: Number(e.target.value) })} /></label>)}
      <label className="wide"></label>
      <label className="wide"></label>
      <div className="wide results-actions"><Button variant="portal" size="portal" type="button" onClick={() => { setForm(saved ?? empty); setEditing(false); }}>Cancelar</Button><Button variant="portal" size="portal" className="primary" type="submit">Salvar resultados</Button></div>
    </form> : !saved && role !== "rbs" ? <Empty text="Os resultados do evento ainda não foram publicados pela RBS." /> : <>
      {kind === "final" && full && <FinalSummary daily={daily} answers={answers} r={r} engagement={engagement} tickets={tickets} creds={creds} from={fmtD(from)} to={fmtD(to)} sponsor={sponsor} credTotal={credTotal} courtesyTotal={courtesyTotal} photos={photos.length} links={mediaLinks.length} />}
      {full && <><h3 className="report-section">1. Redes sociais</h3>
      <div className="stats"><Stat label="Novos seguidores" value={fmtNum(r.newFollowers)} icon="users" /><Stat label="Postagens" value={fmtNum(r.posts)} icon="file" /><Stat label="Curtidas" value={fmtNum(r.likes)} icon="check" /><Stat label="Compartilhamentos" value={fmtNum(r.shares)} icon="send" /><Stat label="Comentários" value={fmtNum(r.comments)} icon="message" /><Stat label="Alcance" value={fmtNum(r.reach)} icon="chart" /></div>
      <p className="results-note">Engajamento total: <b>{fmtNum(engagement)}</b> interações{r.reach ? <> · taxa de engajamento <b>{(Math.round(engagement / r.reach * 1000) / 10).toLocaleString("pt-BR")}%</b></> : null}</p>
      <ResultsCharts sponsor={sponsor} daily={daily} role={role} eventId={eventId} sponsorId={sponsorId} update={update} notify={notify} tickets={tickets} creds={creds} satisfaction={r.satisfaction} />
      <h3 className="report-section">2. Pesquisa de satisfação do público</h3>
      <div className="survey-top">
        <div className="chart-box gauge-box"><strong>Satisfação geral</strong><ResponsiveContainer width="100%" height={170}><PieChart><Pie data={[{ v: r.satisfaction || 0 }, { v: 10 - (r.satisfaction || 0) }]} dataKey="v" startAngle={180} endAngle={0} cy="85%" innerRadius={62} outerRadius={90} isAnimationActive={false}><Cell fill={C.yellow} /><Cell fill={C.line} /></Pie></PieChart></ResponsiveContainer><p className="gauge-value">{Number(r.satisfaction || 0).toLocaleString("pt-BR")} / 10</p><small>{fmtNum(r.surveyResponses)} respostas</small></div>
        <div className="chart-box"><strong>Nota média por pergunta</strong>{answers.length ? <div className="survey-bars">{SURVEY_QUESTIONS.map((q, i) => { const v = qAvg(q.key); return <div key={q.key}><span title={labels[i]}>{shortLabel(labels[i])}</span><div className="survey-bar"><i style={{ width: `${(v ?? 0) * 10}%` }} /></div><b>{v === null ? "—" : v.toLocaleString("pt-BR")}</b></div>; })}</div> : <small>Nenhuma resposta pelo QR code no período.</small>}
          {answers.filter((a) => a.comment).slice(-3).reverse().map((a) => <p key={a.id} className="results-note no-print">“{a.comment}” <b>· {a.rating}/10</b></p>)}</div>
        {role === "rbs" && <div className="chart-box no-print survey-move-note"><strong>QR code e perguntas</strong><small>O QR code do espaço da marca, as 3 perguntas personalizadas e as respostas de teste ficam na aba Pesquisa da ativação.</small></div>}
      </div>
      {answers.length > 0 && <SurveyCharts answers={answers} final={kind === "final"} labels={labels.map(shortLabel)} />}
      {r.surveyHighlights && <p className="results-note"><b>Destaques:</b> {r.surveyHighlights}</p>}
      {resultFiles.length > 0 && <p className="results-note"><b>Resultados oficiais da empresa de pesquisa:</b> {resultFiles.map((f: StoredFile) => f.name).join(", ")}</p>}</>}
      <h3 className="report-section">{3-off}. Aplicações de marca no evento</h3>
      {photos.length ? <div className="report-photos">{photos.slice(0, kind === "final" ? 24 : 8).map((p: StoredFile) => <figure key={p.id}><img src={p.data} alt={p.name} loading="lazy" /></figure>)}</div> : <p className="results-note">As fotos da marca aplicada serão publicadas pela RBS após o festival.</p>}
      {photos.length > 0 && <p className="results-note">{photos.length} {photos.length === 1 ? "foto registrada" : "fotos registradas"} comprovando a aplicação da marca.</p>}
      <h3 className="report-section">{4-off}. Mídia e conteúdo</h3>
      <div className="stats compact"><Stat label="Materiais enviados pelo cliente" value={String(clientMaterials)} icon="upload" /><Stat label="Relatórios de mídia veiculada" value={String(mediaReports.length)} icon="file" /><Stat label="Posts e links publicados" value={String(mediaLinks.length)} icon="link" /></div>
      <table className="report-table media-type-table"><thead><tr><th>Tipo de mídia</th><th>Materiais do cliente</th><th>Relatórios</th><th>Posts e links</th></tr></thead><tbody>{MEDIA_TYPES.map((type) => { const own = (item: { mediaType?: MediaType }) => mediaTypeOf(item) === type.id; const materialsOf = slotFiles(db, eventId, sponsorId, "client-material").filter(own).length + (db.contents ?? []).filter((c: ContentItem) => c.eventId === eventId && c.sponsorId === sponsorId && c.kind === "text" && own(c)).length; return <tr key={type.id}><td>{type.title}</td><td>{materialsOf}</td><td>{mediaReports.filter(own).length}</td><td>{mediaLinks.filter(own).length}</td></tr>; })}</tbody></table>
      {MEDIA_TYPES.map((type) => { const links = mediaLinks.filter((l: ContentItem) => mediaTypeOf(l) === type.id); const reps = mediaReports.filter((f: StoredFile) => mediaTypeOf(f) === type.id); return links.length || reps.length ? <div className="report-media-group" key={type.id}><strong>{type.title}</strong><ul className="report-links">{links.map((l: ContentItem) => <li key={l.id}><Icon name="link" size={14} /><a href={l.url} target="_blank" rel="noreferrer noopener">{l.title}</a></li>)}{reps.map((f: StoredFile) => <li key={f.id}><Icon name="file" size={14} /><span>{f.name}</span></li>)}</ul></div> : null; })}
      <h3 className="report-section">{5-off}. Cortesias e credenciamento</h3>
      <div className="stats"><Stat label="Cortesias liberadas" value={String(courtesyTotal)} icon="gift" /><Stat label="Cortesias destinadas" value={String(tickets.length)} icon="users" /><Stat label="Cortesias utilizadas" value={String(tickets.filter((t: Ticket) => t.status === "Utilizada").length)} icon="check" /><Stat label="Credenciais liberadas" value={String(credTotal)} icon="clipboard" /></div>
      {r.notes && <><h3 className="report-section">{6-off}. Outras informações</h3><p className="results-note">{r.notes}</p></>}
      {kind === "final" && answers.some((a) => a.comment) && <div className="no-print"><h3 className="report-section">Anexo · Comentários do público</h3><ul className="comment-list">{answers.filter((a) => a.comment).map((a) => <li key={a.id}><span>{fmtD(a.at.slice(0, 10))}</span>“{a.comment}”<b>{a.rating}/10</b></li>)}</ul></div>}
      <div className="print-footer">Relatório gerado pelo Portal do Patrocinador · RBS · {new Date().toLocaleString("pt-BR")}</div>
      {!saved && !daily.length && <p className="results-note">Ainda não preenchido. Clique em “Preencher resultados”.</p>}
    </>}
  </section>;
}

const C = { cyan: "var(--cyan)", orange: "var(--orange)", green: "var(--green)", yellow: "var(--yellow)", muted: "var(--muted)", line: "var(--line)" };
const METRIC_LABELS: Record<string, string> = { newFollowers: "Novos seguidores", posts: "Postagens", likes: "Curtidas", shares: "Compartilhamentos", comments: "Comentários", reach: "Alcance", engagement: "Engajamento" };
const startOfWeek = (iso: string) => { const d = new Date(iso + "T00:00:00Z"); const day = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - day); return d.toISOString().slice(0, 10); };
const periodKey = (iso: string, mode: string) => mode === "day" ? iso : mode === "week" ? startOfWeek(iso) : iso.slice(0, 7);
const periodLabel = (key: string, mode: string) => { if (mode === "month") { const [y, m] = key.split("-"); return new Date(Date.UTC(+y, +m - 1, 1)).toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }); } const [y, m, d] = key.split("-"); return mode === "week" ? `Sem ${d}/${m}` : `${d}/${m}`; };
const pct = (cur: number, prev: number) => prev ? Math.round((cur - prev) / prev * 1000) / 10 : null;

function ResultsCharts({ sponsor, daily, role, eventId, sponsorId, update, notify, tickets, creds, satisfaction }: any) {
  const [mode, setMode] = useState("week");
  const [metric, setMetric] = useState("engagement");
  const series = useMemo(() => {
    const map = new Map<string, any>();
    [...daily].sort((a: DailyMetric, b: DailyMetric) => a.date.localeCompare(b.date)).forEach((m: DailyMetric) => {
      const k = periodKey(m.date, mode); const cur = map.get(k) ?? { key: k, label: periodLabel(k, mode), newFollowers: 0, posts: 0, likes: 0, shares: 0, comments: 0, reach: 0 };
      ["newFollowers", "posts", "likes", "shares", "comments", "reach"].forEach((f) => cur[f] += (m as any)[f] || 0); map.set(k, cur);
    });
    let acc = 0;
    return [...map.values()].map((row, i, arr) => { row.engagement = row.likes + row.shares + row.comments; acc += row.newFollowers; row.totalFollowers = acc; row.rate = row.reach ? Math.round(row.engagement / row.reach * 1000) / 10 : 0; const prev = arr[i - 1]; row.prev = prev ? (prev.engagement ?? prev.likes + prev.shares + prev.comments) : null; return row; });
  }, [daily, mode]);
  const last = series[series.length - 1]; const prev = series[series.length - 2];
  const totals = series.reduce((a: any, r: any) => ({ likes: a.likes + r.likes, shares: a.shares + r.shares, comments: a.comments + r.comments }), { likes: 0, shares: 0, comments: 0 });
  const pie = [{ name: "Curtidas", value: totals.likes, color: C.cyan }, { name: "Compartilhamentos", value: totals.shares, color: C.orange }, { name: "Comentários", value: totals.comments, color: C.green }];
  const best = series.reduce((b: any, r: any) => !b || r[metric] > b[metric] ? r : b, null);
  const avg = series.length ? Math.round(series.reduce((a: number, r: any) => a + r[metric], 0) / series.length) : 0;
  const unit = mode === "day" ? "dia" : mode === "week" ? "semana" : "mês";
  const tip = { contentStyle: { background: "var(--panel)", border: `1px solid ${C.line}`, borderRadius: 4, color: "var(--text)" }, formatter: (v: number) => fmtNum(v) };
  const [igId, setIgId] = useState(sponsor?.instagramId ?? "");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  useEffect(() => setIgId(sponsor?.instagramId ?? ""), [sponsor?.id]);
  const mergeDays = (days: any[], source: "manual" | "instagram") => update((cur: Database) => { const dates = new Set(days.map((d) => d.date)); const keep = (cur.metrics ?? []).filter((m) => !(m.eventId === eventId && m.sponsorId === sponsorId && dates.has(m.date))); return { ...cur, metrics: [...keep, ...days.map((d) => ({ ...d, source, id: uid(), eventId, sponsorId }))] }; });
  const sync = async (forcedId?: string, silent = false) => {
    const id = (forcedId ?? igId).trim();
    if (!id) { setSyncMsg("Informe o ID da conta do Instagram da marca."); return; }
    setSyncing(true); setSyncMsg("");
    try {
      const res = await syncInstagramInsights({ data: { igUserId: id, days: 30 } });
      if (res.error) setSyncMsg(res.error);
      else { mergeDays(res.days, "instagram"); update((cur: Database) => ({ ...cur, sponsors: cur.sponsors.map((sp) => sp.id === sponsorId && sp.eventId === eventId ? { ...sp, instagramId: id, instagramSyncedAt: new Date().toISOString() } : sp) })); if (!silent) notify(`Instagram sincronizado: ${res.days.length} dias atualizados`); }
    } catch { setSyncMsg("Não foi possível conectar ao Instagram agora. Tente novamente."); }
    setSyncing(false);
  };
  const today = new Date().toISOString().slice(0, 10);
  useEffect(() => { if (sponsor?.instagramAuto && sponsor.instagramId && sponsor.instagramSyncedAt?.slice(0, 10) !== today) sync(sponsor.instagramId, true); }, [sponsor?.id, sponsor?.instagramAuto]);
  const setAuto = (on: boolean) => update((cur: Database) => ({ ...cur, sponsors: cur.sponsors.map((sp) => sp.id === sponsorId && sp.eventId === eventId ? { ...sp, instagramAuto: on, instagramId: igId.trim() || sp.instagramId } : sp) }));
  const useTest = () => { setIgId("teste"); setAuto(true); sync("teste"); };
  const removeDay = (id: string) => update((cur: Database) => ({ ...cur, metrics: (cur.metrics ?? []).filter((m) => m.id !== id) }));
  const Delta = ({ label, k }: { label: string; k: string }) => { const d = last && prev ? pct(last[k], prev[k]) : null; return <div className="delta-card"><small>{label}</small><strong>{fmtNum(last?.[k] ?? 0)}</strong><span className={d == null ? "" : d >= 0 ? "up" : "down"}>{d == null ? "sem período anterior" : `${d >= 0 ? "▲" : "▼"} ${Math.abs(d).toLocaleString("pt-BR")}% vs ${unit} anterior`}</span></div>; };
  return <div className="results-charts">
    <div className="charts-toolbar"><h3>Evolução nas redes sociais</h3><div className="seg">{[["day", "Dia"], ["week", "Semana"], ["month", "Mês"]].map(([v, l]) => <Button variant="portal" size="portal" key={v} type="button" className={mode === v ? "active" : ""} onClick={() => setMode(v)}>{l}</Button>)}</div></div>
    {role === "rbs" && <div className="ig-sync no-print"><div><strong>Instagram da marca</strong><small>{sponsor?.instagramSyncedAt ? `Última sincronização: ${new Date(sponsor.instagramSyncedAt).toLocaleString("pt-BR")}` : "Ainda não sincronizado. Os dados vêm direto dos insights da conta comercial."}</small></div><input aria-label="ID do perfil comercial do Instagram" placeholder={syncing ? "Coletando informações..." : "ID do perfil comercial · pressione Enter para confirmar"} value={igId} disabled={syncing} onChange={(e) => { setSyncMsg(""); setIgId(e.target.value); }} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} onBlur={() => { const id = igId.trim(); if (!id) return setSyncMsg("Informe o ID da conta do Instagram da marca."); update((cur: Database) => ({ ...cur, sponsors: cur.sponsors.map((sp) => sp.id === sponsorId && sp.eventId === eventId ? { ...sp, instagramId: id } : sp) })); if (id !== sponsor?.instagramId || !sponsor?.instagramSyncedAt) void sync(id); }} /><div className="ig-options">{sponsor?.instagramAuto && <span className="ig-live">● Atualização diária ativa{sponsor.instagramId === "teste" ? " · conta de teste (dados simulados)" : ""}</span>}</div>{syncMsg && <p className="ig-error">{syncMsg}</p>}</div>}
    {!series.length ? <p className="results-note">Nenhum registro diário ainda. {role === "rbs" ? "Sincronize o Instagram da marca para começar a acompanhar." : ""}</p> : <>
      <p className="results-note">Último período ({last.label}) comparado com o anterior{prev ? ` (${prev.label})` : ""}:</p>
      <div className="delta-grid"><Delta label="Novos seguidores" k="newFollowers" /><Delta label="Engajamento" k="engagement" /><Delta label="Alcance" k="reach" /><Delta label="Postagens" k="posts" /><Delta label="Taxa de engajamento (%)" k="rate" /></div>
      <div className="chart-grid">
        <div className="chart-box wide"><div className="chart-head"><strong>{METRIC_LABELS[metric]} por {unit}</strong><select className="no-print" value={metric} onChange={(e) => setMetric(e.target.value)}>{Object.entries(METRIC_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div><small>Média de {fmtNum(avg)} por {unit} · melhor: {best?.label} ({fmtNum(best?.[metric] ?? 0)})</small>
          <ResponsiveContainer width="100%" height={260}><BarChart data={series}><CartesianGrid stroke={C.line} vertical={false} /><XAxis dataKey="label" stroke={C.muted} fontSize={11} /><YAxis stroke={C.muted} fontSize={11} tickFormatter={fmtNum} /><Tooltip {...tip} /><Bar dataKey={metric} name={METRIC_LABELS[metric]} fill={C.cyan} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
        <div className="chart-box"><strong>Crescimento de seguidores (acumulado)</strong><ResponsiveContainer width="100%" height={230}><AreaChart data={series}><defs><linearGradient id="fol" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.green} stopOpacity={0.5} /><stop offset="100%" stopColor={C.green} stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke={C.line} vertical={false} /><XAxis dataKey="label" stroke={C.muted} fontSize={11} /><YAxis stroke={C.muted} fontSize={11} tickFormatter={fmtNum} /><Tooltip {...tip} /><Area dataKey="totalFollowers" name="Seguidores ganhos" stroke={C.green} fill="url(#fol)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
        <div className="chart-box"><strong>Engajamento: período atual x anterior</strong><ResponsiveContainer width="100%" height={230}><LineChart data={series}><CartesianGrid stroke={C.line} vertical={false} /><XAxis dataKey="label" stroke={C.muted} fontSize={11} /><YAxis stroke={C.muted} fontSize={11} tickFormatter={fmtNum} /><Tooltip {...tip} /><Legend /><Line dataKey="engagement" name="Atual" stroke={C.orange} strokeWidth={2} dot={false} /><Line dataKey="prev" name={`${unit[0].toUpperCase() + unit.slice(1)} anterior`} stroke={C.muted} strokeDasharray="5 4" dot={false} /></LineChart></ResponsiveContainer></div>
        <div className="chart-box"><strong>Composição do engajamento</strong><ResponsiveContainer width="100%" height={230}><PieChart><Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>{pie.map((p) => <Cell key={p.name} fill={p.color} />)}</Pie><Tooltip {...tip} /><Legend /></PieChart></ResponsiveContainer></div>
        <div className="chart-box"><strong>Interações por tipo</strong><ResponsiveContainer width="100%" height={230}><BarChart data={series}><CartesianGrid stroke={C.line} vertical={false} /><XAxis dataKey="label" stroke={C.muted} fontSize={11} /><YAxis stroke={C.muted} fontSize={11} tickFormatter={fmtNum} /><Tooltip {...tip} /><Legend /><Bar dataKey="likes" name="Curtidas" stackId="a" fill={C.cyan} /><Bar dataKey="shares" name="Compartilhamentos" stackId="a" fill={C.orange} /><Bar dataKey="comments" name="Comentários" stackId="a" fill={C.green} /></BarChart></ResponsiveContainer></div>
      </div>
      <details className="records no-print"><summary>Registros diários ({daily.length})</summary><div className="table"><div className="table-head records-cols"><span>DATA</span><span>ORIGEM</span><span>SEGUIDORES</span><span>POSTS</span><span>CURTIDAS</span><span>COMPART.</span><span>COMENT.</span><span>ALCANCE</span><span /></div>{[...daily].sort((a: any, b: any) => b.date.localeCompare(a.date)).map((m: DailyMetric) => <div className="table-row records-cols" key={m.id}><strong>{m.date.split("-").reverse().join("/")}</strong><span className={`src-badge ${m.source === "instagram" ? "ig" : ""}`}>{m.source === "instagram" ? "Instagram" : "Manual"}</span><span>{fmtNum(m.newFollowers)}</span><span>{m.posts}</span><span>{fmtNum(m.likes)}</span><span>{fmtNum(m.shares)}</span><span>{fmtNum(m.comments)}</span><span>{fmtNum(m.reach)}</span>{role === "rbs" ? <Button variant="portal" size="portal" className="icon-button danger" type="button" onClick={() => removeDay(m.id)}><Icon name="trash" size={15} /></Button> : <span />}</div>)}</div></details>
    </>}
  </div>;
}


function SurveyCharts({ answers, final, labels = ["Atendimento", "Organização", "Espaço"] }: any) {
  const [mode, setMode] = useState("week");
  const groups: Record<string, any[]> = {};
  answers.forEach((a: any) => { const k = periodKey(String(a.at).slice(0, 10), mode); (groups[k] ||= []).push(a); });
  const mean = (l: any[], f: (a: any) => number | undefined) => { const v = l.map(f).filter((x) => typeof x === "number"); return v.length ? Math.round(v.reduce((x: number, y: number) => x + y, 0) / v.length * 10) / 10 : null; };
  const data = Object.keys(groups).sort().map((k) => { const l = groups[k]; return { label: periodLabel(k, mode), respostas: l.length, geral: mean(l, (a) => a.rating), atendimento: mean(l, (a) => a.scores?.atendimento), organizacao: mean(l, (a) => a.scores?.organizacao), espaco: mean(l, (a) => a.scores?.espaco), promotores: l.filter((a) => a.rating >= 9).length, neutros: l.filter((a) => a.rating >= 7 && a.rating < 9).length, detratores: l.filter((a) => a.rating < 7).length }; });
  const cur = data[data.length - 1], prev = data[data.length - 2];
  const unit = mode === "day" ? "dia" : mode === "week" ? "semana" : "mês";
  const cmp = (k: string, label: string) => { const c = cur?.[k] ?? 0, p = prev?.[k]; const d = p ? pct(c, p) : null; return <div className="delta-card" key={k}><small>{label}</small><strong>{typeof c === "number" ? c.toLocaleString("pt-BR") : "—"}</strong><span className={d == null ? "" : d >= 0 ? "up" : "down"}>{d == null ? "sem período anterior" : `${d >= 0 ? "▲" : "▼"} ${Math.abs(d).toLocaleString("pt-BR")}% vs ${unit} anterior`}</span></div>; };
  const tip = { contentStyle: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 4, color: "var(--text)" } };
  return <div className="survey-charts">
    <div className="results-actions survey-period no-print">{[["day", "Dia"], ["week", "Semana"], ["month", "Mês"]].map(([k, l]) => <Button variant="portal" size="portal" key={k} type="button" className={mode === k ? "primary" : ""} onClick={() => setMode(k)}>{l}</Button>)}</div>
    <div className="delta-grid">{cmp("geral", "Satisfação")}{cmp("atendimento", labels[0])}{cmp("organizacao", labels[1])}{cmp("espaco", labels[2])}{cmp("respostas", "Respostas")}</div>
    <div className="chart-grid">
      <div className="chart-box"><strong>Evolução das notas por {unit}</strong><ResponsiveContainer width="100%" height={250}><LineChart data={data}><CartesianGrid stroke={C.line} strokeDasharray="3 3" /><XAxis dataKey="label" stroke={C.muted} fontSize={11} /><YAxis domain={[0, 10]} stroke={C.muted} fontSize={11} /><Tooltip {...tip} /><Legend /><Line dataKey="geral" name="Geral" stroke={C.yellow} strokeWidth={3} dot={false} connectNulls /><Line dataKey="atendimento" name={labels[0]} stroke={C.cyan} dot={false} connectNulls /><Line dataKey="organizacao" name={labels[1]} stroke={C.orange} dot={false} connectNulls /><Line dataKey="espaco" name={labels[2]} stroke={C.green} dot={false} connectNulls /></LineChart></ResponsiveContainer></div>
      <div className="chart-box"><strong>Respostas por {unit}</strong><ResponsiveContainer width="100%" height={250}><BarChart data={data}><CartesianGrid stroke={C.line} strokeDasharray="3 3" /><XAxis dataKey="label" stroke={C.muted} fontSize={11} /><YAxis stroke={C.muted} fontSize={11} allowDecimals={false} /><Tooltip {...tip} /><Bar dataKey="respostas" name="Respostas" fill={C.cyan} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
      <div className="chart-box"><strong>Perfil das avaliações por {unit}</strong><ResponsiveContainer width="100%" height={250}><BarChart data={data}><CartesianGrid stroke={C.line} strokeDasharray="3 3" /><XAxis dataKey="label" stroke={C.muted} fontSize={11} /><YAxis stroke={C.muted} fontSize={11} allowDecimals={false} /><Tooltip {...tip} /><Legend /><Bar dataKey="promotores" name="Muito satisfeitos (9-10)" stackId="a" fill={C.green} /><Bar dataKey="neutros" name="Satisfeitos (7-8)" stackId="a" fill={C.yellow} /><Bar dataKey="detratores" name="Insatisfeitos (0-6)" stackId="a" fill={C.orange} /></BarChart></ResponsiveContainer></div>
      <div className="chart-box"><strong>Atual vs {unit} anterior</strong><ResponsiveContainer width="100%" height={250}><BarChart data={[[labels[0], "atendimento"], [labels[1], "organizacao"], [labels[2], "espaco"]].map(([n, k]) => ({ n, atual: cur?.[k] ?? 0, anterior: prev?.[k] ?? 0 }))}><CartesianGrid stroke={C.line} strokeDasharray="3 3" /><XAxis dataKey="n" stroke={C.muted} fontSize={11} /><YAxis domain={[0, 10]} stroke={C.muted} fontSize={11} /><Tooltip {...tip} /><Legend /><Bar dataKey="anterior" name="Anterior" fill={C.muted} /><Bar dataKey="atual" name="Atual" fill={C.yellow} /></BarChart></ResponsiveContainer></div>
      {final && <div className="chart-box wide"><strong>Distribuição das notas gerais</strong><ResponsiveContainer width="100%" height={220}><BarChart data={Array.from({ length: 11 }, (_, n) => ({ n: String(n), qtd: answers.filter((a: any) => Math.round(a.rating) === n).length }))}><CartesianGrid stroke={C.line} strokeDasharray="3 3" /><XAxis dataKey="n" stroke={C.muted} fontSize={11} /><YAxis stroke={C.muted} fontSize={11} allowDecimals={false} /><Tooltip {...tip} /><Bar dataKey="qtd" name="Respostas" fill={C.yellow} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>}
    </div>
  </div>;
}


function FinalSummary({ daily, answers, r, engagement, tickets, creds, from, to, sponsor, credTotal = 0, courtesyTotal = 0, photos = 0, links = 0 }: any) {
  const sorted = [...daily].sort((a: any, b: any) => a.date.localeCompare(b.date));
  const eng = (m: any) => (m.likes || 0) + (m.shares || 0) + (m.comments || 0);
  const best = sorted.reduce((b: any, m: any) => !b || eng(m) > eng(b) ? m : b, null);
  const bestF = sorted.reduce((b: any, m: any) => !b || m.newFollowers > b.newFollowers ? m : b, null);
  const half = Math.floor(sorted.length / 2);
  const tot = (l: any[], f: (m: any) => number) => l.reduce((a, m) => a + f(m), 0);
  const h1 = sorted.slice(0, half), h2 = sorted.slice(half);
  const rows = [["Novos seguidores", (m: any) => m.newFollowers || 0], ["Engajamento", eng], ["Alcance", (m: any) => m.reach || 0], ["Postagens", (m: any) => m.posts || 0]] as const;
  const days = sorted.length || 1;
  const promoters = answers.filter((a: any) => a.rating >= 9).length, detr = answers.filter((a: any) => a.rating < 7).length;
  const nps = answers.length ? Math.round((promoters - detr) / answers.length * 100) : null;
  const d = (s: string) => s.split("-").reverse().join("/");
  return <div className="final-summary">
    <h3 className="report-section">Resumo executivo</h3>
    <p>Entre <b>{from}</b> e <b>{to}</b>, a marca <b>{sponsor.name}</b> conquistou <b>{fmtNum(r.newFollowers)}</b> novos seguidores, alcançou <b>{fmtNum(r.reach)}</b> pessoas e gerou <b>{fmtNum(engagement)}</b> interações em <b>{fmtNum(r.posts)}</b> postagens. {answers.length ? <>A pesquisa no espaço da marca recebeu <b>{answers.length}</b> respostas, com satisfação média de <b>{Number(r.satisfaction).toLocaleString("pt-BR")}/10</b>.</> : null} Foram destinadas <b>{tickets.length}</b> de <b>{courtesyTotal}</b> cortesias liberadas e liberadas <b>{credTotal}</b> credenciais.{photos ? <> A aplicação da marca foi registrada em <b>{photos}</b> fotos{links ? <> e <b>{links}</b> posts de mídia foram publicados</> : null}.</> : null}</p>
    <div className="delta-grid">
      <div className="delta-card"><small>Média diária de seguidores</small><strong>{fmtNum(Math.round(r.newFollowers / days))}</strong><span>em {sorted.length} dias</span></div>
      <div className="delta-card"><small>Média diária de engajamento</small><strong>{fmtNum(Math.round(engagement / days))}</strong><span>interações por dia</span></div>
      <div className="delta-card"><small>Melhor dia de engajamento</small><strong>{best ? d(best.date) : "—"}</strong><span>{best ? `${fmtNum(eng(best))} interações` : ""}</span></div>
      <div className="delta-card"><small>Melhor dia de seguidores</small><strong>{bestF ? d(bestF.date) : "—"}</strong><span>{bestF ? `+${fmtNum(bestF.newFollowers)}` : ""}</span></div>
      <div className="delta-card"><small>Índice de recomendação</small><strong>{nps === null ? "—" : nps}</strong><span>{answers.length ? `${promoters} muito satisfeitos · ${detr} insatisfeitos` : "sem respostas"}</span></div>
    </div>
    {sorted.length >= 2 && <><h4>Comparativo: primeira x segunda metade do período</h4>
    <table className="report-table"><thead><tr><th>Indicador</th><th>{d(h1[0].date)} a {d(h1[h1.length - 1].date)}</th><th>{d(h2[0].date)} a {d(h2[h2.length - 1].date)}</th><th>Variação</th></tr></thead><tbody>{rows.map(([l, f]) => { const a = tot(h1, f), b = tot(h2, f), v = pct(b, a); return <tr key={l}><td>{l}</td><td>{fmtNum(a)}</td><td>{fmtNum(b)}</td><td className={v == null ? "" : v >= 0 ? "up" : "down"}>{v == null ? "—" : `${v >= 0 ? "▲" : "▼"} ${Math.abs(v).toLocaleString("pt-BR")}%`}</td></tr>; })}</tbody></table></>}
  </div>;
}

// ---------------------------------------------------------------------------
// Página do cliente: as 7 abas (perfil, marca, mídia, cortesias, credenciamento, pesquisa, contrato)
// ---------------------------------------------------------------------------

const SLOT_LABELS: Record<FileSlot, string> = {
  "commercial-plan": "Plano comercial",
  "ticket-template": "Ficha de compra de ingressos (modelo)",
  "ticket-form": "Ficha de recebimento",
  miv: "MIV",
  logo: "Logo",
  "brand-photo": "Foto da marca aplicada",
  "client-material": "Material do cliente",
  "media-report": "Relatório de mídia",
  "survey-results": "Resultado da pesquisa",
  contract: "Contrato assinado",
};
export const TIERS = ["Master", "Subcota G", "Subcota"];
/** Destino de uma tarefa ou solicitação da RBS: "tier:<cota>" (todas as marcas da cota) ou "sponsor:<id>" (exclusiva). */
export const targetSponsors = (db: Pick<Database, "sponsors">, eventId: string, target: string): string[] => target.startsWith("tier:")
  ? db.sponsors.filter((item) => item.eventId === eventId && item.tier === target.slice(5)).map((item) => item.id)
  : db.sponsors.filter((item) => item.eventId === eventId && item.id === target.slice(8)).map((item) => item.id);
/** Cria uma cópia por marca do destino, ligadas pelo mesmo groupId, para cada marca ter seu próprio status e entrega. */
export const fanOut = <T extends { sponsorId: string }>(db: Pick<Database, "sponsors">, eventId: string, target: string, make: (sponsorId: string) => Omit<T, "id" | "groupId" | "tier">): (T & { id: string; groupId: string; tier?: string })[] => {
  const groupId = uid();
  const tier = target.startsWith("tier:") ? target.slice(5) : undefined;
  return targetSponsors(db, eventId, target).map((sponsorId) => ({ ...(make(sponsorId) as T), id: uid(), groupId, ...(tier ? { tier } : {}) }));
};
const targetText = (target: string, db: Pick<Database, "sponsors">) => target.startsWith("tier:") ? `cota ${target.slice(5)}` : db.sponsors.find((item) => item.id === target.slice(8))?.name ?? "marca";
function TargetSelect({ db, eventId, value, onChange, tier }: { db: Database; eventId: string; value: string; onChange: (value: string) => void; tier?: string }) {
  const sponsors = db.sponsors.filter((item) => item.eventId === eventId && (!tier || item.tier === tier));
  if (tier) return <Field label="Para"><select value={value} onChange={(e) => onChange(e.target.value)}><option value={`tier:${tier}`}>Todas as marcas da cota {tier} · {sponsors.length} {sponsors.length === 1 ? "marca" : "marcas"}</option><optgroup label="Exclusiva para uma marca">{sponsors.map((item) => <option key={item.id} value={`sponsor:${item.id}`}>{item.name}</option>)}</optgroup></select></Field>;
  return <Field label="Para"><select value={value} onChange={(e) => onChange(e.target.value)}><optgroup label="Por cota (todas as marcas)">{TIERS.map((tier) => { const n = sponsors.filter((item) => item.tier === tier).length; return <option key={tier} value={`tier:${tier}`}>Cota {tier} · {n} {n === 1 ? "marca" : "marcas"}</option>; })}</optgroup><optgroup label="Exclusiva para uma marca">{sponsors.map((item) => <option key={item.id} value={`sponsor:${item.id}`}>{item.name} ({item.tier})</option>)}</optgroup></select></Field>;
}
/** Só a cota Master tem pesquisa da ativação e insights do Instagram. */
export const hasFullBenefits = (tier?: string) => tier === "Master";
const URL_PATTERN = /^https?:\/\/\S+$/i;
const MAX_UPLOAD = 750_000;

export function commercialPlanFor(db: Database, eventId: string, tier: string): StoredFile[] {
  return db.files.filter((file) => file.eventId === eventId && file.slot === "commercial-plan" && file.tier === tier && !file.sponsorId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function brandCommercialPlanFor(db: Database, eventId: string, sponsorId: string): StoredFile[] {
  return db.files.filter((file) => file.eventId === eventId && file.slot === "commercial-plan" && file.sponsorId === sponsorId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function replaceCommercialPlan(db: Database, item: StoredFile): Database {
  return { ...db, files: [item, ...db.files.filter((file) => !(file.eventId === item.eventId && file.slot === "commercial-plan" && file.tier === item.tier && !file.sponsorId))] };
}
export function replaceBrandCommercialPlan(db: Database, item: StoredFile): Database {
  return { ...db, files: [item, ...db.files.filter((file) => !(file.eventId === item.eventId && file.slot === "commercial-plan" && file.sponsorId === item.sponsorId))] };
}
export function ticketTemplateFor(db: Database, eventId: string): StoredFile[] {
  const templates = db.files.filter((file) => file.eventId === eventId && file.slot === "ticket-template").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const shared = templates.find((file) => !file.sponsorId);
  return shared ? [shared] : templates.slice(0, 1);
}
export function replaceTicketTemplate(db: Database, item: StoredFile): Database {
  return { ...db, files: [{ ...item, sponsorId: "", tier: undefined, slot: "ticket-template" }, ...db.files.filter((file) => !(file.eventId === item.eventId && file.slot === "ticket-template"))] };
}
function slotFiles(db: Database, eventId: string, sponsorId: string, slot: FileSlot) {
  if (slot === "ticket-template") return ticketTemplateFor(db, eventId);
  if (slot === "commercial-plan") {
    const sponsor = db.sponsors.find((item) => item.id === sponsorId && item.eventId === eventId);
    const exclusive = brandCommercialPlanFor(db, eventId, sponsorId);
    if (exclusive.length) return exclusive;
    const shared = sponsor ? commercialPlanFor(db, eventId, sponsor.tier) : [];
    if (shared.length) return shared;
  }
  return db.files.filter((file) => file.eventId === eventId && file.sponsorId === sponsorId && file.slot === slot).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
function surveyLabels(sponsor?: Sponsor) {
  return SURVEY_QUESTIONS.map((question, index) => sponsor?.surveyQuestions?.[index]?.trim() || question.label);
}
function shortLabel(label: string) {
  const text = label.replace(/^como você avalia (o |a |os |as )?/i, "").replace(/\?$/, "").trim();
  const capped = text.charAt(0).toUpperCase() + text.slice(1);
  return capped.length > 34 ? `${capped.slice(0, 33)}…` : capped;
}
function shortDate(iso: string) { return new Date(iso).toLocaleDateString("pt-BR"); }

function useSurveyAnswers() {
  const [answers, setAnswers] = useState<SurveyAnswer[]>(() => readSurvey());
  useEffect(() => {
    const local = () => setAnswers(readSurvey());
    const remote = () => backend.getPortalState().then((state) => replaceSurveyCache(Array.isArray(state.surveyAnswers) ? state.surveyAnswers : [])).catch(local);
    window.addEventListener("survey-updated", local); window.addEventListener("storage", local); window.addEventListener("focus", remote);
    remote();
    return () => { window.removeEventListener("survey-updated", local); window.removeEventListener("storage", local); window.removeEventListener("focus", remote); };
  }, []);
  return answers;
}

function readAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
}
/** Photos are downscaled before saving so the browser storage of this demo does not fill up. */
async function prepareUpload(file: File, imagesOnly = false): Promise<{ data: string; bytes: number; name: string } | string> {
  if (imagesOnly && !file.type.startsWith("image/")) return "Envie apenas imagens (JPG, PNG ou WEBP).";
  const resizable = /^image\/(jpeg|png|webp)$/.test(file.type) && !(file.type === "image/png" && file.size <= MAX_UPLOAD);
  if (resizable) {
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        for (const quality of [0.82, 0.68, 0.55]) {
          const data = canvas.toDataURL("image/jpeg", quality);
          const bytes = Math.round((data.length - data.indexOf(",") - 1) * 0.75);
          if (bytes <= MAX_UPLOAD) return { data, bytes, name: file.name.replace(/\.(png|webp|jpe?g)$/i, "") + ".jpg" };
        }
        return "Imagem muito grande. Use uma imagem menor.";
      }
    } catch { /* falls back to the original file */ }
  }
  if (file.size > MAX_UPLOAD) return "Use arquivos de até 750 KB nesta demonstração.";
  return { data: await readAsDataUrl(file), bytes: file.size, name: file.name };
}
function makeUploader({ eventId, sponsorId, role, update, notify }: { eventId: string; sponsorId: string; role: Role; update: (fn: (db: Database) => Database) => void; notify: (m: string) => void }) {
  return async (file: File | undefined, slot: FileSlot, options: { replace?: boolean; message?: string; imagesOnly?: boolean; mediaType?: MediaType } = {}) => {
    if (!file || !sponsorId) return;
    const prepared = await prepareUpload(file, options.imagesOnly);
    if (typeof prepared === "string") return notify(prepared);
    const item: StoredFile = { id: uid(), eventId, sponsorId, slot, name: prepared.name, category: SLOT_LABELS[slot], size: formatBytes(prepared.bytes), data: prepared.data, createdAt: new Date().toISOString(), uploadedBy: role, ...(options.mediaType ? { mediaType: options.mediaType } : {}) };
    update((current) => ({ ...current, files: [item, ...current.files.filter((existing) => !(options.replace && existing.eventId === eventId && existing.sponsorId === sponsorId && existing.slot === slot))] }));
    notify(options.message ?? "Arquivo enviado");
  };
}
const removeFileFrom = (update: (fn: (db: Database) => Database) => void, id: string) => update((current) => ({ ...current, files: current.files.filter((file) => file.id !== id) }));

type ProgressStep = { page: Page; label: string; icon: IconName; index: number; done: boolean; waiting: boolean; detail: string };
function clientProgress(db: Database, eventId: string, sponsor: Sponsor): ProgressStep[] {
  const files = (slot: FileSlot) => slotFiles(db, eventId, sponsor.id, slot).length;
  const users = db.users.filter((item) => item.role === "sponsor" && item.sponsorId === sponsor.id).length;
  const contents = (db.contents ?? []).filter((item) => item.eventId === eventId && item.sponsorId === sponsor.id);
  const destined = db.tickets.filter((item) => item.eventId === eventId && item.sponsorId === sponsor.id).length;
  const quota = Object.values(courtesyFor(db, eventId, sponsor.tier, sponsor.id)).reduce((sum, n) => sum + (Number(n) || 0), 0);
  const credRows = credentialsFor(db, eventId, sponsor.tier, sponsor.id);
  const credentials = credRows.reduce((sum, row) => sum + (Number(row.qty) || 0), 0);
  const questions = (sponsor.surveyQuestions ?? []).filter((q) => q.trim()).length;
  const signer = Boolean(sponsor.signer?.name && sponsor.signer?.cpf);
  const materials = files("client-material") + contents.filter((item) => item.kind === "text").length;
  const published = files("media-report") + contents.filter((item) => item.kind === "link").length;
  const plan = files("commercial-plan") > 0;
  const status: Record<string, Omit<ProgressStep, "page" | "label" | "icon" | "index">> = {
    profile: { done: users > 0 && plan, waiting: !plan, detail: `${users} ${users === 1 ? "e-mail" : "e-mails"} com acesso · plano comercial ${plan ? "disponível" : "pendente"} · ficha de ingressos ${files("ticket-form") ? "enviada" : "pendente"}` },
    brand: { done: files("miv") > 0 && files("logo") > 0, waiting: false, detail: `MIV ${files("miv") ? "enviado" : "pendente"} · logo ${files("logo") ? "enviada" : "pendente"} · ${files("brand-photo")} ${files("brand-photo") === 1 ? "foto" : "fotos"} do evento` },
    media: { done: materials > 0, waiting: false, detail: `${materials} ${materials === 1 ? "material enviado" : "materiais enviados"} · ${published} ${published === 1 ? "item" : "itens"} de mídia veiculada` },
    tickets: { done: quota > 0 && destined >= quota, waiting: quota === 0, detail: quota ? `${destined} de ${quota} cortesias destinadas` : "Aguardando a RBS liberar as cortesias" },
    credentials: { done: credentials > 0, waiting: credentials === 0, detail: credentials ? `${credentials} credenciais em ${new Set(credRows.map((row) => row.area)).size} ${new Set(credRows.map((row) => row.area)).size === 1 ? "área" : "áreas"}` : "A RBS preenche as quantidades em dezembro" },
    survey: { done: questions === 3, waiting: false, detail: `${questions} de 3 perguntas personalizadas · ${files("survey-results")} ${files("survey-results") === 1 ? "arquivo" : "arquivos"} de resultado` },
    contract: { done: signer && files("contract") > 0, waiting: signer, detail: `${signer ? "Signatário informado" : "Signatário pendente"} · contrato assinado ${files("contract") ? "disponível" : "pendente"}` },
  };
  return CLIENT_TABS.filter((tab) => tab.page !== "survey" || hasFullBenefits(sponsor.tier)).map((tab, index) => ({ page: tab.page, label: tab.label, icon: tab.icon, index: index + 1, ...status[tab.page] }));
}

function ClientHeader({ sponsor, event, page, allowedPages, go, compact = false }: { sponsor?: Sponsor; event?: EventEdition; page: Page; allowedPages: Page[]; go: (page: Page) => void; compact?: boolean }) {
  const isMedia = MEDIA_PAGES.includes(page);
  // RBS already picks the brand in the bar above, and requests files inside Mídia e conteúdo (no sub-tabs).
  if (!sponsor || compact) return null;
  return <section className="brand-workspace client-header"><div className="brand-workspace-context"><div className="identity"><span>{avatarContent(sponsor.name, sponsor.avatar)}</span><div><small>PÁGINA DO CLIENTE</small><strong>{sponsor.name}</strong><p>{sponsor.tier} · {event?.name}</p></div></div></div>{isMedia && <nav aria-label="Mídia e conteúdo">{MEDIA_TABS.filter((tab) => allowedPages.includes(tab.page)).map((tab) => <Button variant="portal" size="portal" className={page === tab.page ? "active" : ""} type="button" key={tab.page} onClick={() => go(tab.page)}><Icon name={tab.icon} size={16} /><span>{tab.label}</span></Button>)}</nav>}</section>;
}

function FileSlot({ title, text, files, canUpload, canRemove, multiple = false, accept, onUpload, onRemove, uploadLabel = "Enviar arquivo", empty = "Nenhum arquivo enviado." }: { title: string; text: string; files: StoredFile[]; canUpload: boolean; canRemove: boolean; multiple?: boolean; accept?: string; onUpload: (file: File) => void; onRemove: (id: string) => void; uploadLabel?: string; empty?: string }) {
  const [viewing, setViewing] = useState<StoredFile | null>(null);
  const replacing = files.length > 0 && !multiple;
  return <section className="panel slot-card">
    <div className="panel-title"><div><h2>{title}</h2><span>{text}</span></div>{canUpload && <label className={replacing ? "upload-inline replace" : "upload-inline"}><input type="file" accept={accept} multiple={multiple} aria-label={`${uploadLabel}: ${title}`} onChange={(e) => { Array.from(e.target.files ?? []).forEach((file) => onUpload(file)); e.target.value = ""; }} /><Icon name="upload" size={15} />{replacing ? "Substituir" : uploadLabel}</label>}</div>
    <div className="slot-files">{files.map((file) => <div className="slot-file" key={file.id}><Button variant="portal" size="portal" type="button" className="slot-file-open" onClick={() => setViewing(file)} title="Abrir arquivo"><span className="item-icon"><Icon name={file.data.startsWith("data:image/") ? "image" : "file"} size={16} /></span><span><strong>{file.name}</strong><small>{file.size} · {shortDate(file.createdAt)} · enviado por {file.uploadedBy === "rbs" ? "RBS" : "patrocinador"}</small></span></Button>{canRemove && <Button variant="portal" size="portal" className="icon-button danger" type="button" title="Excluir arquivo" onClick={() => { if (confirm(`Excluir ${file.name}?`)) onRemove(file.id); }}><Icon name="trash" size={15} /></Button>}</div>)}{!files.length && <p className="slot-empty">{empty}</p>}</div>
    {viewing && <FileViewer file={viewing} close={() => setViewing(null)} />}
  </section>;
}

function TierCommercialPlans({ db, eventId, update, notify }: { db: Database; eventId: string; update: (fn: (db: Database) => Database) => void; notify: (message: string) => void }) {
  const upload = async (file: File, tier: string) => {
    try {
      const prepared = await prepareUpload(file);
      if (typeof prepared === "string") return notify(prepared);
      const item: StoredFile = { id: uid(), eventId, sponsorId: "", tier, slot: "commercial-plan", name: prepared.name, category: `Plano comercial · ${tier}`, size: formatBytes(prepared.bytes), data: prepared.data, createdAt: new Date().toISOString(), uploadedBy: "rbs" };
      update((current) => replaceCommercialPlan(current, item));
      notify(`Plano comercial da cota ${tier} enviado`);
    } catch { notify("Não foi possível ler o arquivo. Tente novamente."); }
  };
  return <><h3 className="client-section">Planos comerciais por cota</h3><div className="client-grid three">{TIERS.map((tier) => <FileSlot key={`${eventId}-${tier}`} title={tier} text="Plano comercial" files={commercialPlanFor(db, eventId, tier)} canUpload canRemove accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*" uploadLabel="Enviar plano" onUpload={(file) => upload(file, tier)} onRemove={(id) => { removeFileFrom(update, id); notify(`Plano comercial da cota ${tier} removido`); }} empty="Nenhum plano enviado para esta cota." />)}</div></>;
}

function BrandCustomizations({ db, eventId, sponsor, update, notify }: { db: Database; eventId: string; sponsor: Sponsor; update: (fn: (db: Database) => Database) => void; notify: (message: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", status: "Planejada" as BrandImplementation["status"] });
  const plans = brandCommercialPlanFor(db, eventId, sponsor.id);
  const implementations = sponsor.implementations ?? [];
  useEffect(() => {
    setAdding(false);
    setEditingId(null);
    setForm({ title: "", description: "", status: "Planejada" });
  }, [sponsor.id, eventId]);
  const upload = async (file: File) => {
    try {
      const prepared = await prepareUpload(file);
      if (typeof prepared === "string") return notify(prepared);
      const item: StoredFile = { id: uid(), eventId, sponsorId: sponsor.id, tier: sponsor.tier, slot: "commercial-plan", name: prepared.name, category: `Plano comercial exclusivo · ${sponsor.name}`, size: formatBytes(prepared.bytes), data: prepared.data, createdAt: new Date().toISOString(), uploadedBy: "rbs" };
      update((current) => replaceBrandCommercialPlan(current, item));
      notify(`Plano comercial exclusivo de ${sponsor.name} enviado`);
    } catch { notify("Não foi possível ler o arquivo. Tente novamente."); }
  };
  const addImplementation = (event: React.FormEvent) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    const data = { title: title.slice(0, 160), description: form.description.trim().slice(0, 1000), status: form.status };
    update((current) => ({ ...current, sponsors: current.sponsors.map((item) => item.id === sponsor.id ? { ...item, implementations: editingId ? (item.implementations ?? []).map((implementation) => implementation.id === editingId ? { ...implementation, ...data } : implementation) : [...(item.implementations ?? []), { id: uid(), ...data, createdAt: new Date().toISOString() }] } : item) }));
    setForm({ title: "", description: "", status: "Planejada" });
    setAdding(false);
    setEditingId(null);
    notify(editingId ? `Implementação específica de ${sponsor.name} atualizada` : `Implementação específica adicionada para ${sponsor.name}`);
  };
  const editImplementation = (implementation: BrandImplementation) => {
    setForm({ title: implementation.title, description: implementation.description, status: implementation.status });
    setEditingId(implementation.id);
    setAdding(true);
  };
  const setStatus = (id: string, status: BrandImplementation["status"]) => {
    update((current) => ({ ...current, sponsors: current.sponsors.map((item) => item.id === sponsor.id ? { ...item, implementations: (item.implementations ?? []).map((implementation) => implementation.id === id ? { ...implementation, status } : implementation) } : item) }));
    notify(`Status da implementação atualizado`);
  };
  const removeImplementation = (id: string) => {
    if (!confirm("Excluir esta implementação específica?")) return;
    update((current) => ({ ...current, sponsors: current.sponsors.map((item) => item.id === sponsor.id ? { ...item, implementations: (item.implementations ?? []).filter((implementation) => implementation.id !== id) } : item) }));
    notify("Implementação específica removida");
  };
  return <section className="hub-section brand-customizations" aria-labelledby="brand-customizations-title">
    <div className="hub-section-title"><div><span>3</span><div><h2 id="brand-customizations-title">Configurações específicas · {sponsor.name}</h2><p>O plano e as implementações abaixo valem somente para a marca selecionada e não afetam outras marcas da mesma cota.</p></div></div></div>
    <div className="client-grid two">
      <FileSlot title="Plano comercial exclusivo" text={`Substitui o plano padrão da cota ${sponsor.tier} apenas para ${sponsor.name}.`} files={plans} canUpload canRemove accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*" uploadLabel="Enviar plano exclusivo" onUpload={upload} onRemove={(id) => { removeFileFrom(update, id); notify(`Plano exclusivo de ${sponsor.name} removido; o plano da cota volta a ser exibido`); }} empty={`Nenhum plano exclusivo. A marca recebe o plano padrão da cota ${sponsor.tier}.`} />
      <section className="panel implementation-panel">
        <div className="panel-title"><div><h2>Implementações específicas</h2><span>{implementations.length} {implementations.length === 1 ? "configuração exclusiva" : "configurações exclusivas"} para esta marca</span></div>{!adding && <Button variant="portal" size="portal" className="primary" type="button" onClick={() => { setEditingId(null); setForm({ title: "", description: "", status: "Planejada" }); setAdding(true); }}><Icon name="plus" size={15} /> Nova implementação</Button>}</div>
        {adding && <form className="panel-form compact implementation-form" onSubmit={addImplementation}><Field label="Título"><input required autoFocus maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Área VIP personalizada" /></Field><Field label="Descrição"><textarea rows={3} maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes, regras e diferenças exclusivas desta marca." /></Field><Field label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as BrandImplementation["status"] })}><option>Planejada</option><option>Em andamento</option><option>Concluída</option></select></Field><div className="panel-form-actions"><Button variant="portal" size="portal" className="outline" type="button" onClick={() => { setAdding(false); setEditingId(null); }}>Cancelar</Button><Button variant="portal" size="portal" className="primary" type="submit">{editingId ? "Salvar alterações" : "Adicionar"}</Button></div></form>}
        <div className="item-list implementation-list">{implementations.map((implementation) => <div className="item-row" key={implementation.id}><span className="item-icon"><Icon name={implementation.status === "Concluída" ? "check" : "edit"} size={16} /></span><div><strong>{implementation.title}</strong><small>{implementation.description || "Sem observações adicionais"} · criada em {shortDate(implementation.createdAt)}</small></div><select className={`implementation-status ${implementation.status === "Concluída" ? "done" : implementation.status === "Em andamento" ? "active" : ""}`} aria-label={`Status de ${implementation.title}`} value={implementation.status} onChange={(e) => setStatus(implementation.id, e.target.value as BrandImplementation["status"])}><option>Planejada</option><option>Em andamento</option><option>Concluída</option></select><Button variant="portal" size="portal" className="icon-button" type="button" title="Editar implementação" onClick={() => editImplementation(implementation)}><Icon name="edit" size={15} /></Button><Button variant="portal" size="portal" className="icon-button danger" type="button" title="Excluir implementação" onClick={() => removeImplementation(implementation.id)}><Icon name="trash" size={15} /></Button></div>)}{!implementations.length && !adding && <p className="slot-empty">Nenhuma implementação exclusiva cadastrada para esta marca.</p>}</div>
      </section>
    </div>
  </section>;
}

function EventTicketTemplate({ db, eventId, update, notify }: { db: Database; eventId: string; update: (fn: (db: Database) => Database) => void; notify: (message: string) => void }) {
  const upload = async (file: File) => {
    try {
      const prepared = await prepareUpload(file);
      if (typeof prepared === "string") return notify(prepared);
      const item: StoredFile = { id: uid(), eventId, sponsorId: "", slot: "ticket-template", name: prepared.name, category: SLOT_LABELS["ticket-template"], size: formatBytes(prepared.bytes), data: prepared.data, createdAt: new Date().toISOString(), uploadedBy: "rbs" };
      update((current) => replaceTicketTemplate(current, item));
      notify("Modelo da ficha de compra enviado para todas as marcas do evento");
    } catch { notify("Não foi possível ler o arquivo. Tente novamente."); }
  };
  return <><h3 className="client-section">Ficha de compra do evento</h3><FileSlot title="Ficha de compra" text="Modelo padrão para todas as marcas deste evento." files={ticketTemplateFor(db, eventId)} canUpload canRemove accept=".pdf,.doc,.docx,.xls,.xlsx" uploadLabel="Enviar modelo" onUpload={upload} onRemove={() => { update((current) => ({ ...current, files: current.files.filter((file) => !(file.eventId === eventId && file.slot === "ticket-template")) })); notify("Modelo da ficha de compra removido do evento"); }} empty="Nenhum modelo enviado para este evento." /></>;
}

export function canSendTicketDocument(role: Role, canEdit: boolean, slot: "ticket-template" | "ticket-form") {
  return slot === "ticket-template" ? role === "rbs" : role === "sponsor" && canEdit;
}

function ProfileTab({ db, eventId, event, sponsor, role, user, canEdit, update, notify, openUser, editUser }: any) {
  const isRbs = role === "rbs";
  const [form, setForm] = useState({ name: sponsor.name, tier: sponsor.tier, contact: sponsor.contact });
  useEffect(() => setForm({ name: sponsor.name, tier: sponsor.tier, contact: sponsor.contact }), [sponsor.id, sponsor.name, sponsor.tier, sponsor.contact]);
  const upload = makeUploader({ eventId, sponsorId: sponsor.id, role, update, notify });
  const remove = (id: string) => removeFileFrom(update, id);
  const tiers = TIERS.includes(form.tier) ? TIERS : [form.tier, ...TIERS];
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const next = { name: form.name.trim(), tier: form.tier, contact: form.contact.trim() };
    if (!next.name) return notify("Informe o nome do cliente.");
    update((current: Database) => ({ ...current, sponsors: current.sponsors.map((item) => item.id === sponsor.id ? { ...item, ...next } : item) }));
    notify("Perfil do cliente salvo");
  };
  return <>
    {isRbs ? <div className="hub-section-title profile-title" id="client-profile"><div><span>4</span><div><h2>Perfil do cliente · {sponsor.name}</h2><p>Dados do patrocínio, e-mails com acesso e documentos comerciais.</p></div></div></div> : <Heading title="Perfil do cliente" text="Dados do patrocínio, e-mails com acesso e documentos comerciais do cliente." />}
    <div className="client-grid profile-grid">
      <section className="panel">
        <div className="panel-title"><div><h2>Dados do cliente</h2><span>{isRbs ? "Preenchido pela RBS" : "Cadastrado pela RBS"}</span></div></div>
        <div className="profile-avatar"><span className="profile-avatar-img">{avatarContent(sponsor.name, sponsor.avatar)}</span><div><strong>Imagem do perfil</strong><small>{sponsor.avatar ? "Aparece no portal ao lado do nome da marca." : "Nenhuma imagem. Use a logo ou uma foto quadrada."}</small>{(isRbs || canEdit) && <div className="profile-avatar-actions"><label className="upload-inline"><input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Enviar imagem do perfil" onChange={async (e) => { const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; if (!file.type.startsWith("image/")) return notify("Escolha um arquivo de imagem."); try { const avatar = await resizeImage(file); update((current: Database) => ({ ...current, sponsors: current.sponsors.map((item) => item.id === sponsor.id ? { ...item, avatar } : item) })); notify("Imagem do perfil atualizada"); } catch { notify("Não foi possível ler a imagem."); } }} /><Icon name="upload" size={15} />{sponsor.avatar ? "Trocar imagem" : "Adicionar imagem"}</label>{sponsor.avatar && <Button variant="portal" size="portal" className="outline" type="button" onClick={() => { update((current: Database) => ({ ...current, sponsors: current.sponsors.map((item) => item.id === sponsor.id ? { ...item, avatar: undefined } : item) })); notify("Imagem do perfil removida"); }}>Remover</Button>}</div>}</div></div>
        {isRbs ? <form className="panel-form" onSubmit={save}>
          <Field label="Nome do cliente"><input required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Cota de patrocínio"><select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>{tiers.map((tier) => <option key={tier}>{tier}</option>)}</select></Field>
          <Field label="Contato responsável"><input maxLength={120} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></Field>
          <div className="panel-form-actions"><Button variant="portal" size="portal" className="primary" type="submit">Salvar perfil</Button></div>
        </form> : <dl className="info-list"><div><dt>Cliente</dt><dd>{sponsor.name}</dd></div><div><dt>Cota de patrocínio</dt><dd>{sponsor.tier}</dd></div><div><dt>Contato responsável</dt><dd>{sponsor.contact || "—"}</dd></div><div><dt>Evento</dt><dd>{event?.name}</dd></div></dl>}
      </section>
      <Users db={db} sponsorId={sponsor.id} userId={user.id} update={update} open={openUser} edit={editUser} canManage={role === "rbs"} />
    </div>
    <h3 className="client-section">Documentos comerciais e compra de ingressos</h3>
    <div className={`client-grid ${isRbs ? "two" : "three"}`}>
      {!isRbs && <FileSlot title="Plano comercial" text={brandCommercialPlanFor(db, eventId, sponsor.id).length ? "Proposta comercial exclusiva preparada pela RBS para a sua marca." : `Proposta comercial da cota ${sponsor.tier}, enviada pela RBS.`} files={slotFiles(db, eventId, sponsor.id, "commercial-plan")} canUpload={false} canRemove={false} onUpload={() => {}} onRemove={() => {}} empty="O plano comercial desta cota ainda não foi enviado pela RBS." />}
      {!isRbs && <FileSlot title="Ficha de compra" text="Modelo padrão do evento enviado pela RBS. Baixe e preencha para solicitar a compra de ingressos." files={slotFiles(db, eventId, sponsor.id, "ticket-template")} canUpload={false} canRemove={false} onUpload={() => {}} onRemove={() => {}} empty="A RBS ainda não disponibilizou o modelo deste evento." />}
      <FileSlot title="Ficha de recebimento" text={isRbs ? "Ficha preenchida enviada pela marca para análise da RBS." : "Envie a ficha preenchida para análise da RBS."} files={slotFiles(db, eventId, sponsor.id, "ticket-form")} canUpload={canSendTicketDocument(role, canEdit, "ticket-form")} canRemove={canSendTicketDocument(role, canEdit, "ticket-form")} accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" uploadLabel="Enviar ficha" onUpload={(file) => { if (canSendTicketDocument(role, canEdit, "ticket-form")) upload(file, "ticket-form", { replace: true, message: "Ficha de recebimento enviada" }); }} onRemove={remove} empty={isRbs ? "A marca ainda não enviou a ficha." : "Nenhuma ficha enviada."} />
    </div>
    {!isRbs && (sponsor.implementations ?? []).length > 0 && <section className="panel sponsor-implementations"><div className="panel-title"><div><h2>Implementações específicas da sua marca</h2><span>Configurações preparadas pela RBS exclusivamente para {sponsor.name}.</span></div></div><div className="item-list implementation-list">{(sponsor.implementations ?? []).map((implementation: BrandImplementation) => <div className="item-row" key={implementation.id}><span className="item-icon"><Icon name={implementation.status === "Concluída" ? "check" : "edit"} size={16} /></span><div><strong>{implementation.title}</strong><small>{implementation.description || "Sem observações adicionais"}</small></div><span className={`implementation-status readonly ${implementation.status === "Concluída" ? "done" : implementation.status === "Em andamento" ? "active" : ""}`}>{implementation.status}</span></div>)}</div></section>}
  </>;
}

function BrandTab({ db, eventId, sponsor, role, user, canEdit, update, notify }: any) {
  const isRbs = role === "rbs";
  const upload = makeUploader({ eventId, sponsorId: sponsor.id, role, update, notify });
  const remove = (id: string) => removeFileFrom(update, id);
  const photos = slotFiles(db, eventId, sponsor.id, "brand-photo");
  const [viewing, setViewing] = useState<StoredFile | null>(null);
  return <>
    <Heading title="Aplicações de marca no evento" text="Envie o MIV e a logo para aplicação. Depois do festival, a RBS publica as fotos que comprovam a marca aplicada." />
    <div className="client-grid two">
      <FileSlot title="MIV" text="Manual de identidade visual da marca." files={slotFiles(db, eventId, sponsor.id, "miv")} canUpload={canEdit} canRemove={canEdit} accept=".pdf,image/*,.zip" uploadLabel="Enviar MIV" onUpload={(file) => upload(file, "miv", { replace: true, message: "MIV enviado" })} onRemove={remove} empty="MIV ainda não enviado." />
      <FileSlot title="Logo" text="Versão em alta resolução (PNG, SVG ou PDF)." files={slotFiles(db, eventId, sponsor.id, "logo")} canUpload={canEdit} canRemove={canEdit} accept="image/*,.pdf,.svg,.ai,.eps" uploadLabel="Enviar logo" onUpload={(file) => upload(file, "logo", { replace: true, message: "Logo enviada" })} onRemove={remove} empty="Logo ainda não enviada." />
    </div>
    <section className="panel photo-panel">
      <div className="panel-title"><div><h2>Fotos da marca aplicada</h2><span>{photos.length} {photos.length === 1 ? "foto" : "fotos"} · entram automaticamente no relatório final</span></div>{isRbs && <label className="upload-inline"><input type="file" accept="image/*" multiple aria-label="Enviar fotos da marca aplicada" onChange={(e) => { Array.from(e.target.files ?? []).forEach((file) => upload(file, "brand-photo", { imagesOnly: true, message: "Foto publicada" })); e.target.value = ""; }} /><Icon name="image" size={15} />Enviar fotos</label>}</div>
      {photos.length ? <div className="photo-grid">{photos.map((photo) => <figure key={photo.id}><Button variant="portal" size="portal" type="button" className="photo-open" onClick={() => setViewing(photo)} aria-label={`Ampliar ${photo.name}`}><img src={photo.data} alt={photo.name} loading="lazy" /></Button><figcaption><span>{shortDate(photo.createdAt)}</span>{isRbs && <Button variant="portal" size="portal" className="icon-button danger" type="button" title="Excluir foto" onClick={() => { if (confirm("Excluir esta foto?")) remove(photo.id); }}><Icon name="trash" size={14} /></Button>}</figcaption></figure>)}</div> : <Empty text={isRbs ? "Envie as fotos da marca aplicada após o festival." : "As fotos da marca aplicada serão publicadas pela RBS após o festival."} />}
    </section>
    {viewing && <FileViewer file={viewing} close={() => setViewing(null)} />}
  </>;
}

function MediaTab({ db, eventId, sponsor, role, user, update, notify }: any) {
  const isRbs = role === "rbs";
  const canSend = !isRbs;
  const upload = makeUploader({ eventId, sponsorId: sponsor.id, role, update, notify });
  const [mediaType, setMediaType] = useState<MediaType>("assinada");
  const current = MEDIA_TYPES.find((item) => item.id === mediaType) ?? MEDIA_TYPES[0];
  const allContents: ContentItem[] = (db.contents ?? []).filter((item: ContentItem) => item.eventId === eventId && item.sponsorId === sponsor.id);
  const allMaterials = slotFiles(db, eventId, sponsor.id, "client-material");
  const allReports = slotFiles(db, eventId, sponsor.id, "media-report");
  // Mídia veiculada (relatórios e links) tem painel próprio (PublishedMediaPanel), por marca.
  const countOf = (type: MediaType) => [...allContents.filter((item) => item.kind === "text"), ...allMaterials].filter((item) => mediaTypeOf(item) === type).length;
  const contents = allContents.filter((item) => mediaTypeOf(item) === mediaType);
  const materials = [
    ...allMaterials.filter((file) => mediaTypeOf(file) === mediaType).map((file) => ({ id: file.id, type: "file", title: file.name, at: file.createdAt, file })),
    ...contents.filter((item) => item.kind === "text").map((item) => ({ id: item.id, type: "text", title: item.title, at: item.createdAt, text: item })),
  ].sort((a: any, b: any) => b.at.localeCompare(a.at));
  const reports = allReports.filter((file) => mediaTypeOf(file) === mediaType);
  const links = contents.filter((item) => item.kind === "link").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const moveFile = (id: string, type: MediaType) => { update((db: Database) => ({ ...db, files: db.files.map((file) => file.id === id ? { ...file, mediaType: type } : file) })); notify(`Movido para ${MEDIA_TYPES.find((t) => t.id === type)?.title}`); };
  const moveContent = (id: string, type: MediaType) => { update((db: Database) => ({ ...db, contents: (db.contents ?? []).map((item) => item.id === id ? { ...item, mediaType: type } : item) })); notify(`Movido para ${MEDIA_TYPES.find((t) => t.id === type)?.title}`); };
  const MoveTo = ({ onMove, name }: { onMove: (type: MediaType) => void; name: string }) => isRbs ? <select className="media-move" value="" aria-label={`Mover ${name} para outro tipo de mídia`} onChange={(e) => e.target.value && onMove(e.target.value as MediaType)}><option value="">Mover para…</option>{MEDIA_TYPES.filter((t) => t.id !== mediaType).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select> : null;
  const [text, setText] = useState({ title: "", body: "" });
  const [link, setLink] = useState({ title: "", url: "" });
  const [viewing, setViewing] = useState<StoredFile | null>(null);
  const [reading, setReading] = useState<ContentItem | null>(null);
  const addContent = (item: Omit<ContentItem, "id" | "eventId" | "sponsorId" | "author" | "authorName" | "createdAt">) => update((current: Database) => ({ ...current, contents: [...(current.contents ?? []), { ...item, id: uid(), eventId, sponsorId: sponsor.id, author: role, authorName: user.name, createdAt: new Date().toISOString() }] }));
  const removeContent = (id: string) => update((current: Database) => ({ ...current, contents: (current.contents ?? []).filter((item) => item.id !== id) }));
  const sendText = (e: React.FormEvent) => {
    e.preventDefault();
    const title = text.title.trim(), body = text.body.trim();
    if (!title || !body) return;
    addContent({ kind: "text", title: title.slice(0, 120), body: body.slice(0, 5000), mediaType });
    setText({ title: "", body: "" });
    notify("Texto enviado para a RBS");
  };
  const publishLink = (e: React.FormEvent) => {
    e.preventDefault();
    const url = link.url.trim();
    if (!URL_PATTERN.test(url)) return notify("Informe um link começando com http:// ou https://");
    addContent({ kind: "link", title: (link.title.trim() || url).slice(0, 160), body: "", url, mediaType });
    setLink({ title: "", url: "" });
    notify("Link publicado");
  };
  const confirmRemove = (fn: () => void) => { if (confirm("Excluir este item?")) fn(); };
  // Solicitações de arquivo ficam dentro de Materiais do cliente, separadas pelo serviço de mídia.
  const requests: FileRequest[] = (db.fileRequests ?? []).filter((item: FileRequest) => item.eventId === eventId && item.sponsorId === sponsor.id && mediaTypeOf(item) === mediaType).sort((a: FileRequest, b: FileRequest) => a.dueDate.localeCompare(b.dueDate));
  const requestFile = (id: string): StoredFile | undefined => db.files.find((file: StoredFile) => file.requestId === id);
  const deliveredCount = requests.filter((req) => requestFile(req.id)).length;
  const [asking, setAsking] = useState(false);
  const blankRequest = () => ({ title: "", description: "", dueDate: "", target: `tier:${sponsor.tier}` });
  const [request, setRequest] = useState(blankRequest);
  useEffect(() => { setRequest(blankRequest()); }, [sponsor.id]);
  const sendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const title = request.title.trim();
    if (!title || !request.dueDate) return;
    const items = fanOut<FileRequest>(db, eventId, request.target, (sid) => ({ eventId, sponsorId: sid, title: title.slice(0, 160), description: request.description.trim().slice(0, 500), dueDate: request.dueDate, mediaType }));
    if (!items.length) return notify(`Nenhuma marca na ${targetText(request.target, db)} neste evento.`);
    update((current: Database) => ({ ...current, fileRequests: [...(current.fileRequests ?? []), ...items] }));
    setRequest(blankRequest());
    setAsking(false);
    notify(`Arquivo de ${current.title} solicitado para ${targetText(request.target, db)} (${items.length} ${items.length === 1 ? "marca" : "marcas"})`);
  };
  const deliverRequest = (file: File | undefined, req: FileRequest) => {
    if (!file) return;
    if (file.size > 750_000) return notify("Use arquivos de até 750 KB neste MVP");
    const reader = new FileReader();
    reader.onload = () => {
      update((current: Database) => ({ ...current, files: [{ id: uid(), eventId, sponsorId: sponsor.id, requestId: req.id, name: file.name, category: "Solicitação", size: formatBytes(file.size), data: String(reader.result), createdAt: new Date().toISOString(), uploadedBy: role, mediaType }, ...current.files.filter((item) => item.requestId !== req.id)] }));
      notify("Arquivo entregue");
    };
    reader.readAsDataURL(file);
  };
  // Excluir uma solicitação por cota remove a solicitação de todas as marcas daquela cota.
  const removeRequest = (req: FileRequest) => update((current: Database) => { const ids = new Set((current.fileRequests ?? []).filter((item) => item.id === req.id || (req.groupId && item.groupId === req.groupId)).map((item) => item.id)); return { ...current, fileRequests: (current.fileRequests ?? []).filter((item) => !ids.has(item.id)), files: current.files.filter((item) => !item.requestId || !ids.has(item.requestId)) }; });
  const today = new Date().toISOString().slice(0, 10);
  return <>
    <Heading title="Mídia e conteúdo" text="Materiais e arquivos solicitados, separados pelos 3 serviços de mídia: Assinada, Própria e Conteúdo de marca. A mídia veiculada publicada pela RBS aparece no fim da página." />
    <div className="media-types" role="tablist" aria-label="Tipo de mídia">{MEDIA_TYPES.map((type) => <Button variant="portal" size="portal" key={type.id} role="tab" aria-selected={mediaType === type.id} className={mediaType === type.id ? "active" : ""} type="button" onClick={() => setMediaType(type.id)}><span>{type.label}</span><small>{countOf(type.id)} {countOf(type.id) === 1 ? "item" : "itens"}</small></Button>)}</div>
    <div className="media-type-intro"><strong>{current.title}</strong><span>{current.text}</span></div>
    <div className="client-grid single" role="tabpanel" aria-label={current.title}>
      <section className="panel">
        <div className="panel-title"><div><h2>Materiais do cliente</h2><span>{materials.length} {materials.length === 1 ? "envio" : "envios"} · arquivos ou textos</span></div>{canSend && <label className="upload-inline"><input type="file" multiple aria-label="Enviar arquivo de material" onChange={(e) => { Array.from(e.target.files ?? []).forEach((file) => upload(file, "client-material", { message: `Material de ${current.title} enviado para a RBS`, mediaType })); e.target.value = ""; }} /><Icon name="upload" size={15} />Enviar arquivo</label>}{isRbs && !asking && <Button variant="portal" size="portal" className="primary" type="button" onClick={() => setAsking(true)}><Icon name="plus" size={15} /> Solicitar arquivo</Button>}</div>
        {isRbs && asking && <form className="panel-form compact" aria-label="Solicitar arquivo" onSubmit={sendRequest}><Field label={`Arquivo solicitado · ${current.title}`}><input required autoFocus maxLength={160} value={request.title} onChange={(e) => setRequest({ ...request, title: e.target.value })} placeholder="Ex.: Vídeo de 30s para o telão" /></Field><TargetSelect db={db} eventId={eventId} value={request.target} onChange={(target) => setRequest({ ...request, target })} /><Field label="Instruções"><input maxLength={500} value={request.description} onChange={(e) => setRequest({ ...request, description: e.target.value })} placeholder="Formato, tamanho, observações" /></Field><Field label="Data de entrega"><input required type="date" min={today} value={request.dueDate} onChange={(e) => setRequest({ ...request, dueDate: e.target.value })} /></Field><div className="panel-form-actions"><Button variant="portal" size="portal" className="outline" type="button" onClick={() => { setAsking(false); setRequest(blankRequest()); }}>Cancelar</Button><Button variant="portal" size="portal" className="primary" type="submit" disabled={!request.title.trim() || !request.dueDate}><Icon name="send" size={15} /> Solicitar</Button></div></form>}
        {(requests.length > 0 || isRbs) && <div className="item-list media-requests" aria-label="Arquivos solicitados"><p className="media-requests-title">Arquivos solicitados · {requests.length} · {deliveredCount} {deliveredCount === 1 ? "entregue" : "entregues"} · {requests.length - deliveredCount} {requests.length - deliveredCount === 1 ? "pendente" : "pendentes"}</p>{requests.map((req) => { const file = requestFile(req.id); const late = !file && req.dueDate < today; return <div className="item-row" key={req.id}><span className="item-icon"><Icon name={file ? "check" : "clock"} size={16} /></span><div><strong>{req.title}</strong><small>{file ? "Entregue" : late ? "Atrasado" : "Pendente"} · Entrega: {formatDate(req.dueDate)}{isRbs && req.groupId ? (req.tier ? ` · Cota ${req.tier}` : " · Exclusiva") : ""}{req.description ? ` · ${req.description}` : ""}</small></div>{file && <Button variant="portal" size="portal" className="outline" type="button" onClick={() => setViewing(file)}>Abrir</Button>}{canSend && <label className={file ? "upload-inline replace" : "upload-inline"}><input type="file" aria-label={`Enviar ${req.title}`} onChange={(e) => { deliverRequest(e.target.files?.[0], req); e.target.value = ""; }} /><Icon name="upload" size={15} />{file ? "Substituir" : "Enviar"}</label>}{isRbs && <Button variant="portal" size="portal" className="icon-button danger" type="button" title="Excluir solicitação" onClick={() => { if (confirm(req.tier ? `Excluir esta solicitação para todas as marcas da cota ${req.tier}?` : "Excluir esta solicitação?")) removeRequest(req); }}><Icon name="trash" size={15} /></Button>}</div>; })}{!requests.length && <p className="slot-empty">Nenhum arquivo de {current.title} solicitado.</p>}</div>}
        {canSend && <form className="panel-form compact" onSubmit={sendText}><Field label="Título do texto"><input maxLength={120} value={text.title} onChange={(e) => setText({ ...text, title: e.target.value })} placeholder="Ex.: Texto para locução no palco" /></Field><Field label="Texto"><textarea rows={4} maxLength={5000} value={text.body} onChange={(e) => setText({ ...text, body: e.target.value })} placeholder="Escreva ou cole o conteúdo" /></Field><div className="panel-form-actions"><Button variant="portal" size="portal" className="primary" type="submit" disabled={!text.title.trim() || !text.body.trim()}><Icon name="send" size={15} /> Enviar texto</Button></div></form>}
        <div className="item-list">{materials.map((item: any) => <div className="item-row" key={item.id}><span className="item-icon"><Icon name={item.type === "file" ? "file" : "message"} size={16} /></span><div><strong>{item.title}</strong><small>{item.type === "file" ? `Arquivo · ${item.file.size}` : "Texto"} · {shortDate(item.at)}</small></div><Button variant="portal" size="portal" className="outline" type="button" onClick={() => item.type === "file" ? setViewing(item.file) : setReading(item.text)}>Abrir</Button><MoveTo name={item.title} onMove={(type) => item.type === "file" ? moveFile(item.id, type) : moveContent(item.id, type)} /><Button variant="portal" size="portal" className="icon-button danger" type="button" title="Excluir" onClick={() => confirmRemove(() => item.type === "file" ? removeFileFrom(update, item.id) : removeContent(item.id))}><Icon name="trash" size={15} /></Button></div>)}{!materials.length && <p className="slot-empty">{canSend ? `Envie arquivos ou textos de ${current.title} para a RBS.` : `O cliente ainda não enviou materiais de ${current.title}.`}</p>}</div>
      </section>
    </div>
    <PublishedMediaPanel db={db} eventId={eventId} tier={sponsor.tier} sponsorId={sponsor.id} role={role} user={user} update={update} notify={notify} />
    {viewing && <FileViewer file={viewing} close={() => setViewing(null)} />}
    {reading && <Modal title={reading.title} onClose={() => setReading(null)}><p className="text-reader">{reading.body}</p><small className="text-reader-meta">Enviado por {reading.authorName} em {new Date(reading.createdAt).toLocaleString("pt-BR")}</small></Modal>}
  </>;
}

/** Agrupa as cópias criadas por fanOut (mesmo groupId) em um item só. */
function groupCopies<T extends { id: string; groupId?: string }>(items: T[]): { key: string; first: T; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) { const key = item.groupId ?? item.id; map.set(key, [...(map.get(key) ?? []), item]); }
  return [...map.entries()].map(([key, list]) => ({ key, first: list[0]!, items: list }));
}

/** Mídia e conteúdo da equipe RBS organizada por cota: tarefas, solicitações e mídia valem para todas as marcas da cota. */
function TierMediaTab({ db, eventId, tier, user, update, notify }: { db: Database; eventId: string; tier: string; user?: User; update: (fn: (db: Database) => Database) => void; notify: (m: string) => void }) {
  const sponsors = db.sponsors.filter((item) => item.eventId === eventId && item.tier === tier);
  const ids = new Set(sponsors.map((item) => item.id));
  const nameOf = (id: string) => db.sponsors.find((item) => item.id === id)?.name ?? "Marca";
  const [mediaType, setMediaType] = useState<MediaType>("assinada");
  const current = MEDIA_TYPES.find((item) => item.id === mediaType) ?? MEDIA_TYPES[0]!;
  const inTier = (item: { eventId: string; sponsorId: string }) => item.eventId === eventId && ids.has(item.sponsorId);
  const ofType = (item: { mediaType?: MediaType }) => mediaTypeOf(item) === mediaType;
  const allContents = (db.contents ?? []).filter(inTier);
  const allMaterials = db.files.filter((file) => inTier(file) && file.slot === "client-material");
  const allRequests = (db.fileRequests ?? []).filter(inTier);
  // Mídia veiculada (relatórios e links) tem painel próprio (PublishedMediaPanel), por marca.
  const countOf = (type: MediaType) => new Set([...allContents.filter((item) => item.kind === "text"), ...allMaterials, ...allRequests].filter((item) => mediaTypeOf(item) === type).map((item) => item.groupId ?? item.id)).size;
  const today = new Date().toISOString().slice(0, 10);
  const scopeText = (first: { tier?: string; groupId?: string; sponsorId: string }) => first.tier ? `Todas as marcas da cota ${first.tier}` : `${first.groupId ? "Exclusiva · " : ""}${nameOf(first.sponsorId)}`;
  const [viewing, setViewing] = useState<StoredFile | null>(null);
  const [reading, setReading] = useState<ContentItem | null>(null);
  const confirmRemove = (text: string, fn: () => void) => { if (confirm(text)) fn(); };
  const blank = () => ({ title: "", description: "", dueDate: "", target: `tier:${tier}` });
  const [asking, setAsking] = useState(false);
  const [request, setRequest] = useState(blank);
  useEffect(() => { setRequest(blank()); setAsking(false); }, [tier, eventId]);
  const count = (n: number) => `${n} ${n === 1 ? "marca" : "marcas"}`;

  // Solicitações
  const requestFile = (id: string) => db.files.find((file) => file.requestId === id);
  const requestGroups = groupCopies(allRequests.filter(ofType)).sort((a, b) => a.first.dueDate.localeCompare(b.first.dueDate));
  const sendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const title = request.title.trim();
    if (!title || !request.dueDate) return;
    const items = fanOut<FileRequest>(db, eventId, request.target, (sid) => ({ eventId, sponsorId: sid, title: title.slice(0, 160), description: request.description.trim().slice(0, 500), dueDate: request.dueDate, mediaType }));
    if (!items.length) return notify(`Nenhuma marca na cota ${tier} neste evento.`);
    update((db) => ({ ...db, fileRequests: [...(db.fileRequests ?? []), ...items] }));
    setRequest(blank()); setAsking(false);
    notify(`Arquivo de ${current.title} solicitado para ${targetText(request.target, db)} (${count(items.length)})`);
  };
  const removeRequestGroup = (list: FileRequest[]) => { const gone = new Set(list.map((item) => item.id)); update((db) => ({ ...db, fileRequests: (db.fileRequests ?? []).filter((item) => !gone.has(item.id)), files: db.files.filter((file) => !file.requestId || !gone.has(file.requestId)) })); };

  // Materiais enviados pelas marcas da cota
  const materials = [
    ...allMaterials.filter(ofType).map((file) => ({ id: file.id, type: "file" as const, title: file.name, at: file.createdAt, sponsorId: file.sponsorId, file })),
    ...allContents.filter((item) => item.kind === "text" && ofType(item)).map((item) => ({ id: item.id, type: "text" as const, title: item.title, at: item.createdAt, sponsorId: item.sponsorId, text: item })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const moveItems = (fileIds: string[], contentIds: string[], type: MediaType) => {
    const f = new Set(fileIds), c = new Set(contentIds);
    update((db) => ({ ...db, files: db.files.map((file) => f.has(file.id) ? { ...file, mediaType: type } : file), contents: (db.contents ?? []).map((item) => c.has(item.id) ? { ...item, mediaType: type } : item) }));
    notify(`Movido para ${MEDIA_TYPES.find((t) => t.id === type)?.title}`);
  };
  const removeItems = (fileIds: string[], contentIds: string[]) => {
    const f = new Set(fileIds), c = new Set(contentIds);
    update((db) => ({ ...db, files: db.files.filter((file) => !f.has(file.id)), contents: (db.contents ?? []).filter((item) => !c.has(item.id)) }));
  };
  const MoveTo = ({ name, onMove }: { name: string; onMove: (type: MediaType) => void }) => <select className="media-move" value="" aria-label={`Mover ${name} para outro tipo de mídia`} onChange={(e) => e.target.value && onMove(e.target.value as MediaType)}><option value="">Mover para…</option>{MEDIA_TYPES.filter((t) => t.id !== mediaType).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select>;

  return <>
    <Heading title={`Mídia e conteúdo · ${tier}`} text={`Tarefas e solicitações valem para todas as marcas da cota ${tier} (${count(sponsors.length)}). Use "Para" quando o pedido for exclusivo de uma marca.`} />
    {!sponsors.length && <Empty text={`Nenhuma marca da cota ${tier} neste evento.`} />}
    <div className="media-types" role="tablist" aria-label="Tipo de mídia">{MEDIA_TYPES.map((type) => <Button variant="portal" size="portal" key={type.id} role="tab" aria-selected={mediaType === type.id} className={mediaType === type.id ? "active" : ""} type="button" onClick={() => setMediaType(type.id)}><span>{type.label}</span><small>{countOf(type.id)} {countOf(type.id) === 1 ? "item" : "itens"}</small></Button>)}</div>
    <div className="media-type-intro"><strong>{current.title}</strong><span>{current.text}</span></div>
    <div className="client-grid single" role="tabpanel" aria-label={current.title}>
      <section className="panel">
        <div className="panel-title"><div><h2>Materiais das marcas</h2><span>{materials.length} {materials.length === 1 ? "envio" : "envios"} · solicitações para a cota</span></div>{!asking && <Button variant="portal" size="portal" className="primary" type="button" disabled={!sponsors.length} onClick={() => setAsking(true)}><Icon name="plus" size={15} /> Solicitar arquivo</Button>}</div>
        {asking && <form className="panel-form compact" aria-label="Solicitar arquivo" onSubmit={sendRequest}><Field label={`Arquivo solicitado · ${current.title}`}><input required autoFocus maxLength={160} value={request.title} onChange={(e) => setRequest({ ...request, title: e.target.value })} placeholder="Ex.: Vídeo de 30s para o telão" /></Field><TargetSelect db={db} eventId={eventId} tier={tier} value={request.target} onChange={(target) => setRequest({ ...request, target })} /><Field label="Instruções"><input maxLength={500} value={request.description} onChange={(e) => setRequest({ ...request, description: e.target.value })} placeholder="Formato, tamanho, observações" /></Field><Field label="Data de entrega"><input required type="date" min={today} value={request.dueDate} onChange={(e) => setRequest({ ...request, dueDate: e.target.value })} /></Field><div className="panel-form-actions"><Button variant="portal" size="portal" className="outline" type="button" onClick={() => { setAsking(false); setRequest(blank()); }}>Cancelar</Button><Button variant="portal" size="portal" className="primary" type="submit" disabled={!request.title.trim() || !request.dueDate}><Icon name="send" size={15} /> Solicitar</Button></div></form>}
        <div className="item-list media-requests" aria-label="Arquivos solicitados"><p className="media-requests-title">Arquivos solicitados · {requestGroups.length}</p>{requestGroups.map(({ key, first, items }) => { const delivered = items.filter((req) => requestFile(req.id)).length; const single = items.length === 1 && !first.tier; const singleFile = single ? requestFile(first.id) : undefined; const progress = single ? (singleFile ? "Entregue" : first.dueDate < today ? "Atrasado" : "Pendente") : `${delivered} de ${items.length} ${items.length === 1 ? "entregue" : "entregues"}`; return <div className="request-group" key={key}><div className="item-row"><span className="item-icon"><Icon name={delivered === items.length ? "check" : "clock"} size={16} /></span><div><strong>{first.title}</strong><small>{scopeText(first)} · Entrega: {formatDate(first.dueDate)} · {progress}{first.description ? ` · ${first.description}` : ""}</small></div>{singleFile && <Button variant="portal" size="portal" className="outline" type="button" onClick={() => setViewing(singleFile)}>Abrir</Button>}<Button variant="portal" size="portal" className="icon-button danger" type="button" title="Excluir solicitação" onClick={() => confirmRemove(items.length > 1 ? `Excluir esta solicitação para as ${items.length} marcas?` : "Excluir esta solicitação?", () => removeRequestGroup(items))}><Icon name="trash" size={15} /></Button></div>{!single && <ul className="request-brands">{items.map((req) => { const file = requestFile(req.id); return <li key={req.id}><span>{nameOf(req.sponsorId)}</span><em className={file ? "done" : req.dueDate < today ? "late" : "pending"}>{file ? "Entregue" : req.dueDate < today ? "Atrasado" : "Pendente"}</em>{file && <Button variant="portal" size="portal" className="outline" type="button" onClick={() => setViewing(file)}>Abrir</Button>}</li>; })}</ul>}</div>; })}{!requestGroups.length && <p className="slot-empty">Nenhum arquivo de {current.title} solicitado para a cota {tier}.</p>}</div>
        <div className="item-list">{materials.map((item) => <div className="item-row" key={item.id}><span className="item-icon"><Icon name={item.type === "file" ? "file" : "message"} size={16} /></span><div><strong>{item.title}</strong><small>{nameOf(item.sponsorId)} · {item.type === "file" ? `Arquivo · ${item.file.size}` : "Texto"} · {shortDate(item.at)}</small></div><Button variant="portal" size="portal" className="outline" type="button" onClick={() => item.type === "file" ? setViewing(item.file) : setReading(item.text)}>Abrir</Button><MoveTo name={item.title} onMove={(type) => item.type === "file" ? moveItems([item.id], [], type) : moveItems([], [item.id], type)} /><Button variant="portal" size="portal" className="icon-button danger" type="button" title="Excluir" onClick={() => confirmRemove("Excluir este item?", () => item.type === "file" ? removeItems([item.id], []) : removeItems([], [item.id]))}><Icon name="trash" size={15} /></Button></div>)}{!materials.length && <p className="slot-empty">As marcas da cota {tier} ainda não enviaram materiais de {current.title}.</p>}</div>
      </section>
    </div>
    {viewing && <FileViewer file={viewing} close={() => setViewing(null)} />}
    {reading && <Modal title={reading.title} onClose={() => setReading(null)}><p className="text-reader">{reading.body}</p><small className="text-reader-meta">Enviado por {reading.authorName} em {new Date(reading.createdAt).toLocaleString("pt-BR")}</small></Modal>}
  </>;
}

/** Mídia veiculada (relatórios e links da RBS) de uma marca, em Mídia e conteúdo. A RBS publica para a marca escolhida no painel superior; a marca só visualiza. */
function PublishedMediaPanel({ db, eventId, tier, sponsorId, brandName, role, user, update, notify }: { db: Database; eventId: string; tier: string; sponsorId: string; brandName?: string; role: Role; user?: User; update: (fn: (db: Database) => Database) => void; notify: (m: string) => void }) {
  const isRbs = role === "rbs";
  const ids = new Set([sponsorId]);
  const inScope = (item: { eventId: string; sponsorId: string }) => item.eventId === eventId && ids.has(item.sponsorId);
  const nameOf = (id: string) => db.sponsors.find((item) => item.id === id)?.name ?? "Marca";
  const count = (n: number) => `${n} ${n === 1 ? "marca" : "marcas"}`;
  const [mediaType, setMediaType] = useState<MediaType>("assinada");
  const target = `sponsor:${sponsorId}`;
  const [link, setLink] = useState({ title: "", url: "" });
  const [viewing, setViewing] = useState<StoredFile | null>(null);
  const typeTitle = (item: { mediaType?: MediaType }) => MEDIA_TYPES.find((t) => t.id === mediaTypeOf(item))?.title ?? "";
  const scopeText = (first: { tier?: string; groupId?: string; sponsorId: string }) => first.tier ? `Todas as marcas da cota ${first.tier}` : `${first.groupId ? "Exclusiva · " : ""}${nameOf(first.sponsorId)}`;
  type Row = { id: string; groupId?: string; tier?: string; sponsorId: string; createdAt: string; kind: "file" | "link"; mediaType?: MediaType; file?: StoredFile; link?: ContentItem };
  const rows: Row[] = [
    ...db.files.filter((file) => inScope(file) && file.slot === "media-report").map((file) => ({ id: file.id, groupId: file.groupId, tier: file.tier, sponsorId: file.sponsorId, createdAt: file.createdAt, kind: "file" as const, mediaType: file.mediaType, file })),
    ...(db.contents ?? []).filter((item) => inScope(item) && item.kind === "link").map((item) => ({ id: item.id, groupId: item.groupId, tier: item.tier, sponsorId: item.sponsorId, createdAt: item.createdAt, kind: "link" as const, mediaType: item.mediaType, link: item })),
  ];
  const published = rows.map((row) => ({ key: row.id, first: row, items: [row] })).sort((a, b) => b.first.createdAt.localeCompare(a.first.createdAt));
  const typeName = MEDIA_TYPES.find((t) => t.id === mediaType)?.title ?? "";
  const publishReport = async (file: File | undefined) => {
    if (!file) return;
    const prepared = await prepareUpload(file);
    if (typeof prepared === "string") return notify(prepared);
    const createdAt = new Date().toISOString();
    const items = fanOut<StoredFile>(db, eventId, target, (sid) => ({ eventId, sponsorId: sid, slot: "media-report", name: prepared.name, category: SLOT_LABELS["media-report"], size: formatBytes(prepared.bytes), data: prepared.data, createdAt, uploadedBy: "rbs", mediaType }));
    if (!items.length) return notify("Marca não encontrada neste evento.");
    update((db) => ({ ...db, files: [...items, ...db.files] }));
    notify(`Relatório de ${typeName} publicado para ${brandName ?? targetText(target, db)}`);
  };
  const publishLink = (e: React.FormEvent) => {
    e.preventDefault();
    const url = link.url.trim();
    if (!URL_PATTERN.test(url)) return notify("Informe um link começando com http:// ou https://");
    const createdAt = new Date().toISOString();
    const items = fanOut<ContentItem>(db, eventId, target, (sid) => ({ eventId, sponsorId: sid, kind: "link", title: (link.title.trim() || url).slice(0, 160), body: "", url, author: "rbs", authorName: user?.name ?? "Equipe RBS", createdAt, mediaType }));
    if (!items.length) return notify("Marca não encontrada neste evento.");
    update((db) => ({ ...db, contents: [...(db.contents ?? []), ...items] }));
    setLink({ title: "", url: "" });
    notify(`Link de ${typeName} publicado para ${brandName ?? targetText(target, db)}`);
  };
  const ofKind = (items: Row[], kind: Row["kind"]) => new Set(items.filter((i) => i.kind === kind).map((i) => i.id));
  const moveGroup = (items: Row[], type: MediaType) => { const f = ofKind(items, "file"), c = ofKind(items, "link"); update((db) => ({ ...db, files: db.files.map((file) => f.has(file.id) ? { ...file, mediaType: type } : file), contents: (db.contents ?? []).map((item) => c.has(item.id) ? { ...item, mediaType: type } : item) })); notify(`Movido para ${MEDIA_TYPES.find((t) => t.id === type)?.title}`); };
  const removeGroup = (items: Row[]) => { const f = ofKind(items, "file"), c = ofKind(items, "link"); update((db) => ({ ...db, files: db.files.filter((file) => !f.has(file.id)), contents: (db.contents ?? []).filter((item) => !c.has(item.id)) })); };
  return <section className="panel spaced published-media-panel" aria-label="Mídia veiculada">
    <div className="panel-title"><div><h2>Mídia veiculada{isRbs && brandName ? ` · ${brandName}` : ""}</h2><span>{isRbs ? `Relatórios e links publicados pela RBS para ${brandName ?? "esta marca"} (${tier})` : "Relatórios e links publicados pela RBS · somente visualização"}</span></div>{isRbs && <label className="upload-inline"><input type="file" multiple accept=".pdf,image/*,.xls,.xlsx,.ppt,.pptx,.doc,.docx" aria-label="Enviar relatório de mídia" onChange={(e) => { Array.from(e.target.files ?? []).forEach((file) => void publishReport(file)); e.target.value = ""; }} /><Icon name="upload" size={15} />Enviar relatório</label>}</div>
    {isRbs && <form className="panel-form compact" aria-label="Publicar mídia" onSubmit={publishLink}><div className="fields"><Field label="Tipo de mídia"><select value={mediaType} onChange={(e) => setMediaType(e.target.value as MediaType)}>{MEDIA_TYPES.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></Field></div><Field label="Título do post"><input maxLength={160} value={link.title} onChange={(e) => setLink({ ...link, title: e.target.value })} placeholder="Ex.: Reels oficial · ativação da marca" /></Field><Field label="Link"><input type="url" required value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} placeholder="https://www.instagram.com/p/..." /></Field><div className="panel-form-actions"><Button variant="portal" size="portal" className="primary" type="submit"><Icon name="link" size={15} /> Publicar link</Button></div></form>}
    <div className="item-list">
      {published.map(({ key, first, items }) => { const title = first.kind === "file" ? first.file!.name : first.link!.title; return <div className="item-row" key={key}><span className="item-icon"><Icon name={first.kind === "file" ? "file" : "link"} size={16} /></span><div><strong>{title}</strong><small>{isRbs && first.tier ? `Enviado para toda a cota ${first.tier} · ` : ""}{typeTitle(first)} · {first.kind === "file" ? `Relatório de mídia · ${shortDate(first.createdAt)}` : first.link!.url}</small></div>{first.kind === "file" ? <Button variant="portal" size="portal" className="outline" type="button" onClick={() => setViewing(first.file!)}>Abrir</Button> : <a className="outline" href={first.link!.url} target="_blank" rel="noreferrer noopener">Abrir post</a>}{isRbs && <select className="media-move" value="" aria-label={`Mover ${title} para outro tipo de mídia`} onChange={(e) => e.target.value && moveGroup(items, e.target.value as MediaType)}><option value="">Mover para…</option>{MEDIA_TYPES.filter((t) => t.id !== mediaTypeOf(first)).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select>}{isRbs && <Button variant="portal" size="portal" className="icon-button danger" type="button" title="Excluir" onClick={() => { if (confirm(`Excluir este item de ${brandName ?? "esta marca"}?`)) removeGroup(items); }}><Icon name="trash" size={15} /></Button>}</div>; })}
      {!published.length && <p className="slot-empty">{isRbs ? `Publique relatórios e links para ${brandName ?? "esta marca"}.` : "A RBS ainda não publicou mídia veiculada."}</p>}
    </div>
    {viewing && <FileViewer file={viewing} close={() => setViewing(null)} />}
  </section>;
}

function TierCourtesy({ db, eventId, update, notify }: any) {
  const [target, setTarget] = useState(`tier:${TIERS[0]}`);
  const [newSector, setNewSector] = useState("");
  const sectors = courtesySectorsFor(db, eventId);
  const sponsorId = target.startsWith("sponsor:") ? target.slice(8) : "";
  const selectedSponsor: Sponsor | undefined = db.sponsors.find((item: Sponsor) => item.eventId === eventId && item.id === sponsorId);
  const tier = selectedSponsor?.tier ?? target.slice(5);
  const quota: Record<string, number> = courtesyFor(db, eventId, tier, sponsorId || undefined);
  const [draft, setDraft] = useState<Record<string, string | number>>(quota);
  const event = db.events.find((item: EventEdition) => item.id === eventId);
  const isExclusive = !!sponsorId && Object.prototype.hasOwnProperty.call(event?.courtesyBySponsor ?? {}, sponsorId);
  useEffect(() => { setTarget(`tier:${TIERS[0]}`); }, [eventId]);
  useEffect(() => { setDraft(courtesyFor(db, eventId, tier, sponsorId || undefined)); }, [target, eventId]);
  const tierSponsors: Sponsor[] = db.sponsors.filter((item: Sponsor) => item.eventId === eventId && item.tier === tier);
  const total = (q: Record<string, any>) => sectors.reduce((sum, sector) => sum + PASS_TYPES.reduce((acc, type) => acc + (Number(q[qKey(sector, type)]) || 0), 0), 0);
  const addSector = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSector.trim().replace(/\s+/g, " ").replace(/\|/g, "-").slice(0, 50);
    if (!name) return;
    if (sectors.some((sector) => sector.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))) return notify("Este setor já está cadastrado.");
    update((current: Database) => ({ ...current, events: current.events.map((item) => item.id === eventId ? { ...item, courtesySectors: [...courtesySectorsFor(current, eventId), name] } : item) }));
    setNewSector("");
    notify(`Setor ${name} adicionado ao evento`);
  };
  const removeSector = (sector: string) => {
    if (db.tickets.some((ticket: Ticket) => ticket.eventId === eventId && (ticket.sector ?? "Arena") === sector)) return notify(`Não é possível excluir ${sector}: existem cortesias destinadas neste setor.`);
    if (!confirm(`Excluir o setor ${sector}? As quantidades configuradas nele serão removidas.`)) return;
    const withoutSector = (groups: Record<string, Record<string, number>> | undefined) => Object.fromEntries(Object.entries(groups ?? {}).map(([key, values]) => [key, Object.fromEntries(Object.entries(values).filter(([quotaKey]) => !quotaKey.startsWith(`${sector}|`)))]));
    update((current: Database) => ({ ...current, events: current.events.map((item) => item.id === eventId ? { ...item, courtesySectors: courtesySectorsFor(current, eventId).filter((name) => name !== sector), courtesyByTier: withoutSector(item.courtesyByTier), courtesyBySponsor: withoutSector(item.courtesyBySponsor) } : item) }));
    notify(`Setor ${sector} removido`);
  };
  const save = () => {
    const clean: Record<string, number> = {};
    const scopedSponsors = sponsorId ? tierSponsors.filter((item) => item.id === sponsorId) : tierSponsors.filter((item) => !Object.prototype.hasOwnProperty.call(event?.courtesyBySponsor ?? {}, item.id));
    for (const sector of sectors) for (const type of PASS_TYPES) {
      const value = Math.max(0, Math.floor(Number(draft[qKey(sector, type)]) || 0));
      const over = scopedSponsors.find((item) => db.tickets.filter((t: Ticket) => t.eventId === eventId && t.sponsorId === item.id && (t.sector ?? "Arena") === sector && (t.passType ?? "Sexta") === type).length > value);
      if (over) return notify(`${sector} · ${type}: ${over.name} já destinou mais cortesias que essa quantidade.`);
      if (value) clean[qKey(sector, type)] = value;
    }
    update((current: Database) => ({ ...current, events: current.events.map((item) => item.id === eventId ? sponsorId ? { ...item, courtesyBySponsor: { ...(item.courtesyBySponsor ?? {}), [sponsorId]: clean } } : { ...item, courtesyByTier: { ...(item.courtesyByTier ?? {}), [tier]: clean } } : item) }));
    setDraft(clean);
    notify(sponsorId ? `Cortesias exclusivas de ${selectedSponsor?.name} atualizadas` : `Cortesias da cota ${tier} atualizadas para ${tierSponsors.length} ${tierSponsors.length === 1 ? "marca" : "marcas"}`);
  };
  const useTierDefault = () => {
    update((current: Database) => ({ ...current, events: current.events.map((item) => {
      if (item.id !== eventId) return item;
      const next = { ...(item.courtesyBySponsor ?? {}) };
      delete next[sponsorId];
      return { ...item, courtesyBySponsor: next };
    }) }));
    setDraft(courtesyFor({ ...db, events: db.events.map((item) => item.id === eventId ? { ...item, courtesyBySponsor: Object.fromEntries(Object.entries(item.courtesyBySponsor ?? {}).filter(([id]) => id !== sponsorId)) } : item) }, eventId, tier));
    notify(`${selectedSponsor?.name} voltou a usar as quantidades da cota ${tier}`);
  };
  return <>
    <Heading title="Cortesias" text="Cadastre os setores do evento e defina quantidades para toda uma cota ou exclusivamente para uma marca. Cada setor oferece Passaporte, Sexta e Sábado." />
    <section className="panel courtesy-sector-manager">
      <div className="panel-title"><div><h2>Setores do evento</h2><span>Cadastre os locais disponíveis para as cortesias deste evento.</span></div></div>
      <div className="courtesy-sector-content"><div className="courtesy-sector-list">{sectors.map((sector) => <span key={sector}>{sector}<Button variant="portal" size="portal" type="button" title={`Excluir ${sector}`} aria-label={`Excluir setor ${sector}`} onClick={() => removeSector(sector)}><Icon name="x" size={13} /></Button></span>)}</div><form onSubmit={addSector}><input maxLength={50} value={newSector} onChange={(e) => setNewSector(e.target.value)} placeholder="Ex.: Premium, Rooftop ou Terraço" aria-label="Nome do novo setor" /><Button variant="portal" size="portal" className="primary" type="submit" disabled={!newSector.trim()}><Icon name="plus" size={15} /> Adicionar setor</Button></form></div>
    </section>
    <div className="stats">{TIERS.map((t) => <Stat key={t} label={`Cota ${t}`} value={String(total(courtesyFor(db, eventId, t)))} icon="gift" />)}</div>
    <section className="table courtesy-table">
      <div className="table-title"><div><h2>{sponsorId ? `Quantidades exclusivas · ${selectedSponsor?.name}` : `Quantidades da cota ${tier}`}</h2><span>{sponsorId ? isExclusive ? "Configuração exclusiva ativa para esta marca." : `Ao salvar, esta marca deixará de usar as quantidades da cota ${tier}.` : `${tierSponsors.length} ${tierSponsors.length === 1 ? "marca" : "marcas"} recebem esta configuração.`}</span></div><div className="heading-actions"><select aria-label="Aplicar quantidades para" value={target} onChange={(e) => setTarget(e.target.value)}><optgroup label="Por cota">{TIERS.map((item) => <option key={item} value={`tier:${item}`}>Cota {item}</option>)}</optgroup><optgroup label="Marca específica">{db.sponsors.filter((item: Sponsor) => item.eventId === eventId).map((item: Sponsor) => <option key={item.id} value={`sponsor:${item.id}`}>{item.name} ({item.tier})</option>)}</optgroup></select>{isExclusive && <Button variant="portal" size="portal" className="outline" type="button" onClick={useTierDefault}>Usar padrão da cota</Button>}<Button variant="portal" size="portal" className="primary" type="button" onClick={save}>Salvar quantidades</Button></div></div>
      <div className="table-head courtesy-cols"><span>SETOR</span>{PASS_TYPES.map((type) => <span key={type}>{type === "Passaporte" ? <>PASSAPORTE&nbsp;&nbsp;</> : passTypeLabel(type).toUpperCase()}</span>)}<span>TOTAL</span></div>
      {sectors.map((sector) => <div className="table-row courtesy-cols" key={sector}><strong>{sector}</strong>{PASS_TYPES.map((type) => { const key = qKey(sector, type); return <input key={key} type="number" min="0" aria-label={`${sector} ${type}`} value={draft[key] ?? 0} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />; })}<span>{PASS_TYPES.reduce((sum, type) => sum + (Number(draft[qKey(sector, type)]) || 0), 0)}</span></div>)}
      {!sectors.length && <Empty text="Cadastre pelo menos um setor para configurar as cortesias." />}
    </section>
  </>;
}

function CourtesyTab({ db, eventId, sponsor, role, update, notify }: any) {
  const isRbs = role === "rbs";
  const quota: Record<string, number> = courtesyFor(db, eventId, sponsor.tier, sponsor.id);
  const sectors = courtesySectorsFor(db, eventId);
  const exclusive = Object.prototype.hasOwnProperty.call(db.events.find((item: EventEdition) => item.id === eventId)?.courtesyBySponsor ?? {}, sponsor.id);
  const tierSponsors: Sponsor[] = db.sponsors.filter((item: Sponsor) => item.eventId === eventId && item.tier === sponsor.tier);
  const tickets: Ticket[] = db.tickets.filter((item: Ticket) => item.eventId === eventId && item.sponsorId === sponsor.id);
  const sectorOf = (ticket: Ticket) => ticket.sector ?? "Arena";
  const typeOf = (ticket: Ticket) => ticket.passType ?? "Sexta";
  const usedOf = (sector: string, type: string) => tickets.filter((ticket) => sectorOf(ticket) === sector && typeOf(ticket) === type).length;
  const amount = (sector: string, type: string) => Number(quota[qKey(sector, type)]) || 0;
  const total = sectors.reduce((sum, sector) => sum + PASS_TYPES.reduce((acc, type) => acc + amount(sector, type), 0), 0);
  const options = sectors.flatMap((sector) => PASS_TYPES.map((type) => ({ sector, type, left: amount(sector, type) - usedOf(sector, type) }))).filter((option) => option.left > 0);
  const available = options.reduce((sum, option) => sum + option.left, 0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string | number>>(quota);
  const [lounge, setLounge] = useState(sponsor.loungeInfo ?? "");
  const [assigning, setAssigning] = useState(false);
  useEffect(() => { setDraft(quota); setLounge(sponsor.loungeInfo ?? ""); setEditing(false); }, [sponsor.id, sponsor.tier]);
  const saveQuota = () => {
    const clean: Record<string, number> = {};
    for (const sector of sectors) for (const type of PASS_TYPES) {
      const value = Math.max(0, Math.floor(Number(draft[qKey(sector, type)]) || 0));
      const over = db.tickets.filter((t: Ticket) => t.eventId === eventId && t.sponsorId === sponsor.id && (t.sector ?? "Arena") === sector && (t.passType ?? "Sexta") === type).length > value;
      if (over) return notify(`${sector} · ${type}: ${sponsor.name} já destinou mais cortesias que essa quantidade.`);
      if (value) clean[qKey(sector, type)] = value;
    }
    update((current: Database) => ({ ...current, events: current.events.map((item) => item.id === eventId ? { ...item, courtesyBySponsor: { ...(item.courtesyBySponsor ?? {}), [sponsor.id]: clean } } : item) }));
    setEditing(false);
    notify(`Cortesias exclusivas de ${sponsor.name} atualizadas`);
  };
  const saveLounge = (e: React.FormEvent) => { e.preventDefault(); update((current: Database) => ({ ...current, sponsors: current.sponsors.map((item) => item.id === sponsor.id ? { ...item, loungeInfo: lounge.trim().slice(0, 1500) } : item) })); notify("Informações do Lounge salvas"); };
  return <>
    <Heading title="Cortesias" text={exclusive ? "Quantidades exclusivas liberadas pela RBS para a sua marca. Destine Passaportes, acessos de Sexta ou de Sábado aos convidados." : `Quantidades liberadas pela RBS para a cota ${sponsor.tier}. Destine Passaportes, acessos de Sexta ou de Sábado aos convidados.`} action={<div className="heading-actions">{isRbs && !editing && <Button variant="portal" size="portal" className="outline" type="button" onClick={() => { setDraft(quota); setEditing(true); }}><Icon name="edit" size={16} /> Editar quantidades da marca</Button>}{!isRbs && <Button variant="portal" size="portal" className="primary" type="button" onClick={() => setAssigning(true)} disabled={!available}><Icon name="plus" size={16} /> Destinar cortesia</Button>}</div>} />
    <div className="stats"><Stat label="Cortesias liberadas" value={String(total)} icon="gift" /><Stat label="Destinadas" value={String(tickets.length)} icon="users" /><Stat label="Disponíveis" value={String(available)} icon="check" /><Stat label="Utilizadas" value={String(tickets.filter((ticket) => ticket.status === "Utilizada").length)} icon="shield" /></div>
    <section className="table courtesy-table">
      <div className="table-title"><div><h2>Cortesias por setor</h2><span>{editing ? `Configuração exclusiva para ${sponsor.name}.` : `Destinadas / liberadas · ${exclusive ? "configuração exclusiva" : `cota ${sponsor.tier}`}`}</span></div>{editing && <div className="heading-actions"><Button variant="portal" size="portal" className="outline" type="button" onClick={() => setEditing(false)}>Cancelar</Button><Button variant="portal" size="portal" className="primary" type="button" onClick={saveQuota}>Salvar quantidades</Button></div>}</div>
      <div className="table-head courtesy-cols"><span>SETOR</span>{PASS_TYPES.map((type) => <span key={type}>{passTypeLabel(type).toUpperCase()}</span>)}<span>TOTAL</span></div>
      {sectors.map((sector) => {
        const rowTotal = PASS_TYPES.reduce((sum, type) => sum + amount(sector, type), 0);
        const rowUsed = PASS_TYPES.reduce((sum, type) => sum + usedOf(sector, type), 0);
        return <div className="table-row courtesy-cols" key={sector}><strong>{sector}</strong>{PASS_TYPES.map((type) => { const key = qKey(sector, type); return editing ? <input key={key} type="number" min="0" aria-label={`${sector} ${type}`} value={draft[key] ?? 0} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} /> : <span key={key} className={amount(sector, type) ? "quota" : "quota none"}><b>{usedOf(sector, type)}</b> / {amount(sector, type)}</span>; })}<span className="quota total"><b>{rowUsed}</b> / {rowTotal}</span></div>;
      })}
    </section>
    <section className="panel lounge-panel"><div className="panel-title"><div><h2>Lounge</h2><span>Informações do Lounge do patrocinador</span></div></div>{isRbs ? <form className="panel-form" onSubmit={saveLounge}><Field label="Informações do Lounge"><textarea rows={3} maxLength={1500} value={lounge} onChange={(e) => setLounge(e.target.value)} placeholder="Horários, localização, regras de acesso e capacidade" /></Field><div className="panel-form-actions"><Button variant="portal" size="portal" className="primary" type="submit">Salvar informações</Button></div></form> : <p className="lounge-text">{sponsor.loungeInfo || "A RBS ainda não publicou as informações do Lounge."}</p>}</section>
    <section className="table">
      <div className="table-title"><div><h2>Cortesias destinadas</h2><span>{tickets.length} {tickets.length === 1 ? "convidado" : "convidados"}</span></div></div>
      <div className="table-head courtesy-guest-cols"><span>CONVIDADO</span><span>E-MAIL</span><span>SETOR · TIPO</span><span>STATUS</span><span /></div>
      {tickets.map((item) => <div className="table-row courtesy-guest-cols" key={item.id}><strong>{item.name}</strong><span>{item.email}</span><span>{sectorOf(item)} · {typeOf(item)}</span>{isRbs ? <select aria-label={`Status de ${item.name}`} value={item.status} onChange={(e) => update((current: Database) => ({ ...current, tickets: current.tickets.map((ticket) => ticket.id === item.id ? { ...ticket, status: e.target.value as Ticket["status"] } : ticket) }))}><option>Enviada</option><option>Utilizada</option></select> : <span className={`ticket-status ${item.status === "Utilizada" ? "used" : ""}`}>{item.status}</span>}<Button variant="portal" size="portal" className="icon-button danger" type="button" title="Remover cortesia" onClick={() => { if (confirm(`Remover a cortesia de ${item.name}?`)) update((current: Database) => ({ ...current, tickets: current.tickets.filter((ticket) => ticket.id !== item.id) })); }}><Icon name="trash" size={16} /></Button></div>)}
      {!tickets.length && <Empty text="Nenhuma cortesia destinada ainda." />}
    </section>
    {assigning && <AssignCourtesy options={options} close={() => setAssigning(false)} onSave={(guest: any) => { update((current: Database) => ({ ...current, tickets: [...current.tickets, { id: uid(), eventId, sponsorId: sponsor.id, name: guest.name, email: guest.email, sector: guest.sector, passType: guest.passType, status: "Enviada" }] })); setAssigning(false); notify("Cortesia destinada"); }} />}
  </>;
}
function AssignCourtesy({ options, close, onSave }: any) {
  const [form, setForm] = useState({ name: "", email: "", option: options[0] ? qKey(options[0].sector, options[0].type) : "" });
  return <FormShell title="Destinar cortesia" close={close} action="Destinar" submit={(e) => {
    e.preventDefault();
    if (!options.some((option: any) => qKey(option.sector, option.type) === form.option)) return;
    const [sector, passType] = form.option.split("|");
    onSave({ name: form.name.trim(), email: form.email.trim(), sector, passType });
  }}><Field label="Nome completo"><input required autoFocus maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="E-mail"><input required type="email" maxLength={160} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field><Field label="Setor e tipo"><select value={form.option} onChange={(e) => setForm({ ...form, option: e.target.value })}>{options.map((option: any) => <option key={qKey(option.sector, option.type)} value={qKey(option.sector, option.type)}>{option.sector} · {passTypeLabel(option.type)} ({option.left} {option.left === 1 ? "disponível" : "disponíveis"})</option>)}</select></Field></FormShell>;
}

/** Pessoas que a marca cadastrou no Open Staff do portal, neste evento. */
export const staffOf = (db: Database, eventId: string, sponsorId: string) => (db.credentials ?? []).filter((c) => c.eventId === eventId && c.sponsorId === sponsorId);
/** Vagas restantes de uma área/público: liberadas na cota menos as pessoas já cadastradas nela. */
export const staffLeft = (grid: Record<string, number>, staff: Credential[], area: string, group: string) => (grid[qKey(area, group)] ?? 0) - staff.filter((c) => c.area === area && c.group === group).length;

function OpenStaffCard({ event, eventId, isRbs, update, notify }: any) {
  const open = !!event?.openStaffOpen;
  const toggle = () => {
    update((current: Database) => ({ ...current, events: current.events.map((item) => item.id === eventId ? { ...item, openStaffOpen: !open } : item) }));
    notify(open ? "Cadastro do Open Staff encerrado" : "Cadastro do Open Staff aberto para as marcas");
  };
  return <section className="openstaff-card">
    <div><span className="openstaff-tag">CREDENCIAMENTO DA EQUIPE</span><strong>Open Staff</strong><p>{isRbs ? "Quando o cadastro estiver aberto, cada marca cadastra as próprias pessoas na aba Credenciamento, dentro das quantidades gerais ou exclusivas configuradas." : "Cadastre aqui as pessoas da sua equipe, dentro das quantidades liberadas para a sua marca."}</p></div>
    <div className="openstaff-actions">
      <span className={`openstaff-pending ${open ? "is-open" : ""}`}>{open ? "● Cadastro aberto" : "○ Cadastro fechado"}</span>
      {isRbs ? <Button variant="portal" size="portal" className={open ? "outline" : "primary"} type="button" onClick={toggle}>{open ? "Encerrar cadastro" : "Abrir cadastro"}</Button> : !open && <span className="openstaff-pending">O cadastro será aberto pela RBS.</span>}
    </div>
  </section>;
}

function StaffList({ staff, canRemove, remove, setStatus }: { staff: Credential[]; canRemove?: boolean; remove?: (id: string) => void; setStatus?: (id: string, status: Status) => void }) {
  return <>
    <div className="table-head staff-cols"><span>NOME</span><span>DOCUMENTO</span><span>ÁREA · PÚBLICO</span><span>SITUAÇÃO</span><span /></div>
    {staff.map((c) => <div className="table-row staff-cols" key={c.id}><strong>{c.name}</strong><span>{c.document}</span><span>{c.group ? `${c.area} · ${c.group}` : c.area}</span>{setStatus ? <select aria-label={`Situação de ${c.name}`} value={c.status} onChange={(e) => setStatus(c.id, e.target.value as Status)}>{(["Pendente", "Em análise", "Concluído"] as Status[]).map((st) => <option key={st}>{st}</option>)}</select> : <span className={`status ${c.status === "Concluído" ? "done" : ""}`}>{c.status}</span>}<span>{canRemove && remove && c.status !== "Concluído" && <Button variant="portal" size="portal" className="icon-button" type="button" title={`Remover ${c.name}`} aria-label={`Remover ${c.name}`} onClick={() => remove(c.id)}><Icon name="trash" size={15} /></Button>}</span></div>)}
  </>;
}

function StaffRegistration({ db, eventId, event, sponsor, update, notify }: any) {
  const grid = credentialGridFor(db, eventId, sponsor.tier, sponsor.id);
  const staff = staffOf(db, eventId, sponsor.id);
  const open = !!event?.openStaffOpen;
  const options = credGridFor(sponsor.tier).flatMap((row) => row.groups.map((group) => ({ area: row.area, group, left: staffLeft(grid, staff, row.area, group) }))).filter((o) => o.left > 0);
  const [form, setForm] = useState({ name: "", document: "", option: "" });
  const option = form.option || (options[0] ? qKey(options[0].area, options[0].group) : "");
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim().slice(0, 120); const document = form.document.trim().slice(0, 40);
    const chosen = options.find((o) => qKey(o.area, o.group) === option);
    if (!open) return notify("O cadastro do Open Staff está fechado.");
    if (!name || !document) return notify("Informe nome e documento.");
    if (!chosen) return notify("Não há vagas disponíveis nesta área.");
    if (staff.some((c) => c.document.replace(/\D/g, "") && c.document.replace(/\D/g, "") === document.replace(/\D/g, ""))) return notify("Este documento já está cadastrado.");
    update((current: Database) => ({ ...current, credentials: [...(current.credentials ?? []), { id: uid(), eventId, sponsorId: sponsor.id, name, document, area: chosen.area, group: chosen.group, status: "Pendente", createdAt: new Date().toISOString() }] }));
    setForm({ name: "", document: "", option: "" });
    notify(`${name} cadastrado no Open Staff`);
  };
  const remove = (id: string) => { if (!window.confirm("Remover esta pessoa do cadastro?")) return; update((current: Database) => ({ ...current, credentials: current.credentials.filter((c) => c.id !== id) })); notify("Pessoa removida do cadastro"); };
  return <section className="table staff-table">
    <div className="table-title"><div><h2>Pessoas cadastradas</h2><span>{staff.length} de {credGridTotal(grid)} credenciais usadas</span></div></div>
    {open && <form className="staff-form" onSubmit={add}>
      <label><span>Nome completo</span><input required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
      <label><span>CPF ou documento</span><input required maxLength={40} value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} /></label>
      <label><span>Área e público</span><select value={option} onChange={(e) => setForm({ ...form, option: e.target.value })} disabled={!options.length}>{options.map((o) => <option key={qKey(o.area, o.group)} value={qKey(o.area, o.group)}>{o.area} · {o.group} ({o.left} {o.left === 1 ? "vaga" : "vagas"})</option>)}{!options.length && <option value="">Sem vagas disponíveis</option>}</select></label>
      <Button variant="portal" size="portal" className="primary" type="submit" disabled={!options.length}>Cadastrar pessoa</Button>
    </form>}
    {staff.length ? <StaffList staff={staff} canRemove={open} remove={remove} /> : <Empty text={open ? "Nenhuma pessoa cadastrada ainda." : "O cadastro da equipe será aberto pela RBS."} />}
  </section>;
}

const credGridTotal = (grid: Record<string, any>) => CRED_GRID.reduce((sum, row) => sum + row.groups.reduce((acc, group) => acc + (Number(grid[qKey(row.area, group)]) || 0), 0), 0);

function CredentialGrid({ tier, values, draft, setDraft }: { tier: string; values: Record<string, any>; draft?: Record<string, any>; setDraft?: (next: Record<string, any>) => void }) {
  const source = draft ?? values;
  const grid = credGridFor(tier);
  const groups = CRED_GROUPS.filter((group) => grid.some((row) => row.groups.includes(group)));
  const cols = { gridTemplateColumns: `1.2fr repeat(${groups.length}, 1fr) .8fr` };
  return <>
    <div className="table-head cred-grid-cols" style={cols}><span>ÁREA</span>{groups.map((group) => <span key={group}>{group.toUpperCase()}</span>)}<span>TOTAL</span></div>
    {grid.map((row) => <div className="table-row cred-grid-cols" style={cols} key={row.area}><strong>{row.area}</strong>{groups.map((group) => {
      const key = qKey(row.area, group);
      if (!row.groups.includes(group)) return <span key={key} className="quota none" aria-label={`${row.area}: não se aplica a ${group}`}>—</span>;
      return draft && setDraft ? <input key={key} type="number" min="0" aria-label={`${row.area} ${group}`} value={draft[key] ?? 0} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} /> : <span key={key} className={Number(values[key]) ? "quota" : "quota none"}><b>{Number(values[key]) || 0}</b></span>;
    })}<span className="quota total"><b>{row.groups.reduce((sum, group) => sum + (Number(source[qKey(row.area, group)]) || 0), 0)}</b></span></div>)}
    <div className="table-row cred-grid-cols total-row" style={cols}><strong>Total</strong>{groups.map((group) => <strong key={group}>{grid.reduce((sum, row) => sum + (row.groups.includes(group) ? Number(source[qKey(row.area, group)]) || 0 : 0), 0)}</strong>)}<strong>{credGridTotal(source)}</strong></div>
  </>;
}

function TierCredentials({ db, eventId, event, user, update, notify }: any) {
  const [target, setTarget] = useState(`tier:${TIERS[0]}`);
  const sponsorId = target.startsWith("sponsor:") ? target.slice(8) : "";
  const selectedSponsor: Sponsor | undefined = db.sponsors.find((item: Sponsor) => item.eventId === eventId && item.id === sponsorId);
  const tier = selectedSponsor?.tier ?? target.slice(5);
  const isExclusive = !!sponsorId && Object.prototype.hasOwnProperty.call(event?.credentialGridBySponsor ?? {}, sponsorId);
  const [draft, setDraft] = useState<Record<string, string | number>>(() => credentialGridFor(db, eventId, TIERS[0]));
  useEffect(() => { setTarget(`tier:${TIERS[0]}`); }, [eventId]);
  useEffect(() => { setDraft(credentialGridFor(db, eventId, tier, sponsorId || undefined)); }, [target, eventId]);
  const tierSponsors: Sponsor[] = db.sponsors.filter((item: Sponsor) => item.eventId === eventId && item.tier === tier);
  const save = () => {
    const clean: Record<string, number> = {};
    for (const row of credGridFor(tier)) for (const group of row.groups) {
      const value = Math.max(0, Math.floor(Number(draft[qKey(row.area, group)]) || 0));
      const scoped = sponsorId ? tierSponsors.filter((item) => item.id === sponsorId) : tierSponsors.filter((item) => !Object.prototype.hasOwnProperty.call(event?.credentialGridBySponsor ?? {}, item.id));
      const over = scoped.find((item) => staffOf(db, eventId, item.id).filter((credential) => credential.area === row.area && credential.group === group).length > value);
      if (over) return notify(`${row.area} · ${group}: ${over.name} já cadastrou mais pessoas que essa quantidade.`);
      if (value) clean[qKey(row.area, group)] = value;
    }
    update((current: Database) => ({ ...current, events: current.events.map((item) => item.id === eventId ? sponsorId ? { ...item, credentialGridBySponsor: { ...(item.credentialGridBySponsor ?? {}), [sponsorId]: clean } } : { ...item, credentialGridByTier: { ...(item.credentialGridByTier ?? {}), [tier]: clean } } : item) }));
    setDraft(clean);
    notify(sponsorId ? `Credenciais exclusivas de ${selectedSponsor?.name} atualizadas` : `Credenciais da cota ${tier} atualizadas para ${tierSponsors.length} ${tierSponsors.length === 1 ? "marca" : "marcas"}`);
  };
  const useTierDefault = () => {
    update((current: Database) => ({ ...current, events: current.events.map((item) => {
      if (item.id !== eventId) return item;
      const next = { ...(item.credentialGridBySponsor ?? {}) };
      delete next[sponsorId];
      return { ...item, credentialGridBySponsor: next };
    }) }));
    setDraft(credentialGridFor({ ...db, events: db.events.map((item) => item.id === eventId ? { ...item, credentialGridBySponsor: Object.fromEntries(Object.entries(item.credentialGridBySponsor ?? {}).filter(([id]) => id !== sponsorId)) } : item) }, eventId, tier));
    notify(`${selectedSponsor?.name} voltou a usar as credenciais da cota ${tier}`);
  };
  return <>
    <Heading title="Credenciamento" text="Defina credenciais por área e público para toda uma cota ou exclusivamente para uma marca. Cada marca cadastra as próprias pessoas quando o Open Staff for aberto." />
    <OpenStaffCard eventId={eventId} event={event} isRbs update={update} notify={notify} />
    <div className="stats">{TIERS.map((t) => <Stat key={t} label={`Cota ${t}`} value={String(credGridTotal(credentialGridFor(db, eventId, t)))} icon="clipboard" />)}</div>
    <section className="table courtesy-table cred-grid-table">
      <div className="table-title"><div><h2>{sponsorId ? `Credenciais exclusivas · ${selectedSponsor?.name}` : `Quantidades da cota ${tier}`}</h2><span>{sponsorId ? isExclusive ? "Configuração exclusiva ativa para esta marca." : `Ao salvar, esta marca deixará de usar as credenciais da cota ${tier}.` : `${tierSponsors.length} ${tierSponsors.length === 1 ? "marca" : "marcas"} recebem esta configuração.`}</span></div><div className="heading-actions"><select aria-label="Aplicar credenciais para" value={target} onChange={(e) => setTarget(e.target.value)}><optgroup label="Por cota">{TIERS.map((item) => <option key={item} value={`tier:${item}`}>Cota {item}</option>)}</optgroup><optgroup label="Marca específica">{db.sponsors.filter((item: Sponsor) => item.eventId === eventId).map((item: Sponsor) => <option key={item.id} value={`sponsor:${item.id}`}>{item.name} ({item.tier})</option>)}</optgroup></select>{isExclusive && <Button variant="portal" size="portal" className="outline" type="button" onClick={useTierDefault}>Usar padrão da cota</Button>}<Button variant="portal" size="portal" className="primary" type="button" onClick={save}>Salvar quantidades</Button></div></div>
      <CredentialGrid tier={tier} values={draft} draft={draft} setDraft={setDraft} />
    </section>
    <OpenStaffCheckPanel db={db} eventId={eventId} event={event} currentId={null} user={user} update={update} notify={notify} />
  </>;
}

function CredentialsTab({ db, eventId, event, sponsor, update, notify }: any) {
  const grid = credentialGridFor(db, eventId, sponsor.tier, sponsor.id);
  const exclusive = Object.prototype.hasOwnProperty.call(event?.credentialGridBySponsor ?? {}, sponsor.id);
  const total = credGridTotal(grid);
  const areas = CRED_GRID.filter((row) => row.groups.some((group) => grid[qKey(row.area, group)])).length;
  return <>
    <Heading title="Credenciamento" text={exclusive ? "A RBS definiu quantidades exclusivas de credenciais para a sua marca. Quando o Open Staff for aberto, cadastre aqui as pessoas da sua equipe." : `Em dezembro, a RBS define as credenciais da cota ${sponsor.tier} por área e público. Quando o Open Staff for aberto, cadastre aqui as pessoas da sua equipe.`} />
    <OpenStaffCard eventId={eventId} event={event} isRbs={false} update={update} notify={notify} />
    <div className="stats compact"><Stat label="Credenciais liberadas" value={String(total)} icon="clipboard" /><Stat label="Áreas" value={String(areas)} icon="users" /><Stat label="Pessoas cadastradas" value={String(staffOf(db, eventId, sponsor.id).length)} icon="calendar" /></div>
    <section className="table courtesy-table cred-grid-table">
      <div className="table-title"><div><h2>Credenciais por área</h2><span>{exclusive ? `Quantidades exclusivas para ${sponsor.name}.` : `Quantidades definidas pela RBS para a cota ${sponsor.tier}.`}</span></div></div>
      {total ? <CredentialGrid tier={sponsor.tier} values={grid} /> : <Empty text="As credenciais serão liberadas pela RBS em dezembro." />}
    </section>
    {total > 0 && <StaffRegistration db={db} eventId={eventId} event={event} sponsor={sponsor} update={update} notify={notify} />}
  </>;
}

const localDateTime = (date = new Date()) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const fmtCheckDate = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const openStaffClassOf = (status: string) => status === "Acima do limite" ? "over" : status === "Completo" ? "done" : status === "Sem conferência" ? "none" : "ok";

function OpenStaffCheckPanel({ db, eventId, event, currentId, user, update, notify }: any) {
  const sponsors: Sponsor[] = db.sponsors.filter((item: Sponsor) => item.eventId === eventId);
  const [editing, setEditing] = useState<string | null>(null);
  const [historyOf, setHistoryOf] = useState<string | null>(null);
  const [form, setForm] = useState({ registered: "", note: "", checkedBy: "", checkedAt: "" });
  const [staffOfId, setStaffOfId] = useState<string | null>(null);
  const start = (item: Sponsor) => { setEditing(item.id); setForm({ registered: String(staffOf(db, eventId, item.id).length), note: "", checkedBy: user?.name ?? "", checkedAt: localDateTime() }); };
  const save = (e: React.FormEvent, item: Sponsor, limit: number) => {
    e.preventDefault();
    const checkedBy = form.checkedBy.trim().slice(0, 80);
    if (!checkedBy) return notify("Informe quem fez a conferência.");
    const when = form.checkedAt ? new Date(form.checkedAt) : new Date();
    if (Number.isNaN(when.getTime()) || when.getTime() > Date.now() + 60000) return notify("Informe uma data de conferência que já aconteceu.");
    const registered = Math.max(0, Math.floor(Number(form.registered) || 0));
    const check: OpenStaffCheck = { registered, checkedAt: when.toISOString(), checkedBy, limit, note: form.note.trim().slice(0, 300) || undefined };
    update((current: Database) => ({ ...current, sponsors: current.sponsors.map((s) => s.id === item.id ? recordOpenStaffCheck(s, check) : s) }));
    setEditing(null);
    setHistoryOf(item.id);
    notify(`Conferência do Open Staff de ${item.name} registrada`);
  };
  const remove = (item: Sponsor, key: string) => {
    if (!window.confirm("Remover esta conferência do histórico?")) return;
    update((current: Database) => ({ ...current, sponsors: current.sponsors.map((s) => s.id === item.id ? removeOpenStaffCheck(s, key) : s) }));
    notify("Conferência removida do histórico");
  };
  return <section className="table openstaff-check">
    <div className="table-title"><div><h2>Conferência do Open Staff por marca</h2><span>Veja quantas pessoas cada marca cadastrou, compare com o limite geral ou exclusivo e registre a conferência no histórico.</span></div></div>
    <div className="table-head openstaff-cols"><span>MARCA</span><span>COTA</span><span>LIBERADAS</span><span>CADASTRADAS</span><span>SITUAÇÃO</span><span>ÚLTIMA CONFERÊNCIA</span><span /></div>
    {sponsors.map((item) => {
      const limit = credentialTotal(credentialsFor(db, eventId, item.tier, item.id));
      const staff = staffOf(db, eventId, item.id);
      const status = openStaffStatus(limit, { registered: staff.length, checkedAt: "" });
      const showStaff = staffOfId === item.id;
      const history = openStaffHistoryOf(item);
      const open = historyOf === item.id;
      const last = item.openStaffCheck;
      return <div className="openstaff-entry" key={item.id}>
        <div className={`table-row openstaff-cols ${item.id === currentId ? "current" : ""}`}><strong>{item.name}</strong><span>{item.tier}</span><span>{limit}</span><span>{staff.length}</span><span className={`openstaff-status ${openStaffClassOf(status)}`}>{status}</span><span>{last ? fmtCheckDate(last.checkedAt) : "—"}{last?.checkedBy && <small>por {last.checkedBy}</small>}</span><div className="row-actions"><Button variant="portal" size="portal" className={`outline ${showStaff ? "active" : ""}`} type="button" aria-expanded={showStaff} disabled={!staff.length} onClick={() => setStaffOfId(showStaff ? null : item.id)}>Pessoas</Button><Button variant="portal" size="portal" className={`outline ${open ? "active" : ""}`} type="button" aria-expanded={open} disabled={!history.length} title={history.length ? `Histórico de ${item.name}` : "Sem conferências"} onClick={() => setHistoryOf(open ? null : item.id)}>Histórico{history.length ? ` (${history.length})` : ""}</Button></div></div>
        {editing === item.id && <form className="openstaff-form-panel" onSubmit={(e) => save(e, item, limit)}>
          <strong>Nova conferência · {item.name}</strong>
          <label><span>Cadastradas no Open Staff</span><input type="number" min="0" autoFocus required value={form.registered} onChange={(e) => setForm({ ...form, registered: e.target.value })} /></label>
          <label><span>Responsável</span><input required maxLength={80} value={form.checkedBy} onChange={(e) => setForm({ ...form, checkedBy: e.target.value })} /></label>
          <label><span>Data da conferência</span><input type="datetime-local" required max={localDateTime()} value={form.checkedAt} onChange={(e) => setForm({ ...form, checkedAt: e.target.value })} /></label>
          <label className="wide"><span>Observação</span><input maxLength={300} placeholder="Opcional" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
          <div className="row-actions"><Button variant="portal" size="portal" className="outline" type="button" onClick={() => setEditing(null)}>Cancelar</Button><Button variant="portal" size="portal" className="primary" type="submit">Salvar conferência</Button></div>
        </form>}
        {showStaff && <div className="staff-table nested"><StaffList staff={staff} setStatus={(id, st) => update((current: Database) => ({ ...current, credentials: current.credentials.map((c) => c.id === id ? { ...c, status: st } : c) }))} /></div>}
        {open && history.length > 0 && <OpenStaffHistory item={item} history={history} limit={limit} remove={(key: string) => remove(item, key)} />}
      </div>;
    })}
    {!sponsors.length && <Empty text="Nenhuma marca cadastrada neste evento." />}
  </section>;
}

function OpenStaffHistory({ item, history, limit, remove }: { item: Sponsor; history: OpenStaffCheck[]; limit: number; remove: (key: string) => void }) {
  const first = history[0];
  const last = history[history.length - 1];
  const change = last.registered - first.registered;
  const data = history.map((check) => ({ label: new Date(check.checkedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), cadastradas: check.registered, limite: check.limit ?? limit }));
  const tip = { contentStyle: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 4, color: "var(--text)" } };
  const signed = (n: number) => n > 0 ? `+${n}` : String(n);
  return <div className="openstaff-history" aria-label={`Histórico de conferências de ${item.name}`}>
    <div className="openstaff-history-summary">
      <div><small>Conferências</small><strong>{history.length}</strong></div>
      <div><small>Primeira</small><strong>{first.registered}</strong><span>{fmtCheckDate(first.checkedAt)}</span></div>
      <div><small>Última</small><strong>{last.registered}</strong><span>{fmtCheckDate(last.checkedAt)}</span></div>
      <div><small>Variação no período</small><strong className={change > 0 ? "up" : change < 0 ? "down" : ""}>{history.length > 1 ? signed(change) : "—"}</strong><span>{limit > 0 ? `${Math.round(last.registered / limit * 100)}% do limite atual` : "Sem limite definido"}</span></div>
    </div>
    {history.length > 1 && <div className="chart-box"><strong>Cadastradas x limite da marca</strong><ResponsiveContainer width="100%" height={200}><LineChart data={data}><CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" stroke={C.muted} fontSize={11} /><YAxis allowDecimals={false} stroke={C.muted} fontSize={11} /><Tooltip {...tip} /><Legend /><Line dataKey="cadastradas" name="Cadastradas" stroke={C.orange} strokeWidth={2} /><Line dataKey="limite" name="Limite" stroke={C.muted} strokeDasharray="5 4" dot={false} type="stepAfter" /></LineChart></ResponsiveContainer></div>}
    <div className="table-head openstaff-history-cols"><span>DATA</span><span>CADASTRADAS</span><span>VARIAÇÃO</span><span>SITUAÇÃO</span><span>RESPONSÁVEL</span><span>OBSERVAÇÃO</span><span /></div>
    {[...history].reverse().map((check, index, list) => {
      const previous = list[index + 1];
      const status = openStaffStatus(check.limit ?? limit, check);
      const diff = previous ? check.registered - previous.registered : null;
      const key = check.id ?? check.checkedAt;
      return <div className="table-row openstaff-history-cols" key={key}><span>{fmtCheckDate(check.checkedAt)}</span><strong>{check.registered}<small>de {check.limit ?? limit}</small></strong><span className={diff ? diff > 0 ? "up" : "down" : ""}>{diff === null ? "Primeira" : signed(diff)}</span><span className={`openstaff-status ${openStaffClassOf(status)}`}>{status}</span><span>{check.checkedBy || "—"}</span><span>{check.note || "—"}</span><Button variant="portal" size="portal" className="icon-button danger" type="button" title="Remover conferência" aria-label={`Remover conferência de ${fmtCheckDate(check.checkedAt)}`} onClick={() => remove(key)}><Icon name="trash" size={15} /></Button></div>;
    })}
  </div>;
}

function SurveyTab({ db, eventId, sponsor, role, canEdit, update, notify }: any) {
  const isRbs = role === "rbs";
  const answers = useSurveyAnswers().filter((answer) => answer.eventId === eventId && answer.sponsorId === sponsor.id);
  const [questions, setQuestions] = useState<string[]>(() => [0, 1, 2].map((i) => sponsor.surveyQuestions?.[i] ?? ""));
  useEffect(() => setQuestions([0, 1, 2].map((i) => sponsor.surveyQuestions?.[i] ?? "")), [sponsor.id]);
  const saved: EventResult | undefined = (db.results ?? []).find((item: EventResult) => item.eventId === eventId && item.sponsorId === sponsor.id);
  const [summary, setSummary] = useState({ surveyResponses: saved?.surveyResponses ?? 0, satisfaction: saved?.satisfaction ?? 0, surveyHighlights: saved?.surveyHighlights ?? "" });
  useEffect(() => setSummary({ surveyResponses: saved?.surveyResponses ?? 0, satisfaction: saved?.satisfaction ?? 0, surveyHighlights: saved?.surveyHighlights ?? "" }), [sponsor.id, saved?.id]);
  const upload = makeUploader({ eventId, sponsorId: sponsor.id, role, update, notify });
  const labels = surveyLabels(sponsor);
  const surveyUrl = `${window.location.origin}/pesquisa?e=${encodeURIComponent(eventId)}&m=${encodeURIComponent(sponsor.id)}`;
  const average = (key: string) => { const values = answers.filter((a) => a.scores).map((a) => a.scores[key]); return values.length ? Math.round(values.reduce((x, y) => x + y, 0) / values.length * 10) / 10 : null; };
  const saveQuestions = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = questions.map((q) => q.trim().slice(0, 160));
    if (clean.some((q) => !q)) return notify("Preencha as 3 perguntas.");
    update((current: Database) => ({ ...current, sponsors: current.sponsors.map((item) => item.id === sponsor.id ? { ...item, surveyQuestions: clean, surveyQuestionsAt: new Date().toISOString() } : item) }));
    notify("Perguntas incluídas na pesquisa oficial");
  };
  const saveSummary = (e: React.FormEvent) => {
    e.preventDefault();
    update((current: Database) => {
      const list = current.results ?? [];
      const base = list.find((item) => item.eventId === eventId && item.sponsorId === sponsor.id) ?? { id: uid(), eventId, sponsorId: sponsor.id, newFollowers: 0, posts: 0, likes: 0, shares: 0, comments: 0, reach: 0, surveyResponses: 0, satisfaction: 0, surveyHighlights: "", notes: "" };
      const item = { ...base, surveyResponses: Math.max(0, Math.floor(Number(summary.surveyResponses) || 0)), satisfaction: Math.min(10, Math.max(0, Number(summary.satisfaction) || 0)), surveyHighlights: summary.surveyHighlights.trim().slice(0, 1500) };
      return { ...current, results: list.some((x) => x.id === item.id) ? list.map((x) => x.id === item.id ? item : x) : [...list, item] };
    });
    notify("Resumo oficial salvo");
  };
  return <>
    <Heading title="Pesquisa da ativação" text="Inclua as 3 perguntas personalizadas a que a marca tem direito na pesquisa oficial. Os resultados entram automaticamente no relatório final." />
    <div className="client-grid two">
      <section className="panel">
        <div className="panel-title"><div><h2>Suas 3 perguntas</h2><span>{sponsor.surveyQuestionsAt ? `Incluídas em ${shortDate(sponsor.surveyQuestionsAt)}` : "Ainda não enviadas · a pesquisa usa as perguntas padrão"}</span></div></div>
        <form className="panel-form" onSubmit={saveQuestions}>{questions.map((question, index) => <Field key={index} label={`Pergunta ${index + 1}`}><input value={question} maxLength={160} disabled={!canEdit} placeholder={SURVEY_QUESTIONS[index].label} onChange={(e) => { const next = [...questions]; next[index] = e.target.value; setQuestions(next); }} /></Field>)}<p className="form-hint">O público responde cada pergunta com uma nota de 0 a 10.</p>{canEdit && <div className="panel-form-actions"><Button variant="portal" size="portal" className="primary" type="submit">Salvar perguntas</Button></div>}</form>
      </section>
      <section className="panel">
        <div className="panel-title"><div><h2>Coleta no espaço da marca</h2><span>{answers.length} {answers.length === 1 ? "resposta" : "respostas"} pelo QR code</span></div></div>
        <div className="qr-block"><QRCodeSVG value={surveyUrl} size={132} bgColor="#ffffff" fgColor="#0b1220" includeMargin /><div><p>Imprima o QR code e coloque no espaço da marca. As respostas entram no relatório automaticamente.</p><a href={surveyUrl} target="_blank" rel="noreferrer">Abrir formulário</a>{isRbs && <div className="qr-actions"><Button variant="portal" size="portal" className="outline" type="button" onClick={() => { simulateSurvey(eventId, sponsor.id, 60); notify("60 respostas de teste adicionadas"); }}>Gerar respostas de teste</Button>{answers.length > 0 && <Button variant="portal" size="portal" className="outline" type="button" onClick={() => { clearSurvey(eventId, sponsor.id); notify("Respostas apagadas"); }}>Apagar respostas</Button>}</div>}</div></div>
        {answers.length > 0 && <div className="survey-bars qr-bars">{SURVEY_QUESTIONS.map((question, index) => { const value = average(question.key); return <div key={question.key}><span title={labels[index]}>{shortLabel(labels[index])}</span><div className="survey-bar"><i style={{ width: `${(value ?? 0) * 10}%` }} /></div><b>{value === null ? "—" : value.toLocaleString("pt-BR")}</b></div>; })}</div>}
      </section>
    </div>
    <h3 className="client-section">Resultados da empresa de pesquisa</h3>
    <div className="client-grid">
      <section className="panel"><div className="panel-title"><div><h2>Resumo oficial</h2><span>Entra no relatório final</span></div></div>{isRbs ? <form className="panel-form" onSubmit={saveSummary}><div className="fields"><Field label="Respostas"><input type="number" min="0" value={summary.surveyResponses} onChange={(e) => setSummary({ ...summary, surveyResponses: e.target.value })} /></Field><Field label="Satisfação média (0 a 10)"><input type="number" min="0" max="10" step="0.1" value={summary.satisfaction} onChange={(e) => setSummary({ ...summary, satisfaction: e.target.value })} /></Field></div><Field label="Destaques"><textarea rows={3} maxLength={1500} value={summary.surveyHighlights} onChange={(e) => setSummary({ ...summary, surveyHighlights: e.target.value })} /></Field><div className="panel-form-actions"><Button variant="portal" size="portal" className="primary" type="submit">Salvar resumo</Button></div></form> : saved && (saved.surveyResponses || saved.satisfaction) ? <dl className="info-list"><div><dt>Respostas</dt><dd>{fmtNum(saved.surveyResponses)}</dd></div><div><dt>Satisfação média</dt><dd>{Number(saved.satisfaction).toLocaleString("pt-BR")} / 10</dd></div>{saved.surveyHighlights && <div><dt>Destaques</dt><dd>{saved.surveyHighlights}</dd></div>}</dl> : <p className="slot-empty">O resumo será publicado após o evento.</p>}</section>
    </div>
  </>;
}

function ContractTab({ db, eventId, sponsor, update, notify }: any) {
  return <>
    <Heading title="Contrato" text={`Contrato gerado a partir do modelo da cota ${sponsor.tier}, com os dados da sua marca.`} />
    <ContractGenerator db={db} eventId={eventId} sponsor={sponsor} notify={notify} />
    <FileSlot title="Enviar contrato assinado" text="A marca pode anexar o contrato em PDF. O documento ficará disponível para consulta e download." files={slotFiles(db, eventId, sponsor.id, "contract")} canUpload canRemove accept=".pdf,application/pdf" uploadLabel="Enviar contrato PDF" onUpload={async (file) => {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) { notify("Selecione um arquivo PDF."); return; }
      const prepared = await prepareUpload(file);
      if (typeof prepared === "string") { notify(prepared); return; }
      const item: StoredFile = { id: uid(), eventId, sponsorId: sponsor.id, slot: "contract", name: prepared.name, category: SLOT_LABELS.contract, size: formatBytes(prepared.bytes), data: prepared.data, createdAt: new Date().toISOString(), uploadedBy: "sponsor" };
      update((current: Database) => ({ ...current, files: [...current.files.filter((f) => !(f.eventId === eventId && f.sponsorId === sponsor.id && f.slot === "contract")), item] }));
      notify("Contrato enviado com sucesso");
    }} onRemove={(id) => { removeFileFrom(update, id); notify("Contrato removido"); }} />
  </>;
}
const BLANK_TERMS: ContractTierTerms = { value: "", payment: "", benefits: "" };
function contractTermsFor(event: EventEdition | undefined, tier: string): ContractTierTerms { return { ...BLANK_TERMS, ...(event?.contractByTier?.[tier] ?? {}) }; }
/** One contract model per tier: tier model, else the older event-wide model, else the built-in default. */
export function contractTemplateFor(event: EventEdition | undefined, tier: string): string { return event?.contractTemplateByTier?.[tier] || event?.contractTemplate || DEFAULT_CONTRACT_TEMPLATE; }
/** Values that depend only on event + tier (shared by every brand of the tier). */
export function tierContractValues(db: Database, eventId: string, tier: string, now = new Date()): Record<string, string> {
  const event = db.events.find((item) => item.id === eventId);
  const terms = contractTermsFor(event, tier);
  const list = (grid: Record<string, number>) => Object.entries(grid).filter(([, qty]) => qty > 0).map(([key, qty]) => `- ${key.split("|").join(" · ")}: ${qty}`).join("\n");
  return {
    evento: event?.name ?? "", datas_evento: event?.dates ?? "", cota: tier,
    valor_investimento: terms.value, forma_pagamento: terms.payment, contrapartidas: terms.benefits,
    cortesias: list(courtesyFor(db, eventId, tier)), credenciais: list(credentialGridFor(db, eventId, tier)),
    beneficios_exclusivos: hasFullBenefits(tier)
      ? `A cota ${tier} inclui a Pesquisa da ativação, com 3 perguntas personalizadas na pesquisa oficial, e os Insights do Instagram da marca no relatório final.`
      : `A cota ${tier} recebe o relatório final do evento. Pesquisa da ativação e Insights do Instagram são exclusivos da cota Master.`,
    data_geracao: now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
  };
}
/** Values for every {{campo}}: tier values plus the brand and its signer. */
export function contractValues(db: Database, eventId: string, sponsor: Sponsor, now = new Date()): Record<string, string> {
  const signer = sponsor.signer;
  return {
    ...tierContractValues(db, eventId, sponsor.tier, now), marca: sponsor.name,
    razao_social: signer?.company ?? "", cnpj: signer?.cnpj ?? "", signatario_nome: signer?.name ?? "", signatario_cpf: signer?.cpf ?? "",
    signatario_cargo: signer?.role ?? "", signatario_email: signer?.email ?? "", signatario_telefone: signer?.phone ?? "",
  };
}
function contractHtml(title: string, text: string) {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${title.replace(/</g, "")}</title><style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 24px;color:#111;line-height:1.6;font-size:12pt}pre{white-space:pre-wrap;font-family:inherit;margin:0}</style></head><body><pre>${esc}</pre></body></html>`;
}
function ContractPaper({ text }: { text: string }) {
  return <article className="contract-paper" aria-label="Prévia do contrato">{text.split("\n").map((line, i) => {
    const parts = line.split(/(_{6,})/).map((part, k) => /^_{6,}$/.test(part) ? <span key={k} className="contract-blank" title="Preenchido com os dados de cada marca">{"\u00a0".repeat(14)}</span> : part);
    if (i === 0) return <h2 key={i} className="contract-title">{line}</h2>;
    if (/^CLÁUSULA/i.test(line)) return <h3 key={i} className="contract-clause">{line}</h3>;
    if (!line.trim()) return <div key={i} className="contract-gap" />;
    if (/^_{25,}$/.test(line.trim())) return <div key={i} className="contract-sign-line" />;
    if (line.startsWith("- ")) return <p key={i} className="contract-item">{parts}</p>;
    return <p key={i}>{parts}</p>;
  })}</article>;
}
function exportContract(fileName: string, text: string, mode: "download" | "print", notify: (m: string) => void) {
  if (mode === "download") {
    const blob = new Blob([contractHtml(fileName, text)], { type: "application/msword" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${fileName}.doc`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    return notify("Contrato gerado e baixado");
  }
  const win = window.open("", "_blank");
  if (!win) return notify("O navegador bloqueou a janela. Use Baixar contrato.");
  win.document.write(contractHtml(fileName, text)); win.document.close(); win.focus(); setTimeout(() => win.print(), 300);
}
const safeName = (name: string) => name.replace(/[\\/:*?"<>|]/g, "");
/** Brand view: the tier's model filled with the brand's data. */
function ContractGenerator({ db, eventId, sponsor, notify }: { db: Database; eventId: string; sponsor: Sponsor; notify: (m: string) => void }) {
  const event = db.events.find((item) => item.id === eventId);
  const template = contractTemplateFor(event, sponsor.tier);
  const values = contractValues(db, eventId, sponsor);
  const missing = missingContractFields(template, values);
  const labelOf = (key: string) => CONTRACT_FIELDS.find((field) => field.key === key)?.label ?? key;
  const text = fillContract(template, values);
  const [preview, setPreview] = useState(true);
  const fileName = safeName(`Contrato ${sponsor.name} - ${event?.name ?? "evento"}`);
  return <section className="panel contract-generator">
    <div className="panel-title"><div><h2>Seu contrato</h2><span>Modelo da cota {sponsor.tier} · {event?.name}</span></div></div>
    {missing.length > 0 ? <p className="contract-missing"><strong>Campos ainda sem preenchimento:</strong> {missing.map(labelOf).join(", ")}. Eles saem em branco no contrato.</p> : <p className="contract-ready">Todos os campos do modelo estão preenchidos.</p>}
    <div className="contract-actions">
      <Button variant="portal" size="portal" className="primary" type="button" onClick={() => exportContract(fileName, text, "download", notify)}><Icon name="download" size={15} /> Baixar contrato</Button>
      <Button variant="portal" size="portal" className="outline" type="button" onClick={() => exportContract(fileName, text, "print", notify)}>Imprimir / PDF</Button>
      <Button variant="portal" size="portal" className="outline" type="button" aria-expanded={preview} onClick={() => setPreview(!preview)}>{preview ? "Ocultar prévia" : "Ver prévia"}</Button>
    </div>
    {preview && <ContractPaper text={text} />}
  </section>;
}
/** RBS view: one contract model and one set of terms per tier, applied to every brand of the tier. */
function TierContract({ db, eventId, update, notify }: { db: Database; eventId: string; update: (fn: (db: Database) => Database) => void; notify: (m: string) => void }) {
  const event = db.events.find((item) => item.id === eventId);
  const [tier, setTier] = useState<string>(TIERS[0] as string);
  const template = contractTemplateFor(event, tier);
  const [draft, setDraft] = useState(template);
  const [terms, setTerms] = useState<ContractTierTerms>(contractTermsFor(event, tier));
  useEffect(() => { setDraft(contractTemplateFor(event, tier)); setTerms(contractTermsFor(event, tier)); }, [eventId, tier]);
  const tierSponsors = db.sponsors.filter((item) => item.eventId === eventId && item.tier === tier);
  const values = { ...tierContractValues(db, eventId, tier), ...termsAsValues(terms) };
  const text = fillContract(draft, values);
  const insert = (key: string) => {
    const area = document.getElementById("contract-template") as HTMLTextAreaElement | null;
    const token = `{{${key}}}`;
    if (!area) return setDraft(draft + token);
    const start = area.selectionStart ?? draft.length, end = area.selectionEnd ?? draft.length;
    setDraft(draft.slice(0, start) + token + draft.slice(end));
    requestAnimationFrame(() => { area.focus(); area.selectionStart = area.selectionEnd = start + token.length; });
  };
  const save = () => {
    if (!draft.trim()) return notify("O modelo não pode ficar vazio.");
    const clean = { value: terms.value.trim().slice(0, 120), payment: terms.payment.trim().slice(0, 500), benefits: terms.benefits.trim().slice(0, 4000) };
    update((current) => ({ ...current, events: current.events.map((item) => item.id === eventId ? { ...item, contractTemplateByTier: { ...(item.contractTemplateByTier ?? {}), [tier]: draft.slice(0, 30000) }, contractByTier: { ...(item.contractByTier ?? {}), [tier]: clean } } : item) }));
    notify(`Contrato da cota ${tier} salvo para ${tierSponsors.length} ${tierSponsors.length === 1 ? "marca" : "marcas"}`);
  };
  const fileName = safeName(`Modelo de contrato ${tier} - ${event?.name ?? "evento"}`);
  return <>
    <Heading title="Contrato" text="Defina um contrato para cada cota. Ele vale para todas as marcas da cota neste evento; cada marca recebe o contrato já preenchido com os próprios dados." />
    <section className="brand-workspace by-tier tier-only" aria-label="Cotas"><nav aria-label="Escolher cota">{TIERS.map((item) => { const n = db.sponsors.filter((s) => s.eventId === eventId && s.tier === item).length; return <Button variant="portal" size="portal" key={item} type="button" className={tier === item ? "active" : ""} aria-pressed={tier === item} onClick={() => setTier(item)}><span>{item}</span><small>{n} {n === 1 ? "marca" : "marcas"}{event?.contractTemplateByTier?.[item] ? " · modelo próprio" : ""}</small></Button>; })}</nav></section>
    <div className="contract-editor">
      <section className="panel"><div className="panel-title"><div><h2>Modelo da cota {tier}</h2><span>Clique em um campo para inseri-lo no texto.</span></div></div>
        <div className="panel-form">
          <div className="contract-field-groups" aria-label="Campos automáticos">{(["evento", "marca", "cota", "signatário", "sistema"] as const).map((source) => <div className="contract-field-group" key={source}><small>{{ evento: "Evento", marca: "Marca", cota: "Cota", "signatário": "Quem assina", sistema: "Sistema" }[source]}</small><div className="contract-chips">{CONTRACT_FIELDS.filter((field) => field.source === source).map((field) => <Button variant="portal" size="portal" type="button" key={field.key} className="contract-chip" title={`Inserir {{${field.key}}}`} onClick={() => insert(field.key)}>+ {field.label}</Button>)}</div></div>)}</div>
          <Field label="Texto do modelo"><textarea id="contract-template" rows={24} value={draft} onChange={(e) => setDraft(e.target.value)} /></Field>
          <div className="panel-form-actions contract-editor-actions"><small>{draft.length.toLocaleString("pt-BR")} caracteres</small><Button variant="portal" size="portal" className="outline" type="button" onClick={() => setDraft(DEFAULT_CONTRACT_TEMPLATE)}>Restaurar modelo padrão</Button></div>
        </div>
      </section>
      <section className="panel"><div className="panel-title"><div><h2>Dados da cota {tier}</h2><span>Cortesias e credenciais entram automaticamente, conforme as quantidades da cota.</span></div></div>
        <div className="panel-form">
          <Field label="Valor do investimento"><input maxLength={120} placeholder="Ex.: R$ 500.000,00" value={terms.value} onChange={(e) => setTerms({ ...terms, value: e.target.value })} /></Field>
          <Field label="Forma de pagamento"><input maxLength={500} placeholder="Ex.: 3 parcelas mensais a partir da assinatura" value={terms.payment} onChange={(e) => setTerms({ ...terms, payment: e.target.value })} /></Field>
          <Field label="Contrapartidas da cota"><textarea rows={10} maxLength={4000} placeholder="Uma contrapartida por linha" value={terms.benefits} onChange={(e) => setTerms({ ...terms, benefits: e.target.value })} /></Field>
          <div className="panel-form-actions"><Button variant="portal" size="portal" className="primary" type="button" onClick={save}>Salvar contrato da cota</Button></div>
        </div>
      </section>
    </div>
    <section className="panel contract-generator">
      <div className="panel-title"><div><h2>Prévia da cota {tier}</h2><span>Os campos destacados são preenchidos com os dados de cada marca.</span></div></div>
      <div className="contract-actions"><Button variant="portal" size="portal" className="outline" type="button" onClick={() => exportContract(fileName, text, "download", notify)}><Icon name="download" size={15} /> Baixar modelo</Button><Button variant="portal" size="portal" className="outline" type="button" onClick={() => exportContract(fileName, text, "print", notify)}>Imprimir / PDF</Button></div>
      <ContractPaper text={text} />
    </section>
  </>;
}
function termsAsValues(terms: ContractTierTerms): Record<string, string> { return { valor_investimento: terms.value, forma_pagamento: terms.payment, contrapartidas: terms.benefits }; }
const AUDIT_PAGE_SIZE = 100;
/** Histórico de tudo o que foi feito no evento: quem, quando, o quê e em qual marca. Exclusivo da RBS. */
function HistoryPage({ db, eventId, event }: { db: Database; eventId: string; event?: EventEdition }) {
  const [filters, setFilters] = useState({ sponsor: "", person: "", action: "", area: "", from: "", to: "", q: "" });
  const [limit, setLimit] = useState(AUDIT_PAGE_SIZE);
  const set = (key: keyof typeof filters, value: string) => { setFilters({ ...filters, [key]: value }); setLimit(AUDIT_PAGE_SIZE); };
  const eventSponsors = db.sponsors.filter((item) => item.eventId === eventId);
  const inEvent = (db.audit ?? []).filter((entry) => entry.eventId === eventId || (!entry.eventId && (!entry.sponsorId || eventSponsors.some((s) => s.id === entry.sponsorId))));
  const people = [...new Map(inEvent.map((entry) => [entry.actorId, entry])).values()];
  const areas = [...new Set(inEvent.map((entry) => entry.area))].sort();
  const q = filters.q.trim().toLowerCase();
  const rows = inEvent.filter((entry) => (!filters.sponsor || (filters.sponsor === "__none" ? !entry.sponsorId : entry.sponsorId === filters.sponsor))
    && (!filters.person || entry.actorId === filters.person)
    && (!filters.action || entry.action === filters.action)
    && (!filters.area || entry.area === filters.area)
    && (!filters.from || entry.at.slice(0, 10) >= filters.from)
    && (!filters.to || entry.at.slice(0, 10) <= filters.to)
    && (!q || [entry.actorName, entry.actorEmail, entry.target, entry.area, entry.message, entry.detail, entry.sponsorName].some((v) => v?.toLowerCase().includes(q))));
  const today = new Date().toISOString().slice(0, 10);
  const exportCsv = () => {
    const blob = new Blob(["\ufeff" + auditCsv(rows)], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `historico-${(event?.name ?? "evento").toLowerCase().replace(/\s+/g, "-")}-${today}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const fmt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return <>
    <Heading title="Histórico" text={`Tudo o que foi criado, enviado, modificado ou excluído em ${event?.name ?? "este evento"}, com a pessoa responsável e o horário. Visível apenas para a equipe RBS.`} />
    <div className="stats"><Stat label="Registros no evento" value={String(inEvent.length)} icon="clock" /><Stat label="Hoje" value={String(inEvent.filter((e) => e.at.slice(0, 10) === today).length)} icon="calendar" /><Stat label="Pessoas" value={String(people.length)} icon="users" /><Stat label="Exclusões" value={String(inEvent.filter((e) => e.action === "delete").length)} icon="trash" /></div>
    <section className="table history-table">
      <div className="table-title"><div><h2>Atividades</h2><span>{rows.length} {rows.length === 1 ? "registro" : "registros"}{rows.length !== inEvent.length ? ` de ${inEvent.length}` : ""}</span></div><div className="heading-actions"><Button variant="portal" size="portal" className="outline" type="button" disabled={!rows.length} onClick={exportCsv}><Icon name="download" size={15} /> Exportar planilha</Button></div></div>
      <div className="history-filters">
        <label><span>Buscar</span><input type="search" placeholder="Pessoa, item, descrição…" value={filters.q} onChange={(e) => set("q", e.target.value)} /></label>
        <label><span>Marca</span><select value={filters.sponsor} onChange={(e) => set("sponsor", e.target.value)}><option value="">Todas</option>{eventSponsors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}<option value="__none">Evento (sem marca)</option></select></label>
        <label><span>Pessoa</span><select value={filters.person} onChange={(e) => set("person", e.target.value)}><option value="">Todas</option>{people.map((p) => <option key={p.actorId} value={p.actorId}>{p.actorName}</option>)}</select></label>
        <label><span>Ação</span><select value={filters.action} onChange={(e) => set("action", e.target.value)}><option value="">Todas</option>{(Object.keys(ACTION_LABELS) as AuditAction[]).map((a) => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}</select></label>
        <label><span>Área</span><select value={filters.area} onChange={(e) => set("area", e.target.value)}><option value="">Todas</option>{areas.map((a) => <option key={a}>{a}</option>)}</select></label>
        <label><span>De</span><input type="date" value={filters.from} onChange={(e) => set("from", e.target.value)} /></label>
        <label><span>Até</span><input type="date" value={filters.to} onChange={(e) => set("to", e.target.value)} /></label>
      </div>
      <div className="table-head history-cols"><span>DATA E HORA</span><span>PESSOA</span><span>AÇÃO</span><span>ÁREA · ITEM</span><span>MARCA</span><span>DESCRIÇÃO</span></div>
      {rows.slice(0, limit).map((entry) => <div className="table-row history-cols" key={entry.id}>
        <span className="history-when">{fmt(entry.at)}</span>
        <span className="history-who" title={`ID: ${entry.actorId}`}><strong>{entry.actorName}</strong><small>{entry.actorEmail} · {entry.actorRole === "rbs" ? "Equipe RBS" : "Marca"}</small></span>
        <span><span className={`history-action act-${entry.action}`}>{ACTION_LABELS[entry.action]}</span></span>
        <span className="history-what"><small>{entry.area}</small><strong>{entry.target}</strong></span>
        <span>{entry.sponsorName ?? "—"}</span>
        <span className="history-desc">{entry.message && <strong>{entry.message}</strong>}{entry.detail && <small>{entry.detail}</small>}{!entry.message && !entry.detail && "—"}</span>
      </div>)}
      {!rows.length && <Empty text={inEvent.length ? "Nenhum registro com esses filtros." : "Ainda não há atividades registradas neste evento. Tudo o que for feito a partir de agora aparece aqui."} />}
      {rows.length > limit && <div className="history-more"><Button variant="portal" size="portal" className="outline" type="button" onClick={() => setLimit(limit + AUDIT_PAGE_SIZE)}>Mostrar mais ({rows.length - limit} restantes)</Button></div>}
    </section>
  </>;
}

/** Resposta com parágrafos; linhas que começam com "- " viram itens de lista. */
function FaqAnswer({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) { const items = list; blocks.push(<ul key={`l${blocks.length}`}>{items.map((line, i) => <li key={i}>{line}</li>)}</ul>); list = []; } };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (line.startsWith("- ")) list.push(line.slice(2));
    else { flush(); blocks.push(<p key={`p${blocks.length}`}>{line}</p>); }
  }
  flush();
  return <div className="faq-answer">{blocks}</div>;
}

function FaqPage({ db, role, tier, user, update, notify, go }: { db: Database; role: Role; tier?: string; user: User; update: (fn: (db: Database) => Database) => void; notify: (m: string) => void; go: (page: Page) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [editing, setEditing] = useState<FaqItem | "new" | null>(null);
  const all = db.faq ?? [];
  const visible = role === "rbs" ? (tierFilter ? faqForTier(all, tierFilter) : all) : faqForTier(all, tier);
  const matches = searchFaq(visible, query);
  const categories = faqCategories(visible);
  const rows = category ? matches.filter((item) => item.category === category) : matches;
  const groups = categories.map((name) => ({ name, items: rows.filter((item) => item.category === name) })).filter((group) => group.items.length);
  const searching = !!query.trim();
  const remove = (item: FaqItem) => {
    if (!confirm(`Excluir a pergunta "${item.question}"?`)) return;
    update((current) => ({ ...current, faq: (current.faq ?? []).filter((entry) => entry.id !== item.id) }));
    notify("Pergunta excluída");
  };
  return <>
    <Heading title="Dúvidas frequentes" text={role === "rbs" ? "Respostas do Manual de Operações e dos planos comerciais, mais as perguntas cadastradas pela equipe RBS. Cada marca vê só o que vale para a cota dela." : `Respostas sobre o evento${tier ? `, a cota ${tier}` : ""} e o uso do portal, com base no Manual de Operações do Planeta Atlântida.`} action={<div className="heading-actions"><Button variant="portal" size="portal" className="outline" asChild><a href={manualAsset.url} target="_blank" rel="noreferrer"><Icon name="download" size={15} /> Manual de Operações</a></Button>{role === "rbs" && <Button variant="portal" size="portal" className="primary" type="button" onClick={() => setEditing("new")}><Icon name="plus" size={15} /> Nova pergunta</Button>}</div>} />
    <section className="faq-toolbar">
      <label className="faq-search"><Icon name="search" size={17} /><input type="search" aria-label="Buscar nas dúvidas frequentes" placeholder="Busque por credencial, gerador, brinde, prazo…" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      {role === "rbs" && <label className="faq-tier-filter"><span>Ver como</span><select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}><option value="">Todas as cotas</option>{TIERS.map((item) => <option key={item} value={item}>Cota {item}</option>)}</select></label>}
    </section>
    <nav className="faq-cats" aria-label="Categorias">
      <Button variant="portal" size="portal" type="button" className={!category ? "active" : ""} onClick={() => setCategory("")}>Todas <small>{matches.length}</small></Button>
      {categories.map((name) => { const n = matches.filter((item) => item.category === name).length; return <Button variant="portal" size="portal" type="button" key={name} className={category === name ? "active" : ""} disabled={!n} onClick={() => setCategory(name)}>{name} <small>{n}</small></Button>; })}
    </nav>
    {groups.map((group) => <section className="faq-group" key={group.name}>
      <h2>{group.name}</h2>
      {group.items.map((item) => <details className="faq-item" key={`${item.id}-${searching && rows.length <= 3 ? "open" : "closed"}`} open={searching && rows.length <= 3}>
        <summary><span>{item.question}</span><i aria-hidden="true"><Icon name="plus" size={16} /></i></summary>
        <FaqAnswer text={item.answer} />
        <footer>
          {item.source && <small className="faq-source"><Icon name="file" size={13} /> {item.source}</small>}
          {item.tiers?.length ? <small className="faq-chip">{item.tiers.length === 1 ? `Cota ${item.tiers[0]}` : `Cotas ${item.tiers.join(" e ")}`}</small> : role === "rbs" ? <small className="faq-chip muted">Todas as cotas</small> : null}
          {!item.builtIn && <small className="faq-chip custom">Cadastrada pela RBS{item.createdBy ? ` · ${item.createdBy}` : ""}</small>}
          {role === "rbs" && <span className="faq-actions"><Button variant="portal" size="portal" className="outline" type="button" onClick={() => setEditing(item)}><Icon name="edit" size={14} /> Editar</Button><Button variant="portal" size="portal" className="outline" type="button" onClick={() => remove(item)}><Icon name="trash" size={14} /> Excluir</Button></span>}
        </footer>
      </details>)}
    </section>)}
    {!rows.length && <Empty text={searching ? `Nenhuma resposta encontrada para “${query.trim()}”.` : "Nenhuma pergunta cadastrada ainda."} />}
    {role !== "rbs" && <section className="faq-help"><div><strong>Não encontrou o que procurava?</strong><span>Envie sua dúvida para a equipe RBS. As respostas mais pedidas entram nesta página.</span></div><Button variant="portal" size="portal" className="primary" type="button" onClick={() => go("contact")}><Icon name="message" size={15} /> Falar com a RBS</Button></section>}
    {editing && <FaqForm item={editing === "new" ? undefined : editing} categories={faqCategories(all)} user={user} close={() => setEditing(null)} update={update} notify={notify} />}
  </>;
}

const NEW_CATEGORY = "__new";
function FaqForm({ item, categories, user, close, update, notify }: { item?: FaqItem; categories: string[]; user: User; close: () => void; update: (fn: (db: Database) => Database) => void; notify: (m: string) => void }) {
  const options = [...new Set([...FAQ_CATEGORIES, ...categories])];
  const [form, setForm] = useState({ question: item?.question ?? "", answer: item?.answer ?? "", category: item?.category ?? options[0]!, newCategory: "", tiers: item?.tiers ?? [], source: item?.source ?? "" });
  const toggleTier = (tier: string) => setForm({ ...form, tiers: form.tiers.includes(tier) ? form.tiers.filter((t) => t !== tier) : [...form.tiers, tier] });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const category = form.category === NEW_CATEGORY ? form.newCategory.trim() : form.category;
    if (!category || !form.question.trim() || !form.answer.trim()) return;
    const now = new Date().toISOString();
    const data = { question: form.question.trim(), answer: form.answer.trim(), category, tiers: form.tiers.length ? TIERS.filter((t) => form.tiers.includes(t)) : undefined, source: form.source.trim() || undefined };
    update((current) => ({ ...current, faq: item
      ? (current.faq ?? []).map((entry) => entry.id === item.id ? { ...entry, ...data, updatedAt: now, updatedBy: user.name } : entry)
      : [...(current.faq ?? []), { id: uid(), ...data, createdAt: now, createdBy: user.name }] }));
    close();
    notify(item ? "Pergunta atualizada" : "Pergunta adicionada às dúvidas frequentes");
  };
  return <FormShell title={item ? "Editar pergunta" : "Nova pergunta"} close={close} submit={submit} action={item ? "Salvar" : "Adicionar"}>
    <Field label="Pergunta"><input required autoFocus value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Ex.: Posso levar meu próprio gerador?" /></Field>
    <Field label="Resposta"><textarea required rows={7} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="Escreva a resposta. Comece uma linha com “- ” para criar um item de lista." /></Field>
    <div className="fields">
      <Field label="Categoria"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{options.map((name) => <option key={name} value={name}>{name}</option>)}<option value={NEW_CATEGORY}>＋ Nova categoria…</option></select></Field>
      {form.category === NEW_CATEGORY ? <Field label="Nome da nova categoria"><input required value={form.newCategory} onChange={(e) => setForm({ ...form, newCategory: e.target.value })} /></Field> : <Field label="Fonte (opcional)"><input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Ex.: Manual de Operações · item 6" /></Field>}
    </div>
    {form.category === NEW_CATEGORY && <Field label="Fonte (opcional)"><input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Ex.: Manual de Operações · item 6" /></Field>}
    <fieldset className="faq-tier-checks"><legend>Quem vê esta pergunta</legend>{TIERS.map((tier) => <label key={tier}><input type="checkbox" checked={form.tiers.includes(tier)} onChange={() => toggleTier(tier)} /> Cota {tier}</label>)}<small>{form.tiers.length ? "Só as marcas das cotas marcadas veem a pergunta." : "Nenhuma marcada: todas as marcas veem a pergunta."}</small></fieldset>
  </FormShell>;
}

export { ACCESS_PAGES, CLIENT_TABS, navFor, SECTORS, PASS_TYPES, clientProgress, migrateDatabase };
