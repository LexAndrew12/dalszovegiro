import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookingDto,
  DurationConfig,
  adminLogout,
  createAdminBooking,
  createBlock,
  deleteAdminBooking,
  deleteBlock,
  exportIcal,
  fetchAdminBookings,
  fetchAdminConfig,
  fetchAdminSession,
  fetchBlocks,
  fetchStats,
  getGoogleExportLink,
  updateDurationConfig,
} from '../api';
import { useConfig } from '../context/ConfigContext';
import { addWeeks, format, startOfWeek } from 'date-fns';
import { hu } from 'date-fns/locale';

const hairLengths = ['rövid', 'közép', 'hosszú', 'extra hosszú'];
const hairDensities = ['ritka', 'normál', 'dús', 'extra dús'];

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { config } = useConfig();
  const [sessionEmail, setSessionEmail] = useState<string>('');
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [bookingForm, setBookingForm] = useState({
    start: '',
    services: [] as string[],
    hairLength: 'közép',
    hairDensity: 'normál',
    name: '',
    phone: '',
    email: '',
    adminOnly: false,
  });
  const [blockForm, setBlockForm] = useState({ start: '', end: '', reason: '', adminOnly: false });
  const [durationJson, setDurationJson] = useState('');
  const [stats, setStats] = useState<{ bookingCount: number; utilization: number; occupiedMinutes: number; serviceCount: Record<string, number> }>();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const services = config?.services ?? [];

  useEffect(() => {
    fetchAdminSession()
      .then((admin) => {
        setSessionEmail(admin.email);
        loadData();
      })
      .catch(() => navigate('/admin'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    await Promise.all([loadBookings(), loadBlocks(), loadDurationConfig(), loadStats()]);
  };

  const loadBookings = async () => {
    const data = await fetchAdminBookings(weekStart.getTime());
    setBookings(data);
  };

  const loadBlocks = async () => {
    const data = await fetchBlocks();
    setBlocks(data);
  };

  const loadDurationConfig = async () => {
    const cfg = await fetchAdminConfig();
    setDurationJson(JSON.stringify(cfg, null, 2));
  };

  const loadStats = async () => {
    const data = await fetchStats(weekStart.getTime());
    setStats(data);
  };

  useEffect(() => {
    if (!sessionEmail) return;
    loadBookings();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  const toggleService = (service: string) => {
    setBookingForm((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }));
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const startTs = new Date(bookingForm.start).getTime();
      if (Number.isNaN(startTs)) {
        throw new Error('Érvénytelen kezdőidő.');
      }
      if (bookingForm.services.length === 0) {
        throw new Error('Válassz legalább egy szolgáltatást.');
      }
      if (!bookingForm.name || !bookingForm.phone) {
        throw new Error('Név és telefonszám kötelező.');
      }
      await createAdminBooking({
        start: startTs,
        services: bookingForm.services,
        hairLength: bookingForm.hairLength,
        hairDensity: bookingForm.hairDensity,
        name: bookingForm.name,
        phone: bookingForm.phone,
        email: bookingForm.email || undefined,
        adminOnly: bookingForm.adminOnly,
      });
      setMessage('Foglalás hozzáadva.');
      setBookingForm((prev) => ({ ...prev, name: '', phone: '', email: '', start: '' }));
      await loadBookings();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Hiba történt.');
    }
  };

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const startTs = new Date(blockForm.start).getTime();
      const endTs = new Date(blockForm.end).getTime();
      if (Number.isNaN(startTs) || Number.isNaN(endTs)) {
        throw new Error('Érvénytelen időpont.');
      }
      await createBlock({ start: startTs, end: endTs, reason: blockForm.reason, adminOnly: blockForm.adminOnly });
      setMessage('Sáv zárolva.');
      setBlockForm({ start: '', end: '', reason: '', adminOnly: false });
      await loadBlocks();
      await loadBookings();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Hiba történt.');
    }
  };

  const handleDeleteBooking = async (id: string) => {
    await deleteAdminBooking(id);
    await loadBookings();
  };

  const handleDeleteBlock = async (id: string) => {
    await deleteBlock(id);
    await loadBlocks();
  };

  const handleDurationSave = async () => {
    setError(null);
    setMessage(null);
    try {
      const parsed = JSON.parse(durationJson) as DurationConfig;
      await updateDurationConfig(parsed);
      setMessage('Időtartam-mátrix frissítve.');
    } catch (err: any) {
      setError(err.message || 'Érvénytelen JSON.');
    }
  };

  const handleExportIcal = async () => {
    const blob = await exportIcal();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'naptar.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGoogleLink = async () => {
    const url = await getGoogleExportLink();
    window.open(url, '_blank');
  };

  const handleLogout = async () => {
    await adminLogout();
    navigate('/admin');
  };

  const goToNextWeek = () => setWeekStart((prev) => addWeeks(prev, 1));
  const goToPrevWeek = () => setWeekStart((prev) => addWeeks(prev, -1));

  return (
    <main className="admin-dashboard">
      <header className="admin-header">
        <h1>Admin vezérlőpult</h1>
        <div>
          <span>{sessionEmail}</span>
          <button onClick={handleLogout}>Kijelentkezés</button>
        </div>
      </header>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <section className="admin-section">
        <h2>Foglalások</h2>
        <div className="week-navigation">
          <button onClick={goToPrevWeek}>Előző hét</button>
          <span>{format(weekStart, 'yyyy. MMMM d.', { locale: hu })}</span>
          <button onClick={goToNextWeek}>Következő hét</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Név</th>
              <th>Szolgáltatások</th>
              <th>Időpont</th>
              <th>E-mail</th>
              <th>Telefonszám</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id} className={booking.adminOnly ? 'admin-only' : ''}>
                <td>{booking.name}</td>
                <td>{booking.services.join(', ')}</td>
                <td>{format(new Date(booking.start), 'yyyy. MMMM d. HH:mm', { locale: hu })}</td>
                <td>{booking.email || '-'}</td>
                <td>{booking.phone}</td>
                <td>
                  <button onClick={() => handleDeleteBooking(booking.id)}>Törlés</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="admin-section">
        <h2>Új foglalás felvétele</h2>
        <form onSubmit={handleBookingSubmit} className="admin-form">
          <label>
            Kezdés (dátum és idő)
            <input type="datetime-local" value={bookingForm.start} onChange={(e) => setBookingForm((prev) => ({ ...prev, start: e.target.value }))} />
          </label>
          <div className="checkbox-group">
            {services.map((service) => (
              <label key={service} className={`checkbox ${bookingForm.services.includes(service) ? 'selected' : ''}`}>
                <input type="checkbox" checked={bookingForm.services.includes(service)} onChange={() => toggleService(service)} />
                {service}
              </label>
            ))}
          </div>
          <div className="radio-group">
            {hairLengths.map((length) => (
              <label key={length} className={`radio ${bookingForm.hairLength === length ? 'selected' : ''}`}>
                <input type="radio" checked={bookingForm.hairLength === length} onChange={() => setBookingForm((prev) => ({ ...prev, hairLength: length }))} />
                {length}
              </label>
            ))}
          </div>
          <div className="radio-group">
            {hairDensities.map((density) => (
              <label key={density} className={`radio ${bookingForm.hairDensity === density ? 'selected' : ''}`}>
                <input type="radio" checked={bookingForm.hairDensity === density} onChange={() => setBookingForm((prev) => ({ ...prev, hairDensity: density }))} />
                {density}
              </label>
            ))}
          </div>
          <label>
            Név
            <input value={bookingForm.name} onChange={(e) => setBookingForm((prev) => ({ ...prev, name: e.target.value }))} />
          </label>
          <label>
            Telefonszám
            <input value={bookingForm.phone} onChange={(e) => setBookingForm((prev) => ({ ...prev, phone: e.target.value }))} />
          </label>
          <label>
            E-mail
            <input value={bookingForm.email} onChange={(e) => setBookingForm((prev) => ({ ...prev, email: e.target.value }))} />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={bookingForm.adminOnly}
              onChange={(e) => setBookingForm((prev) => ({ ...prev, adminOnly: e.target.checked }))}
            />
            Utólagos időpont (admin)
          </label>
          <button type="submit">Foglalás mentése</button>
        </form>
      </section>

      <section className="admin-section">
        <h2>Sáv zárolása</h2>
        <form onSubmit={handleBlockSubmit} className="admin-form">
          <label>
            Kezdés
            <input type="datetime-local" value={blockForm.start} onChange={(e) => setBlockForm({ ...blockForm, start: e.target.value })} />
          </label>
          <label>
            Vég
            <input type="datetime-local" value={blockForm.end} onChange={(e) => setBlockForm({ ...blockForm, end: e.target.value })} />
          </label>
          <label>
            Megjegyzés
            <input value={blockForm.reason} onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })} />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={blockForm.adminOnly}
              onChange={(e) => setBlockForm({ ...blockForm, adminOnly: e.target.checked })}
            />
            Csak admin számára látható
          </label>
          <button type="submit">Sáv zárolása</button>
        </form>
        <table>
          <thead>
            <tr>
              <th>Kezdés</th>
              <th>Vég</th>
              <th>Megjegyzés</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((block) => (
              <tr key={block.id}>
                <td>{format(new Date(block.start), 'yyyy. MMMM d. HH:mm', { locale: hu })}</td>
                <td>{format(new Date(block.end), 'yyyy. MMMM d. HH:mm', { locale: hu })}</td>
                <td>{block.reason || '-'}</td>
                <td>
                  <button onClick={() => handleDeleteBlock(block.id)}>Feloldás</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="admin-section">
        <h2>Időtartam-mátrix szerkesztése</h2>
        <textarea value={durationJson} onChange={(e) => setDurationJson(e.target.value)} rows={20} />
        <button onClick={handleDurationSave}>Időtartam-mátrix mentése</button>
      </section>

      <section className="admin-section">
        <h2>Statisztika</h2>
        {stats && (
          <div className="stats">
            <p>Heti foglalásszám: {stats.bookingCount}</p>
            <p>Kihasználtság: {(stats.utilization * 100).toFixed(1)}%</p>
            <p>Foglalt percek: {stats.occupiedMinutes}</p>
            <h3>Legnépszerűbb szolgáltatások</h3>
            <ul>
              {Object.entries(stats.serviceCount).map(([service, count]) => (
                <li key={service}>
                  {service}: {count}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="admin-section">
        <h2>Export</h2>
        <div className="export-buttons">
          <button onClick={handleExportIcal}>Export: iCal</button>
          <button onClick={handleGoogleLink}>Export: Google</button>
        </div>
      </section>
    </main>
  );
};

export default AdminDashboard;
