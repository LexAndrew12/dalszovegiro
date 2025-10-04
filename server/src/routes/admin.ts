import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { dbPromise } from '../db';
import bcrypt from 'bcryptjs';
import { requireAdmin, signAdminToken, AuthenticatedRequest } from '../auth';
import { calculateTotalDuration, getAvailability, getDurationConfig, setDurationConfig } from '../availability';
import { nanoid } from 'nanoid';
import { isAfterHours } from '../timeUtils';
import { getSocket } from '../socket';
import { createEvents } from 'ics';

export const adminRouter = Router();

adminRouter.post(
  '/login',
  [body('email').isEmail(), body('password').isString(), body('remember').optional().isBoolean()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const db = await dbPromise;
    const user = await db.get(`SELECT * FROM admin_users WHERE email = ?`, req.body.email);
    if (!user) {
      return res.status(401).json({ message: 'Hibás belépési adatok.' });
    }
    const match = await bcrypt.compare(req.body.password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: 'Hibás belépési adatok.' });
    }
    const remember = Boolean(req.body.remember);
    const token = signAdminToken({ sub: user.id, email: user.email }, remember);
    res.cookie('admin_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : undefined,
    });
    res.json({ message: 'Sikeres bejelentkezés.' });
  },
);

adminRouter.post('/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ message: 'Kijelentkezve.' });
});

adminRouter.get('/session', requireAdmin, (req: AuthenticatedRequest, res) => {
  res.json({ admin: req.admin });
});

adminRouter.get(
  '/bookings',
  requireAdmin,
  [query('weekStart').optional().isInt()],
  async (req, res) => {
    const db = await dbPromise;
    let rows;
    if (req.query.weekStart) {
      const weekStart = Number(req.query.weekStart);
      const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
      rows = await db.all(
        `SELECT * FROM bookings WHERE start >= ? AND end <= ? ORDER BY start ASC`,
        weekStart,
        weekEnd,
      );
    } else {
      rows = await db.all(`SELECT * FROM bookings ORDER BY start DESC LIMIT 200`);
    }
    const parsed = rows.map((row: any) => ({ ...row, services: JSON.parse(row.services) }));
    res.json({ bookings: parsed });
  },
);

