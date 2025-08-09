import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Eye, Edit, Trash2, Plus } from "lucide-react";
import { AddClientDialog } from "@/components/forms/add-client-dialog";
import { EditClientDialog } from "@/components/forms/edit-client-dialog";
import { PaymentStatusBadge } from "@/components/ui/payment-status-badge";
import { MobileClientCard } from "@/components/ui/mobile-client-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import type { ClientWithStats } from "@shared/schema";

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients, isLoading } = useQuery<ClientWithStats[]>({
    queryKey: ["/api/clients"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete client",
        variant: "destructive",
      });
    },
  });

  const filteredClients = clients?.filter((client) => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.company && client.company.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || client.paymentStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleDeleteClient = (id: string) => {
    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div data-testid="clients-loading">
        <div className="bg-white shadow-sm border-b border-slate-200">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Skeleton className="flex-1 h-10" />
            <Skeleton className="w-40 h-10" />
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="clients-page">
      {/* Page header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900" data-testid="page-title">Clients</h1>
              <p className="mt-1 text-sm text-slate-600">Manage your client information and payment history</p>
            </div>
            <AddClientDialog />
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <Input
                type="text"
                placeholder="Search clients..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-clients"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" data-testid="select-status-filter">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="up-to-date">Up to Date</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile cards (visible on small screens) */}
      <div className="px-4 sm:px-6 lg:px-8 md:hidden">
        {filteredClients?.length ? (
          filteredClients.map((client, index) => (
            <MobileClientCard
              key={client.id}
              client={client}
              index={index}
              onDelete={handleDeleteClient}
            />
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-slate-500" data-testid="text-no-clients-mobile">
                {searchQuery || statusFilter ? "No clients match your search criteria" : "No clients found"}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop table (hidden on small screens) */}
      <div className="px-4 sm:px-6 lg:px-8 hidden md:block">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Client</TableHead>
                    <TableHead className="min-w-[180px] hidden sm:table-cell">Contact</TableHead>
                    <TableHead className="min-w-[120px]">Outstanding</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[120px] hidden md:table-cell">Last Payment</TableHead>
                    <TableHead className="text-right min-w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredClients?.length ? (
                  filteredClients.map((client, index) => (
                    <TableRow key={client.id} data-testid={`client-row-${index}`}>
                      <TableCell>
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            client.paymentStatus === "overdue" ? "bg-red-100" :
                            client.paymentStatus === "pending" ? "bg-orange-100" :
                            "bg-blue-100"
                          }`}>
                            <span className={`text-sm font-medium ${
                              client.paymentStatus === "overdue" ? "text-danger" :
                              client.paymentStatus === "pending" ? "text-warning" :
                              "text-primary"
                            }`}>
                              {getInitials(client.name)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-slate-900" data-testid={`text-client-name-${index}`}>
                              {client.name}
                            </div>
                            <div className="text-sm text-slate-500" data-testid={`text-client-company-${index}`}>
                              {client.company || "Individual"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="text-sm text-slate-900" data-testid={`text-client-email-${index}`}>
                          {client.email}
                        </div>
                        <div className="text-sm text-slate-500" data-testid={`text-client-phone-${index}`}>
                          {client.phone || "No phone"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-slate-900" data-testid={`text-client-outstanding-${index}`}>
                          {formatCurrency(client.outstanding)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge 
                          status={client.paymentStatus}
                          data-testid={`status-badge-${index}`}
                        />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-slate-500" data-testid={`text-client-last-payment-${index}`}>
                          {client.lastPaymentDate ? formatDate(client.lastPaymentDate) : "No payments"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Link href={`/clients/${client.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-view-client-${index}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <EditClientDialog
                            client={client}
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`button-edit-client-${index}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-delete-client-${index}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the client
                                  and all associated payment records.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteClient(client.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-slate-500" data-testid="text-no-clients">
                        {searchQuery || statusFilter ? "No clients match your search criteria" : "No clients found"}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
