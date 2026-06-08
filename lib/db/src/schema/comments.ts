import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const commentsTable = pgTable("comments", {
  id: text("id").primaryKey(),
  channelId: integer("channel_id").notNull(),
  videoId: text("video_id").notNull(),
  videoTitle: text("video_title"),
  authorName: text("author_name").notNull(),
  authorAvatarUrl: text("author_avatar_url"),
  text: text("text").notNull(),
  likeCount: integer("like_count").notNull().default(0),
  isReplied: boolean("is_replied").notNull().default(false),
  isFlagged: boolean("is_flagged").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const commentFiltersTable = pgTable("comment_filters", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull(),
  keyword: text("keyword").notNull(),
  action: text("action", { enum: ["hide", "report", "delete"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCommentSchema = createInsertSchema(commentsTable).omit({ createdAt: true });
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof commentsTable.$inferSelect;

export const insertCommentFilterSchema = createInsertSchema(commentFiltersTable).omit({ id: true, createdAt: true });
export type InsertCommentFilter = z.infer<typeof insertCommentFilterSchema>;
export type CommentFilter = typeof commentFiltersTable.$inferSelect;
