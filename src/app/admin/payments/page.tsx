import { DataTable } from "@/components/data-table";

import { columns, type Payment } from "./columns";

const payments: Payment[] = [
  {
    id: "728ed52f",
    amount: 100,
    status: "pending",
    email: "m@example.com",
  },
  {
    id: "489e1d42",
    amount: 125,
    status: "processing",
    email: "example@gmail.com",
  },
  {
    id: "a1b2c3d4",
    amount: 50,
    status: "success",
    email: "success@example.com",
  },
  {
    id: "e5f6g7h8",
    amount: 75,
    status: "failed",
    email: "failed@example.com",
  },
  {
    id: "i9j0k1l2",
    amount: 200,
    status: "success",
    email: "buyer@nicodigos.com",
  },
  {
    id: "m3n4o5p6",
    amount: 320,
    status: "pending",
    email: "pending@shop.dev",
  },
  {
    id: "q7r8s9t0",
    amount: 15,
    status: "processing",
    email: "ops@example.org",
  },
  {
    id: "u1v2w3x4",
    amount: 99,
    status: "success",
    email: "paid@example.com",
  },
  {
    id: "y5z6a7b8",
    amount: 40,
    status: "failed",
    email: "retry@example.com",
  },
  {
    id: "c9d0e1f2",
    amount: 180,
    status: "pending",
    email: "cart@example.com",
  },
  {
    id: "g3h4i5j6",
    amount: 60,
    status: "success",
    email: "done@example.com",
  },
  {
    id: "k7l8m9n0",
    amount: 250,
    status: "processing",
    email: "queue@example.com",
  },
];

export default function PaymentsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Demo data table with sorting, filtering, pagination, and row
          selection.
        </p>
      </div>
      <DataTable
        columns={columns}
        data={payments}
        searchKey="email"
        searchPlaceholder="Filter emails..."
      />
    </div>
  );
}
