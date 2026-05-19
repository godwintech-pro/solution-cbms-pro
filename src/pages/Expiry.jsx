import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';

export default function Expiry() {
  const [stock, setStock] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filterBranch, setFilterBranch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const unsubStock = onSnapshot(collection(db, 'stock'), (snap) => {
      setStock(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubP = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubB = onSnapshot(collection(db, 'branches'), (snap) => {
      setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubC = onSnapshot(collection(db, 'categories'), (snap) => {
      setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsubStock();
      unsubP();
      unsubB();
      unsubC();
    };
  }, []);

  function getProduct(id) {
    return products.find((p) => p.id === id);
  }
  function getBranch(id) {
    return branches.find((b) => b.id === id);
  }
  function getCategory(id) {
    return categories.find((c) => c.id === id);
  }

  function getExpiryStatus(dateStr) {
    if (!dateStr) return null;
    const today = new Date();
    const expiry = new Date(dateStr);
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0)
      return {
        label: 'EXPIRED',
        color: '#dc3545',
        bg: '#fff0f0',
        level: 'expired',
        daysLeft,
      };
    if (daysLeft <= 30)
      return {
        label: `${daysLeft} days left`,
        color: '#dc3545',
        bg: '#fff0f0',
        level: 'critical',
        daysLeft,
      };
    if (daysLeft <= 150)
      return {
        label: `${daysLeft} days left`,
        color: '#f39c12',
        bg: '#fff8e1',
        level: 'warning',
        daysLeft,
      };
    return {
      label: `${daysLeft} days left`,
      color: '#28a745',
      bg: '#e6f9ee',
      level: 'safe',
      daysLeft,
    };
  }

  function getCostAtStake(stockItem) {
    const product = getProduct(stockItem.productId);
    if (!product) return 0;
    return (stockItem.currentQuantity || 0) * (product.buyingPrice || 0);
  }

  // Build enriched stock list
  const enrichedStock = stock
    .map((s) => {
      const product = getProduct(s.productId);
      const branch = getBranch(s.branchId);
      const status = getExpiryStatus(s.expiryDate);
      const cost = getCostAtStake(s);
      const category = product ? getCategory(product.categoryId) : null;
      return { ...s, product, branch, status, cost, category };
    })
    .filter((s) => s.status !== null);

  // Apply filters
  const filtered = enrichedStock.filter((s) => {
    const matchBranch = filterBranch ? s.branchId === filterBranch : true;
    const matchCategory = filterCategory
      ? s.product?.categoryId === filterCategory
      : true;
    const matchProduct = filterProduct ? s.productId === filterProduct : true;
    const matchTab =
      activeTab === 'all'
        ? true
        : activeTab === 'expired'
        ? s.status?.level === 'expired'
        : activeTab === 'critical'
        ? s.status?.level === 'critical'
        : activeTab === 'warning'
        ? s.status?.level === 'warning'
        : s.status?.level === 'safe';
    return matchBranch && matchCategory && matchProduct && matchTab;
  });

  // Summary counts
  const counts = {
    expired: enrichedStock.filter((s) => s.status?.level === 'expired').length,
    critical: enrichedStock.filter((s) => s.status?.level === 'critical')
      .length,
    warning: enrichedStock.filter((s) => s.status?.level === 'warning').length,
    safe: enrichedStock.filter((s) => s.status?.level === 'safe').length,
  };

  // Total cost at stake
  const totalCost = filtered.reduce((sum, s) => sum + s.cost, 0);
  const totalUnits = filtered.reduce(
    (sum, s) => sum + (s.currentQuantity || 0),
    0
  );

  // Product breakdown (when product filter is active)
  const productBreakdown = filterProduct
    ? filtered.filter((s) => s.productId === filterProduct)
    : [];

  const productTotalCost = productBreakdown.reduce((sum, s) => sum + s.cost, 0);
  const productTotalUnits = productBreakdown.reduce(
    (sum, s) => sum + (s.currentQuantity || 0),
    0
  );

  // Print/Export
  function handlePrint() {
    const printContent = generatePrintContent();
    const win = window.open('', '_blank');
    win.document.write(printContent);
    win.document.close();
    win.print();
  }

  function generatePrintContent() {
    const date = new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const filterDesc =
      [
        filterBranch ? `Branch: ${getBranch(filterBranch)?.name}` : '',
        filterCategory ? `Category: ${getCategory(filterCategory)?.name}` : '',
        filterProduct ? `Product: ${getProduct(filterProduct)?.name}` : '',
        activeTab !== 'all' ? `Status: ${activeTab.toUpperCase()}` : '',
      ]
        .filter(Boolean)
        .join(' | ') || 'All Products';

    const rows = filtered
      .map(
        (s, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f9f9f9'}">
        <td>${i + 1}</td>
        <td><strong>${s.product?.name || '—'}</strong></td>
        <td>${s.branch?.name || '—'}</td>
        <td>${s.category?.name || '—'}</td>
        <td>${s.currentQuantity}</td>
        <td>${s.expiryDate || '—'}</td>
        <td style="color:${s.status?.color}">${s.status?.label}</td>
        <td>K ${s.cost.toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Expiry Report — CBMS</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #0f3460; }
          .subtitle { color: #666; margin-bottom: 20px; }
          .filters { background: #f0f4ff; padding: 10px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; }
          .summary { display: flex; gap: 20px; margin-bottom: 20px; }
          .summary-box { background: #f0f0f0; padding: 10px 20px; border-radius: 6px; text-align: center; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #0f3460; color: white; padding: 10px; text-align: left; font-size: 13px; }
          td { padding: 8px 10px; font-size: 12px; border-bottom: 1px solid #eee; }
          .total-row { background: #f0f4ff; font-weight: bold; }
          .footer { margin-top: 30px; font-size: 11px; color: #aaa; text-align: center; }
        </style>
      </head>
      <body>
        <h1>📦 Expiry Tracking Report</h1>
        <p class="subtitle">Solution Enterprises — CBMS</p>
        <p class="subtitle">Generated: ${date}</p>
        <div class="filters">Filters: ${filterDesc}</div>
        <div class="summary">
          <div class="summary-box">
            <strong>${totalUnits}</strong><br>Total Units at Risk
          </div>
          <div class="summary-box">
            <strong>K ${totalCost.toFixed(2)}</strong><br>Total Cost at Stake
          </div>
          <div class="summary-box">
            <strong>${filtered.length}</strong><br>Stock Entries
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>Branch</th>
              <th>Category</th>
              <th>Qty</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th>Cost at Stake</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td colspan="4"><strong>TOTAL</strong></td>
              <td><strong>${totalUnits}</strong></td>
              <td></td>
              <td></td>
              <td><strong>K ${totalCost.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
        <div class="footer">CBMS — Central Business Management System © ${new Date().getFullYear()}</div>
      </body>
      </html>
    `;
  }

  const tabs = [
    { id: 'all', label: 'All', count: enrichedStock.length, color: '#0f3460' },
    {
      id: 'expired',
      label: 'Expired',
      count: counts.expired,
      color: '#dc3545',
    },
    {
      id: 'critical',
      label: 'Critical (0-30d)',
      count: counts.critical,
      color: '#dc3545',
    },
    {
      id: 'warning',
      label: 'Warning (31-150d)',
      count: counts.warning,
      color: '#f39c12',
    },
    { id: 'safe', label: 'Safe (150d+)', count: counts.safe, color: '#28a745' },
  ];

  return (
    <div>
      {/* Summary Cards */}
      <div style={styles.summaryGrid}>
        <div style={{ ...styles.summaryCard, borderTop: '4px solid #dc3545' }}>
          <p style={styles.summaryNum}>{counts.expired}</p>
          <p style={styles.summaryLabel}>Expired</p>
          <p style={styles.summarySub}>Immediate removal needed</p>
        </div>
        <div style={{ ...styles.summaryCard, borderTop: '4px solid #e74c3c' }}>
          <p style={{ ...styles.summaryNum, color: '#dc3545' }}>
            {counts.critical}
          </p>
          <p style={styles.summaryLabel}>Critical</p>
          <p style={styles.summarySub}>Expiring within 30 days</p>
        </div>
        <div style={{ ...styles.summaryCard, borderTop: '4px solid #f39c12' }}>
          <p style={{ ...styles.summaryNum, color: '#f39c12' }}>
            {counts.warning}
          </p>
          <p style={styles.summaryLabel}>Warning</p>
          <p style={styles.summarySub}>Expiring within 150 days</p>
        </div>
        <div style={{ ...styles.summaryCard, borderTop: '4px solid #28a745' }}>
          <p style={{ ...styles.summaryNum, color: '#28a745' }}>
            {counts.safe}
          </p>
          <p style={styles.summaryLabel}>Safe</p>
          <p style={styles.summarySub}>More than 150 days left</p>
        </div>
      </div>

      {/* Main Card */}
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.cardHeader}>
          <div>
            <h3 style={styles.cardTitle}>⚠️ Expiry Tracking</h3>
            <p style={styles.cardSub}>
              Monitor product expiry dates across all branches.
            </p>
          </div>
          <button style={styles.printBtn} onClick={handlePrint}>
            🖨️ Print / Export PDF
          </button>
        </div>

        {/* Filters */}
        <div style={styles.filterRow}>
          <select
            style={styles.filterSelect}
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            style={styles.filterSelect}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            style={styles.filterSelect}
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {(filterBranch || filterCategory || filterProduct) && (
            <button
              style={styles.clearBtn}
              onClick={() => {
                setFilterBranch('');
                setFilterCategory('');
                setFilterProduct('');
              }}
            >
              ✕ Clear Filters
            </button>
          )}
        </div>

        {/* Status Tabs */}
        <div style={styles.tabRow}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              style={
                activeTab === tab.id
                  ? {
                      ...styles.tabActive,
                      borderColor: tab.color,
                      color: tab.color,
                    }
                  : styles.tab
              }
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              <span
                style={{
                  ...styles.tabBadge,
                  background: activeTab === tab.id ? tab.color : '#e0e0e0',
                  color: activeTab === tab.id ? 'white' : '#666',
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Product Breakdown (when product filter active) */}
        {filterProduct && productBreakdown.length > 0 && (
          <div style={styles.breakdownBox}>
            <h4 style={styles.breakdownTitle}>
              📦 {getProduct(filterProduct)?.name} — Branch Breakdown
            </h4>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHead}>
                    <th style={styles.th}>Branch</th>
                    <th style={styles.th}>Quantity</th>
                    <th style={styles.th}>Expiry Date</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Cost at Stake</th>
                  </tr>
                </thead>
                <tbody>
                  {productBreakdown.map((s, i) => (
                    <tr
                      key={s.id}
                      style={i % 2 === 0 ? styles.trEven : styles.trOdd}
                    >
                      <td style={{ ...styles.td, fontWeight: '600' }}>
                        {s.branch?.name || '—'}
                      </td>
                      <td style={styles.td}>{s.currentQuantity}</td>
                      <td style={styles.td}>{s.expiryDate || '—'}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            background: s.status?.bg,
                            color: s.status?.color,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '700',
                          }}
                        >
                          {s.status?.label}
                        </span>
                      </td>
                      <td
                        style={{
                          ...styles.td,
                          fontWeight: '600',
                          color: '#e94560',
                        }}
                      >
                        K {s.cost.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr style={styles.totalRow}>
                    <td style={{ ...styles.td, fontWeight: '800' }}>TOTAL</td>
                    <td style={{ ...styles.td, fontWeight: '800' }}>
                      {productTotalUnits} units
                    </td>
                    <td style={styles.td}></td>
                    <td style={styles.td}></td>
                    <td
                      style={{
                        ...styles.td,
                        fontWeight: '800',
                        color: '#e94560',
                        fontSize: '15px',
                      }}
                    >
                      K {productTotalCost.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Financial Summary */}
        {filtered.length > 0 && (
          <div style={styles.financialRow}>
            <div style={styles.financialBox}>
              <p style={styles.financialLabel}>Total Units at Risk</p>
              <p style={styles.financialValue}>{totalUnits} units</p>
            </div>
            <div style={{ ...styles.financialBox, borderColor: '#e94560' }}>
              <p style={styles.financialLabel}>💰 Total Cost at Stake</p>
              <p style={{ ...styles.financialValue, color: '#e94560' }}>
                K {totalCost.toFixed(2)}
              </p>
            </div>
            <div style={styles.financialBox}>
              <p style={styles.financialLabel}>Stock Entries</p>
              <p style={styles.financialValue}>{filtered.length}</p>
            </div>
          </div>
        )}

        {/* Main Table */}
        {filtered.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ fontSize: '40px', margin: '0 0 10px' }}>✅</p>
            <p style={{ fontWeight: '600', color: '#555' }}>
              {enrichedStock.length === 0
                ? 'No stock with expiry dates found. Add stock with expiry dates in Inventory.'
                : 'No products match the selected filters.'}
            </p>
          </div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHead}>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Branch</th>
                  <th style={styles.th}>Qty</th>
                  <th style={styles.th}>Expiry Date</th>
                  <th style={styles.th}>Days Left</th>
                  <th style={styles.th}>Cost at Stake</th>
                </tr>
              </thead>
              <tbody>
                {filtered
                  .sort(
                    (a, b) =>
                      (a.status?.daysLeft || 0) - (b.status?.daysLeft || 0)
                  )
                  .map((s, i) => (
                    <tr
                      key={s.id}
                      style={i % 2 === 0 ? styles.trEven : styles.trOdd}
                    >
                      <td style={styles.td}>{i + 1}</td>
                      <td style={{ ...styles.td, fontWeight: '600' }}>
                        {s.product?.name || '—'}
                      </td>
                      <td style={styles.td}>{s.category?.name || '—'}</td>
                      <td style={styles.td}>{s.branch?.name || '—'}</td>
                      <td style={styles.td}>{s.currentQuantity}</td>
                      <td style={styles.td}>{s.expiryDate || '—'}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            background: s.status?.bg,
                            color: s.status?.color,
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '700',
                          }}
                        >
                          {s.status?.label}
                        </span>
                      </td>
                      <td
                        style={{
                          ...styles.td,
                          fontWeight: '700',
                          color: '#e94560',
                        }}
                      >
                        K {s.cost.toFixed(2)}
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

const styles = {
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  summaryCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  summaryNum: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#dc3545',
    margin: '0 0 4px',
  },
  summaryLabel: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: 0,
  },
  summarySub: { fontSize: '11px', color: '#aaa', margin: '4px 0 0' },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: 0,
  },
  cardSub: { fontSize: '13px', color: '#888', margin: '4px 0 0' },
  printBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #0f3460, #e94560)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  filterRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  filterSelect: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '2px solid #e0e0e0',
    fontSize: '14px',
    outline: 'none',
    minWidth: '160px',
  },
  clearBtn: {
    padding: '10px 16px',
    background: '#fff0f0',
    color: '#dc3545',
    border: '1px solid #ffcccc',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  tabRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  tab: {
    padding: '8px 16px',
    background: 'white',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
    color: '#666',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  tabActive: {
    padding: '8px 16px',
    background: 'white',
    border: '2px solid',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  tabBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '700',
  },
  breakdownBox: {
    background: '#f0f4ff',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '20px',
    border: '1px solid #d0e0ff',
  },
  breakdownTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#0f3460',
    margin: '0 0 12px',
  },
  financialRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  financialBox: {
    flex: 1,
    background: '#fafafa',
    borderRadius: '10px',
    padding: '16px',
    border: '2px solid #f0f0f0',
    minWidth: '140px',
  },
  financialLabel: { fontSize: '12px', color: '#888', margin: '0 0 6px' },
  financialValue: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#1a1a2e',
    margin: 0,
  },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHead: { background: '#f0f4ff' },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '700',
    color: '#0f3460',
    whiteSpace: 'nowrap',
  },
  td: { padding: '12px 16px', fontSize: '13px', color: '#444' },
  trEven: { background: 'white' },
  trOdd: { background: '#fafafa' },
  totalRow: {
    background: '#f0f4ff',
    borderTop: '2px solid #d0e0ff',
  },
  empty: {
    textAlign: 'center',
    padding: '60px',
    color: '#aaa',
    fontSize: '14px',
  },
};
