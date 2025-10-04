import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { calculateTotalDuration, getAvailability, getDurationConfig } from '../availability';
import { dbPromise } from '../db';
import { nanoid } from 'nanoid';
import { ensureTomorrowOrLater } from '../timeUtils';
import { sendEmail } from '../emailService';
import { getSocket } from '../socket';

export const publicRouter = Router();

publicRouter.get('/config', async (_req, res) => {
  const config = await getDurationConfig();
  res.json({ config });
});

publicRouter.get(
  '/availability',
  [
    query('weekStart').isInt().toInt(),
    query('services').isString(),
    query('hairLength').isString(),
    query('hairDensity').isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const config = await getDurationConfig();
    const services = String(req.query.services)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const duration = calculateTotalDuration(config, services, String(req.query.hairLength), String(req.query.hairDensity));
    const availability = await getAvailability({
      weekStart: Number(req.query.weekStart),
      durationMinutes: duration,
    });
    res.json({ availability, duration });
  },
);

publicRouter.post(
  '/bookings',
  [
    body('start').isInt(),
    body('services').isArray({ min: 1 }),
    body('hairLength').isString(),
    body('hairDensity').isString(),
    body('name').isString().notEmpty(),
    body('phone').isString().notEmpty(),
    body('email').optional().isEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const db = await dbPromise;
    const config = await getDurationConfig();
    const { services, hairLength, hairDensity, name, phone, email } = req.body;
    const start = Number(req.body.start);
    const duration = calculateTotalDuration(config, services, hairLength, hairDensity);
    const end = start + duration * 60_000;

    if (!ensureTomorrowOrLater(start)) {
      return res.status(400).json({ message: 'A legkorábbi foglalható időpont holnap.' });
    }

    const grid = config.timeGridMinutes;
    if ((start / 60_000) % grid !== 0) {
      return res.status(400).json({ message: 'Az időpontnak 15 perces rácshoz kell igazodnia.' });
    }

    try {
      await db.run('BEGIN TRANSACTION');
      const overlapBooking = await db.get(
        `SELECT id FROM bookings WHERE cancelled = 0 AND start < ? AND end > ?`,
        end,
        start,
      );
      if (overlapBooking) {
        await db.run('ROLLBACK');
        return res.status(409).json({ message: 'Ez az időpont időközben foglalt lett.' });
      }
      const overlapBlock = await db.get(
        `SELECT id FROM blocks WHERE start < ? AND end > ?`,
        end,
        start,
      );
      if (overlapBlock) {
        await db.run('ROLLBACK');
        return res.status(409).json({ message: 'Ez az időpont zárolva van.' });
      }
      const id = nanoid();
      const cancellationToken = nanoid(32);
      const createdAt = Date.now();
      await db.run(
        `INSERT INTO bookings (id, start, end, services, hairLength, hairDensity, name, phone, email, createdAt, cancellationToken, afterHours, adminOnly)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
        id,
        start,
        end,
        JSON.stringify(services),
        hairLength,
        hairDensity,
        name,
        phone,
        email || null,
        createdAt,
        cancellationToken,
      );
      if (email) {
        await sendEmail({
          to: email,
          subject: 'Foglalás megerősítése',
          html: `
            <p>Kedves ${name}!</p>
            <p>Időpontod sikeresen rögzítve ${new Date(start).toLocaleString('hu-HU')} időpontra.</p>
            <p>Szolgáltatások: ${services.join(', ')}</p>
            <p>A foglalás módosításához vagy lemondásához használd az alábbi hivatkozást:</p>
            <p><a href="${process.env.PUBLIC_BASE_URL || 'http://localhost:5173'}/modositas/${cancellationToken}">Foglalás kezelése</a></p>
          `,
        });
        const reminder24h = start - 24 * 60 * 60 * 1000;
        const reminder1h = start - 60 * 60 * 1000;
        await db.run(
          `INSERT INTO email_queue (id, bookingId, sendAt, type, processed) VALUES (?, ?, ?, ?, 0)`,
          nanoid(),
          id,
          reminder24h,
          'reminder_24h',
        );
        await db.run(
          `INSERT INTO email_queue (id, bookingId, sendAt, type, processed) VALUES (?, ?, ?, ?, 0)`,
          nanoid(),
          id,
          reminder1h,
          'reminder_1h',
        );
      }
      await db.run('COMMIT');
      try {
        getSocket().emit('booking:created', { id, start, end });
      } catch (err) {
        console.warn('Socket értesítés nem sikerült', err);
      }
      res.json({ id, start, end, duration, cancellationToken });
    } catch (err) {
      await db.run('ROLLBACK');
      console.error(err);
      res.status(500).json({ message: 'Váratlan hiba történt.' });
    }
  },
);

publicRouter.get('/bookings/:token', async (req, res) => {
  const db = await dbPromise;
  const booking = await db.get(`SELECT * FROM bookings WHERE cancellationToken = ? AND cancelled = 0`, req.params.token);
  if (!booking) {
    return res.status(404).json({ message: 'Foglalás nem található.' });
  }
  booking.services = JSON.parse(booking.services);
  res.json({ booking });
});

publicRouter.post('/bookings/:token/cancel', async (req, res) => {
  const db = await dbPromise;
  const booking = await db.get(`SELECT * FROM bookings WHERE cancellationToken = ? AND cancelled = 0`, req.params.token);
  if (!booking) {
    return res.status(404).json({ message: 'Foglalás nem található.' });
  }
  await db.run(`UPDATE bookings SET cancelled = 1 WHERE id = ?`, booking.id);
  try {
    getSocket().emit('booking:cancelled', { id: booking.id });
  } catch (err) {
    console.warn('Socket értesítés nem sikerült', err);
  }
  res.json({ message: 'Foglalás lemondva.' });
});

publicRouter.post(
  '/bookings/:token/move',
  [body('newStart').isInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const db = await dbPromise;
    const booking = await db.get(`SELECT * FROM bookings WHERE cancellationToken = ? AND cancelled = 0`, req.params.token);
    if (!booking) {
      return res.status(404).json({ message: 'Foglalás nem található.' });
    }
    const config = await getDurationConfig();
    const services = JSON.parse(booking.services) as string[];
    const duration = calculateTotalDuration(config, services, booking.hairLength, booking.hairDensity);
    const newStart = Number(req.body.newStart);
    const newEnd = newStart + duration * 60_000;
    if (!ensureTomorrowOrLater(newStart)) {
      return res.status(400).json({ message: 'Az új időpontnak holnaptól kell kezdődnie.' });
    }
    const grid = config.timeGridMinutes;
    if ((newStart / 60_000) % grid !== 0) {
      return res.status(400).json({ message: 'Az időpontnak 15 perces rácshoz kell igazodnia.' });
    }
    try {
      await db.run('BEGIN TRANSACTION');
      const overlapBooking = await db.get(
        `SELECT id FROM bookings WHERE cancelled = 0 AND id != ? AND start < ? AND end > ?`,
        booking.id,
        newEnd,
        newStart,
      );
      if (overlapBooking) {
        await db.run('ROLLBACK');
        return res.status(409).json({ message: 'Az új időpont foglalt.' });
      }
      const overlapBlock = await db.get(
        `SELECT id FROM blocks WHERE start < ? AND end > ?`,
        newEnd,
        newStart,
      );
      if (overlapBlock) {
        await db.run('ROLLBACK');
        return res.status(409).json({ message: 'Az új időpont zárolt.' });
      }
      await db.run(`UPDATE bookings SET start = ?, end = ? WHERE id = ?`, newStart, newEnd, booking.id);
      await db.run('COMMIT');
      try {
        getSocket().emit('booking:updated', { id: booking.id, start: newStart, end: newEnd });
      } catch (err) {
        console.warn('Socket értesítés nem sikerült', err);
      }
      res.json({ message: 'Foglalás módosítva.' });
    } catch (err) {
      await db.run('ROLLBACK');
      console.error(err);
      res.status(500).json({ message: 'Váratlan hiba történt.' });
    }
  },
);

publicRouter.post(
  '/bookings/lookup',
  [body('phone').isString().notEmpty(), body('start').isInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const db = await dbPromise;
  const booking = await db.get(
      `SELECT * FROM bookings WHERE phone = ? AND start = ? AND cancelled = 0`,
      req.body.phone,
      req.body.start,
    );
  if (!booking) {
    return res.status(404).json({ message: 'Foglalás nem található.' });
  }
  booking.services = JSON.parse(booking.services);
  res.json({ booking });
  },
);
