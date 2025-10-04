import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays, addWeeks, format, isBefore, parseISO, startOfDay, startOfWeek } from 'date-fns';
import { hu } from 'date-fns/locale';
import { useConfig } from '../context/ConfigContext';
import { createBooking, fetchAvailability } from '../api';
import { useSocket } from '../context/SocketContext';

const hairLengths = ['rövid', 'közép', 'hosszú', 'extra hosszú'];
const hairDensities = ['ritka', 'normál', 'dús', 'extra dús'];

interface SlotItem {
  start: number;
  end: number;
  status: 'available' | 'booked' | 'blocked';
}

const BookingPage: React.FC = () => {
  const navigate = useNavigate();
  const { config, loading } = useConfig();
  const socket = useSocket();
  const tomorrow = useMemo(() => addDays(startOfDay(new Date()), 1), []);
  const initialWeekStart = useMemo(
    () => startOfWeek(tomorrow, { weekStartsOn: 1 }),
    [tomorrow],
  );

  const [weekStart, setWeekStart] = useState<Date>(initialWeekStart);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [hairLength, setHairLength] = useState<string>('közép');
  const [hairDensity, setHairDensity] = useState<string>('normál');
  const [availability, setAvailability] = useState<Record<string, SlotItem[]>>({});
  const [duration, setDuration] = useState<number>(0);
  const [formState, setFormState] = useState({ name: '', phone: '', email: '' });
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotItem | null>(null);

  const services = config?.services ?? [];

  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      refreshAvailability();
    };
    socket.on('booking:created', handler);
    socket.on('booking:updated', handler);
    socket.on('booking:cancelled', handler);
    socket.on('block:created', handler);
    socket.on('block:deleted', handler);
    return () => {
      socket.off('booking:created', handler);
      socket.off('booking:updated', handler);
      socket.off('booking:cancelled', handler);
      socket.off('block:created', handler);
      socket.off('block:deleted', handler);
    };
  }, [socket, weekStart, selectedServices, hairLength, hairDensity]);

  useEffect(() => {
    refreshAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, selectedServices, hairLength, hairDensity, config]);

  const refreshAvailability = async () => {
    if (!config || selectedServices.length === 0) {
      setAvailability({});
      setDuration(0);
      setSelectedSlot(null);
      return;
    }
    setLoadingSlots(true);
    setError(null);
    try {
      const data = await fetchAvailability({
        weekStart: weekStart.getTime(),
        services: selectedServices,
        hairLength,
        hairDensity,
      });
      setAvailability(data.availability);
      setDuration(data.duration);
      setSelectedSlot(null);
    } catch (err) {
      setError('Nem sikerült betölteni a szabad időpontokat.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service],
    );
  };

  const handleBook = async () => {
    if (!selectedSlot) {
      return;
    }
    try {
      const response = await createBooking({
        start: selectedSlot.start,
        services: selectedServices,
        hairLength,
        hairDensity,
        name: formState.name,
        phone: formState.phone,
        email: formState.email || undefined,
      });
      navigate(`/osszegzes/${response.id}`, {
        state: {
          booking: {
            id: response.id,
            start: response.start,
            end: response.end,
            duration: response.duration,
            services: selectedServices,
            hairLength,
            hairDensity,
            name: formState.name,
            phone: formState.phone,
            email: formState.email,
            cancellationToken: response.cancellationToken,
          },
        },
      });
      setSelectedSlot(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nem sikerült létrehozni a foglalást.');
    }
  };

  const canSubmit =
    formState.name.trim() !== '' &&
    formState.phone.trim() !== '' &&
    selectedServices.length > 0 &&
    duration > 0;

  const goToNextWeek = () => setWeekStart((prev) => addWeeks(prev, 1));
  const goToPrevWeek = () => {
    const newWeek = addWeeks(weekStart, -1);
    if (!isBefore(newWeek, initialWeekStart)) {
      setWeekStart(newWeek);
    }
  };

  const renderSlots = () => {
    if (!config || selectedServices.length === 0) {
      return <p>Válassz szolgáltatásokat a szabad időpontok megjelenítéséhez.</p>;
    }
    if (loadingSlots) {
      return <p>Betöltés...</p>;
    }
    const entries = Object.entries(availability);
    if (entries.length === 0) {
      return <p>Nincs elérhető időpont a kiválasztott héten.</p>;
    }
    return (
      <div className="calendar-grid">
        {entries.map(([day, slots]) => {
          const date = parseISO(day);
          const header = format(date, 'MMMM d. (EEEE)', { locale: hu });
          return (
            <div className="calendar-column" key={day}>
              <div className="calendar-column-header">{header}</div>
              <div className="calendar-column-slots">
                {slots.map((slot) => {
                  const slotStart = new Date(slot.start);
                  if (isBefore(slotStart, tomorrow)) {
                    return null;
                  }
                  const label = format(slotStart, 'HH:mm', { locale: hu });
                  const isSelected = selectedSlot?.start === slot.start;
                  return (
                    <button
                      key={slot.start}
                      type="button"
                      disabled={slot.status !== 'available'}
                      className={`slot slot-${slot.status} ${isSelected ? 'selected-slot' : ''}`}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <main className="booking-page">
      <header>
        <h1>Online időpontfoglalás</h1>
        <p>Heti nézet</p>
        <div className="week-navigation">
          <button onClick={goToPrevWeek} disabled={isBefore(addWeeks(weekStart, -1), initialWeekStart)}>
            Előző hét
          </button>
          <span>{format(weekStart, 'yyyy. MMMM d.', { locale: hu })}</span>
          <button onClick={goToNextWeek}>Következő hét</button>
        </div>
      </header>

      {loading && <p>Betöltés...</p>}
      {error && <p className="error">{error}</p>}

      {config && (
        <section className="booking-form">
          <div className="form-section">
            <h2>Szolgáltatás kiválasztása</h2>
            <div className="checkbox-group">
              {services.map((service) => (
                <label key={service} className={`checkbox ${selectedServices.includes(service) ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(service)}
                    onChange={() => toggleService(service)}
                  />
                  {service}
                </label>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h2>Hajhossz</h2>
            <div className="radio-group">
              {hairLengths.map((length) => (
                <label key={length} className={`radio ${hairLength === length ? 'selected' : ''}`}>
                  <input type="radio" checked={hairLength === length} onChange={() => setHairLength(length)} />
                  {length}
                </label>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h2>Hajadússág</h2>
            <div className="radio-group">
              {hairDensities.map((density) => (
                <label key={density} className={`radio ${hairDensity === density ? 'selected' : ''}`}>
                  <input type="radio" checked={hairDensity === density} onChange={() => setHairDensity(density)} />
                  {density}
                </label>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h2>Kapcsolattartási adatok</h2>
            <label>
              Név (kötelező)
              <input value={formState.name} onChange={(e) => setFormState({ ...formState, name: e.target.value })} />
            </label>
            <label>
              Telefonszám (kötelező)
              <input value={formState.phone} onChange={(e) => setFormState({ ...formState, phone: e.target.value })} />
            </label>
            <label>
              E-mail (opcionális)
              <input value={formState.email} onChange={(e) => setFormState({ ...formState, email: e.target.value })} />
              <small>Ha szeretnél 1 nappal és 1 órával a foglalás előtt emlékeztetőt kapni, add meg az e-mail címedet.</small>
            </label>
          </div>
        </section>
      )}

      <section className="legend">
        <span className="legend-item"><span className="dot dot-available" /> Szabad időpontok (zöld)</span>
        <span className="legend-item"><span className="dot dot-booked" /> Foglalt (piros)</span>
        <span className="legend-item"><span className="dot dot-blocked" /> Zárolt (szürke)</span>
      </section>

      <section className="availability">
        <h2>Szabad időpontok</h2>
        {renderSlots()}
      </section>

      <section className="confirmation">
        <p>Foglalás megerősítése előtt válassz szolgáltatást, add meg adataid és kattints a kívánt időpontra.</p>
        <button
          className="confirm-button"
          disabled={!canSubmit || !selectedSlot}
          onClick={handleBook}
        >
          Foglalás megerősítése
        </button>
        <p>Aznapra nem foglalhatsz, a legkorábbi dátum {format(tomorrow, 'yyyy. MMMM d.', { locale: hu })}.</p>
      </section>
    </main>
  );
};

export default BookingPage;
