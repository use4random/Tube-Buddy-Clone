import { pgTable, serial, integer, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const competitorsTable = pgTable("competitors", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull(),
  youtubeChannelId: text("youtube_channel_id").notNull(),
  name: text("name").notNull(),
  handle: text("handle"),
  thumbnailUrl: text("thumbnail_url"),
  subscriberCount: integer("subscriber_count"),
  averageViews: integer("average_views"),
  uploadFrequency: real("upload_frequency"),
  lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCompetitorSchema = createInsertSchema(competitorsTable).omit({ id: true, createdAt: true });
export type InsertCompetitor = z.infer<typeof insertCompetitorSchema>;
export type Competitor = typeof competitorsTable.$inferSelect;
