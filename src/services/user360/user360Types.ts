export interface OrderSummary {
  id: string;
  orderReference?: string;
  eventId?: string;
  eventName?: string;
  status: string;
  totalAmount: number | string;
  currency: string;
  createdAt?: string;
  paidAt?: string;
  cancelledAt?: string;
  refundedAt?: string;
}

export interface UserOrdersSummary {
  userEmail: string;
  totalOrders: number;
  paidOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  lifetimeGrossAmount: number | string;
  lifetimeNetAmount: number | string;
  averageOrderValue: number | string;
  firstOrderAt?: string;
  lastOrderAt?: string;
  currency: string;
  recentOrders: OrderSummary[];
}
