import { inject, Injectable } from '@angular/core';
import { Api } from '../../core/api/api.service';
import { Booking, Discipline, Membership, Order, Paged, Plan, Role, Session, Template, User } from '../../core/models';

export interface Dashboard {
  revenueToday: number;
  revenueMonth: number;
  revenuePrevMonth: number;
  bookingsToday: number;
  occupancy7d: number;
  activeMembers: number;
  newStudents30d: number;
  pendingOrders: number;
  revenue30d: { date: string; amount: number; orders: number }[];
  byDiscipline: { name: string; bookings: number }[] | null;
}

export interface TemplateInput {
  disciplineId: number;
  coachId: number | null;
  weekday: number;
  startTime: string;
  capacity: number;
  active: boolean;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  url: string;
  audience: 'all' | 'students' | 'coaches';
  sentCount: number;
  createdAt: string;
  createdBy: string;
}

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly api = inject(Api);

  dashboard = () => this.api.get<Dashboard>('/admin/dashboard');

  // users
  users = (p: { q?: string; role?: Role | ''; active?: string; limit?: number; offset?: number }) => this.api.get<Paged<User>>('/admin/users', p);
  user = (id: number) => this.api.get<User>(`/admin/users/${id}`);
  createUser = (u: { email: string; password: string; fullName: string; phone: string; role: Role }) => this.api.post<User>('/admin/users', u);
  updateUser = (id: number, u: Partial<Pick<User, 'email' | 'fullName' | 'phone' | 'role' | 'active'>>) => this.api.patch<User>(`/admin/users/${id}`, u);
  setPassword = (id: number, password: string) => this.api.post<void>(`/admin/users/${id}/password`, { password });
  deleteUser = (id: number) => this.api.delete<void>(`/admin/users/${id}`);
  coaches = () => this.api.get<User[]>('/admin/coaches');

  // memberships
  memberships = (userId: number) => this.api.get<Membership[]>(`/admin/users/${userId}/memberships`);
  assignPlan = (userId: number, body: { planId: number; creditsLeft?: number; endsAt?: string }) =>
    this.api.post<Membership>(`/admin/users/${userId}/memberships`, body);
  adjustMembership = (id: number, body: { creditsLeft?: number; endsAt?: string; status?: string }) => this.api.patch<Membership>(`/admin/memberships/${id}`, body);

  // catalog
  disciplines = () => this.api.get<Discipline[]>('/admin/disciplines');
  saveDiscipline = (d: Partial<Discipline>) => (d.id ? this.api.put<Discipline>(`/admin/disciplines/${d.id}`, d) : this.api.post<Discipline>('/admin/disciplines', d));
  deleteDiscipline = (id: number) => this.api.delete<void>(`/admin/disciplines/${id}`);
  plans = () => this.api.get<Plan[]>('/admin/plans');
  savePlan = (p: Partial<Plan>) => (p.id ? this.api.put<Plan>(`/admin/plans/${p.id}`, p) : this.api.post<Plan>('/admin/plans', p));
  deletePlan = (id: number) => this.api.delete<void>(`/admin/plans/${id}`);

  // timetable & sessions
  templates = () => this.api.get<Template[]>('/admin/templates');
  createTemplate = (t: TemplateInput) => this.api.post<Template>('/admin/templates', t);
  updateTemplate = (id: number, t: TemplateInput) => this.api.put<{ template: Template; keptWithBookings: number }>(`/admin/templates/${id}`, t);
  deleteTemplate = (id: number) => this.api.delete<{ keptWithBookings: number }>(`/admin/templates/${id}`);
  generate = () => this.api.post<{ created: number }>('/admin/sessions/generate');
  sessions = (from: string, to: string, coach?: number) => this.api.get<Session[]>('/admin/sessions', { from, to, coach });
  createSession = (s: { disciplineId: number; coachId: number | null; date: string; start: string; capacity: number; note: string }) =>
    this.api.post<Session>('/admin/sessions', s);
  updateSession = (id: number, p: { coachId?: number; date?: string; start?: string; capacity?: number; note?: string }) =>
    this.api.patch<Session>(`/admin/sessions/${id}`, p);
  cancelSession = (id: number, reason: string) => this.api.post<{ cancelledBookings: number }>(`/admin/sessions/${id}/cancel`, { reason });

  // bookings & orders
  bookings = (p: { from?: string; to?: string; status?: string; q?: string; user?: number; limit?: number; offset?: number }) =>
    this.api.get<Paged<Booking>>('/admin/bookings', p);
  orders = (p: { status?: string; kind?: string; q?: string; user?: number; limit?: number; offset?: number }) => this.api.get<Paged<Order>>('/admin/orders', p);
  order = (id: number) => this.api.get<Order>(`/admin/orders/${id}`);
  refund = (id: number, note: string) => this.api.post<Order>(`/admin/orders/${id}/refund`, { note });

  // announcements
  announcements = () => this.api.get<Announcement[]>('/admin/announcements');
  announce = (a: { title: string; body: string; url: string; audience: string }) => this.api.post<{ sentCount: number }>('/admin/announcements', a);
}
