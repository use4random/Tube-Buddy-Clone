import { pgTable, serial, integer, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const experimentsTable = pgTable("experiments", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull(),
  videoId: text("video_id").notNull(),
  videoTitle: text("video_title"),
  type: text("type", { enum: ["thumbnail", "title", "both"] }).notNull(),
  status: text("status", { enum: ["active", "paused", "complete"] }).notNull().default("active"),
  activeVariant: text("active_variant"),
  winnerVariant: text("winner_variant"),
  confidenceLevel: real("confidence_level"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const experimentVariantsTable = pgTable("experiment_variants", {
  id: serial("id").primaryKey(),
  experimentId: integer("experiment_id").notNull(),
  variantLabel: text("variant_label", { enum: ["A", "B"] }).notNull(),
  thumbnailUrl: text("thumbnail_url"),
  title: text("title"),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  ctr: real("ctr").notNull().default(0),
  views: integer("views").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertExperimentSchema = createInsertSchema(experimentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExperiment = z.infer<typeof insertExperimentSchema>;
export type Experiment = typeof experimentsTable.$inferSelect;

export const insertExperimentVariantSchema = createInsertSchema(experimentVariantsTable).omit({ id: true, createdAt: true });
export type InsertExperimentVariant = z.infer<typeof insertExperimentVariantSchema>;
export type ExperimentVariant = typeof experimentVariantsTable.$inferSelect;
