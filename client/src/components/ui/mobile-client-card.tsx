import { Link } from "wouter";
import { Eye, Edit, Trash2 } from "lucide-react";
import { PaymentStatusBadge } from "@/components/ui/payment-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import type { ClientWithStats } from "@shared/schema";

interface MobileClientCardProps {
  client: ClientWithStats;
  index: number;
  onDelete: (id: string) => void;
}

export function MobileClientCard({ client, index, onDelete }: MobileClientCardProps) {
  return (
    <Card className="mb-4" data-testid={`client-card-${index}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
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
            <div className="ml-3">
              <h3 className="font-semibold text-slate-900" data-testid={`text-client-name-${index}`}>
                {client.name}
              </h3>
              <p className="text-sm text-slate-500" data-testid={`text-client-company-${index}`}>
                {client.company || "Individual"}
              </p>
            </div>
          </div>
          <PaymentStatusBadge status={client.paymentStatus} />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Outstanding</p>
            <p className="text-lg font-semibold text-slate-900" data-testid={`text-client-outstanding-${index}`}>
              {formatCurrency(client.outstanding)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Last Payment</p>
            <p className="text-sm text-slate-600" data-testid={`text-client-last-payment-${index}`}>
              {client.lastPaymentDate ? formatDate(client.lastPaymentDate) : "No payments"}
            </p>
          </div>
        </div>
        
        <div className="mb-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Contact</p>
          <p className="text-sm text-slate-900" data-testid={`text-client-email-${index}`}>
            {client.email}
          </p>
          <p className="text-sm text-slate-500" data-testid={`text-client-phone-${index}`}>
            {client.phone || "No phone"}
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Link href={`/clients/${client.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 touch-manipulation"
              data-testid={`button-view-client-${index}`}
            >
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 touch-manipulation"
            data-testid={`button-edit-client-${index}`}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive touch-manipulation"
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
                  onClick={() => onDelete(client.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}