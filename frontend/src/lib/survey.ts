import { backend } from "@/lib/backend";
// Demonstração: respostas da pesquisa ficam no navegador (mesmo aparelho do portal).
export const SURVEY_QUESTIONS = [
  { key: "atendimento", label: "Como você avalia o atendimento?" },
  { key: "organizacao", label: "Como você avalia a organização?" },
  { key: "espaco", label: "Como você avalia o espaço da marca?" },
] as const;
export type SurveyKey = (typeof SURVEY_QUESTIONS)[number]["key"];
export type SurveyAnswer = { id: string; eventId: string; sponsorId: string; rating: number; scores?: Record<SurveyKey, number>; comment: string; at: string };
export const SURVEY_KEY = "planeta-survey-v1";

export function readSurvey(): SurveyAnswer[] {
  try { return JSON.parse(localStorage.getItem(SURVEY_KEY) || "[]"); } catch { return []; }
}

const avg = (s: Record<SurveyKey, number>) => Math.round((s.atendimento + s.organizacao + s.espaco) / 3 * 10) / 10;

export function replaceSurveyCache(list: SurveyAnswer[]) {
  localStorage.setItem(SURVEY_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("survey-updated"));
}

function save(list: SurveyAnswer[]) {
  localStorage.setItem(SURVEY_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("survey-updated"));
}

export function addSurvey(a: { eventId: string; sponsorId: string; scores: Record<SurveyKey, number>; comment: string }) {
  save([...readSurvey(), { ...a, rating: avg(a.scores), id: Math.random().toString(36).slice(2), at: new Date().toISOString() }]);
}

const COMMENTS = ["Equipe muito simpática!", "Fila rápida e bem organizada.", "Espaço lindo, ótimo para fotos.", "Faltou sombra no espaço.", "Brindes muito legais.", "Poderia ter mais lugares para sentar.", "Atendimento excelente.", "", "", ""];

/** Gera respostas simuladas para teste. */
export function simulateSurvey(eventId: string, sponsorId: string, count = 60) {
  const r = (base: number) => Math.max(0, Math.min(10, Math.round(base + (Math.random() - 0.5) * 5)));
  const extra: SurveyAnswer[] = Array.from({ length: count }, () => {
    const when = new Date(Date.now() - Math.floor(Math.random() * 60) * 86400000 - Math.floor(Math.random() * 36000000));
    const scores = { atendimento: r(8.8), organizacao: r(7.8), espaco: r(8.2) };
    return { id: Math.random().toString(36).slice(2), eventId, sponsorId, scores, rating: avg(scores), comment: COMMENTS[Math.floor(Math.random() * COMMENTS.length)] ?? "", at: when.toISOString() };
  });
  save([...readSurvey(), ...extra]);
  void Promise.all(extra.map((answer) => backend.submitPublicSurvey({
    eventId, sponsorId, scores: answer.scores ?? { atendimento: answer.rating, organizacao: answer.rating, espaco: answer.rating }, comment: answer.comment,
  }))).catch((error) => console.error("Não foi possível persistir as respostas de demonstração", error));
}

export function clearSurvey(eventId: string, sponsorId: string) {
  save(readSurvey().filter((a) => !(a.eventId === eventId && a.sponsorId === sponsorId)));
  void backend.clearSurvey(eventId, sponsorId).catch((error) => console.error("Não foi possível apagar as respostas no servidor", error));
}
