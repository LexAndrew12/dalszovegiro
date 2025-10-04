import { dbPromise } from './db';
import { sendEmail } from './emailService';
import { EmailQueueItem } from './types';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';

export function startReminderWorker() {
  setInterval(async () => {
    try {
      const db = await dbPromise;
      const now = Date.now();
      const due: EmailQueueItem[] = await db.all(
        `SELECT email_queue.*, bookings.email, bookings.name, bookings.start, bookings.services, bookings.hairLength, bookings.hairDensity
         FROM email_queue
         JOIN bookings ON bookings.id = email_queue.bookingId
         WHERE email_queue.processed = 0 AND email_queue.sendAt <= ? AND bookings.email IS NOT NULL`,
        now,
      );
      for (const item of due) {
        const services = JSON.parse((item as any).services) as string[];
        const start = new Date((item as any).start);
        const formatted = format(start, "yyyy. MMMM d. HH:mm", { locale: hu });
        await sendEmail({
          to: (item as any).email,
          subject: item.type === 'confirmation' ? 'Foglalás megerősítése' : 'Emlékeztető: közelgő időpont',
          html: `
            <p>Kedves ${(item as any).name}!</p>
            <p>${item.type === 'confirmation' ? 'Köszönjük a foglalást.' : 'Emlékeztetünk a közelgő időpontodra.'}</p>
            <p>Szolgáltatások: ${services.join(', ')}</p>
            <p>Időpont: ${formatted}</p>
          `,
        });
        await db.run(`UPDATE email_queue SET processed = 1 WHERE id = ?`, item.id);
      }
    } catch (err) {
      console.error('Hiba az e-mail ütemezőben', err);
    }
  }, 60_000);
}
