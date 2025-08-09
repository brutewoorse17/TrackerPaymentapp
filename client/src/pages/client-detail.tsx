import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { ArrowLeft, Edit, Plus, Trash2, CheckCircle, Clock, DollarSign, Calendar, TrendingUp } from "lucide-react";
import { AddPaymentDialog } from "@/components/forms/add-payment-dialog";
import { EditPaymentDialog } from "@/components/forms/edit-payment-dialog";
import { EditClientDialog } from "@/components/forms/edit-client-dialog";
import { PaymentStatusBadge } from "@/components/ui/payment-status-badge";
import { StatsCard } from "@/components/ui/stats-card";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { ClientWithStats, Payment } from "@shared/schema";

export default function ClientDetail() {
  const [match, params] = useRoute("/clients/:id");
  const clientId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: client, isLoading: clientLoading } = useQuery<ClientWithStats>({
    queryKey: ["/api/clients", clientId],
    enabled: !!clientId,
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/clients", clientId, "payments"],
    enabled: !!clientId,
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      await apiRequest("DELETE", `/api/payments/${paymentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/overdue-payments"] });
      toast({
        title: "Success",
        description: "Payment deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete payment",
        variant: "destructive",
      });
    },
  });

  const handleDeletePayment = (paymentId: string) => {
    deletePaymentMutation.mutate(paymentId);
  };

  if (!match) {
    return <div>Client not found</div>;
  }

  if (clientLoading) {
    return (
      <div data-testid="client-detail-loading">
        <div className="bg-white shadow-sm border-b border-slate-200">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center">
              <Skeleton className="h-6 w-6 mr-4" />
              <div>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-6 lg:px-8 mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Skeleton className="h-64" />
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900">Client not found</h2>
          <p className="text-slate-600 mt-2">The client you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="client-detail-page">
      {/* Page header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="mr-4"
                onClick={() => window.history.back()}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900" data-testid="client-name">
                  {client.name}
                </h1>
                <p className="mt-1 text-sm text-slate-600" data-testid="client-email">
                  {client.email}
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <EditClientDialog
                client={client}
                trigger={
                  <Button variant="outline" data-testid="button-edit-client">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Client
                  </Button>
                }
              />
              <AddPaymentDialog
                clientId={client.id}
                trigger={
                  <Button data-testid="button-add-payment">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Client info and stats */}
      <div className="px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Client details */}
          <Card data-testid="card-client-details">
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-slate-500">Company</dt>
                <dd className="text-sm text-slate-900" data-testid="client-company">
                  {client.company || "Individual"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Phone</dt>
                <dd className="text-sm text-slate-900" data-testid="client-phone">
                  {client.phone || "No phone number"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Address</dt>
                <dd className="text-sm text-slate-900" data-testid="client-address">
                  {client.address || "No address provided"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Status</dt>
                <dd className="mt-1">
                  <PaymentStatusBadge status={client.paymentStatus} />
                </dd>
              </div>
            </CardContent>
          </Card>

          {/* Payment stats */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <StatsCard
              title="Total Paid"
              value={formatCurrency(client.totalPaid)}
              icon={<CheckCircle className="text-success" size={16} />}
              iconBg="bg-green-100"
              testId="card-total-paid"
            />
            <StatsCard
              title="Outstanding"
              value={formatCurrency(client.outstanding)}
              icon={<Clock className="text-warning" size={16} />}
              iconBg="bg-orange-100"
              testId="card-outstanding"
            />
            <StatsCard
              title="Total Payments"
              value={client.totalPayments.toString()}
              icon={<Calendar className="text-primary" size={16} />}
              iconBg="bg-blue-100"
              testId="card-total-payments"
            />
            <StatsCard
              title="Avg Payment"
              value={formatCurrency(client.avgPayment)}
              icon={<TrendingUp className="text-purple-600" size={16} />}
              iconBg="bg-purple-100"
              testId="card-avg-payment"
            />
          </div>
        </div>
      </div>

      {/* Payment history */}
      <div className="px-4 sm:px-6 lg:px-8 mt-8">
        <Card data-testid="card-payment-history">
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {paymentsLoading ? (
              <div className="p-6">
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px]">Invoice</TableHead>
                      <TableHead className="min-w-[100px]">Amount</TableHead>
                      <TableHead className="min-w-[100px] hidden sm:table-cell">Due Date</TableHead>
                      <TableHead className="min-w-[100px] hidden md:table-cell">Paid Date</TableHead>
                      <TableHead className="min-w-[80px]">Status</TableHead>
                      <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {payments?.length ? (
                    payments.map((payment, index) => (
                      <TableRow key={payment.id} data-testid={`payment-row-${index}`}>
                        <TableCell className="font-medium" data-testid={`payment-invoice-${index}`}>
                          {payment.invoiceNumber}
                        </TableCell>
                        <TableCell data-testid={`payment-amount-${index}`}>
                          {formatCurrency(parseFloat(payment.amount))}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell" data-testid={`payment-due-date-${index}`}>
                          {formatDate(payment.dueDate)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell" data-testid={`payment-paid-date-${index}`}>
                          {payment.paidDate ? formatDate(payment.paidDate) : "-"}
                        </TableCell>
                        <TableCell>
                          <PaymentStatusBadge 
                            status={payment.status as any}
                            data-testid={`payment-status-${index}`}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
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
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  data-testid={`button-delete-payment-${index}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the payment record.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeletePayment(payment.id)}
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
                        <div className="text-slate-500" data-testid="text-no-payments">
                          No payment records found for this client
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