adminRouter.post(
  '/bookings',
  requireAdmin,
  [
    body('start').isInt(),
    body('services').isArray({ min: 1 }),
    body('hairLength').isString(),
    body('hairDensity').isString(),
    body('name').isString().notEmpty(),
    body('phone').isString().notEmpty(),
    body('email').optional().isEmail(),
    body('adminOnly').optional().isBoolean(),
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
    const adminOnly = Boolean(req.body.adminOnly);

    try {
      await db.run('BEGIN TRANSACTION');
      const overlapBooking = await db.get(
        `SELECT id FROM bookings WHERE cancelled = 0 AND start < ? AND end > ?`,
        end,
        start,
      );
      if (overlapBooking) {
        await db.run('ROLLBACK');
        return res.status(409).json({ message: 'Az időpont ütközik egy foglalással.' });
      }
      const overlapBlock = await db.get(
        `SELECT id FROM blocks WHERE start < ? AND end > ?`,
        end,
        start,
      );
      if (overlapBlock) {
        await db.run('ROLLBACK');
        return res.status(409).json({ message: 'Az időpont zárolva van.' });
      }
      const id = nanoid();
      const cancellationToken = nanoid(32);
      const createdAt = Date.now();
      const afterHours = isAfterHours(start, end) ? 1 : 0;
      await db.run(
        `INSERT INTO bookings (id, start, end, services, hairLength, hairDensity, name, phone, email, createdAt, cancellationToken, afterHours, adminOnly)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        afterHours,
        adminOnly ? 1 : 0,
      );
      await db.run('COMMIT');
      try {
        getSocket().emit('booking:created', { id, start, end });
      } catch (err) {
        console.warn('Socket értesítés nem sikerült', err);
      }
      res.json({ id });
    } catch (err) {
      await db.run('ROLLBACK');
      console.error(err);
      res.status(500).json({ message: 'Váratlan hiba történt.' });
    }
  },
);

adminRouter.delete('/bookings/:id', requireAdmin, async (req, res) => {
  const db = await dbPromise;
  await db.run(`UPDATE bookings SET cancelled = 1 WHERE id = ?`, req.params.id);
  try {
    getSocket().emit('booking:cancelled', { id: req.params.id });
  } catch (err) {
    console.warn('Socket értesítés nem sikerült', err);
  }
  res.json({ message: 'Foglalás törölve.' });
});

adminRouter.post(
  '/blocks',
  requireAdmin,
  [body('start').isInt(), body('end').isInt(), body('reason').optional().isString(), body('adminOnly').optional().isBoolean()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const db = await dbPromise;
    const start = Number(req.body.start);
    const end = Number(req.body.end);
    if (end <= start) {
      return res.status(400).json({ message: 'A zárási sáv vége későbbi kell legyen mint a kezdete.' });
    }
    const overlapBooking = await db.get(`SELECT id FROM bookings WHERE cancelled = 0 AND start < ? AND end > ?`, end, start);
    if (overlapBooking) {
      return res.status(409).json({ message: 'A sáv ütközik egy foglalással.' });
    }
    const overlapBlock = await db.get(`SELECT id FROM blocks WHERE start < ? AND end > ?`, end, start);
    if (overlapBlock) {
      return res.status(409).json({ message: 'A sáv már zárolt.' });
    }
    const id = nanoid();
    await db.run(
      `INSERT INTO blocks (id, start, end, reason, adminOnly) VALUES (?, ?, ?, ?, ?)`,
      id,
      start,
      end,
      req.body.reason || null,
      req.body.adminOnly ? 1 : 0,
    );
    try {
      getSocket().emit('block:created', { id, start, end });
    } catch (err) {
      console.warn('Socket értesítés nem sikerült', err);
    }
    res.json({ id });
  },
);

adminRouter.delete('/blocks/:id', requireAdmin, async (req, res) => {
  const db = await dbPromise;
  await db.run(`DELETE FROM blocks WHERE id = ?`, req.params.id);
  try {
    getSocket().emit('block:deleted', { id: req.params.id });
  } catch (err) {
    console.warn('Socket értesítés nem sikerült', err);
  }
  res.json({ message: 'Sáv feloldva.' });
});

adminRouter.get('/blocks', requireAdmin, async (_req, res) => {
  const db = await dbPromise;
  const rows = await db.all(`SELECT * FROM blocks ORDER BY start ASC`);
  res.json({ blocks: rows });
});

adminRouter.get('/duration-config', requireAdmin, async (_req, res) => {
  const config = await getDurationConfig();
  res.json({ config });
});

adminRouter.put(
  '/duration-config',
  requireAdmin,
  [body('config').isObject()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    await setDurationConfig(req.body.config);
    res.json({ message: 'Időtartam-mátrix frissítve.' });
  },
);

adminRouter.get('/stats', requireAdmin, [query('weekStart').optional().isInt()], async (req, res) => {
  const db = await dbPromise;
  const start = req.query.weekStart ? Number(req.query.weekStart) : Date.now();
  const end = start + 7 * 24 * 60 * 60 * 1000;
  const bookings = await db.all(
    `SELECT * FROM bookings WHERE cancelled = 0 AND start >= ? AND end <= ?`,
    start,
    end,
  );
  const occupiedMinutes = bookings.reduce((sum, b) => sum + (b.end - b.start) / 60000, 0);
  const serviceCount: Record<string, number> = {};
  for (const booking of bookings) {
    const services: string[] = JSON.parse(booking.services);
    for (const service of services) {
      serviceCount[service] = (serviceCount[service] || 0) + 1;
    }
  }
  res.json({
    bookingCount: bookings.length,
    utilization: occupiedMinutes / (5 * 7 * 60) || 0,
    occupiedMinutes,
    serviceCount,
  });
});

adminRouter.get('/export/ical', requireAdmin, async (_req, res) => {
  const db = await dbPromise;
  const bookings = await db.all(`SELECT * FROM bookings WHERE cancelled = 0 ORDER BY start ASC`);
  const events = bookings.map((booking: any) => {
    const startDate = new Date(booking.start);
    const endDate = new Date(booking.end);
    return {
      start: [
        startDate.getFullYear(),
        startDate.getMonth() + 1,
        startDate.getDate(),
        startDate.getHours(),
        startDate.getMinutes(),
      ],
      end: [
        endDate.getFullYear(),
        endDate.getMonth() + 1,
        endDate.getDate(),
        endDate.getHours(),
        endDate.getMinutes(),
      ],
      title: booking.name,
      description: `Szolgáltatások: ${JSON.parse(booking.services).join(', ')}`,
    };
  });
  const { error, value } = createEvents(events);
  if (error) {
    return res.status(500).json({ message: 'Nem sikerült az export.' });
  }
  res.setHeader('Content-Type', 'text/calendar');
  res.send(value);
});

adminRouter.get('/export/google', requireAdmin, async (_req, res) => {
  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const title = encodeURIComponent('Hajszalon időpont');
  res.json({ url: `${base}&text=${title}` });
});

adminRouter.get(
  '/availability',
  requireAdmin,
  [
    query('weekStart').isInt().toInt(),
    query('duration').isInt().toInt(),
  ],
  async (req, res) => {
    const availability = await getAvailability({
      weekStart: Number(req.query.weekStart),
      durationMinutes: Number(req.query.duration),
      includeAdminOnly: true,
    });
    res.json({ availability });
  },
);
