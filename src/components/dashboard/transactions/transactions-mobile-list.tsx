import { HiOutlineCreditCard } from "react-icons/hi";

import { TransactionCard } from "@/components/dashboard/transactions/transaction-card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { CustomerTransactionSummary } from "@/lib/customer-dashboard/types";

export function TransactionsMobileList({
  data,
}: {
  data: CustomerTransactionSummary[];
}) {
  if (data.length === 0) {
    return (
      <Empty className="border border-border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HiOutlineCreditCard className="size-5" />
          </EmptyMedia>
          <EmptyTitle>Sin transacciones</EmptyTitle>
          <EmptyDescription>
            No hay transacciones para mostrar con los filtros actuales.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {data.map((transaction) => (
        <li key={transaction.id}>
          <TransactionCard transaction={transaction} />
        </li>
      ))}
    </ul>
  );
}
