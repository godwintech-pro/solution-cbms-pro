import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    location: '',
    manager: '',
    phone: '',
    status: 'Active',
  });

  // Load branches in real time
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'branches'), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setBranches(data);
    });
    return unsubscribe;
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function resetForm() {
    setForm({
      name: '',
      location: '',
      manager: '',
      phone: '',
      status: 'Active',
    });
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSubmit() {
    if (!form.name || !form.location || !form.manager) {
      alert('Please fill in Branch Name, Location and Manager.');
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'branches', editingId), {
          ...form,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'branches'), {
          ...form,
          createdAt: serverTimestamp(),
        });
      }
      resetForm();
    } catch (err) {
      alert('Error saving branch: ' + err.message);
    }
    setLoading(false);
  }

  function handleEdit(branch) {
    setForm({
      name: branch.name,
      location: branch.location,
      manager: branch.manager,
      phone: branch.phone || '',
      status: branch.status,
    });
    setEditingId(branch.id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (window.confirm('Are you sure you want to delete this branch?')) {
      await deleteDoc(doc(db, 'branches', id));
    }
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>🏪 Branch Management</h2>
          <p style={styles.subtitle}>
            Manage all Solution Enterprises branches
          </p>
        </div>
        <button
          style={styles.addBtn}
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Add Branch
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statBox}>
          <p style={styles.statNum}>{branches.length}</p>
          <p style={styles.statLabel}>Total Branches</p>
        </div>
        <div style={styles.statBox}>
          <p style={{ ...styles.statNum, color: '#28a745' }}>
            {branches.filter((b) => b.status === 'Active').length}
          </p>
          <p style={styles.statLabel}>Active</p>
        </div>
        <div style={styles.statBox}>
          <p style={{ ...styles.statNum, color: '#dc3545' }}>
            {branches.filter((b) => b.status === 'Inactive').length}
          </p>
          <p style={styles.statLabel}>Inactive</p>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div style={styles.formCard}>
          <h3 style={styles.formTitle}>
            {editingId ? '✏️ Edit Branch' : '➕ Add New Branch'}
          </h3>
          <div style={styles.formGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Branch Name *</label>
              <input
                style={styles.input}
                name="name"
                placeholder="e.g. Kamwala Branch"
                value={form.name}
                onChange={handleChange}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Location *</label>
              <input
                style={styles.input}
                name="location"
                placeholder="e.g. Kamwala, Lusaka"
                value={form.location}
                onChange={handleChange}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Branch Manager *</label>
              <input
                style={styles.input}
                name="manager"
                placeholder="e.g. John Banda"
                value={form.manager}
                onChange={handleChange}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Phone Number</label>
              <input
                style={styles.input}
                name="phone"
                placeholder="e.g. 0977000000"
                value={form.phone}
                onChange={handleChange}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Status</label>
              <select
                style={styles.input}
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div style={styles.formActions}>
            <button style={styles.cancelBtn} onClick={resetForm}>
              Cancel
            </button>
            <button
              style={loading ? styles.saveBtnDisabled : styles.saveBtn}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading
                ? 'Saving...'
                : editingId
                ? 'Update Branch'
                : 'Save Branch'}
            </button>
          </div>
        </div>
      )}

      {/* Branches List */}
      {branches.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyIcon}>🏪</p>
          <p style={styles.emptyText}>No branches added yet.</p>
          <p style={styles.emptySub}>
            Click "Add Branch" to add your first branch.
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {branches.map((branch) => (
            <div key={branch.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardIcon}>🏪</div>
                <span
                  style={
                    branch.status === 'Active'
                      ? styles.badgeActive
                      : styles.badgeInactive
                  }
                >
                  {branch.status}
                </span>
              </div>
              <h3 style={styles.cardTitle}>{branch.name}</h3>
              <p style={styles.cardInfo}>📍 {branch.location}</p>
              <p style={styles.cardInfo}>👤 {branch.manager}</p>
              {branch.phone && <p style={styles.cardInfo}>📞 {branch.phone}</p>}
              <div style={styles.cardActions}>
                <button
                  style={styles.editBtn}
                  onClick={() => handleEdit(branch)}
                >
                  ✏️ Edit
                </button>
                <button
                  style={styles.deleteBtn}
                  onClick={() => handleDelete(branch.id)}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '0' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: { fontSize: '22px', fontWeight: '800', color: '#1a1a2e', margin: 0 },
  subtitle: { fontSize: '13px', color: '#888', margin: '4px 0 0' },
  addBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #0f3460, #e94560)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  statsRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
  },
  statBox: {
    background: 'white',
    borderRadius: '12px',
    padding: '16px 24px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    textAlign: 'center',
    minWidth: '100px',
  },
  statNum: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#0f3460',
    margin: 0,
  },
  statLabel: { fontSize: '12px', color: '#888', margin: '4px 0 0' },
  formCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  formTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: '0 0 20px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
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
    marginTop: '20px',
  },
  cancelBtn: {
    padding: '10px 20px',
    background: '#f0f0f0',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #0f3460, #e94560)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  saveBtnDisabled: {
    padding: '10px 24px',
    background: '#ccc',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'not-allowed',
  },
  empty: {
    textAlign: 'center',
    padding: '60px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  emptyIcon: { fontSize: '48px', margin: '0 0 10px' },
  emptyText: { fontSize: '16px', fontWeight: '600', color: '#555' },
  emptySub: { fontSize: '13px', color: '#aaa', margin: '6px 0 0' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  cardIcon: { fontSize: '28px' },
  badgeActive: {
    background: '#e6f9ee',
    color: '#28a745',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '700',
  },
  badgeInactive: {
    background: '#fff0f0',
    color: '#dc3545',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: '0 0 8px',
  },
  cardInfo: { fontSize: '13px', color: '#666', margin: '4px 0' },
  cardActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '16px',
  },
  editBtn: {
    flex: 1,
    padding: '8px',
    background: '#f0f4ff',
    color: '#0f3460',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  deleteBtn: {
    flex: 1,
    padding: '8px',
    background: '#fff0f0',
    color: '#dc3545',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
