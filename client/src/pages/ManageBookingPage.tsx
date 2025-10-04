import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addWeeks, format, parseISO, startOfWeek } from 'date-fns';
import { hu } from 'date-fns/locale';
import { cancelBooking, fetchAvailability, getBookingByToken, moveBooking } from '../api';
import { useConfig } from '../context/ConfigContext';

interface SlotItem {
  start: number;
  end: number;
  status: 'available' | 'booked' | 'blocked';
}

const ManageBookingPage: React.FC = () => {
  const { token } = useParams();
  const { config } = useConfig();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>();
  const [availability, setAvailability] = useState<Record<string, SlotItem[]>>({});
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await getBookingByToken(token);
        setBooking({ ...data, services: data.services });
      } catch (err: any) {
        setError(err.response?.data?.message || 'Nem található foglalás.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!booking || !config) return;
    loadAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking, weekStart, config]);

  const loadAvailability = async () => {
    if (!booking) return;
    const data = await fetchAvailability({
      weekStart: weekStart.getTime(),
      services: booking.services,
      hairLength: booking.hairLength,
      hairDensity: booking.hairDensity,
    });
    setAvailability(data.availability);
  };

  const handleCancel = async () => {
    if (!token) return;
    await cancelBooking(token);
    setSuccess('Foglalás lemondva.');
  };

  const handleMove = async (slot: SlotItem) => {
    if (!token) return;
    try {
      await moveBooking(token, slot.start);
      setSuccess('Foglalás módosítva.');
      await loadAvailability();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nem sikerült módosítani a foglalást.');
    }
  };

  const goToNextWeek = () => setWeekStart((prev) => addWeeks(prev, 1));
  const goToPrevWeek = () => setWeekStart((prev) => addWeeks(prev, -1));

  if (loading) {
    return <p>Betöltés...</p>;
  }

  if (error) {
    return (
      <main className="manage-page">
        <h1>Foglalás kezelése</h1>
        <p className="error">{error}</p>
        <button onClick={() => navigate('/')}>Vissza a főoldalra</button>
      </main>
    );
  }

  if (!booking) {
    return null;
  }

  return (
    <main className="manage-page">
      <h1>Foglalás kezelése</h1>
      {success && <p className="success">{success}</p>}
      <section className="summary-card">
        <h2>Jelenlegi adatok</h2>
        <ul>
          <li>Szolgáltatások: {booking.services.join(', ')}</li>
          <li>Hajhossz: {booking.hairLength}</li>
          <li>Hajadússág: {booking.hairDensity}</li>
          <li>Jelenlegi időpont: {format(new Date(booking.start), 'yyyy. MMMM d. HH:mm', { locale: hu })}</li>
        </ul>
      </section>
      <button className="cancel-button" onClick={handleCancel}>
        Foglalás lemondása
      </button>
      <section className="availability">
        <h2>Új időpont választása</h2>
        <div className="week-navigation">
          <button onClick={goToPrevWeek}>Előző hét</button>
          <span>{format(weekStart, 'yyyy. MMMM d.', { locale: hu })}</span>
          <button onClick={goToNextWeek}>Következő hét</button>
        </div>
        <div className="calendar-grid">
          {Object.entries(availability).map(([day, slots]) => {
            const header = format(parseISO(day), 'MMMM d. (EEEE)', { locale: hu });
            return (
              <div className="calendar-column" key={day}>
                <div className="calendar-column-header">{header}</div>
                <div className="calendar-column-slots">
                  {slots.map((slot) => (
                    <button
                      key={slot.start}
                      disabled={slot.status !== 'available'}
                      className={`slot slot-${slot.status}`}
                      onClick={() => handleMove(slot)}
                    >
                      {format(new Date(slot.start), 'HH:mm', { locale: hu })}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
};

export default ManageBookingPage;
