import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import jsPDF from 'jspdf';

interface BookingState {
  booking: {
    id: string;
    start: number;
    end: number;
    duration: number;
    services: string[];
    hairLength: string;
    hairDensity: string;
    name: string;
    phone: string;
    email?: string;
    cancellationToken: string;
  };
}

const SummaryPage: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as BookingState | undefined;

  if (!state) {
    return (
      <main className="summary-page">
        <h1>Foglalás sikeres</h1>
        <p>A foglalás azonosítója: {id}</p>
        <p>Részletes összegzés az e-mailben található vagy a telefonos egyeztetés során kérhető.</p>
        <button onClick={() => navigate('/')}>Vissza a főoldalra</button>
      </main>
    );
  }

  const { booking } = state;
  const startDate = new Date(booking.start);
  const endDate = new Date(booking.end);

  const downloadPdf = () => {
    const doc = new jsPDF();
    doc.text('Foglalás összegzése', 10, 10);
    doc.text(`Név: ${booking.name}`, 10, 20);
    doc.text(`Telefonszám: ${booking.phone}`, 10, 30);
    if (booking.email) {
      doc.text(`E-mail: ${booking.email}`, 10, 40);
    }
    doc.text(`Szolgáltatások: ${booking.services.join(', ')}`, 10, 50);
    doc.text(`Hajhossz: ${booking.hairLength}`, 10, 60);
    doc.text(`Hajadússág: ${booking.hairDensity}`, 10, 70);
    doc.text(`Időpont: ${format(startDate, 'yyyy. MMMM d. HH:mm', { locale: hu })}`, 10, 80);
    doc.text(`Befejezés: ${format(endDate, 'HH:mm', { locale: hu })}`, 10, 90);
    doc.text('Helyszín: Budapest, Példa utca 1.', 10, 100);
    doc.save('foglalas.pdf');
  };

  return (
    <main className="summary-page">
      <h1>Foglalás sikeres</h1>
      <p>Köszönjük a foglalást, {booking.name}!</p>
      <div className="summary-card">
        <h2>Összegzés</h2>
        <ul>
          <li>Szolgáltatások: {booking.services.join(', ')}</li>
          <li>Hajhossz: {booking.hairLength}</li>
          <li>Hajadússág: {booking.hairDensity}</li>
          <li>Időpont: {format(startDate, 'yyyy. MMMM d. HH:mm', { locale: hu })}</li>
          <li>Befejezés: {format(endDate, 'HH:mm', { locale: hu })}</li>
          <li>Helyszín: Budapest, Példa utca 1.</li>
        </ul>
      </div>
      <p>Foglalás azonosító: {booking.id}</p>
      <p>Foglalás kezelése: {booking.cancellationToken ? `${window.location.origin}/modositas/${booking.cancellationToken}` : 'Telefonos egyeztetés szükséges.'}</p>
      <button onClick={downloadPdf}>Összegzés letöltése (PDF)</button>
      <button onClick={() => navigate('/')}>Vissza a főoldalra</button>
    </main>
  );
};

export default SummaryPage;
