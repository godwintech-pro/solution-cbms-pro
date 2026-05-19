import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export default function Finance() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', icon: '💰', label: 'Dashboard' },
    { id: 'expenses', icon: '📋', label: 'Expense Analysis' },
    { id: 'profitability', icon: '📈', label: 'Profitability' },
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
      {activeTab === 'reports' && <FinanceReports />}
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────
function getPeriodDates(period) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  if (period === 'today') {
    return { start: todayStr, end: todayStr };
  }
  if (period === 'week') {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return {
      start: start.toISOString().split('T')[0],
      end: todayStr,
    };
  }
  if (period === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      start: start.toISOString().split('T')[0],
      end: todayStr,
    };
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

  const periodLabel = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
  };

  return (
    <div>
      {/* Period Selector */}
      <div style={styles.periodRow}>
        {['today', 'week', 'month'].map((p) => (
          <button
            key={p}
            style={period === p ? styles.periodActive : styles.periodBtn}
            onClick={() => setPeriod(p)}
          >
            {periodLabel[p]}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, borderTop: '4px solid #0f3460' }}>
          <p style={styles.statLabel}>💰 Total Sales</p>
          <p style={styles.statValue}>K {totalSales.toFixed(2)}</p>
          <p style={styles.statSub}>{periodLabel[period]}</p>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #e94560' }}>
          <p style={styles.statLabel}>📋 Total Expenses</p>
          <p style={{ ...styles.statValue, color: '#e94560' }}>
            K {totalExpenses.toFixed(2)}
          </p>
          <p style={styles.statSub}>{periodLabel[period]}</p>
        </div>
        <div style={{
          ...styles.statCard,
          borderTop: `4px solid ${grossProfit >= 0 ? '#28a745' : '#dc3545'}`
        }}>
          <p style={styles.statLabel}>📈 Gross Profit</p>
          <p style={{
            ...styles.statValue,
            color: grossProfit >= 0 ? '#28a745' : '#dc3545'
          }}>
            K {grossProfit.toFixed(2)}
          </p>
          <p style={styles.statSub}>
            {totalSales > 0
              ? `${((grossProfit / totalSales) * 100).toFixed(1)}% margin`
              : 'No sales yet'}
          </p>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #f39c12' }}>
          <p style={styles.statLabel}>🏦 Cash in Hand</p>
          <p style={{ ...styles.statValue, color: '#f39c12' }}>
            K {totalCash.toFixed(2)}
          </p>
          <p style={styles.statSub}>Across all branches</p>
        </div>
      </div>

      {/* Variance Alert */}
      {totalVariance < 0 && (
        <div style={styles.alertBox}>
          ⚠️ Total cash variance of{' '}
          <strong>K {Math.abs(totalVariance).toFixed(2)}</strong>{' '}
          detected across branches {periodLabel[period].toLowerCase()}.
          Please investigate.
        </div>
      )}

      {/* Branch Breakdown */}
      <div style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>📍 Branch Financial Breakdown</h3>
        <p style={styles.sectionSub}>{periodLabel[period]} performance per branch.</p>

        {filtered.length === 0 ? (
          <div style={styles.empty}>
            No reports submitted for this period yet.
          </div>
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
                  const margin = stats.sales > 0
                    ? ((stats.profit / stats.sales) * 100).toFixed(1)
                    : 0;
                  return (
                    <tr key={branch.id}
                      style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={{ ...styles.td, fontWeight: '700' }}>
                        {branch.name}
                      </td>
                      <td style={styles.td}>{stats.reportCount}</td>
                      <td style={styles.td}>K {stats.sales.toFixed(2)}</td>
                      <td style={{ ...styles.td, color: '#e94560' }}>
                        K {stats.expenses.toFixed(2)}
                      </td>
                      <td style={{
                        ...styles.td,
                        fontWeight: '700',
                        color: stats.profit >= 0 ? '#28a745' : '#dc3545'
                      }}>
                        K {stats.profit.toFixed(2)}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          background: parseFloat(margin) >= 20
                            ? '#e6f9ee' : '#fff0f0',
                          color: parseFloat(margin) >= 20
                            ? '#28a745' : '#dc3545',
                        }}>
                          {margin}%
                        </span>
                      </td>
                      <td style={styles.td}>K {stats.cash.toFixed(2)}</td>
                      <td style={{
                        ...styles.td,
                        fontWeight: '700',
                        color: stats.variance < 0 ? '#dc3545' : '#28a745'
                      }}>
                        K {stats.variance.toFixed(2)}
                        {stats.variance < 0 && ' ⚠️'}
                      </td>
                    </tr>
                  );
                })}
                {/* Totals Row */}
                <tr style={styles.totalRow}>
                  <td style={{ ...styles.td, fontWeight: '800' }}>TOTAL</td>
                  <td style={styles.td}>{filtered.length}</td>
                  <td style={{ ...styles.td, fontWeight: '800' }}>
                    K {totalSales.toFixed(2)}
                  </td>
                  <td style={{ ...styles.td, fontWeight: '800', color: '#e94560' }}>
                    K {totalExpenses.toFixed(2)}
                  </td>
                  <td style={{
                    ...styles.td, fontWeight: '800',
                    color: grossProfit >= 0 ? '#28a745' : '#dc3545'
                  }}>
                    K {grossProfit.toFixed(2)}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      background: '#f0f4ff', color: '#0f3460'
                    }}>
                      {totalSales > 0
                        ? `${((grossProfit / totalSales) * 100).toFixed(1)}%`
                        : '0%'}
                    </span>
                  </td>
                  <td style={{ ...styles.td, fontWeight: '800' }}>
                    K {totalCash.toFixed(2)}
                  </td>
                  <td style={{
                    ...styles.td, fontWeight: '800',
                    color: totalVariance < 0 ? '#dc3545' : '#28a745'
                  }}>
                    K {totalVariance.toFixed(2)}
                  </td>
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
    const unsubR = onSnapshot(
      query(collection(db, 'dailyReports'), orderBy('createdAt', 'desc')),
      (snap) => setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubB = onSnapshot(collection(db, 'branches'), (snap) => {
      setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubR(); unsubB(); };
  }, []);

  const periodLabel = { today: 'Today', week: 'This Week', month: 'This Month' };

  let filtered = filterByPeriod(reports, period);
  if (filterBranch) {
    filtered = filtered.filter((r) => r.branchId === filterBranch);
  }

  // Build expense categories from itemized expenses
  const categoryMap = {};
  filtered.forEach((report) => {
    (report.expenses || []).forEach((expense) => {
      if (!expense.description || !expense.amount) return;
      const key = expense.description.trim();
      if (!categoryMap[key]) categoryMap[key] = 0;
      categoryMap[key] += parseFloat(expense.amount) || 0;
    });
  });

  const categories = Object.entries(categoryMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const totalExpenses = categories.reduce((s, c) => s + c.amount, 0);

  // Branch expense breakdown
  function getBranchExpenses(branchId) {
    const branchReports = filtered.filter((r) => r.branchId === branchId);
    return branchReports.reduce((s, r) => s + (r.totalExpenses || 0), 0);
  }

  return (
    <div>
      {/* Period & Filter */}
      <div style={styles.filterRow}>
        <div style={styles.periodRow}>
          {['today', 'week', 'month'].map((p) => (
            <button
              key={p}
              style={period === p ? styles.periodActive : styles.periodBtn}
              onClick={() => setPeriod(p)}
            >
              {periodLabel[p]}
            </button>
          ))}
        </div>
        <select style={styles.filterSelect} value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}>
          <option value="">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Total Expenses Card */}
      <div style={{ ...styles.sectionCard, marginBottom: '20px' }}>
        <h3 style={styles.sectionTitle}>📋 Total Expenses — {periodLabel[period]}</h3>
        <p style={styles.bigNumber}>K {totalExpenses.toFixed(2)}</p>

        {categories.length === 0 ? (
          <div style={styles.empty}>No expense data for this period.</div>
        ) : (
          <div style={styles.categoryList}>
            {categories.map((cat, i) => {
              const pct = totalExpenses > 0
                ? ((cat.amount / totalExpenses) * 100).toFixed(1) : 0;
              return (
                <div key={i} style={styles.categoryItem}>
                  <div style={styles.categoryHeader}>
                    <span style={styles.categoryName}>{cat.name}</span>
                    <span style={styles.categoryAmount}>
                      K {cat.amount.toFixed(2)} ({pct}%)
                    </span>
                  </div>
                  <div style={styles.progressBar}>
                    <div style={{
                      ...styles.progressFill,
                      width: `${pct}%`,
                      background: i % 3 === 0 ? '#0f3460'
                        : i % 3 === 1 ? '#e94560' : '#f39c12',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Branch Expense Breakdown */}
      <div style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>🏪 Expenses by Branch</h3>
        {branches.map((branch, i) => {
          const amount = getBranchExpenses(branch.id);
          if (amount === 0) return null;
          const pct = totalExpenses > 0
            ? ((amount / totalExpenses) * 100).toFixed(1) : 0;
          return (
            <div key={branch.id} style={styles.categoryItem}>
              <div style={styles.categoryHeader}>
                <span style={styles.categoryName}>🏪 {branch.name}</span>
                <span style={styles.categoryAmount}>
                  K {amount.toFixed(2)} ({pct}%)
                </span>
              </div>
              <div style={styles.progressBar}>
                <div style={{
                  ...styles.progressFill,
                  width: `${pct}%`,
                  background: '#0f3460',
                }} />
              </div>
            </div>
          );
        })}
        {totalExpenses === 0 && (
          <div style={styles.empty}>No expense data for this period.</div>
        )}
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
    const unsubR = onSnapshot(
      query(collection(db, 'dailyReports'), orderBy('createdAt', 'desc')),
      (snap) => setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubB = onSnapshot(collection(db, 'branches'), (snap) => {
      setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubP = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
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

  const branchStats = branches
    .map((b) => ({ ...b, ...getBranchProfit(b.id) }))
    .filter((b) => b.sales > 0)
    .sort((a, b) => b.profit - a.profit);

  const bestBranch = branchStats[0];
  const worstBranch = branchStats[branchStats.length - 1];

  // Product margins
  const productMargins = products.map((p) => {
    const margin = p.sellingPrice && p.buyingPrice
      ? (((p.sellingPrice - p.buyingPrice) / p.buyingPrice) * 100).toFixed(1)
      : null;
    const profitPerUnit = (p.sellingPrice || 0) - (p.buyingPrice || 0);
    return { ...p, margin: parseFloat(margin), profitPerUnit };
  }).sort((a, b) => b.margin - a.margin);

  return (
    <div>
      {/* Period Selector */}
      <div style={styles.periodRow}>
        {['today', 'week', 'month'].map((p) => (
          <button
            key={p}
            style={period === p ? styles.periodActive : styles.periodBtn}
            onClick={() => setPeriod(p)}
          >
            {periodLabel[p]}
          </button>
        ))}
      </div>

      {/* Branch Performance Highlights */}
      {branchStats.length > 0 && (
        <div style={styles.highlightGrid}>
          <div style={{ ...styles.highlightCard, borderTop: '4px solid #28a745' }}>
            <p style={styles.highlightLabel}>🏆 Best Performing Branch</p>
            <p style={styles.highlightBranch}>{bestBranch?.name}</p>
            <p style={styles.highlightValue}>
              K {bestBranch?.profit.toFixed(2)} profit
            </p>
            <p style={styles.highlightSub}>
              {bestBranch?.sales > 0
                ? `${((bestBranch.profit / bestBranch.sales) * 100).toFixed(1)}% margin`
                : ''}
            </p>
          </div>
          <div style={{ ...styles.highlightCard, borderTop: '4px solid #f39c12' }}>
            <p style={styles.highlightLabel}>📉 Needs Attention</p>
            <p style={styles.highlightBranch}>{worstBranch?.name}</p>
            <p style={{
              ...styles.highlightValue,
              color: worstBranch?.profit < 0 ? '#dc3545' : '#f39c12'
            }}>
              K {worstBranch?.profit.toFixed(2)} profit
            </p>
            <p style={styles.highlightSub}>
              {worstBranch?.sales > 0
                ? `${((worstBranch.profit / worstBranch.sales) * 100).toFixed(1)}% margin`
                : ''}
            </p>
          </div>
        </div>
      )}

      {/* Branch Profitability Table */}
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
                  const margin = branch.sales > 0
                    ? ((branch.profit / branch.sales) * 100).toFixed(1) : 0;
                  return (
                    <tr key={branch.id}
                      style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.td}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </td>
                      <td style={{ ...styles.td, fontWeight: '700' }}>
                        {branch.name}
                      </td>
                      <td style={styles.td}>K {branch.sales.toFixed(2)}</td>
                      <td style={{ ...styles.td, color: '#e94560' }}>
                        K {branch.expenses.toFixed(2)}
                      </td>
                      <td style={{
                        ...styles.td, fontWeight: '800',
                        color: branch.profit >= 0 ? '#28a745' : '#dc3545'
                      }}>
                        K {branch.profit.toFixed(2)}
                      </td>
                      <td style={styles.td}>{margin}%</td>
                      <td style={styles.td}>
                        <div style={styles.progressBar}>
                          <div style={{
                            ...styles.progressFill,
                            width: `${Math.min(parseFloat(margin), 100)}%`,
                            background: parseFloat(margin) >= 30 ? '#28a745'
                              : parseFloat(margin) >= 10 ? '#f39c12' : '#dc3545',
                          }} />
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

      {/* Product Profitability */}
      <div style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>📦 Product Profit Margins</h3>
        <p style={styles.sectionSub}>
          Based on buying vs selling price from product master list.
        </p>
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
                  <tr key={p.id}
                    style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={styles.td}>{i + 1}</td>
                    <td style={{ ...styles.td, fontWeight: '600' }}>{p.name}</td>
                    <td style={styles.td}>K {(p.buyingPrice || 0).toFixed(2)}</td>
                    <td style={styles.td}>K {(p.sellingPrice || 0).toFixed(2)}</td>
                    <td style={{
                      ...styles.td, fontWeight: '700',
                      color: p.profitPerUnit >= 0 ? '#28a745' : '#dc3545'
                    }}>
                      K {p.profitPerUnit.toFixed(2)}
                    </td>
                    <td style={{
                      ...styles.td, fontWeight: '700',
                      color: p.margin >= 20 ? '#28a745'
                        : p.margin >= 0 ? '#f39c12' : '#dc3545'
                    }}>
                      {p.margin !== null ? `${p.margin}%` : '—'}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        background: p.margin >= 20 ? '#e6f9ee'
                          : p.margin >= 0 ? '#fff8e1' : '#fff0f0',
                        color: p.margin >= 20 ? '#28a745'
                          : p.margin >= 0 ? '#f39c12' : '#dc3545',
                      }}>
                        {p.margin >= 20 ? '✅ Good'
                          : p.margin >= 0 ? '⚠️ Low'
                          : '❌ Loss'}
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

// ─── FINANCE REPORTS ──────────────────────────────────────
function FinanceReports() {
  const [reports, setReports] = useState([]);
  const [branches, setBranches] = useState([]);
  const [period, setPeriod] = useState('today');
  const [filterBranch, setFilterBranch] = useState('');

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

  const periodLabel = { today: 'Daily', week: 'Weekly', month: 'Monthly' };

  let filtered = filterByPeriod(reports, period);
  if (filterBranch) {
    filtered = filtered.filter((r) => r.branchId === filterBranch);
  }

  const totalSales = filtered.reduce((s, r) => s + (r.totalSales || 0), 0);
  const totalExpenses = filtered.reduce((s, r) => s + (r.totalExpenses || 0), 0);
  const grossProfit = totalSales - totalExpenses;
  const totalCash = filtered.reduce((s, r) => s + (r.actualCash || 0), 0);
  const totalVariance = filtered.reduce((s, r) => s + (r.variance || 0), 0);

  function handlePrint() {
    const { start, end } = getPeriodDates(period);
    const branchLabel = filterBranch
      ? branches.find((b) => b.id === filterBranch)?.name
      : 'All Branches';

    const rows = filtered.map((r, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f9f9f9'}">
        <td>${r.date}</td>
        <td>${r.branchName}</td>
        <td>K ${(r.totalSales || 0).toFixed(2)}</td>
        <td>K ${(r.totalExpenses || 0).toFixed(2)}</td>
        <td>K ${((r.totalSales || 0) - (r.totalExpenses || 0)).toFixed(2)}</td>
        <td>K ${(r.actualCash || 0).toFixed(2)}</td>
        <td style="color:${(r.variance || 0) < 0 ? '#dc3545' : '#28a745'}">
          K ${(r.variance || 0).toFixed(2)}
        </td>
        <td>${r.submittedBy}</td>
      </tr>
    `).join('');

    const expenseMap = {};
    filtered.forEach((r) => {
      (r.expenses || []).forEach((e) => {
        if (!e.description) return;
        expenseMap[e.description] = (expenseMap[e.description] || 0) + parseFloat(e.amount || 0);
      });
    });

    const expenseRows = Object.entries(expenseMap)
      .sort(([, a], [, b]) => b - a)
      .map(([name, amount]) => `
        <tr>
          <td>${name}</td>
          <td>K ${amount.toFixed(2)}</td>
          <td>${totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0}%</td>
        </tr>
      `).join('');

    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${periodLabel[period]} Financial Report — CBMS</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { color: #0f3460; margin-bottom: 4px; }
          .meta { color: #666; font-size: 13px; margin-bottom: 20px; }
          .summary { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
          .summary-box { background: #f0f4ff; padding: 12px 20px; border-radius: 8px; min-width: 120px; }
          .summary-box .label { font-size: 11px; color: #888; margin: 0; }
          .summary-box .value { font-size: 20px; font-weight: 800; color: #0f3460; margin: 4px 0 0; }
          h2 { color: #0f3460; font-size: 15px; margin: 24px 0 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #0f3460; color: white; padding: 8px 12px; text-align: left; font-size: 12px; }
          td { padding: 7px 12px; font-size: 12px; border-bottom: 1px solid #eee; }
          .total-row td { font-weight: 800; background: #f0f4ff; }
          .profit { color: #28a745; }
          .loss { color: #dc3545; }
          .footer { margin-top: 30px; font-size: 11px; color: #aaa; text-align: center; }
        </style>
      </head>
      <body>
        <h1>📊 ${periodLabel[period]} Financial Report</h1>
        <p class="meta">
          Solution Enterprises — CBMS<br>
          Period: ${start} to ${end}<br>
          Branch: ${branchLabel}<br>
          Generated: ${new Date().toLocaleDateString('en-GB', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </p>

        <div class="summary">
          <div class="summary-box">
            <p class="label">Total Sales</p>
            <p class="value">K ${totalSales.toFixed(2)}</p>
          </div>
          <div class="summary-box">
            <p class="label">Total Expenses</p>
            <p class="value">K ${totalExpenses.toFixed(2)}</p>
          </div>
          <div class="summary-box">
            <p class="label">Gross Profit</p>
            <p class="value ${grossProfit >= 0 ? 'profit' : 'loss'}">
              K ${grossProfit.toFixed(2)}
            </p>
          </div>
          <div class="summary-box">
            <p class="label">Cash in Hand</p>
            <p class="value">K ${totalCash.toFixed(2)}</p>
          </div>
          <div class="summary-box">
            <p class="label">Variance</p>
            <p class="value ${totalVariance < 0 ? 'loss' : 'profit'}">
              K ${totalVariance.toFixed(2)}
            </p>
          </div>
        </div>

        <h2>📋 Branch Reports Detail</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Branch</th>
              <th>Sales</th>
              <th>Expenses</th>
              <th>Profit</th>
              <th>Cash</th>
              <th>Variance</th>
              <th>Submitted By</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td colspan="2">TOTAL</td>
              <td>K ${totalSales.toFixed(2)}</td>
              <td>K ${totalExpenses.toFixed(2)}</td>
              <td class="${grossProfit >= 0 ? 'profit' : 'loss'}">
                K ${grossProfit.toFixed(2)}
              </td>
              <td>K ${totalCash.toFixed(2)}</td>
              <td class="${totalVariance < 0 ? 'loss' : 'profit'}">
                K ${totalVariance.toFixed(2)}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <h2>💸 Expense Breakdown by Category</h2>
        <table>
          <thead>
            <tr>
              <th>Expense Category</th>
              <th>Total Amount</th>
              <th>% of Expenses</th>
            </tr>
          </thead>
          <tbody>
            ${expenseRows || '<tr><td colspan="3">No expenses recorded.</td></tr>'}
            <tr class="total-row">
              <td>TOTAL</td>
              <td>K ${totalExpenses.toFixed(2)}</td>
              <td>100%</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          CBMS — Central Business Management System © ${new Date().getFullYear()}
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.print();
  }

  return (
    <div style={styles.sectionCard}>
      <div style={styles.sectionHeader}>
        <div>
          <h3 style={styles.sectionTitle}>🖨️ Financial Reports</h3>
          <p style={styles.sectionSub}>
            Generate and print financial reports for any period.
          </p>
        </div>
        <button style={styles.printBtn} onClick={handlePrint}>
          🖨️ Print / Export PDF
        </button>
      </div>

      {/* Filters */}
      <div style={styles.filterRow}>
        <div style={styles.periodRow}>
          {['today', 'week', 'month'].map((p) => (
            <button
              key={p}
              style={period === p ? styles.periodActive : styles.periodBtn}
              onClick={() => setPeriod(p)}
            >
              {periodLabel[p]} Report
            </button>
          ))}
        </div>
        <select style={styles.filterSelect} value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}>
          <option value="">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Preview */}
      <div style={styles.reportPreview}>
        <h4 style={styles.previewTitle}>📊 Report Preview</h4>
        <div style={styles.previewGrid}>
          <div style={styles.previewBox}>
            <p style={styles.previewLabel}>Total Sales</p>
            <p style={styles.previewValue}>K {totalSales.toFixed(2)}</p>
          </div>
          <div style={styles.previewBox}>
            <p style={styles.previewLabel}>Total Expenses</p>
            <p style={{ ...styles.previewValue, color: '#e94560' }}>
              K {totalExpenses.toFixed(2)}
            </p>
          </div>
          <div style={styles.previewBox}>
            <p style={styles.previewLabel}>Gross Profit</p>
            <p style={{
              ...styles.previewValue,
              color: grossProfit >= 0 ? '#28a745' : '#dc3545'
            }}>
              K {grossProfit.toFixed(2)}
            </p>
          </div>
          <div style={styles.previewBox}>
            <p style={styles.previewLabel}>Reports Included</p>
            <p style={styles.previewValue}>{filtered.length}</p>
          </div>
        </div>
        <p style={styles.previewNote}>
          Click "Print / Export PDF" to generate the full report with
          branch breakdown and expense analysis.
        </p>
      </div>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────
const styles = {
  tabRow: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
  tab: {
    padding: '10px 20px', background: 'white',
    border: '2px solid #e0e0e0', borderRadius: '8px',
    fontSize: '14px', cursor: 'pointer', color: '#666',
  },
  tabActive: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #0f3460, #e94560)',
    border: '2px solid transparent', borderRadius: '8px',
    fontSize: '14px', cursor: 'pointer', color: 'white', fontWeight: '700',
  },
  periodRow: { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' },
  periodBtn: {
    padding: '8px 16px', background: 'white',
    border: '2px solid #e0e0e0', borderRadius: '8px',
    fontSize: '13px', cursor: 'pointer', color: '#666',
  },
  periodActive: {
    padding: '8px 16px', background: '#0f3460',
    border: '2px solid #0f3460', borderRadius: '8px',
    fontSize: '13px', cursor: 'pointer', color: 'white', fontWeight: '700',
  },
  filterRow: { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' },
  filterSelect: {
    padding: '8px 14px', borderRadius: '8px',
    border: '2px solid #e0e0e0', fontSize: '14px', outline: 'none',
  },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px', marginBottom: '24px',
  },
  statCard: {
    background: 'white', borderRadius: '12px',
    padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  statLabel: { color: '#888', fontSize: '12px', margin: '0 0 8px' },
  statValue: { color: '#1a1a2e', fontSize: '24px', fontWeight: '800', margin: '0 0 4px' },
  statSub: { color: '#aaa', fontSize: '11px', margin: 0 },
  alertBox: {
    background: '#fff8e1', border: '1px solid #f39c12',
    color: '#856404', padding: '12px 16px', borderRadius: '8px',
    fontSize: '14px', marginBottom: '20px',
  },
  sectionCard: {
    background: 'white', borderRadius: '12px',
    padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    marginBottom: '20px',
  },
  sectionHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '20px',
  },
  sectionTitle: { fontSize: '18px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 4px' },
  sectionSub: { fontSize: '13px', color: '#888', margin: 0 },
  bigNumber: {
    fontSize: '36px', fontWeight: '800',
    color: '#e94560', margin: '0 0 20px',
  },
  categoryList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  categoryItem: { marginBottom: '4px' },
  categoryHeader: {
    display: 'flex', justifyContent: 'space-between',
    marginBottom: '6px',
  },
  categoryName: { fontSize: '14px', fontWeight: '600', color: '#1a1a2e' },
  categoryAmount: { fontSize: '14px', color: '#666' },
  progressBar: {
    height: '8px', background: '#f0f0f0',
    borderRadius: '4px', overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: '4px', transition: 'width 0.3s' },
  highlightGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: '16px', marginBottom: '24px',
  },
  highlightCard: {
    background: 'white', borderRadius: '12px',
    padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  highlightLabel: { fontSize: '12px', color: '#888', margin: '0 0 8px' },
  highlightBranch: { fontSize: '18px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 4px' },
  highlightValue: { fontSize: '22px', fontWeight: '800', color: '#28a745', margin: '0 0 4px' },
  highlightSub: { fontSize: '12px', color: '#aaa', margin: 0 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHead: { background: '#f0f4ff' },
  th: {
    padding: '12px 16px', textAlign: 'left',
    fontSize: '12px', fontWeight: '700', color: '#0f3460',
  },
  td: { padding: '10px 16px', fontSize: '13px', color: '#444' },
  trEven: { background: 'white' },
  trOdd: { background: '#fafafa' },
  totalRow: { background: '#f0f4ff', borderTop: '2px solid #d0e0ff' },
  badge: {
    padding: '3px 10px', borderRadius: '12px',
    fontSize: '12px', fontWeight: '700',
  },
  printBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #0f3460, #e94560)',
    color: 'white', border: 'none', borderRadius: '8px',
    fontSize: '14px', fontWeight: '700', cursor: 'pointer',
  },
  reportPreview: {
    background: '#f0f4ff', borderRadius: '10px',
    padding: '20px', border: '1px solid #d0e0ff',
  },
  previewTitle: { fontSize: '15px', fontWeight: '700', color: '#0f3460', margin: '0 0 16px' },
  previewGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px', marginBottom: '16px',
  },
  previewBox: {
    background: 'white', borderRadius: '8px',
    padding: '12px', textAlign: 'center',
  },
  previewLabel: { fontSize: '11px', color: '#888', margin: '0 0 4px' },
  previewValue: { fontSize: '18px', fontWeight: '800', color: '#0f3460', margin: 0 },
  previewNote: { fontSize: '12px', color: '#888', margin: 0 },
  empty: { textAlign: 'center', padding: '40px', color: '#aaa', fontSize: '14px' },
};