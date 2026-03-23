import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', branchName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async () => {
    setError('');
    if (!form.email || !form.password) { setError('Email and password required'); return; }
    if (isRegister && !form.name) { setError('Name is required'); return; }
    setLoading(true);
    try {
      if (isRegister) {
        const { authAPI } = await import('../services/api');
        const res = await authAPI.register(form);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        navigate('/manager');
      } else {
        await login(form.email, form.password);
        navigate('/manager');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>🍽️</div>
        <h1 style={styles.title}>La Maison</h1>
        <p style={styles.sub}>{isRegister ? 'Create your manager account' : 'Manager Portal — Sign In'}</p>

        {error && <div style={styles.errorBox}>{error}</div>}

        {isRegister && (
          <>
            <div style={styles.fgroup}>
              <label style={styles.label}>Your Name</label>
              <input style={styles.input} type="text" placeholder="e.g. Sameer Rana" value={form.name} onChange={set('name')} />
            </div>
            <div style={styles.fgroup}>
              <label style={styles.label}>Restaurant Name</label>
              <input style={styles.input} type="text" placeholder="e.g. La Maison Nagpur" value={form.branchName} onChange={set('branchName')} />
            </div>
          </>
        )}

        <div style={styles.fgroup}>
          <label style={styles.label}>Email</label>
          <input style={styles.input} type="email" placeholder="manager@restaurant.com" value={form.email} onChange={set('email')} />
        </div>
        <div style={styles.fgroup}>
          <label style={styles.label}>Password</label>
          <input style={styles.input} type="password" placeholder="••••••••" value={form.password} onChange={set('password')}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
        </div>

        <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>
          {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In →'}
        </button>

        <p style={styles.toggle}>
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <span style={styles.toggleLink} onClick={() => { setIsRegister(!isRegister); setError(''); }}>
            {isRegister ? 'Sign In' : 'Register'}
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#0e1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", padding: 24 },
  card: { background: '#151b22', border: '1px solid #253040', borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 420 },
  logo: { fontSize: 44, textAlign: 'center', marginBottom: 12 },
  title: { fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#e8c97a', textAlign: 'center', margin: '0 0 6px' },
  sub: { fontSize: 13, color: '#637080', textAlign: 'center', margin: '0 0 28px' },
  errorBox: { background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#e74c3c', marginBottom: 20 },
  fgroup: { marginBottom: 18 },
  label: { display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', color: '#637080', marginBottom: 8 },
  input: { width: '100%', padding: '13px 16px', border: '1.5px solid #253040', borderRadius: 10, fontFamily: "'Outfit', sans-serif", fontSize: 15, color: '#dde3ec', background: '#1c2330', outline: 'none', boxSizing: 'border-box' },
  btn: { width: '100%', padding: 15, background: 'linear-gradient(135deg, #2e7d52, #4caf7d)', color: 'white', border: 'none', borderRadius: 12, fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  toggle: { textAlign: 'center', fontSize: 13, color: '#637080', marginTop: 20 },
  toggleLink: { color: '#e8c97a', cursor: 'pointer', fontWeight: 600 },
};
