import type {
  DeliveryMethod,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
} from "@/lib/validations/orders";

export type OrderListItemDto = {
  id: string;
  status: OrderStatus;
  email: string;
  customerName: string | null;
  subtotal: string;
  total: string;
  currency: string;
  itemsCount: number;
  userId: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
  latestPaymentStatus: PaymentStatus | null;
};

export type OrdersPageResult = {
  items: OrderListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type OrderItemDto = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string | null;
  coverImageUrl: string | null;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  deliveryMethod: DeliveryMethod;
  deliveryPromise: "INSTANT" | "DELAYED_12_24H" | "UNAVAILABLE" | null;
};

export type OrderPaymentDto = {
  id: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: string;
  currency: string;
  externalId: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderDetailDto = {
  id: string;
  status: OrderStatus;
  email: string;
  customerName: string | null;
  subtotal: string;
  total: string;
  currency: string;
  userId: string;
  userName: string;
  userEmail: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItemDto[];
  payments: OrderPaymentDto[];
  checkoutUrl: string;
  hasDelayedPromise: boolean;
};

export type OrderProductOptionDto = {
  id: string;
  name: string;
  slug: string;
  price: string;
  currency: string;
  coverImageUrl: string | null;
  deliveryMethod: DeliveryMethod;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
};

export type CartLineSmmDto = {
  link: string | null;
  username: string | null;
  quantity: number | null;
  comments: string | null;
  runs: number | null;
  intervalMinutes: number | null;
  usernames: string | null;
  hashtags: string | null;
  mediaUrl: string | null;
  min: number | null;
  max: number | null;
  delayMinutes: number | null;
  posts: number | null;
  oldPosts: number | null;
  expiry: string | null;
  answerNumber: string | null;
};

export type CartLineDto = {
  id: string;
  productId: string;
  quantity: number;
  productName: string;
  productSlug: string;
  unitPrice: string;
  currency: string;
  coverImageUrl: string | null;
  lineTotal: string;
  inStock: boolean;
  deliveryMethod: DeliveryMethod;
  deliveryPromise: "INSTANT" | "DELAYED_12_24H" | "UNAVAILABLE" | null;
  smmServiceType: string | null;
  smmMin: number | null;
  smmMax: number | null;
  smm: CartLineSmmDto | null;
  smmComplete: boolean;
};

export type CartDto = {
  id: string;
  items: CartLineDto[];
  subtotal: string;
  currency: string;
  itemsCount: number;
};
