import type { Client, ClientWithStats, DashboardStats, InsertClient, InsertPayment, Payment, PaymentWithClient } from "@shared/schema";

const STORAGE_KEY = "ptpro_db_v1";

export type OfflineDb = {
  clients: Client[];
  payments: Payment[];
};

function toIsoString(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  return typeof date === "string" ? date : date.toISOString();
}

function parseAmount(amount: string | number): number {
  return typeof amount === "number" ? amount : parseFloat(amount);
}

function computeClientStats(client: Client, clientPayments: Payment[]): ClientWithStats {
  const amountsPaid = clientPayments
    .filter((p) => p.status === "paid")
    .map((p) => parseAmount(p.amount as unknown as string));
  const totalPaid = amountsPaid.reduce((acc, n) => acc + (isFinite(n) ? n : 0), 0);

  const outstanding = clientPayments
    .filter((p) => p.status !== "paid")
    .map((p) => parseAmount(p.amount as unknown as string))
    .reduce((acc, n) => acc + (isFinite(n) ? n : 0), 0);

  const totalPayments = clientPayments.length;
  const avgPayment = totalPayments > 0
    ? clientPayments.map((p) => parseAmount(p.amount as unknown as string)).reduce((a, b) => a + b, 0) / totalPayments
    : 0;

  const paidDates = clientPayments
    .filter((p) => p.paidDate)
    .map((p) => new Date(p.paidDate as string).getTime());
  const lastPaymentDate = paidDates.length ? new Date(Math.max(...paidDates)).toISOString() : undefined;

  const now = Date.now();
  const hasOverdue = clientPayments.some((p) => p.status === "overdue" || (p.status === "pending" && new Date(p.dueDate).getTime() < now));
  const hasPending = clientPayments.some((p) => p.status === "pending");
  const paymentStatus: ClientWithStats["paymentStatus"] = hasOverdue ? "overdue" : hasPending ? "pending" : "up-to-date";

  return {
    ...client,
    totalPaid: Math.round(totalPaid * 100) / 100,
    outstanding: Math.round(outstanding * 100) / 100,
    totalPayments,
    avgPayment: Math.round(avgPayment * 100) / 100,
    lastPaymentDate,
    paymentStatus,
  };
}

export function loadDb(): OfflineDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { clients: [], payments: [] };
    const parsed = JSON.parse(raw) as OfflineDb;
    return parsed;
  } catch {
    return { clients: [], payments: [] };
  }
}

export function saveDb(db: OfflineDb): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function ensureSeedData(): void {
  const db = loadDb();
  if (db.clients.length === 0 && db.payments.length === 0) {
    const clientId = crypto.randomUUID();
    const now = new Date();
    const sampleClient: Client = {
      id: clientId,
      name: "Juan Dela Cruz",
      company: "Acme Corp",
      email: "juan@example.com",
      phone: "+63 912 345 6789",
      address: "Makati, Metro Manila",
      createdAt: now.toISOString(),
    } as unknown as Client;

    const samplePayments: Payment[] = [
      {
        id: crypto.randomUUID(),
        clientId,
        invoiceNumber: "INV-1001",
        amount: "1500.00" as unknown as Payment["amount"],
        dueDate: new Date(now.getTime() + 7 * 86400000).toISOString(),
        paidDate: null,
        status: "pending",
        description: "Website design initial fee",
        createdAt: now.toISOString(),
      } as unknown as Payment,
      {
        id: crypto.randomUUID(),
        clientId,
        invoiceNumber: "INV-0998",
        amount: "2500.00" as unknown as Payment["amount"],
        dueDate: new Date(now.getTime() - 20 * 86400000).toISOString(),
        paidDate: new Date(now.getTime() - 15 * 86400000).toISOString(),
        status: "paid",
        description: "Consulting retainer",
        createdAt: now.toISOString(),
      } as unknown as Payment,
    ];

    const seeded: OfflineDb = { clients: [sampleClient], payments: samplePayments };
    saveDb(seeded);
  }
}

// CRUD operations
export function getClientsWithStats(): ClientWithStats[] {
  const db = loadDb();
  return db.clients.map((c) => computeClientStats(c, db.payments.filter((p) => p.clientId === c.id)));
}

export function getClientWithStats(id: string): ClientWithStats | undefined {
  const db = loadDb();
  const client = db.clients.find((c) => c.id === id);
  if (!client) return undefined;
  return computeClientStats(client, db.payments.filter((p) => p.clientId === id));
}

export function listPaymentsByClient(clientId: string): Payment[] {
  const db = loadDb();
  return db.payments.filter((p) => p.clientId === clientId);
}

export function listPaymentsWithClients(): PaymentWithClient[] {
  const db = loadDb();
  return db.payments.map((p) => ({ ...p, clientName: db.clients.find((c) => c.id === p.clientId)?.name ?? "Unknown" }));
}

export function createClient(data: InsertClient): Client {
  const db = loadDb();
  const newClient: Client = {
    id: crypto.randomUUID(),
    name: data.name,
    company: data.company ?? null,
    email: data.email,
    phone: data.phone ?? null,
    address: data.address ?? null,
    createdAt: new Date().toISOString(),
  } as unknown as Client;
  db.clients.push(newClient);
  saveDb(db);
  return newClient;
}

