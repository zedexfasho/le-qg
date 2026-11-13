import type { OrderSource, OrderStatus, PaymentMethod } from "@/lib/orders";
import type { Drop, Product, Size } from "@/lib/types";

/** Formes des données renvoyées par l'API du dashboard */

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  mustChangePassword: boolean;
}

export interface OrderItem {
  id?: number;
  slug: string;
  name: string;
  category?: string | null;
  color: string;
  size: Size;
  qty: number;
  unitPrice: number;
  image?: string | null;
}

export interface Order {
  id: number;
  ref: string;
  status: OrderStatus;
  source: OrderSource;
  customerId: number | null;
  customerName: string | null;
  customerPhone: string | null;
  district: string | null;
  deliveryZone: string | null;
  deliveryFee: number;
  subtotal: number;
  total: number;
  paymentMethod: PaymentMethod | null;
  paid: boolean;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  items?: OrderItem[];
  itemCount?: number;
}

export interface OrderEvent {
  id: number;
  type: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus | null;
  note: string | null;
  user_name: string | null;
  created_at: string;
}

export interface OrderDetail {
  order: Order & { items: OrderItem[] };
  stock: { slug: string; color: string; size: Size; stock: number; issue: string | null }[];
  events: OrderEvent[];
  customer: (Customer & { orders_count: number }) | null;
}

export interface Customer {
  id: number;
  phone: string;
  name: string | null;
  district: string | null;
  zone: string | null;
  notes?: string | null;
  created_at: string;
  orders?: number;
  revenue?: number;
  last_order_at?: string | null;
}

export interface Shortage {
  slug: string;
  name: string;
  color: string;
  size: Size;
  requested: number;
  available: number;
}

export type AdminProduct = Product & { published: boolean; updatedAt: string };

/** Drop vu du dashboard : avec le nombre de produits rattachés */
export type AdminDrop = Drop & { products: number; publishedProducts: number };
