import { pgTable, text, serial, timestamp, integer, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adAccountsTable = pgTable("ad_accounts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id"),
  platform: text("platform").notNull(),
  accountIdentifier: text("account_identifier").notNull(),
  monthlyLimit: numeric("monthly_limit", { precision: 12, scale: 2 }),
  status: text("status").notNull().default("ativa"), // ativa | bloqueada | em_revisao | encerrada
  rentalPeriodType: text("rental_period_type"), // daily | weekly | biweekly | monthly
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAdAccountSchema = createInsertSchema(adAccountsTable).omit({ id: true, createdAt: true });
export type InsertAdAccount = z.infer<typeof insertAdAccountSchema>;
export type AdAccount = typeof adAccountsTable.$inferSelect;