export function updateClient(clientId: string, changes: Partial<InsertClient>): Client | undefined {
  const db = loadDb();
  const idx = db.clients.findIndex((c) => c.id === clientId);
  if (idx === -1) return undefined;
  const prev = db.clients[idx];
  const updated: Client = {
    ...prev,
    name: changes.name ?? prev.name,
    company: (changes.company ?? prev.company) as any,
    email: changes.email ?? prev.email,
    phone: (changes.phone ?? prev.phone) as any,
    address: (changes.address ?? prev.address) as any,
  } as Client;
  db.clients[idx] = updated;
  saveDb(db);
  return updated;
}

export function deleteClient(clientId: string): boolean {
  const db = loadDb();
  const before = db.clients.length;
  db.clients = db.clients.filter((c) => c.id !== clientId);
  db.payments = db.payments.filter((p) => p.clientId !== clientId);
  saveDb(db);
  return db.clients.length < before;
}

export function createPayment(data: InsertPayment): Payment {
  const db = loadDb();
  const newPayment: Payment = {
    id: crypto.randomUUID(),
    clientId: data.clientId as any,
    invoiceNumber: data.invoiceNumber,
    amount: (data.amount as any) as Payment["amount"],
    dueDate: toIsoString(data.dueDate)!,
    paidDate: toIsoString(data.paidDate),
    status: data.status ?? "pending",
    description: (data.description ?? null) as any,
    createdAt: new Date().toISOString(),
  } as Payment;
  db.payments.push(newPayment);
  saveDb(db);
  return newPayment;
}

export function updatePayment(paymentId: string, changes: Partial<InsertPayment>): Payment | undefined {
  const db = loadDb();
  const idx = db.payments.findIndex((p) => p.id === paymentId);
  if (idx === -1) return undefined;
  const prev = db.payments[idx];
  const updated: Payment = {
    ...prev,
    clientId: (changes.clientId ?? prev.clientId) as any,
    invoiceNumber: changes.invoiceNumber ?? prev.invoiceNumber,
    amount: (changes.amount ?? prev.amount) as any,
    dueDate: toIsoString(changes.dueDate) ?? prev.dueDate,
    paidDate: toIsoString(changes.paidDate) ?? prev.paidDate,
    status: (changes.status ?? prev.status) as any,
    description: (changes.description ?? prev.description) as any,
  } as Payment;
  db.payments[idx] = updated;
  saveDb(db);
  return updated;
}

export function deletePayment(paymentId: string): boolean {
  const db = loadDb();
  const before = db.payments.length;
  db.payments = db.payments.filter((p) => p.id !== paymentId);
  saveDb(db);
  return db.payments.length < before;
}

export function getDashboardStats(): DashboardStats {
  const db = loadDb();
  const totalClients = db.clients.length;

  const outstandingNum = db.payments
    .filter((p) => p.status !== "paid")
    .map((p) => parseAmount(p.amount as any))
    .reduce((a, b) => a + b, 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const paidThisMonthNum = db.payments
    .filter((p) => p.status === "paid" && p.paidDate && new Date(p.paidDate).getTime() >= monthStart)
    .map((p) => parseAmount(p.amount as any))
    .reduce((a, b) => a + b, 0);

  const overdueCount = db.payments.filter((p) => p.status !== "paid" && new Date(p.dueDate).getTime() < Date.now()).length;

  return {
    totalClients,
    outstanding: outstandingNum.toFixed(2),
    paidThisMonth: paidThisMonthNum.toFixed(2),
    overdueCount,
  };
}

export function getRecentPayments(limit: number = 5): PaymentWithClient[] {
  const payments = listPaymentsWithClients()
    .sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime())
    .slice(0, limit);
  return payments;
}

export function getOverduePayments(): PaymentWithClient[] {
  const now = Date.now();
  return listPaymentsWithClients().filter((p) => p.status !== "paid" && new Date(p.dueDate).getTime() < now);
}

export function exportClientsCsv(): string {
  const rows = getClientsWithStats();
  const headers = ["name", "company", "email", "phone", "address", "totalPaid", "outstanding", "totalPayments", "avgPayment", "lastPaymentDate", "paymentStatus"];
  const csv = [headers.join(",")].concat(
    rows.map((r) => [
      r.name,
      r.company ?? "",
      r.email,
      r.phone ?? "",
      r.address ?? "",
      r.totalPaid,
      r.outstanding,
      r.totalPayments,
      r.avgPayment,
      r.lastPaymentDate ?? "",
      r.paymentStatus,
    ].map((v) => String(v).replace(/"/g, '""')).map((v) => /[",\n]/.test(v) ? `"${v}"` : v).join(","))
  ).join("\n");
  return csv;
}

export function exportPaymentsCsv(): string {
  const rows = listPaymentsWithClients();
  const headers = ["invoiceNumber", "clientName", "amount", "dueDate", "paidDate", "status", "description"];
  const csv = [headers.join(",")].concat(
    rows.map((r) => [
      r.invoiceNumber,
      r.clientName,
      r.amount,
      r.dueDate,
      r.paidDate ?? "",
      r.status,
      r.description ?? "",
    ].map((v) => String(v).replace(/"/g, '""')).map((v) => /[",\n]/.test(v) ? `"${v}"` : v).join(","))
  ).join("\n");
  return csv;
}