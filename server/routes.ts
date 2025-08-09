import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertPaymentSchema, type PaymentWithClient } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard routes
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/recent-payments", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const recentPayments = await storage.getRecentPayments(limit);
      res.json(recentPayments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent payments" });
    }
  });

  app.get("/api/dashboard/overdue-payments", async (req, res) => {
    try {
      const overduePayments = await storage.getOverduePayments();
      res.json(overduePayments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch overdue payments" });
    }
  });

  // Client routes
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getClientsWithStats();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
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

  app.post("/api/clients", async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid client data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const validatedData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, validatedData);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid client data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
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

  // Payment routes
  app.get("/api/clients/:clientId/payments", async (req, res) => {
    try {
      const payments = await storage.getPaymentsByClient(req.params.clientId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validatedData);
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  app.patch("/api/payments/:id", async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.partial().parse(req.body);
      const payment = await storage.updatePayment(req.params.id, validatedData);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update payment" });
    }
  });

  app.delete("/api/payments/:id", async (req, res) => {
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

  // Get all payments with client info
  app.get("/api/payments", async (req, res) => {
    try {
      const payments = await storage.getPaymentsWithClients();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  // Export routes
  app.get("/api/export/clients", async (req, res) => {
    try {
      const clients = await storage.getClientsWithStats();
      
      const csvHeader = "Name,Company,Email,Phone,Total Paid,Outstanding,Status\n";
      const csvData = clients.map(client => 
        `"${client.name}","${client.company || ''}","${client.email}","${client.phone || ''}","$${client.totalPaid}","$${client.outstanding}","${client.paymentStatus}"`
      ).join("\n");
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="clients-report.csv"');
      res.send(csvHeader + csvData);
    } catch (error) {
      res.status(500).json({ message: "Failed to export clients" });
    }
  });

  app.get("/api/export/payments", async (req, res) => {
    try {
      const payments = await storage.getPaymentsWithClients();
      
      const csvHeader = "Client,Description,Amount,Due Date,Status,Paid Date\n";
      const csvData = payments.map((payment: PaymentWithClient) => 
        `"${payment.clientName}","${payment.description || ''}","₱${payment.amount}","${payment.dueDate}","${payment.status}","${payment.paidDate || 'Not paid'}"`
      ).join("\n");
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="payments-report.csv"');
      res.send(csvHeader + csvData);
    } catch (error) {
      res.status(500).json({ message: "Failed to export payments" });
    }
  });

  // Source code download endpoint  
  app.get("/api/export/source", async (req, res) => {
    try {
      const archiver = (await import('archiver')).default;
      const fs = await import('fs');
      
      // Set response headers for zip download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="payment-tracker-source.zip"');
      
      // Create archive
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });
      
      // Handle archive events
      archive.on('error', (err) => {
        console.error('Archive error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: "Failed to create archive" });
        }
      });
      
      archive.on('end', () => {
        console.log('Archive finalized, bytes processed: ', archive.pointer());
      });
      
      // Pipe archive to response
      archive.pipe(res);
      
      // Add source directories
      const sourceDirs = ['client/src', 'server', 'shared'];
      sourceDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
          archive.directory(dir, dir);
        }
      });
      
      // Add individual files  
      const sourceFiles = [
        'package.json',
        'tsconfig.json', 
        'tailwind.config.ts',
        'vite.config.ts',
        'postcss.config.js',
        'components.json',
        'drizzle.config.ts'
      ];
      
      sourceFiles.forEach(file => {
        if (fs.existsSync(file)) {
          archive.file(file, { name: file });
        }
      });
      
      // Add README with setup instructions
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

Generated on ${new Date().toISOString()}
Built with PayTracker Pro
`;
      
      archive.append(readmeContent, { name: 'README.md' });
      
      // Finalize archive
      await archive.finalize();
      
    } catch (error) {
      console.error('Source export error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to export source code" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
