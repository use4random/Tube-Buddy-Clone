import { Router, type IRouter } from "express";
import { ScoreSeoBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

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

router.post("/seo/score", requireAuth, async (req, res): Promise<void> => {
  const parsed = ScoreSeoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { title, description, tags, targetKeyword } = parsed.data;

  const titleResult = scoreSeoTitle(title, targetKeyword);
  const descResult = scoreSeoDescription(description, targetKeyword);
  const tagsResult = scoreSeoTags(tags as string[], targetKeyword);

  const overallScore = Math.round((titleResult.score + descResult.score + tagsResult.score) / 3);

  res.json({
    overallScore,
    titleScore: titleResult.score,
    descriptionScore: descResult.score,
    tagsScore: tagsResult.score,
    recommendations: [...titleResult.recs, ...descResult.recs, ...tagsResult.recs],
  });
});

export default router;
