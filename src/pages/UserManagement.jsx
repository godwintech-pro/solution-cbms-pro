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
    name: '', email: '', role: 'Branch Manager',
    branch: '', phone: '', status: 'Active', notes: '',
  });

  useEffect(() => {
    const unsubU = onSnapshot(collection(db, 'users'),
      (snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubB = onSnapshot(collection(db, 'branches'),
      (snap) => setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { unsubU(); unsubB(); };
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function resetForm() {
    setForm({ name: '', email: '', role: 'Branch Manager', branch: '', phone: '', status: 'Active', notes: '' });
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
    } catch (err) { alert(err.message); }
    setLoading(false);
  }

  async function handleToggleStatus(user) {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    await updateDoc(doc(db, 'users', user.id), { status: newStatus });
  }

  async function handleRoleChange(userId, newRole) {
    await updateDoc(doc(db, 'users', userId), {
      role: newRole, updatedAt: serverTimestamp(),
    });
  }

  async function handleBranchChange(userId, newBranch) {
    await updateDoc(doc(db, 'users', userId), {
      branch: newBranch, updatedAt: serverTimestamp(),
    });
  }

  async function handleDelete(id) {
    if (window.confirm('Delete this user profile? Note: You must also delete their account from Firebase Authentication.')) {
      await deleteDoc(doc(db, 'users', id));
    }
  }

  function handleEdit(user) {
    setForm({
      name: user.name || '', email: user.email || '',
      role: user.role || 'Branch Manager', branch: user.branch || '',
      phone: user.phone || '', status: user.status || 'Active', notes: user.notes || '',
    });
    setEditingId(user.id);
    setShowForm(true);
  }

  const roles = [
    'Super Admin', 'Branch Manager', 'Store Personnel',
    'Finance Staff', 'Procurement Team',
  ];

  const roleAccess = {
    'Super Admin': {
      color: '#e94560', bg: '#fff0f5', border: '#ffccdd',
      modules: ['All modules — full access'],
    },
    'Branch Manager': {
      color: '#0f3460', bg: '#f0f4ff', border: '#d0e0ff',
      modules: ['Overview', 'Inventory', 'Expiry', 'Reports', 'Orders', 'Messages'],
    },
    'Store Personnel': {
      color: '#28a745', bg: '#e6f9ee', border: '#b2dfdb',
      modules: ['Overview', 'Inventory', 'Expiry', 'Orders', 'Messages'],
    },
    'Finance Staff': {
      color: '#f39c12', bg: '#fff8e1', border: '#ffe082',
      modules: ['Overview', 'Finance', 'Reports', 'Messages'],
    },
    'Procurement Team': {
      color: '#9b59b6', bg: '#f3e6ff', border: '#e0b2ff',
      modules: ['Overview', 'Inventory', 'Expiry', 'Orders', 'Messages'],
    },
  };

  let filtered = users;
  if (filterRole) filtered = filtered.filter((u) => u.role === filterRole);
  if (filterBranch) filtered = filtered.filter((u) => u.branch === filterBranch);

  const activeUsers = users.filter((u) => u.status !== 'Inactive').length;
  const inactiveUsers = users.filter((u) => u.status === 'Inactive').length;

  return (
    <div>
      {/* Stats */}
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

      {/* Role Access Reference */}
      <div style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>🔐 Role Access Reference</h3>
        <p style={styles.sectionSub}>
          What each role can see in CBMS. Changes take effect on next login.
        </p>
        <div style={styles.roleGrid}>
          {Object.entries(roleAccess).map(([role, info]) => (
            <div key={role} style={{
              ...styles.roleCard,
              border: `1px solid ${info.border}`,
              background: info.bg,
            }}>
              <p style={{ ...styles.roleCardTitle, color: info.color }}>{role}</p>
              <div style={styles.roleModuleList}>
                {info.modules.map((mod) => (
                  <span key={mod} style={{ ...styles.roleModuleBadge, color: info.color, border: `1px solid ${info.border}` }}>
                    {mod}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.sectionTitle}>👥 System Users</h3>
            <p style={styles.sectionSub}>
              Manage roles, branches and access. Changes apply immediately.
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
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select style={styles.filterSelect} value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}>
            <option value="">All Branches</option>
            {branches.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
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
                        : 'Add user profile here. Then create their login in Firebase Authentication.'}
                    </p>
                  </div>
                </div>
                <button style={styles.closeBtn} onClick={resetForm}>✕</button>
              </div>

              {!editingId && (
                <div style={styles.instructionBox}>
                  <p style={styles.instructionTitle}>⚙️ How to give this user access:</p>
                  <ol style={styles.instructionList}>
                    <li>Fill in this form and save the profile</li>
                    <li>Go to Firebase Console → Authentication → Add user</li>
                    <li>Use the same email and set a password</li>
                    <li>Copy the UID and use it as the Firestore document ID</li>
                    <li>Share the login URL, email and password with the staff</li>
                  </ol>
                </div>
              )}

              <div style={styles.modalBody}>
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

                <div style={styles.formSection}>
                  <p style={styles.formSectionLabel}>🔐 Access & Permissions</p>
                  <div style={styles.formGrid}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Role *</label>
                      <select style={styles.input} name="role"
                        value={form.role} onChange={handleChange}>
                        {roles.map((r) => <option key={r} value={r}>{r}</option>)}
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

                  {form.role && roleAccess[form.role] && (
                    <div style={{
                      ...styles.roleDescBox,
                      background: roleAccess[form.role].bg,
                      border: `1px solid ${roleAccess[form.role].border}`,
                    }}>
                      <p style={{ ...styles.roleDescTitle, color: roleAccess[form.role].color }}>
                        ✅ {form.role} can access:
                      </p>
                      <p style={styles.roleDescText}>
                        {roleAccess[form.role].modules.join(' · ')}
                      </p>
                    </div>
                  )}
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Notes (Optional)</label>
                  <input style={styles.input} name="notes"
                    value={form.notes}
                    placeholder="Any additional notes..."
                    onChange={handleChange} />
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button style={styles.cancelBtn} onClick={resetForm}>Cancel</button>
                <button
                  style={loading ? styles.saveBtnDisabled : styles.saveBtn}
                  onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving...' : editingId ? '💾 Update User' : '➕ Add User Profile'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users List */}
        {filtered.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ fontSize: '40px', margin: '0 0 10px' }}>👥</p>
            <p style={{ fontWeight: '600', color: '#555' }}>No users found.</p>
            <p style={{ fontSize: '13px', color: '#aaa', margin: '6px 0 0' }}>
              Click "Add User" to create the first branch staff profile.
            </p>
          </div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHead}>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Branch</th>
                  <th style={styles.th}>Modules Access</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, i) => {
                  const roleInfo = roleAccess[user.role] || roleAccess['Branch Manager'];
                  return (
                    <tr key={user.id} style={{
                      ...(i % 2 === 0 ? styles.trEven : styles.trOdd),
                      opacity: user.status === 'Inactive' ? 0.6 : 1,
                    }}>
                      {/* User Info */}
                      <td style={styles.td}>
                        <div style={styles.userCell}>
                          <div style={{ ...styles.userAvatar, background: roleInfo.color }}>
                            {(user.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p style={styles.userName}>{user.name}</p>
                            <p style={styles.userEmail}>{user.email}</p>
                            {user.phone && <p style={styles.userPhone}>📞 {user.phone}</p>}
                          </div>
                        </div>
                      </td>

                      {/* Role — inline editable */}
                      <td style={styles.td}>
                        <select
                          style={{
                            ...styles.inlineSelect,
                            color: roleInfo.color,
                            background: roleInfo.bg,
                            border: `1px solid ${roleInfo.border}`,
                          }}
                          value={user.role || 'Branch Manager'}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={userRole !== 'Super Admin'}
                        >
                          {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>

                      {/* Branch — inline editable */}
                      <td style={styles.td}>
                        <select
                          style={styles.inlineSelectNeutral}
                          value={user.branch || ''}
                          onChange={(e) => handleBranchChange(user.id, e.target.value)}
                          disabled={userRole !== 'Super Admin'}
                        >
                          <option value="">— Select —</option>
                          <option value="Head Office">Head Office</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.name}>{b.name}</option>
                          ))}
                        </select>
                      </td>

                      {/* Modules */}
                      <td style={styles.td}>
                        <div style={styles.moduleBadges}>
                          {(roleAccess[user.role]?.modules || []).slice(0, 3).map((mod) => (
                            <span key={mod} style={{
                              ...styles.modBadge,
                              background: roleInfo.bg,
                              color: roleInfo.color,
                            }}>
                              {mod}
                            </span>
                          ))}
                          {(roleAccess[user.role]?.modules || []).length > 3 && (
                            <span style={{ ...styles.modBadge, background: '#f0f0f0', color: '#888' }}>
                              +{(roleAccess[user.role]?.modules || []).length - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusBadge,
                          background: user.status === 'Active' ? '#e6f9ee' : '#fff0f0',
                          color: user.status === 'Active' ? '#28a745' : '#dc3545',
                        }}>
                          {user.status === 'Active' ? '✅ Active' : '🚫 Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={styles.td}>
                        <div style={styles.actionBtns}>
                          <button style={styles.editBtn} onClick={() => handleEdit(user)}>✏️</button>
                          <button
                            style={user.status === 'Active' ? styles.disableBtn : styles.enableBtn}
                            onClick={() => handleToggleStatus(user)}>
                            {user.status === 'Active' ? '🚫' : '✅'}
                          </button>
                          {userRole === 'Super Admin' && (
                            <button style={styles.deleteBtn} onClick={() => handleDelete(user.id)}>🗑️</button>
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
      </div>

      {/* Setup Guide */}
      <div style={styles.guideCard}>
        <h3 style={styles.guideTitle}>📖 How to Give Branch Staff Access to CBMS</h3>
        <div style={styles.guideSteps}>
          {[
            { num: 1, title: 'Add User Profile Here', desc: 'Click "Add User" and fill in their name, email, role and branch. Their access modules are shown automatically.' },
            { num: 2, title: 'Create Firebase Auth Account', desc: 'Go to Firebase Console → Authentication → Add user. Use the same email and set a password.' },
            { num: 3, title: 'Link UID to Profile', desc: 'Copy the UID from Firebase Auth. In Firestore → users collection, rename the document ID to that UID.' },
            { num: 4, title: 'Share Login Details', desc: 'Share the CBMS URL, email and password. They will only see the modules their role allows.' },
          ].map((step) => (
            <div key={step.num} style={styles.guideStep}>
              <div style={styles.guideStepNum}>{step.num}</div>
              <div style={styles.guideStepInfo}>
                <p style={styles.guideStepTitle}>{step.title}</p>
                <p style={styles.guideStepDesc}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
  statCard: { background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  statLabel: { color: '#888', fontSize: '12px', margin: '0 0 8px' },
  statValue: { color: '#1a1a2e', fontSize: '28px', fontWeight: '800', margin: '0 0 4px' },
  statSub: { color: '#aaa', fontSize: '11px', margin: 0 },
  sectionCard: { background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '20px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  sectionTitle: { fontSize: '18px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 4px' },
  sectionSub: { fontSize: '13px', color: '#888', margin: 0 },
  roleGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' },
  roleCard: { borderRadius: '10px', padding: '14px' },
  roleCardTitle: { fontSize: '13px', fontWeight: '800', margin: '0 0 8px' },
  roleModuleList: { display: 'flex', flexWrap: 'wrap', gap: '4px' },
  roleModuleBadge: { fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px', background: 'white' },
  addBtn: { padding: '10px 20px', background: 'linear-gradient(135deg, #0f3460, #e94560)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  filterRow: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
  filterSelect: { padding: '8px 14px', borderRadius: '8px', border: '2px solid #e0e0e0', fontSize: '14px', outline: 'none' },
  clearBtn: { padding: '8px 16px', background: '#fff0f0', color: '#dc3545', border: '1px solid #ffcccc', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modal: { background: 'white', borderRadius: '16px', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px', background: 'linear-gradient(135deg, #0f3460, #16213e)', borderRadius: '16px 16px 0 0' },
  modalHeaderLeft: { display: 'flex', gap: '16px', alignItems: 'flex-start' },
  modalIcon: { width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' },
  modalTitle: { fontSize: '18px', fontWeight: '800', color: 'white', margin: '0 0 4px' },
  modalSub: { fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: 0, maxWidth: '380px' },
  closeBtn: { background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' },
  instructionBox: { background: '#fff8e1', border: '1px solid #ffe082', margin: '16px 24px 0', borderRadius: '10px', padding: '14px 16px' },
  instructionTitle: { fontSize: '13px', fontWeight: '700', color: '#f39c12', margin: '0 0 8px' },
  instructionList: { margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#555', lineHeight: '1.8' },
  modalBody: { padding: '20px 24px' },
  formSection: { background: '#fafafa', borderRadius: '10px', padding: '16px', marginBottom: '16px', border: '1px solid #f0f0f0' },
  formSectionLabel: { fontSize: '12px', fontWeight: '700', color: '#0f3460', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#555' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '2px solid #e0e0e0', fontSize: '14px', outline: 'none' },
  roleDescBox: { borderRadius: '8px', padding: '12px 14px', marginTop: '12px' },
  roleDescTitle: { fontSize: '12px', fontWeight: '700', margin: '0 0 4px' },
  roleDescText: { fontSize: '12px', color: '#555', margin: 0, lineHeight: '1.6' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid #f0f0f0', background: '#fafafa', borderRadius: '0 0 16px 16px' },
  cancelBtn: { padding: '10px 20px', background: '#f0f0f0', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: '#666' },
  saveBtn: { padding: '10px 24px', background: 'linear-gradient(135deg, #0f3460, #e94560)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  saveBtnDisabled: { padding: '10px 24px', background: '#ccc', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'not-allowed' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHead: { background: '#f0f4ff' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#0f3460' },
  td: { padding: '10px 16px', fontSize: '13px', color: '#444', verticalAlign: 'middle' },
  trEven: { background: 'white', borderBottom: '1px solid #f0f0f0' },
  trOdd: { background: '#fafafa', borderBottom: '1px solid #f0f0f0' },
  userCell: { display: 'flex', gap: '10px', alignItems: 'center' },
  userAvatar: { width: '36px', height: '36px', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px', flexShrink: 0 },
  userName: { fontSize: '13px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  userEmail: { fontSize: '11px', color: '#888', margin: '1px 0 0' },
  userPhone: { fontSize: '11px', color: '#aaa', margin: '1px 0 0' },
  inlineSelect: { padding: '5px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', outline: 'none' },
  inlineSelectNeutral: { padding: '5px 10px', borderRadius: '6px', fontSize: '12px', border: '1px solid #e0e0e0', outline: 'none', cursor: 'pointer', background: 'white' },
  moduleBadges: { display: 'flex', flexWrap: 'wrap', gap: '4px' },
  modBadge: { fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px' },
  statusBadge: { padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' },
  actionBtns: { display: 'flex', gap: '6px' },
  editBtn: { padding: '5px 8px', background: '#f0f4ff', color: '#0f3460', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  disableBtn: { padding: '5px 8px', background: '#fff0f0', color: '#dc3545', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  enableBtn: { padding: '5px 8px', background: '#e6f9ee', color: '#28a745', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  deleteBtn: { padding: '5px 8px', background: '#fff0f0', color: '#dc3545', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  empty: { textAlign: 'center', padding: '60px', color: '#aaa', fontSize: '14px' },
  guideCard: { background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  guideTitle: { fontSize: '16px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 20px' },
  guideSteps: { display: 'flex', flexDirection: 'column', gap: '16px' },
  guideStep: { display: 'flex', gap: '16px', alignItems: 'flex-start' },
  guideStepNum: { width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #0f3460, #e94560)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px', flexShrink: 0 },
  guideStepInfo: { flex: 1 },
  guideStepTitle: { fontSize: '14px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 4px' },
  guideStepDesc: { fontSize: '13px', color: '#666', margin: 0, lineHeight: '1.5' },
};