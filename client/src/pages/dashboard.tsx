import { useQuery } from "@tanstack/react-query";
import { Users, DollarSign, CheckCircle, AlertTriangle, ArrowLeft, Download, Plus, Menu } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-card";
import { PaymentStatusBadge } from "@/components/ui/payment-status-badge";
import { AddClientDialog } from "@/components/forms/add-client-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatCurrency, getDaysOverdue, downloadCSV } from "@/lib/utils";
import type { DashboardStats, PaymentWithClient } from "@shared/schema";

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

  const handleDownloadSource = async () => {
    try {
      const response = await fetch("/api/export/source");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'payment-tracker-source.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to download source code:", error);
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
              <Button
                variant="outline"
                onClick={handleExportReport}
                data-testid="button-export-report"
                className="touch-manipulation"
                size="sm"
              >
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export Report</span>
                <span className="sm:hidden">Export</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadSource}
                data-testid="button-download-source"
                className="touch-manipulation"
                size="sm"
              >
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Download Source</span>
                <span className="sm:hidden">Source</span>
              </Button>
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
            testId="card-total-clients"
          />
          <StatsCard
            title="Outstanding"
            value={stats?.outstanding || "$0"}
            icon={<DollarSign className="text-danger" size={14} />}
            iconBg="bg-red-100"
            testId="card-outstanding"
          />
          <StatsCard
            title="Paid"
            value={stats?.paidThisMonth || "$0"}
            icon={<CheckCircle className="text-success" size={14} />}
            iconBg="bg-green-100"
            testId="card-paid-this-month"
          />
          <StatsCard
            title="Overdue"
            value={stats?.overdueCount.toString() || "0"}
            icon={<AlertTriangle className="text-warning" size={14} />}
            iconBg="bg-orange-100"
            testId="card-overdue"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-3 sm:px-4 lg:px-8 mt-4 sm:mt-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-8">
          {/* Recent Payments */}
          <Card data-testid="card-recent-payments">
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-3">
                      <div className="flex items-center">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="ml-4">
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-4 w-16 mb-1" />
                        <Skeleton className="h-5 w-12" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentPayments?.length ? (
                <div className="space-y-0">
                  {recentPayments.map((payment, index) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between py-2 sm:py-3 border-b border-slate-100 last:border-b-0"
                      data-testid={`recent-payment-${index}`}
                    >
                      <div className="flex items-center min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="text-success" size={14} />
                        </div>
                        <div className="ml-3 min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 truncate" data-testid={`text-client-name-${index}`}>
                            {payment.clientName}
                          </p>
                          <p className="text-xs sm:text-sm text-slate-500" data-testid={`text-payment-date-${index}`}>
                            {formatDate(payment.paidDate || payment.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right ml-2 flex-shrink-0">
                        <p className="text-sm font-medium text-slate-900" data-testid={`text-payment-amount-${index}`}>
                          {formatCurrency(parseFloat(payment.amount))}
                        </p>
                        <div className="mt-1">
                          <PaymentStatusBadge status="paid" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-4" data-testid="text-no-recent-payments">
                  No recent payments found
                </p>
              )}
            </CardContent>
          </Card>

          {/* Overdue Clients */}
          <Card data-testid="card-overdue-payments">
            <CardHeader>
              <CardTitle>Overdue Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {overdueLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-3">
                      <div className="flex items-center">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="ml-4">
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-4 w-16 mb-1" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : overduePayments?.length ? (
                <div className="space-y-0">
                  {overduePayments.map((payment, index) => {
                    const daysOverdue = getDaysOverdue(payment.dueDate);
                    return (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between py-2 sm:py-3 border-b border-slate-100 last:border-b-0"
                        data-testid={`overdue-payment-${index}`}
                      >
                        <div className="flex items-center min-w-0 flex-1">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="text-danger" size={14} />
                          </div>
                          <div className="ml-3 min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900 truncate" data-testid={`text-overdue-client-name-${index}`}>
                              {payment.clientName}
                            </p>
                            <p className="text-xs sm:text-sm text-slate-500" data-testid={`text-overdue-due-date-${index}`}>
                              Due: {formatDate(payment.dueDate)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          <p className="text-sm font-medium text-slate-900" data-testid={`text-overdue-amount-${index}`}>
                            {formatCurrency(parseFloat(payment.amount))}
                          </p>
                          <div className="mt-1">
                            <PaymentStatusBadge 
                              status="overdue" 
                              daysOverdue={daysOverdue}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-4" data-testid="text-no-overdue-payments">
                  No overdue payments found
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
