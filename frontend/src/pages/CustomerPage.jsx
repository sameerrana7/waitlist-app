import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { queueAPI } from '../services/api';

const BRANCH_ID = process.env.REACT_APP_BRANCH_ID || 'default';

export default function CustomerPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [queueStatus, setQueueStatus] = useState({ waiting: 0, estimatedWait: '< 5' });
  const [errors, setErrors] = useState({});

  // Live queue status from Firebase
  useEffect(() => {
    const waitlistRef = ref(db, `waitlist/${BRANCH_ID}`);
    const unsub = onValue(waitlistRef, (snap) => {
      const data = snap.val() || {};
      const waiting = Object.values(data).filter((g) => g.status === 'waiting').length;
      setQueueStatus({
        waiting,
        estimatedWait: waiting === 0 ? '< 5' : String(waiting * 12),
      });
    });
    return () => unsub();
  }, []);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Please enter your name';
    if (!phone.trim() || phone.replace(/\D/g, '').length < 8) e.phone = 'Enter a valid phone number';
    if (!partySize) e.partySize = 'Please select party size';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleJoin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await queueAPI.join({ name, phone, partySize, branchId: BRANCH_ID });
      setSubmitted(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setName(''); setPhone(''); setPartySize(0);
    setErrors({}); setSubmitted(null);
  };

  const partySizes = [1, 2, 3, 4, 5, 6];

  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✓</div>
          <h2 style={styles.successTitle}>You're on the list!</h2>
          <p style={styles.successSub}>Your waiting number is</p>
          <div style={styles.tokenBox}>{submitted.token}</div>
          <div style={styles.detailBox}>
            {[
              ['Name', submitted.name],
              ['Party Size', `${submitted.partySize} ${submitted.partySize === 1 ? 'person' : 'people'}`],
              ['Phone', submitted.phone],
              ['Est. Wait', `${submitted.estimatedWait} mins`],
              ['Position', `#${submitted.position} in line`],
            ].map(([k, v]) => (
              <div key={k} style={styles.detailRow}>
                <span style={styles.detailKey}>{k}</span>
                <span style={styles.detailVal}>{v}</span>
              </div>
            ))}
          </div>
          <div style={styles.notice}>
            📢 <strong>Please stay near the entrance.</strong><br />
            Listen for your number to be called.
          </div>
          <button style={styles.btnSecondary} onClick={handleReset}>
            ← Register another guest
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Brand */}
      <div style={styles.brand}>
        <div style={styles.brandBadge}>
          <span style={styles.liveDot} /> Waitlist Open
        </div>
        <div style={styles.logoWrap}>🍽️</div>
        <h1 style={styles.brandName}>La Maison</h1>
        <p style={styles.brandTagline}>Fine dining, worth the wait.</p>
      </div>

      {/* Live Status Strip */}
      <div style={styles.strip}>
        <div style={styles.stripCard}>
          <div style={styles.stripVal}>{queueStatus.waiting}</div>
          <div style={styles.stripLbl}>Groups Waiting</div>
        </div>
        <div style={styles.stripCard}>
          <div style={styles.stripVal}>~{queueStatus.estimatedWait}</div>
          <div style={styles.stripLbl}>Est. Wait (min)</div>
        </div>
      </div>

      {/* Form */}
      <div style={styles.card}>
        <h2 style={styles.formTitle}>Join the Waitlist</h2>
        <p style={styles.formSub}>Enter your details and we'll call your number when ready.</p>

        <div style={styles.fgroup}>
          <label style={styles.flabel}>Your Name</label>
          <input
            style={{ ...styles.finput, ...(errors.name ? styles.finputErr : {}) }}
            type="text"
            placeholder="e.g. Rahul Sharma"
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
            onKeyDown={(e) => e.key === 'Enter' && document.getElementById('phone-input').focus()}
          />
          {errors.name && <p style={styles.errMsg}>{errors.name}</p>}
        </div>

        <div style={styles.fgroup}>
          <label style={styles.flabel}>Phone Number</label>
          <input
            id="phone-input"
            style={{ ...styles.finput, ...(errors.phone ? styles.finputErr : {}) }}
            type="tel"
            inputMode="numeric"
            placeholder="e.g. 9876543210"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: '' })); }}
          />
          {errors.phone && <p style={styles.errMsg}>{errors.phone}</p>}
        </div>

        <div style={styles.fgroup}>
          <label style={styles.flabel}>Party Size</label>
          <div style={styles.partyGrid}>
            {partySizes.map((n) => (
              <button
                key={n}
                style={{ ...styles.partyBtn, ...(partySize === n ? styles.partyBtnSel : {}) }}
                onClick={() => { setPartySize(n); setErrors(p => ({ ...p, partySize: '' })); }}
              >
                {n}
              </button>
            ))}
            <button
              style={{ ...styles.partyBtn, ...styles.partyBtnWide, ...(partySize === 8 ? styles.partyBtnSel : {}) }}
              onClick={() => { setPartySize(8); setErrors(p => ({ ...p, partySize: '' })); }}
            >
              7 – 8
            </button>
            <button
              style={{ ...styles.partyBtn, ...styles.partyBtnWide, ...(partySize === 9 ? styles.partyBtnSel : {}) }}
              onClick={() => { setPartySize(9); setErrors(p => ({ ...p, partySize: '' })); }}
            >
              9 +
            </button>
          </div>
          {errors.partySize && <p style={styles.errMsg}>{errors.partySize}</p>}
        </div>

        <button style={{ ...styles.btnPrimary, opacity: loading ? 0.7 : 1 }} onClick={handleJoin} disabled={loading}>
          {loading ? 'Adding you...' : 'Get My Waiting Number →'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#faf7f2', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px 80px', fontFamily: "'Outfit', sans-serif" },
  brand: { textAlign: 'center', marginBottom: 32 },
  brandBadge: { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', border: '1px solid #e8ddd0', borderRadius: 100, padding: '6px 16px', fontSize: 12, color: '#9c8070', marginBottom: 16 },
  liveDot: { display: 'inline-block', width: 6, height: 6, background: '#52b082', borderRadius: '50%', boxShadow: '0 0 6px #52b082' },
  logoWrap: { fontSize: 48, marginBottom: 12, display: 'block' },
  brandName: { fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: '#3d2b1f', margin: 0 },
  brandTagline: { fontSize: 14, color: '#9c8070', margin: '4px 0 0', fontStyle: 'italic' },
  strip: { display: 'flex', gap: 12, marginBottom: 24, width: '100%', maxWidth: 460 },
  stripCard: { flex: 1, background: 'white', border: '1px solid #e8ddd0', borderRadius: 14, padding: 16, textAlign: 'center' },
  stripVal: { fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#3d2b1f' },
  stripLbl: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9c8070', marginTop: 4 },
  card: { background: 'white', border: '1px solid #e8ddd0', borderRadius: 22, padding: '32px 28px', boxShadow: '0 8px 48px rgba(61,43,31,0.07)', width: '100%', maxWidth: 460 },
  formTitle: { fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: '#3d2b1f', margin: '0 0 4px' },
  formSub: { fontSize: 13, color: '#9c8070', margin: '0 0 28px', lineHeight: 1.5 },
  fgroup: { marginBottom: 20 },
  flabel: { display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', color: '#6b4c3b', marginBottom: 8 },
  finput: { width: '100%', padding: '14px 16px', border: '1.5px solid #e8ddd0', borderRadius: 12, fontFamily: "'Outfit', sans-serif", fontSize: 16, color: '#2c1a0e', background: '#faf7f2', outline: 'none', boxSizing: 'border-box' },
  finputErr: { borderColor: '#e74c3c' },
  errMsg: { color: '#e74c3c', fontSize: 12, margin: '4px 0 0' },
  partyGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 },
  partyBtn: { aspectRatio: '1', borderRadius: 10, border: '1.5px solid #e8ddd0', background: '#faf7f2', fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 500, cursor: 'pointer', color: '#6b4c3b', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  partyBtnSel: { background: '#c9a84c', borderColor: '#c9a84c', color: 'white', fontWeight: 700 },
  partyBtnWide: { gridColumn: 'span 3', aspectRatio: 'auto', padding: '12px 6px', fontSize: 13 },
  btnPrimary: { width: '100%', padding: 17, background: 'linear-gradient(135deg, #3d2b1f, #6b4c3b)', color: 'white', border: 'none', borderRadius: 14, fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  btnSecondary: { width: '100%', padding: 14, border: '1.5px solid #e8ddd0', borderRadius: 12, background: 'transparent', fontFamily: "'Outfit', sans-serif", fontSize: 14, cursor: 'pointer', color: '#9c8070' },
  successIcon: { width: 80, height: 80, background: 'linear-gradient(135deg, #3a7d5c, #52b082)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: 'white', margin: '0 auto 18px' },
  successTitle: { fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#3d2b1f', textAlign: 'center', margin: '0 0 6px' },
  successSub: { fontSize: 14, color: '#9c8070', textAlign: 'center', margin: '0 0 20px' },
  tokenBox: { background: 'linear-gradient(135deg, #3d2b1f, #6b4c3b)', color: '#e8c97a', fontFamily: "'Playfair Display', serif", fontSize: 52, fontWeight: 700, padding: '16px 40px', borderRadius: 20, textAlign: 'center', letterSpacing: 6, marginBottom: 20 },
  detailBox: { background: '#f5ede0', border: '1px solid #e8ddd0', borderRadius: 14, padding: 18, marginBottom: 18 },
  detailRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14, borderBottom: '1px solid #e8ddd0' },
  detailKey: { color: '#9c8070' },
  detailVal: { fontWeight: 600, color: '#3d2b1f' },
  notice: { background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 12, padding: '14px 18px', fontSize: 13, color: '#6b4c3b', marginBottom: 20, lineHeight: 1.6 },
};
