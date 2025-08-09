import {
  ensureSeedData,
  getClientsWithStats,
  getClientWithStats,
  listPaymentsByClient,
  listPaymentsWithClients,
  createClient,
  updateClient,
  deleteClient,
  createPayment,
  updatePayment,
  deletePayment,
  getDashboardStats,
  getRecentPayments,
  getOverduePayments,
  exportClientsCsv,
  exportPaymentsCsv,
} from "./offlineDb";
import type { InsertClient, InsertPayment } from "@shared/schema";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(text: string, status = 200, contentType = "text/plain"): Response {
  return new Response(text, {
    status,
    headers: { "Content-Type": contentType },
  });
}

async function readBody<T>(init?: RequestInit): Promise<T | undefined> {
  if (!init?.body) return undefined;
  if (typeof init.body === "string") {
    try { return JSON.parse(init.body) as T; } catch { return undefined; }
  }
  if (init.body instanceof Blob) {
    const text = await (init.body as Blob).text();
    try { return JSON.parse(text) as T; } catch { return undefined; }
  }
  return undefined;
}

export function installOfflineApiFetch(): void {
  ensureSeedData();
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : (input instanceof URL ? input.pathname + input.search : (input as Request).url);

    if (typeof url === "string" && url.startsWith("/api/")) {
      try {
        const method = (init?.method ?? (input as Request)?.method ?? "GET").toUpperCase();
        const u = new URL(url, window.location.origin);
        const segments = u.pathname.split("/").filter(Boolean); // ["api", ...]

        // Routes
        if (method === "GET") {
          // /api/dashboard/*
          if (segments[1] === "dashboard") {
            if (segments[2] === "stats") return jsonResponse(getDashboardStats());
            if (segments[2] === "recent-payments") return jsonResponse(getRecentPayments(Number(u.searchParams.get("limit") ?? 5)));
            if (segments[2] === "overdue-payments") return jsonResponse(getOverduePayments());
          }

          // /api/clients
          if (segments[1] === "clients" && segments.length === 2) {
            return jsonResponse(getClientsWithStats());
          }
          // /api/clients/:id
          if (segments[1] === "clients" && segments.length === 3) {
            const id = segments[2];
            const client = getClientWithStats(id);
            return client ? jsonResponse(client) : textResponse("Not found", 404);
          }
          // /api/clients/:id/payments
          if (segments[1] === "clients" && segments.length === 4 && segments[3] === "payments") {
            const id = segments[2];
            return jsonResponse(listPaymentsByClient(id));
          }
          // /api/payments
          if (segments[1] === "payments" && segments.length === 2) {
            return jsonResponse(listPaymentsWithClients());
          }
          // export endpoints
          if (segments[1] === "export") {
            if (segments[2] === "clients") return textResponse(exportClientsCsv(), 200, "text/csv");
            if (segments[2] === "payments") return textResponse(exportPaymentsCsv(), 200, "text/csv");
            if (segments[2] === "source") return textResponse("Source download is unavailable in offline mode", 501, "text/plain");
          }
        }

        if (method === "POST") {
          if (segments[1] === "clients" && segments.length === 2) {
            const body = await readBody<InsertClient>(init);
            if (!body) return textResponse("Bad Request", 400);
            const created = createClient(body);
            return jsonResponse(created, 201);
          }
          if (segments[1] === "payments" && segments.length === 2) {
            const body = await readBody<InsertPayment>(init);
            if (!body) return textResponse("Bad Request", 400);
            const created = createPayment(body);
            return jsonResponse(created, 201);
          }
        }

        if (method === "PATCH") {
          if (segments[1] === "clients" && segments.length === 3) {
            const id = segments[2];
            const body = await readBody<Partial<InsertClient>>(init);
            const updated = updateClient(id, body ?? {});
            return updated ? jsonResponse(updated) : textResponse("Not found", 404);
          }
          if (segments[1] === "payments" && segments.length === 3) {
            const id = segments[2];
            const body = await readBody<Partial<InsertPayment>>(init);
            const updated = updatePayment(id, body ?? {});
            return updated ? jsonResponse(updated) : textResponse("Not found", 404);
          }
        }

        if (method === "DELETE") {
          if (segments[1] === "clients" && segments.length === 3) {
            const id = segments[2];
            const ok = deleteClient(id);
            return ok ? textResponse("Deleted", 200) : textResponse("Not found", 404);
          }
          if (segments[1] === "payments" && segments.length === 3) {
            const id = segments[2];
            const ok = deletePayment(id);
            return ok ? textResponse("Deleted", 200) : textResponse("Not found", 404);
          }
        }

        return textResponse("Not implemented", 404);
      } catch (err: any) {
        return textResponse(err?.message ?? "Offline API error", 500);
      }
    }

    // Non-API requests fall back to original fetch
    return originalFetch(input as any, init);
  };
}