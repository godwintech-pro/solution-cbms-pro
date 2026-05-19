import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('summary');

  const tabs = [
    { id: 'summary', icon: '🧠', label: 'Business Intelligence' },
    { id: 'sales', icon: '📈', label: 'Sales Trends' },
    { id: 'branches', icon: '🏪', label: 'Branch Comparison' },
    { id: 'products', icon: '📦', label: 'Product Insights' },
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

      {activeTab === 'summary' && <BusinessIntelligence />}
      {activeTab === 'sales' && <SalesTrends />}
      {activeTab === 'branches' && <BranchComparison />}
      {activeTab === 'products' && <ProductInsights />}
    </div>
  );
}

// ─── BUSINESS INTELLIGENCE ────────────────────────────────
function BusinessIntelligence() {
  const [reports, setReports] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stock, setStock] = useState([]);

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
    const unsubO = onSnapshot(collection(db, 'orders'), (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubSt = onSnapshot(collection(db, 'stock'), (snap) => {
      setStock(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubR(); unsubB(); unsubP(); unsubO(); unsubSt(); };
  }, []);

  const totalSales = reports.reduce((s, r) => s + (r.totalSales || 0), 0);
  const totalExpenses = reports.reduce((s, r) => s + (r.totalExpenses || 0), 0);
  const totalProfit = totalSales - totalExpenses;
  const overallMargin = totalSales > 0
    ? ((totalProfit / totalSales) * 100).toFixed(1) : 0;

  const branchProfits = branches.map((b) => {
    const branchReports = reports.filter((r) => r.branchId === b.id);
    const sales = branchReports.reduce((s, r) => s + (r.totalSales || 0), 0);
    const expenses = branchReports.reduce((s, r) => s + (r.totalExpenses || 0), 0);
    return { ...b, sales, expenses, profit: sales - expenses, reportCount: branchReports.length };
  }).filter((b) => b.sales > 0).sort((a, b) => b.profit - a.profit);

  const bestBranch = branchProfits[0];
  const worstBranch = branchProfits[branchProfits.length - 1];

  const dayMap = { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };
  const dayTotals = {};
  reports.forEach((r) => {
    if (!r.date) return;
    const day = new Date(r.date).getDay();
    const label = dayMap[day];
    if (!dayTotals[label]) dayTotals[label] = 0;
    dayTotals[label] += r.totalSales || 0;
  });
  const bestDay = Object.entries(dayTotals).sort(([, a], [, b]) => b - a)[0];

  const expenseMap = {};
  reports.forEach((r) => {
    (r.expenses || []).forEach((e) => {
      if (!e.description) return;
      expenseMap[e.description] = (expenseMap[e.description] || 0) + parseFloat(e.amount || 0);
    });
  });
  const biggestExpense = Object.entries(expenseMap).sort(([, a], [, b]) => b - a)[0];

  const orderMap = {};
  orders.forEach((o) => {
    (o.items || []).forEach((item) => {
      orderMap[item.productName] = (orderMap[item.productName] || 0) + (item.quantityNeeded || 0);
    });
  });
  const mostOrdered = Object.entries(orderMap).sort(([, a], [, b]) => b - a)[0];

  const varianceAlerts = reports.filter((r) => (r.variance || 0) < 0);
  const branchVarianceCounts = {};
  varianceAlerts.forEach((r) => {
    branchVarianceCounts[r.branchName] = (branchVarianceCounts[r.branchName] || 0) + 1;
  });

  const lowStockItems = stock.filter((s) => {
    const product = products.find((p) => p.id === s.productId);
    return product && s.currentQuantity <= product.reorderLevel;
  });

  const consecutiveVariance = [];
  branches.forEach((branch) => {
    const branchReports = reports
      .filter((r) => r.branchId === branch.id && (r.variance || 0) < 0)
      .sort((a, b) => b.date?.localeCompare(a.date));
    if (branchReports.length >= 3) {
      consecutiveVariance.push({ branch: branch.name, count: branchReports.length });
    }
  });

  const last7 = reports
    .filter((r) => {
      const d = new Date(r.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    })
    .reduce((s, r) => s + (r.totalSales || 0), 0);

  const prev7 = reports
    .filter((r) => {
      const d = new Date(r.date);
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= twoWeeksAgo && d < weekAgo;
    })
    .reduce((s, r) => s + (r.totalSales || 0), 0);

  const salesGrowth = prev7 > 0
    ? (((last7 - prev7) / prev7) * 100).toFixed(1) : null;

  const lossProducts = products.filter(
    (p) => p.buyingPrice && p.sellingPrice && p.sellingPrice < p.buyingPrice
  );

  const suggestions = [];

  if (consecutiveVariance.length > 0) {
    consecutiveVariance.forEach((item) => {
      suggestions.push({
        type: 'danger', icon: '🚨',
        title: 'Repeated Cash Variance Detected',
        message: `${item.branch} has had cash variance in ${item.count} reports. This is a red flag — investigate immediately for possible cash mismanagement.`,
        action: 'Go to Reports → Filter by branch → Review variance pattern',
      });
    });
  }

  if (worstBranch && branchProfits.length > 1) {
    const margin = worstBranch.sales > 0
      ? ((worstBranch.profit / worstBranch.sales) * 100).toFixed(1) : 0;
    suggestions.push({
      type: parseFloat(margin) < 10 ? 'danger' : 'warning', icon: '📉',
      title: `${worstBranch.name} Needs Attention`,
      message: `This branch has the lowest profit margin at ${margin}%. Review its expenses and sales performance to identify what's pulling it down.`,
      action: 'Go to Finance → Profitability → Compare with other branches',
    });
  }

  if (salesGrowth !== null) {
    if (parseFloat(salesGrowth) > 10) {
      suggestions.push({
        type: 'success', icon: '🚀',
        title: 'Sales Growth Detected',
        message: `Total sales are up ${salesGrowth}% compared to the previous 7 days. Consider increasing stock levels to meet growing demand.`,
        action: 'Go to Orders → Create orders to replenish stock',
      });
    } else if (parseFloat(salesGrowth) < -10) {
      suggestions.push({
        type: 'warning', icon: '📊',
        title: 'Sales Decline Detected',
        message: `Total sales dropped ${Math.abs(salesGrowth)}% compared to last week. Investigate which branches are underperforming and why.`,
        action: 'Go to Reports → Overview → Check branch submissions',
      });
    }
  }

  if (lowStockItems.length > 0) {
    suggestions.push({
      type: 'warning', icon: '📦',
      title: `${lowStockItems.length} Products Below Reorder Level`,
      message: `Stock is critically low on ${lowStockItems.length} product entries across branches. Place orders now to avoid stockouts which directly reduce sales.`,
      action: 'Go to Orders → Create Order → Select low stock products',
    });
  }

  if (lossProducts.length > 0) {
    suggestions.push({
      type: 'danger', icon: '💸',
      title: 'Products Selling Below Cost Price',
      message: `${lossProducts.map((p) => p.name).join(', ')} ${lossProducts.length === 1 ? 'is' : 'are'} being sold below buying price. Every sale is a loss. Review and correct pricing immediately.`,
      action: 'Go to Inventory → Products → Edit selling prices',
    });
  }

  if (bestBranch) {
    suggestions.push({
      type: 'success', icon: '🏆',
      title: `${bestBranch.name} is Your Top Performer`,
      message: `This branch generated K ${bestBranch.profit.toFixed(2)} in total profit with ${bestBranch.reportCount} reports. Study what makes it successful and replicate at other branches.`,
      action: 'Go to Finance → Profitability → Study branch patterns',
    });
  }

  if (biggestExpense) {
    const pct = totalExpenses > 0
      ? ((biggestExpense[1] / totalExpenses) * 100).toFixed(1) : 0;
    if (parseFloat(pct) > 30) {
      suggestions.push({
        type: 'warning', icon: '💡',
        title: `${biggestExpense[0]} is Your Largest Expense`,
        message: `"${biggestExpense[0]}" accounts for ${pct}% of all expenses at K ${biggestExpense[1].toFixed(2)}. This is worth reviewing — can it be reduced or negotiated?`,
        action: 'Go to Finance → Expense Analysis → Review by category',
      });
    }
  }

  if (mostOrdered) {
    suggestions.push({
      type: 'info', icon: '🛒',
      title: `${mostOrdered[0]} is Your Most Ordered Product`,
      message: `This product has been ordered ${mostOrdered[1]} units total. Maintain healthy stock levels and negotiate better supplier pricing given the volume.`,
      action: 'Go to Inventory → Stock Levels → Monitor this product',
    });
  }

  if (reports.length === 0) {
    suggestions.push({
      type: 'info', icon: '📋',
      title: 'No Report Data Yet',
      message: 'Start by having branch managers submit daily reports. Once data flows in, the intelligence engine will generate real insights and recommendations.',
      action: 'Go to Reports → Submit Report → Start submitting daily',
    });
  }

  const typeColors = {
    danger: { bg: '#fff0f0', border: '#ffcccc', icon: '#dc3545', badge: '#dc3545', badgeBg: '#fff0f0' },
    warning: { bg: '#fff8e1', border: '#ffe082', icon: '#f39c12', badge: '#f39c12', badgeBg: '#fff8e1' },
    success: { bg: '#e6f9ee', border: '#b2dfdb', icon: '#28a745', badge: '#28a745', badgeBg: '#e6f9ee' },
    info: { bg: '#f0f4ff', border: '#d0e0ff', icon: '#0f3460', badge: '#0f3460', badgeBg: '#f0f4ff' },
  };

  const typeLabels = {
    danger: '🚨 Action Required',
    warning: '⚠️ Review Needed',
    success: '✅ Good News',
    info: '💡 Insight',
  };

  return (
    <div>
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, borderTop: '4px solid #0f3460' }}>
          <p style={styles.statLabel}>Total Sales (All Time)</p>
          <p style={styles.statValue}>K {totalSales.toFixed(2)}</p>
          <p style={styles.statSub}>{reports.length} reports submitted</p>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #28a745' }}>
          <p style={styles.statLabel}>Overall Profit Margin</p>
          <p style={{ ...styles.statValue, color: parseFloat(overallMargin) >= 20 ? '#28a745' : '#f39c12' }}>
            {overallMargin}%
          </p>
          <p style={styles.statSub}>K {totalProfit.toFixed(2)} total profit</p>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #e94560' }}>
          <p style={styles.statLabel}>Best Day for Sales</p>
          <p style={styles.statValue}>{bestDay ? bestDay[0] : '—'}</p>
          <p style={styles.statSub}>{bestDay ? `K ${bestDay[1].toFixed(2)} total` : 'No data yet'}</p>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #f39c12' }}>
          <p style={styles.statLabel}>Variance Alerts (All Time)</p>
          <p style={{ ...styles.statValue, color: varianceAlerts.length > 0 ? '#dc3545' : '#28a745' }}>
            {varianceAlerts.length}
          </p>
          <p style={styles.statSub}>
            {varianceAlerts.length > 0 ? 'Cash discrepancies found' : 'No discrepancies'}
          </p>
        </div>
      </div>

      <div style={styles.intelligenceHeader}>
        <div style={styles.intelligenceTitle}>
          <span style={styles.intelligenceBrain}>🧠</span>
          <div>
            <h3 style={styles.intelligenceTitleText}>Business Intelligence Engine</h3>
            <p style={styles.intelligenceSub}>
              {suggestions.length} insights generated based on your business data.
              Act on these to improve profitability and operations.
            </p>
          </div>
        </div>
        <div style={styles.suggestionCounts}>
          <span style={{ ...styles.countBadge, background: '#fff0f0', color: '#dc3545' }}>
            🚨 {suggestions.filter((s) => s.type === 'danger').length} Critical
          </span>
          <span style={{ ...styles.countBadge, background: '#fff8e1', color: '#f39c12' }}>
            ⚠️ {suggestions.filter((s) => s.type === 'warning').length} Warnings
          </span>
          <span style={{ ...styles.countBadge, background: '#e6f9ee', color: '#28a745' }}>
            ✅ {suggestions.filter((s) => s.type === 'success').length} Positive
          </span>
        </div>
      </div>

      <div style={styles.suggestionsList}>
        {suggestions.map((s, i) => {
          const colors = typeColors[s.type];
          return (
            <div key={i} style={{
              ...styles.suggestionCard,
              background: colors.bg,
              border: `1px solid ${colors.border}`,
            }}>
              <div style={styles.suggestionHeader}>
                <div style={styles.suggestionLeft}>
                  <span style={styles.suggestionIcon}>{s.icon}</span>
                  <div>
                    <div style={styles.suggestionTitleRow}>
                      <span style={{
                        ...styles.typeBadge,
                        background: colors.badgeBg,
                        color: colors.badge,
                        border: `1px solid ${colors.border}`,
                      }}>
                        {typeLabels[s.type]}
                      </span>
                    </div>
                    <h4 style={{ ...styles.suggestionTitle, color: colors.icon }}>
                      {s.title}
                    </h4>
                  </div>
                </div>
              </div>
              <p style={styles.suggestionMessage}>{s.message}</p>
              <div style={styles.suggestionAction}>
                <span style={styles.actionLabel}>👉 Recommended Action:</span>
                <span style={styles.actionText}>{s.action}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SALES TRENDS ─────────────────────────────────────────
function SalesTrends() {
  const [reports, setReports] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filterBranch, setFilterBranch] = useState('');

  useEffect(() => {
    const unsubR = onSnapshot(
      query(collection(db, 'dailyReports'), orderBy('date', 'asc')),
      (snap) => setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubB = onSnapshot(collection(db, 'branches'), (snap) => {
      setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubR(); unsubB(); };
  }, []);

  const filtered = filterBranch
    ? reports.filter((r) => r.branchId === filterBranch)
    : reports;

  const dateMap = {};
  filtered.forEach((r) => {
    if (!r.date) return;
    if (!dateMap[r.date]) {
      dateMap[r.date] = { date: r.date, Sales: 0, Expenses: 0, Profit: 0 };
    }
    dateMap[r.date].Sales += r.totalSales || 0;
    dateMap[r.date].Expenses += r.totalExpenses || 0;
    dateMap[r.date].Profit += (r.totalSales || 0) - (r.totalExpenses || 0);
  });

  const chartData = Object.values(dateMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      date: d.date.slice(5),
      Sales: parseFloat(d.Sales.toFixed(2)),
      Expenses: parseFloat(d.Expenses.toFixed(2)),
      Profit: parseFloat(d.Profit.toFixed(2)),
    }));

  const max = chartData.length > 0
    ? Math.max(...chartData.map((x) => Math.max(x.Sales, x.Expenses, x.Profit))) : 1;

  return (
    <div style={styles.sectionCard}>
      <div style={styles.sectionHeader}>
        <div>
          <h3 style={styles.sectionTitle}>📈 Sales Trends</h3>
          <p style={styles.sectionSub}>Sales, expenses and profit over time.</p>
        </div>
        <select style={styles.filterSelect} value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}>
          <option value="">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {chartData.length === 0 ? (
        <div style={styles.empty}>
          No report data yet. Submit daily reports to see trends.
        </div>
      ) : (
        <div style={styles.chartWrap}>
          <div style={styles.chartLegend}>
            <span style={styles.legendItem}>
              <span style={{ ...styles.legendDot, background: '#0f3460' }} /> Sales
            </span>
            <span style={styles.legendItem}>
              <span style={{ ...styles.legendDot, background: '#e94560' }} /> Expenses
            </span>
            <span style={styles.legendItem}>
              <span style={{ ...styles.legendDot, background: '#28a745' }} /> Profit
            </span>
          </div>
          {chartData.map((d, i) => (
            <div key={i} style={styles.chartRow}>
              <span style={styles.chartLabel}>{d.date}</span>
              <div style={styles.chartBars}>
                <div style={styles.chartBarGroup}>
                  <div style={{
                    ...styles.chartBar,
                    width: `${max > 0 ? (d.Sales / max) * 100 : 0}%`,
                    background: '#0f3460',
                  }} />
                  <div style={{
                    ...styles.chartBar,
                    width: `${max > 0 ? (d.Expenses / max) * 100 : 0}%`,
                    background: '#e94560',
                  }} />
                  <div style={{
                    ...styles.chartBar,
                    width: `${max > 0 ? (Math.max(d.Profit, 0) / max) * 100 : 0}%`,
                    background: '#28a745',
                  }} />
                </div>
                <span style={styles.chartValue}>K {d.Sales.toFixed(0)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── BRANCH COMPARISON ────────────────────────────────────
function BranchComparison() {
  const [reports, setReports] = useState([]);
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    const unsubR = onSnapshot(collection(db, 'dailyReports'), (snap) => {
      setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubB = onSnapshot(collection(db, 'branches'), (snap) => {
      setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubR(); unsubB(); };
  }, []);

  const chartData = branches.map((branch) => {
    const branchReports = reports.filter((r) => r.branchId === branch.id);
    const sales = branchReports.reduce((s, r) => s + (r.totalSales || 0), 0);
    const expenses = branchReports.reduce((s, r) => s + (r.totalExpenses || 0), 0);
    const profit = sales - expenses;
    return {
      name: branch.name.split(' ')[0],
      fullName: branch.name,
      Sales: parseFloat(sales.toFixed(2)),
      Expenses: parseFloat(expenses.toFixed(2)),
      Profit: parseFloat(profit.toFixed(2)),
    };
  }).filter((b) => b.Sales > 0);

  const max = chartData.length > 0
    ? Math.max(...chartData.map((x) => Math.max(x.Sales, x.Expenses, x.Profit))) : 1;

  return (
    <div style={styles.sectionCard}>
      <h3 style={styles.sectionTitle}>🏪 Branch Comparison</h3>
      <p style={styles.sectionSub}>All-time sales, expenses and profit per branch.</p>

      {chartData.length === 0 ? (
        <div style={styles.empty}>No report data yet.</div>
      ) : (
        <>
          <div style={styles.chartWrap}>
            <div style={styles.chartLegend}>
              <span style={styles.legendItem}>
                <span style={{ ...styles.legendDot, background: '#0f3460' }} /> Sales
              </span>
              <span style={styles.legendItem}>
                <span style={{ ...styles.legendDot, background: '#e94560' }} /> Expenses
              </span>
              <span style={styles.legendItem}>
                <span style={{ ...styles.legendDot, background: '#28a745' }} /> Profit
              </span>
            </div>
            {chartData.map((branch, i) => (
              <div key={i} style={styles.chartRow}>
                <span style={styles.chartLabel}>{branch.name}</span>
                <div style={styles.chartBars}>
                  <div style={styles.chartBarGroup}>
                    <div style={{
                      ...styles.chartBar,
                      width: `${max > 0 ? (branch.Sales / max) * 100 : 0}%`,
                      background: '#0f3460',
                    }} />
                    <div style={{
                      ...styles.chartBar,
                      width: `${max > 0 ? (branch.Expenses / max) * 100 : 0}%`,
                      background: '#e94560',
                    }} />
                    <div style={{
                      ...styles.chartBar,
                      width: `${max > 0 ? (Math.max(branch.Profit, 0) / max) * 100 : 0}%`,
                      background: '#28a745',
                    }} />
                  </div>
                  <span style={styles.chartValue}>K {branch.Sales.toFixed(0)}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ ...styles.tableWrap, marginTop: '24px' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHead}>
                  <th style={styles.th}>Rank</th>
                  <th style={styles.th}>Branch</th>
                  <th style={styles.th}>Total Sales</th>
                  <th style={styles.th}>Total Expenses</th>
                  <th style={styles.th}>Total Profit</th>
                  <th style={styles.th}>Margin</th>
                </tr>
              </thead>
              <tbody>
                {chartData.sort((a, b) => b.Profit - a.Profit).map((b, i) => {
                  const margin = b.Sales > 0
                    ? ((b.Profit / b.Sales) * 100).toFixed(1) : 0;
                  return (
                    <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.td}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                      </td>
                      <td style={{ ...styles.td, fontWeight: '700' }}>{b.fullName}</td>
                      <td style={styles.td}>K {b.Sales.toFixed(2)}</td>
                      <td style={{ ...styles.td, color: '#e94560' }}>
                        K {b.Expenses.toFixed(2)}
                      </td>
                      <td style={{
                        ...styles.td, fontWeight: '800',
                        color: b.Profit >= 0 ? '#28a745' : '#dc3545'
                      }}>
                        K {b.Profit.toFixed(2)}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          background: parseFloat(margin) >= 20 ? '#e6f9ee' : '#fff8e1',
                          color: parseFloat(margin) >= 20 ? '#28a745' : '#f39c12',
                        }}>
                          {margin}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ─── PRODUCT INSIGHTS ─────────────────────────────────────
function ProductInsights() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stock, setStock] = useState([]);

  useEffect(() => {
    const unsubP = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubO = onSnapshot(collection(db, 'orders'), (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubSt = onSnapshot(collection(db, 'stock'), (snap) => {
      setStock(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubP(); unsubO(); unsubSt(); };
  }, []);

  const orderFreq = {};
  const orderQty = {};
  orders.forEach((o) => {
    (o.items || []).forEach((item) => {
      orderFreq[item.productId] = (orderFreq[item.productId] || 0) + 1;
      orderQty[item.productId] = (orderQty[item.productId] || 0) + (item.quantityNeeded || 0);
    });
  });

  const enriched = products.map((p) => ({
    ...p,
    orderCount: orderFreq[p.id] || 0,
    totalOrdered: orderQty[p.id] || 0,
    totalStock: stock
      .filter((s) => s.productId === p.id)
      .reduce((sum, s) => sum + (s.currentQuantity || 0), 0),
    isLowStock: stock.some((s) => s.productId === p.id && s.currentQuantity <= p.reorderLevel),
  }));

  const fastMovers = [...enriched]
    .filter((p) => p.orderCount > 0)
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, 5);

  const deadStock = enriched.filter((p) => p.orderCount === 0);
  const lowStock = enriched.filter((p) => p.isLowStock);

  const fastMoverChart = fastMovers.map((p) => ({
    name: p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name,
    Orders: p.orderCount,
    Qty: p.totalOrdered,
  }));

  const maxFast = fastMoverChart.length > 0
    ? Math.max(...fastMoverChart.map((x) => Math.max(x.Orders, x.Qty))) : 1;

  return (
    <div>
      <div style={{ ...styles.sectionCard, marginBottom: '20px' }}>
        <h3 style={styles.sectionTitle}>🚀 Fast Moving Products</h3>
        <p style={styles.sectionSub}>Most frequently ordered products.</p>

        {fastMovers.length === 0 ? (
          <div style={styles.empty}>No order data yet.</div>
        ) : (
          <>
            <div style={styles.chartWrap}>
              <div style={styles.chartLegend}>
                <span style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, background: '#0f3460' }} /> Order Count
                </span>
                <span style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, background: '#28a745' }} /> Total Qty
                </span>
              </div>
              {fastMoverChart.map((p, i) => (
                <div key={i} style={styles.chartRow}>
                  <span style={styles.chartLabel}>{p.name}</span>
                  <div style={styles.chartBars}>
                    <div style={styles.chartBarGroup}>
                      <div style={{
                        ...styles.chartBar,
                        width: `${maxFast > 0 ? (p.Orders / maxFast) * 100 : 0}%`,
                        background: '#0f3460',
                      }} />
                      <div style={{
                        ...styles.chartBar,
                        width: `${maxFast > 0 ? (p.Qty / maxFast) * 100 : 0}%`,
                        background: '#28a745',
                      }} />
                    </div>
                    <span style={styles.chartValue}>{p.Orders}x ordered</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ ...styles.tableWrap, marginTop: '20px' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHead}>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>Times Ordered</th>
                    <th style={styles.th}>Total Qty Ordered</th>
                    <th style={styles.th}>Current Stock</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fastMovers.map((p, i) => (
                    <tr key={p.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.td}>{i + 1}</td>
                      <td style={{ ...styles.td, fontWeight: '700' }}>{p.name}</td>
                      <td style={{ ...styles.td, fontWeight: '700', color: '#0f3460' }}>
                        {p.orderCount}x
                      </td>
                      <td style={styles.td}>{p.totalOrdered} {p.unit}</td>
                      <td style={styles.td}>{p.totalStock} {p.unit}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          background: p.isLowStock ? '#fff0f0' : '#e6f9ee',
                          color: p.isLowStock ? '#dc3545' : '#28a745',
                        }}>
                          {p.isLowStock ? '⚠️ Low Stock' : '✅ Good'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div style={styles.twoCol}>
        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>💀 Never Ordered Products</h3>
          <p style={styles.sectionSub}>
            {deadStock.length} products never appeared in any order.
          </p>
          {deadStock.length === 0 ? (
            <div style={styles.empty}>All products have been ordered. Great!</div>
          ) : (
            <div style={styles.chipList}>
              {deadStock.map((p) => (
                <div key={p.id} style={styles.deadChip}>
                  <span style={styles.deadChipName}>💀 {p.name}</span>
                  <span style={styles.deadChipSub}>{p.unit}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>⚠️ Low Stock Products</h3>
          <p style={styles.sectionSub}>
            {lowStock.length} products at or below reorder level.
          </p>
          {lowStock.length === 0 ? (
            <div style={styles.empty}>All stock levels are healthy.</div>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHead}>
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>Stock</th>
                    <th style={styles.th}>Reorder At</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((p, i) => (
                    <tr key={p.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={{ ...styles.td, fontWeight: '600' }}>{p.name}</td>
                      <td style={{ ...styles.td, color: '#dc3545', fontWeight: '700' }}>
                        {p.totalStock}
                      </td>
                      <td style={styles.td}>{p.reorderLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
  intelligenceHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '20px',
    background: 'white', borderRadius: '12px',
    padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    flexWrap: 'wrap', gap: '16px',
  },
  intelligenceTitle: { display: 'flex', gap: '16px', alignItems: 'flex-start' },
  intelligenceBrain: { fontSize: '40px' },
  intelligenceTitleText: { fontSize: '18px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 4px' },
  intelligenceSub: { fontSize: '13px', color: '#888', margin: 0 },
  suggestionCounts: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  countBadge: { padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  suggestionsList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  suggestionCard: { borderRadius: '12px', padding: '20px' },
  suggestionHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '10px',
  },
  suggestionLeft: { display: 'flex', gap: '14px', alignItems: 'flex-start' },
  suggestionIcon: { fontSize: '28px', lineHeight: 1 },
  suggestionTitleRow: { marginBottom: '4px' },
  typeBadge: { padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' },
  suggestionTitle: { fontSize: '16px', fontWeight: '800', margin: '6px 0 0' },
  suggestionMessage: {
    fontSize: '14px', color: '#444',
    margin: '0 0 12px', lineHeight: '1.6', paddingLeft: '42px',
  },
  suggestionAction: {
    display: 'flex', gap: '8px', alignItems: 'flex-start',
    paddingLeft: '42px', flexWrap: 'wrap',
  },
  actionLabel: { fontSize: '12px', fontWeight: '700', color: '#666', whiteSpace: 'nowrap' },
  actionText: { fontSize: '12px', color: '#0f3460', fontWeight: '600' },
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
  filterSelect: {
    padding: '8px 14px', borderRadius: '8px',
    border: '2px solid #e0e0e0', fontSize: '14px', outline: 'none',
  },
  chartWrap: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' },
  chartLegend: { display: 'flex', gap: '16px', marginBottom: '8px', flexWrap: 'wrap' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#666' },
  legendDot: { width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block' },
  chartRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' },
  chartLabel: { fontSize: '12px', color: '#555', width: '80px', flexShrink: 0, textAlign: 'right' },
  chartBars: { display: 'flex', alignItems: 'center', gap: '8px', flex: 1 },
  chartBarGroup: { display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 },
  chartBar: { height: '10px', borderRadius: '4px', minWidth: '4px', transition: 'width 0.4s ease' },
  chartValue: { fontSize: '11px', color: '#888', whiteSpace: 'nowrap', minWidth: '80px' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHead: { background: '#f0f4ff' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#0f3460' },
  td: { padding: '10px 16px', fontSize: '13px', color: '#444' },
  trEven: { background: 'white' },
  trOdd: { background: '#fafafa' },
  badge: { padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  chipList: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' },
  deadChip: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 14px', background: '#fff0f0', borderRadius: '8px',
    border: '1px solid #ffcccc',
  },
  deadChipName: { fontSize: '13px', fontWeight: '600', color: '#dc3545' },
  deadChipSub: { fontSize: '11px', color: '#aaa' },
  empty: { textAlign: 'center', padding: '40px', color: '#aaa', fontSize: '14px' },
};