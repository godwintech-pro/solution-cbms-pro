import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  getDoc,
} from 'firebase/firestore';

async function getCompanyName() {
  try {
    const docSnap = await getDoc(doc(db, 'systemSettings', 'config'));
    if (docSnap.exists() && docSnap.data().companyName) return docSnap.data().companyName;
  } catch (err) {}
  return 'Solution Enterprises';
}

export default function Reports() {
  const { userName, userRole, userBranch } = useAuth();
  const [activeTab, setActiveTab] = useState(
    userRole === 'Super Admin' ? 'overview' : 'submit'
  );
  const tabs =
    userRole === 'Super Admin'
      ? [
          { id: 'overview', icon: '📊', label: 'Overview' },
          { id: 'allreports', icon: '📋', label: 'All Reports' },
          { id: 'submit', icon: '📝', label: 'Submit Report' },
        ]
      : [
          { id: 'submit', icon: '📝', label: 'Submit Report' },
          { id: 'allreports', icon: '📋', label: 'My Reports' },
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
      {activeTab === 'overview' && <ReportsOverview userRole={userRole} />}
      {activeTab === 'submit' && (
        <SubmitReport
          userName={userName}
          userRole={userRole}
          userBranch={userBranch}
          onSubmitted={() => setActiveTab('allreports')}
        />
      )}
      {activeTab === 'allreports' && (
        <AllReports userRole={userRole} userBranch={userBranch} />
      )}
    </div>
  );
}

