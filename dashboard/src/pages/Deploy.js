import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deployApp } from '../api/client';

const styles = {
  page: { padding: '32px', maxWidth: '560px', margin: '0 auto' },
  title: { fontSize: '22px', fontWeight: '600', marginBottom: '24px' },
  card: { background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  field: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none' },
  hint: { fontSize: '12px', color: '#9ca3af', marginTop: '4px' },
  submitBtn: { width: '100%', background: '#7c83fd', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' },
  error: { background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' },
  success: { background: '#d1fae5', color: '#065f46', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' },
};

export default function Deploy() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', image: 'nginx:alpine', replicas: 1, port: 80 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const val = e.target.type === 'number' ? parseInt(e.target.value) : e.target.value;
    setForm({ ...form, [e.target.name]: val });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await deployApp(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Deployment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Deploy New App</h1>
      <div style={styles.card}>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>App Name</label>
            <input style={styles.input} name="name" value={form.name}
              onChange={handleChange} placeholder="my-app" required
              pattern="[a-z0-9-]+" title="Lowercase letters, numbers, hyphens only" />
            <p style={styles.hint}>Lowercase letters, numbers and hyphens only</p>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Docker Image</label>
            <input style={styles.input} name="image" value={form.image}
              onChange={handleChange} placeholder="nginx:alpine" required />
            <p style={styles.hint}>Any public Docker Hub image</p>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Replicas</label>
            <input style={styles.input} name="replicas" type="number"
              value={form.replicas} onChange={handleChange} min="1" max="5" required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Container Port</label>
            <input style={styles.input} name="port" type="number"
              value={form.port} onChange={handleChange} required />
          </div>
          <button style={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? 'Deploying...' : '⎈ Deploy to Kubernetes'}
          </button>
        </form>
      </div>
    </div>
  );
}
