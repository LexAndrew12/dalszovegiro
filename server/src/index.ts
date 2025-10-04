import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import http from 'http';
import path from 'path';
import { initDb } from './db';
import { publicRouter } from './routes/public';
import { adminRouter } from './routes/admin';
import { initSocket } from './socket';
import { startReminderWorker } from './reminderService';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api', publicRouter);
app.use('/api/admin', adminRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);
initSocket(server);

const port = Number(process.env.PORT || 4000);

initDb().then(() => {
  server.listen(port, () => {
    console.log(`Szerver fut a ${port} porton`);
  });
  startReminderWorker();
});

const clientDir = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});
