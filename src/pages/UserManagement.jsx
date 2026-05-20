import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import {
  collection, addDoc, onSnapshot,
  doc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';

export default function UserManagement() {
  const { userRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterRole, setFilterRole] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'Branch Manager',
    branch: '',
    phone: '',
    status: 'Active',
    notes: '',
  });

  useEffect(() => {
    const unsubU = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubB = onSnapshot(collection(db, 'branches'), (snap) => {
      setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubU(); unsubB(); };
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function resetForm() {
    setForm({
      name: '', email: '', role: 'Branch Manager',
      branch: '', phone: '', status: 'Active', notes: '',
    });
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSave() {
    if (!form.name.trim()) return alert('Enter staff name.');
    if (!form.email.trim()) return alert('Enter email address.');
    if (!form.branch) return alert('Select a branch.');
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'users', editingId), {
          ...form, updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'users'), {
          ...form, createdAt: serverTimestamp(),
        });
      }
      resetForm();
    } catch (err) {
      alert(err.message);
    }
    setLoading(false);
  }

  async function handleToggleStatus(user) {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    await updateDoc(doc(db, 'users', user.id), { status: newStatus });
  }

  async function handleDelete(id) {
    if (window.confirm(
      'Delete this user profile? Note: This only removes the profile. You must also delete the account from Firebase Authentication.'
    )) {
      await deleteDoc(doc(db, 'users', id));
    }
  }

  function handleEdit(user) {
    setForm({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'Branch Manager',
      branch: user.branch || '',
      phone: user.phone || '',
      status: user.status || 'Active',
      notes: user.notes || '',
    });
    setEditingId(user.id);
    setShowForm(true);
  }

  const roles = [
    'Super Admin',
    'Branch Manager',
    'Store Personnel',
    'Finance Staff',
    'Procurement Team',
  ];

  const roleColors = {
    'Super Admin': { bg: '#fff0f5', color: '#e94560', border: '#ffccdd' },
    'Branch Manager': { bg: '#f0f4ff', color: '#0f3460', border: '#d0e0ff' },
    'Store Personnel': { bg: '#e6f9ee', color: '#28a745', border: '#b2dfdb' },
    'Finance Staff': { bg: '#fff8e1', color: '#f39c12', border: '#ffe082' },
    'Procurement Team': { bg: '#f3e6ff', color: '#9b59b6', border: '#e0b2ff' },
  };

  // Filter
  let filtered = users;
  if (filterRole) filtered = filtered.filter((u) => u.role === filterRole);
  if (filterBranch) filtered = filtered.filter((u) => u.branch === filterBranch);

  // Stats
  const activeUsers = users.filter((u) => u.status !== 'Inactive').length;
  const inactiveUsers = users.filter((u) => u.status === 'Inactive').length;

  return (
    <div>
      {/* Header Stats */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, borderTop: '4px solid #0f3460' }}>
          <p style={styles.statLabel}>👥 Total Users</p>
          <p style={styles.statValue}>{users.length}</p>
          <p style={styles.statSub}>Registered in system</p>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #28a745' }}>
          <p style={styles.statLabel}>✅ Active Users</p>
          <p style={{ ...styles.statValue, color: '#28a745' }}>{activeUsers}</p>
          <p style={styles.statSub}>Can access CBMS</p>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #dc3545' }}>
          <p style={styles.statLabel}>🚫 Inactive Users</p>
          <p style={{ ...styles.statValue, color: '#dc3545' }}>{inactiveUsers}</p>
          <p style={styles.statSub}>Access disabled</p>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #f39c12' }}>
          <p style={styles.statLabel}>🏪 Branches Covered</p>
          <p style={{ ...styles.statValue, color: '#f39c12' }}>
            {new Set(users.map((u) => u.branch).filter(Boolean)).size}
          </p>
          <p style={styles.statSub}>Out of {branches.length} branches</p>
        </div>
      </div>

      {/* Main Card */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.sectionTitle}>👥 System Users</h3>
            <p style={styles.sectionSub}>
              Manage all staff who have access to CBMS.
            </p>
          </div>
          <button style={styles.addBtn} onClick={() => { resetForm(); setShowForm(true); }}>
            + Add User
          </button>
        </div>

        {/* Filters */}
        <div style={styles.filterRow}>
          <select style={styles.filterSelect} value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}>
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select style={styles.filterSelect} value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}>
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>
          {(filterRole || filterBranch) && (
            <button style={styles.clearBtn}
              onClick={() => { setFilterRole(''); setFilterBranch(''); }}>
              ✕ Clear
            </button>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showForm && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              {/* Modal Header */}
              <div style={styles.modalHeader}>
                <div style={styles.modalHeaderLeft}>
                  <div style={styles.modalIcon}>👤</div>
                  <div>
                    <h3 style={styles.modalTitle}>
                      {editingId ? 'Edit User Profile' : 'Add New User'}
                    </h3>
                    <p style={styles.modalSub}>
                      {editingId
                        ? 'Update user details and permissions.'
                        : 'Create a new user profile. Then create their login in Firebase Authentication.'}
                    </p>
                  </div>
                </div>
                <button style={styles.closeBtn} onClick={resetForm}>✕</button>
              </div>

              {/* Instructions for new user */}
              {!editingId && (
                <div style={styles.instructionBox}>
                  <p style={styles.instructionTitle}>⚙️ How to give this user access:</p>
                  <ol style={styles.instructionList}>
                    <li>Fill in this form and save the profile</li>
                    <li>Go to Firebase Console → Authentication → Add user</li>
                    <li>Use the same email below and set a password</li>
                    <li>Copy the UID and update the document ID in Firestore</li>
                    <li>Share the login URL, email and password with the staff</li>
                  </ol>
                </div>
              )}

              {/* Form Body */}
              <div style={styles.modalBody}>
                {/* Personal Info */}
                <div style={styles.formSection}>
                  <p style={styles.formSectionLabel}>👤 Personal Information</p>
                  <div style={styles.formGrid}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Full Name *</label>
                      <input style={styles.input} name="name"
                        value={form.name} placeholder="e.g. John Banda"
                        onChange={handleChange} />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Email Address *</label>
                      <input style={styles.input} name="email" type="email"
                        value={form.email} placeholder="e.g. john@cbms.com"
                        onChange={handleChange} />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Phone Number</label>
                      <input style={styles.input} name="phone"
                        value={form.phone} placeholder="e.g. 0977000000"
                        onChange={handleChange} />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Status</label>
                      <select style={styles.input} name="status"
                        value={form.status} onChange={handleChange}>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Access Info */}
                <div style={styles.formSection}>
                  <p style={styles.formSectionLabel}>🔐 Access & Permissions</p>
                  <div style={styles.formGrid}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Role *</label>
                      <select style={styles.input} name="role"
                        value={form.role} onChange={handleChange}>
                        {roles.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Branch *</label>
                      <select style={styles.input} name="branch"
                        value={form.branch} onChange={handleChange}>
                        <option value="">Select Branch</option>
                        <option value="Head Office">Head Office</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.name}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Role Description */}
                  {form.role && (
                    <div style={styles.roleDescBox}>
                      <p style={styles.roleDescTitle}>
                        What {form.role} can access:
                      </p>
                      <p style={styles.roleDescText}>
                        {form.role === 'Super Admin' &&
                          'Full access to all modules, all branches, all data. Can create and manage users.'}
                        {form.role === 'Branch Manager' &&
                          'Can submit daily reports, create orders, view branch messages and confirm deliveries for their branch only.'}
                        {form.role === 'Store Personnel' &&
                          'Can manage stock levels, create orders and confirm deliveries for their branch.'}
                        {form.role === 'Finance Staff' &&
                          'Can view financial reports, record salaries and access expense data only.'}
                        {form.role === 'Procurement Team' &&
                          'Can manage suppliers, view purchase orders and track deliveries.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Notes (Optional)</label>
                  <input style={styles.input} name="notes"
                    value={form.notes}
                    placeholder="Any additional notes about this user..."
                    onChange={handleChange} />
                </div>
              </div>

              {/* Modal Footer */}
              <div style={styles.modalFooter}>
                <button style={styles.cancelBtn} onClick={resetForm}>Cancel</button>
                <button
                  style={loading ? styles.saveBtnDisabled : styles.saveBtn}
                  onClick={handleSave} disabled={loading}
                >
                  {loading ? 'Saving...' : editingId ? '💾 Update User' : '➕ Add User Profile'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users Grid */}
        {filtered.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ fontSize: '40px', margin: '0 0 10px' }}>👥</p>
            <p style={{ fontWeight: '600', color: '#555' }}>No users found.</p>
            <p style={{ fontSize: '13px', color: '#aaa', margin: '6px 0 0' }}>
              Click "Add User" to create the first branch staff profile.
            </p>
          </div>
        ) : (
          <div style={styles.usersGrid}>
            {filtered.map((user) => {
              const roleStyle = roleColors[user.role] || roleColors['Branch Manager'];
              return (
                <div key={user.id} style={{
                  ...styles.userCard,
                  opacity: user.status === 'Inactive' ? 0.6 : 1,
                  borderTop: `4px solid ${roleStyle.color}`,
                }}>
                  {/* User Avatar & Name */}
                  <div style={styles.userCardTop}>
                    <div style={{
                      ...styles.userAvatar,
                      background: roleStyle.color,
                    }}>
                      {(user.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div style={styles.userInfo}>
                      <p style={styles.userName}>{user.name}</p>
                      <p style={styles.userEmail}>{user.email}</p>
                      {user.phone && (
                        <p style={styles.userPhone}>📞 {user.phone}</p>
                      )}
                    </div>
                    <span style={{
                      ...styles.statusBadge,
                      background: user.status === 'Active' ? '#e6f9ee' : '#fff0f0',
                      color: user.status === 'Active' ? '#28a745' : '#dc3545',
                    }}>
                      {user.status === 'Active' ? '✅ Active' : '🚫 Inactive'}
                    </span>
                  </div>

                  {/* Role & Branch */}
                  <div style={styles.userMeta}>
                    <span style={{
                      ...styles.roleBadge,
                      background: roleStyle.bg,
                      color: roleStyle.color,
                      border: `1px solid ${roleStyle.border}`,
                    }}>
                      {user.role}
                    </span>
                    {user.branch && (
                      <span style={styles.branchBadge}>
                        📍 {user.branch}
                      </span>
                    )}
                  </div>

                  {/* Notes */}
                  {user.notes && (
                    <p style={styles.userNotes}>{user.notes}</p>
                  )}

                  {/* Actions */}
                  <div style={styles.userActions}>
                    <button style={styles.editBtn}
                      onClick={() => handleEdit(user)}>
                      ✏️ Edit
                    </button>
                    <button
                      style={user.status === 'Active'
                        ? styles.disableBtn : styles.enableBtn}
                      onClick={() => handleToggleStatus(user)}
                    >
                      {user.status === 'Active' ? '🚫 Disable' : '✅ Enable'}
                    </button>
                    {userRole === 'Super Admin' && (
                      <button style={styles.deleteBtn}
                        onClick={() => handleDelete(user.id)}>
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Setup Guide */}
      <div style={styles.guideCard}>
        <h3 style={styles.guideTitle}>📖 How to Give Branch Staff Access to CBMS</h3>
        <div style={styles.guideSteps}>
          <div style={styles.guideStep}>
            <div style={styles.guideStepNum}>1</div>
            <div style={styles.guideStepInfo}>
              <p style={styles.guideStepTitle}>Add User Profile Here</p>
              <p style={styles.guideStepDesc}>
                Click "Add User" and fill in their name, email, role and branch.
              </p>
            </div>
          </div>
          <div style={styles.guideStep}>
            <div style={styles.guideStepNum}>2</div>
            <div style={styles.guideStepInfo}>
              <p style={styles.guideStepTitle}>Create Firebase Auth Account</p>
              <p style={styles.guideStepDesc}>
                Go to Firebase Console → Authentication → Add user. Use the same email and set a password.
              </p>
            </div>
          </div>
          <div style={styles.guideStep}>
            <div style={styles.guideStepNum}>3</div>
            <div style={styles.guideStepInfo}>
              <p style={styles.guideStepTitle}>Link UID to Profile</p>
              <p style={styles.guideStepDesc}>
                Copy the UID from Firebase Auth. In Firestore → users collection, rename the document ID to that UID.
              </p>
            </div>
          </div>
          <div style={styles.guideStep}>
            <div style={styles.guideStepNum}>4</div>
            <div style={styles.guideStepInfo}>
              <p style={styles.guideStepTitle}>Share Login Details</p>
              <p style={styles.guideStepDesc}>
                Share the CBMS URL, email and password with the staff member. They can access from any device.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px', marginBottom: '24px',
  },
  statCard: {
    background: 'white', borderRadius: '12px',
    padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  statLabel: { color: '#888', fontSize: '12px', margin: '0 0 8px' },
  statValue: { color: '#1a1a2e', fontSize: '28px', fontWeight: '800', margin: '0 0 4px' },
  statSub: { color: '#aaa', fontSize: '11px', margin: 0 },
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
  addBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #0f3460, #e94560)',
    color: 'white', border: 'none', borderRadius: '8px',
    fontSize: '14px', fontWeight: '700', cursor: 'pointer',
  },
  filterRow: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
  filterSelect: {
    padding: '8px 14px', borderRadius: '8px',
    border: '2px solid #e0e0e0', fontSize: '14px', outline: 'none',
  },
  clearBtn: {
    padding: '8px 16px', background: '#fff0f0',
    color: '#dc3545', border: '1px solid #ffcccc',
    borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '20px',
  },
  modal: {
    background: 'white', borderRadius: '16px',
    width: '100%', maxWidth: '640px',
    maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', padding: '24px',
    borderBottom: '1px solid #f0f0f0',
    background: 'linear-gradient(135deg, #0f3460, #16213e)',
    borderRadius: '16px 16px 0 0',
  },
  modalHeaderLeft: { display: 'flex', gap: '16px', alignItems: 'flex-start' },
  modalIcon: {
    width: '48px', height: '48px', borderRadius: '12px',
    background: 'rgba(255,255,255,0.1)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: '24px',
  },
  modalTitle: { fontSize: '18px', fontWeight: '800', color: 'white', margin: '0 0 4px' },
  modalSub: { fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: 0, maxWidth: '380px' },
  closeBtn: {
    background: 'rgba(255,255,255,0.1)', border: 'none',
    color: 'white', width: '32px', height: '32px',
    borderRadius: '8px', cursor: 'pointer', fontSize: '16px',
  },
  instructionBox: {
    background: '#fff8e1', border: '1px solid #ffe082',
    margin: '16px 24px 0', borderRadius: '10px', padding: '14px 16px',
  },
  instructionTitle: {
    fontSize: '13px', fontWeight: '700',
    color: '#f39c12', margin: '0 0 8px',
  },
  instructionList: {
    margin: 0, paddingLeft: '20px',
    fontSize: '12px', color: '#555', lineHeight: '1.8',
  },
  modalBody: { padding: '20px 24px' },
  formSection: {
    background: '#fafafa', borderRadius: '10px',
    padding: '16px', marginBottom: '16px',
    border: '1px solid #f0f0f0',
  },
  formSectionLabel: {
    fontSize: '12px', fontWeight: '700', color: '#0f3460',
    margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#555' },
  input: {
    padding: '10px 14px', borderRadius: '8px',
    border: '2px solid #e0e0e0', fontSize: '14px', outline: 'none',
  },
  roleDescBox: {
    background: '#f0f4ff', borderRadius: '8px',
    padding: '12px 14px', marginTop: '12px',
    border: '1px solid #d0e0ff',
  },
  roleDescTitle: { fontSize: '12px', fontWeight: '700', color: '#0f3460', margin: '0 0 4px' },
  roleDescText: { fontSize: '12px', color: '#555', margin: 0, lineHeight: '1.6' },
  modalFooter: {
    display: 'flex', justifyContent: 'flex-end', gap: '12px',
    padding: '16px 24px', borderTop: '1px solid #f0f0f0',
    background: '#fafafa', borderRadius: '0 0 16px 16px',
  },
  cancelBtn: {
    padding: '10px 20px', background: '#f0f0f0',
    border: 'none', borderRadius: '8px',
    fontSize: '14px', cursor: 'pointer', color: '#666',
  },
  saveBtn: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #0f3460, #e94560)',
    color: 'white', border: 'none', borderRadius: '8px',
    fontSize: '14px', fontWeight: '700', cursor: 'pointer',
  },
  saveBtnDisabled: {
    padding: '10px 24px', background: '#ccc',
    color: 'white', border: 'none', borderRadius: '8px',
    fontSize: '14px', cursor: 'not-allowed',
  },
  usersGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  userCard: {
    background: 'white', borderRadius: '12px',
    padding: '18px', border: '1px solid #f0f0f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  userCardTop: {
    display: 'flex', gap: '12px', alignItems: 'flex-start',
    marginBottom: '12px',
  },
  userAvatar: {
    width: '44px', height: '44px', borderRadius: '50%',
    color: 'white', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontWeight: '800',
    fontSize: '18px', flexShrink: 0,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: '15px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  userEmail: { fontSize: '12px', color: '#888', margin: '2px 0 0' },
  userPhone: { fontSize: '12px', color: '#aaa', margin: '2px 0 0' },
  statusBadge: {
    padding: '4px 10px', borderRadius: '12px',
    fontSize: '11px', fontWeight: '700', flexShrink: 0,
  },
  userMeta: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' },
  roleBadge: {
    padding: '4px 10px', borderRadius: '12px',
    fontSize: '11px', fontWeight: '700',
  },
  branchBadge: {
    padding: '4px 10px', borderRadius: '12px',
    fontSize: '11px', background: '#f0f0f0', color: '#666',
  },
  userNotes: { fontSize: '12px', color: '#aaa', margin: '0 0 12px', fontStyle: 'italic' },
  userActions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  editBtn: {
    flex: 1, padding: '7px', background: '#f0f4ff',
    color: '#0f3460', border: 'none', borderRadius: '6px',
    fontSize: '12px', fontWeight: '600', cursor: 'pointer',
  },
  disableBtn: {
    flex: 1, padding: '7px', background: '#fff0f0',
    color: '#dc3545', border: 'none', borderRadius: '6px',
    fontSize: '12px', fontWeight: '600', cursor: 'pointer',
  },
  enableBtn: {
    flex: 1, padding: '7px', background: '#e6f9ee',
    color: '#28a745', border: 'none', borderRadius: '6px',
    fontSize: '12px', fontWeight: '600', cursor: 'pointer',
  },
  deleteBtn: {
    padding: '7px 10px', background: '#fff0f0',
    color: '#dc3545', border: 'none', borderRadius: '6px',
    fontSize: '13px', cursor: 'pointer',
  },
  empty: {
    textAlign: 'center', padding: '60px',
    color: '#aaa', fontSize: '14px',
  },
  guideCard: {
    background: 'white', borderRadius: '12px',
    padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  guideTitle: { fontSize: '16px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 20px' },
  guideSteps: { display: 'flex', flexDirection: 'column', gap: '16px' },
  guideStep: { display: 'flex', gap: '16px', alignItems: 'flex-start' },
  guideStepNum: {
    width: '32px', height: '32px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #0f3460, #e94560)',
    color: 'white', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontWeight: '800',
    fontSize: '14px', flexShrink: 0,
  },
  guideStepInfo: { flex: 1 },
  guideStepTitle: { fontSize: '14px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 4px' },
  guideStepDesc: { fontSize: '13px', color: '#666', margin: 0, lineHeight: '1.5' },
};