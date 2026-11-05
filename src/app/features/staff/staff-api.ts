import { inject, Injectable } from '@angular/core';
import { Api } from '../../core/api/api.service';
import { Booking, BookingStatus, Session } from '../../core/models';

export interface Roster {
  session: Session;
  bookings: Booking[];
}

export interface StudentHit {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  plan: string | null;
}

export interface StaffBookingInput {
  userId?: number;
  name?: string;
  email?: string;
  phone?: string;
  payment: 'staff' | 'plan' | 'free';
  notes: string;
  force?: boolean;
}

export interface StaffPatch {
  status?: BookingStatus;
  sessionId?: number;
  notes?: string;
  name?: string;
  phone?: string;
}

/** Endpoints shared by coaches (own classes) and admins (all classes). */
@Injectable({ providedIn: 'root' })
export class StaffApi {
  private readonly api = inject(Api);

  mySessions(from: string, to: string) {
    return this.api.get<Session[]>('/coach/sessions', { from, to });
  }
  allSessions(from: string, to: string, coach?: number) {
    return this.api.get<Session[]>('/admin/sessions', { from, to, coach });
  }
  roster(sessionId: number) {
    return this.api.get<Roster>(`/staff/sessions/${sessionId}/roster`);
  }
  addBooking(sessionId: number, input: StaffBookingInput) {
    return this.api.post<Booking>(`/staff/sessions/${sessionId}/bookings`, input);
  }
  updateBooking(id: number, patch: StaffPatch) {
    return this.api.patch<Booking>(`/staff/bookings/${id}`, patch);
  }
  deleteBooking(id: number) {
    return this.api.delete<void>(`/staff/bookings/${id}`);
  }
  searchStudents(q: string) {
    return this.api.get<StudentHit[]>('/staff/students', { q });
  }
}
