// Shapes returned by the Go API (see backend/internal/*).

export type Role = 'admin' | 'coach' | 'student';

export interface User {
  id: number;
  email: string;
  fullName: string;
  phone: string;
  role: Role;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Discipline {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  short: string;
  description: string;
  durationMin: number;
  price: number;
  image: string;
  usesCredit: boolean;
  active: boolean;
  sort: number;
}

export interface Plan {
  id: number;
  slug: string;
  name: string;
  price: number;
  periodDays: number;
  credits: number | null; // null = unlimited
  bookingWindowDays: number;
  perks: string[];
  featured: boolean;
  sellable: boolean;
  active: boolean;
  sort: number;
}

export interface Template {
  id: number;
  disciplineId: number;
  discipline: string;
  coachId: number | null;
  coachName: string | null;
  weekday: number; // 1 = Monday
  startTime: string;
  capacity: number;
  active: boolean;
}

export interface Session {
  id: number;
  templateId: number | null;
  disciplineId: number;
  discipline: string;
  slug: string;
  price: number;
  usesCredit: boolean;
  coachId: number | null;
  coachName: string | null;
  startsAt: string;
  endsAt: string;
  date: string;
  start: string;
  end: string;
  capacity: number;
  taken: number;
  status: 'scheduled' | 'cancelled';
  note: string;
  bookedByMe: boolean;
}

export type BookingStatus = 'pending_payment' | 'confirmed' | 'cancelled' | 'attended' | 'no_show';
export type BookingPayment = 'free' | 'plan' | 'paid' | 'staff';

export interface Booking {
  id: number;
  code: string;
  sessionId: number;
  discipline: string;
  slug: string;
  coachName: string | null;
  startsAt: string;
  endsAt: string;
  date: string;
  start: string;
  end: string;
  userId: number | null;
  name: string;
  email: string;
  phone: string;
  status: BookingStatus;
  payment: BookingPayment;
  amount: number;
  membershipId: number | null;
  orderId: number | null;
  notes: string;
  cancelledAt: string | null;
  createdAt: string;
  canCancel: boolean;
  refundsCredit: boolean;
}

export interface Quote {
  payment: 'free' | 'plan' | 'paid';
  amount: number;
  reason: string;
}

export interface Membership {
  id: number;
  userId: number;
  planId: number | null;
  planName: string;
  creditsTotal: number | null;
  creditsLeft: number | null;
  startsAt: string;
  endsAt: string;
  status: 'active' | 'cancelled';
  orderId: number | null;
  createdAt: string;
}

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'refunded';

export interface Order {
  id: number;
  userId: number | null;
  kind: 'plan' | 'class';
  planId: number | null;
  bookingId: number | null;
  description: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  provider: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  detail?: Record<string, unknown>;
  paidAt: string | null;
  createdAt: string;
  bookingCode?: string;
}

export interface PayAction {
  kind: 'inline' | 'redirect' | 'form_post';
  url?: string;
  fields?: Record<string, string>;
}

export interface Checkout {
  order: Order;
  token: string;
  action: PayAction;
}

export interface Provider {
  name: 'fake' | 'webpay' | 'mercadopago';
  label: string;
}

export interface Contact {
  name: string;
  email: string;
  phone: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
}
