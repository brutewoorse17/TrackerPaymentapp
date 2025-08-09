import { type Client, type InsertClient, type Payment, type InsertPayment, type ClientWithStats, type PaymentWithClient, type DashboardStats } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Client operations
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  getClientWithStats(id: string): Promise<ClientWithStats | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;
  
  // Payment operations
  getPayments(): Promise<Payment[]>;
  getPaymentsByClient(clientId: string): Promise<Payment[]>;
  getPayment(id: string): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  deletePayment(id: string): Promise<boolean>;
  
  // Analytics
  getDashboardStats(): Promise<DashboardStats>;
  getClientsWithStats(): Promise<ClientWithStats[]>;
  getRecentPayments(limit: number): Promise<PaymentWithClient[]>;
  getOverduePayments(): Promise<PaymentWithClient[]>;
  getPaymentsWithClients(): Promise<PaymentWithClient[]>;
}

export class MemStorage implements IStorage {
  private clients: Map<string, Client>;
  private payments: Map<string, Payment>;

  constructor() {
    this.clients = new Map();
    this.payments = new Map();
  }

  // Client operations
  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async getClient(id: string): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async getClientWithStats(id: string): Promise<ClientWithStats | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;

    const clientPayments = Array.from(this.payments.values())
      .filter(p => p.clientId === id);

    const paidPayments = clientPayments.filter(p => p.status === "paid");
    const totalPaid = paidPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const outstanding = clientPayments
      .filter(p => p.status !== "paid")
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    const lastPayment = paidPayments
      .sort((a, b) => new Date(b.paidDate || 0).getTime() - new Date(a.paidDate || 0).getTime())[0];

    const overduePayments = clientPayments.filter(p => 
      p.status === "pending" && new Date(p.dueDate) < new Date()
    );

    let paymentStatus: "up-to-date" | "pending" | "overdue" = "up-to-date";
    if (overduePayments.length > 0) {
      paymentStatus = "overdue";
    } else if (outstanding > 0) {
      paymentStatus = "pending";
    }

    return {
      ...client,
      totalPaid,
      outstanding,
      totalPayments: clientPayments.length,
      avgPayment: clientPayments.length > 0 ? totalPaid / paidPayments.length : 0,
      lastPaymentDate: lastPayment?.paidDate ? lastPayment.paidDate.toISOString() : undefined,
      paymentStatus,
    };
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = randomUUID();
    const client: Client = {
      id,
      name: insertClient.name,
      company: insertClient.company || null,
      email: insertClient.email,
      phone: insertClient.phone || null,
      address: insertClient.address || null,
      createdAt: new Date(),
    };
    this.clients.set(id, client);
    return client;
  }

  async updateClient(id: string, updateClient: Partial<InsertClient>): Promise<Client | undefined> {
    const existing = this.clients.get(id);
    if (!existing) return undefined;

    const updated: Client = { ...existing, ...updateClient };
    this.clients.set(id, updated);
    return updated;
  }

  async deleteClient(id: string): Promise<boolean> {
    // Also delete associated payments
    const clientPayments = Array.from(this.payments.entries())
      .filter(([_, payment]) => payment.clientId === id);
    
    clientPayments.forEach(([paymentId]) => {
      this.payments.delete(paymentId);
    });

    return this.clients.delete(id);
  }

  // Payment operations
  async getPayments(): Promise<Payment[]> {
    return Array.from(this.payments.values());
  }

  async getPaymentsByClient(clientId: string): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(p => p.clientId === clientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    
    // Auto-update status if payment is made after due date
    let status = insertPayment.status;
    const dueDate = new Date(insertPayment.dueDate);
    if (status === "pending" && new Date() > dueDate) {
      status = "overdue";
    }

    const payment: Payment = {
      id,
      clientId: insertPayment.clientId,
      invoiceNumber: insertPayment.invoiceNumber,
      amount: insertPayment.amount,
      dueDate: dueDate,
      paidDate: insertPayment.paidDate ? new Date(insertPayment.paidDate) : null,
      status,
      description: insertPayment.description || null,
      createdAt: new Date(),
    };
    this.payments.set(id, payment);
    return payment;
  }

  async updatePayment(id: string, updatePayment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const existing = this.payments.get(id);
    if (!existing) return undefined;

    const updated: Payment = {
      ...existing,
      ...updatePayment,
      dueDate: updatePayment.dueDate ? new Date(updatePayment.dueDate) : existing.dueDate,
      paidDate: updatePayment.paidDate ? new Date(updatePayment.paidDate) : (updatePayment.paidDate === null ? null : existing.paidDate),
      description: updatePayment.description !== undefined ? updatePayment.description : existing.description,
    };
    this.payments.set(id, updated);
    return updated;
  }

  async deletePayment(id: string): Promise<boolean> {
    return this.payments.delete(id);
  }

  // Analytics
  async getDashboardStats(): Promise<DashboardStats> {
    const allPayments = Array.from(this.payments.values());
    const totalClients = this.clients.size;
    
    const outstanding = allPayments
      .filter(p => p.status !== "paid")
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const paidThisMonth = allPayments
      .filter(p => {
        if (p.status !== "paid" || !p.paidDate) return false;
        const paidDate = new Date(p.paidDate);
        return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
      })
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    const overdueCount = allPayments.filter(p => 
      p.status === "pending" && new Date(p.dueDate) < new Date()
    ).length;

    return {
      totalClients,
      outstanding: `₱${outstanding.toLocaleString()}`,
      paidThisMonth: `₱${paidThisMonth.toLocaleString()}`,
      overdueCount,
    };
  }

  async getClientsWithStats(): Promise<ClientWithStats[]> {
    const clients = Array.from(this.clients.values());
    const stats = await Promise.all(
      clients.map(client => this.getClientWithStats(client.id))
    );
    return stats.filter((stat): stat is ClientWithStats => stat !== undefined);
  }

  async getRecentPayments(limit: number = 10): Promise<PaymentWithClient[]> {
    const allPayments = Array.from(this.payments.values())
      .filter(p => p.status === "paid")
      .sort((a, b) => {
        const aDate = new Date(a.paidDate || a.createdAt);
        const bDate = new Date(b.paidDate || b.createdAt);
        return bDate.getTime() - aDate.getTime();
      })
      .slice(0, limit);

    return allPayments.map(payment => {
      const client = this.clients.get(payment.clientId);
      return {
        ...payment,
        clientName: client?.name || "Unknown Client",
      };
    });
  }

  async getOverduePayments(): Promise<PaymentWithClient[]> {
    const overduePayments = Array.from(this.payments.values())
      .filter(p => p.status === "pending" && new Date(p.dueDate) < new Date())
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return overduePayments.map(payment => {
      const client = this.clients.get(payment.clientId);
      const daysOverdue = Math.floor(
        (new Date().getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      return {
        ...payment,
        clientName: client?.name || "Unknown Client",
        daysOverdue,
      };
    });
  }

  async getPaymentsWithClients(): Promise<PaymentWithClient[]> {
    const allPayments = Array.from(this.payments.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return allPayments.map(payment => {
      const client = this.clients.get(payment.clientId);
      return {
        ...payment,
        clientName: client?.name || "Unknown Client",
      };
    });
  }
}

export const storage = new MemStorage();
