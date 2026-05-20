import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import {
  collection, onSnapshot, query, orderBy,
  addDoc, deleteDoc, doc, updateDoc, serverTimestamp,
} from 'firebase/firestore';

export default function Finance() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', icon: '💰', label: 'Dashboard' },
    { id: 'expenses', icon: '📋', label: 'Expense Analysis' },
    { id: 'profitability', icon: '📈', label: 'Profitability' },
    { id: 'salaries', icon: '👥', label: 'Salaries' },
    { id: 'cash', icon: '🏦', label: 'Cash Management' },
    { id: 'reports', icon: '🖨️', label: 'Reports' },
  ];

  return (
    <div>
      <div style={styles.tabRow}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            style={activeTab === tab.id ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && <FinanceDashboard />}
      {activeTab === 'expenses' && <ExpenseAnalysis />}
      {activeTab === 'profitability' && <Profitability />}
      {activeTab === 'salaries' && <Salaries />}
      {activeTab === 'cash' && <CashManagement />}
      {activeTab === 'reports' && <FinanceReports />}
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────
function getPeriodDates(period) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  if (period === 'today') return { start: todayStr, end: todayStr };
  if (period === 'week') {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return { start: start.toISOString().split('T')[0], end: todayStr };
  }
  if (period === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: start.toISOString().split('T')[0], end: todayStr };
  }
  return { start: todayStr, end: todayStr };
}

function filterByPeriod(reports, period) {
  const { start, end } = getPeriodDates(period);
  return reports.filter((r) => r.date >= start && r.date <= end);
}

