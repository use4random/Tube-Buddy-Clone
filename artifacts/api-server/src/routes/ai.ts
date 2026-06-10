import { Router, type IRouter } from "express";
import { GenerateTitlesBody, GenerateDescriptionBody, GenerateTagsBody, GenerateVideoIdeasBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// Clean code blocks or markdown wrappers around JSON outputs from LLMs
function cleanJsonString(str: string): string {
  let cleaned = str.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, "");
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

// Helper to invoke Anthropic Claude Messages API
async function callClaude(prompt: string, systemPrompt?: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Anthropic API key not configured");
  }

  const model = process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API call failed: ${errorText}`);
  }

  const data = await response.json() as any;
  const content = data.content?.[0]?.text;
  if (!content) {
    throw new Error("Empty response from Claude API");
  }

  return content;
}

// 1. Title Generation Endpoint
router.post("/ai/titles", requireAuth, async (req, res, next): Promise<void> => {
  try {
    const parsed = GenerateTitlesBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { topic, keyword } = parsed.data;

    // Check if Claude is active
    if (process.env.ANTHROPIC_API_KEY) {
      const systemPrompt = "You are an expert YouTube SEO consultant and CTR optimization AI. You only output valid JSON arrays of title suggestion objects, with no explanation or extra text.";
      const prompt = `Generate 10 highly engaging, SEO-optimized YouTube video titles for the topic: "${topic}" and target keyword: "${keyword}". Optimize them for high click-through rate (CTR) based on the latest 2026 YouTube search trends and algorithm changes.
      
      Return ONLY a JSON array of objects in this format (do not wrap in markdown unless it's a json codeblock):
      [
        {
          "title": "Engaging Video Title Here",
          "seoScore": 92,
          "predictedCtr": 7.4
        }
      ]
      
      seoScore must be an integer between 50 and 100. predictedCtr must be a float between 1.0 and 15.0. Make the titles varied (e.g., listicles, questions, click-worthy revelations).`;

      const claudeOutput = await callClaude(prompt, systemPrompt);
      const cleanJson = cleanJsonString(claudeOutput);
      const data = JSON.parse(cleanJson);
      res.json({ titles: data });
      return;
    }

    // Dynamic Mock Fallback (Sandbox Mode)
    const baseKeyword = keyword || topic || "YouTube growth";
    const templates = [
      `How to master ${baseKeyword} in 2026 — Complete Guide for Beginners`,
      `I Tried ${baseKeyword} for 30 Days (2026 Trends Revealed)`,
      `The TRUTH About ${baseKeyword} (Why 99% of Creators Fail)`,
      `The Ultimate ${baseKeyword} Strategy to Rank #1 in 2026`,
      `5 Simple Hacks to Optimize Your ${baseKeyword} Instantly`,
      `Stop Making These ${baseKeyword} Mistakes on YouTube!`,
      `How the New YouTube Algorithm Changed ${baseKeyword}`,
      `Is ${baseKeyword} Still Worth It? (My Honest 2026 Review)`,
      `This ${baseKeyword} Trick Got Me 100k Views in 1 Week`,
      `The Ultimate Step-by-Step ${baseKeyword} Tutorial`,
    ];

    const titles = templates.map((t) => ({
      title: t,
      seoScore: Math.floor(Math.random() * 25) + 75, // 75-99
      predictedCtr: parseFloat((Math.random() * 8 + 4).toFixed(1)), // 4.0-12.0
    })).sort((a, b) => b.seoScore - a.seoScore);

    res.json({ titles });
  } catch (err: any) {
    next(err);
  }
});

// 2. Description Generation Endpoint
router.post("/ai/description", requireAuth, async (req, res, next): Promise<void> => {
  try {
    const parsed = GenerateDescriptionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { title, keyPoints } = parsed.data;

    if (process.env.ANTHROPIC_API_KEY) {
      const prompt = `Write a high-converting, professional YouTube video description for a video titled "${title}". 
      Include the following key points in the description body: ${keyPoints ? (keyPoints as string[]).join(", ") : "general content description"}.
      Structure the description to include:
      - A hook introduction paragraph incorporating keywords.
      - A bulleted list detailing "What you'll learn in this video".
      - Placeholder links for resources and channels.
      - Dynamic, realistic chapters/timestamps (e.g. 0:00 Intro, 1:45 Key Concepts...).
      - Relevant trending YouTube hashtags.
      Return ONLY the plain description text.`;

      const description = await callClaude(prompt);
      res.json({ description: description.trim() });
      return;
    }

    // Dynamic Mock Fallback (Sandbox Mode)
    const pointsList = (keyPoints as string[] || []).map((p, i) => `• ${p}`).join("\n");
    const safeTitle = title || "our latest video";
    const cleanTag = (title || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15);

    const description = `In this video, we dive deep into everything you need to know about "${safeTitle}" based on the latest 2026 trends!
    
${pointsList.length > 0 ? `Key topics covered in this guide:\n${pointsList}\n\n` : ""}We break down each concept step-by-step and provide actionable tips you can implement right away to grow your CTR and view counts.

🔔 Subscribe for weekly YouTube strategies & SEO guides!
👍 Like this video if you found it helpful.
💬 Let us know your thoughts or questions in the comments!

📌 Timestamps:
0:00 — Introduction
2:15 — The 2026 Trend Analysis
6:40 — Step-by-Step Optimization
12:10 — Common Creator Mistakes to Avoid
16:45 — Summary & Next Steps

🔗 Resources Mentioned:
• TubePulse Optimizer: https://tubepulse.app
• Creator Mastermind: https://discord.gg/tubepulse

#YouTubeTips #YouTubeSEO #2026Trends #${cleanTag || "creator"}`;

    res.json({ description: description.trim() });
  } catch (err: any) {
    next(err);
  }
});

