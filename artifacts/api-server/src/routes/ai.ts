import { Router, type IRouter } from "express";
import { GenerateTitlesBody, GenerateDescriptionBody, GenerateTagsBody, GenerateVideoIdeasBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const titleTemplates = [
  "How to {keyword} — Complete Guide for Beginners",
  "I Tried {keyword} for 30 Days — Here's What Happened",
  "The TRUTH About {keyword} (Nobody Tells You This)",
  "{keyword}: 10 Things You Need to Know in 2024",
  "Why {keyword} is Changing Everything",
  "Stop Making These {keyword} Mistakes",
  "The Ultimate {keyword} Tutorial (Step by Step)",
  "{keyword} vs Everything Else — Which is Best?",
  "I Mastered {keyword} in 7 Days — You Can Too",
  "The {keyword} Strategy That Got Me 1M Views",
];

router.post("/ai/titles", requireAuth, async (req, res): Promise<void> => {
  const parsed = GenerateTitlesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { topic, keyword } = parsed.data;
  const titles = titleTemplates.map((t, i) => ({
    title: t.replace("{keyword}", keyword || topic),
    seoScore: Math.floor(Math.random() * 30) + 65,
    predictedCtr: parseFloat((Math.random() * 8 + 2).toFixed(1)),
  })).sort((a, b) => b.seoScore - a.seoScore);
  res.json({ titles });
});

router.post("/ai/description", requireAuth, async (req, res): Promise<void> => {
  const parsed = GenerateDescriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { title, keyPoints } = parsed.data;
  const points = (keyPoints as string[]).map((p, i) => `${i + 1}. ${p}`).join("\n");
  const description = `In this video, we cover everything you need to know about ${title}.

${points.length > 0 ? `What you'll learn:\n${points}\n\n` : ""}Whether you're a beginner or looking to level up, this video has you covered. We break down each concept clearly and provide actionable steps you can implement today.

🔔 Subscribe for weekly creator tips and strategies!
👍 Like if this helped you!
💬 Drop your questions in the comments below

📌 Chapters:
0:00 — Introduction
2:30 — Key Concepts
8:00 — Step-by-Step Walkthrough
15:00 — Common Mistakes to Avoid
20:00 — Final Thoughts

🔗 Resources mentioned:
• TubePulse Dashboard: https://tubepulse.app
• Creator Community: https://discord.gg/tubepulse

#YouTubeTips #ContentCreator #${(title || "").replace(/\s+/g, "").slice(0, 20)}`;

  res.json({ description });
});

router.post("/ai/tags", requireAuth, async (req, res): Promise<void> => {
  const parsed = GenerateTagsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { title, description } = parsed.data;
  const words = `${title} ${description}`.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const unique = [...new Set(words)].slice(0, 8);
  const tags = [
    ...unique,
    "tutorial", "how to", "tips and tricks", "beginners guide",
    "step by step", "complete guide", "2024", "youtube tips",
    "content creation", "grow on youtube", "youtube strategy",
    "video optimization", "seo tips", "creator tools",
  ].slice(0, 20);
  res.json({ tags });
});

router.post("/ai/ideas", requireAuth, async (req, res): Promise<void> => {
  const parsed = GenerateVideoIdeasBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const count = parsed.data.count ?? 10;
  const ideaTemplates = [
    { title: "10 Things I Wish I Knew Before Starting YouTube", keyword: "youtube mistakes", demand: "very_high" as const },
    { title: "How I Got 10,000 Subscribers in 90 Days", keyword: "grow youtube channel", demand: "high" as const },
    { title: "The YouTube Algorithm Explained in 5 Minutes", keyword: "youtube algorithm", demand: "very_high" as const },
    { title: "Best Free Tools for YouTube Creators in 2024", keyword: "youtube tools", demand: "high" as const },
    { title: "How to Film YouTube Videos with Your Phone", keyword: "phone camera youtube", demand: "medium" as const },
    { title: "Thumbnail Design Secrets from Top Creators", keyword: "youtube thumbnail tips", demand: "high" as const },
    { title: "Why Your Videos Aren't Getting Views (Fix This)", keyword: "youtube views", demand: "very_high" as const },
    { title: "How to Write Titles That Get Clicks", keyword: "youtube titles", demand: "high" as const },
    { title: "Channel Audit: What's Killing Your Growth", keyword: "youtube channel audit", demand: "medium" as const },
    { title: "Batch Filming — Create a Month of Content in a Weekend", keyword: "batch filming youtube", demand: "medium" as const },
  ];
  const ideas = ideaTemplates.slice(0, count).map(idea => ({
    title: idea.title,
    description: `A comprehensive video covering ${idea.title.toLowerCase()} with actionable strategies any creator can implement immediately.`,
    targetKeyword: idea.keyword,
    estimatedDemand: idea.demand,
  }));
  res.json({ ideas });
});

export default router;
