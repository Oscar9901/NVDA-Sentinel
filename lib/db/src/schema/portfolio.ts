import { pgTable, serial, text, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assetTypeEnum = pgEnum("asset_type", ["stock", "option"]);

export const portfolioPositionsTable = pgTable("portfolio_positions", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  quantity: numeric("quantity", { precision: 18, scale: 8 }).notNull(),
  avgCost: numeric("avg_cost", { precision: 18, scale: 8 }).notNull(),
  openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
  notes: text("notes"),
  assetType: assetTypeEnum("asset_type").notNull().default("stock"),
  contractType: text("contract_type"),
  strikePrice: numeric("strike_price", { precision: 18, scale: 8 }),
  expiryDate: text("expiry_date"),
});

export const insertPositionSchema = createInsertSchema(portfolioPositionsTable).omit({ id: true, openedAt: true });
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type Position = typeof portfolioPositionsTable.$inferSelect;
