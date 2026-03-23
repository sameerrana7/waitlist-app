import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { queueAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ManagerPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const branchId = user?.branchId;

  const [queue, setQueue] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ waiting: 0, seated: 0, total: 0 });
  const [current, setCurrent] = useState(null);
  const [toasts, setToasts] = useState([]);

  const AVG = 12;

  const toast = useCallback((msg, color = '#4caf7d') => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, color }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3200);
  }, []);

  // Real-time Firebase listeners
  useEffect(() => {
    if (!branchId) return;

    // Waitlist
    const unsub1 = onValue(ref(db, `waitlist/${branchId}`), (snap) => {
      const data = snap.val() || {};
      const entries = Object.entries(data)
        .map(([id, g]) => ({ id, ...g }))
        .sort((a, b) => a.createdAt - b.createdAt);

      const waiting = entries.filter((g) => g.status === 'waiting');
      setQueue(waiting);

      // Restore calling guest
      const calling = entries.find((g) => g.status === 'calling');
      if (calling) setCurrent(calling);
    });

    // Logs
    const unsub2 = onValue(ref(db, `logs/${branchId}`), (snap) => {
      const data = snap.val() || {};
      const sorted = Object.values(data).sort((a, b) => b.timestamp - a.timestamp).slice(0, 30);
      setLogs(sorted);
    });

    // Meta stats
    const unsub3 = onValue(ref(db, `meta/${branchId}`), (snap) => {
      const m = snap.val() || {};
      setStats((p) => ({ ...p, seated: m.seated || 0, total: m.total || 0 }));
    });

    return () => { unsub1(); unsub2(); unsub3(); };
  }, [branchId]);

  useEffect(() => {
    setStats((p) => ({ ...p, waiting: queue.length }));
  }, [queue]);

  const callNext = async () => {
    if (!queue.length) { toast('No guests waiting!', '#e8c97a'); return; }
    const next = queue[0];
    try {
      if (current) await queueAPI.skip(branchId, current.id);
      await queueAPI.call(branchId, next.id);
      setCurrent(next);
      toast(`📢 Now calling ${next.token} — ${next.name}`, '#e8c97a');
    } catch { toast('Error calling guest', '#e74c3c'); }
  };

  const seatGuest = async () => {
    if (!current) return;
    try {
      await queueAPI.seat(branchId, current.id);
      toast(`✓ ${current.token} seated`, '#4caf7d');
      setCurrent(null);
    } catch { toast('Error seating guest', '#e74c3c'); }
  };

  const skipGuest = async () => {
    if (!current) return;
    try {
      await queueAPI.skip(branchId, current.id);
      toast(`↩ ${current.token} moved to end`, '#e6a817');
      setCurrent(null);
    } catch { toast('Error skipping guest', '#e74c3c'); }
  };

  const removeGuest = async (id, token) => {
    try {
      await queueAPI.remove(branchId, id);
      if (current?.id === id) setCurrent(null);
      toast(`Removed ${token}`, '#e74c3c');
    } catch { toast('Error removing guest', '#e74c3c'); }
  };

  const resetDay = async () => {
    if (!window.confirm('Reset the entire day? All data will be cleared.')) return;
    try {
      await queueAPI.reset(branchId);
      setCurrent(null);
      toast('Day reset ✓', '#60a5fa');
    } catch { toast('Error resetting', '#e74c3c'); }
  };

  const estWait = queue.length > 0 ? String(queue.length * AVG) : '0';
  const avgParty = queue.length > 0
    ? (queue.reduce((s, g) => s + g.partySize, 0) / queue.length).toFixed(1) : '—';

  return (
    <div style={s.page}>
      {/* Topbar */}
      <div style={s.topbar}>
        <div style={s.topLeft}>
          <span style={s.logo}>🍽️ La Maison</span>
          <div style={s.livePill}><span style={s.liveDot} /> LIVE</div>
        </div>
        <div style={s.kpis}>
          {[['Waiting', stats.waiting], ['Seated', stats.seated], ['Total', stats.total]].map(([l, v]) => (
            <div key={l} style={s.kpi}>
              <div style={s.kpiV}>{v}</div>
              <div style={s.kpiL}>{l}</div>
            </div>
          ))}
        </div>
        <div style={s.topRight}>
          <span style={s.managerName}>{user?.name}</span>
          <button style={s.btnLogout} onClick={() => { logout(); navigate('/login'); }}>Logout</button>
          <button style={s.btnReset} onClick={resetDay}>⟳ Reset Day</button>
        </div>
      </div>

      {/* Main Layout */}
      <div style={s.layout}>
        {/* Left: Queue */}
        <div style={s.main}>
          {/* Now Serving */}
          <div style={s.nsPanel}>
            <div style={s.nsTop}>
              <div>
                <div style={s.nsEye}><span style={s.liveDot} /> NOW SERVING</div>
                <div style={s.nsToken}>{current?.token || '—'}</div>
                <div style={s.nsName}>{current?.name || 'No active guest'}</div>
                <div style={s.nsChips}>
                  <span style={s.chip}>{current ? `👥 ${current.partySize} people` : '—'}</span>
                  <span style={s.chip}>{current ? `📞 ${current.phone}` : '—'}</span>
                </div>
              </div>
              <div style={s.nsActions}>
                <button style={s.btnCall} onClick={callNext}>▶ Call Next</button>
                <button style={{ ...s.btnSeat, opacity: current ? 1 : 0.3 }} onClick={seatGuest} disabled={!current}>✓ Seated</button>
                <button style={{ ...s.btnSkip, opacity: current ? 1 : 0.3 }} onClick={skipGuest} disabled={!current}>↩ Skip</button>
              </div>
            </div>
          </div>

          {/* Queue List */}
          <div style={s.queueSection}>
            <div style={s.secHdr}>
              <span>WAITING QUEUE</span>
              <span style={s.badge}>{queue.length} groups</span>
            </div>
            {queue.length === 0 ? (
              <div style={s.emptyQ}>
                <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.5 }}>🍽️</div>
                <p>Queue is empty. All caught up!</p>
              </div>
            ) : (
              queue.map((g, i) => (
                <div key={g.id} style={{ ...s.qItem, ...(i === 0 ? s.qItemNext : {}) }}>
                  <div style={{ ...s.qNum, ...(i === 0 ? s.qNumNext : {}) }}>{i + 1}</div>
                  <div style={s.qInfo}>
                    <div style={s.qToken}>
                      {g.token}
                      {i === 0 && <span style={s.nextTag}>NEXT</span>}
                    </div>
                    <div style={s.qSub}>{g.name} · {g.phone}</div>
                  </div>
                  <div style={s.qRight}>
                    <div style={s.qParty}>👥 {g.partySize}</div>
                    <div style={s.qTime}>{g.joinedAt}</div>
                  </div>
                  <button style={s.iconBtn} onClick={() => removeGuest(g.id, g.token)}>✕</button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={s.sidebar}>
          {/* Wait Estimate */}
          <div style={s.sbSection}>
            <div style={s.sbTitle}>WAIT ESTIMATE</div>
            <div style={s.estBox}>
              <div style={s.estBig}>{estWait}</div>
              <div style={s.estUnit}>Minutes</div>
              <div style={s.estNote}>{queue.length > 0 ? `${queue.length} group${queue.length !== 1 ? 's' : ''} ahead` : 'Queue is clear'}</div>
            </div>
            <div style={s.miniStats}>
              {[['Avg Party', avgParty], ['Min/Group', '12']].map(([l, v]) => (
                <div key={l} style={s.miniCard}>
                  <div style={s.miniVal}>{v}</div>
                  <div style={s.miniLbl}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Log */}
          <div style={s.sbSection}>
            <div style={s.sbTitle}>ACTIVITY LOG</div>
            <div style={s.logList}>
              {logs.length === 0 ? (
                <p style={{ fontSize: 12, color: '#3a4758', textAlign: 'center', padding: 16 }}>No activity yet</p>
              ) : (
                logs.map((l, i) => (
                  <div key={i} style={s.logRow}>
                    <span style={{ ...s.ld, background: l.action === 'seated' ? '#4caf7d' : l.action === 'removed' ? '#e74c3c' : '#e6a817' }} />
                    <span style={s.logTxt}>{l.action} — {l.by}</span>
                    <span style={s.logT}>{l.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toasts */}
      <div style={s.toastWrap}>
        {toasts.map((t) => (
          <div key={t.id} style={{ ...s.toast, borderLeftColor: t.color }}>{t.msg}</div>
        ))}
      </div>
    </div>
  );
}

const s = {
  page: { height: '100vh', display: 'flex', flexDirection: 'column', background: '#0e1117', color: '#dde3ec', fontFamily: "'Outfit', sans-serif", overflow: 'hidden' },
  topbar: { background: '#151b22', borderBottom: '1px solid #253040', padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  topLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  logo: { fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#e8c97a' },
  livePill: { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(76,175,125,0.1)', border: '1px solid rgba(76,175,125,0.25)', borderRadius: 100, padding: '4px 12px', fontSize: 11, color: '#4caf7d' },
  liveDot: { display: 'inline-block', width: 6, height: 6, background: '#4caf7d', borderRadius: '50%', boxShadow: '0 0 6px #4caf7d' },
  kpis: { display: 'flex', gap: 28 },
  kpi: { textAlign: 'center' },
  kpiV: { fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#e8c97a' },
  kpiL: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#637080' },
  topRight: { display: 'flex', alignItems: 'center', gap: 10 },
  managerName: { fontSize: 13, color: '#637080' },
  btnLogout: { padding: '7px 14px', borderRadius: 8, border: '1px solid #253040', background: 'transparent', fontSize: 12, color: '#637080', cursor: 'pointer' },
  btnReset: { padding: '7px 14px', borderRadius: 8, border: '1px solid #253040', background: 'transparent', fontSize: 12, color: '#637080', cursor: 'pointer' },
  layout: { display: 'grid', gridTemplateColumns: '1fr 290px', flex: 1, overflow: 'hidden' },
  main: { display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid #253040' },
  nsPanel: { background: 'linear-gradient(135deg,#141e18,#192b20)', borderBottom: '1px solid rgba(76,175,125,0.15)', padding: '20px 24px', flexShrink: 0 },
  nsTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' },
  nsEye: { fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: '#4caf7d', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 7 },
  nsToken: { fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 700, color: '#e8c97a', lineHeight: 1 },
  nsName: { fontSize: 16, fontWeight: 500, color: '#dde3ec', marginTop: 6 },
  nsChips: { display: 'flex', gap: 10, marginTop: 8 },
  chip: { fontSize: 12, padding: '4px 12px', borderRadius: 100, background: 'rgba(255,255,255,0.06)', color: '#637080' },
  nsActions: { display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' },
  btnCall: { padding: '10px 18px', borderRadius: 10, border: 'none', background: '#2e7d52', color: 'white', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSeat: { padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(76,175,125,0.28)', background: 'rgba(76,175,125,0.12)', color: '#4caf7d', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSkip: { padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(230,168,23,0.25)', background: 'rgba(230,168,23,0.1)', color: '#e6a817', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  queueSection: { flex: 1, overflowY: 'auto', padding: '18px 24px' },
  secHdr: { fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: '#637080', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  badge: { background: '#222b38', color: '#637080', fontSize: 10, padding: '2px 9px', borderRadius: 100 },
  emptyQ: { textAlign: 'center', padding: '48px 20px', color: '#3a4758', fontSize: 13 },
  qItem: { display: 'flex', alignItems: 'center', gap: 14, background: '#151b22', border: '1px solid #253040', borderRadius: 13, padding: '13px 16px', marginBottom: 9 },
  qItemNext: { borderColor: 'rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.04)' },
  qNum: { fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#3a4758', minWidth: 26, textAlign: 'center' },
  qNumNext: { color: '#c9a84c' },
  qInfo: { flex: 1, minWidth: 0 },
  qToken: { fontSize: 14, fontWeight: 600, letterSpacing: 1, color: '#dde3ec', display: 'flex', alignItems: 'center', gap: 8 },
  nextTag: { fontSize: 9, background: 'rgba(201,168,76,0.15)', color: '#e8c97a', padding: '2px 8px', borderRadius: 100, letterSpacing: 1, fontWeight: 600 },
  qSub: { fontSize: 12, color: '#637080', marginTop: 3 },
  qRight: { textAlign: 'right', flexShrink: 0 },
  qParty: { fontSize: 13, fontWeight: 600, color: '#dde3ec' },
  qTime: { fontSize: 11, color: '#3a4758', marginTop: 2 },
  iconBtn: { width: 30, height: 30, borderRadius: 8, border: '1px solid #253040', background: 'transparent', color: '#3a4758', cursor: 'pointer', fontSize: 13 },
  sidebar: { background: '#141820', overflowY: 'auto', padding: '20px 18px' },
  sbSection: { marginBottom: 24 },
  sbTitle: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#637080', marginBottom: 12 },
  estBox: { background: 'linear-gradient(135deg,#191f2c,#1f2a3a)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 14, padding: 18, textAlign: 'center', marginBottom: 10 },
  estBig: { fontFamily: "'Playfair Display', serif", fontSize: 44, fontWeight: 700, color: '#e8c97a', lineHeight: 1 },
  estUnit: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#637080', marginTop: 4 },
  estNote: { fontSize: 11, color: '#3a4758', marginTop: 8 },
  miniStats: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  miniCard: { background: '#1c2330', border: '1px solid #253040', borderRadius: 10, padding: 12, textAlign: 'center' },
  miniVal: { fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#dde3ec' },
  miniLbl: { fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: '#637080', marginTop: 3 },
  logList: { maxHeight: 300, overflowY: 'auto' },
  logRow: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: '1px solid #1e2530', fontSize: 12, color: '#637080' },
  ld: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 3 },
  logTxt: { flex: 1, lineHeight: 1.4, textTransform: 'capitalize' },
  logT: { fontSize: 10, color: '#3a4758', flexShrink: 0 },
  toastWrap: { position: 'fixed', bottom: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 7 },
  toast: { background: '#1c2330', border: '1px solid #253040', borderLeft: '3px solid #4caf7d', borderRadius: 10, padding: '11px 16px', fontSize: 13, color: '#dde3ec', minWidth: 200 },
};
