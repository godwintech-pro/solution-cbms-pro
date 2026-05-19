import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';

export default function Orders() {
  const { userRole } = useAuth();
  const [activeTab, setActiveTab] = useState(
    userRole === 'Super Admin' ? 'overview' : 'create'
  );

  const tabs = userRole === 'Super Admin'
    ? [
        { id: 'overview', icon: '📊', label: 'Overview' },
        { id: 'pending', icon: '⏳', label: 'Pending Orders' },
        { id: 'purchase', icon: '📄', label: 'Purchase Orders' },
        { id: 'history', icon: '📋', label: 'Order History' },
      ]
    : [
        { id: 'create', icon: '➕', label: 'Create Order' },
        { id: 'myorders', icon: '📋', label: 'My Orders' },
        { id: 'deliveries', icon: '📦', label: 'Confirm Delivery' },
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

      {activeTab === 'overview' && <OrdersOverview />}
      {activeTab === 'pending' && <PendingOrders />}
      {activeTab === 'purchase' && <PurchaseOrders />}
      {activeTab === 'history' && <OrderHistory />}
      {activeTab === 'create' && <CreateOrder />}
      {activeTab === 'myorders' && <MyOrders />}
      {activeTab === 'deliveries' && <ConfirmDelivery />}
    </div>
  );
}

