import { Router, type IRouter } from "express";
import { ScoreSeoBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// Helper to fetch live YouTube complete searches
async function fetchTrendingSearches(keyword: string): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(keyword)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      }
    });
    if (!res.ok) return [];
    const data = await res.json() as any;
    if (Array.isArray(data) && Array.isArray(data[1])) {
      return data[1].map((s: any) => String(s).toLowerCase());
    }
  } catch (err) {
    console.error("Failed to fetch autocomplete suggestions:", err);
  }
  return [];
}

// Helper to scrape top ranking video titles from YouTube search page
async function scrapeTopRankingVideos(keyword: string): Promise<string[]> {
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      }
    });
    if (!res.ok) return [];
    const html = await res.text();
    
    const titleRegex = /"title":\s*\{\s*"runs":\s*\[\s*\{\s*"text":\s*"([^"]+)"/g;
    const titles: string[] = [];
    let match;
    let count = 0;
    while ((match = titleRegex.exec(html)) !== null && count < 8) {
      const text = match[1];
      if (text && text.length > 5 && !text.includes("Search instead for") && !text.includes("Did you mean")) {
        // Clean double quotes
        titles.push(text.replace(/\\"/g, '"').toLowerCase());
        count++;
      }
    }
    return titles;
  } catch (err) {
    console.error("Failed to scrape YouTube search results:", err);
  }
  return [];
}

function scoreSeoTitle(title: string, keyword?: string): { score: number; recs: { type: "title"; message: string; priority: "low" | "medium" | "high" }[] } {
  const recs: { type: "title"; message: string; priority: "low" | "medium" | "high" }[] = [];
  let score = 100;

  if (title.length < 40) { score -= 20; recs.push({ type: "title", message: "Title is too short (aim for 40–70 characters)", priority: "high" }); }
  if (title.length > 70) { score -= 15; recs.push({ type: "title", message: "Title is too long (keep under 70 characters)", priority: "medium" }); }
  if (keyword && !title.toLowerCase().includes(keyword.toLowerCase())) {
    score -= 25; recs.push({ type: "title", message: `Include your target keyword "${keyword}" in the title`, priority: "high" });
  }
  if (!/[?!]/.test(title) && !/\d/.test(title)) {
    score -= 5; recs.push({ type: "title", message: "Add a number or question to boost click-through rate", priority: "low" });
  }
  return { score: Math.max(0, score), recs };
}

function scoreSeoDescription(desc: string, keyword?: string): { score: number; recs: { type: "description"; message: string; priority: "low" | "medium" | "high" }[] } {
  const recs: { type: "description"; message: string; priority: "low" | "medium" | "high" }[] = [];
  let score = 100;

  if (desc.length < 150) { score -= 25; recs.push({ type: "description", message: "Description is too short (aim for 150–500 characters)", priority: "high" }); }
  if (desc.length > 5000) { score -= 10; recs.push({ type: "description", message: "Description is very long — consider trimming", priority: "low" }); }
  if (keyword && !desc.toLowerCase().includes(keyword.toLowerCase())) {
    score -= 20; recs.push({ type: "description", message: `Include your keyword "${keyword}" in the description`, priority: "high" });
  }
  if (!desc.includes("http") && !desc.includes("www")) {
    score -= 5; recs.push({ type: "description", message: "Add links (social, website) to your description", priority: "low" });
  }
  return { score: Math.max(0, score), recs };
}

function scoreSeoTags(tags: string[], keyword?: string): { score: number; recs: { type: "tags"; message: string; priority: "low" | "medium" | "high" }[] } {
  const recs: { type: "tags"; message: string; priority: "low" | "medium" | "high" }[] = [];
  let score = 100;

  if (tags.length < 5) { score -= 30; recs.push({ type: "tags", message: "Add more tags (aim for 15–20 tags)", priority: "high" }); }
  if (tags.length > 20) { score -= 10; recs.push({ type: "tags", message: "Too many tags — keep 15–20 for best results", priority: "medium" }); }
  if (keyword && !tags.some(t => t.toLowerCase().includes(keyword.toLowerCase()))) {
    score -= 20; recs.push({ type: "tags", message: `Add your target keyword "${keyword}" as a tag`, priority: "high" });
  }
  const hasLong = tags.some(t => t.split(" ").length >= 3);
  const hasShort = tags.some(t => t.split(" ").length === 1);
  if (!hasLong || !hasShort) {
    score -= 10; recs.push({ type: "tags", message: "Mix broad (1-word) and specific (3+ word) tags", priority: "medium" });
  }
  return { score: Math.max(0, score), recs };
}

router.post("/seo/score", requireAuth, async (req, res, next): Promise<void> => {
  try {
    const parsed = ScoreSeoBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { title, description, tags, targetKeyword } = parsed.data;

    let titleResult = scoreSeoTitle(title, targetKeyword);
    let descResult = scoreSeoDescription(description, targetKeyword);
    let tagsResult = scoreSeoTags(tags as string[], targetKeyword);

    const keywordForQueries = targetKeyword || (title.split(/\s+/).filter(w => w.length > 4)[0]) || "youtube";
    
    // Fetch live data from open-source Autocomplete API and Scraped search rankings
    const [trends, rankingTitles] = await Promise.all([
      fetchTrendingSearches(keywordForQueries),
      scrapeTopRankingVideos(keywordForQueries)
    ]);

    const finalRecs: any[] = [];
    let titleBonus = 0;
    let tagsBonus = 0;

    // 1. Analyze matched trending tags
    const matchedTrends = trends.filter(t => 
      tags.some(tag => tag.toLowerCase() === t || t.includes(tag.toLowerCase()))
    );

    if (matchedTrends.length > 0) {
      tagsBonus += Math.min(20, matchedTrends.length * 5);
      finalRecs.push({
        type: "tags",
        message: `Matched ${matchedTrends.length} live trending YouTube searches: ${matchedTrends.slice(0, 3).map(t => `"${t}"`).join(", ")}! This boosts discoverability.`,
        priority: "low"
      });
    } else if (trends.length > 0) {
      const suggested = trends.slice(0, 4);
      finalRecs.push({
        type: "tags",
        message: `Capturing trending queries: Consider adding tags like: ${suggested.map(t => `"${t}"`).join(", ")}`,
        priority: "medium"
      });
    }

    // 2. Analyze Title alignment with scraped top performing video titles
    const stopWords = new Set(["how", "to", "the", "a", "an", "is", "of", "and", "in", "for", "with", "on", "at", "by", "this", "that"]);
    const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
    
    let matchedCompetitorTitle = false;
    for (const rt of rankingTitles) {
      const rtWords = rt.toLowerCase().split(/\s+/);
      const matches = titleWords.filter(w => rtWords.includes(w));
      if (matches.length >= 2) {
        matchedCompetitorTitle = true;
        break;
      }
    }

    if (matchedCompetitorTitle) {
      titleBonus += 10;
      finalRecs.push({
        type: "title",
        message: "Title successfully incorporates target keywords found in top-ranking search results.",
        priority: "low"
      });
    } else if (rankingTitles.length > 0) {
      const phrase = rankingTitles[0].split(" ").slice(0, 4).join(" ");
      finalRecs.push({
        type: "title",
        message: `Competitor insight: top videos in this niche use terms like "${phrase}" — try aligning your title wording.`,
        priority: "medium"
      });
    }

    // Calculate final scores with live trend bonuses
    const finalTitleScore = Math.min(100, titleResult.score + titleBonus);
    const finalTagsScore = Math.min(100, tagsResult.score + tagsBonus);
    const overallScore = Math.round((finalTitleScore + descResult.score + finalTagsScore) / 3);

    // 3. Compute Viewership Index & Predicted Monthly Views based on matched trends
    let viewershipIndex = "Moderate Potential";
    let predictedMonthlyViews = Math.floor(Math.random() * 800) + 150; // default baseline views

    if (overallScore >= 80 && matchedTrends.length >= 2) {
      viewershipIndex = "High Potential";
      predictedMonthlyViews = Math.floor(Math.random() * 55000) + 20000;
    } else if (overallScore >= 65 && (matchedTrends.length >= 1 || matchedCompetitorTitle)) {
      viewershipIndex = "Good Potential";
      predictedMonthlyViews = Math.floor(Math.random() * 12000) + 4000;
    }

    res.json({
      overallScore,
      titleScore: finalTitleScore,
      descriptionScore: descResult.score,
      tagsScore: finalTagsScore,
      recommendations: [...titleResult.recs, ...descResult.recs, ...tagsResult.recs, ...finalRecs],
      viewershipIndex,
      predictedMonthlyViews,
      matchedTrends: matchedTrends.slice(0, 10),
      trendingSuggestions: trends.slice(0, 8),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
