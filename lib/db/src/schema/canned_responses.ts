import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cannedResponsesTable = pgTable("canned_responses", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull(),
  label: text("label").notNull(),
  body: text("body").notNull(),
  tags: text("tags").array().notNull().default([]),
  useCount: integer("use_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCannedResponseSchema = createInsertSchema(cannedResponsesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCannedResponse = z.infer<typeof insertCannedResponseSchema>;
export type CannedResponse = typeof cannedResponsesTable.$inferSelect;
