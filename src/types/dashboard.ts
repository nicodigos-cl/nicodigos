import type { AdminDashboardAlert } from "@/lib/dashboard/alerts";
import type {
  DashboardCountMetric,
  DashboardMoneyMetric,
} from "@/lib/dashboard/metrics";

export type DashboardPeriodDto = {
  preset: string;
  label: string;
  previousLabel: string;
  from: string;
  to: string;
  toInclusive: string;
  bucket: "hour" | "day" | "week";
};

export type DashboardSalesSeriesPoint = {
  key: string;
  label: string;
  gross: number;
  net: number;
  refunds: number;
  orders: number;
  previousNet: number | null;
};

export type DashboardFinanceSummary = {
  gross: DashboardMoneyMetric;
  refunds: DashboardMoneyMetric;
  net: DashboardMoneyMetric;
  estimatedCost: DashboardMoneyMetric;
  estimatedProfit: DashboardMoneyMetric;
  marginPercentage: number | null;
  costCoveragePercentage: number;
  costNote: string;
  eurClpRate: number | null;
};

export type DashboardStatusSlice = {
  status: string;
  label: string;
  count: number;
  href: string;
};

export type DashboardDeliveryMethodSlice = {
  method: string;
  label: string;
  sales: number;
  share: number;
  formattedSales: string;
};

export type DashboardInventoryHealth = {
  keysAvailable: number;
  keysReserved: number;
  keysSold: number;
  productsWithoutKeys: number;
  lowStockProducts: number;
  activeWithoutStock: number;
  activeManualProducts: number;
};

export type DashboardSmmSummary = {
  pending: number;
  processing: number;
  delivered: number;
  failed: number;
  canceled: number;
};

export type DashboardRecentOrder = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  email: string;
  total: number;
  currency: string;
  status: string;
  paymentStatus: string | null;
  deliveryStatuses: string[];
  createdAt: string;
};

export type DashboardRecentTransaction = {
  id: string;
  orderId: string;
  orderNumber: string;
  status: string;
  amount: number;
  currency: string;
  provider: string;
  createdAt: string;
  requiresReview: boolean;
};

export type DashboardPendingDelivery = {
  id: string;
  productName: string;
  orderId: string;
  orderNumber: string;
  method: string;
  status: string;
  customerEmail: string;
  createdAt: string;
  ageHours: number;
};

export type DashboardTopProduct = {
  productId: string;
  name: string;
  slug: string;
  deliveryMethod: string;
  quantitySold: number;
  revenue: number;
  currency: string;
  availableKeys: number | null;
  href: string;
};

export type DashboardActivityItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  href: string | null;
};

export type DashboardQuickAction = {
  href: string;
  label: string;
  description: string;
};

export type AdminDashboardDto = {
  period: DashboardPeriodDto;
  generatedAt: string;
  greetingName: string;
  currency: string;
  salesBasis: "net" | "gross";
  finance: DashboardFinanceSummary;
  metrics: {
    netSales: DashboardMoneyMetric;
    grossSales: DashboardMoneyMetric;
    refunds: DashboardMoneyMetric;
    estimatedCost: DashboardMoneyMetric;
    estimatedProfit: DashboardMoneyMetric;
    orders: DashboardCountMetric;
    averageTicket: DashboardMoneyMetric;
    buyers: DashboardCountMetric;
    approvedPayments: DashboardCountMetric;
    completedDeliveries: DashboardCountMetric;
  };
  operational: {
    pendingOrders: number;
    pendingPayments: number;
    failedPayments: number;
    pendingDeliveries: number;
    failedDeliveries: number;
    smmProcessing: number;
    smmFailed: number;
    pendingRefunds: number;
    requiresReview: number;
  };
  alerts: AdminDashboardAlert[];
  salesSeries: DashboardSalesSeriesPoint[];
  salesByDeliveryMethod: DashboardDeliveryMethodSlice[];
  orderStatuses: DashboardStatusSlice[];
  transactionStatuses: DashboardStatusSlice[];
  deliveryStatuses: DashboardStatusSlice[];
  inventory: DashboardInventoryHealth;
  smm: DashboardSmmSummary;
  recentOrders: DashboardRecentOrder[];
  recentTransactions: DashboardRecentTransaction[];
  pendingDeliveries: DashboardPendingDelivery[];
  topProducts: DashboardTopProduct[];
  activity: DashboardActivityItem[];
  quickActions: DashboardQuickAction[];
};