// ─── REPORTS OVERVIEW ─────────────────────────────────────
function ReportsOverview({ userRole }) {
  const [reports, setReports] = useState([]);
  const [branches, setBranches] = useState([]);

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

  const today = new Date().toISOString().split('T')[0];
  const todayReports = reports.filter((r) => r.date === today);
  const totalSales = todayReports.reduce((s, r) => s + (r.totalSales || 0), 0);
  const totalExpenses = todayReports.reduce((s, r) => s + (r.totalExpenses || 0), 0);
  const totalVariance = todayReports.reduce((s, r) => s + (r.variance || 0), 0);

  function getBranchReport(branchId) {
    return todayReports.find((r) => r.branchId === branchId);
  }

  return (
    <div>
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, borderTop: '4px solid #0f3460' }}>
          <p style={styles.statLabel}>Total Sales Today</p>
          <p style={styles.statValue}>K {totalSales.toFixed(2)}</p>
          <p style={styles.statSub}>Across all branches</p>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #e94560' }}>
          <p style={styles.statLabel}>Total Expenses</p>
          <p style={styles.statValue}>K {totalExpenses.toFixed(2)}</p>
          <p style={styles.statSub}>Today</p>
        </div>
        <div style={{ ...styles.statCard, borderTop: `4px solid ${totalVariance < 0 ? '#dc3545' : '#28a745'}` }}>
          <p style={styles.statLabel}>Total Variance</p>
          <p style={{ ...styles.statValue, color: totalVariance < 0 ? '#dc3545' : '#28a745' }}>
            K {totalVariance.toFixed(2)}
          </p>
          <p style={styles.statSub}>{totalVariance < 0 ? '⚠️ Deficit detected' : '✅ All balanced'}</p>
        </div>
        <div style={{ ...styles.statCard, borderTop: '4px solid #f39c12' }}>
          <p style={styles.statLabel}>Reports Submitted</p>
          <p style={styles.statValue}>{todayReports.length}/{branches.length}</p>
          <p style={styles.statSub}>Branches reported today</p>
        </div>
      </div>

      <div style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>📍 Today's Branch Report Status</h3>
        <p style={styles.sectionSub}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        {branches.length === 0 ? (
          <div style={styles.empty}>No branches found.</div>
        ) : (
          <div style={styles.branchStatusGrid}>
            {branches.map((branch) => {
              const report = getBranchReport(branch.id);
              return (
                <div key={branch.id} style={{ ...styles.branchStatusCard, borderLeft: `4px solid ${report ? '#28a745' : '#dc3545'}` }}>
                  <div style={styles.branchStatusHeader}>
                    <span style={styles.branchStatusName}>{branch.name}</span>
                    <span style={{ ...styles.badge, background: report ? '#e6f9ee' : '#fff0f0', color: report ? '#28a745' : '#dc3545' }}>
                      {report ? '✅ Submitted' : '❌ Not Submitted'}
                    </span>
                  </div>
                  {report ? (
                    <div style={styles.branchReportSummary}>
                      <div style={styles.branchStat}>
                        <p style={styles.branchStatLabel}>Sales</p>
                        <p style={styles.branchStatValue}>K {(report.totalSales || 0).toFixed(2)}</p>
                      </div>
                      <div style={styles.branchStat}>
                        <p style={styles.branchStatLabel}>Expenses</p>
                        <p style={styles.branchStatValue}>K {(report.totalExpenses || 0).toFixed(2)}</p>
                      </div>
                      <div style={styles.branchStat}>
                        <p style={styles.branchStatLabel}>Variance</p>
                        <p style={{ ...styles.branchStatValue, color: (report.variance || 0) < 0 ? '#dc3545' : '#28a745' }}>
                          K {(report.variance || 0).toFixed(2)}
                        </p>
                      </div>
                      <div style={styles.branchStat}>
                        <p style={styles.branchStatLabel}>Submitted</p>
                        <p style={styles.branchStatValue}>
                          {report.submittedAt ? new Date(report.submittedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p style={styles.notSubmittedText}>Report not yet submitted for today.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SUBMIT REPORT ────────────────────────────────────────
function SubmitReport({ userName, userRole, userBranch, onSubmitted }) {
  const [branches, setBranches] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    branchId: '', date: today, openingFloat: '', totalSales: '', actualCash: '',
    expenses: [{ description: '', amount: '' }],
    stockReceived: 'No', stockSupplier: '', stockNotes: '',
    damages: 'No', damageNotes: '', additionalNotes: '',
  });

  useEffect(() => {
    const unsubB = onSnapshot(collection(db, 'branches'), (snap) => {
      setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubR = onSnapshot(collection(db, 'dailyReports'), (snap) => {
      setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubB(); unsubR(); };
  }, []);

  const alreadySubmitted = form.branchId
    ? reports.some((r) => r.branchId === form.branchId && r.date === form.date)
    : false;

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }
  function handleExpenseChange(index, field, value) {
    const updated = [...form.expenses];
    updated[index][field] = value;
    setForm({ ...form, expenses: updated });
  }
  function addExpense() { setForm({ ...form, expenses: [...form.expenses, { description: '', amount: '' }] }); }
  function removeExpense(index) { setForm({ ...form, expenses: form.expenses.filter((_, i) => i !== index) }); }

  const totalExpenses = form.expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const openingFloat = parseFloat(form.openingFloat) || 0;
  const totalSales = parseFloat(form.totalSales) || 0;
  const actualCash = parseFloat(form.actualCash) || 0;
  const expectedCash = openingFloat + totalSales - totalExpenses;
  const variance = actualCash - expectedCash;

  async function handleSubmit() {
    if (!form.branchId) return alert('Please select a branch.');
    if (!form.totalSales) return alert('Please enter total sales.');
    if (!form.actualCash) return alert('Please enter actual cash in hand.');
    if (alreadySubmitted) return alert('Report already submitted for this branch today.');
    setLoading(true);
    try {
      const reportData = {
        branchId: form.branchId,
        branchName: branches.find((b) => b.id === form.branchId)?.name || '',
        date: form.date, openingFloat, totalSales, totalExpenses,
        expenses: form.expenses.filter((e) => e.description && e.amount),
        actualCash, expectedCash, variance,
        stockReceived: form.stockReceived, stockSupplier: form.stockSupplier,
        stockNotes: form.stockNotes, damages: form.damages,
        damageNotes: form.damageNotes, additionalNotes: form.additionalNotes,
        submittedBy: userName || 'Unknown',
        submittedAt: serverTimestamp(), createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'dailyReports'), reportData);
      await addDoc(collection(db, 'notifications'), {
        type: 'REPORT_SUBMITTED',
        message: `📋 Daily report submitted for ${reportData.branchName} by ${userName}`,
        branchId: form.branchId, date: form.date, read: false, createdAt: serverTimestamp(),
      });
      if (variance < 0) {
        await addDoc(collection(db, 'notifications'), {
          type: 'VARIANCE_ALERT',
          message: `⚠️ Cash variance of K ${Math.abs(variance).toFixed(2)} detected at ${reportData.branchName}`,
          branchId: form.branchId, date: form.date, read: false, createdAt: serverTimestamp(),
        });
      }
      setSubmitted(true);
      setTimeout(() => { setSubmitted(false); onSubmitted(); }, 2000);
    } catch (err) { alert(err.message); }
    setLoading(false);
  }

  if (submitted) {
    return (
      <div style={styles.successBox}>
        <p style={styles.successIcon}>✅</p>
        <h3 style={styles.successTitle}>Report Submitted Successfully!</h3>
        <p style={styles.successSub}>Mr. Mwanza has been notified. Redirecting...</p>
      </div>
    );
  }

  return (
    <div style={styles.sectionCard}>
      <h3 style={styles.sectionTitle}>📝 Submit Daily Report</h3>
      <p style={styles.sectionSub}>Fill in all sections carefully. Report cannot be edited after submission.</p>

      <div style={styles.formSection}>
        <h4 style={styles.formSectionTitle}>🏪 Branch Information</h4>
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
            <input style={styles.input} type="date" name="date" value={form.date} onChange={handleChange} />
          </div>
        </div>
        {alreadySubmitted && (
          <div style={styles.warningBox}>⚠️ A report has already been submitted for this branch today.</div>
        )}
      </div>

      <div style={styles.formSection}>
        <h4 style={styles.formSectionTitle}>💰 Cash Section</h4>
        <div style={styles.formGrid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Opening Float (K)</label>
            <input style={styles.input} type="number" name="openingFloat" value={form.openingFloat} placeholder="0.00" onChange={handleChange} />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Total Sales (K) *</label>
            <input style={styles.input} type="number" name="totalSales" value={form.totalSales} placeholder="0.00" onChange={handleChange} />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Actual Cash in Hand (K) *</label>
            <input style={styles.input} type="number" name="actualCash" value={form.actualCash} placeholder="0.00" onChange={handleChange} />
          </div>
        </div>
      </div>

      <div style={styles.formSection}>
        <div style={styles.formSectionHeader}>
          <h4 style={styles.formSectionTitle}>📋 Expenses (Itemized)</h4>
          <button style={styles.addExpenseBtn} onClick={addExpense}>+ Add Expense</button>
        </div>
        {form.expenses.map((expense, index) => (
          <div key={index} style={styles.expenseRow}>
            <input style={{ ...styles.input, flex: 2 }} placeholder="Expense description e.g. Electricity"
              value={expense.description} onChange={(e) => handleExpenseChange(index, 'description', e.target.value)} />
            <input style={{ ...styles.input, flex: 1 }} type="number" placeholder="Amount (K)"
              value={expense.amount} onChange={(e) => handleExpenseChange(index, 'amount', e.target.value)} />
            {form.expenses.length > 1 && (
              <button style={styles.removeExpenseBtn} onClick={() => removeExpense(index)}>✕</button>
            )}
          </div>
        ))}
        <div style={styles.expenseTotal}>Total Expenses: <strong>K {totalExpenses.toFixed(2)}</strong></div>
      </div>

      <div style={styles.formSection}>
        <h4 style={styles.formSectionTitle}>📦 Stock Section</h4>
        <div style={styles.formGrid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Stock Received Today?</label>
            <select style={styles.input} name="stockReceived" value={form.stockReceived} onChange={handleChange}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          {form.stockReceived === 'Yes' && (
            <>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Supplier Name</label>
                <input style={styles.input} name="stockSupplier" value={form.stockSupplier} placeholder="e.g. Baxter Zambia" onChange={handleChange} />
              </div>
              <div style={{ ...styles.inputGroup, gridColumn: '1 / -1' }}>
                <label style={styles.label}>Stock Items Received</label>
                <input style={styles.input} name="stockNotes" value={form.stockNotes} placeholder="e.g. Paracetamol x200, Amoxicillin x100" onChange={handleChange} />
              </div>
            </>
          )}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Any Damages / Losses?</label>
            <select style={styles.input} name="damages" value={form.damages} onChange={handleChange}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          {form.damages === 'Yes' && (
            <div style={{ ...styles.inputGroup, gridColumn: '1 / -1' }}>
              <label style={styles.label}>Damage / Loss Details</label>
              <input style={styles.input} name="damageNotes" value={form.damageNotes} placeholder="Describe what was damaged or lost" onChange={handleChange} />
            </div>
          )}
        </div>
      </div>

      <div style={styles.summaryBox}>
        <h4 style={styles.summaryTitle}>📊 Auto-Calculated Summary</h4>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryRow}><span style={styles.summaryLabel}>Opening Float</span><span style={styles.summaryValue}>K {openingFloat.toFixed(2)}</span></div>
          <div style={styles.summaryRow}><span style={styles.summaryLabel}>Total Sales</span><span style={styles.summaryValue}>K {totalSales.toFixed(2)}</span></div>
          <div style={styles.summaryRow}><span style={styles.summaryLabel}>Less Expenses</span><span style={{ ...styles.summaryValue, color: '#dc3545' }}>- K {totalExpenses.toFixed(2)}</span></div>
          <div style={{ ...styles.summaryRow, borderTop: '2px solid #e0e0e0', paddingTop: '10px' }}>
            <span style={{ ...styles.summaryLabel, fontWeight: '700' }}>Expected Cash</span>
            <span style={{ ...styles.summaryValue, fontWeight: '700' }}>K {expectedCash.toFixed(2)}</span>
          </div>
          <div style={styles.summaryRow}><span style={styles.summaryLabel}>Actual Cash</span><span style={styles.summaryValue}>K {actualCash.toFixed(2)}</span></div>
          <div style={{ ...styles.summaryRow, background: variance < 0 ? '#fff0f0' : '#e6f9ee', borderRadius: '8px', padding: '10px', marginTop: '4px' }}>
            <span style={{ ...styles.summaryLabel, fontWeight: '800', color: variance < 0 ? '#dc3545' : '#28a745' }}>
              {variance < 0 ? '⚠️ Variance (Deficit)' : '✅ Variance'}
            </span>
            <span style={{ ...styles.summaryValue, fontWeight: '800', color: variance < 0 ? '#dc3545' : '#28a745' }}>
              K {variance.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div style={styles.formSection}>
        <h4 style={styles.formSectionTitle}>📝 Additional Notes</h4>
        <textarea style={styles.textarea} name="additionalNotes" value={form.additionalNotes}
          placeholder="Any other observations or notes for management..." onChange={handleChange} rows={3} />
      </div>

      <button
        style={alreadySubmitted || loading ? styles.submitBtnDisabled : styles.submitBtn}
        onClick={handleSubmit} disabled={alreadySubmitted || loading}>
        {loading ? 'Submitting...' : '📤 Submit Daily Report'}
      </button>
    </div>
  );
}

// ─── ALL REPORTS ──────────────────────────────────────────
function AllReports({ userRole, userBranch }) {
  const [reports, setReports] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filterBranch, setFilterBranch] = useState('');
  const [filterDate, setFilterDate] = useState('');

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

  const filtered = reports.filter((r) => {
    const matchBranch = filterBranch ? r.branchId === filterBranch : true;
    const matchDate = filterDate ? r.date === filterDate : true;
    const matchRole = userRole === 'Super Admin' ? true
      : r.branchId === branches.find((b) => b.name === userBranch)?.id;
    return matchBranch && matchDate && matchRole;
  });

  async function handlePrint(report) {
    const html = await generateReportPrint(report);
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.print();
  }

  async function generateReportPrint(r) {
    const companyName = await getCompanyName();
    const expenses = (r.expenses || [])
      .map((e) => `<tr><td>${e.description}</td><td>K ${parseFloat(e.amount).toFixed(2)}</td></tr>`)
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daily Report — ${r.branchName} — ${r.date}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
          h1 { color: #0f3460; font-size: 20px; }
          .subtitle { color: #666; font-size: 13px; }
          .section { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 6px; }
          .section h3 { margin: 0 0 10px; font-size: 14px; color: #0f3460; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 6px 0; font-size: 13px; border-bottom: 1px solid #eee; }
          td:last-child { text-align: right; }
          .variance { padding: 10px; border-radius: 6px; font-weight: bold; }
          .deficit { background: #fff0f0; color: #dc3545; }
          .balanced { background: #e6f9ee; color: #28a745; }
          .footer { margin-top: 30px; font-size: 11px; color: #aaa; text-align: center; }
        </style>
      </head>
      <body>
        <h1>📋 Daily Branch Report</h1>
        <p class="subtitle">${companyName} — CBMS</p>
        <p class="subtitle">Branch: <strong>${r.branchName}</strong></p>
        <p class="subtitle">Date: <strong>${r.date}</strong></p>
        <p class="subtitle">Submitted by: <strong>${r.submittedBy}</strong></p>

        <div class="section">
          <h3>💰 Cash Section</h3>
          <table>
            <tr><td>Opening Float</td><td>K ${(r.openingFloat || 0).toFixed(2)}</td></tr>
            <tr><td>Total Sales</td><td>K ${(r.totalSales || 0).toFixed(2)}</td></tr>
            <tr><td>Total Expenses</td><td>K ${(r.totalExpenses || 0).toFixed(2)}</td></tr>
            <tr><td><strong>Expected Cash</strong></td><td><strong>K ${(r.expectedCash || 0).toFixed(2)}</strong></td></tr>
            <tr><td>Actual Cash</td><td>K ${(r.actualCash || 0).toFixed(2)}</td></tr>
          </table>
          <div class="variance ${r.variance < 0 ? 'deficit' : 'balanced'}">
            Variance: K ${(r.variance || 0).toFixed(2)} ${r.variance < 0 ? '⚠️ Deficit' : '✅ Balanced'}
          </div>
        </div>

        <div class="section">
          <h3>📋 Expenses</h3>
          <table>${expenses || '<tr><td>No expenses recorded</td></tr>'}</table>
        </div>

        <div class="section">
          <h3>📦 Stock Section</h3>
          <table>
            <tr><td>Stock Received</td><td>${r.stockReceived}</td></tr>
            ${r.stockReceived === 'Yes' ? `
              <tr><td>Supplier</td><td>${r.stockSupplier || '—'}</td></tr>
              <tr><td>Items</td><td>${r.stockNotes || '—'}</td></tr>
            ` : ''}
            <tr><td>Damages/Losses</td><td>${r.damages}</td></tr>
            ${r.damages === 'Yes' ? `
              <tr><td>Details</td><td>${r.damageNotes || '—'}</td></tr>
            ` : ''}
          </table>
        </div>

        ${r.additionalNotes ? `
          <div class="section">
            <h3>📝 Additional Notes</h3>
            <p>${r.additionalNotes}</p>
          </div>
        ` : ''}

        <div class="footer">
          ${companyName} — CBMS © ${new Date().getFullYear()}
        </div>
      </body>
      </html>
    `;
  }

  return (
    <div style={styles.sectionCard}>
      <div style={styles.sectionHeader}>
        <div>
          <h3 style={styles.sectionTitle}>📋 Reports History</h3>
          <p style={styles.sectionSub}>{filtered.length} reports found.</p>
        </div>
      </div>

      <div style={styles.filterRow}>
        {userRole === 'Super Admin' && (
          <select style={styles.filterSelect} value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
            <option value="">All Branches</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <input style={styles.filterSelect} type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        {(filterBranch || filterDate) && (
          <button style={styles.clearBtn} onClick={() => { setFilterBranch(''); setFilterDate(''); }}>✕ Clear</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={styles.empty}>No reports found.</div>
      ) : (
        <div style={styles.reportsList}>
          {filtered.map((report) => (
            <div key={report.id} style={{ ...styles.reportCard, borderLeft: `4px solid ${report.variance < 0 ? '#dc3545' : '#28a745'}` }}>
              <div style={styles.reportCardHeader}>
                <div>
                  <p style={styles.reportBranch}>{report.branchName}</p>
                  <p style={styles.reportDate}>
                    📅 {report.date} · 👤 {report.submittedBy}
                    {report.submittedAt && ` · 🕐 ${new Date(report.submittedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
                <div style={styles.reportCardActions}>
                  <span style={{ ...styles.badge, background: report.variance < 0 ? '#fff0f0' : '#e6f9ee', color: report.variance < 0 ? '#dc3545' : '#28a745' }}>
                    {report.variance < 0 ? '⚠️ Variance' : '✅ Balanced'}
                  </span>
                  <button style={styles.viewBtn} onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}>
                    {selectedReport?.id === report.id ? 'Hide' : 'View'}
                  </button>
                  <button style={styles.printBtnSm} onClick={() => handlePrint(report)}>🖨️</button>
                </div>
              </div>

              <div style={styles.reportQuickStats}>
                <div style={styles.reportStat}><p style={styles.reportStatLabel}>Sales</p><p style={styles.reportStatValue}>K {(report.totalSales || 0).toFixed(2)}</p></div>
                <div style={styles.reportStat}><p style={styles.reportStatLabel}>Expenses</p><p style={styles.reportStatValue}>K {(report.totalExpenses || 0).toFixed(2)}</p></div>
                <div style={styles.reportStat}>
                  <p style={styles.reportStatLabel}>Variance</p>
                  <p style={{ ...styles.reportStatValue, color: report.variance < 0 ? '#dc3545' : '#28a745' }}>K {(report.variance || 0).toFixed(2)}</p>
                </div>
                <div style={styles.reportStat}><p style={styles.reportStatLabel}>Cash in Hand</p><p style={styles.reportStatValue}>K {(report.actualCash || 0).toFixed(2)}</p></div>
              </div>

              {selectedReport?.id === report.id && (
                <div style={styles.reportDetail}>
                  <div style={styles.detailSection}>
                    <p style={styles.detailTitle}>📋 Expenses</p>
                    {(report.expenses || []).length === 0 ? (
                      <p style={styles.detailEmpty}>No expenses recorded.</p>
                    ) : (
                      report.expenses.map((e, i) => (
                        <div key={i} style={styles.detailRow}>
                          <span>{e.description}</span>
                          <span>K {parseFloat(e.amount).toFixed(2)}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div style={styles.detailSection}>
                    <p style={styles.detailTitle}>📦 Stock</p>
                    <div style={styles.detailRow}><span>Stock Received</span><span>{report.stockReceived}</span></div>
                    {report.stockReceived === 'Yes' && (
                      <>
                        <div style={styles.detailRow}><span>Supplier</span><span>{report.stockSupplier || '—'}</span></div>
                        <div style={styles.detailRow}><span>Items</span><span>{report.stockNotes || '—'}</span></div>
                      </>
                    )}
                    <div style={styles.detailRow}><span>Damages/Losses</span><span>{report.damages}</span></div>
                    {report.damages === 'Yes' && (
                      <div style={styles.detailRow}><span>Details</span><span>{report.damageNotes || '—'}</span></div>
                    )}
                  </div>
                  {report.additionalNotes && (
                    <div style={styles.detailSection}>
                      <p style={styles.detailTitle}>📝 Notes</p>
                      <p style={styles.detailNotes}>{report.additionalNotes}</p>
                    </div>
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

// ─── STYLES ───────────────────────────────────────────────
const styles = {
  tabRow: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
  tab: { padding: '10px 20px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: '#666' },
  tabActive: { padding: '10px 20px', background: 'linear-gradient(135deg, #0f3460, #e94560)', border: '2px solid transparent', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: 'white', fontWeight: '700' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
  statCard: { background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  statLabel: { color: '#888', fontSize: '12px', margin: '0 0 8px' },
  statValue: { color: '#1a1a2e', fontSize: '26px', fontWeight: '800', margin: '0 0 4px' },
  statSub: { color: '#aaa', fontSize: '11px', margin: 0 },
  sectionCard: { background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  sectionTitle: { fontSize: '18px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  sectionSub: { fontSize: '13px', color: '#888', margin: '4px 0 0' },
  branchStatusGrid: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' },
  branchStatusCard: { padding: '16px', background: '#fafafa', borderRadius: '10px', border: '1px solid #f0f0f0' },
  branchStatusHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  branchStatusName: { fontSize: '15px', fontWeight: '700', color: '#1a1a2e' },
  badge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  branchReportSummary: { display: 'flex', gap: '24px', flexWrap: 'wrap' },
  branchStat: {},
  branchStatLabel: { fontSize: '11px', color: '#aaa', margin: 0 },
  branchStatValue: { fontSize: '15px', fontWeight: '700', color: '#1a1a2e', margin: '2px 0 0' },
  notSubmittedText: { fontSize: '13px', color: '#aaa', margin: 0 },
  formSection: { background: '#fafafa', borderRadius: '10px', padding: '20px', marginBottom: '16px', border: '1px solid #f0f0f0' },
  formSectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  formSectionTitle: { fontSize: '15px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#555' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '2px solid #e0e0e0', fontSize: '14px', outline: 'none' },
  textarea: { padding: '10px 14px', borderRadius: '8px', border: '2px solid #e0e0e0', fontSize: '14px', outline: 'none', width: '100%', resize: 'vertical', fontFamily: 'inherit' },
  warningBox: { background: '#fff8e1', border: '1px solid #f39c12', color: '#f39c12', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginTop: '12px' },
  addExpenseBtn: { padding: '6px 14px', background: '#f0f4ff', color: '#0f3460', border: '1px solid #d0e0ff', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' },
  expenseRow: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' },
  removeExpenseBtn: { padding: '8px 12px', background: '#fff0f0', color: '#dc3545', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  expenseTotal: { textAlign: 'right', fontSize: '14px', color: '#555', marginTop: '8px' },
  summaryBox: { background: '#f0f4ff', borderRadius: '10px', padding: '20px', marginBottom: '16px', border: '2px solid #d0e0ff' },
  summaryTitle: { fontSize: '15px', fontWeight: '700', color: '#0f3460', margin: '0 0 16px' },
  summaryGrid: { display: 'flex', flexDirection: 'column', gap: '8px' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: '14px', color: '#555' },
  summaryValue: { fontSize: '14px', fontWeight: '600', color: '#1a1a2e' },
  submitBtn: { width: '100%', padding: '16px', background: 'linear-gradient(135deg, #0f3460, #e94560)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' },
  submitBtnDisabled: { width: '100%', padding: '16px', background: '#ccc', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', cursor: 'not-allowed' },
  successBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', background: 'white', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  successIcon: { fontSize: '60px', margin: '0 0 16px' },
  successTitle: { fontSize: '24px', fontWeight: '800', color: '#28a745', margin: '0 0 8px' },
  successSub: { fontSize: '14px', color: '#888' },
  filterRow: { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  filterSelect: { padding: '10px 14px', borderRadius: '8px', border: '2px solid #e0e0e0', fontSize: '14px', outline: 'none' },
  clearBtn: { padding: '10px 16px', background: '#fff0f0', color: '#dc3545', border: '1px solid #ffcccc', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' },
  reportsList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  reportCard: { padding: '16px', background: '#fafafa', borderRadius: '10px', border: '1px solid #f0f0f0' },
  reportCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
  reportBranch: { fontSize: '16px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  reportDate: { fontSize: '12px', color: '#888', margin: '4px 0 0' },
  reportCardActions: { display: 'flex', gap: '8px', alignItems: 'center' },
  viewBtn: { padding: '6px 14px', background: '#f0f4ff', color: '#0f3460', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
  printBtnSm: { padding: '6px 10px', background: '#f0f0f0', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' },
  reportQuickStats: { display: 'flex', gap: '24px', flexWrap: 'wrap' },
  reportStat: {},
  reportStatLabel: { fontSize: '11px', color: '#aaa', margin: 0 },
  reportStatValue: { fontSize: '15px', fontWeight: '700', color: '#1a1a2e', margin: '2px 0 0' },
  reportDetail: { marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e0e0e0' },
  detailSection: { background: 'white', borderRadius: '8px', padding: '12px', marginBottom: '10px' },
  detailTitle: { fontSize: '13px', fontWeight: '700', color: '#0f3460', margin: '0 0 8px' },
  detailRow: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#555', padding: '4px 0', borderBottom: '1px solid #f0f0f0' },
  detailEmpty: { fontSize: '13px', color: '#aaa', margin: 0 },
  detailNotes: { fontSize: '13px', color: '#555', margin: 0 },
  empty: { textAlign: 'center', padding: '40px', color: '#aaa', fontSize: '14px' },
};