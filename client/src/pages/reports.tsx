import { useQuery } from "@tanstack/react-query";
import { FileText, TrendingUp, Users, DollarSign, Database, Upload, Download as Dl } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStats } from "@shared/schema";
import { ExportDialog } from "@/components/ui/export-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { backupToFile, restoreFromFile, type StorageLocation } from "@/lib/backup";

export default function Reports() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const [location, setLocation] = useState<StorageLocation>("documents");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>("");

  async function handleBackup() {
    try {
      setBusy(true);
      setMessage("");
      const uri = await backupToFile("payment-tracker-backup.json", location);
      setMessage(`Backup saved to ${uri}`);
    } catch (e: any) {
      setMessage(`Backup failed: ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    try {
      setBusy(true);
      setMessage("");
      // Attempt restore from default path per selected location
      const path = "payment-tracker-backup.json";
      await restoreFromFile(path, location);
      setMessage("Restore completed.");
    } catch (e: any) {
      setMessage(`Restore failed: ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  }

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
              <p className="mt-1 text-sm text-slate-600 hidden sm:block">Generate, export, and back up your data</p>
            </div>
            <ExportDialog />
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

      {/* Backup & Restore */}
      <div className="px-3 sm:px-4 lg:px-8 mt-6 pb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Backup & Restore
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="text-sm text-slate-600">Storage location</div>
              <Select value={location} onValueChange={(v: any) => setLocation(v)}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Choose location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="documents">Documents (user-visible)</SelectItem>
                  <SelectItem value="data">App Data (internal)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button disabled={busy} onClick={handleBackup} className="touch-manipulation">
                <Dl className="h-4 w-4 mr-2" />
                {busy ? "Backing up..." : "Backup Now"}
              </Button>
              <Button variant="outline" disabled={busy} onClick={handleRestore} className="touch-manipulation">
                <Upload className="h-4 w-4 mr-2" />
                {busy ? "Restoring..." : "Restore Now"}
              </Button>
            </div>
            {message && <div className="text-xs text-slate-600">{message}</div>}
            <p className="text-xs text-slate-500">Backup file name: payment-tracker-backup.json</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}