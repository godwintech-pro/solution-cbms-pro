import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleLogin() {
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>📊</div>
          <h1 style={styles.title}>CBMS</h1>
          <p style={styles.subtitle}>Central Business Management System</p>
          <p style={styles.branch}>Solution Enterprises</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              style={styles.input}
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            style={loading ? styles.buttonDisabled : styles.button}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

        <p style={styles.footer}>© 2025 CBMS · Solution Enterprises</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background:
      'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Segoe UI', sans-serif",
    padding: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
  },
  header: { textAlign: 'center', marginBottom: '30px' },
  logo: { fontSize: '48px', marginBottom: '10px' },
  title: { fontSize: '32px', fontWeight: '800', color: '#0f3460', margin: '0' },
  subtitle: { fontSize: '13px', color: '#666', margin: '5px 0 0' },
  branch: {
    fontSize: '12px',
    color: '#e94560',
    fontWeight: '600',
    marginTop: '4px',
  },
  error: {
    background: '#fff0f0',
    border: '1px solid #ffcccc',
    color: '#cc0000',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '20px',
    textAlign: 'center',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#333' },
  input: {
    padding: '12px 16px',
    borderRadius: '10px',
    border: '2px solid #e0e0e0',
    fontSize: '14px',
    outline: 'none',
  },
  button: {
    padding: '14px',
    background: 'linear-gradient(135deg, #0f3460, #e94560)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '10px',
  },
  buttonDisabled: {
    padding: '14px',
    background: '#ccc',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'not-allowed',
    marginTop: '10px',
  },
  footer: {
    textAlign: 'center',
    fontSize: '11px',
    color: '#aaa',
    marginTop: '30px',
  },
};
