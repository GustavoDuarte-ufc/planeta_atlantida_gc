export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");
const TOKEN_KEY = "planeta-portal-api-token";
export type BackendIdentity = {
  token: string | null;
  nome: string;
  email: string;
  role: "ADMIN_RBS" | "ADMIN_PATROCINADOR";
  patrocinadorId: number | null;
  frontendSponsorId: string | null;
};

export function getApiToken() { return localStorage.getItem(TOKEN_KEY); }
export function setApiToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}, token = getApiToken()): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try { response = await fetch(`${API_URL}${path}`, { ...init, headers }); }
  catch (error) {
    console.error("Erro ao conectar com a API:", { url: `${API_URL}${path}`, erro: error });
    throw new Error(`Falha de comunicação com a API em ${API_URL}. Consulte o console do navegador.`);
  }
  if (!response.ok) {
    let message = `Erro ${response.status} ao acessar o backend.`;
    try { const body = await response.json(); message = body.detail || body.message || body.mensagem || body.error || message; } catch { /* resposta sem JSON */ }
    if (response.status === 401) setApiToken(null);
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  const type = response.headers.get("content-type") || "";
  return (type.includes("application/json") ? response.json() : response.text()) as Promise<T>;
}

export const backend = {
  login: (email: string, senha: string) => request<BackendIdentity>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, senha }) }, null),
  me: () => request<BackendIdentity>("/api/auth/me"),
  getPortalState: () => request<Record<string, any>>("/api/portal-state"),
  savePortalState: (state: Record<string, any>) => request<{ salvo: boolean; atualizadoEm: string }>("/api/portal-state", { method: "PUT", body: JSON.stringify(state) }),
  publicSurveyConfig: (eventId: string, sponsorId: string) => request<{ brand: string; event: string; questions: string[] }>(`/api/public/pesquisa?e=${encodeURIComponent(eventId)}&m=${encodeURIComponent(sponsorId)}`, {}, null),
  submitPublicSurvey: (payload: { eventId: string; sponsorId: string; scores: Record<string, number>; comment: string }) => request<{ registrada: boolean }>("/api/public/pesquisa", { method: "POST", body: JSON.stringify(payload) }, null),
  clearSurvey: (eventId: string, sponsorId: string) => request<{ salvo: boolean }>(`/api/portal-state/survey?eventId=${encodeURIComponent(eventId)}&sponsorId=${encodeURIComponent(sponsorId)}`, { method: "DELETE" }),
  saveBrandUser: (payload: {frontendSponsorId: string; sponsorName: string; tier: string; nome: string; email: string; senha: string; previousEmail?: string}) => request<{salvo: boolean}>("/api/portal-access/usuarios", {method: "POST", body: JSON.stringify(payload)}),
  logout: () => setApiToken(null),
};

export function toFrontendRole(role: BackendIdentity["role"]): "rbs" | "sponsor" {
  return role === "ADMIN_RBS" ? "rbs" : "sponsor";
}

export function sanitizePortalState<T extends Record<string, any>>(state: T): T {
  return {
    ...state,
    users: (state.users || []).map((user: any) => ({ ...user, password: typeof user.password === "string" ? user.password : "" })),
  };
}
