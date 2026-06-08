import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const keywordsTable = pgTable("keywords", {
  id: serial("id").primaryKey(),
  query: text("query").notNull().unique(),
  searchVolumeTier: text("search_volume_tier", { enum: ["very_low", "low", "medium", "high", "very_high"] }).notNull().default("low"),
  competitionScore: integer("competition_score").notNull().default(50),
  overallScore: integer("overall_score").notNull().default(50),
  relatedKeywords: jsonb("related_keywords").$type<string[]>().notNull().default([]),
  trendData: jsonb("trend_data").$type<number[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const keywordSearchesTable = pgTable("keyword_searches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  channelId: integer("channel_id"),
  query: text("query").notNull(),
  searchedAt: timestamp("searched_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertKeywordSchema = createInsertSchema(keywordsTable).omit({ id: true, updatedAt: true });
export type InsertKeyword = z.infer<typeof insertKeywordSchema>;
export type Keyword = typeof keywordsTable.$inferSelect;

export const insertKeywordSearchSchema = createInsertSchema(keywordSearchesTable).omit({ id: true, searchedAt: true });
export type InsertKeywordSearch = z.infer<typeof insertKeywordSearchSchema>;
export type KeywordSearch = typeof keywordSearchesTable.$inferSelect;
