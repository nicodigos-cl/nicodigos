import type {
  DeliveryMethod,
  DeliveryStatus,
} from "@/lib/validations/deliveries";
import type { OrderStatus, PaymentStatus } from "@/lib/validations/orders";
import type { CustomerStatusTone } from "@/lib/customer-dashboard/status-tone";

export type { CustomerStatusTone };

export type CustomerOrderStatusView = {
  label: string;
  description: string;
  tone: CustomerStatusTone;
};

export type CustomerPaymentStatusView = {
  label: string;
  description: string;
  tone: CustomerStatusTone;
};

export type CustomerDeliveryStatusView = {
  label: string;
  description: string;
  tone: CustomerStatusTone;
};

export type CustomerSmmStatusView = {
  label: string;
  description: string;
  tone: CustomerStatusTone;
};

export type CustomerOrderAction =
  | { type: "PAY"; label: "Completar pago" | "Pagar ahora"; href: string }
  | { type: "RETRY_PAYMENT"; label: "Reintentar pago"; orderId: string; href: string }
  | { type: "REVIEW_PAYMENT"; label: "Revisar pago"; href: string }
  | { type: "VIEW"; label: "Ver pedido" | "Ver detalles"; href: string }
  | { type: "VIEW_DELIVERY"; label: "Ver entrega" | "Ver entregas"; href: string }
  | { type: "COMPLETE_INFO"; label: "Completar información"; href: string }
  | { type: "CONTACT_SUPPORT"; label: "Contactar soporte" | "Revisar problema"; href: string }
  | { type: "BUY_AGAIN"; label: "Comprar nuevamente"; orderId: string };

/** @deprecated Use CustomerOrderAction */
export type CustomerOrderPrimaryAction = CustomerOrderAction;

export type CustomerOrderDeliverySummaryView = {
  totalItems: number;
  deliveryCount: number;
  deliveredCount: number;
  processingCount: number;
  pendingCount: number;
  failedCount: number;
  canceledCount: number;
  label: string;
  tone: CustomerStatusTone;
  availableDeliveryId: string | null;
  failedDeliveryId: string | null;
};

export type CustomerOrderSummary = {
  id: string;
  number: string;
  status: OrderStatus;
  statusView: CustomerOrderStatusView;
  paymentStatus: PaymentStatus | null;
  paymentStatusView: CustomerPaymentStatusView | null;
  deliveryStatus: DeliveryStatus | null;
  deliveryStatusView: CustomerDeliveryStatusView | null;
  deliverySummary: CustomerOrderDeliverySummaryView;
  total: string;
  totalFormatted: string;
  currency: string;
  itemsCount: number;
  productNames: string[];
  productPreview: Array<{
    name: string;
    quantity: number;
    imageUrl: string | null;
  }>;
  updatedAt: string;
  createdAt: string;
  primaryAction: CustomerOrderAction;
};

export type CustomerDeliverySummary = {
  id: string;
  orderId: string;
  orderNumber: string;
  productName: string;
  deliveryMethod: DeliveryMethod;
  methodLabel: string;
  status: DeliveryStatus;
  statusView: CustomerDeliveryStatusView;
  createdAt: string;
  deliveredAt: string | null;
  primaryAction: {
    label: string;
    href: string;
  };
  smm: {
    hasTarget: boolean;
    quantity: number | null;
    startCount: number | null;
    remains: number | null;
    progressPercent: number | null;
    statusView: CustomerSmmStatusView;
  } | null;
  hasSecretsAvailable: boolean;
};

export type CustomerTransactionSummary = {
  id: string;
  orderId: string;
  orderNumber: string;
  status: PaymentStatus;
  statusView: CustomerPaymentStatusView;
  amount: string;
  currency: string;
  methodLabel: string;
  createdAt: string;
};

export type CustomerDashboardAlert =
  | {
      type: "PAYMENT_PENDING";
      tone: "warning";
      orderId: string;
      title: string;
      description: string;
      href: string;
      actionLabel: string;
    }
  | {
      type: "PAYMENT_REJECTED";
      tone: "danger";
      orderId: string;
      title: string;
      description: string;
      href: string;
      actionLabel: string;
    }
  | {
      type: "DELIVERY_AVAILABLE";
      tone: "success";
      deliveryId: string;
      title: string;
      description: string;
      href: string;
      actionLabel: string;
    }
  | {
      type: "SMM_TARGET_REQUIRED";
      tone: "warning";
      deliveryId: string;
      title: string;
      description: string;
      href: string;
      actionLabel: string;
    }
  | {
      type: "SMM_FAILED";
      tone: "danger";
      deliveryId: string;
      title: string;
      description: string;
      href: string;
      actionLabel: string;
    }
  | {
      type: "DELIVERY_FAILED";
      tone: "danger";
      deliveryId: string;
      title: string;
      description: string;
      href: string;
      actionLabel: string;
    }
  | {
      type: "REFUND_IN_PROGRESS";
      tone: "info";
      orderId: string;
      title: string;
      description: string;
      href: string;
      actionLabel: string;
    }
  | {
      type: "EMAIL_UNVERIFIED";
      tone: "warning";
      title: string;
      description: string;
      href: string;
      actionLabel: string;
    }
  | {
      type: "BILLING_INCOMPLETE";
      tone: "info";
      title: string;
      description: string;
      href: string;
      actionLabel: string;
    };

