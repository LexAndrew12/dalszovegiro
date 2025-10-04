import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from './context/ConfigContext';
import { SocketProvider } from './context/SocketContext';
import BookingPage from './pages/BookingPage';
import SummaryPage from './pages/SummaryPage';
import ManageBookingPage from './pages/ManageBookingPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import CookieBanner from './components/CookieBanner';

const App: React.FC = () => {
  return (
    <ConfigProvider>
      <SocketProvider>
        <div className="app">
          <CookieBanner />
          <Routes>
            <Route path="/" element={<BookingPage />} />
            <Route path="/osszegzes/:id" element={<SummaryPage />} />
            <Route path="/modositas/:token" element={<ManageBookingPage />} />
            <Route path="/admin" element={<AdminLoginPage />} />
            <Route path="/admin/panel" element={<AdminDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </SocketProvider>
    </ConfigProvider>
  );
};

export default App;
