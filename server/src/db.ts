import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { defaultDurationMatrix } from './durationMatrixDefault';
import bcrypt from 'bcryptjs';

export type AppDatabase = Database<sqlite3.Database, sqlite3.Statement>;

const dataDir = path.join(__dirname, '..', 'data');
const dbFile = path.join(dataDir, 'app.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const dbPromise: Promise<AppDatabase> = open({
  filename: dbFile,
  driver: sqlite3.Database,
});

export async function initDb() {
  const db = await dbPromise;
  await db.exec('PRAGMA foreign_keys = ON');
  await db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      start INTEGER NOT NULL,
      end INTEGER NOT NULL,
      services TEXT NOT NULL,
      hairLength TEXT NOT NULL,
      hairDensity TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      createdAt INTEGER NOT NULL,
      cancelled INTEGER NOT NULL DEFAULT 0,
      cancellationToken TEXT,
      afterHours INTEGER NOT NULL DEFAULT 0,
      adminOnly INTEGER NOT NULL DEFAULT 0,
      notes TEXT
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS blocks (
      id TEXT PRIMARY KEY,
      start INTEGER NOT NULL,
      end INTEGER NOT NULL,
      reason TEXT,
      adminOnly INTEGER NOT NULL DEFAULT 0
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS duration_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payload TEXT NOT NULL
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS email_queue (
      id TEXT PRIMARY KEY,
      bookingId TEXT NOT NULL,
      sendAt INTEGER NOT NULL,
      type TEXT NOT NULL,
      processed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (bookingId) REFERENCES bookings(id) ON DELETE CASCADE
    );
  `);

  const durationRow = await db.get(`SELECT payload FROM duration_config WHERE id = 1`);
  if (!durationRow) {
    await db.run(`INSERT INTO duration_config (id, payload) VALUES (1, ?)`, JSON.stringify(defaultDurationMatrix));
  }

  const admin = await db.get(`SELECT id FROM admin_users LIMIT 1`);
  if (!admin) {
    const defaultEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = await bcrypt.hash(defaultPassword, 10);
    await db.run(`INSERT INTO admin_users (id, email, passwordHash) VALUES (?, ?, ?)`, 'admin-default', defaultEmail, hash);
    console.log(`Admin felhasználó létrehozva: ${defaultEmail} / ${defaultPassword}`);
  }
}
