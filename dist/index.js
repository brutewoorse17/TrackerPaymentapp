// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  clients;
  payments;
  constructor() {
    this.clients = /* @__PURE__ */ new Map();
    this.payments = /* @__PURE__ */ new Map();
  }
  // Client operations
  async getClients() {
    return Array.from(this.clients.values());
  }
  async getClient(id) {
    return this.clients.get(id);
  }
  async getClientWithStats(id) {
    const client = this.clients.get(id);
    if (!client) return void 0;
    const clientPayments = Array.from(this.payments.values()).filter((p) => p.clientId === id);
    const paidPayments = clientPayments.filter((p) => p.status === "paid");
    const totalPaid = paidPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const outstanding = clientPayments.filter((p) => p.status !== "paid").reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const lastPayment = paidPayments.sort((a, b) => new Date(b.paidDate || 0).getTime() - new Date(a.paidDate || 0).getTime())[0];
    const overduePayments = clientPayments.filter(
      (p) => p.status === "pending" && new Date(p.dueDate) < /* @__PURE__ */ new Date()
    );
    let paymentStatus = "up-to-date";
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
      lastPaymentDate: lastPayment?.paidDate ? lastPayment.paidDate.toISOString() : void 0,
      paymentStatus
    };
  }
  async createClient(insertClient) {
    const id = randomUUID();
    const client = {
      id,
      name: insertClient.name,
      company: insertClient.company || null,
      email: insertClient.email,
      phone: insertClient.phone || null,
      address: insertClient.address || null,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.clients.set(id, client);
    return client;
  }
  async updateClient(id, updateClient) {
    const existing = this.clients.get(id);
    if (!existing) return void 0;
    const updated = { ...existing, ...updateClient };
    this.clients.set(id, updated);
    return updated;
  }
  async deleteClient(id) {
    const clientPayments = Array.from(this.payments.entries()).filter(([_, payment]) => payment.clientId === id);
    clientPayments.forEach(([paymentId]) => {
      this.payments.delete(paymentId);
    });
    return this.clients.delete(id);
  }
  // Payment operations
  async getPayments() {
    return Array.from(this.payments.values());
  }
  async getPaymentsByClient(clientId) {
    return Array.from(this.payments.values()).filter((p) => p.clientId === clientId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async getPayment(id) {
    return this.payments.get(id);
  }
  async createPayment(insertPayment) {
    const id = randomUUID();
    let status = insertPayment.status;
    const dueDate = new Date(insertPayment.dueDate);
    if (status === "pending" && /* @__PURE__ */ new Date() > dueDate) {
      status = "overdue";
    }
    const payment = {
      id,
      clientId: insertPayment.clientId,
      invoiceNumber: insertPayment.invoiceNumber,
      amount: insertPayment.amount,
      dueDate,
      paidDate: insertPayment.paidDate ? new Date(insertPayment.paidDate) : null,
      status,
      description: insertPayment.description || null,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.payments.set(id, payment);
    return payment;
  }
  async updatePayment(id, updatePayment) {
    const existing = this.payments.get(id);
    if (!existing) return void 0;
    const updated = {
      ...existing,
      ...updatePayment,
      dueDate: updatePayment.dueDate ? new Date(updatePayment.dueDate) : existing.dueDate,
      paidDate: updatePayment.paidDate ? new Date(updatePayment.paidDate) : updatePayment.paidDate === null ? null : existing.paidDate,
      description: updatePayment.description !== void 0 ? updatePayment.description : existing.description
    };
    this.payments.set(id, updated);
    return updated;
  }
  async deletePayment(id) {
    return this.payments.delete(id);
  }
  // Analytics
  async getDashboardStats() {
    const allPayments = Array.from(this.payments.values());
    const totalClients = this.clients.size;
    const outstanding = allPayments.filter((p) => p.status !== "paid").reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const currentMonth = (/* @__PURE__ */ new Date()).getMonth();
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const paidThisMonth = allPayments.filter((p) => {
      if (p.status !== "paid" || !p.paidDate) return false;
      const paidDate = new Date(p.paidDate);
      return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
    }).reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const overdueCount = allPayments.filter(
      (p) => p.status === "pending" && new Date(p.dueDate) < /* @__PURE__ */ new Date()
    ).length;
    return {
      totalClients,
      outstanding: `\u20B1${outstanding.toLocaleString()}`,
      paidThisMonth: `\u20B1${paidThisMonth.toLocaleString()}`,
      overdueCount
    };
  }
  async getClientsWithStats() {
    const clients2 = Array.from(this.clients.values());
    const stats = await Promise.all(
      clients2.map((client) => this.getClientWithStats(client.id))
    );
    return stats.filter((stat) => stat !== void 0);
  }
  async getRecentPayments(limit = 10) {
    const allPayments = Array.from(this.payments.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
    return allPayments.map((payment) => {
      const client = this.clients.get(payment.clientId);
      return {
        ...payment,
        clientName: client?.name || "Unknown Client"
      };
    });
  }
  async getOverduePayments() {
    const overduePayments = Array.from(this.payments.values()).filter((p) => p.status === "pending" && new Date(p.dueDate) < /* @__PURE__ */ new Date()).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return overduePayments.map((payment) => {
      const client = this.clients.get(payment.clientId);
      const daysOverdue = Math.floor(
        ((/* @__PURE__ */ new Date()).getTime() - new Date(payment.dueDate).getTime()) / (1e3 * 60 * 60 * 24)
      );
      return {
        ...payment,
        clientName: client?.name || "Unknown Client",
        daysOverdue
      };
    });
  }
  async getPaymentsWithClients() {
    const allPayments = Array.from(this.payments.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return allPayments.map((payment) => {
      const client = this.clients.get(payment.clientId);
      return {
        ...payment,
        clientName: client?.name || "Unknown Client"
      };
    });
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, decimal, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var clients = pgTable("clients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  company: text("company"),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  paidDate: timestamp("paid_date"),
  status: text("status", { enum: ["pending", "paid", "overdue"] }).notNull().default("pending"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true
}).extend({
  company: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional()
});
var insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true
}).extend({
  dueDate: z.string(),
  paidDate: z.string().nullable().optional(),
  status: z.enum(["pending", "paid", "overdue"]).default("pending"),
  description: z.string().nullable().optional()
});

// server/routes.ts
import { z as z2 } from "zod";
async function registerRoutes(app2) {
  app2.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });
  app2.get("/api/dashboard/recent-payments", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 5;
      const recentPayments = await storage.getRecentPayments(limit);
      res.json(recentPayments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent payments" });
    }
  });
  app2.get("/api/dashboard/overdue-payments", async (req, res) => {
    try {
      const overduePayments = await storage.getOverduePayments();
      res.json(overduePayments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch overdue payments" });
    }
  });
  app2.get("/api/clients", async (req, res) => {
    try {
      const clients2 = await storage.getClientsWithStats();
      res.json(clients2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });
  app2.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClientWithStats(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });
  app2.post("/api/clients", async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid client data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create client" });
    }
  });
  app2.patch("/api/clients/:id", async (req, res) => {
    try {
      const validatedData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, validatedData);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid client data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update client" });
    }
  });
  app2.delete("/api/clients/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteClient(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete client" });
    }
  });
  app2.get("/api/clients/:clientId/payments", async (req, res) => {
    try {
      const payments2 = await storage.getPaymentsByClient(req.params.clientId);
      res.json(payments2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });
  app2.post("/api/payments", async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validatedData);
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid payment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create payment" });
    }
  });
  app2.patch("/api/payments/:id", async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.partial().parse(req.body);
      const payment = await storage.updatePayment(req.params.id, validatedData);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid payment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update payment" });
    }
  });
  app2.delete("/api/payments/:id", async (req, res) => {
    try {
      const deleted = await storage.deletePayment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Payment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete payment" });
    }
  });
  app2.get("/api/payments", async (req, res) => {
    try {
      const payments2 = await storage.getPaymentsWithClients();
      res.json(payments2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });
  app2.get("/api/export/clients", async (req, res) => {
    try {
      const clients2 = await storage.getClientsWithStats();
      const csvHeader = "Name,Company,Email,Phone,Total Paid,Outstanding,Status\n";
      const csvData = clients2.map(
        (client) => `"${client.name}","${client.company || ""}","${client.email}","${client.phone || ""}","$${client.totalPaid}","$${client.outstanding}","${client.paymentStatus}"`
      ).join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="clients-report.csv"');
      res.send(csvHeader + csvData);
    } catch (error) {
      res.status(500).json({ message: "Failed to export clients" });
    }
  });
  app2.get("/api/export/payments", async (req, res) => {
    try {
      const payments2 = await storage.getPaymentsWithClients();
      const csvHeader = "Client,Description,Amount,Due Date,Status,Paid Date\n";
      const csvData = payments2.map(
        (payment) => `"${payment.clientName}","${payment.description || ""}","\u20B1${payment.amount}","${payment.dueDate}","${payment.status}","${payment.paidDate || "Not paid"}"`
      ).join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="payments-report.csv"');
      res.send(csvHeader + csvData);
    } catch (error) {
      res.status(500).json({ message: "Failed to export payments" });
    }
  });
  app2.get("/api/export/source", async (req, res) => {
    try {
      const archiver = (await import("archiver")).default;
      const fs2 = await import("fs");
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", 'attachment; filename="payment-tracker-source.zip"');
      const archive = archiver("zip", {
        zlib: { level: 9 }
      });
      archive.on("error", (err) => {
        console.error("Archive error:", err);
        if (!res.headersSent) {
          res.status(500).json({ message: "Failed to create archive" });
        }
      });
      archive.on("end", () => {
        console.log("Archive finalized, bytes processed: ", archive.pointer());
      });
      archive.pipe(res);
      const sourceDirs = ["client/src", "server", "shared"];
      sourceDirs.forEach((dir) => {
        if (fs2.existsSync(dir)) {
          archive.directory(dir, dir);
        }
      });
      const sourceFiles = [
        "package.json",
        "tsconfig.json",
        "tailwind.config.ts",
        "vite.config.ts",
        "postcss.config.js",
        "components.json",
        "drizzle.config.ts"
      ];
      sourceFiles.forEach((file) => {
        if (fs2.existsSync(file)) {
          archive.file(file, { name: file });
        }
      });
      const readmeContent = `# Payment Tracker Pro - Source Code

## Setup Instructions

1. Install Node.js (v18 or higher)
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

4. Open http://localhost:5000 in your browser

## Features

- Client management with full CRUD operations
- Payment tracking and status management
- Philippine peso (PHP) currency formatting
- Dashboard with analytics and statistics
- Data export capabilities (CSV/ZIP)
- Responsive design optimized for mobile devices
- Source code download functionality

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, TypeScript
- **Database**: In-memory storage (easily replaceable with PostgreSQL)
- **UI Components**: Radix UI (shadcn/ui)
- **Forms**: React Hook Form with Zod validation
- **State Management**: TanStack Query
- **Routing**: Wouter for lightweight client-side routing

## Project Structure

- \`client/src/\` - Frontend React application
  - \`components/\` - Reusable UI components
  - \`pages/\` - Application pages/routes
  - \`hooks/\` - Custom React hooks
  - \`lib/\` - Utility functions and configurations
- \`server/\` - Backend Express API
  - \`routes.ts\` - API route definitions
  - \`storage.ts\` - Data storage interface
- \`shared/\` - Shared types and schemas between frontend/backend

## Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run preview\` - Preview production build

## Environment Setup

This project is designed to work out of the box without additional configuration. 
The in-memory storage can be easily replaced with a real database by implementing 
the \`IStorage\` interface in \`server/storage.ts\`.

Generated on ${(/* @__PURE__ */ new Date()).toISOString()}
Built with PayTracker Pro
`;
      archive.append(readmeContent, { name: "README.md" });
      await archive.finalize();
    } catch (error) {
      console.error("Source export error:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to export source code" });
      }
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
      return res.status(400).json({ message: "Invalid JSON body. Ensure Content-Type: application/json and valid JSON syntax." });
    }
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
