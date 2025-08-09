import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PaymentStatus = "paid" | "pending" | "overdue" | "up-to-date";

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  daysOverdue?: number;
  className?: string;
}

export function PaymentStatusBadge({ status, daysOverdue, className }: PaymentStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "paid":
        return {
          text: "Paid",
          className: "bg-green-100 text-success",
        };
      case "pending":
        return {
          text: "Pending",
          className: "bg-orange-100 text-warning",
        };
      case "overdue":
        return {
          text: daysOverdue ? `${daysOverdue} days overdue` : "Overdue",
          className: "bg-red-100 text-danger",
        };
      case "up-to-date":
        return {
          text: "Up to date",
          className: "bg-green-100 text-success",
        };
      default:
        return {
          text: "Unknown",
          className: "bg-gray-100 text-gray-600",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge
      className={cn(config.className, className)}
      data-testid={`status-badge-${status}`}
    >
      {config.text}
    </Badge>
  );
}
