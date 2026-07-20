import { pgTable, serial, text, timestamp, numeric, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const alertConditionEnum = pgEnum("alert_condition", ["above", "below"]);

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  condition: alertConditionEnum("condition").notNull(),
  targetPrice: numeric("target_price", { precision: 18, scale: 8 }).notNull(),
  note: text("note"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  triggeredAt: timestamp("triggered_at", { withTimezone: true }),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, createdAt: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