// ─── FINANCE DASHBOARD ────────────────────────────────────
function FinanceDashboard() {
  const [reports, setReports] = useState([]);
  const [branches, setBranches] = useState([]);
  const [period, setPeriod] = useState('today');

  useEffect(() => {
    const unsubR = onSnapshot(
      query(collection(db, 'dailyReports'), orderBy('createdAt', 'desc')),
      (snap) => setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubB = onSnapshot(collection(db, 'branches'), (snap) => {
      setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubR(); unsubB(); };
  }, []);

  const filtered = filterByPeriod(reports, period);
  const totalSales = filtered.reduce((s, r) => s + (r.totalSales || 0), 0);
  const totalExpenses = filtered.reduce((s, r) => s + (r.totalExpenses || 0), 0);
  const grossProfit = totalSales - totalExpenses;
  const totalCash = filtered.reduce((s, r) => s + (r.actualCash || 0), 0);
  const totalVariance = filtered.reduce((s, r) => s + (r.variance || 0), 0);

  function getBranchStats(branchId) {
    const branchReports = filtered.filter((r) => r.branchId === branchId);
    const sales = branchReports.reduce((s, r) => s + (r.totalSales || 0), 0);
    const expenses = branchReports.reduce((s, r) => s + (r.totalExpenses || 0), 0);
    const profit = sales - expenses;
    const cash = branchReports.reduce((s, r) => s + (r.actualCash || 0), 0);
    const variance = branchReports.reduce((s, r) => s + (r.variance || 0), 0);
    const reportCount = branchReports.length;
    return { sales, expenses, profit, cash, variance, reportCount };
  }

  const periodLabel = { today: 'Today', week: 'This Week', month: 'This Month' };

  return (
    <div>
      <div style={styles.periodRow}>
        {['today', 'week', 'month'].map((p) => (
          <button key={p}
            style={period === p ? styles.periodActive : styles.periodBtn}
            onClick={() => setPeriod(p)}>
            {periodLabel[p]}
          </button>
        ))}
      </div>

      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, borderTop: '4px solid #0f3460' }}>
          <p style={styles.statLabel}>💰 Total Sales</p>
          <p style={styles.statValue}>K {totalSales.toFixed(2)}</p>
          <p style={styles.statSub}>{periodLabel[period]}</p>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #e94560' }}>
          <p style={styles.statLabel}>📋 Total Expenses</p>
          <p style={{ ...styles.statValue, color: '#e94560' }}>K {totalExpenses.toFixed(2)}</p>
          <p style={styles.statSub}>{periodLabel[period]}</p>
        </div>
        <div style={{ ...styles.statCard, borderTop: `4px solid ${grossProfit >= 0 ? '#28a745' : '#dc3545'}` }}>
          <p style={styles.statLabel}>📈 Gross Profit</p>
          <p style={{ ...styles.statValue, color: grossProfit >= 0 ? '#28a745' : '#dc3545' }}>
            K {grossProfit.toFixed(2)}
          </p>
          <p style={styles.statSub}>
            {totalSales > 0 ? `${((grossProfit / totalSales) * 100).toFixed(1)}% margin` : 'No sales yet'}
          </p>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #f39c12' }}>
          <p style={styles.statLabel}>🏦 Cash in Hand</p>
          <p style={{ ...styles.statValue, color: '#f39c12' }}>K {totalCash.toFixed(2)}</p>
          <p style={styles.statSub}>Across all branches</p>
        </div>
      </div>

      {totalVariance < 0 && (
        <div style={styles.alertBox}>
          ⚠️ Total cash variance of <strong>K {Math.abs(totalVariance).toFixed(2)}</strong> detected. Please investigate.
        </div>
      )}

      <div style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>📍 Branch Financial Breakdown</h3>
        <p style={styles.sectionSub}>{periodLabel[period]} performance per branch.</p>
        {filtered.length === 0 ? (
          <div style={styles.empty}>No reports submitted for this period yet.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHead}>
                  <th style={styles.th}>Branch</th>
                  <th style={styles.th}>Reports</th>
                  <th style={styles.th}>Sales (K)</th>
                  <th style={styles.th}>Expenses (K)</th>
                  <th style={styles.th}>Gross Profit (K)</th>
                  <th style={styles.th}>Margin</th>
                  <th style={styles.th}>Cash in Hand</th>
                  <th style={styles.th}>Variance</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch, i) => {
                  const stats = getBranchStats(branch.id);
                  if (stats.reportCount === 0) return null;
                  const margin = stats.sales > 0 ? ((stats.profit / stats.sales) * 100).toFixed(1) : 0;
                  return (
                    <tr key={branch.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={{ ...styles.td, fontWeight: '700' }}>{branch.name}</td>
                      <td style={styles.td}>{stats.reportCount}</td>
                      <td style={styles.td}>K {stats.sales.toFixed(2)}</td>
                      <td style={{ ...styles.td, color: '#e94560' }}>K {stats.expenses.toFixed(2)}</td>
                      <td style={{ ...styles.td, fontWeight: '700', color: stats.profit >= 0 ? '#28a745' : '#dc3545' }}>
                        K {stats.profit.toFixed(2)}
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, background: parseFloat(margin) >= 20 ? '#e6f9ee' : '#fff0f0', color: parseFloat(margin) >= 20 ? '#28a745' : '#dc3545' }}>
                          {margin}%
                        </span>
                      </td>
                      <td style={styles.td}>K {stats.cash.toFixed(2)}</td>
                      <td style={{ ...styles.td, fontWeight: '700', color: stats.variance < 0 ? '#dc3545' : '#28a745' }}>
                        K {stats.variance.toFixed(2)}{stats.variance < 0 && ' ⚠️'}
                      </td>
                    </tr>
                  );
                })}
                <tr style={styles.totalRow}>
                  <td style={{ ...styles.td, fontWeight: '800' }}>TOTAL</td>
                  <td style={styles.td}>{filtered.length}</td>
                  <td style={{ ...styles.td, fontWeight: '800' }}>K {totalSales.toFixed(2)}</td>
                  <td style={{ ...styles.td, fontWeight: '800', color: '#e94560' }}>K {totalExpenses.toFixed(2)}</td>
                  <td style={{ ...styles.td, fontWeight: '800', color: grossProfit >= 0 ? '#28a745' : '#dc3545' }}>K {grossProfit.toFixed(2)}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, background: '#f0f4ff', color: '#0f3460' }}>
                      {totalSales > 0 ? `${((grossProfit / totalSales) * 100).toFixed(1)}%` : '0%'}
                    </span>
                  </td>
                  <td style={{ ...styles.td, fontWeight: '800' }}>K {totalCash.toFixed(2)}</td>
                  <td style={{ ...styles.td, fontWeight: '800', color: totalVariance < 0 ? '#dc3545' : '#28a745' }}>K {totalVariance.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── EXPENSE ANALYSIS ─────────────────────────────────────
function ExpenseAnalysis() {
  const [reports, setReports] = useState([]);
  const [branches, setBranches] = useState([]);
  const [period, setPeriod] = useState('today');
  const [filterBranch, setFilterBranch] = useState('');

  useEffect(() => {
    const unsubR = onSnapshot(query(collection(db, 'dailyReports'), orderBy('createdAt', 'desc')),
      (snap) => setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubB = onSnapshot(collection(db, 'branches'),
      (snap) => setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { unsubR(); unsubB(); };
  }, []);

  const periodLabel = { today: 'Today', week: 'This Week', month: 'This Month' };
  let filtered = filterByPeriod(reports, period);
  if (filterBranch) filtered = filtered.filter((r) => r.branchId === filterBranch);

  const categoryMap = {};
  filtered.forEach((report) => {
    (report.expenses || []).forEach((expense) => {
      if (!expense.description || !expense.amount) return;
      const key = expense.description.trim();
      if (!categoryMap[key]) categoryMap[key] = 0;
      categoryMap[key] += parseFloat(expense.amount) || 0;
    });
  });

  const categories = Object.entries(categoryMap).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  const totalExpenses = categories.reduce((s, c) => s + c.amount, 0);

  function getBranchExpenses(branchId) {
    return filtered.filter((r) => r.branchId === branchId).reduce((s, r) => s + (r.totalExpenses || 0), 0);
  }

  return (
    <div>
      <div style={styles.filterRow}>
        <div style={styles.periodRow}>
          {['today', 'week', 'month'].map((p) => (
            <button key={p} style={period === p ? styles.periodActive : styles.periodBtn} onClick={() => setPeriod(p)}>
              {periodLabel[p]}
            </button>
          ))}
        </div>
        <select style={styles.filterSelect} value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
          <option value="">All Branches</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div style={{ ...styles.sectionCard, marginBottom: '20px' }}>
        <h3 style={styles.sectionTitle}>📋 Total Expenses — {periodLabel[period]}</h3>
        <p style={styles.bigNumber}>K {totalExpenses.toFixed(2)}</p>
        {categories.length === 0 ? (
          <div style={styles.empty}>No expense data for this period.</div>
        ) : (
          <div style={styles.categoryList}>
            {categories.map((cat, i) => {
              const pct = totalExpenses > 0 ? ((cat.amount / totalExpenses) * 100).toFixed(1) : 0;
              return (
                <div key={i} style={styles.categoryItem}>
                  <div style={styles.categoryHeader}>
                    <span style={styles.categoryName}>{cat.name}</span>
                    <span style={styles.categoryAmount}>K {cat.amount.toFixed(2)} ({pct}%)</span>
                  </div>
                  <div style={styles.progressBar}>
                    <div style={{ ...styles.progressFill, width: `${pct}%`, background: i % 3 === 0 ? '#0f3460' : i % 3 === 1 ? '#e94560' : '#f39c12' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>🏪 Expenses by Branch</h3>
        {branches.map((branch, i) => {
          const amount = getBranchExpenses(branch.id);
          if (amount === 0) return null;
          const pct = totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0;
          return (
            <div key={branch.id} style={styles.categoryItem}>
              <div style={styles.categoryHeader}>
                <span style={styles.categoryName}>🏪 {branch.name}</span>
                <span style={styles.categoryAmount}>K {amount.toFixed(2)} ({pct}%)</span>
              </div>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${pct}%`, background: '#0f3460' }} />
              </div>
            </div>
          );
        })}
        {totalExpenses === 0 && <div style={styles.empty}>No expense data for this period.</div>}
      </div>
    </div>
  );
}

// ─── PROFITABILITY ────────────────────────────────────────
function Profitability() {
  const [reports, setReports] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    const unsubR = onSnapshot(query(collection(db, 'dailyReports'), orderBy('createdAt', 'desc')),
      (snap) => setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubB = onSnapshot(collection(db, 'branches'),
      (snap) => setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubP = onSnapshot(collection(db, 'products'),
      (snap) => setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { unsubR(); unsubB(); unsubP(); };
  }, []);

  const periodLabel = { today: 'Today', week: 'This Week', month: 'This Month' };
  const filtered = filterByPeriod(reports, period);

  function getBranchProfit(branchId) {
    const branchReports = filtered.filter((r) => r.branchId === branchId);
    const sales = branchReports.reduce((s, r) => s + (r.totalSales || 0), 0);
    const expenses = branchReports.reduce((s, r) => s + (r.totalExpenses || 0), 0);
    return { sales, expenses, profit: sales - expenses };
  }

  const branchStats = branches.map((b) => ({ ...b, ...getBranchProfit(b.id) }))
    .filter((b) => b.sales > 0).sort((a, b) => b.profit - a.profit);

  const bestBranch = branchStats[0];
  const worstBranch = branchStats[branchStats.length - 1];

  const productMargins = products.map((p) => {
    const margin = p.sellingPrice && p.buyingPrice
      ? (((p.sellingPrice - p.buyingPrice) / p.buyingPrice) * 100).toFixed(1) : null;
    return { ...p, margin: parseFloat(margin), profitPerUnit: (p.sellingPrice || 0) - (p.buyingPrice || 0) };
  }).sort((a, b) => b.margin - a.margin);

  return (
    <div>
      <div style={styles.periodRow}>
        {['today', 'week', 'month'].map((p) => (
          <button key={p} style={period === p ? styles.periodActive : styles.periodBtn} onClick={() => setPeriod(p)}>
            {periodLabel[p]}
          </button>
        ))}
      </div>

      {branchStats.length > 0 && (
        <div style={styles.highlightGrid}>
          <div style={{ ...styles.highlightCard, borderTop: '4px solid #28a745' }}>
            <p style={styles.highlightLabel}>🏆 Best Performing Branch</p>
            <p style={styles.highlightBranch}>{bestBranch?.name}</p>
            <p style={styles.highlightValue}>K {bestBranch?.profit.toFixed(2)} profit</p>
            <p style={styles.highlightSub}>{bestBranch?.sales > 0 ? `${((bestBranch.profit / bestBranch.sales) * 100).toFixed(1)}% margin` : ''}</p>
          </div>
          <div style={{ ...styles.highlightCard, borderTop: '4px solid #f39c12' }}>
            <p style={styles.highlightLabel}>📉 Needs Attention</p>
            <p style={styles.highlightBranch}>{worstBranch?.name}</p>
            <p style={{ ...styles.highlightValue, color: worstBranch?.profit < 0 ? '#dc3545' : '#f39c12' }}>
              K {worstBranch?.profit.toFixed(2)} profit
            </p>
            <p style={styles.highlightSub}>{worstBranch?.sales > 0 ? `${((worstBranch.profit / worstBranch.sales) * 100).toFixed(1)}% margin` : ''}</p>
          </div>
        </div>
      )}

      <div style={{ ...styles.sectionCard, marginBottom: '20px' }}>
        <h3 style={styles.sectionTitle}>📍 Branch Profitability</h3>
        <p style={styles.sectionSub}>{periodLabel[period]}</p>
        {branchStats.length === 0 ? (
          <div style={styles.empty}>No report data for this period.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHead}>
                  <th style={styles.th}>Rank</th>
                  <th style={styles.th}>Branch</th>
                  <th style={styles.th}>Sales (K)</th>
                  <th style={styles.th}>Expenses (K)</th>
                  <th style={styles.th}>Profit (K)</th>
                  <th style={styles.th}>Margin</th>
                  <th style={styles.th}>Performance</th>
                </tr>
              </thead>
              <tbody>
                {branchStats.map((branch, i) => {
                  const margin = branch.sales > 0 ? ((branch.profit / branch.sales) * 100).toFixed(1) : 0;
                  return (
                    <tr key={branch.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.td}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</td>
                      <td style={{ ...styles.td, fontWeight: '700' }}>{branch.name}</td>
                      <td style={styles.td}>K {branch.sales.toFixed(2)}</td>
                      <td style={{ ...styles.td, color: '#e94560' }}>K {branch.expenses.toFixed(2)}</td>
                      <td style={{ ...styles.td, fontWeight: '800', color: branch.profit >= 0 ? '#28a745' : '#dc3545' }}>K {branch.profit.toFixed(2)}</td>
                      <td style={styles.td}>{margin}%</td>
                      <td style={styles.td}>
                        <div style={styles.progressBar}>
                          <div style={{ ...styles.progressFill, width: `${Math.min(parseFloat(margin), 100)}%`, background: parseFloat(margin) >= 30 ? '#28a745' : parseFloat(margin) >= 10 ? '#f39c12' : '#dc3545' }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>📦 Product Profit Margins</h3>
        <p style={styles.sectionSub}>Based on buying vs selling price from product master list.</p>
        {productMargins.length === 0 ? (
          <div style={styles.empty}>No products found.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHead}>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Buy Price (K)</th>
                  <th style={styles.th}>Sell Price (K)</th>
                  <th style={styles.th}>Profit/Unit (K)</th>
                  <th style={styles.th}>Margin %</th>
                  <th style={styles.th}>Health</th>
                </tr>
              </thead>
              <tbody>
                {productMargins.map((p, i) => (
                  <tr key={p.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={styles.td}>{i + 1}</td>
                    <td style={{ ...styles.td, fontWeight: '600' }}>{p.name}</td>
                    <td style={styles.td}>K {(p.buyingPrice || 0).toFixed(2)}</td>
                    <td style={styles.td}>K {(p.sellingPrice || 0).toFixed(2)}</td>
                    <td style={{ ...styles.td, fontWeight: '700', color: p.profitPerUnit >= 0 ? '#28a745' : '#dc3545' }}>K {p.profitPerUnit.toFixed(2)}</td>
                    <td style={{ ...styles.td, fontWeight: '700', color: p.margin >= 20 ? '#28a745' : p.margin >= 0 ? '#f39c12' : '#dc3545' }}>
                      {p.margin !== null ? `${p.margin}%` : '—'}
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, background: p.margin >= 20 ? '#e6f9ee' : p.margin >= 0 ? '#fff8e1' : '#fff0f0', color: p.margin >= 20 ? '#28a745' : p.margin >= 0 ? '#f39c12' : '#dc3545' }}>
                        {p.margin >= 20 ? '✅ Good' : p.margin >= 0 ? '⚠️ Low' : '❌ Loss'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SALARIES ─────────────────────────────────────────────
function Salaries() {
  const [salaries, setSalaries] = useState([]);
  const [branches, setBranches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterBranch, setFilterBranch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [form, setForm] = useState({
    staffName: '', branchId: '', branchName: '', position: '', amount: '',
    paymentDate: new Date().toISOString().split('T')[0], paymentMethod: 'Cash', notes: '',
  });

  useEffect(() => {
    const unsubS = onSnapshot(query(collection(db, 'salaries'), orderBy('createdAt', 'desc')),
      (snap) => setSalaries(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubB = onSnapshot(collection(db, 'branches'),
      (snap) => setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { unsubS(); unsubB(); };
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === 'branchId') {
      const branch = branches.find((b) => b.id === value);
      setForm({ ...form, branchId: value, branchName: branch?.name || '' });
    } else {
      setForm({ ...form, [name]: value });
    }
  }

  function resetForm() {
    setForm({ staffName: '', branchId: '', branchName: '', position: '', amount: '', paymentDate: new Date().toISOString().split('T')[0], paymentMethod: 'Cash', notes: '' });
    setShowForm(false);
  }

  async function handleSave() {
    if (!form.staffName.trim()) return alert('Enter staff name.');
    if (!form.branchId) return alert('Select a branch.');
    if (!form.amount) return alert('Enter salary amount.');
    setLoading(true);
    try {
      await addDoc(collection(db, 'salaries'), { ...form, amount: parseFloat(form.amount), month: form.paymentDate.slice(0, 7), createdAt: serverTimestamp() });
      resetForm();
    } catch (err) { alert(err.message); }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (window.confirm('Delete this salary record?')) await deleteDoc(doc(db, 'salaries', id));
  }

  let filtered = salaries;
  if (filterBranch) filtered = filtered.filter((s) => s.branchId === filterBranch);
  if (filterMonth) filtered = filtered.filter((s) => s.month === filterMonth);

  const totalPaid = filtered.reduce((sum, s) => sum + (s.amount || 0), 0);
  const branchSummary = branches.map((b) => {
    const branchSalaries = filtered.filter((s) => s.branchId === b.id);
    const total = branchSalaries.reduce((sum, s) => sum + (s.amount || 0), 0);
    return { ...b, total, count: branchSalaries.length };
  }).filter((b) => b.total > 0);

  function handlePrint() {
    const rows = filtered.map((s, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f9f9f9'}">
        <td>${s.paymentDate}</td><td>${s.staffName}</td><td>${s.branchName}</td>
        <td>${s.position || '—'}</td><td>${s.paymentMethod}</td>
        <td><strong>K ${(s.amount || 0).toFixed(2)}</strong></td><td>${s.notes || '—'}</td>
      </tr>`).join('');
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Salary Report</title>
      <style>body{font-family:Arial,sans-serif;padding:24px}h1{color:#0f3460}
      table{width:100%;border-collapse:collapse}th{background:#0f3460;color:white;padding:10px;text-align:left;font-size:12px}
      td{padding:8px 10px;font-size:12px;border-bottom:1px solid #eee}
      .total-row td{font-weight:800;background:#f0f4ff}
      .footer{margin-top:30px;font-size:11px;color:#aaa;text-align:center}</style></head>
      <body><h1>👥 Salary Payment Report</h1>
      <p>Solution Enterprises — CBMS<br>Generated: ${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <table><thead><tr><th>Date</th><th>Staff Name</th><th>Branch</th><th>Position</th><th>Method</th><th>Amount</th><th>Notes</th></tr></thead>
      <tbody>${rows}<tr class="total-row"><td colspan="5"><strong>TOTAL</strong></td><td><strong>K ${totalPaid.toFixed(2)}</strong></td><td></td></tr></tbody></table>
      <div class="footer">CBMS © ${new Date().getFullYear()}</div></body></html>`);
    win.document.close(); win.print();
  }

  return (
    <div>
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, borderTop: '4px solid #0f3460' }}>
          <p style={styles.statLabel}>👥 Total Salaries Paid</p>
          <p style={styles.statValue}>K {totalPaid.toFixed(2)}</p>
          <p style={styles.statSub}>{filtered.length} payments recorded</p>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #e94560' }}>
          <p style={styles.statLabel}>🏪 Branches with Salaries</p>
          <p style={{ ...styles.statValue, color: '#e94560' }}>{branchSummary.length}</p>
          <p style={styles.statSub}>Out of {branches.length} branches</p>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #28a745' }}>
          <p style={styles.statLabel}>📅 This Month</p>
          <p style={{ ...styles.statValue, color: '#28a745' }}>
            K {salaries.filter((s) => s.month === new Date().toISOString().slice(0, 7)).reduce((sum, s) => sum + (s.amount || 0), 0).toFixed(2)}
          </p>
          <p style={styles.statSub}>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #f39c12' }}>
          <p style={styles.statLabel}>📊 Average Per Staff</p>
          <p style={{ ...styles.statValue, color: '#f39c12' }}>K {filtered.length > 0 ? (totalPaid / filtered.length).toFixed(2) : '0.00'}</p>
          <p style={styles.statSub}>Per payment record</p>
        </div>
      </div>

      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.sectionTitle}>👥 Salary Records</h3>
            <p style={styles.sectionSub}>Record and track all salary payments across branches.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={styles.printBtn} onClick={handlePrint}>🖨️ Print Report</button>
            <button style={styles.saveBtn} onClick={() => setShowForm(!showForm)}>+ Record Salary</button>
          </div>
        </div>

        <div style={styles.filterRow}>
          <select style={styles.filterSelect} value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
            <option value="">All Branches</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input style={styles.filterSelect} type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
          {(filterBranch || filterMonth) && (
            <button style={styles.clearBtn} onClick={() => { setFilterBranch(''); setFilterMonth(''); }}>✕ Clear</button>
          )}
        </div>

        {showForm && (
          <div style={salaryFormStyles.overlay}>
            <div style={salaryFormStyles.modal}>
              <div style={salaryFormStyles.modalHeader}>
                <div style={salaryFormStyles.modalHeaderLeft}>
                  <div style={salaryFormStyles.modalIcon}>👥</div>
                  <div>
                    <h3 style={salaryFormStyles.modalTitle}>Record Salary Payment</h3>
                    <p style={salaryFormStyles.modalSub}>Fill in all details carefully.</p>
                  </div>
                </div>
                <button style={salaryFormStyles.closeBtn} onClick={resetForm}>✕</button>
              </div>
              <div style={salaryFormStyles.modalBody}>
                <div style={salaryFormStyles.formSection}>
                  <p style={salaryFormStyles.formSectionLabel}>👤 Staff Information</p>
                  <div style={salaryFormStyles.formGrid}>
                    <div style={salaryFormStyles.inputGroup}>
                      <label style={salaryFormStyles.label}>Staff Name *</label>
                      <input style={salaryFormStyles.input} name="staffName" value={form.staffName} placeholder="e.g. John Banda" onChange={handleChange} />
                    </div>
                    <div style={salaryFormStyles.inputGroup}>
                      <label style={salaryFormStyles.label}>Branch *</label>
                      <select style={salaryFormStyles.input} name="branchId" value={form.branchId} onChange={handleChange}>
                        <option value="">Select Branch</option>
                        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div style={{ ...salaryFormStyles.inputGroup, gridColumn: '1 / -1' }}>
                      <label style={salaryFormStyles.label}>Position / Role</label>
                      <input style={salaryFormStyles.input} name="position" value={form.position} placeholder="e.g. Branch Manager" onChange={handleChange} />
                    </div>
                  </div>
                </div>
                <div style={salaryFormStyles.formSection}>
                  <p style={salaryFormStyles.formSectionLabel}>💰 Payment Details</p>
                  <div style={salaryFormStyles.formGrid}>
                    <div style={salaryFormStyles.inputGroup}>
                      <label style={salaryFormStyles.label}>Salary Amount (K) *</label>
                      <div style={salaryFormStyles.amountWrap}>
                        <span style={salaryFormStyles.amountPrefix}>K</span>
                        <input style={salaryFormStyles.amountInput} name="amount" type="number" value={form.amount} placeholder="0.00" onChange={handleChange} />
                      </div>
                    </div>
                    <div style={salaryFormStyles.inputGroup}>
                      <label style={salaryFormStyles.label}>Payment Date *</label>
                      <input style={salaryFormStyles.input} name="paymentDate" type="date" value={form.paymentDate} onChange={handleChange} />
                    </div>
                    <div style={salaryFormStyles.inputGroup}>
                      <label style={salaryFormStyles.label}>Payment Method</label>
                      <div style={salaryFormStyles.methodRow}>
                        {['Cash', 'Bank Transfer', 'Mobile Money'].map((method) => (
                          <button key={method}
                            style={form.paymentMethod === method ? salaryFormStyles.methodActive : salaryFormStyles.methodBtn}
                            onClick={() => setForm({ ...form, paymentMethod: method })}>
                            {method === 'Cash' ? '💵' : method === 'Bank Transfer' ? '🏦' : '📱'} {method}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={salaryFormStyles.inputGroup}>
                      <label style={salaryFormStyles.label}>Notes (Optional)</label>
                      <input style={salaryFormStyles.input} name="notes" value={form.notes} placeholder="Any additional notes..." onChange={handleChange} />
                    </div>
                  </div>
                </div>
                {form.staffName && form.amount && (
                  <div style={salaryFormStyles.preview}>
                    <p style={salaryFormStyles.previewTitle}>📋 Payment Summary</p>
                    <div style={salaryFormStyles.previewGrid}>
                      <div style={salaryFormStyles.previewItem}><p style={salaryFormStyles.previewLabel}>Staff</p><p style={salaryFormStyles.previewValue}>{form.staffName}</p></div>
                      <div style={salaryFormStyles.previewItem}><p style={salaryFormStyles.previewLabel}>Branch</p><p style={salaryFormStyles.previewValue}>{branches.find((b) => b.id === form.branchId)?.name || '—'}</p></div>
                      <div style={salaryFormStyles.previewItem}><p style={salaryFormStyles.previewLabel}>Amount</p><p style={{ ...salaryFormStyles.previewValue, color: '#0f3460', fontSize: '20px' }}>K {parseFloat(form.amount || 0).toFixed(2)}</p></div>
                      <div style={salaryFormStyles.previewItem}><p style={salaryFormStyles.previewLabel}>Method</p><p style={salaryFormStyles.previewValue}>{form.paymentMethod}</p></div>
                    </div>
                  </div>
                )}
              </div>
              <div style={salaryFormStyles.modalFooter}>
                <button style={salaryFormStyles.cancelBtn} onClick={resetForm}>Cancel</button>
                <button style={loading ? salaryFormStyles.saveBtnDisabled : salaryFormStyles.saveBtn} onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving...' : '💾 Save Salary Record'}
                </button>
              </div>
            </div>
          </div>
        )}

        {branchSummary.length > 0 && (
          <div style={styles.branchSummaryRow}>
            {branchSummary.map((b) => (
              <div key={b.id} style={styles.branchSummaryCard}>
                <p style={styles.branchSummaryName}>🏪 {b.name}</p>
                <p style={styles.branchSummaryAmount}>K {b.total.toFixed(2)}</p>
                <p style={styles.branchSummaryCount}>{b.count} payments</p>
              </div>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={styles.empty}>No salary records found. Click "Record Salary" to add one.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHead}>
                  <th style={styles.th}>#</th><th style={styles.th}>Date</th><th style={styles.th}>Staff Name</th>
                  <th style={styles.th}>Branch</th><th style={styles.th}>Position</th><th style={styles.th}>Method</th>
                  <th style={styles.th}>Amount (K)</th><th style={styles.th}>Notes</th><th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={styles.td}>{i + 1}</td>
                    <td style={styles.td}>{s.paymentDate}</td>
                    <td style={{ ...styles.td, fontWeight: '700' }}>{s.staffName}</td>
                    <td style={styles.td}>{s.branchName}</td>
                    <td style={styles.td}>{s.position || '—'}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, background: s.paymentMethod === 'Cash' ? '#fff8e1' : '#f0f4ff', color: s.paymentMethod === 'Cash' ? '#f39c12' : '#0f3460' }}>
                        {s.paymentMethod}
                      </span>
                    </td>
                    <td style={{ ...styles.td, fontWeight: '800', color: '#0f3460' }}>K {(s.amount || 0).toFixed(2)}</td>
                    <td style={styles.td}>{s.notes || '—'}</td>
                    <td style={styles.td}><button style={styles.deleteBtn} onClick={() => handleDelete(s.id)}>🗑️</button></td>
                  </tr>
                ))}
                <tr style={styles.totalRow}>
                  <td colSpan="6" style={{ ...styles.td, fontWeight: '800' }}>TOTAL</td>
                  <td style={{ ...styles.td, fontWeight: '800', color: '#0f3460', fontSize: '15px' }}>K {totalPaid.toFixed(2)}</td>
                  <td colSpan="2" style={styles.td}></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CASH MANAGEMENT ──────────────────────────────────────
function CashManagement() {
  const { userName, userRole } = useAuth();
  const [handovers, setHandovers] = useState([]);
  const [reports, setReports] = useState([]);
  const [branches, setBranches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterBranch, setFilterBranch] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);
  const [form, setForm] = useState({
    branchId: '', branchName: '', amount: '',
    date: new Date().toISOString().split('T')[0],
    handedBy: '', receivedBy: '', notes: '',
  });

  useEffect(() => {
    const unsubH = onSnapshot(query(collection(db, 'cashHandovers'), orderBy('createdAt', 'desc')),
      (snap) => setHandovers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubR = onSnapshot(query(collection(db, 'dailyReports'), orderBy('createdAt', 'desc')),
      (snap) => setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubB = onSnapshot(collection(db, 'branches'),
      (snap) => setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { unsubH(); unsubR(); unsubB(); };
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === 'branchId') {
      const branch = branches.find((b) => b.id === value);
      setForm({ ...form, branchId: value, branchName: branch?.name || '' });
    } else {
      setForm({ ...form, [name]: value });
    }
  }

  function resetForm() {
    setForm({ branchId: '', branchName: '', amount: '', date: new Date().toISOString().split('T')[0], handedBy: '', receivedBy: '', notes: '' });
    setShowForm(false);
  }

  async function handleSave() {
    if (!form.branchId) return alert('Select a branch.');
    if (!form.amount || parseFloat(form.amount) <= 0) return alert('Enter a valid amount.');
    if (!form.handedBy.trim()) return alert('Enter who handed the cash.');
    setLoading(true);
    try {
      await addDoc(collection(db, 'cashHandovers'), { ...form, amount: parseFloat(form.amount), status: 'Pending', createdBy: userName || 'Unknown', createdAt: serverTimestamp() });
      await addDoc(collection(db, 'notifications'), { type: 'CASH_HANDOVER', message: `🏦 Cash handover of K ${parseFloat(form.amount).toFixed(2)} from ${form.branchName} by ${form.handedBy}`, read: false, createdAt: serverTimestamp() });
      resetForm();
    } catch (err) { alert(err.message); }
    setLoading(false);
  }

  async function handleConfirm(handover) {
    if (!handover.receivedBy?.trim()) return alert('Enter who received the cash before confirming.');
    try {
      await updateDoc(doc(db, 'cashHandovers', handover.id), { status: 'Confirmed', receivedBy: handover.receivedBy, confirmedAt: serverTimestamp(), confirmedBy: userName });
      await addDoc(collection(db, 'notifications'), { type: 'CASH_CONFIRMED', message: `✅ Cash handover of K ${handover.amount.toFixed(2)} from ${handover.branchName} confirmed by ${userName}`, read: false, createdAt: serverTimestamp() });
      setConfirmingId(null);
    } catch (err) { alert(err.message); }
  }

  function getBranchCashPosition(branchId) {
    const totalHandedOver = handovers.filter((h) => h.branchId === branchId && h.status === 'Confirmed').reduce((sum, h) => sum + (h.amount || 0), 0);
    const latestReport = reports.filter((r) => r.branchId === branchId).sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    const latestCash = latestReport?.actualCash || 0;
    const estimatedAtBranch = Math.max(latestCash - totalHandedOver, 0);
    return { latestCash, totalHandedOver, estimatedAtBranch, reportCount: reports.filter((r) => r.branchId === branchId).length };
  }

  const filtered = filterBranch ? handovers.filter((h) => h.branchId === filterBranch) : handovers;
  const totalConfirmed = handovers.filter((h) => h.status === 'Confirmed').reduce((sum, h) => sum + (h.amount || 0), 0);
  const totalPending = handovers.filter((h) => h.status === 'Pending').reduce((sum, h) => sum + (h.amount || 0), 0);
  const totalAtBranches = branches.reduce((sum, b) => sum + getBranchCashPosition(b.id).estimatedAtBranch, 0);

  return (
    <div>
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, borderTop: '4px solid #0f3460' }}>
          <p style={styles.statLabel}>🏦 Total Collected by HO</p>
          <p style={styles.statValue}>K {totalConfirmed.toFixed(2)}</p>
          <p style={styles.statSub}>{handovers.filter((h) => h.status === 'Confirmed').length} confirmed handovers</p>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #f39c12' }}>
          <p style={styles.statLabel}>⏳ Pending Confirmation</p>
          <p style={{ ...styles.statValue, color: '#f39c12' }}>K {totalPending.toFixed(2)}</p>
          <p style={styles.statSub}>{handovers.filter((h) => h.status === 'Pending').length} awaiting confirmation</p>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #28a745' }}>
          <p style={styles.statLabel}>🏪 Est. Cash at Branches</p>
          <p style={{ ...styles.statValue, color: '#28a745' }}>K {totalAtBranches.toFixed(2)}</p>
          <p style={styles.statSub}>Based on latest reports</p>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #e94560' }}>
          <p style={styles.statLabel}>📋 Total Handovers</p>
          <p style={{ ...styles.statValue, color: '#e94560' }}>{handovers.length}</p>
          <p style={styles.statSub}>All time records</p>
        </div>
      </div>

      <div style={{ ...styles.sectionCard, marginBottom: '20px' }}>
        <h3 style={styles.sectionTitle}>🏪 Cash Position Per Branch</h3>
        <p style={styles.sectionSub}>Estimated cash currently sitting at each branch.</p>
        {branches.length === 0 ? (
          <div style={styles.empty}>No branches found.</div>
        ) : (
          <div style={cashStyles.branchGrid}>
            {branches.map((branch) => {
              const pos = getBranchCashPosition(branch.id);
              return (
                <div key={branch.id} style={cashStyles.branchCashCard}>
                  <div style={cashStyles.branchCashHeader}>
                    <span style={cashStyles.branchCashIcon}>🏪</span>
                    <span style={cashStyles.branchCashName}>{branch.name}</span>
                  </div>
                  <div style={cashStyles.branchCashAmount}>K {pos.estimatedAtBranch.toFixed(2)}</div>
                  <div style={cashStyles.branchCashBreakdown}>
                    <div style={cashStyles.breakdownItem}>
                      <p style={cashStyles.breakdownLabel}>Last Report Cash</p>
                      <p style={cashStyles.breakdownValue}>K {pos.latestCash.toFixed(2)}</p>
                    </div>
                    <div style={cashStyles.breakdownItem}>
                      <p style={cashStyles.breakdownLabel}>Handed Over</p>
                      <p style={{ ...cashStyles.breakdownValue, color: '#e94560' }}>- K {pos.totalHandedOver.toFixed(2)}</p>
                    </div>
                  </div>
                  <p style={cashStyles.branchCashReports}>Based on {pos.reportCount} reports</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.sectionTitle}>💵 Cash Handover Records</h3>
            <p style={styles.sectionSub}>Record when a branch hands cash to Head Office.</p>
          </div>
          <button style={styles.saveBtn} onClick={() => setShowForm(!showForm)}>+ Record Handover</button>
        </div>

        <div style={styles.filterRow}>
          <select style={styles.filterSelect} value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
            <option value="">All Branches</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {filterBranch && <button style={styles.clearBtn} onClick={() => setFilterBranch('')}>✕ Clear</button>}
        </div>

        {showForm && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <div style={styles.modalHeader}>
                <div style={styles.modalHeaderLeft}>
                  <div style={styles.modalIcon}>🏦</div>
                  <div>
                    <h3 style={styles.modalTitle}>Record Cash Handover</h3>
                    <p style={styles.modalSub}>Record cash being handed from a branch to Head Office.</p>
                  </div>
                </div>
                <button style={styles.closeBtn} onClick={resetForm}>✕</button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.formSection}>
                  <p style={styles.formSectionLabel}>🏪 Branch & Amount</p>
                  <div style={styles.formGrid}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Branch *</label>
                      <select style={styles.input} name="branchId" value={form.branchId} onChange={handleChange}>
                        <option value="">Select Branch</option>
                        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Date *</label>
                      <input style={styles.input} name="date" type="date" value={form.date} onChange={handleChange} />
                    </div>
                    <div style={{ ...styles.inputGroup, gridColumn: '1 / -1' }}>
                      <label style={styles.label}>Amount (K) *</label>
                      <div style={salaryFormStyles.amountWrap}>
                        <span style={salaryFormStyles.amountPrefix}>K</span>
                        <input style={salaryFormStyles.amountInput} name="amount" type="number" value={form.amount} placeholder="0.00" onChange={handleChange} />
                      </div>
                    </div>
                  </div>
                </div>
                <div style={styles.formSection}>
                  <p style={styles.formSectionLabel}>👤 People Involved</p>
                  <div style={styles.formGrid}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Handed By *</label>
                      <input style={styles.input} name="handedBy" value={form.handedBy} placeholder="Staff name at branch" onChange={handleChange} />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Received By</label>
                      <input style={styles.input} name="receivedBy" value={form.receivedBy} placeholder="HO person who received" onChange={handleChange} />
                    </div>
                    <div style={{ ...styles.inputGroup, gridColumn: '1 / -1' }}>
                      <label style={styles.label}>Notes</label>
                      <input style={styles.input} name="notes" value={form.notes} placeholder="e.g. Weekly cash collection" onChange={handleChange} />
                    </div>
                  </div>
                </div>
                {form.branchName && form.amount && (
                  <div style={salaryFormStyles.preview}>
                    <p style={salaryFormStyles.previewTitle}>📋 Handover Summary</p>
                    <div style={salaryFormStyles.previewGrid}>
                      <div style={salaryFormStyles.previewItem}><p style={salaryFormStyles.previewLabel}>Branch</p><p style={salaryFormStyles.previewValue}>{form.branchName}</p></div>
                      <div style={salaryFormStyles.previewItem}><p style={salaryFormStyles.previewLabel}>Amount</p><p style={{ ...salaryFormStyles.previewValue, color: '#0f3460', fontSize: '20px' }}>K {parseFloat(form.amount || 0).toFixed(2)}</p></div>
                      <div style={salaryFormStyles.previewItem}><p style={salaryFormStyles.previewLabel}>Handed By</p><p style={salaryFormStyles.previewValue}>{form.handedBy || '—'}</p></div>
                      <div style={salaryFormStyles.previewItem}><p style={salaryFormStyles.previewLabel}>Date</p><p style={salaryFormStyles.previewValue}>{form.date}</p></div>
                    </div>
                  </div>
                )}
              </div>
              <div style={styles.modalFooter}>
                <button style={styles.cancelBtn} onClick={resetForm}>Cancel</button>
                <button style={loading ? styles.saveBtnDisabled : styles.saveBtn} onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving...' : '💾 Save Handover Record'}
                </button>
              </div>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={styles.empty}>No cash handover records yet. Click "Record Handover" to add one.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHead}>
                  <th style={styles.th}>#</th><th style={styles.th}>Date</th><th style={styles.th}>Branch</th>
                  <th style={styles.th}>Amount (K)</th><th style={styles.th}>Handed By</th><th style={styles.th}>Received By</th>
                  <th style={styles.th}>Status</th><th style={styles.th}>Notes</th><th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h, i) => (
                  <tr key={h.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={styles.td}>{i + 1}</td>
                    <td style={styles.td}>{h.date}</td>
                    <td style={{ ...styles.td, fontWeight: '700' }}>{h.branchName}</td>
                    <td style={{ ...styles.td, fontWeight: '800', color: '#0f3460' }}>K {(h.amount || 0).toFixed(2)}</td>
                    <td style={styles.td}>{h.handedBy}</td>
                    <td style={styles.td}>{h.receivedBy || '—'}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, background: h.status === 'Confirmed' ? '#e6f9ee' : '#fff8e1', color: h.status === 'Confirmed' ? '#28a745' : '#f39c12' }}>
                        {h.status === 'Confirmed' ? '✅ Confirmed' : '⏳ Pending'}
                      </span>
                    </td>
                    <td style={styles.td}>{h.notes || '—'}</td>
                    <td style={styles.td}>
                      {h.status === 'Pending' && userRole === 'Super Admin' && (
                        confirmingId === h.id ? (
                          <div style={cashStyles.confirmRow}>
                            <input style={cashStyles.confirmInput} placeholder="Received by..."
                              value={h.receivedBy || ''}
                              onChange={(e) => setHandovers(handovers.map((item) => item.id === h.id ? { ...item, receivedBy: e.target.value } : item))} />
                            <button style={cashStyles.confirmBtn} onClick={() => handleConfirm(h)}>✅</button>
                            <button style={cashStyles.cancelConfirmBtn} onClick={() => setConfirmingId(null)}>✕</button>
                          </div>
                        ) : (
                          <button style={cashStyles.confirmTriggerBtn} onClick={() => setConfirmingId(h.id)}>Confirm Receipt</button>
                        )
                      )}
                      {h.status === 'Confirmed' && <span style={cashStyles.confirmedText}>✅ Done</span>}
                    </td>
                  </tr>
                ))}
                <tr style={styles.totalRow}>
                  <td colSpan="3" style={{ ...styles.td, fontWeight: '800' }}>TOTAL</td>
                  <td style={{ ...styles.td, fontWeight: '800', color: '#0f3460', fontSize: '15px' }}>K {filtered.reduce((s, h) => s + (h.amount || 0), 0).toFixed(2)}</td>
                  <td colSpan="5" style={styles.td}></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FINANCE REPORTS ──────────────────────────────────────
function FinanceReports() {
  const [reports, setReports] = useState([]);
  const [branches, setBranches] = useState([]);
  const [period, setPeriod] = useState('today');
  const [filterBranch, setFilterBranch] = useState('');

  useEffect(() => {
    const unsubR = onSnapshot(query(collection(db, 'dailyReports'), orderBy('createdAt', 'desc')),
      (snap) => setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubB = onSnapshot(collection(db, 'branches'),
      (snap) => setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { unsubR(); unsubB(); };
  }, []);

  const periodLabel = { today: 'Daily', week: 'Weekly', month: 'Monthly' };
  let filtered = filterByPeriod(reports, period);
  if (filterBranch) filtered = filtered.filter((r) => r.branchId === filterBranch);

  const totalSales = filtered.reduce((s, r) => s + (r.totalSales || 0), 0);
  const totalExpenses = filtered.reduce((s, r) => s + (r.totalExpenses || 0), 0);
  const grossProfit = totalSales - totalExpenses;
  const totalCash = filtered.reduce((s, r) => s + (r.actualCash || 0), 0);
  const totalVariance = filtered.reduce((s, r) => s + (r.variance || 0), 0);

  function handlePrint() {
    const { start, end } = getPeriodDates(period);
    const branchLabel = filterBranch ? branches.find((b) => b.id === filterBranch)?.name : 'All Branches';
    const rows = filtered.map((r, i) => `<tr style="background:${i % 2 === 0 ? '#fff' : '#f9f9f9'}"><td>${r.date}</td><td>${r.branchName}</td><td>K ${(r.totalSales || 0).toFixed(2)}</td><td>K ${(r.totalExpenses || 0).toFixed(2)}</td><td>K ${((r.totalSales || 0) - (r.totalExpenses || 0)).toFixed(2)}</td><td>K ${(r.actualCash || 0).toFixed(2)}</td><td style="color:${(r.variance || 0) < 0 ? '#dc3545' : '#28a745'}">K ${(r.variance || 0).toFixed(2)}</td><td>${r.submittedBy}</td></tr>`).join('');
    const expenseMap = {};
    filtered.forEach((r) => { (r.expenses || []).forEach((e) => { if (!e.description) return; expenseMap[e.description] = (expenseMap[e.description] || 0) + parseFloat(e.amount || 0); }); });
    const expenseRows = Object.entries(expenseMap).sort(([, a], [, b]) => b - a).map(([name, amount]) => `<tr><td>${name}</td><td>K ${amount.toFixed(2)}</td><td>${totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0}%</td></tr>`).join('');
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>${periodLabel[period]} Financial Report</title>
      <style>body{font-family:Arial,sans-serif;padding:24px}h1{color:#0f3460}
      .meta{color:#666;font-size:13px;margin-bottom:20px}
      .summary{display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap}
      .summary-box{background:#f0f4ff;padding:12px 20px;border-radius:8px;min-width:120px}
      .summary-box .label{font-size:11px;color:#888;margin:0}
      .summary-box .value{font-size:20px;font-weight:800;color:#0f3460;margin:4px 0 0}
      h2{color:#0f3460;font-size:15px;margin:24px 0 10px}
      table{width:100%;border-collapse:collapse;margin-bottom:24px}
      th{background:#0f3460;color:white;padding:8px 12px;text-align:left;font-size:12px}
      td{padding:7px 12px;font-size:12px;border-bottom:1px solid #eee}
      .total-row td{font-weight:800;background:#f0f4ff}
      .profit{color:#28a745}.loss{color:#dc3545}
      .footer{margin-top:30px;font-size:11px;color:#aaa;text-align:center}</style></head>
      <body><h1>📊 ${periodLabel[period]} Financial Report</h1>
      <p class="meta">Solution Enterprises — CBMS<br>Period: ${start} to ${end}<br>Branch: ${branchLabel}<br>Generated: ${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <div class="summary">
        <div class="summary-box"><p class="label">Total Sales</p><p class="value">K ${totalSales.toFixed(2)}</p></div>
        <div class="summary-box"><p class="label">Total Expenses</p><p class="value">K ${totalExpenses.toFixed(2)}</p></div>
        <div class="summary-box"><p class="label">Gross Profit</p><p class="value ${grossProfit >= 0 ? 'profit' : 'loss'}">K ${grossProfit.toFixed(2)}</p></div>
        <div class="summary-box"><p class="label">Cash in Hand</p><p class="value">K ${totalCash.toFixed(2)}</p></div>
        <div class="summary-box"><p class="label">Variance</p><p class="value ${totalVariance < 0 ? 'loss' : 'profit'}">K ${totalVariance.toFixed(2)}</p></div>
      </div>
      <h2>📋 Branch Reports Detail</h2>
      <table><thead><tr><th>Date</th><th>Branch</th><th>Sales</th><th>Expenses</th><th>Profit</th><th>Cash</th><th>Variance</th><th>Submitted By</th></tr></thead>
      <tbody>${rows}<tr class="total-row"><td colspan="2">TOTAL</td><td>K ${totalSales.toFixed(2)}</td><td>K ${totalExpenses.toFixed(2)}</td><td class="${grossProfit >= 0 ? 'profit' : 'loss'}">K ${grossProfit.toFixed(2)}</td><td>K ${totalCash.toFixed(2)}</td><td class="${totalVariance < 0 ? 'loss' : 'profit'}">K ${totalVariance.toFixed(2)}</td><td></td></tr></tbody></table>
      <h2>💸 Expense Breakdown by Category</h2>
      <table><thead><tr><th>Expense Category</th><th>Total Amount</th><th>% of Expenses</th></tr></thead>
      <tbody>${expenseRows || '<tr><td colspan="3">No expenses recorded.</td></tr>'}<tr class="total-row"><td>TOTAL</td><td>K ${totalExpenses.toFixed(2)}</td><td>100%</td></tr></tbody></table>
      <div class="footer">CBMS — Central Business Management System © ${new Date().getFullYear()}</div>
      </body></html>`);
    win.document.close(); win.print();
  }

  return (
    <div style={styles.sectionCard}>
      <div style={styles.sectionHeader}>
        <div>
          <h3 style={styles.sectionTitle}>🖨️ Financial Reports</h3>
          <p style={styles.sectionSub}>Generate and print financial reports for any period.</p>
        </div>
        <button style={styles.printBtn} onClick={handlePrint}>🖨️ Print / Export PDF</button>
      </div>
      <div style={styles.filterRow}>
        <div style={styles.periodRow}>
          {['today', 'week', 'month'].map((p) => (
            <button key={p} style={period === p ? styles.periodActive : styles.periodBtn} onClick={() => setPeriod(p)}>
              {periodLabel[p]} Report
            </button>
          ))}
        </div>
        <select style={styles.filterSelect} value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
          <option value="">All Branches</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      <div style={styles.reportPreview}>
        <h4 style={styles.previewTitle}>📊 Report Preview</h4>
        <div style={styles.previewGrid}>
          <div style={styles.previewBox}><p style={styles.previewLabel}>Total Sales</p><p style={styles.previewValue}>K {totalSales.toFixed(2)}</p></div>
          <div style={styles.previewBox}><p style={styles.previewLabel}>Total Expenses</p><p style={{ ...styles.previewValue, color: '#e94560' }}>K {totalExpenses.toFixed(2)}</p></div>
          <div style={styles.previewBox}><p style={styles.previewLabel}>Gross Profit</p><p style={{ ...styles.previewValue, color: grossProfit >= 0 ? '#28a745' : '#dc3545' }}>K {grossProfit.toFixed(2)}</p></div>
          <div style={styles.previewBox}><p style={styles.previewLabel}>Reports Included</p><p style={styles.previewValue}>{filtered.length}</p></div>
        </div>
        <p style={styles.previewNote}>Click "Print / Export PDF" to generate the full report.</p>
      </div>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────
const styles = {
  tabRow: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
  tab: { padding: '10px 20px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: '#666' },
  tabActive: { padding: '10px 20px', background: 'linear-gradient(135deg, #0f3460, #e94560)', border: '2px solid transparent', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: 'white', fontWeight: '700' },
  periodRow: { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' },
  periodBtn: { padding: '8px 16px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', color: '#666' },
  periodActive: { padding: '8px 16px', background: '#0f3460', border: '2px solid #0f3460', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', color: 'white', fontWeight: '700' },
  filterRow: { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' },
  filterSelect: { padding: '8px 14px', borderRadius: '8px', border: '2px solid #e0e0e0', fontSize: '14px', outline: 'none' },
  clearBtn: { padding: '8px 16px', background: '#fff0f0', color: '#dc3545', border: '1px solid #ffcccc', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
  statCard: { background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  statLabel: { color: '#888', fontSize: '12px', margin: '0 0 8px' },
  statValue: { color: '#1a1a2e', fontSize: '24px', fontWeight: '800', margin: '0 0 4px' },
  statSub: { color: '#aaa', fontSize: '11px', margin: 0 },
  alertBox: { background: '#fff8e1', border: '1px solid #f39c12', color: '#856404', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', marginBottom: '20px' },
  sectionCard: { background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '20px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  sectionTitle: { fontSize: '18px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 4px' },
  sectionSub: { fontSize: '13px', color: '#888', margin: 0 },
  bigNumber: { fontSize: '36px', fontWeight: '800', color: '#e94560', margin: '0 0 20px' },
  categoryList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  categoryItem: { marginBottom: '4px' },
  categoryHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
  categoryName: { fontSize: '14px', fontWeight: '600', color: '#1a1a2e' },
  categoryAmount: { fontSize: '14px', color: '#666' },
  progressBar: { height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: '4px', transition: 'width 0.3s' },
  highlightGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' },
  highlightCard: { background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  highlightLabel: { fontSize: '12px', color: '#888', margin: '0 0 8px' },
  highlightBranch: { fontSize: '18px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 4px' },
  highlightValue: { fontSize: '22px', fontWeight: '800', color: '#28a745', margin: '0 0 4px' },
  highlightSub: { fontSize: '12px', color: '#aaa', margin: 0 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHead: { background: '#f0f4ff' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#0f3460' },
  td: { padding: '10px 16px', fontSize: '13px', color: '#444' },
  trEven: { background: 'white' },
  trOdd: { background: '#fafafa' },
  totalRow: { background: '#f0f4ff', borderTop: '2px solid #d0e0ff' },
  badge: { padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' },
  printBtn: { padding: '10px 20px', background: 'linear-gradient(135deg, #0f3460, #e94560)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  saveBtn: { padding: '10px 20px', background: 'linear-gradient(135deg, #0f3460, #e94560)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  saveBtnDisabled: { padding: '10px 20px', background: '#ccc', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'not-allowed' },
  cancelBtn: { padding: '10px 20px', background: '#f0f0f0', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: '#666' },
  reportPreview: { background: '#f0f4ff', borderRadius: '10px', padding: '20px', border: '1px solid #d0e0ff' },
  previewTitle: { fontSize: '15px', fontWeight: '700', color: '#0f3460', margin: '0 0 16px' },
  previewGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' },
  previewBox: { background: 'white', borderRadius: '8px', padding: '12px', textAlign: 'center' },
  previewLabel: { fontSize: '11px', color: '#888', margin: '0 0 4px' },
  previewValue: { fontSize: '18px', fontWeight: '800', color: '#0f3460', margin: 0 },
  previewNote: { fontSize: '12px', color: '#888', margin: 0 },
  empty: { textAlign: 'center', padding: '40px', color: '#aaa', fontSize: '14px' },
  deleteBtn: { padding: '4px 8px', background: '#fff0f0', color: '#dc3545', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  branchSummaryRow: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' },
  branchSummaryCard: { background: '#f0f4ff', borderRadius: '10px', padding: '14px 20px', minWidth: '140px', border: '1px solid #d0e0ff' },
  branchSummaryName: { fontSize: '12px', color: '#888', margin: '0 0 4px' },
  branchSummaryAmount: { fontSize: '20px', fontWeight: '800', color: '#0f3460', margin: '0 0 2px' },
  branchSummaryCount: { fontSize: '11px', color: '#aaa', margin: 0 },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modal: { background: 'white', borderRadius: '16px', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px', background: 'linear-gradient(135deg, #0f3460, #16213e)', borderRadius: '16px 16px 0 0' },
  modalHeaderLeft: { display: 'flex', gap: '16px', alignItems: 'flex-start' },
  modalIcon: { width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' },
  modalTitle: { fontSize: '18px', fontWeight: '800', color: 'white', margin: '0 0 4px' },
  modalSub: { fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: 0 },
  closeBtn: { background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' },
  modalBody: { padding: '20px 24px' },
  formSection: { background: '#fafafa', borderRadius: '10px', padding: '16px', marginBottom: '16px', border: '1px solid #f0f0f0' },
  formSectionLabel: { fontSize: '12px', fontWeight: '700', color: '#0f3460', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#555' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '2px solid #e0e0e0', fontSize: '14px', outline: 'none' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid #f0f0f0', background: '#fafafa', borderRadius: '0 0 16px 16px' },
};

const salaryFormStyles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modal: { background: 'white', borderRadius: '16px', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 24px 20px', borderBottom: '1px solid #f0f0f0', background: 'linear-gradient(135deg, #0f3460, #16213e)', borderRadius: '16px 16px 0 0' },
  modalHeaderLeft: { display: 'flex', gap: '16px', alignItems: 'flex-start' },
  modalIcon: { width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' },
  modalTitle: { fontSize: '18px', fontWeight: '800', color: 'white', margin: '0 0 4px' },
  modalSub: { fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: 0 },
  closeBtn: { background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalBody: { padding: '24px' },
  formSection: { background: '#fafafa', borderRadius: '12px', padding: '20px', marginBottom: '16px', border: '1px solid #f0f0f0' },
  formSectionLabel: { fontSize: '13px', fontWeight: '700', color: '#0f3460', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#555' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '2px solid #e0e0e0', fontSize: '14px', outline: 'none', background: 'white' },
  amountWrap: { display: 'flex', alignItems: 'center', border: '2px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden', background: 'white' },
  amountPrefix: { padding: '10px 14px', background: '#0f3460', color: 'white', fontWeight: '800', fontSize: '16px' },
  amountInput: { flex: 1, padding: '10px 14px', border: 'none', fontSize: '16px', fontWeight: '700', outline: 'none', color: '#0f3460' },
  methodRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  methodBtn: { padding: '8px 14px', background: '#f0f0f0', border: '2px solid transparent', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', color: '#666' },
  methodActive: { padding: '8px 14px', background: '#f0f4ff', border: '2px solid #0f3460', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', color: '#0f3460', fontWeight: '700' },
  preview: { background: 'linear-gradient(135deg, #f0f4ff, #e6f9ee)', borderRadius: '12px', padding: '16px', border: '1px solid #d0e0ff' },
  previewTitle: { fontSize: '13px', fontWeight: '700', color: '#0f3460', margin: '0 0 12px' },
  previewGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' },
  previewItem: { textAlign: 'center' },
  previewLabel: { fontSize: '11px', color: '#888', margin: '0 0 4px' },
  previewValue: { fontSize: '14px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid #f0f0f0', background: '#fafafa', borderRadius: '0 0 16px 16px' },
  cancelBtn: { padding: '12px 24px', background: '#f0f0f0', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: '#666' },
  saveBtn: { padding: '12px 28px', background: 'linear-gradient(135deg, #0f3460, #e94560)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  saveBtnDisabled: { padding: '12px 28px', background: '#ccc', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'not-allowed' },
};

const cashStyles = {
  branchGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '16px' },
  branchCashCard: { background: 'linear-gradient(135deg, #f0f4ff, #e6f9ee)', borderRadius: '12px', padding: '20px', border: '1px solid #d0e0ff' },
  branchCashHeader: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' },
  branchCashIcon: { fontSize: '24px' },
  branchCashName: { fontSize: '14px', fontWeight: '700', color: '#1a1a2e' },
  branchCashAmount: { fontSize: '28px', fontWeight: '800', color: '#0f3460', margin: '0 0 12px' },
  branchCashBreakdown: { display: 'flex', gap: '16px', paddingTop: '12px', borderTop: '1px solid #d0e0ff', marginBottom: '8px' },
  breakdownItem: {},
  breakdownLabel: { fontSize: '10px', color: '#888', margin: 0 },
  breakdownValue: { fontSize: '13px', fontWeight: '700', color: '#1a1a2e', margin: '2px 0 0' },
  branchCashReports: { fontSize: '11px', color: '#aaa', margin: 0 },
  confirmRow: { display: 'flex', gap: '4px', alignItems: 'center' },
  confirmInput: { padding: '5px 8px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '12px', outline: 'none', width: '100px' },
  confirmBtn: { padding: '5px 8px', background: '#e6f9ee', color: '#28a745', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  cancelConfirmBtn: { padding: '5px 8px', background: '#fff0f0', color: '#dc3545', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  confirmTriggerBtn: { padding: '5px 10px', background: '#f0f4ff', color: '#0f3460', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  confirmedText: { fontSize: '12px', color: '#28a745', fontWeight: '600' },
};