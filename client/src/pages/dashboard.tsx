import { useQuery } from "@tanstack/react-query";
import { Users, DollarSign, CheckCircle, AlertTriangle, Download, Plus, Menu } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-card";
import { PaymentStatusBadge } from "@/components/ui/payment-status-badge";
import { AddClientDialog } from "@/components/forms/add-client-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatCurrency, getDaysOverdue, downloadCSV } from "@/lib/utils";
import type { DashboardStats, PaymentWithClient } from "@shared/schema";
import { ExportDialog } from "@/components/ui/export-dialog";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentPayments, isLoading: paymentsLoading } = useQuery<PaymentWithClient[]>({
    queryKey: ["/api/dashboard/recent-payments"],
  });

  const { data: overduePayments, isLoading: overdueLoading } = useQuery<PaymentWithClient[]>({
    queryKey: ["/api/dashboard/overdue-payments"],
  });

  const handleExportReport = async () => {
    try {
      const response = await fetch("/api/export/clients");
      const csvData = await response.text();
      downloadCSV(csvData, "clients-report.csv");
    } catch (error) {
      console.error("Failed to export report:", error);
    }
  };

  if (statsLoading) {
    return (
      <div>
        <div className="bg-white shadow-sm border-b border-slate-200">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>
        <div className="px-4 sm:px-6 lg:px-8 mt-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-page" className="min-h-full">
      {/* Page header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="px-3 sm:px-4 lg:px-8 py-3 sm:py-4 lg:py-6">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate" data-testid="page-title">Dashboard</h1>
              <p className="mt-1 text-sm text-slate-600 hidden sm:block">Overview of your client payments and status</p>
            </div>
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3">
              <ExportDialog />
              <AddClientDialog />
            </div>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="px-3 sm:px-4 lg:px-8 mt-4 sm:mt-6">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4 lg:grid-cols-4">
          <StatsCard
            title="Clients"
            value={stats?.totalClients.toString() || "0"}
            icon={<Users className="text-primary" size={14} />}
            iconBg="bg-blue-100"
          />
          <StatsCard
            title="Outstanding"
            value={stats?.outstanding || "$0"}
            icon={<AlertTriangle className="text-orange-600" size={14} />}
            iconBg="bg-orange-100"
          />
          <StatsCard
            title="Paid This Month"
            value={stats?.paidThisMonth || "$0"}
            icon={<DollarSign className="text-green-600" size={14} />}
            iconBg="bg-green-100"
          />
          <StatsCard
            title="Overdue"
            value={(stats?.overdueCount ?? 0).toString()}
            icon={<CheckCircle className="text-red-600" size={14} />}
            iconBg="bg-red-100"
          />
        </div>
      </div>

      {/* Recent Payments - compact list */}
      <div className="px-3 sm:px-4 lg:px-8 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24 mt-1" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : recentPayments?.length ? (
              <div className="divide-y divide-slate-100">
                {recentPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">{p.clientName}</div>
                      <div className="text-xs text-slate-500">{formatDate(p.createdAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{formatCurrency(parseFloat(p.amount))}</div>
                      <div className="mt-1"><PaymentStatusBadge status={p.status} /></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 py-4">No recent payments found</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue Payments - compact list */}
      <div className="px-3 sm:px-4 lg:px-8 mt-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Overdue Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {overdueLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24 mt-1" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : overduePayments?.length ? (
              <div className="divide-y divide-slate-100">
                {overduePayments.map((p) => {
                  const daysOverdue = getDaysOverdue(p.dueDate);
                  return (
                    <div key={p.id} className="flex items-center justify-between py-3">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">{p.clientName}</div>
                        <div className="text-xs text-slate-500">Due: {formatDate(p.dueDate)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatCurrency(parseFloat(p.amount))}</div>
                        <div className="mt-1"><PaymentStatusBadge status={p.status} daysOverdue={daysOverdue} /></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-slate-500 py-4">No overdue payments found</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
