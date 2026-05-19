import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import {
  collection, addDoc, onSnapshot,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore';

export default function Messages() {
  const { userName, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('broadcast');

  const tabs = [
    { id: 'broadcast', icon: '📢', label: 'Broadcasts' },
    { id: 'chats', icon: '💬', label: 'Branch Chats' },
    { id: 'system', icon: '🔔', label: 'System Messages' },
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

      {activeTab === 'broadcast' && <Broadcasts />}
      {activeTab === 'chats' && <BranchChats />}
      {activeTab === 'system' && <SystemMessages />}
    </div>
  );
}

// ─── BROADCASTS ───────────────────────────────────────────
function Broadcasts() {
  const { userName, userRole } = useAuth();
  const [messages, setMessages] = useState([]);
  const [branches, setBranches] = useState([]);
  const [text, setText] = useState('');
  const [priority, setPriority] = useState('normal');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const unsubM = onSnapshot(
      query(collection(db, 'broadcasts'), orderBy('createdAt', 'asc')),
      (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubB = onSnapshot(collection(db, 'branches'), (snap) => {
      setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubM(); unsubB(); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!text.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'broadcasts'), {
        text: text.trim(),
        priority,
        sentBy: userName || 'Unknown',
        sentByRole: userRole || 'Staff',
        createdAt: serverTimestamp(),
      });

      // Create notification for all branches
      await addDoc(collection(db, 'notifications'), {
        type: 'BROADCAST',
        message: `📢 Broadcast from ${userName}: ${text.trim().slice(0, 60)}${text.length > 60 ? '...' : ''}`,
        read: false,
        createdAt: serverTimestamp(),
      });

      setText('');
    } catch (err) {
      alert(err.message);
    }
    setLoading(false);
  }

  const priorityColors = {
    normal: { bg: '#f0f4ff', border: '#d0e0ff', text: '#0f3460' },
    urgent: { bg: '#fff0f0', border: '#ffcccc', text: '#dc3545' },
    info: { bg: '#e6f9ee', border: '#b2dfdb', text: '#28a745' },
  };

  return (
    <div style={styles.sectionCard}>
      <div style={styles.sectionHeader}>
        <div>
          <h3 style={styles.sectionTitle}>📢 Broadcasts</h3>
          <p style={styles.sectionSub}>
            Send announcements to all branches instantly.
            {branches.length > 0 && ` ${branches.length} branches will receive this.`}
          </p>
        </div>
        <div style={styles.branchCount}>
          🏪 {branches.length} Branches
        </div>
      </div>

      {/* Messages */}
      <div style={styles.chatBox}>
        {messages.length === 0 ? (
          <div style={styles.emptyChat}>
            <p style={styles.emptyChatIcon}>📢</p>
            <p>No broadcasts yet.</p>
            <p style={styles.emptyChatSub}>
              Send your first broadcast to all branches below.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const colors = priorityColors[msg.priority] || priorityColors.normal;
            return (
              <div key={msg.id} style={{
                ...styles.broadcastMsg,
                background: colors.bg,
                border: `1px solid ${colors.border}`,
              }}>
                <div style={styles.msgHeader}>
                  <div style={styles.msgSenderRow}>
                    <div style={styles.msgAvatar}>
                      {(msg.sentBy || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={styles.msgSender}>{msg.sentBy}</p>
                      <p style={styles.msgRole}>{msg.sentByRole}</p>
                    </div>
                  </div>
                  <div style={styles.msgMeta}>
                    {msg.priority !== 'normal' && (
                      <span style={{
                        ...styles.priorityBadge,
                        background: colors.bg,
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                      }}>
                        {msg.priority === 'urgent' ? '🚨 URGENT' : 'ℹ️ INFO'}
                      </span>
                    )}
                    <span style={styles.msgTime}>
                      {msg.createdAt?.seconds
                        ? new Date(msg.createdAt.seconds * 1000)
                            .toLocaleString([], {
                              month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })
                        : 'Just now'}
                    </span>
                  </div>
                </div>
                <p style={{ ...styles.msgText, color: colors.text }}>{msg.text}</p>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Send Area */}
      {(userRole === 'Super Admin' || userRole === 'Branch Manager') && (
        <div style={styles.sendArea}>
          <div style={styles.sendOptions}>
            <label style={styles.label}>Priority:</label>
            {['normal', 'urgent', 'info'].map((p) => (
              <button
                key={p}
                style={priority === p ? styles.priorityActive : styles.priorityBtn}
                onClick={() => setPriority(p)}
              >
                {p === 'urgent' ? '🚨 Urgent' : p === 'info' ? 'ℹ️ Info' : '💬 Normal'}
              </button>
            ))}
          </div>
          <div style={styles.sendRow}>
            <textarea
              style={styles.textarea}
              placeholder="Type your broadcast message to all branches..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) handleSend();
              }}
            />
            <button
              style={loading || !text.trim() ? styles.sendBtnDisabled : styles.sendBtn}
              onClick={handleSend}
              disabled={loading || !text.trim()}
            >
              {loading ? '...' : '📤 Send'}
            </button>
          </div>
          <p style={styles.sendHint}>Ctrl + Enter to send</p>
        </div>
      )}
    </div>
  );
}

// ─── BRANCH CHATS ─────────────────────────────────────────
function BranchChats() {
  const { userName, userRole, userBranch } = useAuth();
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const unsubB = onSnapshot(collection(db, 'branches'), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setBranches(data);
      // Auto select branch for non-admin
      if (userRole !== 'Super Admin' && userBranch) {
        const myBranch = data.find((b) => b.name === userBranch);
        if (myBranch) setSelectedBranch(myBranch);
      }
    });
    return unsubB;
  }, []);

  useEffect(() => {
    if (!selectedBranch) return;
    const unsubM = onSnapshot(
      query(
        collection(db, `branchChats/${selectedBranch.id}/messages`),
        orderBy('createdAt', 'asc')
      ),
      (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return unsubM;
  }, [selectedBranch]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!text.trim() || !selectedBranch) return;
    setLoading(true);
    try {
      await addDoc(
        collection(db, `branchChats/${selectedBranch.id}/messages`),
        {
          text: text.trim(),
          sentBy: userName || 'Unknown',
          sentByRole: userRole || 'Staff',
          createdAt: serverTimestamp(),
        }
      );
      setText('');
    } catch (err) {
      alert(err.message);
    }
    setLoading(false);
  }

  const isMe = (msg) => msg.sentBy === userName;

  return (
    <div style={styles.chatLayout}>
      {/* Branch List */}
      {userRole === 'Super Admin' && (
        <div style={styles.branchList}>
          <h4 style={styles.branchListTitle}>🏪 Branches</h4>
          {branches.map((branch) => (
            <button
              key={branch.id}
              style={selectedBranch?.id === branch.id
                ? styles.branchItemActive
                : styles.branchItem}
              onClick={() => setSelectedBranch(branch)}
            >
              <span style={styles.branchItemIcon}>🏪</span>
              <span style={styles.branchItemName}>{branch.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Chat Area */}
      <div style={styles.chatArea}>
        {!selectedBranch ? (
          <div style={styles.noBranchSelected}>
            <p style={styles.emptyChatIcon}>💬</p>
            <p>Select a branch to start chatting.</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div style={styles.chatHeader}>
              <div style={styles.chatHeaderLeft}>
                <span style={styles.chatHeaderIcon}>🏪</span>
                <div>
                  <p style={styles.chatHeaderName}>{selectedBranch.name}</p>
                  <p style={styles.chatHeaderSub}>Branch Chat</p>
                </div>
              </div>
              <div style={styles.chatHeaderOnline}>
                <span style={styles.onlineDot} /> Live
              </div>
            </div>

            {/* Messages */}
            <div style={styles.chatBox}>
              {messages.length === 0 ? (
                <div style={styles.emptyChatCenter}>
                  <p style={styles.emptyChatIcon}>💬</p>
                  <p>No messages yet.</p>
                  <p style={styles.emptyChatSub}>
                    Start the conversation with {selectedBranch.name}.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} style={{
                    ...styles.msgWrapper,
                    justifyContent: isMe(msg) ? 'flex-end' : 'flex-start',
                  }}>
                    {!isMe(msg) && (
                      <div style={styles.msgAvatarSmall}>
                        {(msg.sentBy || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{
                      ...styles.msgBubble,
                      background: isMe(msg) ? '#0f3460' : 'white',
                      color: isMe(msg) ? 'white' : '#1a1a2e',
                      borderRadius: isMe(msg)
                        ? '16px 16px 4px 16px'
                        : '16px 16px 16px 4px',
                    }}>
                      {!isMe(msg) && (
                        <p style={{
                          ...styles.bubbleSender,
                          color: isMe(msg) ? 'rgba(255,255,255,0.7)' : '#e94560',
                        }}>
                          {msg.sentBy} · {msg.sentByRole}
                        </p>
                      )}
                      <p style={styles.bubbleText}>{msg.text}</p>
                      <p style={{
                        ...styles.bubbleTime,
                        color: isMe(msg) ? 'rgba(255,255,255,0.6)' : '#aaa',
                      }}>
                        {msg.createdAt?.seconds
                          ? new Date(msg.createdAt.seconds * 1000)
                              .toLocaleTimeString([], {
                                hour: '2-digit', minute: '2-digit'
                              })
                          : 'Just now'}
                      </p>
                    </div>
                    {isMe(msg) && (
                      <div style={{
                        ...styles.msgAvatarSmall,
                        background: '#e94560',
                      }}>
                        {(msg.sentBy || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Send */}
            <div style={styles.chatSendRow}>
              <input
                style={styles.chatInput}
                placeholder={`Message ${selectedBranch.name}...`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button
                style={loading || !text.trim()
                  ? styles.chatSendDisabled : styles.chatSend}
                onClick={handleSend}
                disabled={loading || !text.trim()}
              >
                ➤
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── SYSTEM MESSAGES ──────────────────────────────────────
function SystemMessages() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsubN = onSnapshot(
      query(collection(db, 'notifications'), orderBy('createdAt', 'desc')),
      (snap) => setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return unsubN;
  }, []);

  function getTypeStyle(type) {
    switch (type) {
      case 'VARIANCE_ALERT':
        return { bg: '#fff0f0', border: '#ffcccc', color: '#dc3545', icon: '⚠️' };
      case 'STOCK_ALERT':
        return { bg: '#fff8e1', border: '#ffe082', color: '#f39c12', icon: '📦' };
      case 'ORDER_SUBMITTED':
        return { bg: '#f0f4ff', border: '#d0e0ff', color: '#0f3460', icon: '🛒' };
      case 'ORDER_APPROVED':
        return { bg: '#e6f9ee', border: '#b2dfdb', color: '#28a745', icon: '✅' };
      case 'ORDER_REJECTED':
        return { bg: '#fff0f0', border: '#ffcccc', color: '#dc3545', icon: '❌' };
      case 'ORDER_RECEIVED':
        return { bg: '#e6f9ee', border: '#b2dfdb', color: '#28a745', icon: '📥' };
      case 'REPORT_SUBMITTED':
        return { bg: '#f0f4ff', border: '#d0e0ff', color: '#0f3460', icon: '📋' };
      case 'PO_GENERATED':
        return { bg: '#f3e6ff', border: '#e0b2ff', color: '#9b59b6', icon: '📄' };
      case 'BROADCAST':
        return { bg: '#fff8e1', border: '#ffe082', color: '#f39c12', icon: '📢' };
      default:
        return { bg: '#f0f0f0', border: '#e0e0e0', color: '#666', icon: '🔔' };
    }
  }

  return (
    <div style={styles.sectionCard}>
      <h3 style={styles.sectionTitle}>🔔 System Messages</h3>
      <p style={styles.sectionSub}>
        Auto-generated alerts and notifications from the system.
        {notifications.length > 0 && ` ${notifications.length} total messages.`}
      </p>

      {notifications.length === 0 ? (
        <div style={styles.emptyChatCenter}>
          <p style={styles.emptyChatIcon}>🔔</p>
          <p>No system messages yet.</p>
          <p style={styles.emptyChatSub}>
            System messages will appear here as the business operates.
          </p>
        </div>
      ) : (
        <div style={styles.systemMsgList}>
          {notifications.map((n) => {
            const typeStyle = getTypeStyle(n.type);
            return (
              <div key={n.id} style={{
                ...styles.systemMsg,
                background: typeStyle.bg,
                border: `1px solid ${typeStyle.border}`,
              }}>
                <div style={styles.systemMsgLeft}>
                  <span style={styles.systemMsgIcon}>{typeStyle.icon}</span>
                  <div>
                    <p style={{ ...styles.systemMsgText, color: typeStyle.color }}>
                      {n.message}
                    </p>
                    <p style={styles.systemMsgTime}>
                      {n.createdAt?.seconds
                        ? new Date(n.createdAt.seconds * 1000)
                            .toLocaleString([], {
                              month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })
                        : 'Just now'}
                    </p>
                  </div>
                </div>
                <span style={{
                  ...styles.systemMsgType,
                  background: typeStyle.bg,
                  color: typeStyle.color,
                  border: `1px solid ${typeStyle.border}`,
                }}>
                  {n.type?.replace(/_/g, ' ')}
                </span>
              </div>
            );
          })}
        </div>
      )}
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
  sectionCard: {
    background: 'white', borderRadius: '12px',
    padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  sectionHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '20px',
  },
  sectionTitle: { fontSize: '18px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 4px' },
  sectionSub: { fontSize: '13px', color: '#888', margin: 0 },
  branchCount: {
    background: '#f0f4ff', color: '#0f3460',
    padding: '8px 16px', borderRadius: '20px',
    fontSize: '13px', fontWeight: '700',
  },
  chatBox: {
    height: '400px', overflowY: 'auto',
    background: '#f8f9fa', borderRadius: '10px',
    padding: '16px', marginBottom: '16px',
    display: 'flex', flexDirection: 'column', gap: '12px',
  },
  emptyChatCenter: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    height: '100%', color: '#aaa', fontSize: '14px',
  },
  emptyChatIcon: { fontSize: '40px', margin: '0 0 8px' },
  emptyChatSub: { fontSize: '12px', color: '#ccc', margin: '4px 0 0' },
  emptyChat: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    flex: 1, color: '#aaa', fontSize: '14px',
    textAlign: 'center',
  },
  broadcastMsg: {
    borderRadius: '10px', padding: '14px',
  },
  msgHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '8px',
  },
  msgSenderRow: { display: 'flex', gap: '10px', alignItems: 'center' },
  msgAvatar: {
    width: '36px', height: '36px', borderRadius: '50%',
    background: '#0f3460', color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: '700', fontSize: '14px', flexShrink: 0,
  },
  msgSender: { fontSize: '14px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  msgRole: { fontSize: '11px', color: '#888', margin: '2px 0 0' },
  msgMeta: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' },
  msgTime: { fontSize: '11px', color: '#aaa' },
  msgText: { fontSize: '14px', lineHeight: '1.6', margin: 0 },
  priorityBadge: {
    padding: '2px 10px', borderRadius: '10px',
    fontSize: '11px', fontWeight: '700',
  },
  sendArea: { borderTop: '1px solid #f0f0f0', paddingTop: '16px' },
  sendOptions: {
    display: 'flex', gap: '8px', alignItems: 'center',
    marginBottom: '10px', flexWrap: 'wrap',
  },
  label: { fontSize: '12px', fontWeight: '600', color: '#555' },
  priorityBtn: {
    padding: '5px 12px', background: '#f0f0f0',
    border: 'none', borderRadius: '6px',
    fontSize: '12px', cursor: 'pointer', color: '#666',
  },
  priorityActive: {
    padding: '5px 12px', background: '#0f3460',
    border: 'none', borderRadius: '6px',
    fontSize: '12px', cursor: 'pointer',
    color: 'white', fontWeight: '700',
  },
  sendRow: { display: 'flex', gap: '10px', alignItems: 'flex-end' },
  textarea: {
    flex: 1, padding: '10px 14px', borderRadius: '8px',
    border: '2px solid #e0e0e0', fontSize: '14px',
    outline: 'none', resize: 'none', fontFamily: 'inherit',
  },
  sendBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #0f3460, #e94560)',
    color: 'white', border: 'none', borderRadius: '8px',
    fontSize: '14px', fontWeight: '700', cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  sendBtnDisabled: {
    padding: '10px 20px', background: '#ccc',
    color: 'white', border: 'none', borderRadius: '8px',
    fontSize: '14px', cursor: 'not-allowed', whiteSpace: 'nowrap',
  },
  sendHint: { fontSize: '11px', color: '#aaa', margin: '6px 0 0' },
  chatLayout: { display: 'flex', gap: '0', height: '600px' },
  branchList: {
    width: '200px', background: 'white', borderRadius: '12px 0 0 12px',
    padding: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    overflowY: 'auto', flexShrink: 0,
    borderRight: '1px solid #f0f0f0',
  },
  branchListTitle: {
    fontSize: '13px', fontWeight: '700',
    color: '#888', margin: '0 0 12px',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  branchItem: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '10px 12px', background: 'transparent',
    border: 'none', borderRadius: '8px', cursor: 'pointer',
    width: '100%', textAlign: 'left', marginBottom: '4px',
    color: '#666',
  },
  branchItemActive: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '10px 12px', background: '#f0f4ff',
    border: 'none', borderRadius: '8px', cursor: 'pointer',
    width: '100%', textAlign: 'left', marginBottom: '4px',
    color: '#0f3460', fontWeight: '700',
  },
  branchItemIcon: { fontSize: '16px' },
  branchItemName: { fontSize: '13px' },
  chatArea: {
    flex: 1, background: 'white',
    borderRadius: '0 12px 12px 0',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  noBranchSelected: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    flex: 1, color: '#aaa', fontSize: '14px',
  },
  chatHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '16px 20px',
    borderBottom: '1px solid #f0f0f0', background: '#fafafa',
  },
  chatHeaderLeft: { display: 'flex', gap: '12px', alignItems: 'center' },
  chatHeaderIcon: { fontSize: '24px' },
  chatHeaderName: { fontSize: '15px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  chatHeaderSub: { fontSize: '11px', color: '#aaa', margin: '2px 0 0' },
  chatHeaderOnline: {
    display: 'flex', alignItems: 'center',
    gap: '6px', fontSize: '12px', color: '#28a745',
  },
  onlineDot: {
    width: '8px', height: '8px', borderRadius: '50%',
    background: '#28a745', display: 'inline-block',
  },
  msgWrapper: {
    display: 'flex', gap: '8px', alignItems: 'flex-end',
  },
  msgAvatarSmall: {
    width: '28px', height: '28px', borderRadius: '50%',
    background: '#0f3460', color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: '700', fontSize: '11px', flexShrink: 0,
  },
  msgBubble: {
    maxWidth: '70%', padding: '10px 14px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  bubbleSender: { fontSize: '11px', fontWeight: '700', margin: '0 0 4px' },
  bubbleText: { fontSize: '14px', margin: 0, lineHeight: '1.5' },
  bubbleTime: { fontSize: '10px', margin: '4px 0 0', textAlign: 'right' },
  chatSendRow: {
    display: 'flex', gap: '10px', padding: '12px 16px',
    borderTop: '1px solid #f0f0f0', alignItems: 'center',
  },
  chatInput: {
    flex: 1, padding: '10px 14px', borderRadius: '24px',
    border: '2px solid #e0e0e0', fontSize: '14px',
    outline: 'none',
  },
  chatSend: {
    width: '44px', height: '44px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #0f3460, #e94560)',
    color: 'white', border: 'none', cursor: 'pointer',
    fontSize: '18px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0,
  },
  chatSendDisabled: {
    width: '44px', height: '44px', borderRadius: '50%',
    background: '#ccc', color: 'white', border: 'none',
    cursor: 'not-allowed', fontSize: '18px',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0,
  },
  systemMsgList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  systemMsg: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '12px 16px',
    borderRadius: '10px', gap: '12px', flexWrap: 'wrap',
  },
  systemMsgLeft: { display: 'flex', gap: '12px', alignItems: 'flex-start', flex: 1 },
  systemMsgIcon: { fontSize: '20px', flexShrink: 0 },
  systemMsgText: { fontSize: '13px', fontWeight: '600', margin: '0 0 2px' },
  systemMsgTime: { fontSize: '11px', color: '#aaa', margin: 0 },
  systemMsgType: {
    padding: '3px 10px', borderRadius: '10px',
    fontSize: '10px', fontWeight: '700', whiteSpace: 'nowrap',
    flexShrink: 0,
  },
};