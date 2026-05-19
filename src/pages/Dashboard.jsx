import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import {
  collection, onSnapshot, query,
  orderBy, limit,
} from 'firebase/firestore';
import Branches from './Branches';
import Inventory from './Inventory';
import Expiry from './Expiry';
import Reports from './Reports';
import Orders from './Orders';
import Finance from './Finance';
import Analytics from './Analytics';
import Messages from './Messages';

// ─── LIVE OVERVIEW ────────────────────────────────────────
function LiveOverview() {
  const [reports, setReports] = useState([]);
  const [branches, setBranches] = useState([]);
  const [stock, setStock] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [adjustments, setAdjustments] = useState([]);

  useEffect(() => {
    const unsubR = onSnapshot(
      query(collection(db, 'dailyReports'), orderBy('createdAt', 'desc')),
      (snap) => setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubB = onSnapshot(collection(db, 'branches'), (snap) => {
      setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubSt = onSnapshot(collection(db, 'stock'), (snap) => {
      setStock(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubP = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubO = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      (snap) => setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubN = onSnapshot(
      query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(20)),
      (snap) => setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubA = onSnapshot(
      query(collection(db, 'stockAdjustments'), orderBy('createdAt', 'desc'), limit(10)),
      (snap) => setAdjustments(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => {
      unsubR(); unsubB(); unsubSt(); unsubP();
      unsubO(); unsubN(); unsubA();
    };
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayReports = reports.filter((r) => r.date === today);
  const totalSalesToday = todayReports.reduce((s, r) => s + (r.totalSales || 0), 0);
  const totalExpensesToday = todayReports.reduce((s, r) => s + (r.totalExpenses || 0), 0);
  const totalVarianceToday = todayReports.reduce((s, r) => s + (r.variance || 0), 0);

  const expiringProducts = stock.filter((s) => {
    if (!s.expiryDate) return false;
    const expiry = new Date(s.expiryDate);
    const todayDate = new Date();
    const daysLeft = Math.ceil((expiry - todayDate) / (1000 * 60 * 60 * 24));
    return daysLeft <= 150 && daysLeft > 0;
  });

  const pendingOrders = orders.filter((o) => o.status === 'Pending');

  function getBranchTodayReport(branchId) {
    return todayReports.find((r) => r.branchId === branchId);
  }

  const recentActivity = [
    ...reports.slice(0, 5).map((r) => ({
      icon: '📋',
      message: `Daily report submitted for ${r.branchName}`,
      sub: `By ${r.submittedBy}`,
      time: r.createdAt?.seconds
        ? new Date(r.createdAt.seconds * 1000).toLocaleString() : r.date,
      color: r.variance < 0 ? '#dc3545' : '#28a745',
    })),
    ...orders.slice(0, 3).map((o) => ({
      icon: '🛒',
      message: `Order ${o.orderNumber} — ${o.branchName}`,
      sub: `Status: ${o.status}`,
      time: o.createdAt?.seconds
        ? new Date(o.createdAt.seconds * 1000).toLocaleString() : o.date,
      color: '#0f3460',
    })),
    ...adjustments.slice(0, 3).map((a) => ({
      icon: a.type === 'IN' ? '📥' : '📤',
      message: `Stock ${a.reason}`,
      sub: `By ${a.createdBy} · Qty: ${a.type === 'IN' ? '+' : '-'}${a.quantity}`,
      time: a.createdAt?.seconds
        ? new Date(a.createdAt.seconds * 1000).toLocaleString() : '—',
      color: a.type === 'IN' ? '#28a745' : '#e94560',
    })),
  ].sort((a, b) => b.time?.localeCompare(a.time)).slice(0, 8);

  return (
    <div>
      <div style={ovStyles.statsGrid}>
        <div style={{ ...ovStyles.statCard, borderTop: '4px solid #0f3460' }}>
          <p style={ovStyles.statLabel}>💰 Total Sales Today</p>
          <p style={ovStyles.statValue}>K {totalSalesToday.toFixed(2)}</p>
          <p style={ovStyles.statSub}>
            {todayReports.length} branch{todayReports.length !== 1 ? 'es' : ''} reported
          </p>
        </div>
        <div style={{ ...ovStyles.statCard, borderTop: '4px solid #28a745' }}>
          <p style={ovStyles.statLabel}>📋 Total Expenses Today</p>
          <p style={{ ...ovStyles.statValue, color: '#e94560' }}>
            K {totalExpensesToday.toFixed(2)}
          </p>
          <p style={ovStyles.statSub}>
            Profit: K {(totalSalesToday - totalExpensesToday).toFixed(2)}
          </p>
        </div>
        <div style={{ ...ovStyles.statCard, borderTop: '4px solid #e94560' }}>
          <p style={ovStyles.statLabel}>⚠️ Expiring Products</p>
          <p style={{
            ...ovStyles.statValue,
            color: expiringProducts.length > 0 ? '#f39c12' : '#28a745'
          }}>
            {expiringProducts.length}
          </p>
          <p style={ovStyles.statSub}>Within 150 days</p>
        </div>
        <div style={{ ...ovStyles.statCard, borderTop: '4px solid #f39c12' }}>
          <p style={ovStyles.statLabel}>🛒 Pending Orders</p>
          <p style={{
            ...ovStyles.statValue,
            color: pendingOrders.length > 0 ? '#f39c12' : '#28a745'
          }}>
            {pendingOrders.length}
          </p>
          <p style={ovStyles.statSub}>Awaiting HO review</p>
        </div>
      </div>

      {totalVarianceToday < 0 && (
        <div style={ovStyles.alertBox}>
          ⚠️ Cash variance of{' '}
          <strong>K {Math.abs(totalVarianceToday).toFixed(2)}</strong>{' '}
          detected today across branches. Investigate immediately.
        </div>
      )}

      <div style={ovStyles.twoCol}>
        <div style={ovStyles.card}>
          <h3 style={ovStyles.cardTitle}>📍 Branch Status Today</h3>
          <p style={ovStyles.cardSub}>
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long', year: 'numeric',
              month: 'long', day: 'numeric'
            })}
          </p>
          {branches.length === 0 ? (
            <div style={ovStyles.empty}>No branches added yet.</div>
          ) : (
            <div style={ovStyles.branchList}>
              {branches.map((branch) => {
                const report = getBranchTodayReport(branch.id);
                return (
                  <div key={branch.id} style={{
                    ...ovStyles.branchItem,
                    borderLeft: `4px solid ${report ? '#28a745' : '#dc3545'}`,
                  }}>
                    <div style={ovStyles.branchTop}>
                      <span style={ovStyles.branchName}>{branch.name}</span>
                      <span style={{
                        ...ovStyles.branchBadge,
                        background: report ? '#e6f9ee' : '#fff0f0',
                        color: report ? '#28a745' : '#dc3545',
                      }}>
                        {report ? '✅ Reported' : '❌ Not Reported'}
                      </span>
                    </div>
                    {report ? (
                      <div style={ovStyles.branchStats}>
                        <div style={ovStyles.branchStat}>
                          <p style={ovStyles.branchStatLabel}>Sales</p>
                          <p style={ovStyles.branchStatValue}>
                            K {(report.totalSales || 0).toFixed(2)}
                          </p>
                        </div>
                        <div style={ovStyles.branchStat}>
                          <p style={ovStyles.branchStatLabel}>Expenses</p>
                          <p style={ovStyles.branchStatValue}>
                            K {(report.totalExpenses || 0).toFixed(2)}
                          </p>
                        </div>
                        <div style={ovStyles.branchStat}>
                          <p style={ovStyles.branchStatLabel}>Cash</p>
                          <p style={ovStyles.branchStatValue}>
                            K {(report.actualCash || 0).toFixed(2)}
                          </p>
                        </div>
                        <div style={ovStyles.branchStat}>
                          <p style={ovStyles.branchStatLabel}>Variance</p>
                          <p style={{
                            ...ovStyles.branchStatValue,
                            color: (report.variance || 0) < 0 ? '#dc3545' : '#28a745',
                            fontWeight: '800',
                          }}>
                            K {(report.variance || 0).toFixed(2)}
                            {(report.variance || 0) < 0 && ' ⚠️'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p style={ovStyles.notReported}>
                        Report not submitted yet today.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div style={{ ...ovStyles.card, marginBottom: '20px' }}>
            <h3 style={ovStyles.cardTitle}>🔔 Recent Notifications</h3>
            {notifications.length === 0 ? (
              <div style={ovStyles.empty}>No notifications yet.</div>
            ) : (
              <div style={ovStyles.notifList}>
                {notifications.slice(0, 6).map((n) => (
                  <div key={n.id} style={{
                    ...ovStyles.notifItem,
                    background: n.read ? '#fafafa' : '#f0f4ff',
                    borderLeft: `3px solid ${
                      n.type === 'VARIANCE_ALERT' ? '#dc3545'
                      : n.type === 'STOCK_ALERT' ? '#f39c12'
                      : n.type === 'ORDER_SUBMITTED' ? '#0f3460'
                      : '#28a745'
                    }`,
                  }}>
                    <p style={ovStyles.notifMessage}>{n.message}</p>
                    <p style={ovStyles.notifTime}>
                      {n.createdAt?.seconds
                        ? new Date(n.createdAt.seconds * 1000)
                            .toLocaleString([], {
                              month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })
                        : '—'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={ovStyles.card}>
            <h3 style={ovStyles.cardTitle}>🕐 Recent Activity</h3>
            {recentActivity.length === 0 ? (
              <div style={ovStyles.empty}>No activity yet.</div>
            ) : (
              <div style={ovStyles.activityList}>
                {recentActivity.map((a, i) => (
                  <div key={i} style={ovStyles.activityItem}>
                    <div style={{
                      ...ovStyles.activityDot,
                      background: a.color,
                    }}>
                      {a.icon}
                    </div>
                    <div style={ovStyles.activityInfo}>
                      <p style={ovStyles.activityMessage}>{a.message}</p>
                      <p style={ovStyles.activitySub}>{a.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={ovStyles.quickStatsRow}>
        <div style={ovStyles.quickStat}>
          <p style={ovStyles.quickStatNum}>{branches.length}</p>
          <p style={ovStyles.quickStatLabel}>Total Branches</p>
        </div>
        <div style={ovStyles.quickStat}>
          <p style={ovStyles.quickStatNum}>{products.length}</p>
          <p style={ovStyles.quickStatLabel}>Products</p>
        </div>
        <div style={ovStyles.quickStat}>
          <p style={ovStyles.quickStatNum}>{stock.length}</p>
          <p style={ovStyles.quickStatLabel}>Stock Entries</p>
        </div>
        <div style={ovStyles.quickStat}>
          <p style={ovStyles.quickStatNum}>{orders.length}</p>
          <p style={ovStyles.quickStatLabel}>Total Orders</p>
        </div>
        <div style={ovStyles.quickStat}>
          <p style={ovStyles.quickStatNum}>{reports.length}</p>
          <p style={ovStyles.quickStatLabel}>Total Reports</p>
        </div>
        <div style={ovStyles.quickStat}>
          <p style={{
            ...ovStyles.quickStatNum,
            color: expiringProducts.length > 0 ? '#f39c12' : '#28a745'
          }}>
            {expiringProducts.length}
          </p>
          <p style={ovStyles.quickStatLabel}>Expiring Soon</p>
        </div>
      </div>
    </div>
  );
}

const ovStyles = {
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px', marginBottom: '20px',
  },
  statCard: {
    background: 'white', borderRadius: '12px',
    padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  statLabel: { color: '#888', fontSize: '12px', margin: '0 0 8px' },
  statValue: { color: '#1a1a2e', fontSize: '28px', fontWeight: '800', margin: '0 0 4px' },
  statSub: { color: '#aaa', fontSize: '11px', margin: 0 },
  alertBox: {
    background: '#fff8e1', border: '1px solid #f39c12',
    color: '#856404', padding: '12px 16px',
    borderRadius: '8px', fontSize: '14px', marginBottom: '20px',
  },
  twoCol: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: '20px', marginBottom: '20px',
  },
  card: {
    background: 'white', borderRadius: '12px',
    padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  cardTitle: { fontSize: '16px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 4px' },
  cardSub: { fontSize: '12px', color: '#aaa', margin: '0 0 16px' },
  branchList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  branchItem: {
    padding: '12px', background: '#fafafa',
    borderRadius: '8px', border: '1px solid #f0f0f0',
  },
  branchTop: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '8px',
  },
  branchName: { fontSize: '14px', fontWeight: '700', color: '#1a1a2e' },
  branchBadge: {
    padding: '3px 10px', borderRadius: '12px',
    fontSize: '11px', fontWeight: '700',
  },
  branchStats: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  branchStat: {},
  branchStatLabel: { fontSize: '10px', color: '#aaa', margin: 0 },
  branchStatValue: { fontSize: '13px', fontWeight: '700', color: '#1a1a2e', margin: '2px 0 0' },
  notReported: { fontSize: '12px', color: '#aaa', margin: 0 },
  notifList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  notifItem: {
    padding: '10px 12px', borderRadius: '8px',
    border: '1px solid #f0f0f0',
  },
  notifMessage: { fontSize: '13px', color: '#333', margin: '0 0 2px', fontWeight: '500' },
  notifTime: { fontSize: '11px', color: '#aaa', margin: 0 },
  activityList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  activityItem: { display: 'flex', gap: '12px', alignItems: 'flex-start' },
  activityDot: {
    width: '32px', height: '32px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '14px', flexShrink: 0, color: 'white',
  },
  activityInfo: { flex: 1 },
  activityMessage: { fontSize: '13px', fontWeight: '600', color: '#1a1a2e', margin: 0 },
  activitySub: { fontSize: '11px', color: '#aaa', margin: '2px 0 0' },
  quickStatsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '12px',
  },
  quickStat: {
    background: 'white', borderRadius: '10px',
    padding: '16px', textAlign: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  quickStatNum: { fontSize: '24px', fontWeight: '800', color: '#0f3460', margin: '0 0 4px' },
  quickStatLabel: { fontSize: '11px', color: '#888', margin: 0 },
  empty: { textAlign: 'center', padding: '30px', color: '#aaa', fontSize: '13px' },
};

// ─── MAIN DASHBOARD ───────────────────────────────────────
export default function Dashboard() {
  const { currentUser, userName, userRole, userBranch, logout } = useAuth();
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifCount, setNotifCount] = useState(0);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50)),
      (snap) => {
        const unread = snap.docs.filter((d) => !d.data().read).length;
        setNotifCount(unread);
      }
    );
    return unsub;
  }, []);

  const modules = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'branches', icon: '🏪', label: 'Branches' },
    { id: 'inventory', icon: '📦', label: 'Inventory' },
    { id: 'expiry', icon: '⚠️', label: 'Expiry' },
    { id: 'reports', icon: '📋', label: 'Reports' },
    { id: 'orders', icon: '🛒', label: 'Orders' },
    { id: 'finance', icon: '💰', label: 'Finance' },
    { id: 'procurement', icon: '🏭', label: 'Procurement' },
    { id: 'messages', icon: '💬', label: 'Messages' },
    { id: 'analytics', icon: '📈', label: 'Analytics' },
  ];

  const sidebarWidth = sidebarOpen ? '240px' : '60px';

  return (
    <div style={styles.container}>
      <div style={{ ...styles.sidebar, width: sidebarWidth }}>
        <button
          style={styles.toggleBtn}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>

        {sidebarOpen && (
          <div style={styles.sidebarHeader}>
            <div style={styles.sidebarLogo}>📊</div>
            <div>
              <p style={styles.sidebarTitle}>CBMS</p>
              <p style={styles.sidebarSub}>Solution Enterprises</p>
            </div>
          </div>
        )}

        {!sidebarOpen && (
          <div style={styles.sidebarHeaderCollapsed}>
            <div style={styles.sidebarLogo}>📊</div>
          </div>
        )}

        {sidebarOpen && (
          <div style={styles.userCard}>
            <div style={styles.userAvatar}>
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <p style={styles.userName}>{userName || 'User'}</p>
              <p style={styles.userRole}>{userRole || 'Staff'}</p>
              {userBranch && <p style={styles.userBranch}>📍 {userBranch}</p>}
            </div>
          </div>
        )}

        {!sidebarOpen && (
          <div style={styles.userAvatarCollapsed}>
            {userName ? userName.charAt(0).toUpperCase() : 'U'}
          </div>
        )}

        <nav style={styles.nav}>
          {modules.map((mod) => (
            <button
              key={mod.id}
              style={activeModule === mod.id ? styles.navItemActive : styles.navItem}
              onClick={() => setActiveModule(mod.id)}
              title={mod.label}
            >
              <span style={styles.navIcon}>{mod.icon}</span>
              {sidebarOpen && <span>{mod.label}</span>}
            </button>
          ))}
        </nav>

        <button style={styles.logoutBtn} onClick={handleLogout} title="Logout">
          🚪{sidebarOpen && ' Logout'}
        </button>
      </div>

      <div style={{ ...styles.main, marginLeft: sidebarWidth }}>
        <div style={styles.topBar}>
          <div>
            <h1 style={styles.pageTitle}>
              {modules.find((m) => m.id === activeModule)?.icon}{' '}
              {modules.find((m) => m.id === activeModule)?.label}
            </h1>
            <p style={styles.pageDate}>
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long', year: 'numeric',
                month: 'long', day: 'numeric',
              })}
            </p>
          </div>
          <div style={{
            ...styles.alertBadge,
            background: notifCount > 0 ? '#e94560' : '#28a745',
          }}>
            🔔 {notifCount > 0 ? `${notifCount} Alerts` : 'All Clear'}
          </div>
        </div>

        {activeModule === 'overview' && <LiveOverview />}
        {activeModule === 'branches' && <Branches />}
        {activeModule === 'inventory' && <Inventory />}
        {activeModule === 'expiry' && <Expiry />}
        {activeModule === 'reports' && <Reports />}
        {activeModule === 'orders' && <Orders />}
        {activeModule === 'finance' && <Finance />}
        {activeModule === 'analytics' && <Analytics />}
        {activeModule === 'messages' && <Messages />}

        {activeModule !== 'overview' &&
          activeModule !== 'branches' &&
          activeModule !== 'inventory' &&
          activeModule !== 'expiry' &&
          activeModule !== 'reports' &&
          activeModule !== 'orders' &&
          activeModule !== 'finance' &&
          activeModule !== 'analytics' &&
          activeModule !== 'messages' && (
            <div style={styles.comingSoon}>
              <p style={styles.comingSoonIcon}>
                {modules.find((m) => m.id === activeModule)?.icon}
              </p>
              <h2 style={styles.comingSoonTitle}>
                {modules.find((m) => m.id === activeModule)?.label} Module
              </h2>
              <p style={styles.comingSoonText}>
                This module is being built. Come back soon!
              </p>
            </div>
          )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex', minHeight: '100vh',
    fontFamily: "'Segoe UI', sans-serif", background: '#f0f2f5',
  },
  sidebar: {
    background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
    display: 'flex', flexDirection: 'column', padding: '10px 0',
    position: 'fixed', height: '100vh', overflowY: 'auto',
    overflowX: 'hidden', transition: 'width 0.3s ease', zIndex: 100,
  },
  toggleBtn: {
    alignSelf: 'flex-end', marginRight: '8px', marginBottom: '8px',
    background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
    borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '12px',
  },
  sidebarHeader: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  sidebarHeaderCollapsed: {
    display: 'flex', justifyContent: 'center', padding: '0 0 16px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  sidebarLogo: { fontSize: '28px' },
  sidebarTitle: { color: 'white', fontWeight: '800', fontSize: '18px', margin: 0 },
  sidebarSub: { color: '#e94560', fontSize: '10px', margin: 0 },
  userCard: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '15px 20px', margin: '15px 10px',
    background: 'rgba(255,255,255,0.05)', borderRadius: '10px',
  },
  userAvatarCollapsed: {
    width: '36px', height: '36px', borderRadius: '50%',
    background: '#e94560', color: 'white', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontWeight: '700', fontSize: '14px', margin: '12px auto',
  },
  userAvatar: {
    width: '38px', height: '38px', borderRadius: '50%',
    background: '#e94560', color: 'white', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontWeight: '700', fontSize: '16px', flexShrink: 0,
  },
  userName: { color: 'white', fontSize: '13px', fontWeight: '600', margin: 0 },
  userRole: { color: '#aaa', fontSize: '11px', margin: 0 },
  userBranch: { color: '#e94560', fontSize: '10px', margin: 0 },
  nav: { display: 'flex', flexDirection: 'column', padding: '10px', gap: '4px', flex: 1 },
  navItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
    gap: '10px', padding: '10px 14px', background: 'transparent',
    border: 'none', color: '#aaa', fontSize: '13px', borderRadius: '8px',
    cursor: 'pointer', textAlign: 'left', width: '100%', whiteSpace: 'nowrap',
  },
  navItemActive: {
    display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
    gap: '10px', padding: '10px 14px', background: 'rgba(233,69,96,0.2)',
    border: '1px solid rgba(233,69,96,0.4)', color: 'white',
    fontSize: '13px', borderRadius: '8px', cursor: 'pointer',
    textAlign: 'left', width: '100%', whiteSpace: 'nowrap',
  },
  navIcon: { fontSize: '18px', flexShrink: 0 },
  logoutBtn: {
    margin: '10px', padding: '10px', background: 'rgba(233,69,96,0.2)',
    border: '1px solid rgba(233,69,96,0.4)', color: '#e94560',
    borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
    whiteSpace: 'nowrap', overflow: 'hidden',
  },
  main: { flex: 1, padding: '30px', transition: 'margin-left 0.3s ease', minWidth: 0 },
  topBar: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '30px',
  },
  pageTitle: { fontSize: '24px', fontWeight: '800', color: '#1a1a2e', margin: 0 },
  pageDate: { color: '#888', fontSize: '13px', margin: '4px 0 0' },
  alertBadge: {
    color: 'white', padding: '8px 16px', borderRadius: '20px',
    fontSize: '13px', fontWeight: '600', transition: 'background 0.3s',
  },
  comingSoon: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '400px', background: 'white',
    borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  comingSoonIcon: { fontSize: '60px', margin: '0 0 10px' },
  comingSoonTitle: { fontSize: '24px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 10px' },
  comingSoonText: { color: '#aaa', fontSize: '14px' },
};