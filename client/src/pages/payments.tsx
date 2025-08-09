import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Plus, Edit } from "lucide-react";
import { PaymentStatusBadge } from "@/components/ui/payment-status-badge";
import { AddPaymentDialog } from "@/components/forms/add-payment-dialog";
import { EditPaymentDialog } from "@/components/forms/edit-payment-dialog";
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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { PaymentWithClient } from "@shared/schema";

export default function Payments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: payments, isLoading } = useQuery<PaymentWithClient[]>({
    queryKey: ["/api/payments"],
  });

  const filteredPayments = payments?.filter((payment) => {
    const matchesSearch = 
      payment.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (payment.description && payment.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div data-testid="payments-loading">
        <div className="bg-white shadow-sm border-b border-slate-200">
          <div className="px-3 sm:px-4 lg:px-8 py-3 sm:py-4 lg:py-6">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>
        <div className="px-3 sm:px-4 lg:px-8 mt-6">
          <Card>
            <CardContent className="p-0">
              <div className="space-y-3 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="payments-page" className="min-h-full">
      {/* Page header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="px-3 sm:px-4 lg:px-8 py-3 sm:py-4 lg:py-6">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900" data-testid="page-title">Payments</h1>
              <p className="mt-1 text-sm text-slate-600 hidden sm:block">Manage all payment records and transactions</p>
            </div>
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3">
              <AddPaymentDialog clientId="" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="px-3 sm:px-4 lg:px-8 mt-4 sm:mt-6">
        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <Input
                type="text"
                placeholder="Search payments..."
                className="pl-10 touch-manipulation"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-payments"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 touch-manipulation" data-testid="select-status-filter">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Payments table */}
      <div className="px-3 sm:px-4 lg:px-8 mt-4 sm:mt-6 pb-6">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments?.length ? (
                    filteredPayments.map((payment, index) => (
                      <TableRow key={payment.id} data-testid={`payment-row-${index}`}>
                        <TableCell className="font-medium" data-testid={`text-client-name-${index}`}>
                          {payment.clientName}
                        </TableCell>
                        <TableCell data-testid={`text-description-${index}`}>
                          {payment.description}
                        </TableCell>
                        <TableCell data-testid={`text-amount-${index}`}>
                          {formatCurrency(parseFloat(payment.amount))}
                        </TableCell>
                        <TableCell data-testid={`text-due-date-${index}`}>
                          {formatDate(payment.dueDate)}
                        </TableCell>
                        <TableCell data-testid={`badge-status-${index}`}>
                          <PaymentStatusBadge status={payment.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <EditPaymentDialog
                            payment={payment}
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`button-edit-payment-${index}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="text-slate-500" data-testid="text-no-payments">
                          {searchQuery || statusFilter !== "all" ? "No payments match your search criteria" : "No payments found"}
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