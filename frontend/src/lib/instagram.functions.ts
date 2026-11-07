type Day = {
  date: string;
  newFollowers: number;
  posts: number;
  likes: number;
  shares: number;
  comments: number;
  reach: number;
};

/**
 * A sincronização real continua sendo responsabilidade do servidor, para que
 * o token da Meta nunca chegue ao navegador. A conta "teste" preserva a
 * demonstração completa no frontend independente.
 */
export async function syncInstagramInsights({
  data,
}: {
  data: { igUserId: string; days: number };
}): Promise<{ days: Day[]; error?: string }> {
  if (data.igUserId === "teste") return { days: demoDays(data.days) };
  return {
    days: [],
    error: "A conexão com o Instagram ainda não foi configurada pela RBS.",
  };
}

function demoDays(n: number): Day[] {
  const count = Math.min(30, Math.max(1, Math.floor(n)));
  const rand = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: count }, (_, i) => {
    const date = new Date(today.getTime() - (count - 1 - i) * 86400000);
    const seed = Math.floor(date.getTime() / 86400000);
    const weekend = [0, 5, 6].includes(date.getUTCDay()) ? 1.6 : 1;
    const growth = 1 + i / count;
    const metric = (base: number, key: number) =>
      Math.round(base * weekend * growth * (0.7 + rand(seed * key) * 0.6));
    const posts = rand(seed * 7) > 0.55 ? 1 + Math.round(rand(seed * 11)) : 0;

    return {
      date: date.toISOString().slice(0, 10),
      newFollowers: metric(60, 3),
      posts,
      likes: Math.trunc(metric(1400, 5) * (posts ? 1.5 : 1)),
      shares: metric(90, 13),
      comments: metric(65, 17),
      reach: metric(14000, 19),
    };
  });
}
