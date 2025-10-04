import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin, fetchAdminSession } from '../api';

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminSession()
      .then(() => navigate('/admin/panel'))
      .catch(() => undefined);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminLogin(form);
      navigate('/admin/panel');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Hibás belépési adatok.');
    }
  };

  return (
    <main className="admin-login">
      <form onSubmit={handleSubmit}>
        <h1>Bejelentkezés</h1>
        {error && <p className="error">{error}</p>}
        <label>
          E-mail
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>
          Jelszó
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.remember}
            onChange={(e) => setForm({ ...form, remember: e.target.checked })}
          />
          Emlékezzen rám
        </label>
        <button type="submit">Bejelentkezés</button>
      </form>
    </main>
  );
};

export default AdminLoginPage;
