import { useQuery } from "@tanstack/react-query";
import { Download, FileText, TrendingUp, Users, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadCSV } from "@/lib/utils";
import type { DashboardStats } from "@shared/schema";

export default function Reports() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const handleExportClients = async () => {
    try {
      const response = await fetch("/api/export/clients");
      const csvData = await response.text();
      downloadCSV(csvData, "clients-report.csv");
    } catch (error) {
      console.error("Failed to export clients report:", error);
    }
  };

  const handleExportPayments = async () => {
    try {
      const response = await fetch("/api/export/payments");
      const csvData = await response.text();
      downloadCSV(csvData, "payments-report.csv");
    } catch (error) {
      console.error("Failed to export payments report:", error);
    }
  };

  if (isLoading) {
    return (
      <div data-testid="reports-loading">
        <div className="bg-white shadow-sm border-b border-slate-200">
          <div className="px-3 sm:px-4 lg:px-8 py-3 sm:py-4 lg:py-6">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>
        <div className="px-3 sm:px-4 lg:px-8 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="reports-page" className="min-h-full">
      {/* Page header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="px-3 sm:px-4 lg:px-8 py-3 sm:py-4 lg:py-6">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900" data-testid="page-title">Reports</h1>
              <p className="mt-1 text-sm text-slate-600 hidden sm:block">Generate and export business reports</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reports summary */}
      <div className="px-3 sm:px-4 lg:px-8 mt-4 sm:mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.paidThisMonth || "$0"}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
              <p className="text-xs text-muted-foreground">Total clients</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.outstanding || "$0"}</div>
              <p className="text-xs text-muted-foreground">Pending payments</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Export options */}
      <div className="px-3 sm:px-4 lg:px-8 mt-6 pb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Export Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleExportClients}
                className="flex-1 touch-manipulation"
                data-testid="button-export-clients"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Clients Report
              </Button>
              <Button
                onClick={handleExportPayments}
                variant="outline"
                className="flex-1 touch-manipulation"
                data-testid="button-export-payments"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Payments Report
              </Button>
            </div>
            <p className="text-sm text-slate-600">
              Export your data as CSV files for analysis in spreadsheet applications.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}