export type CustomerProfileCompleteness = {
  level: "complete" | "partial" | "missing";
  missing: string[];
  recommended: string[];
  emailVerified: boolean;
  name: string | null;
  email: string;
  phone: string | null;
  rut: string | null;
  invoiceType: "BOLETA" | "FACTURA";
  businessName: string | null;
  businessActivity: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  commune: string | null;
  city: string | null;
  region: string | null;
};

export type CustomerBuyAgainProduct = {
  productId: string;
  name: string;
  slug: string;
  price: string;
  currency: string;
  coverImageUrl: string | null;
  inStock: boolean;
};

export type CustomerDashboardMetrics = {
  orders: number;
  availableDeliveries: number;
  servicesInProgress: number;
  completedPurchases: number;
  totalSpent: string | null;
  totalSpentCurrency: string | null;
  lastPurchaseAt: string | null;
};

export type CustomerDashboardViewModel = {
  user: {
    id: string;
    name: string | null;
    email: string;
    emailVerified: boolean;
    image: string | null;
  };
  isNewCustomer: boolean;
  metrics: CustomerDashboardMetrics;
  alerts: CustomerDashboardAlert[];
  latestOrder: CustomerOrderSummary | null;
  recentOrders: CustomerOrderSummary[];
  deliveries: CustomerDeliverySummary[];
  transactions: CustomerTransactionSummary[];
  buyAgain: CustomerBuyAgainProduct[];
  profile: CustomerProfileCompleteness;
};

export type CustomerOrdersPageResult = {
  items: CustomerOrderSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  metrics: CustomerOrderMetrics;
};

export type CustomerDeliveriesPageResult = {
  items: CustomerDeliverySummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CustomerTransactionsPageResult = {
  items: CustomerTransactionSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CustomerOrderTimelineEventType =
  | "ORDER_CREATED"
  | "PAYMENT_PENDING"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_FAILED"
  | "ORDER_PROCESSING"
  | "DELIVERY_PROCESSING"
  | "DELIVERY_AVAILABLE"
  | "DELIVERY_FAILED"
  | "ORDER_COMPLETED"
  | "ORDER_CANCELLED"
  | "ORDER_REFUNDED";

export type CustomerOrderTimelineEvent = {
  id: string;
  type: CustomerOrderTimelineEventType;
  title: string;
  label: string;
  description: string | null;
  occurredAt: string;
  createdAt: string;
  tone: CustomerStatusTone;
};

export type CustomerOrderItemDetail = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  unitPriceFormatted: string;
  lineTotal: string;
  lineTotalFormatted: string;
  deliveryMethod: DeliveryMethod;
  methodLabel: string;
  imageUrl: string | null;
  productActive: boolean;
  productInStock: boolean;
  delivery: CustomerDeliverySummary | null;
  keysCount: number;
  keysPreview: Array<{ id: string; masked: string }>;
  smm: {
    hasTarget: boolean;
    targetAbbreviated: string | null;
    quantity: number | null;
    startCount: number | null;
    remains: number | null;
    progressPercent: number | null;
    statusView: CustomerSmmStatusView;
  } | null;
  deliveryErrorMessage: string | null;
};

export type CustomerOrderDetail = {
  id: string;
  number: string;
  status: OrderStatus;
  statusView: CustomerOrderStatusView;
  email: string;
  customerName: string | null;
  subtotal: string;
  subtotalFormatted: string;
  total: string;
  totalFormatted: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  deliverySummary: CustomerOrderDeliverySummaryView;
  payment: {
    id: string;
    status: PaymentStatus;
    statusView: CustomerPaymentStatusView;
    amount: string;
    amountFormatted: string;
    currency: string;
    methodLabel: string;
    paidAt: string | null;
    updatedAt: string;
    canPay: boolean;
    canRetry: boolean;
  } | null;
  items: CustomerOrderItemDetail[];
  timeline: CustomerOrderTimelineEvent[];
  primaryAction: CustomerOrderAction;
  availableActions: CustomerOrderAction[];
  canResendDeliveryEmail: boolean;
  canResendConfirmation: boolean;
  canBuyAgain: boolean;
  buyAgainProducts: CustomerBuyAgainProduct[];
};

export type CustomerOrderMetrics = {
  totalOrders: number;
  inProgress: number;
  availableDeliveries: number;
  needsAttention: number;
};

export type CustomerSessionSummary = {
  id: string;
  userAgentSummary: string;
  ipMasked: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  isCurrent: boolean;
  isExpired: boolean;
};

export type CustomerSecurityView = {
  email: string;
  emailVerified: boolean;
  hasPassword: boolean;
  providers: Array<{
    id: string;
    providerId: string;
    createdAt: string;
  }>;
  sessions: CustomerSessionSummary[];
};
