import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';

// ─── MAIN COMPONENT ───────────────────────────────────────
export default function Inventory() {
  const [activeTab, setActiveTab] = useState('products');

  const tabs = [
    { id: 'products', icon: '📦', label: 'Products' },
    { id: 'categories', icon: '🏷️', label: 'Categories' },
    { id: 'suppliers', icon: '🏭', label: 'Suppliers' },
    { id: 'stock', icon: '📊', label: 'Stock Levels' },
    { id: 'stocktaking', icon: '🔍', label: 'Stock Taking' },
  ];

  return (
    <div>
      {/* Tab Navigation */}
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

      {/* Tab Content */}
      {activeTab === 'categories' && <Categories />}
      {activeTab === 'suppliers' && <Suppliers />}
      {activeTab === 'products' && <Products />}
      {activeTab === 'stock' && <StockLevels />}
      {activeTab === 'stocktaking' && <StockTaking />}

    </div>
  );
}

// ─── CATEGORIES ───────────────────────────────────────────
function Categories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'categories'), (snap) => {
      setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, []);

  async function handleSave() {
    if (!name.trim()) return alert('Enter a category name.');
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'categories', editingId), {
          name,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'categories'), {
          name,
          createdAt: serverTimestamp(),
        });
      }
      setName('');
      setEditingId(null);
    } catch (err) {
      alert(err.message);
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (window.confirm('Delete this category?')) {
      await deleteDoc(doc(db, 'categories', id));
    }
  }

  return (
    <div style={styles.sectionCard}>
      <h3 style={styles.sectionTitle}>🏷️ Product Categories</h3>
      <p style={styles.sectionSub}>
        Categories help organise hundreds of products efficiently.
      </p>

      {/* Add/Edit Form */}
      <div style={styles.inlineForm}>
        <input
          style={styles.inlineInput}
          placeholder="e.g. Pharmaceuticals, Groceries, Cosmetics..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <button
          style={loading ? styles.saveBtnDisabled : styles.saveBtn}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? 'Saving...' : editingId ? 'Update' : '+ Add Category'}
        </button>
        {editingId && (
          <button
            style={styles.cancelBtn}
            onClick={() => {
              setName('');
              setEditingId(null);
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {/* Categories List */}
      {categories.length === 0 ? (
        <div style={styles.empty}>
          No categories yet. Add your first one above.
        </div>
      ) : (
        <div style={styles.chipGrid}>
          {categories.map((cat) => (
            <div key={cat.id} style={styles.chip}>
              <span style={styles.chipName}>🏷️ {cat.name}</span>
              <div style={styles.chipActions}>
                <button
                  style={styles.chipEdit}
                  onClick={() => {
                    setName(cat.name);
                    setEditingId(cat.id);
                  }}
                >
                  ✏️
                </button>
                <button
                  style={styles.chipDelete}
                  onClick={() => handleDelete(cat.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SUPPLIERS ────────────────────────────────────────────
function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'suppliers'), (snap) => {
      setSuppliers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function resetForm() {
    setForm({ name: '', phone: '', email: '', address: '', notes: '' });
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSave() {
    if (!form.name.trim()) return alert('Supplier name is required.');
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'suppliers', editingId), {
          ...form,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'suppliers'), {
          ...form,
          createdAt: serverTimestamp(),
        });
      }
      resetForm();
    } catch (err) {
      alert(err.message);
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (window.confirm('Delete this supplier?')) {
      await deleteDoc(doc(db, 'suppliers', id));
    }
  }

  function handleEdit(supplier) {
    setForm({
      name: supplier.name,
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
    });
    setEditingId(supplier.id);
    setShowForm(true);
  }

  return (
    <div style={styles.sectionCard}>
      <div style={styles.sectionHeader}>
        <div>
          <h3 style={styles.sectionTitle}>🏭 Suppliers</h3>
          <p style={styles.sectionSub}>Manage all your product suppliers.</p>
        </div>
        <button
          style={styles.saveBtn}
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Add Supplier
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={styles.formBox}>
          <h4 style={styles.formTitle}>
            {editingId ? '✏️ Edit Supplier' : '➕ New Supplier'}
          </h4>
          <div style={styles.formGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Supplier Name *</label>
              <input
                style={styles.input}
                name="name"
                value={form.name}
                placeholder="e.g. Zambia Pharmaceuticals Ltd"
                onChange={handleChange}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Phone</label>
              <input
                style={styles.input}
                name="phone"
                value={form.phone}
                placeholder="e.g. 0977000000"
                onChange={handleChange}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email</label>
              <input
                style={styles.input}
                name="email"
                value={form.email}
                placeholder="e.g. supplier@email.com"
                onChange={handleChange}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Address</label>
              <input
                style={styles.input}
                name="address"
                value={form.address}
                placeholder="e.g. Cairo Road, Lusaka"
                onChange={handleChange}
              />
            </div>
            <div style={{ ...styles.inputGroup, gridColumn: '1 / -1' }}>
              <label style={styles.label}>Notes</label>
              <input
                style={styles.input}
                name="notes"
                value={form.notes}
                placeholder="Any additional notes..."
                onChange={handleChange}
              />
            </div>
          </div>
          <div style={styles.formActions}>
            <button style={styles.cancelBtn} onClick={resetForm}>
              Cancel
            </button>
            <button
              style={loading ? styles.saveBtnDisabled : styles.saveBtn}
              onClick={handleSave}
              disabled={loading}
            >
              {loading
                ? 'Saving...'
                : editingId
                ? 'Update Supplier'
                : 'Save Supplier'}
            </button>
          </div>
        </div>
      )}

      {/* Suppliers List */}
      {suppliers.length === 0 ? (
        <div style={styles.empty}>
          No suppliers yet. Add your first supplier above.
        </div>
      ) : (
        <div style={styles.supplierGrid}>
          {suppliers.map((s) => (
            <div key={s.id} style={styles.supplierCard}>
              <div style={styles.supplierIcon}>🏭</div>
              <div style={styles.supplierInfo}>
                <p style={styles.supplierName}>{s.name}</p>
                {s.phone && <p style={styles.supplierDetail}>📞 {s.phone}</p>}
                {s.email && <p style={styles.supplierDetail}>✉️ {s.email}</p>}
                {s.address && (
                  <p style={styles.supplierDetail}>📍 {s.address}</p>
                )}
                {s.notes && <p style={styles.supplierNotes}>{s.notes}</p>}
              </div>
              <div style={styles.supplierActions}>
                <button style={styles.chipEdit} onClick={() => handleEdit(s)}>
                  ✏️
                </button>
                <button
                  style={styles.chipDelete}
                  onClick={() => handleDelete(s.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PRODUCTS ─────────────────────────────────────────────
function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    supplierId: '',
    buyingPrice: '',
    sellingPrice: '',
    unit: 'Pieces',
    reorderLevel: '10',
    description: '',
  });

  useEffect(() => {
    const unsubP = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubC = onSnapshot(collection(db, 'categories'), (snap) => {
      setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubS = onSnapshot(collection(db, 'suppliers'), (snap) => {
      setSuppliers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsubP();
      unsubC();
      unsubS();
    };
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function resetForm() {
    setForm({
      name: '',
      categoryId: '',
      supplierId: '',
      buyingPrice: '',
      sellingPrice: '',
      unit: 'Pieces',
      reorderLevel: '10',
      description: '',
    });
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSave() {
    if (!form.name.trim()) return alert('Product name is required.');
    if (!form.categoryId) return alert('Please select a category.');
    if (!form.buyingPrice || !form.sellingPrice)
      return alert('Please enter buying and selling prices.');
    setLoading(true);
    try {
      const data = {
        ...form,
        buyingPrice: parseFloat(form.buyingPrice),
        sellingPrice: parseFloat(form.sellingPrice),
        reorderLevel: parseInt(form.reorderLevel),
      };
      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), {
          ...data,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'products'), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      resetForm();
    } catch (err) {
      alert(err.message);
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (window.confirm('Delete this product?')) {
      await deleteDoc(doc(db, 'products', id));
    }
  }

  function handleEdit(product) {
    setForm({
      name: product.name,
      categoryId: product.categoryId || '',
      supplierId: product.supplierId || '',
      buyingPrice: product.buyingPrice || '',
      sellingPrice: product.sellingPrice || '',
      unit: product.unit || 'Pieces',
      reorderLevel: product.reorderLevel || '10',
      description: product.description || '',
    });
    setEditingId(product.id);
    setShowForm(true);
  }

  // Filter & Search
  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory ? p.categoryId === filterCategory : true;
    return matchSearch && matchCat;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  function getCategoryName(id) {
    return categories.find((c) => c.id === id)?.name || '—';
  }

  function getSupplierName(id) {
    return suppliers.find((s) => s.id === id)?.name || '—';
  }

  return (
    <div style={styles.sectionCard}>
      <div style={styles.sectionHeader}>
        <div>
          <h3 style={styles.sectionTitle}>📦 Product Master List</h3>
          <p style={styles.sectionSub}>
            {products.length} products registered across all branches.
          </p>
        </div>
        <button
          style={styles.saveBtn}
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Add Product
        </button>
      </div>

      {/* Search & Filter */}
      <div style={styles.searchRow}>
        <input
          style={styles.searchInput}
          placeholder="🔍 Search products..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          style={styles.filterSelect}
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div style={styles.formBox}>
          <h4 style={styles.formTitle}>
            {editingId ? '✏️ Edit Product' : '➕ Add New Product'}
          </h4>
          <div style={styles.formGrid}>
            <div style={{ ...styles.inputGroup, gridColumn: '1 / -1' }}>
              <label style={styles.label}>Product Name *</label>
              <input
                style={styles.input}
                name="name"
                value={form.name}
                placeholder="e.g. Paracetamol 500mg"
                onChange={handleChange}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Category *</label>
              <select
                style={styles.input}
                name="categoryId"
                value={form.categoryId}
                onChange={handleChange}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Supplier</label>
              <select
                style={styles.input}
                name="supplierId"
                value={form.supplierId}
                onChange={handleChange}
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Buying Price (K) *</label>
              <input
                style={styles.input}
                name="buyingPrice"
                type="number"
                value={form.buyingPrice}
                placeholder="0.00"
                onChange={handleChange}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Selling Price (K) *</label>
              <input
                style={styles.input}
                name="sellingPrice"
                type="number"
                value={form.sellingPrice}
                placeholder="0.00"
                onChange={handleChange}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Unit</label>
              <select
                style={styles.input}
                name="unit"
                value={form.unit}
                onChange={handleChange}
              >
                <option>Pieces</option>
                <option>Strips</option>
                <option>Bottles</option>
                <option>Boxes</option>
                <option>Kg</option>
                <option>Litres</option>
                <option>Sachets</option>
                <option>Cartons</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Reorder Level</label>
              <input
                style={styles.input}
                name="reorderLevel"
                type="number"
                value={form.reorderLevel}
                placeholder="Min quantity before alert"
                onChange={handleChange}
              />
            </div>
            <div style={{ ...styles.inputGroup, gridColumn: '1 / -1' }}>
              <label style={styles.label}>Description</label>
              <input
                style={styles.input}
                name="description"
                value={form.description}
                placeholder="Optional product description"
                onChange={handleChange}
              />
            </div>
          </div>
          <div style={styles.formActions}>
            <button style={styles.cancelBtn} onClick={resetForm}>
              Cancel
            </button>
            <button
              style={loading ? styles.saveBtnDisabled : styles.saveBtn}
              onClick={handleSave}
              disabled={loading}
            >
              {loading
                ? 'Saving...'
                : editingId
                ? 'Update Product'
                : 'Save Product'}
            </button>
          </div>
        </div>
      )}

      {/* Products Table */}
      {filtered.length === 0 ? (
        <div style={styles.empty}>
          {products.length === 0
            ? 'No products yet. Add categories and suppliers first, then add products.'
            : 'No products match your search.'}
        </div>
      ) : (
        <>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHead}>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Product Name</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Supplier</th>
                  <th style={styles.th}>Buy (K)</th>
                  <th style={styles.th}>Sell (K)</th>
                  <th style={styles.th}>Unit</th>
                  <th style={styles.th}>Reorder</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p, i) => (
                  <tr
                    key={p.id}
                    style={i % 2 === 0 ? styles.trEven : styles.trOdd}
                  >
                    <td style={styles.td}>{(page - 1) * perPage + i + 1}</td>
                    <td style={{ ...styles.td, fontWeight: '600' }}>
                      {p.name}
                    </td>
                    <td style={styles.td}>{getCategoryName(p.categoryId)}</td>
                    <td style={styles.td}>{getSupplierName(p.supplierId)}</td>
                    <td style={styles.td}>
                      K {Number(p.buyingPrice).toFixed(2)}
                    </td>
                    <td style={styles.td}>
                      K {Number(p.sellingPrice).toFixed(2)}
                    </td>
                    <td style={styles.td}>{p.unit}</td>
                    <td style={styles.td}>{p.reorderLevel}</td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          style={styles.chipEdit}
                          onClick={() => handleEdit(p)}
                        >
                          ✏️
                        </button>
                        <button
                          style={styles.chipDelete}
                          onClick={() => handleDelete(p.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                style={page === 1 ? styles.pageDisabled : styles.pageBtn}
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                ← Prev
              </button>
              <span style={styles.pageInfo}>
                Page {page} of {totalPages} ({filtered.length} products)
              </span>
              <button
                style={
                  page === totalPages ? styles.pageDisabled : styles.pageBtn
                }
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── STOCK LEVELS ─────────────────────────────────────────
function StockLevels() {
  const { userName, userRole } = useAuth();
  const [stock, setStock] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    productId: '',
    branchId: '',
    quantity: '',
    expiryDate: '',
    batchNumber: '',
  });

  const [adjustForm, setAdjustForm] = useState({
    type: 'IN',
    reason: 'Stock Received',
    quantity: '',
    note: '',
  });

  const inReasons = ['Stock Received', 'Transfer In', 'Correction'];
  const outReasons = [
    'Damaged',
    'Expired Removed',
    'Theft / Loss',
    'Transfer Out',
    'Correction',
  ];

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
    const unsubA = onSnapshot(collection(db, 'stockAdjustments'), (snap) => {
      setAdjustments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsubStock();
      unsubP();
      unsubB();
      unsubA();
    };
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function resetForm() {
    setForm({
      productId: '',
      branchId: '',
      quantity: '',
      expiryDate: '',
      batchNumber: '',
    });
    setShowForm(false);
  }

  async function handleAddStock() {
    if (!form.productId) return alert('Select a product.');
    if (!form.branchId) return alert('Select a branch.');
    if (!form.quantity) return alert('Enter quantity.');
    setLoading(true);
    try {
      // Check if stock entry already exists for this product+branch
      const existing = stock.find(
        (s) => s.productId === form.productId && s.branchId === form.branchId
      );
      if (existing) {
        return alert(
          'Stock entry already exists for this product at this branch. Use the Adjust button to update quantity.'
        );
      }
      const stockRef = await addDoc(collection(db, 'stock'), {
        productId: form.productId,
        branchId: form.branchId,
        currentQuantity: parseInt(form.quantity),
        expiryDate: form.expiryDate,
        batchNumber: form.batchNumber,
        createdAt: serverTimestamp(),
      });
      // Record as opening stock adjustment
      await addDoc(collection(db, 'stockAdjustments'), {
        stockId: stockRef.id,
        productId: form.productId,
        branchId: form.branchId,
        type: 'IN',
        reason: 'Opening Stock',
        quantity: parseInt(form.quantity),
        note: 'Initial stock entry',
        createdBy: userName || 'System',
        createdAt: serverTimestamp(),
      });
      resetForm();
    } catch (err) {
      alert(err.message);
    }
    setLoading(false);
  }

  async function handleAdjust() {
    if (!adjustForm.quantity || parseInt(adjustForm.quantity) <= 0) {
      return alert('Enter a valid quantity.');
    }
    setLoading(true);
    try {
      const qty = parseInt(adjustForm.quantity);
      const currentQty = selectedStock.currentQuantity;
      const newQty =
        adjustForm.type === 'IN' ? currentQty + qty : currentQty - qty;

      if (newQty < 0) {
        setLoading(false);
        return alert(
          `Cannot remove ${qty} units. Only ${currentQty} units available.`
        );
      }

      // Update stock quantity
      await updateDoc(doc(db, 'stock', selectedStock.id), {
        currentQuantity: newQty,
        updatedAt: serverTimestamp(),
      });

      // Record adjustment
      await addDoc(collection(db, 'stockAdjustments'), {
        stockId: selectedStock.id,
        productId: selectedStock.productId,
        branchId: selectedStock.branchId,
        type: adjustForm.type,
        reason: adjustForm.reason,
        quantity: qty,
        previousQuantity: currentQty,
        newQuantity: newQty,
        note: adjustForm.note,
        createdBy: userName || 'System',
        createdAt: serverTimestamp(),
      });

      // Send notification for critical adjustments
      const criticalReasons = ['Theft / Loss', 'Damaged', 'Expired Removed'];
      if (criticalReasons.includes(adjustForm.reason)) {
        await addDoc(collection(db, 'notifications'), {
          type: 'STOCK_ALERT',
          reason: adjustForm.reason,
          productId: selectedStock.productId,
          branchId: selectedStock.branchId,
          quantity: qty,
          message: `⚠️ ${adjustForm.reason}: ${qty} units of ${getProductName(
            selectedStock.productId
          )} removed at ${getBranchName(selectedStock.branchId)}`,
          createdBy: userName || 'System',
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      setShowAdjustModal(false);
      setAdjustForm({
        type: 'IN',
        reason: 'Stock Received',
        quantity: '',
        note: '',
      });
      setSelectedStock(null);
    } catch (err) {
      alert(err.message);
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (userRole !== 'Super Admin') {
      return alert('Only Super Admin can delete stock entries.');
    }
    if (
      window.confirm(
        'Permanently delete this stock entry and all its adjustment history?'
      )
    ) {
      await deleteDoc(doc(db, 'stock', id));
    }
  }

  function openAdjust(stockItem) {
    setSelectedStock(stockItem);
    setAdjustForm({
      type: 'IN',
      reason: 'Stock Received',
      quantity: '',
      note: '',
    });
    setShowAdjustModal(true);
  }

  function openHistory(stockItem) {
    setSelectedStock(stockItem);
    setShowHistoryModal(true);
  }

  function getProductName(id) {
    return products.find((p) => p.id === id)?.name || '—';
  }

  function getBranchName(id) {
    return branches.find((b) => b.id === id)?.name || '—';
  }

  function getExpiryStatus(dateStr) {
    if (!dateStr) return null;
    const today = new Date();
    const expiry = new Date(dateStr);
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0)
      return { label: 'EXPIRED', color: '#dc3545', bg: '#fff0f0' };
    if (daysLeft <= 30)
      return { label: `${daysLeft}d left`, color: '#dc3545', bg: '#fff0f0' };
    if (daysLeft <= 150)
      return { label: `${daysLeft}d left`, color: '#f39c12', bg: '#fff8e1' };
    return { label: `${daysLeft}d left`, color: '#28a745', bg: '#e6f9ee' };
  }

  function getLowStockStatus(stockItem) {
    const product = products.find((p) => p.id === stockItem.productId);
    if (!product) return false;
    return stockItem.currentQuantity <= product.reorderLevel;
  }

  function getStockHistory(stockId) {
    return adjustments
      .filter((a) => a.stockId === stockId)
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
  }

  const totalLowStock = stock.filter((s) => getLowStockStatus(s)).length;
  const totalExpiringSoon = stock.filter((s) => {
    const status = getExpiryStatus(s.expiryDate);
    return status && (status.color === '#dc3545' || status.color === '#f39c12');
  }).length;

  return (
    <div style={styles.sectionCard}>
      <div style={styles.sectionHeader}>
        <div>
          <h3 style={styles.sectionTitle}>📊 Stock Levels</h3>
          <p style={styles.sectionSub}>
            Track stock quantities and expiry dates per branch.
          </p>
        </div>
        <button style={styles.saveBtn} onClick={() => setShowForm(!showForm)}>
          + Add Stock Entry
        </button>
      </div>

      {/* Summary Stats */}
      <div style={styles.stockStats}>
        <div style={styles.stockStat}>
          <p style={styles.stockStatNum}>{stock.length}</p>
          <p style={styles.stockStatLabel}>Total Entries</p>
        </div>
        <div style={styles.stockStat}>
          <p style={{ ...styles.stockStatNum, color: '#f39c12' }}>
            {totalExpiringSoon}
          </p>
          <p style={styles.stockStatLabel}>Expiring Soon</p>
        </div>
        <div style={styles.stockStat}>
          <p style={{ ...styles.stockStatNum, color: '#dc3545' }}>
            {totalLowStock}
          </p>
          <p style={styles.stockStatLabel}>Low Stock</p>
        </div>
        <div style={styles.stockStat}>
          <p style={{ ...styles.stockStatNum, color: '#28a745' }}>
            {adjustments.length}
          </p>
          <p style={styles.stockStatLabel}>Total Adjustments</p>
        </div>
      </div>

      {/* Add Stock Form */}
      {showForm && (
        <div style={styles.formBox}>
          <h4 style={styles.formTitle}>➕ New Stock Entry</h4>
          <div style={styles.formGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Product *</label>
              <select
                style={styles.input}
                name="productId"
                value={form.productId}
                onChange={handleChange}
              >
                <option value="">Select Product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Branch *</label>
              <select
                style={styles.input}
                name="branchId"
                value={form.branchId}
                onChange={handleChange}
              >
                <option value="">Select Branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Opening Quantity *</label>
              <input
                style={styles.input}
                name="quantity"
                type="number"
                value={form.quantity}
                placeholder="0"
                onChange={handleChange}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Expiry Date</label>
              <input
                style={styles.input}
                name="expiryDate"
                type="date"
                value={form.expiryDate}
                onChange={handleChange}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Batch Number</label>
              <input
                style={styles.input}
                name="batchNumber"
                value={form.batchNumber}
                placeholder="e.g. BATCH-001"
                onChange={handleChange}
              />
            </div>
          </div>
          <div style={styles.formActions}>
            <button style={styles.cancelBtn} onClick={resetForm}>
              Cancel
            </button>
            <button
              style={loading ? styles.saveBtnDisabled : styles.saveBtn}
              onClick={handleAddStock}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Stock Entry'}
            </button>
          </div>
        </div>
      )}

      {/* Stock Table */}
      {stock.length === 0 ? (
        <div style={styles.empty}>
          No stock entries yet. Add products first then add stock per branch.
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHead}>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Product</th>
                <th style={styles.th}>Branch</th>
                <th style={styles.th}>Current Qty</th>
                <th style={styles.th}>Batch</th>
                <th style={styles.th}>Expiry</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((s, i) => {
                const expiryStatus = getExpiryStatus(s.expiryDate);
                const isLow = getLowStockStatus(s);
                return (
                  <tr
                    key={s.id}
                    style={i % 2 === 0 ? styles.trEven : styles.trOdd}
                  >
                    <td style={styles.td}>{i + 1}</td>
                    <td style={{ ...styles.td, fontWeight: '600' }}>
                      {getProductName(s.productId)}
                    </td>
                    <td style={styles.td}>{getBranchName(s.branchId)}</td>
                    <td style={styles.td}>
                      <span
                        style={
                          isLow
                            ? { color: '#dc3545', fontWeight: '700' }
                            : { color: '#28a745', fontWeight: '700' }
                        }
                      >
                        {s.currentQuantity}
                        {isLow && ' ⚠️'}
                      </span>
                    </td>
                    <td style={styles.td}>{s.batchNumber || '—'}</td>
                    <td style={styles.td}>{s.expiryDate || '—'}</td>
                    <td style={styles.td}>
                      {expiryStatus ? (
                        <span
                          style={{
                            background: expiryStatus.bg,
                            color: expiryStatus.color,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '700',
                          }}
                        >
                          {expiryStatus.label}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={styles.td}>
                      <div
                        style={{
                          display: 'flex',
                          gap: '6px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <button
                          style={styles.adjustBtn}
                          onClick={() => openAdjust(s)}
                        >
                          ↕️ Adjust
                        </button>
                        <button
                          style={styles.historyBtn}
                          onClick={() => openHistory(s)}
                        >
                          📋 History
                        </button>
                        {userRole === 'Super Admin' && (
                          <button
                            style={styles.chipDelete}
                            onClick={() => handleDelete(s.id)}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjust Modal */}
      {showAdjustModal && selectedStock && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>↕️ Stock Adjustment</h3>
            <p style={styles.modalSub}>
              <strong>{getProductName(selectedStock.productId)}</strong>
              {' — '}
              {getBranchName(selectedStock.branchId)}
            </p>
            <p style={styles.modalCurrent}>
              Current Stock:{' '}
              <strong>{selectedStock.currentQuantity} units</strong>
            </p>

            {/* IN / OUT Toggle */}
            <div style={styles.typeRow}>
              <button
                style={
                  adjustForm.type === 'IN' ? styles.typeActive : styles.typeBtn
                }
                onClick={() =>
                  setAdjustForm({
                    ...adjustForm,
                    type: 'IN',
                    reason: 'Stock Received',
                  })
                }
              >
                ➕ Stock IN
              </button>
              <button
                style={
                  adjustForm.type === 'OUT'
                    ? styles.typeActiveOut
                    : styles.typeBtn
                }
                onClick={() =>
                  setAdjustForm({
                    ...adjustForm,
                    type: 'OUT',
                    reason: 'Damaged',
                  })
                }
              >
                ➖ Stock OUT
              </button>
            </div>

            <div style={styles.formGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Reason *</label>
                <select
                  style={styles.input}
                  value={adjustForm.reason}
                  onChange={(e) =>
                    setAdjustForm({ ...adjustForm, reason: e.target.value })
                  }
                >
                  {(adjustForm.type === 'IN' ? inReasons : outReasons).map(
                    (r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Quantity *</label>
                <input
                  style={styles.input}
                  type="number"
                  placeholder="0"
                  value={adjustForm.quantity}
                  onChange={(e) =>
                    setAdjustForm({ ...adjustForm, quantity: e.target.value })
                  }
                />
              </div>
              <div style={{ ...styles.inputGroup, gridColumn: '1 / -1' }}>
                <label style={styles.label}>Note (optional)</label>
                <input
                  style={styles.input}
                  placeholder="Any additional details..."
                  value={adjustForm.note}
                  onChange={(e) =>
                    setAdjustForm({ ...adjustForm, note: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Preview */}
            {adjustForm.quantity && (
              <div style={styles.previewBox}>
                <p style={styles.previewText}>
                  {adjustForm.type === 'IN' ? '➕' : '➖'} {adjustForm.quantity}{' '}
                  units
                  {' → '}
                  New Total:{' '}
                  <strong
                    style={{
                      color: adjustForm.type === 'IN' ? '#28a745' : '#dc3545',
                    }}
                  >
                    {adjustForm.type === 'IN'
                      ? selectedStock.currentQuantity +
                        parseInt(adjustForm.quantity || 0)
                      : selectedStock.currentQuantity -
                        parseInt(adjustForm.quantity || 0)}{' '}
                    units
                  </strong>
                </p>
              </div>
            )}

            <div style={styles.formActions}>
              <button
                style={styles.cancelBtn}
                onClick={() => {
                  setShowAdjustModal(false);
                  setSelectedStock(null);
                }}
              >
                Cancel
              </button>
              <button
                style={loading ? styles.saveBtnDisabled : styles.saveBtn}
                onClick={handleAdjust}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedStock && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, maxWidth: '600px' }}>
            <h3 style={styles.modalTitle}>📋 Stock History</h3>
            <p style={styles.modalSub}>
              <strong>{getProductName(selectedStock.productId)}</strong>
              {' — '}
              {getBranchName(selectedStock.branchId)}
            </p>
            <p style={styles.modalCurrent}>
              Current Stock:{' '}
              <strong>{selectedStock.currentQuantity} units</strong>
            </p>

            <div style={styles.historyList}>
              {getStockHistory(selectedStock.id).length === 0 ? (
                <p
                  style={{
                    color: '#aaa',
                    textAlign: 'center',
                    padding: '20px',
                  }}
                >
                  No adjustment history yet.
                </p>
              ) : (
                getStockHistory(selectedStock.id).map((adj, i) => (
                  <div key={adj.id} style={styles.historyItem}>
                    <div
                      style={{
                        ...styles.historyBadge,
                        background: adj.type === 'IN' ? '#e6f9ee' : '#fff0f0',
                        color: adj.type === 'IN' ? '#28a745' : '#dc3545',
                      }}
                    >
                      {adj.type === 'IN' ? '➕' : '➖'}
                    </div>
                    <div style={styles.historyInfo}>
                      <p style={styles.historyReason}>{adj.reason}</p>
                      <p style={styles.historyMeta}>
                        By {adj.createdBy} •{' '}
                        {adj.createdAt?.seconds
                          ? new Date(
                              adj.createdAt.seconds * 1000
                            ).toLocaleString()
                          : 'Just now'}
                      </p>
                      {adj.note && (
                        <p style={styles.historyNote}>"{adj.note}"</p>
                      )}
                    </div>
                    <div style={styles.historyQty}>
                      <span
                        style={{
                          color: adj.type === 'IN' ? '#28a745' : '#dc3545',
                          fontWeight: '700',
                          fontSize: '16px',
                        }}
                      >
                        {adj.type === 'IN' ? '+' : '-'}
                        {adj.quantity}
                      </span>
                      {adj.newQuantity !== undefined && (
                        <p style={styles.historyBalance}>
                          Balance: {adj.newQuantity}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ textAlign: 'right', marginTop: '16px' }}>
              <button
                style={styles.cancelBtn}
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedStock(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STOCK TAKING ─────────────────────────────────────────
function StockTaking() {
  const { userName, userRole } = useAuth();
  const [stockTakes, setStockTakes] = useState([]);
  const [stock, setStock] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [countItems, setCountItems] = useState([]);
  const [expandedTake, setExpandedTake] = useState(null);
  const [filterBranch, setFilterBranch] = useState('');

  useEffect(() => {
    const unsubST = onSnapshot(
      query(collection(db, 'stockTakes'), orderBy('createdAt', 'desc')),
      (snap) => setStockTakes(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubS = onSnapshot(collection(db, 'stock'),
      (snap) => setStock(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubP = onSnapshot(collection(db, 'products'),
      (snap) => setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubB = onSnapshot(collection(db, 'branches'),
      (snap) => setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { unsubST(); unsubS(); unsubP(); unsubB(); };
  }, []);

  function getProductName(id) {
    return products.find((p) => p.id === id)?.name || '—';
  }

  function getProductBuyPrice(id) {
    return products.find((p) => p.id === id)?.buyingPrice || 0;
  }

  function getBranchName(id) {
    return branches.find((b) => b.id === id)?.name || '—';
  }

  function loadBranchStock(branchId) {
    setSelectedBranch(branchId);
    const branchStock = stock.filter((s) => s.branchId === branchId);
    setCountItems(branchStock.map((s) => ({
      stockId: s.id,
      productId: s.productId,
      productName: getProductName(s.productId),
      systemQty: s.currentQuantity || 0,
      actualQty: '',
      buyingPrice: getProductBuyPrice(s.productId),
    })));
  }

  function updateActualQty(stockId, value) {
    setCountItems(countItems.map((item) =>
      item.stockId === stockId ? { ...item, actualQty: value } : item
    ));
  }

  async function handleSubmitCount() {
    const incomplete = countItems.find((i) => i.actualQty === '');
    if (incomplete) return alert(`Enter actual count for ${incomplete.productName}`);
    if (!selectedBranch) return alert('Select a branch.');
    setLoading(true);
    try {
      const branch = branches.find((b) => b.id === selectedBranch);
      const items = countItems.map((item) => ({
        ...item,
        actualQty: parseInt(item.actualQty),
        variance: parseInt(item.actualQty) - item.systemQty,
        varianceValue: (parseInt(item.actualQty) - item.systemQty) * item.buyingPrice,
      }));

      const totalVariance = items.reduce((s, i) => s + i.variance, 0);
      const totalVarianceValue = items.reduce((s, i) => s + i.varianceValue, 0);
      const hasDiscrepancy = items.some((i) => i.variance !== 0);

      await addDoc(collection(db, 'stockTakes'), {
        branchId: selectedBranch,
        branchName: branch?.name || '',
        date: new Date().toISOString().split('T')[0],
        items,
        totalVariance,
        totalVarianceValue,
        hasDiscrepancy,
        conductedBy: userName || 'Unknown',
        createdAt: serverTimestamp(),
      });

      if (hasDiscrepancy) {
        await addDoc(collection(db, 'notifications'), {
          type: 'STOCK_VARIANCE',
          message: `🔍 Stock take at ${branch?.name} found variance of ${totalVariance} units (K ${Math.abs(totalVarianceValue).toFixed(2)})`,
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      setShowForm(false);
      setSelectedBranch('');
      setCountItems([]);
    } catch (err) { alert(err.message); }
    setLoading(false);
  }

  const filtered = filterBranch
    ? stockTakes.filter((st) => st.branchId === filterBranch)
    : stockTakes;

  // Summary stats
  const totalTakes = stockTakes.length;
  const takesWithIssues = stockTakes.filter((st) => st.hasDiscrepancy).length;
  const totalValueAtRisk = stockTakes.reduce((s, st) =>
    s + Math.abs(st.totalVarianceValue || 0), 0);

  return (
    <div style={styles.sectionCard}>
      {/* Summary Stats */}
      <div style={stStyles.statsRow}>
        <div style={stStyles.statBox}>
          <p style={stStyles.statNum}>{totalTakes}</p>
          <p style={stStyles.statLabel}>Total Stock Takes</p>
        </div>
        <div style={stStyles.statBox}>
          <p style={{ ...stStyles.statNum, color: takesWithIssues > 0 ? '#dc3545' : '#28a745' }}>
            {takesWithIssues}
          </p>
          <p style={stStyles.statLabel}>With Discrepancies</p>
        </div>
        <div style={stStyles.statBox}>
          <p style={{ ...stStyles.statNum, color: '#f39c12' }}>
            K {totalValueAtRisk.toFixed(2)}
          </p>
          <p style={stStyles.statLabel}>Total Variance Value</p>
        </div>
        <div style={stStyles.statBox}>
          <p style={{ ...stStyles.statNum, color: '#28a745' }}>
            {totalTakes - takesWithIssues}
          </p>
          <p style={stStyles.statLabel}>Clean Counts</p>
        </div>
      </div>

      {/* Header */}
      <div style={styles.sectionHeader}>
        <div>
          <h3 style={styles.sectionTitle}>🔍 Stock Taking</h3>
          <p style={styles.sectionSub}>
            Physical stock counts to verify system records.
            Discrepancies are flagged and reported automatically.
          </p>
        </div>
        <button style={styles.saveBtn} onClick={() => setShowForm(!showForm)}>
          + New Stock Count
        </button>
      </div>

      {/* New Count Form */}
      {showForm && (
        <div style={stStyles.countForm}>
          <h4 style={stStyles.countFormTitle}>🔍 New Physical Stock Count</h4>

          {!selectedBranch ? (
            <div>
              <label style={styles.label}>Select Branch to Count *</label>
              <div style={stStyles.branchButtons}>
                {branches.map((b) => (
                  <button key={b.id}
                    style={stStyles.branchBtn}
                    onClick={() => loadBranchStock(b.id)}>
                    🏪 {b.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div style={stStyles.countHeader}>
                <p style={stStyles.countBranch}>
                  🏪 {branches.find((b) => b.id === selectedBranch)?.name}
                </p>
                <button style={stStyles.changeBranchBtn}
                  onClick={() => { setSelectedBranch(''); setCountItems([]); }}>
                  Change Branch
                </button>
              </div>

              {countItems.length === 0 ? (
                <div style={styles.empty}>
                  No stock entries found for this branch.
                  Add stock in Stock Levels tab first.
                </div>
              ) : (
                <>
                  <p style={stStyles.countInstruction}>
                    📋 Enter the ACTUAL physical count for each product below.
                    The system will automatically calculate variances.
                  </p>
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.tableHead}>
                          <th style={styles.th}>Product</th>
                          <th style={styles.th}>System Qty</th>
                          <th style={styles.th}>Actual Count *</th>
                          <th style={styles.th}>Variance</th>
                          <th style={styles.th}>Value at Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {countItems.map((item, i) => {
                          const actual = parseInt(item.actualQty) || 0;
                          const variance = item.actualQty !== '' ? actual - item.systemQty : null;
                          const valueAtRisk = variance !== null ? variance * item.buyingPrice : null;
                          return (
                            <tr key={item.stockId}
                              style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                              <td style={{ ...styles.td, fontWeight: '600' }}>
                                {item.productName}
                              </td>
                              <td style={styles.td}>{item.systemQty}</td>
                              <td style={styles.td}>
                                <input
                                  style={stStyles.countInput}
                                  type="number"
                                  placeholder="0"
                                  value={item.actualQty}
                                  onChange={(e) => updateActualQty(item.stockId, e.target.value)}
                                />
                              </td>
                              <td style={styles.td}>
                                {variance !== null && (
                                  <span style={{
                                    fontWeight: '700',
                                    color: variance === 0 ? '#28a745'
                                      : variance > 0 ? '#0f3460' : '#dc3545',
                                  }}>
                                    {variance > 0 ? '+' : ''}{variance}
                                    {variance === 0 ? ' ✅' : variance < 0 ? ' ⚠️' : ' ℹ️'}
                                  </span>
                                )}
                              </td>
                              <td style={styles.td}>
                                {valueAtRisk !== null && variance !== 0 && (
                                  <span style={{
                                    color: valueAtRisk < 0 ? '#dc3545' : '#0f3460',
                                    fontWeight: '700',
                                  }}>
                                    K {Math.abs(valueAtRisk).toFixed(2)}
                                    {valueAtRisk < 0 ? ' loss' : ' gain'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div style={stStyles.countActions}>
                    <button style={stStyles.cancelCountBtn}
                      onClick={() => { setShowForm(false); setSelectedBranch(''); setCountItems([]); }}>
                      Cancel
                    </button>
                    <button
                      style={loading ? stStyles.submitCountBtnDisabled : stStyles.submitCountBtn}
                      onClick={handleSubmitCount} disabled={loading}>
                      {loading ? 'Saving...' : '✅ Submit Stock Count'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filter */}
      <div style={styles.filterRow}>
        <select style={styles.filterSelect} value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}>
          <option value="">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        {filterBranch && (
          <button style={stStyles.clearBtn} onClick={() => setFilterBranch('')}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* Stock Take History */}
      {filtered.length === 0 ? (
        <div style={styles.empty}>
          No stock counts yet. Click "New Stock Count" to start.
        </div>
      ) : (
        <div style={stStyles.takesList}>
          {filtered.map((take) => (
            <div key={take.id} style={{
              ...stStyles.takeCard,
              borderLeft: `4px solid ${take.hasDiscrepancy ? '#dc3545' : '#28a745'}`,
            }}>
              <div style={stStyles.takeHeader}>
                <div>
                  <p style={stStyles.takeBranch}>{take.branchName}</p>
                  <p style={stStyles.takeMeta}>
                    📅 {take.date} · 👤 {take.conductedBy}
                  </p>
                </div>
                <div style={stStyles.takeSummary}>
                  <span style={{
                    ...stStyles.takeBadge,
                    background: take.hasDiscrepancy ? '#fff0f0' : '#e6f9ee',
                    color: take.hasDiscrepancy ? '#dc3545' : '#28a745',
                  }}>
                    {take.hasDiscrepancy ? '⚠️ Variance Found' : '✅ All Good'}
                  </span>
                  {take.hasDiscrepancy && (
                    <span style={stStyles.takeVariance}>
                      K {Math.abs(take.totalVarianceValue || 0).toFixed(2)} variance
                    </span>
                  )}
                  <button style={stStyles.viewBtn}
                    onClick={() => setExpandedTake(expandedTake === take.id ? null : take.id)}>
                    {expandedTake === take.id ? 'Hide' : '👁 View'}
                  </button>
                </div>
              </div>

              {expandedTake === take.id && (
                <div style={stStyles.takeDetail}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHead}>
                        <th style={styles.th}>Product</th>
                        <th style={styles.th}>System Qty</th>
                        <th style={styles.th}>Actual Count</th>
                        <th style={styles.th}>Variance</th>
                        <th style={styles.th}>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(take.items || []).map((item, i) => (
                        <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                          <td style={{ ...styles.td, fontWeight: '600' }}>
                            {item.productName}
                          </td>
                          <td style={styles.td}>{item.systemQty}</td>
                          <td style={styles.td}>{item.actualQty}</td>
                          <td style={{
                            ...styles.td, fontWeight: '700',
                            color: item.variance === 0 ? '#28a745'
                              : item.variance < 0 ? '#dc3545' : '#0f3460',
                          }}>
                            {item.variance > 0 ? '+' : ''}{item.variance}
                          </td>
                          <td style={{
                            ...styles.td,
                            color: item.varianceValue < 0 ? '#dc3545' : '#0f3460',
                            fontWeight: '700',
                          }}>
                            {item.variance !== 0
                              ? `K ${Math.abs(item.varianceValue || 0).toFixed(2)} ${item.varianceValue < 0 ? 'loss' : 'gain'}`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                      <tr style={styles.totalRow}>
                        <td colSpan="3" style={{ ...styles.td, fontWeight: '800' }}>TOTAL VARIANCE</td>
                        <td style={{
                          ...styles.td, fontWeight: '800',
                          color: take.totalVariance < 0 ? '#dc3545' : take.totalVariance > 0 ? '#0f3460' : '#28a745',
                        }}>
                          {take.totalVariance > 0 ? '+' : ''}{take.totalVariance} units
                        </td>
                        <td style={{
                          ...styles.td, fontWeight: '800',
                          color: take.totalVarianceValue < 0 ? '#dc3545' : '#0f3460',
                        }}>
                          K {Math.abs(take.totalVarianceValue || 0).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const stStyles = {
  statsRow: { display: 'flex', gap: '16px', marginBottom: '20px' },
  statBox: { background: 'white', borderRadius: '10px', padding: '16px 24px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', minWidth: '120px' },
  statNum: { fontSize: '24px', fontWeight: '800', color: '#0f3460', margin: 0 },
  statLabel: { fontSize: '11px', color: '#888', margin: '4px 0 0' },
  countForm: { background: '#f0f4ff', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '1px solid #d0e0ff' },
  countFormTitle: { fontSize: '16px', fontWeight: '700', color: '#0f3460', margin: '0 0 16px' },
  branchButtons: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' },
  branchBtn: { padding: '10px 20px', background: 'white', border: '2px solid #d0e0ff', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#0f3460', fontWeight: '600' },
  countHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  countBranch: { fontSize: '16px', fontWeight: '800', color: '#0f3460', margin: 0 },
  changeBranchBtn: { padding: '6px 14px', background: '#fff', border: '1px solid #d0e0ff', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#0f3460' },
  countInstruction: { fontSize: '13px', color: '#555', background: 'white', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #e0e0e0' },
  countInput: { width: '80px', padding: '6px 8px', borderRadius: '6px', border: '2px solid #e0e0e0', fontSize: '13px', outline: 'none' },
  countActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' },
  cancelCountBtn: { padding: '10px 20px', background: '#f0f0f0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#666' },
  submitCountBtn: { padding: '10px 24px', background: 'linear-gradient(135deg, #0f3460, #e94560)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700' },
  submitCountBtnDisabled: { padding: '10px 24px', background: '#ccc', color: 'white', border: 'none', borderRadius: '8px', cursor: 'not-allowed', fontSize: '14px' },
  filterRow: { display: 'flex', gap: '12px', marginBottom: '16px' },
  clearBtn: { padding: '8px 16px', background: '#fff0f0', color: '#dc3545', border: '1px solid #ffcccc', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' },
  takesList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  takeCard: { background: '#fafafa', borderRadius: '10px', padding: '16px', border: '1px solid #f0f0f0' },
  takeHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  takeBranch: { fontSize: '16px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  takeMeta: { fontSize: '12px', color: '#888', margin: '4px 0 0' },
  takeSummary: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' },
  takeBadge: { padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' },
  takeVariance: { fontSize: '13px', fontWeight: '700', color: '#dc3545' },
  viewBtn: { padding: '5px 12px', background: '#f0f4ff', color: '#0f3460', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  takeDetail: { marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e0e0e0' },
};

// ─── STYLES ───────────────────────────────────────────────
const styles = {
  tabRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  tab: {
    padding: '10px 20px',
    background: 'white',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#666',
  },
  tabActive: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #0f3460, #e94560)',
    border: '2px solid transparent',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    color: 'white',
    fontWeight: '700',
  },
  sectionCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: 0,
  },
  sectionSub: { fontSize: '13px', color: '#888', margin: '4px 0 0' },
  inlineForm: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  inlineInput: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: '8px',
    border: '2px solid #e0e0e0',
    fontSize: '14px',
    outline: 'none',
    minWidth: '200px',
  },
  saveBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #0f3460, #e94560)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  saveBtnDisabled: {
    padding: '10px 20px',
    background: '#ccc',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'not-allowed',
  },
  cancelBtn: {
    padding: '10px 20px',
    background: '#f0f0f0',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  chipGrid: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#f0f4ff',
    borderRadius: '20px',
    padding: '6px 12px',
  },
  chipName: { fontSize: '13px', fontWeight: '600', color: '#0f3460' },
  chipActions: { display: 'flex', gap: '4px' },
  chipEdit: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '2px',
  },
  chipDelete: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '2px',
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: '#aaa',
    fontSize: '14px',
    background: '#fafafa',
    borderRadius: '8px',
    marginTop: '16px',
  },
  supplierGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '16px',
  },
  supplierCard: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
    padding: '16px',
    background: '#fafafa',
    borderRadius: '10px',
    border: '1px solid #f0f0f0',
  },
  supplierIcon: { fontSize: '28px' },
  supplierInfo: { flex: 1 },
  supplierName: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: '0 0 4px',
  },
  supplierDetail: { fontSize: '12px', color: '#666', margin: '2px 0' },
  supplierNotes: {
    fontSize: '12px',
    color: '#aaa',
    margin: '4px 0 0',
    fontStyle: 'italic',
  },
  supplierActions: { display: 'flex', gap: '4px' },
  formBox: {
    background: '#fafafa',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '20px',
    border: '1px solid #e0e0e0',
  },
  formTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: '0 0 16px',
  },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#555' },
  input: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '2px solid #e0e0e0',
    fontSize: '14px',
    outline: 'none',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '16px',
  },
  searchRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: '8px',
    border: '2px solid #e0e0e0',
    fontSize: '14px',
    outline: 'none',
    minWidth: '200px',
  },
  filterSelect: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '2px solid #e0e0e0',
    fontSize: '14px',
    outline: 'none',
  },
  tableWrap: { overflowX: 'auto', marginTop: '16px' },
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
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '16px',
  },
  pageBtn: {
    padding: '8px 16px',
    background: '#0f3460',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  pageDisabled: {
    padding: '8px 16px',
    background: '#e0e0e0',
    color: '#aaa',
    border: 'none',
    borderRadius: '6px',
    cursor: 'not-allowed',
    fontSize: '13px',
  },
  pageInfo: { fontSize: '13px', color: '#666' },
  stockStats: { display: 'flex', gap: '16px', marginBottom: '20px' },
  stockStat: {
    background: '#f0f4ff',
    borderRadius: '10px',
    padding: '16px 24px',
    textAlign: 'center',
    minWidth: '100px',
  },
  stockStatNum: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#0f3460',
    margin: 0,
  },
  stockStatLabel: { fontSize: '12px', color: '#888', margin: '4px 0 0' },
  lowStock: { color: '#dc3545', fontWeight: '700' },
  adjustBtn: {
    padding: '5px 10px',
    background: '#e6f9ee',
    color: '#28a745',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  historyBtn: {
    padding: '5px 10px',
    background: '#f0f4ff',
    color: '#0f3460',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'white',
    borderRadius: '16px',
    padding: '30px',
    width: '90%',
    maxWidth: '480px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#1a1a2e',
    margin: '0 0 8px',
  },
  modalSub: { fontSize: '14px', color: '#666', margin: '0 0 8px' },
  modalCurrent: { fontSize: '13px', color: '#888', margin: '0 0 20px' },
  typeRow: { display: 'flex', gap: '10px', marginBottom: '20px' },
  typeBtn: {
    flex: 1,
    padding: '10px',
    background: '#f0f0f0',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#666',
  },
  typeActive: {
    flex: 1,
    padding: '10px',
    background: '#e6f9ee',
    border: '2px solid #28a745',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#28a745',
    fontWeight: '700',
  },
  typeActiveOut: {
    flex: 1,
    padding: '10px',
    background: '#fff0f0',
    border: '2px solid #dc3545',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#dc3545',
    fontWeight: '700',
  },
  previewBox: {
    background: '#f0f4ff',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
  },
  previewText: { fontSize: '14px', color: '#333', margin: 0 },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '16px',
  },
  historyItem: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    padding: '12px',
    background: '#fafafa',
    borderRadius: '8px',
    border: '1px solid #f0f0f0',
  },
  historyBadge: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    flexShrink: 0,
  },
  historyInfo: { flex: 1 },
  historyReason: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a2e',
    margin: 0,
  },
  historyMeta: { fontSize: '11px', color: '#aaa', margin: '2px 0 0' },
  historyNote: {
    fontSize: '12px',
    color: '#888',
    margin: '4px 0 0',
    fontStyle: 'italic',
  },
  historyQty: { textAlign: 'right' },
  historyBalance: { fontSize: '11px', color: '#aaa', margin: '2px 0 0' },
};