// 3. Tag Generation Endpoint
router.post("/ai/tags", requireAuth, async (req, res, next): Promise<void> => {
  try {
    const parsed = GenerateTagsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { title, description } = parsed.data;

    if (process.env.ANTHROPIC_API_KEY) {
      const systemPrompt = "You are a YouTube SEO bot. You only output valid JSON arrays of strings containing video tags.";
      const prompt = `Suggest 20 highly relevant, trending video tags for a YouTube video with the title: "${title}" and description: "${description}". The tags should include high-volume trending search terms for 2026.
      
      Return ONLY a JSON array of strings:
      ["tag1", "tag2", "tag3"]`;

      const claudeOutput = await callClaude(prompt, systemPrompt);
      const cleanJson = cleanJsonString(claudeOutput);
      const tags = JSON.parse(cleanJson);
      res.json({ tags });
      return;
    }

    // Dynamic Mock Fallback (Sandbox Mode)
    // Extract long unique words from title and description
    const textSample = `${title || ""} ${description || ""}`.toLowerCase();
    const words = textSample.split(/[^a-z0-9]+/i).filter(w => w.length >= 3);
    const uniqueWords = Array.from(new Set(words)).slice(0, 8);

    const baseKeyword = uniqueWords[0] || "youtube";
    const tags = Array.from(new Set([
      ...uniqueWords,
      baseKeyword,
      `${baseKeyword} tutorial`,
      `${baseKeyword} tips`,
      `latest ${baseKeyword} trends`,
      `${baseKeyword} 2026`,
      `${baseKeyword} guide`,
      `how to ${baseKeyword}`,
      "youtube tips 2026",
      "content creation trends",
      "grow on youtube",
      "youtube algorithm secrets",
      "video optimization guide",
      "seo tags",
    ])).slice(0, 20);

    res.json({ tags });
  } catch (err: any) {
    next(err);
  }
});

// 4. Video Ideas Generation Endpoint
router.post("/ai/ideas", requireAuth, async (req, res, next): Promise<void> => {
  try {
    const parsed = GenerateVideoIdeasBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const count = parsed.data.count ?? 10;

    if (process.env.ANTHROPIC_API_KEY) {
      const systemPrompt = "You are a viral YouTube strategist. You only output valid JSON arrays of video idea objects, with no explanation or extra text.";
      const prompt = `Generate exactly ${count} highly viral, trending video ideas for a YouTube content creator. The ideas should target high-demand keywords and 2026 audience trends.
      
      Return ONLY a JSON array of objects in this format:
      [
        {
          "title": "Viral Video Idea Title",
          "description": "What this video will cover and why it will perform well.",
          "targetKeyword": "grow youtube channel 2026",
          "estimatedDemand": "very_high"
        }
      ]
      
      estimatedDemand must be one of: 'low', 'medium', 'high', 'very_high'. Make the ideas diverse, targeting both searchable tutorial content and high-CTR algorithm hooks.`;

      const claudeOutput = await callClaude(prompt, systemPrompt);
      const cleanJson = cleanJsonString(claudeOutput);
      const ideas = JSON.parse(cleanJson);
      res.json({ ideas: ideas.slice(0, count) });
      return;
    }

    // Dynamic Mock Fallback (Sandbox Mode)
    const mockIdeas = [
      { title: "The 2026 YouTube Algorithm Secret: How to Rank Fast", keyword: "youtube algorithm 2026", demand: "very_high" as const },
      { title: "Stop Batch Filming! Do This Instead in 2026", keyword: "youtube upload schedule", demand: "high" as const },
      { title: "How to Grow a Small YouTube Channel (2026 Edition)", keyword: "grow youtube channel", demand: "very_high" as const },
      { title: "AI Tools I Use to Edit Videos 10x Faster", keyword: "ai video editor", demand: "high" as const },
      { title: "The Thumbnail Trick That Doubled My CTR", keyword: "youtube thumbnail tutorial", demand: "very_high" as const },
      { title: "Is YouTube Shorts Still Worth It in 2026?", keyword: "youtube shorts strategy", demand: "high" as const },
      { title: "How to Monetize Your Channel Without AdSense", keyword: "youtube monetization 2026", demand: "medium" as const },
      { title: "I Analyzed My 10 Worst Performing Videos (So You Don't Have To)", keyword: "youtube growth tips", demand: "medium" as const },
      { title: "The Ultimate Gear Guide for Creators under $100", keyword: "youtube setup starter kit", demand: "medium" as const },
      { title: "How to Write Video Scripts in 10 Minutes (Template)", keyword: "youtube scriptwriting guide", demand: "medium" as const },
    ];

    const ideas = mockIdeas.slice(0, count).map(idea => ({
      title: idea.title,
      description: `A highly engaging and optimized video focusing on "${idea.title.toLowerCase()}" to leverage 2026 audience demands.`,
      targetKeyword: idea.keyword,
      estimatedDemand: idea.demand,
    }));

    res.json({ ideas });
  } catch (err: any) {
    next(err);
  }
});

export default router;
