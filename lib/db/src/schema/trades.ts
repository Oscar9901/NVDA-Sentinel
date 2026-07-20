import { pgTable, serial, text, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tradeSideEnum = pgEnum("trade_side", ["buy", "sell"]);

export const tradesTable = pgTable("trades", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  side: tradeSideEnum("side").notNull(),
  quantity: numeric("quantity", { precision: 18, scale: 8 }).notNull(),
  price: numeric("price", { precision: 18, scale: 8 }).notNull(),
  fees: numeric("fees", { precision: 18, scale: 8 }).notNull().default("0"),
  pnl: numeric("pnl", { precision: 18, scale: 8 }),
  notes: text("notes"),
  tradedAt: timestamp("traded_at", { withTimezone: true }).defaultNow().notNull(),
  assetType: text("asset_type").notNull().default("stock"),
  contractType: text("contract_type"),
  strikePrice: numeric("strike_price", { precision: 18, scale: 8 }),
  expiryDate: text("expiry_date"),
});

export const insertTradeSchema = createInsertSchema(tradesTable).omit({ id: true });
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof tradesTable.$inferSelect;
