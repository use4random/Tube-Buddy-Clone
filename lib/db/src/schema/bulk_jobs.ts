import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bulkJobsTable = pgTable("bulk_jobs", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull(),
  userId: integer("user_id").notNull(),
  operationType: text("operation_type", { enum: ["update", "find_replace"] }).notNull(),
  status: text("status", { enum: ["pending", "running", "completed", "failed"] }).notNull().default("pending"),
  totalVideos: integer("total_videos").notNull().default(0),
  processedVideos: integer("processed_videos").notNull().default(0),
  errors: jsonb("errors").$type<{ videoId: string; message: string }[]>(),
  jobParams: jsonb("job_params").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const bulkJobItemsTable = pgTable("bulk_job_items", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  videoId: text("video_id").notNull(),
  status: text("status", { enum: ["pending", "completed", "failed"] }).notNull().default("pending"),
  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export const insertBulkJobSchema = createInsertSchema(bulkJobsTable).omit({ id: true, createdAt: true });
export type InsertBulkJob = z.infer<typeof insertBulkJobSchema>;
export type BulkJob = typeof bulkJobsTable.$inferSelect;

export const insertBulkJobItemSchema = createInsertSchema(bulkJobItemsTable).omit({ id: true });
export type InsertBulkJobItem = z.infer<typeof insertBulkJobItemSchema>;
export type BulkJobItem = typeof bulkJobItemsTable.$inferSelect;
