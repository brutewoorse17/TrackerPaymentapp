import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  company: text("company"),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  paidDate: timestamp("paid_date"),
  status: text("status", { enum: ["pending", "paid", "overdue"] }).notNull().default("pending"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
}).extend({
  company: z.string().nullable().optional(),
  phone: z.string().nullable().optional(), 
  address: z.string().nullable().optional(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
}).extend({
  dueDate: z.string(),
  paidDate: z.string().nullable().optional(),
  status: z.enum(["pending", "paid", "overdue"]).default("pending"),
  description: z.string().nullable().optional(),
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Additional types for API responses
export type ClientWithStats = Client & {
  totalPaid: number;
  outstanding: number;
  totalPayments: number;
  avgPayment: number;
  lastPaymentDate?: string;
  paymentStatus: "up-to-date" | "pending" | "overdue";
};

export type PaymentWithClient = Payment & {
  clientName: string;
};

export type DashboardStats = {
  totalClients: number;
  outstanding: string;
  paidThisMonth: string;
  overdueCount: number;
};