// ─── ORDERS OVERVIEW ──────────────────────────────────────
function OrdersOverview() {
  const [orders, setOrders] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  useEffect(() => {
    const unsubO = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      (snap) => setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubPO = onSnapshot(
      query(collection(db, 'purchaseOrders'), orderBy('createdAt', 'desc')),
      (snap) => setPurchaseOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => { unsubO(); unsubPO(); };
  }, []);

  const stats = {
    pending: orders.filter((o) => o.status === 'Pending').length,
    approved: orders.filter((o) => o.status === 'Approved').length,
    ordered: orders.filter((o) => o.status === 'Ordered').length,
    delivered: orders.filter((o) => o.status === 'Delivered').length,
  };

  return (
    <div>
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, borderTop: '4px solid #f39c12' }}>
          <p style={styles.statLabel}>Pending Review</p>
          <p style={{ ...styles.statValue, color: '#f39c12' }}>{stats.pending}</p>
          <p style={styles.statSub}>Awaiting HO approval</p>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #0f3460' }}>
          <p style={styles.statLabel}>Approved</p>
          <p style={{ ...styles.statValue, color: '#0f3460' }}>{stats.approved}</p>
          <p style={styles.statSub}>Ready for ordering</p>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #9b59b6' }}>
          <p style={styles.statLabel}>Ordered</p>
          <p style={{ ...styles.statValue, color: '#9b59b6' }}>{stats.ordered}</p>
          <p style={styles.statSub}>Sent to suppliers</p>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #28a745' }}>
          <p style={styles.statLabel}>Delivered</p>
          <p style={{ ...styles.statValue, color: '#28a745' }}>{stats.delivered}</p>
          <p style={styles.statSub}>Awaiting branch confirmation</p>
        </div>
      </div>

      {/* Recent Orders */}
      <div style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>🕐 Recent Orders</h3>
        {orders.slice(0, 5).length === 0 ? (
          <div style={styles.empty}>No orders yet.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHead}>
                  <th style={styles.th}>Order #</th>
                  <th style={styles.th}>Branch</th>
                  <th style={styles.th}>Items</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((o, i) => (
                  <tr key={o.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={styles.td}>
                      <strong>{o.orderNumber || o.id.slice(0, 8).toUpperCase()}</strong>
                    </td>
                    <td style={styles.td}>{o.branchName}</td>
                    <td style={styles.td}>{(o.items || []).length} items</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        ...getStatusStyle(o.status),
                      }}>
                        {o.status}
                      </span>
                    </td>
                    <td style={styles.td}>{o.date}</td>
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

// ─── CREATE ORDER (Branch Side) ───────────────────────────
function CreateOrder() {
  const { userName, userRole, userBranch } = useAuth();
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    branchId: '',
    branchName: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    items: [],
  });

  useEffect(() => {
    const unsubB = onSnapshot(collection(db, 'branches'), (snap) => {
      setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubP = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubS = onSnapshot(collection(db, 'suppliers'), (snap) => {
      setSuppliers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubSt = onSnapshot(collection(db, 'stock'), (snap) => {
      setStock(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubB(); unsubP(); unsubS(); unsubSt(); };
  }, []);

  function getCurrentStock(productId, branchId) {
    const entry = stock.find(
      (s) => s.productId === productId && s.branchId === branchId
    );
    return entry?.currentQuantity || 0;
  }

  function getSupplierName(supplierId) {
    return suppliers.find((s) => s.id === supplierId)?.name || 'Unknown';
  }

  function isItemAdded(productId) {
    return form.items.some((i) => i.productId === productId);
  }

  function addItem(product) {
    if (isItemAdded(product.id)) return;
    if (!form.branchId) return alert('Please select a branch first.');
    const currentStock = getCurrentStock(product.id, form.branchId);
    setForm({
      ...form,
      items: [
        ...form.items,
        {
          productId: product.id,
          productName: product.name,
          supplierId: product.supplierId || '',
          supplierName: getSupplierName(product.supplierId),
          unit: product.unit || 'Pieces',
          buyingPrice: product.buyingPrice || 0,
          currentStock,
          quantityNeeded: '',
          notes: '',
        },
      ],
    });
  }

  function removeItem(productId) {
    setForm({
      ...form,
      items: form.items.filter((i) => i.productId !== productId),
    });
  }

  function updateItem(productId, field, value) {
    setForm({
      ...form,
      items: form.items.map((i) =>
        i.productId === productId ? { ...i, [field]: value } : i
      ),
    });
  }

  function handleBranchChange(e) {
    const branch = branches.find((b) => b.id === e.target.value);
    setForm({ ...form, branchId: e.target.value, branchName: branch?.name || '', items: [] });
  }

  async function handleSubmit() {
    if (!form.branchId) return alert('Please select a branch.');
    if (form.items.length === 0) return alert('Add at least one product to order.');
    const invalid = form.items.find((i) => !i.quantityNeeded || parseInt(i.quantityNeeded) <= 0);
    if (invalid) return alert(`Enter quantity needed for ${invalid.productName}.`);

    setLoading(true);
    try {
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

      await addDoc(collection(db, 'orders'), {
        orderNumber,
        branchId: form.branchId,
        branchName: form.branchName,
        date: form.date,
        notes: form.notes,
        items: form.items.map((i) => ({
          ...i,
          quantityNeeded: parseInt(i.quantityNeeded),
        })),
        status: 'Pending',
        submittedBy: userName || 'Unknown',
        createdAt: serverTimestamp(),
      });

      // Notify Head Office
      await addDoc(collection(db, 'notifications'), {
        type: 'ORDER_SUBMITTED',
        message: `🛒 New order ${orderNumber} submitted by ${form.branchName}`,
        read: false,
        createdAt: serverTimestamp(),
      });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setForm({
          branchId: '',
          branchName: '',
          date: new Date().toISOString().split('T')[0],
          notes: '',
          items: [],
        });
      }, 2000);
    } catch (err) {
      alert(err.message);
    }
    setLoading(false);
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (submitted) {
    return (
      <div style={styles.successBox}>
        <p style={styles.successIcon}>✅</p>
        <h3 style={styles.successTitle}>Order Submitted!</h3>
        <p style={styles.successSub}>Head Office has been notified.</p>
      </div>
    );
  }

  return (
    <div style={styles.sectionCard}>
      <h3 style={styles.sectionTitle}>➕ Create New Order</h3>
      <p style={styles.sectionSub}>
        Select products from the master list. If a product is missing contact Head Office.
      </p>

      {/* Branch & Date */}
      <div style={styles.formGrid}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Branch *</label>
          <select style={styles.input} value={form.branchId}
            onChange={handleBranchChange}>
            <option value="">Select Branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Order Date</label>
          <input style={styles.input} type="date" value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>
      </div>

      {/* Product Search */}
      <div style={styles.productSection}>
        <h4 style={styles.formSectionTitle}>📦 Select Products</h4>
        <input
          style={styles.searchInput}
          placeholder="🔍 Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={styles.productGrid}>
          {filteredProducts.map((product) => {
            const added = isItemAdded(product.id);
            const currentStock = form.branchId
              ? getCurrentStock(product.id, form.branchId) : '—';
            const isLow = form.branchId && currentStock <= product.reorderLevel;
            return (
              <div
                key={product.id}
                style={{
                  ...styles.productChip,
                  background: added ? '#e6f9ee' : isLow ? '#fff8e1' : 'white',
                  border: added
                    ? '2px solid #28a745'
                    : isLow ? '2px solid #f39c12' : '2px solid #e0e0e0',
                }}
              >
                <div style={styles.productChipInfo}>
                  <p style={styles.productChipName}>{product.name}</p>
                  <p style={styles.productChipSub}>
                    Stock: {currentStock} {product.unit}
                    {isLow && ' ⚠️ Low'}
                  </p>
                </div>
                <button
                  style={added ? styles.addedBtn : styles.addBtn}
                  onClick={() => added ? removeItem(product.id) : addItem(product)}
                >
                  {added ? '✓ Added' : '+ Add'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Items */}
      {form.items.length > 0 && (
        <div style={styles.orderItemsSection}>
          <h4 style={styles.formSectionTitle}>
            🛒 Order Items ({form.items.length})
          </h4>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHead}>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Supplier</th>
                  <th style={styles.th}>Current Stock</th>
                  <th style={styles.th}>Qty Needed *</th>
                  <th style={styles.th}>Unit</th>
                  <th style={styles.th}>Notes</th>
                  <th style={styles.th}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, i) => (
                  <tr key={item.productId}
                    style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={{ ...styles.td, fontWeight: '600' }}>
                      {item.productName}
                    </td>
                    <td style={styles.td}>{item.supplierName || '—'}</td>
                    <td style={styles.td}>{item.currentStock}</td>
                    <td style={styles.td}>
                      <input
                        style={styles.qtyInput}
                        type="number"
                        placeholder="0"
                        value={item.quantityNeeded}
                        onChange={(e) =>
                          updateItem(item.productId, 'quantityNeeded', e.target.value)
                        }
                      />
                    </td>
                    <td style={styles.td}>{item.unit}</td>
                    <td style={styles.td}>
                      <input
                        style={styles.noteInput}
                        placeholder="Optional note"
                        value={item.notes}
                        onChange={(e) =>
                          updateItem(item.productId, 'notes', e.target.value)
                        }
                      />
                    </td>
                    <td style={styles.td}>
                      <button
                        style={styles.removeBtn}
                        onClick={() => removeItem(item.productId)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notes */}
      <div style={{ marginTop: '16px' }}>
        <label style={styles.label}>Additional Notes for Head Office</label>
        <textarea
          style={styles.textarea}
          placeholder="Any additional notes, missing products not on list, etc..."
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
        />
      </div>

      <button
        style={loading ? styles.submitBtnDisabled : styles.submitBtn}
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? 'Submitting...' : '📤 Submit Order to Head Office'}
      </button>
    </div>
  );
}

// ─── PENDING ORDERS (Head Office) ─────────────────────────
function PendingOrders() {
  const { userName } = useAuth();
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(null);

  useEffect(() => {
    const unsubO = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      (snap) => setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubS = onSnapshot(collection(db, 'suppliers'), (snap) => {
      setSuppliers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubO(); unsubS(); };
  }, []);

  const pendingOrders = orders.filter((o) => o.status === 'Pending');

  async function handleApprove(order) {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'Approved',
        approvedBy: userName,
        approvedAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'notifications'), {
        type: 'ORDER_APPROVED',
        message: `✅ Order ${order.orderNumber} approved by Head Office`,
        branchId: order.branchId,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      alert(err.message);
    }
    setLoading(false);
  }

  async function handleReject(order) {
    if (!rejectReason.trim()) return alert('Please enter a reason for rejection.');
    setLoading(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'Rejected',
        rejectedBy: userName,
        rejectReason,
        rejectedAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'notifications'), {
        type: 'ORDER_REJECTED',
        message: `❌ Order ${order.orderNumber} rejected: ${rejectReason}`,
        branchId: order.branchId,
        read: false,
        createdAt: serverTimestamp(),
      });
      setShowRejectInput(null);
      setRejectReason('');
    } catch (err) {
      alert(err.message);
    }
    setLoading(false);
  }

  return (
    <div style={styles.sectionCard}>
      <h3 style={styles.sectionTitle}>⏳ Pending Orders</h3>
      <p style={styles.sectionSub}>
        {pendingOrders.length} orders awaiting review.
      </p>

      {pendingOrders.length === 0 ? (
        <div style={styles.empty}>
          ✅ No pending orders. All orders have been reviewed.
        </div>
      ) : (
        <div style={styles.ordersList}>
          {pendingOrders.map((order) => (
            <div key={order.id} style={styles.orderCard}>
              <div style={styles.orderCardHeader}>
                <div>
                  <p style={styles.orderNumber}>{order.orderNumber}</p>
                  <p style={styles.orderMeta}>
                    🏪 {order.branchName} · 📅 {order.date} · 👤 {order.submittedBy}
                  </p>
                </div>
                <div style={styles.orderActions}>
                  <button
                    style={styles.viewBtn}
                    onClick={() => setExpandedOrder(
                      expandedOrder === order.id ? null : order.id
                    )}
                  >
                    {expandedOrder === order.id ? 'Hide' : '👁 View'}
                  </button>
                  <button
                    style={styles.approveBtn}
                    onClick={() => handleApprove(order)}
                    disabled={loading}
                  >
                    ✅ Approve
                  </button>
                  <button
                    style={styles.rejectBtn}
                    onClick={() => setShowRejectInput(
                      showRejectInput === order.id ? null : order.id
                    )}
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>

              {/* Items Summary */}
              <p style={styles.itemsSummary}>
                {(order.items || []).length} items ·{' '}
                {[...new Set((order.items || []).map((i) => i.supplierName))].join(', ')}
              </p>

              {/* Reject Input */}
              {showRejectInput === order.id && (
                <div style={styles.rejectBox}>
                  <input
                    style={styles.input}
                    placeholder="Reason for rejection..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <button
                    style={styles.rejectConfirmBtn}
                    onClick={() => handleReject(order)}
                  >
                    Confirm Rejection
                  </button>
                </div>
              )}

              {/* Expanded Items */}
              {expandedOrder === order.id && (
                <div style={styles.expandedItems}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHead}>
                        <th style={styles.th}>Product</th>
                        <th style={styles.th}>Supplier</th>
                        <th style={styles.th}>Current Stock</th>
                        <th style={styles.th}>Qty Needed</th>
                        <th style={styles.th}>Unit</th>
                        <th style={styles.th}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(order.items || []).map((item, i) => (
                        <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                          <td style={{ ...styles.td, fontWeight: '600' }}>
                            {item.productName}
                          </td>
                          <td style={styles.td}>{item.supplierName || '—'}</td>
                          <td style={styles.td}>{item.currentStock}</td>
                          <td style={{ ...styles.td, fontWeight: '700', color: '#0f3460' }}>
                            {item.quantityNeeded}
                          </td>
                          <td style={styles.td}>{item.unit}</td>
                          <td style={styles.td}>{item.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {order.notes && (
                    <p style={styles.orderNotes}>📝 {order.notes}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PURCHASE ORDERS ──────────────────────────────────────
function PurchaseOrders() {
  const { userName } = useAuth();
  const [orders, setOrders] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubO = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      (snap) => setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubPO = onSnapshot(
      query(collection(db, 'purchaseOrders'), orderBy('createdAt', 'desc')),
      (snap) => setPurchaseOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => { unsubO(); unsubPO(); };
  }, []);

  const approvedOrders = orders.filter((o) => o.status === 'Approved');

  // Group approved orders by supplier
  function getSupplierGroups() {
    const groups = {};
    approvedOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const key = item.supplierId || 'unknown';
        if (!groups[key]) {
          groups[key] = {
            supplierId: item.supplierId,
            supplierName: item.supplierName || 'Unknown Supplier',
            items: [],
            orderIds: [],
          };
        }
        if (!groups[key].orderIds.includes(order.id)) {
          groups[key].orderIds.push(order.id);
        }
        // Consolidate same product
        const existing = groups[key].items.find(
          (i) => i.productId === item.productId
        );
        if (existing) {
          existing.quantityNeeded += item.quantityNeeded;
          existing.branches = existing.branches || [];
          existing.branches.push({
            branchName: order.branchName,
            quantity: item.quantityNeeded,
          });
        } else {
          groups[key].items.push({
            ...item,
            branches: [{ branchName: order.branchName, quantity: item.quantityNeeded }],
          });
        }
      });
    });
    return Object.values(groups);
  }

  async function generatePO(group) {
    setLoading(true);
    try {
      const poNumber = `PO-${Date.now().toString().slice(-6)}`;
      await addDoc(collection(db, 'purchaseOrders'), {
        poNumber,
        supplierId: group.supplierId,
        supplierName: group.supplierName,
        items: group.items,
        orderIds: group.orderIds,
        status: 'Sent',
        generatedBy: userName,
        createdAt: serverTimestamp(),
      });
      // Update all related orders to Ordered
      for (const orderId of group.orderIds) {
        await updateDoc(doc(db, 'orders', orderId), {
          status: 'Ordered',
          poNumber,
          updatedAt: serverTimestamp(),
        });
      }
      await addDoc(collection(db, 'notifications'), {
        type: 'PO_GENERATED',
        message: `📄 Purchase Order ${poNumber} generated for ${group.supplierName}`,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      alert(err.message);
    }
    setLoading(false);
  }

  function printPO(group, poNumber) {
    const rows = group.items.map((item) => `
      <tr>
        <td>${item.productName}</td>
        <td>${item.quantityNeeded}</td>
        <td>${item.unit}</td>
        <td>K ${(item.buyingPrice || 0).toFixed(2)}</td>
        <td>K ${((item.buyingPrice || 0) * item.quantityNeeded).toFixed(2)}</td>
      </tr>
    `).join('');

    const total = group.items.reduce(
      (sum, i) => sum + (i.buyingPrice || 0) * i.quantityNeeded, 0
    );

    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order — ${poNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; }
          h1 { color: #0f3460; }
          .info { margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #0f3460; color: white; padding: 10px; text-align: left; }
          td { padding: 8px 10px; border-bottom: 1px solid #eee; }
          .total { font-weight: bold; font-size: 16px; margin-top: 20px; text-align: right; }
          .footer { margin-top: 40px; font-size: 11px; color: #aaa; text-align: center; }
        </style>
      </head>
      <body>
        <h1>📄 Purchase Order</h1>
        <div class="info">
          <p><strong>PO Number:</strong> ${poNumber}</p>
          <p><strong>Supplier:</strong> ${group.supplierName}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB')}</p>
          <p><strong>Generated by:</strong> Solution Enterprises — CBMS</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="total">Total Order Value: K ${total.toFixed(2)}</div>
        <div class="footer">
          CBMS — Central Business Management System © ${new Date().getFullYear()}
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.print();
  }

  const supplierGroups = getSupplierGroups();

  return (
    <div>
      {/* Pending POs */}
      {approvedOrders.length > 0 && (
        <div style={{ ...styles.sectionCard, marginBottom: '20px' }}>
          <h3 style={styles.sectionTitle}>📄 Generate Purchase Orders</h3>
          <p style={styles.sectionSub}>
            Orders grouped by supplier automatically.
          </p>
          {supplierGroups.map((group, i) => (
            <div key={i} style={styles.poCard}>
              <div style={styles.poHeader}>
                <div>
                  <p style={styles.poSupplier}>🏭 {group.supplierName}</p>
                  <p style={styles.poMeta}>
                    {group.items.length} products ·{' '}
                    {group.orderIds.length} branch orders consolidated
                  </p>
                </div>
                <div style={styles.poActions}>
                  <button
                    style={styles.generateBtn}
                    onClick={() => generatePO(group)}
                    disabled={loading}
                  >
                    📄 Generate PO
                  </button>
                </div>
              </div>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHead}>
                      <th style={styles.th}>Product</th>
                      <th style={styles.th}>Total Qty</th>
                      <th style={styles.th}>Unit</th>
                      <th style={styles.th}>Branch Breakdown</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item, j) => (
                      <tr key={j} style={j % 2 === 0 ? styles.trEven : styles.trOdd}>
                        <td style={{ ...styles.td, fontWeight: '600' }}>
                          {item.productName}
                        </td>
                        <td style={{ ...styles.td, fontWeight: '700', color: '#0f3460' }}>
                          {item.quantityNeeded}
                        </td>
                        <td style={styles.td}>{item.unit}</td>
                        <td style={styles.td}>
                          {(item.branches || []).map((b, k) => (
                            <span key={k} style={styles.branchTag}>
                              {b.branchName}: {b.quantity}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generated POs */}
      <div style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>📋 Generated Purchase Orders</h3>
        {purchaseOrders.length === 0 ? (
          <div style={styles.empty}>No purchase orders generated yet.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHead}>
                  <th style={styles.th}>PO Number</th>
                  <th style={styles.th}>Supplier</th>
                  <th style={styles.th}>Items</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Generated By</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po, i) => (
                  <tr key={po.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={{ ...styles.td, fontWeight: '700' }}>{po.poNumber}</td>
                    <td style={styles.td}>{po.supplierName}</td>
                    <td style={styles.td}>{(po.items || []).length} items</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, background: '#e6f9ee', color: '#28a745' }}>
                        {po.status}
                      </span>
                    </td>
                    <td style={styles.td}>{po.generatedBy}</td>
                    <td style={styles.td}>
                      <button
                        style={styles.printBtnSm}
                        onClick={() => printPO({ items: po.items, supplierName: po.supplierName }, po.poNumber)}
                      >
                        🖨️ Print
                      </button>
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

// ─── CONFIRM DELIVERY (Branch Side) ───────────────────────
function ConfirmDelivery() {
  const { userName, userBranch } = useAuth();
  const [orders, setOrders] = useState([]);
  const [branches, setBranches] = useState([]);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [receivedItems, setReceivedItems] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubO = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      (snap) => setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubB = onSnapshot(collection(db, 'branches'), (snap) => {
      setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubO(); unsubB(); };
  }, []);

  const myBranchId = branches.find((b) => b.name === userBranch)?.id;
  const orderedOrders = orders.filter(
    (o) => o.status === 'Ordered' &&
    (myBranchId ? o.branchId === myBranchId : true)
  );

  function updateReceivedItem(orderId, productId, field, value) {
    setReceivedItems((prev) => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [productId]: {
          ...(prev[orderId]?.[productId] || {}),
          [field]: value,
        },
      },
    }));
  }

  async function handleConfirmReceipt(order) {
    const items = order.items || [];
    const orderReceived = receivedItems[order.id] || {};

    setLoading(true);
    try {
      // Update each product stock
      for (const item of items) {
        const received = orderReceived[item.productId] || {};
        const qty = parseInt(received.quantityReceived || item.quantityNeeded);
        const expiryDate = received.expiryDate || '';
        const batchNumber = received.batchNumber || '';

        // Find existing stock entry
        const stockSnap = await import('firebase/firestore').then(({ getDocs, query: q, where }) =>
          getDocs(q(
            collection(db, 'stock'),
            where('productId', '==', item.productId),
            where('branchId', '==', order.branchId)
          ))
        );

        if (!stockSnap.empty) {
          const stockDoc = stockSnap.docs[0];
          const currentQty = stockDoc.data().currentQuantity || 0;
          await updateDoc(doc(db, 'stock', stockDoc.id), {
            currentQuantity: currentQty + qty,
            expiryDate: expiryDate || stockDoc.data().expiryDate,
            batchNumber: batchNumber || stockDoc.data().batchNumber,
            updatedAt: serverTimestamp(),
          });
          // Record adjustment
          await addDoc(collection(db, 'stockAdjustments'), {
            stockId: stockDoc.id,
            productId: item.productId,
            branchId: order.branchId,
            type: 'IN',
            reason: 'Stock Received',
            quantity: qty,
            previousQuantity: currentQty,
            newQuantity: currentQty + qty,
            note: `Order ${order.orderNumber} received`,
            createdBy: userName || 'Unknown',
            createdAt: serverTimestamp(),
          });
        } else {
          // Create new stock entry
          const stockRef = await addDoc(collection(db, 'stock'), {
            productId: item.productId,
            branchId: order.branchId,
            currentQuantity: qty,
            expiryDate,
            batchNumber,
            createdAt: serverTimestamp(),
          });
          await addDoc(collection(db, 'stockAdjustments'), {
            stockId: stockRef.id,
            productId: item.productId,
            branchId: order.branchId,
            type: 'IN',
            reason: 'Stock Received',
            quantity: qty,
            note: `Order ${order.orderNumber} received`,
            createdBy: userName || 'Unknown',
            createdAt: serverTimestamp(),
          });
        }
      }

      // Update order status
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'Received',
        receivedBy: userName,
        receivedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'notifications'), {
        type: 'ORDER_RECEIVED',
        message: `📦 Order ${order.orderNumber} received and stock updated at ${order.branchName}`,
        read: false,
        createdAt: serverTimestamp(),
      });

      setExpandedOrder(null);
    } catch (err) {
      alert(err.message);
    }
    setLoading(false);
  }

  return (
    <div style={styles.sectionCard}>
      <h3 style={styles.sectionTitle}>📦 Confirm Delivery</h3>
      <p style={styles.sectionSub}>
        Confirm receipt of delivered orders. Stock will update automatically.
      </p>

      {orderedOrders.length === 0 ? (
        <div style={styles.empty}>
          No orders pending delivery confirmation.
        </div>
      ) : (
        <div style={styles.ordersList}>
          {orderedOrders.map((order) => (
            <div key={order.id} style={styles.orderCard}>
              <div style={styles.orderCardHeader}>
                <div>
                  <p style={styles.orderNumber}>{order.orderNumber}</p>
                  <p style={styles.orderMeta}>
                    🏪 {order.branchName} · 📅 {order.date}
                    {order.poNumber && ` · PO: ${order.poNumber}`}
                  </p>
                </div>
                <button
                  style={styles.viewBtn}
                  onClick={() => setExpandedOrder(
                    expandedOrder === order.id ? null : order.id
                  )}
                >
                  {expandedOrder === order.id ? 'Hide' : '📦 Confirm Receipt'}
                </button>
              </div>

              {expandedOrder === order.id && (
                <div style={styles.expandedItems}>
                  <p style={styles.confirmNote}>
                    ℹ️ Enter actual quantities received, expiry dates and batch numbers.
                  </p>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHead}>
                        <th style={styles.th}>Product</th>
                        <th style={styles.th}>Ordered</th>
                        <th style={styles.th}>Qty Received *</th>
                        <th style={styles.th}>Expiry Date</th>
                        <th style={styles.th}>Batch No.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(order.items || []).map((item, i) => (
                        <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                          <td style={{ ...styles.td, fontWeight: '600' }}>
                            {item.productName}
                          </td>
                          <td style={styles.td}>{item.quantityNeeded} {item.unit}</td>
                          <td style={styles.td}>
                            <input
                              style={styles.qtyInput}
                              type="number"
                              placeholder={item.quantityNeeded}
                              value={receivedItems[order.id]?.[item.productId]?.quantityReceived || ''}
                              onChange={(e) => updateReceivedItem(
                                order.id, item.productId, 'quantityReceived', e.target.value
                              )}
                            />
                          </td>
                          <td style={styles.td}>
                            <input
                              style={styles.qtyInput}
                              type="date"
                              value={receivedItems[order.id]?.[item.productId]?.expiryDate || ''}
                              onChange={(e) => updateReceivedItem(
                                order.id, item.productId, 'expiryDate', e.target.value
                              )}
                            />
                          </td>
                          <td style={styles.td}>
                            <input
                              style={styles.noteInput}
                              placeholder="Batch no."
                              value={receivedItems[order.id]?.[item.productId]?.batchNumber || ''}
                              onChange={(e) => updateReceivedItem(
                                order.id, item.productId, 'batchNumber', e.target.value
                              )}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    style={loading ? styles.submitBtnDisabled : styles.submitBtn}
                    onClick={() => handleConfirmReceipt(order)}
                    disabled={loading}
                  >
                    {loading ? 'Updating Stock...' : '✅ Confirm Receipt & Update Stock'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MY ORDERS (Branch Side) ──────────────────────────────
function MyOrders() {
  const { userBranch } = useAuth();
  const [orders, setOrders] = useState([]);
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    const unsubO = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      (snap) => setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubB = onSnapshot(collection(db, 'branches'), (snap) => {
      setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubO(); unsubB(); };
  }, []);

  const myBranchId = branches.find((b) => b.name === userBranch)?.id;
  const myOrders = orders.filter(
    (o) => myBranchId ? o.branchId === myBranchId : true
  );

  return (
    <div style={styles.sectionCard}>
      <h3 style={styles.sectionTitle}>📋 My Orders</h3>
      {myOrders.length === 0 ? (
        <div style={styles.empty}>No orders submitted yet.</div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHead}>
                <th style={styles.th}>Order #</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Items</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {myOrders.map((o, i) => (
                <tr key={o.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                  <td style={{ ...styles.td, fontWeight: '700' }}>{o.orderNumber}</td>
                  <td style={styles.td}>{o.date}</td>
                  <td style={styles.td}>{(o.items || []).length} items</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, ...getStatusStyle(o.status) }}>
                      {o.status}
                    </span>
                  </td>
                  <td style={styles.td}>{o.rejectReason || o.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── ORDER HISTORY ────────────────────────────────────────
function OrderHistory() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const unsubO = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      (snap) => setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return unsubO;
  }, []);

  return (
    <div style={styles.sectionCard}>
      <h3 style={styles.sectionTitle}>📋 Full Order History</h3>
      <p style={styles.sectionSub}>{orders.length} total orders.</p>
      {orders.length === 0 ? (
        <div style={styles.empty}>No orders yet.</div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHead}>
                <th style={styles.th}>Order #</th>
                <th style={styles.th}>Branch</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Items</th>
                <th style={styles.th}>Submitted By</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, i) => (
                <tr key={o.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                  <td style={{ ...styles.td, fontWeight: '700' }}>{o.orderNumber}</td>
                  <td style={styles.td}>{o.branchName}</td>
                  <td style={styles.td}>{o.date}</td>
                  <td style={styles.td}>{(o.items || []).length}</td>
                  <td style={styles.td}>{o.submittedBy}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, ...getStatusStyle(o.status) }}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────
function getStatusStyle(status) {
  switch (status) {
    case 'Pending': return { background: '#fff8e1', color: '#f39c12' };
    case 'Approved': return { background: '#e6f0ff', color: '#0f3460' };
    case 'Ordered': return { background: '#f3e6ff', color: '#9b59b6' };
    case 'Delivered': return { background: '#e6f9ff', color: '#0097b2' };
    case 'Received': return { background: '#e6f9ee', color: '#28a745' };
    case 'Rejected': return { background: '#fff0f0', color: '#dc3545' };
    default: return { background: '#f0f0f0', color: '#666' };
  }
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
  statValue: { color: '#1a1a2e', fontSize: '26px', fontWeight: '800', margin: '0 0 4px' },
  statSub: { color: '#aaa', fontSize: '11px', margin: 0 },
  sectionCard: {
    background: 'white', borderRadius: '12px',
    padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    marginBottom: '20px',
  },
  sectionTitle: { fontSize: '18px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 4px' },
  sectionSub: { fontSize: '13px', color: '#888', margin: '0 0 20px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#555' },
  input: {
    padding: '10px 14px', borderRadius: '8px',
    border: '2px solid #e0e0e0', fontSize: '14px', outline: 'none',
  },
  textarea: {
    padding: '10px 14px', borderRadius: '8px',
    border: '2px solid #e0e0e0', fontSize: '14px',
    outline: 'none', width: '100%', resize: 'vertical',
    fontFamily: 'inherit', marginTop: '6px',
  },
  productSection: { marginBottom: '20px' },
  formSectionTitle: { fontSize: '15px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 12px' },
  searchInput: {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '2px solid #e0e0e0', fontSize: '14px',
    outline: 'none', marginBottom: '12px',
  },
  productGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px', maxHeight: '280px', overflowY: 'auto',
    padding: '4px',
  },
  productChip: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '10px 12px',
    borderRadius: '8px', cursor: 'default',
  },
  productChipInfo: { flex: 1 },
  productChipName: { fontSize: '13px', fontWeight: '600', color: '#1a1a2e', margin: 0 },
  productChipSub: { fontSize: '11px', color: '#888', margin: '2px 0 0' },
  addBtn: {
    padding: '4px 10px', background: '#0f3460',
    color: 'white', border: 'none', borderRadius: '6px',
    fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  addedBtn: {
    padding: '4px 10px', background: '#28a745',
    color: 'white', border: 'none', borderRadius: '6px',
    fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  orderItemsSection: { marginBottom: '20px' },
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
  qtyInput: {
    width: '80px', padding: '6px 8px', borderRadius: '6px',
    border: '2px solid #e0e0e0', fontSize: '13px', outline: 'none',
  },
  noteInput: {
    width: '120px', padding: '6px 8px', borderRadius: '6px',
    border: '2px solid #e0e0e0', fontSize: '13px', outline: 'none',
  },
  removeBtn: {
    padding: '4px 8px', background: '#fff0f0',
    color: '#dc3545', border: 'none',
    borderRadius: '6px', cursor: 'pointer',
  },
  submitBtn: {
    width: '100%', padding: '14px',
    background: 'linear-gradient(135deg, #0f3460, #e94560)',
    color: 'white', border: 'none', borderRadius: '10px',
    fontSize: '15px', fontWeight: '700', cursor: 'pointer',
    marginTop: '16px',
  },
  submitBtnDisabled: {
    width: '100%', padding: '14px', background: '#ccc',
    color: 'white', border: 'none', borderRadius: '10px',
    fontSize: '15px', cursor: 'not-allowed', marginTop: '16px',
  },
  successBox: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    minHeight: '300px', background: 'white',
    borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  successIcon: { fontSize: '60px', margin: '0 0 16px' },
  successTitle: { fontSize: '24px', fontWeight: '800', color: '#28a745', margin: '0 0 8px' },
  successSub: { fontSize: '14px', color: '#888' },
  ordersList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  orderCard: {
    padding: '16px', background: '#fafafa',
    borderRadius: '10px', border: '1px solid #f0f0f0',
  },
  orderCardHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '8px',
  },
  orderNumber: { fontSize: '16px', fontWeight: '800', color: '#0f3460', margin: 0 },
  orderMeta: { fontSize: '12px', color: '#888', margin: '4px 0 0' },
  orderActions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  itemsSummary: { fontSize: '13px', color: '#666', margin: '4px 0 0' },
  viewBtn: {
    padding: '6px 14px', background: '#f0f4ff',
    color: '#0f3460', border: 'none',
    borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
  },
  approveBtn: {
    padding: '6px 14px', background: '#e6f9ee',
    color: '#28a745', border: 'none',
    borderRadius: '6px', fontSize: '12px',
    cursor: 'pointer', fontWeight: '600',
  },
  rejectBtn: {
    padding: '6px 14px', background: '#fff0f0',
    color: '#dc3545', border: 'none',
    borderRadius: '6px', fontSize: '12px',
    cursor: 'pointer', fontWeight: '600',
  },
  rejectBox: { display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' },
  rejectConfirmBtn: {
    padding: '8px 16px', background: '#dc3545',
    color: 'white', border: 'none',
    borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
  },
  expandedItems: {
    marginTop: '12px', paddingTop: '12px',
    borderTop: '1px solid #e0e0e0',
  },
  orderNotes: { fontSize: '13px', color: '#666', margin: '12px 0 0' },
  badge: {
    padding: '3px 10px', borderRadius: '12px',
    fontSize: '12px', fontWeight: '700',
  },
  poCard: {
    background: '#fafafa', borderRadius: '10px',
    padding: '16px', marginBottom: '16px',
    border: '1px solid #f0f0f0',
  },
  poHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '12px',
  },
  poSupplier: { fontSize: '16px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  poMeta: { fontSize: '12px', color: '#888', margin: '4px 0 0' },
  poActions: { display: 'flex', gap: '8px' },
  generateBtn: {
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #0f3460, #e94560)',
    color: 'white', border: 'none', borderRadius: '8px',
    fontSize: '13px', fontWeight: '700', cursor: 'pointer',
  },
  branchTag: {
    display: 'inline-block', background: '#f0f4ff',
    color: '#0f3460', padding: '2px 8px',
    borderRadius: '10px', fontSize: '11px',
    marginRight: '4px', marginBottom: '2px',
  },
  printBtnSm: {
    padding: '5px 10px', background: '#f0f0f0',
    border: 'none', borderRadius: '6px',
    fontSize: '13px', cursor: 'pointer',
  },
  confirmNote: {
    fontSize: '13px', color: '#0f3460',
    background: '#f0f4ff', padding: '10px',
    borderRadius: '6px', margin: '0 0 12px',
  },
  empty: {
    textAlign: 'center', padding: '40px',
    color: '#aaa', fontSize: '14px',
  },
};