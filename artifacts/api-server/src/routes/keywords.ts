import { Router, type IRouter } from "express";
import { db, keywordsTable, keywordSearchesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SearchKeywordsQueryParams, GetKeywordSuggestionsQueryParams, GetKeywordRankingsQueryParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

const RELATED_MAP: Record<string, string[]> = {
  default: ["tutorial", "how to", "beginner guide", "tips", "review"],
};

function generateTrendData(): number[] {
  return Array.from({ length: 30 }, () => Math.floor(Math.random() * 100));
}

function computeScore(q: string): { searchVolume: "very_low" | "low" | "medium" | "high" | "very_high"; competition: number; overall: number } {
  const len = q.length;
  const volume = len < 5 ? "very_high" : len < 10 ? "high" : len < 15 ? "medium" : len < 20 ? "low" : "very_low";
  const competition = Math.min(95, Math.max(5, Math.floor(len * 4 + Math.random() * 20)));
  const volTier = { very_low: 1, low: 2, medium: 3, high: 4, very_high: 5 }[volume];
  const overall = Math.round((volTier / 5) * 40 + ((100 - competition) / 100) * 40 + Math.random() * 20);
  return { searchVolume: volume, competition, overall };
}

router.get("/keywords/search", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = SearchKeywordsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { q, channelId } = params.data;

  await db.insert(keywordSearchesTable).values({ userId: req.userId!, channelId: channelId ?? null, query: q }).catch(() => {});

  const [existing] = await db.select().from(keywordsTable).where(eq(keywordsTable.query, q));
  let primary = existing;
  if (!primary) {
    const s = computeScore(q);
    const related = RELATED_MAP.default.map(r => `${q} ${r}`).slice(0, 5);
    const [inserted] = await db.insert(keywordsTable).values({
      query: q,
      searchVolumeTier: s.searchVolume,
      competitionScore: s.competition,
      overallScore: s.overall,
      relatedKeywords: related,
      trendData: generateTrendData(),
    }).returning();
    primary = inserted;
  }

  const relatedKeywords = await Promise.all(
    (primary.relatedKeywords as string[]).slice(0, 4).map(async (rq) => {
      const [r] = await db.select().from(keywordsTable).where(eq(keywordsTable.query, rq));
      if (r) return r;
      const s2 = computeScore(rq);
      try {
        const [inserted2] = await db.insert(keywordsTable).values({
          query: rq, searchVolumeTier: s2.searchVolume, competitionScore: s2.competition,
          overallScore: s2.overall, relatedKeywords: [], trendData: generateTrendData(),
        }).returning();
        return inserted2;
      } catch {
        return null;
      }
    })
  );

  const keywords = [primary, ...relatedKeywords.filter(Boolean)].map(k => ({
    query: k!.query,
    searchVolume: k!.searchVolumeTier,
    competitionScore: k!.competitionScore,
    overallScore: k!.overallScore,
    relatedKeywords: k!.relatedKeywords as string[],
    trendData: k!.trendData as number[],
  }));

  res.json({ query: q, keywords });
});

router.get("/keywords/suggestions", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetKeywordSuggestionsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { videoId } = params.data;
  const baseTerms = ["tutorial", "how to", "review", "guide", "tips", "best", "top", "2024", "beginner", "advanced"];
  const suggestions = baseTerms.map(t => {
    const tag = `${videoId.slice(0, 4)} ${t}`.trim();
    const s = computeScore(tag);
    return { tag, score: s.overall, searchVolume: s.searchVolume };
  });
  res.json(suggestions);
});

router.get("/keywords/rankings", requireAuth, async (_req, res): Promise<void> => {
  const params = GetKeywordRankingsQueryParams.safeParse(_req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rankings = ["tutorial", "how to guide", "beginner tips"].map((tag, i) => ({
    tag,
    rank: Math.floor(Math.random() * 20) + 1 + i * 5,
    date: new Date().toISOString().split("T")[0],
  }));
  res.json(rankings);
});

export default router;
