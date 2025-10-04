export interface Booking {
  id: string;
  start: number;
  end: number;
  services: string[];
  hairLength: string;
  hairDensity: string;
  name: string;
  phone: string;
  email?: string;
  createdAt: number;
  cancelled: number;
  cancellationToken?: string;
  afterHours: number;
  adminOnly: number;
  notes?: string;
}

export interface Block {
  id: string;
  start: number;
  end: number;
  reason?: string;
  adminOnly: number;
}

export interface DurationConfigPayload {
  timeGridMinutes: number;
  services: string[];
  durations: Record<string, Record<string, Record<string, number>>>;
}

export interface EmailQueueItem {
  id: string;
  bookingId: string;
  sendAt: number;
  type: 'confirmation' | 'reminder_24h' | 'reminder_1h';
  processed: number;
}
