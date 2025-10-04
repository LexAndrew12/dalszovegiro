import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export interface DurationConfig {
  timeGridMinutes: number;
  services: string[];
  durations: Record<string, Record<string, Record<string, number>>>;
}

export interface BookingDto {
  id: string;
  start: number;
  end: number;
  services: string[];
  hairLength: string;
  hairDensity: string;
  name: string;
  phone: string;
  email?: string;
  cancelled: number;
  afterHours: number;
  adminOnly: number;
  cancellationToken?: string;
}

export interface BlockDto {
  id: string;
  start: number;
  end: number;
  reason?: string;
  adminOnly: number;
}

export interface AvailabilityResponse {
  availability: Record<string, { start: number; end: number; status: 'available' | 'booked' | 'blocked' }[]>;
  duration: number;
}

export async function fetchConfig() {
  const res = await api.get<{ config: DurationConfig }>('/config');
  return res.data.config;
}

export async function fetchAvailability(params: {
  weekStart: number;
  services: string[];
  hairLength: string;
  hairDensity: string;
}) {
  const res = await api.get<AvailabilityResponse>('/availability', {
    params: {
      weekStart: params.weekStart,
      services: params.services.join(','),
      hairLength: params.hairLength,
      hairDensity: params.hairDensity,
    },
  });
  return res.data;
}

export interface CreateBookingPayload {
  start: number;
  services: string[];
  hairLength: string;
  hairDensity: string;
  name: string;
  phone: string;
  email?: string;
}

export async function createBooking(payload: CreateBookingPayload) {
  const res = await api.post('/bookings', payload);
  return res.data as { id: string; start: number; end: number; duration: number; cancellationToken: string };
}

export async function getBookingByToken(token: string) {
  const res = await api.get<{ booking: BookingDto }>(`/bookings/${token}`);
  return res.data.booking;
}

export async function cancelBooking(token: string) {
  await api.post(`/bookings/${token}/cancel`);
}

export async function moveBooking(token: string, newStart: number) {
  await api.post(`/bookings/${token}/move`, { newStart });
}

export async function lookupBooking(phone: string, start: number) {
  const res = await api.post<{ booking: BookingDto }>('/bookings/lookup', { phone, start });
  return res.data.booking;
}

export async function adminLogin(payload: { email: string; password: string; remember: boolean }) {
  await api.post('/admin/login', payload);
}

export async function adminLogout() {
  await api.post('/admin/logout', {});
}

export async function fetchAdminSession() {
  const res = await api.get<{ admin: { email: string } }>('/admin/session');
  return res.data.admin;
}

export async function fetchAdminBookings(weekStart?: number) {
  const res = await api.get<{ bookings: BookingDto[] }>('/admin/bookings', {
    params: weekStart ? { weekStart } : undefined,
  });
  return res.data.bookings;
}

export async function createAdminBooking(payload: CreateBookingPayload & { adminOnly?: boolean }) {
  const res = await api.post<{ id: string }>('/admin/bookings', payload);
  return res.data.id;
}

export async function deleteAdminBooking(id: string) {
  await api.delete(`/admin/bookings/${id}`);
}

export async function createBlock(payload: { start: number; end: number; reason?: string; adminOnly?: boolean }) {
  const res = await api.post<{ id: string }>('/admin/blocks', payload);
  return res.data.id;
}

export async function deleteBlock(id: string) {
  await api.delete(`/admin/blocks/${id}`);
}

export async function fetchBlocks() {
  const res = await api.get<{ blocks: BlockDto[] }>('/admin/blocks');
  return res.data.blocks;
}

export async function fetchAdminAvailability(weekStart: number, duration: number) {
  const res = await api.get<{ availability: AvailabilityResponse['availability'] }>('/admin/availability', {
    params: { weekStart, duration },
  });
  return res.data.availability;
}

export async function updateDurationConfig(config: DurationConfig) {
  await api.put('/admin/duration-config', { config });
}

export async function fetchAdminConfig() {
  const res = await api.get<{ config: DurationConfig }>('/admin/duration-config');
  return res.data.config;
}

export async function fetchStats(weekStart?: number) {
  const res = await api.get<{ bookingCount: number; utilization: number; occupiedMinutes: number; serviceCount: Record<string, number> }>(
    '/admin/stats',
    {
      params: weekStart ? { weekStart } : undefined,
    },
  );
  return res.data;
}

export async function exportIcal() {
  const res = await api.get('/admin/export/ical', { responseType: 'blob' });
  return res.data as Blob;
}

export async function getGoogleExportLink() {
  const res = await api.get<{ url: string }>('/admin/export/google');
  return res.data.url;
}
