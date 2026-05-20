import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import {
  collection, onSnapshot, query, orderBy,
  addDoc, deleteDoc, doc, updateDoc,
  getDocs, setDoc, getDoc, serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

export default function Admin() {
  const { userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('settings');

  if (userRole !== 'Super Admin') {
    return (
      <div style={styles.accessDenied}>
        <p style={styles.accessIcon}>🔒</p>
        <h2 style={styles.accessTitle}>Access Denied</h2>
        <p style={styles.accessSub}>
          This module is restricted to Super Admin only.
        </p>
      </div>
    );
  }

  const tabs = [
    { id: 'settings', icon: '🏢', label: 'Business Settings' },
    { id: 'backup', icon: '💾', label: 'Backup & Export' },
    { id: 'audit', icon: '📜', label: 'Audit Log' },
    { id: 'data', icon: '🔄', label: 'Data Management' },
    { id: 'danger', icon: '⚠️', label: 'Danger Zone' },
  ];

  return (
    <div>
      <div style={styles.tabRow}>
        {tabs.map((tab) => (
          <button key={tab.id}
            style={{
              ...(activeTab === tab.id ? styles.tabActive : styles.tab),
              ...(tab.id === 'danger' && activeTab !== tab.id ? styles.tabDanger : {}),
              ...(tab.id === 'danger' && activeTab === tab.id ? styles.tabDangerActive : {}),
            }}
            onClick={() => setActiveTab(tab.id)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'settings' && <BusinessSettings />}
      {activeTab === 'backup' && <BackupExport />}
      {activeTab === 'audit' && <AuditLog />}
      {activeTab === 'data' && <DataManagement />}
      {activeTab === 'danger' && <DangerZone />}
    </div>
  );
}

// ─── BUSINESS SETTINGS ────────────────────────────────────
function BusinessSettings() {
  const { userName } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    companyName: 'Solution Enterprises',
    companyAddress: 'Lusaka, Zambia',
    currency: 'K',
    financialYearStart: '01',
    expiryWarningDays: '150',
    lowStockThreshold: '10',
    timezone: 'Africa/Lusaka',
    phone: '',
    email: '',
    website: '',
    taxNumber: '',
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const docRef = doc(db, 'systemSettings', 'config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setForm({ ...form, ...docSnap.data() });
        }
      } catch (err) { console.error(err); }
    }
    loadSettings();
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSave() {
    setLoading(true);
    try {
      await setDoc(doc(db, 'systemSettings', 'config'), {
        ...form,
        updatedBy: userName || 'Unknown',
        updatedAt: serverTimestamp(),
      });

      // Log to audit
      await addDoc(collection(db, 'auditLog'), {
        action: 'SETTINGS_UPDATED',
        description: 'Business settings updated',
        performedBy: userName || 'Unknown',
        createdAt: serverTimestamp(),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { alert(err.message); }
    setLoading(false);
  }

  const months = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' }, { value: '04', label: 'April' },
    { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' },
    { value: '09', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ];

  return (
    <div>
      {/* Company Identity */}
      <div style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>🏢 Company Information</h3>
        <p style={styles.sectionSub}>
          This information appears on printed reports and documents.
        </p>
        <div style={styles.formGrid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Company Name *</label>
            <input style={styles.input} name="companyName"
              value={form.companyName} onChange={handleChange}
              placeholder="e.g. Solution Enterprises" />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Address</label>
            <input style={styles.input} name="companyAddress"
              value={form.companyAddress} onChange={handleChange}
              placeholder="e.g. Lusaka, Zambia" />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Phone</label>
            <input style={styles.input} name="phone"
              value={form.phone} onChange={handleChange}
              placeholder="e.g. +260 977 000 000" />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} name="email"
              value={form.email} onChange={handleChange}
              placeholder="e.g. info@solution.co.zm" />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Website</label>
            <input style={styles.input} name="website"
              value={form.website} onChange={handleChange}
              placeholder="e.g. www.solution.co.zm" />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Tax / TPIN Number</label>
            <input style={styles.input} name="taxNumber"
              value={form.taxNumber} onChange={handleChange}
              placeholder="e.g. 1234567890" />
          </div>
        </div>
      </div>

      {/* System Configuration */}
      <div style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>⚙️ System Configuration</h3>
        <p style={styles.sectionSub}>
          Controls how the system calculates alerts and displays data.
        </p>
        <div style={styles.formGrid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Currency Symbol</label>
            <input style={styles.input} name="currency"
              value={form.currency} onChange={handleChange}
              placeholder="e.g. K" />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Financial Year Starts</label>
            <select style={styles.input} name="financialYearStart"
              value={form.financialYearStart} onChange={handleChange}>
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Expiry Warning Days</label>
            <input style={styles.input} name="expiryWarningDays"
              type="number" value={form.expiryWarningDays}
              onChange={handleChange}
              placeholder="Days before expiry to warn" />
            <p style={styles.inputHint}>
              Products expiring within this many days will be flagged.
            </p>
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Low Stock Threshold</label>
            <input style={styles.input} name="lowStockThreshold"
              type="number" value={form.lowStockThreshold}
              onChange={handleChange}
              placeholder="Min quantity before alert" />
            <p style={styles.inputHint}>
              Default reorder level for new products.
            </p>
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Timezone</label>
            <select style={styles.input} name="timezone"
              value={form.timezone} onChange={handleChange}>
              <option value="Africa/Lusaka">Africa/Lusaka (CAT +2)</option>
              <option value="Africa/Johannesburg">Africa/Johannesburg (SAST +2)</option>
              <option value="Africa/Nairobi">Africa/Nairobi (EAT +3)</option>
              <option value="Africa/Lagos">Africa/Lagos (WAT +1)</option>
              <option value="UTC">UTC +0</option>
            </select>
          </div>
        </div>

        <div style={{ textAlign: 'right', marginTop: '20px' }}>
          {saved && (
            <span style={styles.savedBadge}>✅ Settings saved successfully!</span>
          )}
          <button
            style={loading ? styles.saveBtnDisabled : styles.saveBtn}
            onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : '💾 Save All Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BACKUP & EXPORT ──────────────────────────────────────
function BackupExport() {
  const [exporting, setExporting] = useState('');
  const [lastExport, setLastExport] = useState(null);

  function downloadCSV(filename, headers, rows) {
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setLastExport(new Date().toLocaleString());
  }

  async function exportCollection(collectionName) {
    setExporting(collectionName);
    try {
      const snap = await getDocs(collection(db, collectionName));
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      let headers = [];
      let rows = [];

      switch (collectionName) {
        case 'products':
          headers = ['ID', 'Name', 'Category ID', 'Supplier ID', 'Buying Price', 'Selling Price', 'Unit', 'Reorder Level', 'Description'];
          rows = docs.map((d) => [d.id, d.name, d.categoryId, d.supplierId, d.buyingPrice, d.sellingPrice, d.unit, d.reorderLevel, d.description]);
          break;
        case 'stock':
          headers = ['ID', 'Product ID', 'Branch ID', 'Current Quantity', 'Expiry Date', 'Batch Number', 'Last Stock Take'];
          rows = docs.map((d) => [d.id, d.productId, d.branchId, d.currentQuantity, d.expiryDate, d.batchNumber, d.lastStockTake]);
          break;
        case 'dailyReports':
          headers = ['ID', 'Date', 'Branch', 'Total Sales', 'Total Expenses', 'Actual Cash', 'Variance', 'Submitted By'];
          rows = docs.map((d) => [d.id, d.date, d.branchName, d.totalSales, d.totalExpenses, d.actualCash, d.variance, d.submittedBy]);
          break;
        case 'salaries':
          headers = ['ID', 'Staff Name', 'Branch', 'Position', 'Amount', 'Payment Date', 'Payment Method', 'Notes'];
          rows = docs.map((d) => [d.id, d.staffName, d.branchName, d.position, d.amount, d.paymentDate, d.paymentMethod, d.notes]);
          break;
        case 'cashHandovers':
          headers = ['ID', 'Branch', 'Amount', 'Date', 'Handed By', 'Received By', 'Status', 'Notes'];
          rows = docs.map((d) => [d.id, d.branchName, d.amount, d.date, d.handedBy, d.receivedBy, d.status, d.notes]);
          break;
        case 'orders':
          headers = ['ID', 'Order Number', 'Branch', 'Status', 'Date', 'Created By', 'Notes'];
          rows = docs.map((d) => [d.id, d.orderNumber, d.branchName, d.status, d.date, d.createdBy, d.notes]);
          break;
        case 'stockAdjustments':
          headers = ['ID', 'Product ID', 'Branch ID', 'Type', 'Reason', 'Quantity', 'Previous Qty', 'New Qty', 'Note', 'Created By'];
          rows = docs.map((d) => [d.id, d.productId, d.branchId, d.type, d.reason, d.quantity, d.previousQuantity, d.newQuantity, d.note, d.createdBy]);
          break;
        case 'branches':
          headers = ['ID', 'Name', 'Location', 'Manager', 'Phone', 'Status'];
          rows = docs.map((d) => [d.id, d.name, d.location, d.manager, d.phone, d.status]);
          break;
        case 'users':
          headers = ['ID', 'Name', 'Email', 'Role', 'Branch', 'Phone', 'Status'];
          rows = docs.map((d) => [d.id, d.name, d.email, d.role, d.branch, d.phone, d.status]);
          break;
        default:
          headers = ['ID', ...Object.keys(docs[0] || {}).filter((k) => k !== 'id')];
          rows = docs.map((d) => [d.id, ...Object.values(d).slice(1).map((v) => typeof v === 'object' ? JSON.stringify(v) : v)]);
      }

      downloadCSV(`cbms_${collectionName}`, headers, rows);
    } catch (err) { alert(err.message); }
    setExporting('');
  }

  async function exportAllData() {
    setExporting('all');
    try {
      const collections = [
        'products', 'categories', 'suppliers', 'branches', 'users',
        'stock', 'stockAdjustments', 'stockTakes', 'dailyReports',
        'orders', 'salaries', 'cashHandovers', 'notifications', 'auditLog',
      ];

      const allData = {};
      for (const col of collections) {
        const snap = await getDocs(collection(db, col));
        allData[col] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }

      const jsonStr = JSON.stringify(allData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cbms_full_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setLastExport(new Date().toLocaleString());
    } catch (err) { alert(err.message); }
    setExporting('');
  }

  const exports = [
    { id: 'products', icon: '📦', label: 'Products', desc: 'All products with prices and details', color: '#0f3460' },
    { id: 'stock', icon: '📊', label: 'Stock Levels', desc: 'Current quantities per branch', color: '#28a745' },
    { id: 'dailyReports', icon: '📋', label: 'Daily Reports', desc: 'All branch daily reports', color: '#e94560' },
    { id: 'salaries', icon: '👥', label: 'Salary Records', desc: 'All salary payments made', color: '#f39c12' },
    { id: 'cashHandovers', icon: '🏦', label: 'Cash Handovers', desc: 'Branch to HQ cash transfers', color: '#9b59b6' },
    { id: 'orders', icon: '🛒', label: 'Orders', desc: 'All purchase orders', color: '#0f3460' },
    { id: 'stockAdjustments', icon: '↕️', label: 'Stock Adjustments', desc: 'Complete adjustment audit trail', color: '#28a745' },
    { id: 'branches', icon: '🏪', label: 'Branches', desc: 'All branch information', color: '#e94560' },
    { id: 'users', icon: '👤', label: 'Users', desc: 'All system user profiles', color: '#f39c12' },
  ];

  return (
    <div>
      {/* Full Backup */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.sectionTitle}>💾 Full System Backup</h3>
            <p style={styles.sectionSub}>
              Download all data as a single JSON file. Store safely on your computer or cloud drive.
            </p>
          </div>
          {lastExport && (
            <span style={styles.lastExportBadge}>
              Last export: {lastExport}
            </span>
          )}
        </div>

        <div style={styles.backupMainCard}>
          <div style={styles.backupMainLeft}>
            <span style={styles.backupMainIcon}>🗄️</span>
            <div>
              <p style={styles.backupMainTitle}>Complete Database Backup</p>
              <p style={styles.backupMainDesc}>
                Exports ALL collections including products, stock, reports, orders,
                salaries, cash handovers, users, branches, notifications and audit log.
                Download this weekly to protect your business data.
              </p>
            </div>
          </div>
          <button
            style={exporting === 'all' ? styles.saveBtnDisabled : styles.backupMainBtn}
            onClick={exportAllData} disabled={exporting === 'all'}>
            {exporting === 'all' ? '⏳ Exporting...' : '⬇️ Download Full Backup (.json)'}
          </button>
        </div>

        <div style={styles.backupTip}>
          💡 <strong>Tip:</strong> Save this file to Google Drive, Dropbox or a USB drive.
          Keep at least 3 backup copies — weekly, monthly, and before any major changes.
        </div>
      </div>

      {/* Individual Exports */}
      <div style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>📊 Export Individual Collections</h3>
        <p style={styles.sectionSub}>
          Download specific data as CSV files that open directly in Excel.
        </p>
        <div style={styles.exportGrid}>
          {exports.map((exp) => (
            <div key={exp.id} style={styles.exportCard}>
              <div style={{ ...styles.exportIcon, color: exp.color }}>{exp.icon}</div>
              <div style={styles.exportInfo}>
                <p style={styles.exportLabel}>{exp.label}</p>
                <p style={styles.exportDesc}>{exp.desc}</p>
              </div>
              <button
                style={exporting === exp.id ? styles.exportBtnDisabled : styles.exportBtn}
                onClick={() => exportCollection(exp.id)}
                disabled={exporting === exp.id}>
                {exporting === exp.id ? '⏳' : '⬇️ CSV'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── AUDIT LOG ────────────────────────────────────────────
function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [filterUser, setFilterUser] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'auditLog'), orderBy('createdAt', 'desc')),
      (snap) => setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, []);

  const actionTypes = [
    'SETTINGS_UPDATED', 'DATA_EXPORTED', 'SOFT_RESET',
    'HARD_RESET', 'NOTIFICATIONS_CLEARED', 'USER_CREATED',
    'USER_UPDATED', 'USER_DELETED', 'SALARY_ADDED',
    'CASH_HANDOVER', 'CASH_CONFIRMED', 'STOCK_ADJUSTED',
    'STOCK_TAKE', 'ORDER_APPROVED', 'ORDER_REJECTED',
    'REPORT_SUBMITTED', 'INVESTMENT_ADDED',
  ];

  const typeColors = {
    SETTINGS_UPDATED: { bg: '#f0f4ff', color: '#0f3460' },
    DATA_EXPORTED: { bg: '#e6f9ee', color: '#28a745' },
    SOFT_RESET: { bg: '#fff8e1', color: '#f39c12' },
    HARD_RESET: { bg: '#fff0f0', color: '#dc3545' },
    NOTIFICATIONS_CLEARED: { bg: '#f0f4ff', color: '#0f3460' },
    USER_CREATED: { bg: '#e6f9ee', color: '#28a745' },
    USER_UPDATED: { bg: '#f0f4ff', color: '#0f3460' },
    USER_DELETED: { bg: '#fff0f0', color: '#dc3545' },
    SALARY_ADDED: { bg: '#fff8e1', color: '#f39c12' },
    CASH_HANDOVER: { bg: '#f3e6ff', color: '#9b59b6' },
    CASH_CONFIRMED: { bg: '#e6f9ee', color: '#28a745' },
    STOCK_ADJUSTED: { bg: '#fff8e1', color: '#f39c12' },
    STOCK_TAKE: { bg: '#f0f4ff', color: '#0f3460' },
    ORDER_APPROVED: { bg: '#e6f9ee', color: '#28a745' },
    ORDER_REJECTED: { bg: '#fff0f0', color: '#dc3545' },
    REPORT_SUBMITTED: { bg: '#f0f4ff', color: '#0f3460' },
    INVESTMENT_ADDED: { bg: '#e6f9ee', color: '#28a745' },
  };

  const users = [...new Set(logs.map((l) => l.performedBy).filter(Boolean))];

  let filtered = logs;
  if (filterUser) filtered = filtered.filter((l) => l.performedBy === filterUser);
  if (filterType) filtered = filtered.filter((l) => l.action === filterType);

  return (
    <div style={styles.sectionCard}>
      <div style={styles.sectionHeader}>
        <div>
          <h3 style={styles.sectionTitle}>📜 Audit Log</h3>
          <p style={styles.sectionSub}>
            Complete record of all system actions. {logs.length} events logged.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filterRow}>
        <select style={styles.filterSelect} value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}>
          <option value="">All Users</option>
          {users.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select style={styles.filterSelect} value={filterType}
          onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Action Types</option>
          {actionTypes.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
        {(filterUser || filterType) && (
          <button style={styles.clearBtn}
            onClick={() => { setFilterUser(''); setFilterType(''); }}>
            ✕ Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={styles.empty}>
          No audit log entries yet. Actions will be recorded here as the system is used.
        </div>
      ) : (
        <div style={styles.auditList}>
          {filtered.map((log) => {
            const typeStyle = typeColors[log.action] || { bg: '#f0f0f0', color: '#666' };
            return (
              <div key={log.id} style={styles.auditItem}>
                <div style={styles.auditLeft}>
                  <span style={{
                    ...styles.auditBadge,
                    background: typeStyle.bg,
                    color: typeStyle.color,
                  }}>
                    {log.action?.replace(/_/g, ' ')}
                  </span>
                  <p style={styles.auditDesc}>{log.description}</p>
                </div>
                <div style={styles.auditRight}>
                  <p style={styles.auditUser}>👤 {log.performedBy}</p>
                  <p style={styles.auditTime}>
                    {log.createdAt?.seconds
                      ? new Date(log.createdAt.seconds * 1000).toLocaleString()
                      : 'Just now'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── DATA MANAGEMENT ──────────────────────────────────────
function DataManagement() {
  const { userName } = useAuth();
  const [loading, setLoading] = useState('');
  const [stats, setStats] = useState({});

  useEffect(() => {
    async function loadStats() {
      const collections = [
        'notifications', 'auditLog', 'broadcasts',
        'stockAdjustments', 'stockTakes', 'dailyReports', 'orders',
      ];
      const results = {};
      for (const col of collections) {
        try {
          const snap = await getDocs(collection(db, col));
          results[col] = snap.size;
        } catch { results[col] = 0; }
      }
      setStats(results);
    }
    loadStats();
  }, [loading]);

  async function clearNotifications(daysOld) {
    setLoading(`notif_${daysOld}`);
    try {
      const snap = await getDocs(collection(db, 'notifications'));
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysOld);
      let count = 0;
      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        const data = d.data();
        const createdAt = data.createdAt?.seconds
          ? new Date(data.createdAt.seconds * 1000) : null;
        if (createdAt && createdAt < cutoff) {
          batch.delete(d.ref);
          count++;
        }
      });
      await batch.commit();
      await addDoc(collection(db, 'auditLog'), {
        action: 'NOTIFICATIONS_CLEARED',
        description: `Cleared ${count} notifications older than ${daysOld} days`,
        performedBy: userName || 'Unknown',
        createdAt: serverTimestamp(),
      });
      alert(`✅ Cleared ${count} notifications older than ${daysOld} days.`);
    } catch (err) { alert(err.message); }
    setLoading('');
  }

  async function clearReadNotifications() {
    setLoading('read_notif');
    try {
      const snap = await getDocs(collection(db, 'notifications'));
      const batch = writeBatch(db);
      let count = 0;
      snap.docs.forEach((d) => {
        if (d.data().read === true) { batch.delete(d.ref); count++; }
      });
      await batch.commit();
      await addDoc(collection(db, 'auditLog'), {
        action: 'NOTIFICATIONS_CLEARED',
        description: `Cleared ${count} read notifications`,
        performedBy: userName || 'Unknown',
        createdAt: serverTimestamp(),
      });
      alert(`✅ Cleared ${count} read notifications.`);
    } catch (err) { alert(err.message); }
    setLoading('');
  }

  async function clearOldAuditLog() {
    setLoading('audit');
    try {
      const snap = await getDocs(collection(db, 'auditLog'));
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const batch = writeBatch(db);
      let count = 0;
      snap.docs.forEach((d) => {
        const createdAt = d.data().createdAt?.seconds
          ? new Date(d.data().createdAt.seconds * 1000) : null;
        if (createdAt && createdAt < cutoff) { batch.delete(d.ref); count++; }
      });
      await batch.commit();
      alert(`✅ Cleared ${count} audit log entries older than 90 days.`);
    } catch (err) { alert(err.message); }
    setLoading('');
  }

  const statItems = [
    { key: 'notifications', label: 'Notifications', icon: '🔔', color: '#0f3460' },
    { key: 'auditLog', label: 'Audit Log Entries', icon: '📜', color: '#28a745' },
    { key: 'broadcasts', label: 'Broadcasts', icon: '📢', color: '#f39c12' },
    { key: 'stockAdjustments', label: 'Stock Adjustments', icon: '↕️', color: '#e94560' },
    { key: 'stockTakes', label: 'Stock Takes', icon: '🔍', color: '#9b59b6' },
    { key: 'dailyReports', label: 'Daily Reports', icon: '📋', color: '#0f3460' },
    { key: 'orders', label: 'Orders', icon: '🛒', color: '#28a745' },
  ];

  return (
    <div>
      {/* System Stats */}
      <div style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>📊 Database Statistics</h3>
        <p style={styles.sectionSub}>Current record counts across all collections.</p>
        <div style={styles.statsGrid}>
          {statItems.map((item) => (
            <div key={item.key} style={{ ...styles.statCard, borderTop: `3px solid ${item.color}` }}>
              <p style={{ fontSize: '24px', margin: '0 0 4px' }}>{item.icon}</p>
              <p style={{ ...styles.statValue, color: item.color }}>{stats[item.key] ?? '—'}</p>
              <p style={styles.statLabel}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Notification Management */}
      <div style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>🔔 Notification Management</h3>
        <p style={styles.sectionSub}>
          Clear old notifications to keep the system clean and fast.
          Currently {stats.notifications || 0} notifications in database.
        </p>
        <div style={styles.actionGrid}>
          <div style={styles.actionCard}>
            <p style={styles.actionTitle}>Clear Read Notifications</p>
            <p style={styles.actionDesc}>Remove all notifications that have been marked as read.</p>
            <button
              style={loading === 'read_notif' ? styles.actionBtnDisabled : styles.actionBtn}
              onClick={clearReadNotifications} disabled={loading === 'read_notif'}>
              {loading === 'read_notif' ? '⏳ Clearing...' : '🧹 Clear Read'}
            </button>
          </div>
          <div style={styles.actionCard}>
            <p style={styles.actionTitle}>Clear 30+ Day Old</p>
            <p style={styles.actionDesc}>Remove notifications older than 30 days.</p>
            <button
              style={loading === 'notif_30' ? styles.actionBtnDisabled : styles.actionBtn}
              onClick={() => clearNotifications(30)} disabled={loading === 'notif_30'}>
              {loading === 'notif_30' ? '⏳ Clearing...' : '🧹 Clear 30+ Days'}
            </button>
          </div>
          <div style={styles.actionCard}>
            <p style={styles.actionTitle}>Clear 60+ Day Old</p>
            <p style={styles.actionDesc}>Remove notifications older than 60 days.</p>
            <button
              style={loading === 'notif_60' ? styles.actionBtnDisabled : styles.actionBtn}
              onClick={() => clearNotifications(60)} disabled={loading === 'notif_60'}>
              {loading === 'notif_60' ? '⏳ Clearing...' : '🧹 Clear 60+ Days'}
            </button>
          </div>
          <div style={styles.actionCard}>
            <p style={styles.actionTitle}>Clear 90+ Day Old</p>
            <p style={styles.actionDesc}>Remove notifications older than 90 days. Recommended monthly.</p>
            <button
              style={loading === 'notif_90' ? styles.actionBtnDisabled : styles.actionBtn}
              onClick={() => clearNotifications(90)} disabled={loading === 'notif_90'}>
              {loading === 'notif_90' ? '⏳ Clearing...' : '🧹 Clear 90+ Days'}
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log Maintenance */}
      <div style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>📜 Audit Log Maintenance</h3>
        <p style={styles.sectionSub}>
          Clear old audit log entries to save database space.
          Currently {stats.auditLog || 0} entries. Recommended: keep last 90 days.
        </p>
        <button
          style={loading === 'audit' ? styles.actionBtnDisabled : styles.actionBtn}
          onClick={clearOldAuditLog} disabled={loading === 'audit'}>
          {loading === 'audit' ? '⏳ Clearing...' : '🧹 Clear Audit Log Older Than 90 Days'}
        </button>
      </div>
    </div>
  );
}

// ─── DANGER ZONE ──────────────────────────────────────────
function DangerZone() {
  const { userName } = useAuth();
  const [softLoading, setSoftLoading] = useState(false);
  const [hardLoading, setHardLoading] = useState(false);
  const [hardConfirmText, setHardConfirmText] = useState('');
  const [showHardModal, setShowHardModal] = useState(false);
  const [showSoftModal, setShowSoftModal] = useState(false);

  async function handleSoftReset() {
    setSoftLoading(true);
    try {
      const collectionsToDelete = [
        'dailyReports', 'orders', 'stockAdjustments',
        'stockTakes', 'cashHandovers', 'notifications',
        'broadcasts', 'investments', 'salaries',
        'purchaseOrders',
      ];

      let totalDeleted = 0;
      for (const col of collectionsToDelete) {
        const snap = await getDocs(collection(db, col));
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        totalDeleted += snap.size;
      }

      // Reset stock quantities to 0
      const stockSnap = await getDocs(collection(db, 'stock'));
      const stockBatch = writeBatch(db);
      stockSnap.docs.forEach((d) => {
        stockBatch.update(d.ref, { currentQuantity: 0 });
      });
      await stockBatch.commit();

      await addDoc(collection(db, 'auditLog'), {
        action: 'SOFT_RESET',
        description: `Soft reset performed. ${totalDeleted} records cleared. Stock quantities reset to 0. Products, branches, users and categories preserved.`,
        performedBy: userName || 'Unknown',
        createdAt: serverTimestamp(),
      });

      setShowSoftModal(false);
      alert(`✅ Soft reset complete. ${totalDeleted} records cleared. Products, branches and users are intact.`);
    } catch (err) { alert(err.message); }
    setSoftLoading(false);
  }

  async function handleHardReset() {
    if (hardConfirmText !== 'DELETE ALL DATA') {
      return alert('Type DELETE ALL DATA exactly to confirm.');
    }
    setHardLoading(true);
    try {
      const allCollections = [
        'dailyReports', 'orders', 'stockAdjustments', 'stockTakes',
        'cashHandovers', 'notifications', 'broadcasts', 'investments',
        'salaries', 'purchaseOrders', 'stock', 'products', 'categories',
        'suppliers', 'branches', 'users', 'systemSettings',
        'branchChats', 'auditLog',
      ];

      for (const col of allCollections) {
        const snap = await getDocs(collection(db, col));
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      setShowHardModal(false);
      setHardConfirmText('');
      alert('⚠️ Full system reset complete. All data has been permanently deleted. Please refresh the page.');
    } catch (err) { alert(err.message); }
    setHardLoading(false);
  }

  return (
    <div>
      {/* Warning Banner */}
      <div style={styles.dangerBanner}>
        <span style={styles.dangerBannerIcon}>⚠️</span>
        <div>
          <p style={styles.dangerBannerTitle}>Danger Zone — Irreversible Actions</p>
          <p style={styles.dangerBannerDesc}>
            Actions in this section permanently delete data and cannot be undone.
            Always download a full backup before proceeding.
          </p>
        </div>
      </div>

      {/* Soft Reset */}
      <div style={{ ...styles.sectionCard, border: '1px solid #ffe082' }}>
        <div style={styles.dangerCardHeader}>
          <div>
            <h3 style={{ ...styles.sectionTitle, color: '#f39c12' }}>
              🔄 Soft Reset — Clear Test Data
            </h3>
            <p style={styles.sectionSub}>
              Clears all operational data but keeps your setup intact.
              Use this to clear test data before going live.
            </p>
          </div>
          <button style={styles.softResetBtn}
            onClick={() => setShowSoftModal(true)}>
            🔄 Soft Reset
          </button>
        </div>

        <div style={styles.dangerList}>
          <div style={styles.dangerCol}>
            <p style={styles.dangerColTitle}>❌ Will be deleted:</p>
            {['Daily Reports', 'Orders & Purchase Orders', 'Stock Adjustments', 'Stock Takes', 'Cash Handovers', 'Notifications', 'Broadcasts', 'Salaries', 'Investments'].map((item) => (
              <p key={item} style={styles.dangerDeleteItem}>🗑️ {item}</p>
            ))}
            <p style={styles.dangerDeleteItem}>📊 Stock quantities reset to 0</p>
          </div>
          <div style={styles.dangerCol}>
            <p style={styles.dangerColTitle}>✅ Will be kept:</p>
            {['Products & Categories', 'Suppliers', 'Branches', 'Users & Roles', 'System Settings', 'Audit Log'].map((item) => (
              <p key={item} style={styles.dangerKeepItem}>✅ {item}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Hard Reset */}
      <div style={{ ...styles.sectionCard, border: '2px solid #dc3545' }}>
        <div style={styles.dangerCardHeader}>
          <div>
            <h3 style={{ ...styles.sectionTitle, color: '#dc3545' }}>
              ☢️ Hard Reset — Full System Wipe
            </h3>
            <p style={styles.sectionSub}>
              Permanently deletes EVERYTHING. The system will be completely empty.
              This cannot be undone under any circumstances.
            </p>
          </div>
          <button style={styles.hardResetBtn}
            onClick={() => setShowHardModal(true)}>
            ☢️ Full Reset
          </button>
        </div>
        <div style={styles.hardResetWarning}>
          🚨 This will delete: All products, all stock, all reports, all users, all branches,
          all orders, all financial records, all settings — EVERYTHING. There is no recovery.
        </div>
      </div>

      {/* Soft Reset Modal */}
      {showSoftModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalWarningHeader}>
              <span style={{ fontSize: '40px' }}>🔄</span>
              <h3 style={styles.modalWarningTitle}>Confirm Soft Reset</h3>
            </div>
            <p style={styles.modalWarningDesc}>
              This will permanently delete all operational data including reports,
              orders, adjustments, salaries and notifications.
              Products, branches and users will be kept.
            </p>
            <p style={styles.modalWarningDesc}>
              <strong>Have you downloaded a backup first?</strong>
            </p>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowSoftModal(false)}>
                Cancel
              </button>
              <button
                style={softLoading ? styles.saveBtnDisabled : styles.softResetBtn}
                onClick={handleSoftReset} disabled={softLoading}>
                {softLoading ? '⏳ Resetting...' : '🔄 Yes, Soft Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hard Reset Modal */}
      {showHardModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={{ ...styles.modalWarningHeader, background: '#fff0f0' }}>
              <span style={{ fontSize: '40px' }}>☢️</span>
              <h3 style={{ ...styles.modalWarningTitle, color: '#dc3545' }}>
                FULL SYSTEM RESET
              </h3>
            </div>
            <p style={styles.modalWarningDesc}>
              🚨 <strong>WARNING:</strong> This will permanently and irreversibly
              delete ALL data in the system. There is absolutely no way to recover
              this data once deleted.
            </p>
            <p style={styles.modalWarningDesc}>
              To confirm, type exactly: <strong>DELETE ALL DATA</strong>
            </p>
            <input
              style={{ ...styles.input, border: '2px solid #dc3545', marginBottom: '16px' }}
              placeholder="Type: DELETE ALL DATA"
              value={hardConfirmText}
              onChange={(e) => setHardConfirmText(e.target.value)}
            />
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn}
                onClick={() => { setShowHardModal(false); setHardConfirmText(''); }}>
                Cancel
              </button>
              <button
                style={hardConfirmText !== 'DELETE ALL DATA' || hardLoading
                  ? styles.saveBtnDisabled : styles.hardResetBtn}
                onClick={handleHardReset}
                disabled={hardConfirmText !== 'DELETE ALL DATA' || hardLoading}>
                {hardLoading ? '⏳ Deleting Everything...' : '☢️ DELETE EVERYTHING'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────
const styles = {
  accessDenied: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', background: 'white', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  accessIcon: { fontSize: '60px', margin: '0 0 10px' },
  accessTitle: { fontSize: '24px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 8px' },
  accessSub: { color: '#aaa', fontSize: '14px' },
  tabRow: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
  tab: { padding: '10px 20px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: '#666' },
  tabActive: { padding: '10px 20px', background: 'linear-gradient(135deg, #0f3460, #e94560)', border: '2px solid transparent', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: 'white', fontWeight: '700' },
  tabDanger: { padding: '10px 20px', background: 'white', border: '2px solid #dc3545', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: '#dc3545', fontWeight: '600' },
  tabDangerActive: { padding: '10px 20px', background: '#dc3545', border: '2px solid #dc3545', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: 'white', fontWeight: '700' },
  sectionCard: { background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '20px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  sectionTitle: { fontSize: '18px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 4px' },
  sectionSub: { fontSize: '13px', color: '#888', margin: 0 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#555' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '2px solid #e0e0e0', fontSize: '14px', outline: 'none' },
  inputHint: { fontSize: '11px', color: '#aaa', margin: '4px 0 0' },
  saveBtn: { padding: '12px 28px', background: 'linear-gradient(135deg, #0f3460, #e94560)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  saveBtnDisabled: { padding: '12px 28px', background: '#ccc', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'not-allowed' },
  cancelBtn: { padding: '10px 20px', background: '#f0f0f0', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: '#666' },
  savedBadge: { background: '#e6f9ee', color: '#28a745', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', marginRight: '12px' },
  lastExportBadge: { background: '#f0f4ff', color: '#0f3460', padding: '6px 14px', borderRadius: '20px', fontSize: '12px' },
  backupMainCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #f0f4ff, #e6f9ee)', borderRadius: '12px', padding: '20px', border: '1px solid #d0e0ff', marginBottom: '16px', gap: '20px', flexWrap: 'wrap' },
  backupMainLeft: { display: 'flex', gap: '16px', alignItems: 'flex-start', flex: 1 },
  backupMainIcon: { fontSize: '40px' },
  backupMainTitle: { fontSize: '16px', fontWeight: '800', color: '#0f3460', margin: '0 0 4px' },
  backupMainDesc: { fontSize: '13px', color: '#555', margin: 0, lineHeight: '1.5' },
  backupMainBtn: { padding: '12px 24px', background: 'linear-gradient(135deg, #0f3460, #28a745)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' },
  backupTip: { background: '#fff8e1', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#856404', border: '1px solid #ffe082' },
  exportGrid: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' },
  exportCard: { display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px', background: '#fafafa', borderRadius: '10px', border: '1px solid #f0f0f0' },
  exportIcon: { fontSize: '24px', flexShrink: 0 },
  exportInfo: { flex: 1 },
  exportLabel: { fontSize: '14px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  exportDesc: { fontSize: '12px', color: '#888', margin: '2px 0 0' },
  exportBtn: { padding: '8px 16px', background: '#0f3460', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
  exportBtnDisabled: { padding: '8px 16px', background: '#ccc', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'not-allowed', whiteSpace: 'nowrap' },
  filterRow: { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  filterSelect: { padding: '8px 14px', borderRadius: '8px', border: '2px solid #e0e0e0', fontSize: '14px', outline: 'none' },
  clearBtn: { padding: '8px 16px', background: '#fff0f0', color: '#dc3545', border: '1px solid #ffcccc', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' },
  auditList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  auditItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 16px', background: '#fafafa', borderRadius: '8px', border: '1px solid #f0f0f0', gap: '16px', flexWrap: 'wrap' },
  auditLeft: { flex: 1 },
  auditBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', marginBottom: '4px' },
  auditDesc: { fontSize: '13px', color: '#444', margin: 0 },
  auditRight: { textAlign: 'right', flexShrink: 0 },
  auditUser: { fontSize: '12px', fontWeight: '600', color: '#0f3460', margin: 0 },
  auditTime: { fontSize: '11px', color: '#aaa', margin: '2px 0 0' },
  empty: { textAlign: 'center', padding: '40px', color: '#aaa', fontSize: '14px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '0' },
  statCard: { background: 'white', borderRadius: '10px', padding: '16px', textAlign: 'center', border: '1px solid #f0f0f0' },
  statValue: { fontSize: '28px', fontWeight: '800', margin: '0 0 4px' },
  statLabel: { fontSize: '11px', color: '#888', margin: 0 },
  actionGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '16px' },
  actionCard: { background: '#fafafa', borderRadius: '10px', padding: '16px', border: '1px solid #f0f0f0' },
  actionTitle: { fontSize: '14px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 4px' },
  actionDesc: { fontSize: '12px', color: '#888', margin: '0 0 12px' },
  actionBtn: { padding: '8px 16px', background: '#f0f4ff', color: '#0f3460', border: '1px solid #d0e0ff', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  actionBtnDisabled: { padding: '8px 16px', background: '#f0f0f0', color: '#aaa', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'not-allowed' },
  dangerBanner: { background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start' },
  dangerBannerIcon: { fontSize: '28px', flexShrink: 0 },
  dangerBannerTitle: { fontSize: '15px', fontWeight: '800', color: '#dc3545', margin: '0 0 4px' },
  dangerBannerDesc: { fontSize: '13px', color: '#888', margin: 0 },
  dangerCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '16px' },
  dangerList: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  dangerCol: {},
  dangerColTitle: { fontSize: '13px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 8px' },
  dangerDeleteItem: { fontSize: '12px', color: '#dc3545', margin: '4px 0' },
  dangerKeepItem: { fontSize: '12px', color: '#28a745', margin: '4px 0' },
  hardResetWarning: { background: '#fff0f0', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#dc3545', fontWeight: '600', border: '1px solid #ffcccc' },
  softResetBtn: { padding: '10px 20px', background: '#fff8e1', color: '#f39c12', border: '2px solid #f39c12', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' },
  hardResetBtn: { padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modal: { background: 'white', borderRadius: '16px', padding: '30px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' },
  modalWarningHeader: { background: '#fff8e1', borderRadius: '10px', padding: '16px', textAlign: 'center', marginBottom: '20px' },
  modalWarningTitle: { fontSize: '20px', fontWeight: '800', color: '#f39c12', margin: '8px 0 0' },
  modalWarningDesc: { fontSize: '14px', color: '#555', margin: '0 0 12px', lineHeight: '1.6' },
  modalActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' },
};