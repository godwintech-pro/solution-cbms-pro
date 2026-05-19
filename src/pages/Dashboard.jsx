import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Branches from './Branches';
import Inventory from './Inventory';
import Expiry from './Expiry';
import Reports from './Reports';
import Orders from './Orders';

export default function Dashboard() {
  const { currentUser, userName, userRole, userBranch, logout } = useAuth();
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

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
      {/* Sidebar */}
      <div style={{ ...styles.sidebar, width: sidebarWidth }}>
        {/* Toggle Button */}
        <button
          style={styles.toggleBtn}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>

        {/* Header */}
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

        {/* User Info */}
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

        {/* Navigation */}
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

        {/* Logout */}
        <button style={styles.logoutBtn} onClick={handleLogout} title="Logout">
          🚪{sidebarOpen && ' Logout'}
        </button>
      </div>

      {/* Main Content */}
      <div style={{ ...styles.main, marginLeft: sidebarWidth }}>
        {/* Top Bar */}
        <div style={styles.topBar}>
          <div>
            <h1 style={styles.pageTitle}>
              {modules.find((m) => m.id === activeModule)?.icon}{' '}
              {modules.find((m) => m.id === activeModule)?.label}
            </h1>
            <p style={styles.pageDate}>
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div style={styles.alertBadge}>🔔 3 Alerts</div>
        </div>

        {/* Overview Module */}
        {activeModule === 'overview' && (
          <div>
            <div style={styles.statsGrid}>
              <div style={{ ...styles.statCard, borderTop: '4px solid #0f3460' }}>
                <p style={styles.statLabel}>Total Sales Today</p>
                <p style={styles.statValue}>K 0.00</p>
                <p style={styles.statSub}>Across all branches</p>
              </div>
              <div style={{ ...styles.statCard, borderTop: '4px solid #28a745' }}>
                <p style={styles.statLabel}>Total Expenses</p>
                <p style={styles.statValue}>K 0.00</p>
                <p style={styles.statSub}>Today</p>
              </div>
              <div style={{ ...styles.statCard, borderTop: '4px solid #e94560' }}>
                <p style={styles.statLabel}>Expiring Products</p>
                <p style={styles.statValue}>0</p>
                <p style={styles.statSub}>Within 150 days</p>
              </div>
              <div style={{ ...styles.statCard, borderTop: '4px solid #f39c12' }}>
                <p style={styles.statLabel}>Pending Orders</p>
                <p style={styles.statValue}>0</p>
                <p style={styles.statSub}>Awaiting review</p>
              </div>
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>📍 Branch Performance</h2>
              <div style={styles.emptyState}>
                <p>🏪</p>
                <p>No branch data yet.</p>
                <p style={styles.emptySubtext}>
                  Branch performance will appear here once reports are submitted.
                </p>
              </div>
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>🕐 Recent Activity</h2>
              <div style={styles.emptyState}>
                <p>📋</p>
                <p>No activity yet.</p>
                <p style={styles.emptySubtext}>
                  Branch reports and updates will appear here in real time.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Branches Module */}
        {activeModule === 'branches' && <Branches />}

        {/* Inventory Module */}
        {activeModule === 'inventory' && <Inventory />}

        {/* Expiry Module */}
        {activeModule === 'expiry' && <Expiry />}

        {/* Reports Module */}
        {activeModule === 'reports' && <Reports />}

        {/* Orders Module */}
        {activeModule === 'orders' && <Orders />}

        {/* Other Modules Placeholder */}
        {activeModule !== 'overview' &&
          activeModule !== 'branches' &&
          activeModule !== 'inventory' &&
          activeModule !== 'expiry' &&
          activeModule !== 'reports' &&
          activeModule !== 'orders' && (
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
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Segoe UI', sans-serif",
    background: '#f0f2f5',
  },
  sidebar: {
    background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
    display: 'flex',
    flexDirection: 'column',
    padding: '10px 0',
    position: 'fixed',
    height: '100vh',
    overflowY: 'auto',
    overflowX: 'hidden',
    transition: 'width 0.3s ease',
    zIndex: 100,
  },
  toggleBtn: {
    alignSelf: 'flex-end',
    marginRight: '8px',
    marginBottom: '8px',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: 'white',
    borderRadius: '6px',
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background 0.2s',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '0 20px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  sidebarHeaderCollapsed: {
    display: 'flex',
    justifyContent: 'center',
    padding: '0 0 16px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  sidebarLogo: { fontSize: '28px' },
  sidebarTitle: { color: 'white', fontWeight: '800', fontSize: '18px', margin: 0 },
  sidebarSub: { color: '#e94560', fontSize: '10px', margin: 0 },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '15px 20px',
    margin: '15px 10px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
  },
  userAvatarCollapsed: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#e94560',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '14px',
    margin: '12px auto',
  },
  userAvatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    background: '#e94560',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '16px',
    flexShrink: 0,
  },
  userName: { color: 'white', fontSize: '13px', fontWeight: '600', margin: 0 },
  userRole: { color: '#aaa', fontSize: '11px', margin: 0 },
  userBranch: { color: '#e94560', fontSize: '10px', margin: 0 },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    padding: '10px',
    gap: '4px',
    flex: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '10px',
    padding: '10px 14px',
    background: 'transparent',
    border: 'none',
    color: '#aaa',
    fontSize: '13px',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    whiteSpace: 'nowrap',
  },
  navItemActive: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '10px',
    padding: '10px 14px',
    background: 'rgba(233,69,96,0.2)',
    border: '1px solid rgba(233,69,96,0.4)',
    color: 'white',
    fontSize: '13px',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    whiteSpace: 'nowrap',
  },
  navIcon: { fontSize: '18px', flexShrink: 0 },
  logoutBtn: {
    margin: '10px',
    padding: '10px',
    background: 'rgba(233,69,96,0.2)',
    border: '1px solid rgba(233,69,96,0.4)',
    color: '#e94560',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    padding: '30px',
    transition: 'margin-left 0.3s ease',
    minWidth: 0,
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
  },
  pageTitle: { fontSize: '24px', fontWeight: '800', color: '#1a1a2e', margin: 0 },
  pageDate: { color: '#888', fontSize: '13px', margin: '4px 0 0' },
  alertBadge: {
    background: '#e94560',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '30px',
  },
  statCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  statLabel: { color: '#888', fontSize: '12px', margin: '0 0 8px' },
  statValue: { color: '#1a1a2e', fontSize: '28px', fontWeight: '800', margin: '0 0 4px' },
  statSub: { color: '#aaa', fontSize: '11px', margin: 0 },
  section: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  sectionTitle: { fontSize: '16px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 16px' },
  emptyState: { textAlign: 'center', padding: '40px', color: '#aaa', fontSize: '14px' },
  emptySubtext: { fontSize: '12px', color: '#ccc' },
  comingSoon: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  comingSoonIcon: { fontSize: '60px', margin: '0 0 10px' },
  comingSoonTitle: { fontSize: '24px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 10px' },
  comingSoonText: { color: '#aaa', fontSize: '14px' },
};