import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { ClientWithStats } from "@shared/schema";
import { saveTextFile, type StorageLocation } from "@/lib/backup";

export function ExportDialog() {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"csv" | "xlsx" | "pdf">("csv");
  const [scope, setScope] = useState<"clients" | "payments">("clients");
  const [clientFilter, setClientFilter] = useState<string>("");
  const [location, setLocation] = useState<StorageLocation>("data");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>("");

  const { data: clients } = useQuery<ClientWithStats[]>({ queryKey: ["/api/clients"] });

  const onExport = async () => {
    setBusy(true);
    setMessage("");
    try {
      const endpoint = scope === "clients" ? "/api/export/clients" : "/api/export/payments";
      const res = await fetch(endpoint);
      const csv = await res.text();
      const base = clientFilter ? `${scope}-${clientFilter}` : scope;

      if (format === "csv") {
        const uri = await saveTextFile(`${base}.csv`, csv, "text/csv", location);
        setMessage(`Saved to ${uri}`);
        setOpen(false);
        return;
      }

      if (format === "xlsx") {
        const tsv = csv.replace(/,/g, "\t");
        const uri = await saveTextFile(`${base}.xlsx`, tsv, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", location);
        setMessage(`Saved to ${uri}`);
        setOpen(false);
        return;
      }

      if (format === "pdf") {
        const text = `Report: ${scope}\n\n` + csv;
        const uri = await saveTextFile(`${base}.pdf`, text, "application/pdf", location);
        setMessage(`Saved to ${uri}`);
        setOpen(false);
        return;
      }
    } catch (err: any) {
      setMessage(`Export failed: ${err.message || err}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="touch-manipulation">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Export Options</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Data</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as any)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select data" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clients">Clients</SelectItem>
                <SelectItem value="payments">Payments</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as any)} className="mt-2 grid grid-cols-3 gap-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="fmt-csv" />
                <Label htmlFor="fmt-csv">CSV</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="xlsx" id="fmt-xlsx" />
                <Label htmlFor="fmt-xlsx">Excel</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="fmt-pdf" />
                <Label htmlFor="fmt-pdf">PDF</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label>Filter by client (optional)</Label>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Save to</Label>
            <Select value={location} onValueChange={(v: any) => setLocation(v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="data">App Data (internal)</SelectItem>
                <SelectItem value="documents">Documents (user-visible)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={onExport} className="touch-manipulation" disabled={busy}>{busy ? 'Saving...' : 'Save'}</Button>
          </div>
          {message && <div className="text-xs text-slate-600">{message}</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}