import { pgTable, text, serial, timestamp, integer, boolean, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dealsTable = pgTable("deals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  clientId: integer("client_id"),
  ownerId: integer("owner_id"),
  stage: text("stage").notNull().default("lead_captado"),
  platform: text("platform"),
  estimatedValue: numeric("estimated_value", { precision: 12, scale: 2 }),
  niche: text("niche"),
  riskLevel: text("risk_level"),
  leadSource: text("lead_source"),
  // Qualificacao
  hasBlockHistory: boolean("has_block_history"),
  blockDescription: text("block_description"),
  // Proposta
  proposalValue: numeric("proposal_value", { precision: 12, scale: 2 }),
  proposalConditions: text("proposal_conditions"),
  proposalTerm: text("proposal_term"),
  // Fechamento
  acceptanceDate: date("acceptance_date", { mode: "string" }),
  paymentMethod: text("payment_method"),
  termsAccepted: boolean("terms_accepted"),
  // Onboarding
  adAccountId: integer("ad_account_id"),
  adAccountCreated: boolean("ad_account_created"),
  adAccountLimit: numeric("ad_account_limit", { precision: 12, scale: 2 }),
  firstCampaignActive: boolean("first_campaign_active"),
  // Ativo / Renovação
  rentalStatus: text("rental_status"),
  contractEndDate: date("contract_end_date", { mode: "string" }),
  // Pipeline mensal
  activeMonth: text("active_month"),  // "YYYY-MM" – preenchido ao entrar em 'ativo'
  churnMonth: text("churn_month"),    // "YYYY-MM" – preenchido ao entrar em 'encerrado'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
});

export const insertDealSchema = createInsertSchema(dealsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof dealsTable.$inferSelect;
