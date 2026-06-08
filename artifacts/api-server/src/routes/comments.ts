import { Router, type IRouter } from "express";
import { db, commentsTable, cannedResponsesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  ListCommentsQueryParams,
  ReplyToCommentParams,
  ReplyToCommentBody,
  ListCannedResponsesQueryParams,
  CreateCannedResponseBody,
  DeleteCannedResponseParams,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/comments", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = ListCommentsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { channelId, filter } = params.data;
  let query = db.select().from(commentsTable).where(eq(commentsTable.channelId, channelId));

  const comments = await query;
  const filtered = filter === "unanswered" ? comments.filter(c => !c.isReplied) :
    filter === "flagged" ? comments.filter(c => c.isFlagged) : comments;

  res.json(filtered);
});

router.post("/comments/:commentId/reply", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = ReplyToCommentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = ReplyToCommentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [comment] = await db.update(commentsTable).set({ isReplied: true }).where(eq(commentsTable.id, params.data.commentId)).returning();
  if (!comment) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  if (body.data.channelId) {
    await db.update(cannedResponsesTable).set({ useCount: sql`${cannedResponsesTable.useCount} + 1` }).where(and(
      eq(cannedResponsesTable.channelId, body.data.channelId),
      eq(cannedResponsesTable.body, body.data.text)
    )).catch(() => {});
  }

  res.json(comment);
});

router.get("/canned-responses", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = ListCannedResponsesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const responses = await db.select().from(cannedResponsesTable).where(eq(cannedResponsesTable.channelId, params.data.channelId));
  res.json(responses.map(r => ({ ...r, tags: r.tags as string[] })));
});

router.post("/canned-responses", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateCannedResponseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [response] = await db.insert(cannedResponsesTable).values({
    channelId: parsed.data.channelId,
    label: parsed.data.label,
    body: parsed.data.body,
    tags: parsed.data.tags ?? [],
  }).returning();
  res.status(201).json({ ...response, tags: response.tags as string[] });
});

router.delete("/canned-responses/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = DeleteCannedResponseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(cannedResponsesTable).where(eq(cannedResponsesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
