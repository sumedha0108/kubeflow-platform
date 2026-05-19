import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deployApp } from '../api/client';

const styles = {
  page: { padding: '32px', maxWidth: '600px', margin: '0 auto' },
  title: { fontSize: '22px', fontWeight: '600', marginBottom: '8px' },
  subtitle: { fontSize: '14px', color: '#6b7280', marginBottom: '24px' },
  card: { background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  field: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit' },
  hint: { fontSize: '12px', color: '#9ca3af', marginTop: '4px' },
  envRow: { display: 'flex', gap: '8px', marginBottom: '8px' },
  envInput: { flex: 1, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace' },
  addEnvBtn: { background: 'none', border: '1px dashed #d1d5db', color: '#6b7280', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', width: '100%', marginTop: '4px' },
  removeBtn: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px', padding: '0 4px' },
  submitBtn: { width: '100%', background: '#7c83fd', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' },
  error: { background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' },
  presets: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' },
  preset: { padding: '6px 14px', borderRadius: '20px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '13px', color: '#374151' },
};

const PRESETS = [
  { label: '📝 Ghost Blog', name: 'ghost-blog', image: 'ghost:alpine', port: 2368, env_vars: {} },
  { label: '🌐 Nginx', name: 'my-nginx', image: 'nginx:alpine', port: 80, env_vars: {} },
  { label: '🐍 Python App', name: 'python-app', image: 'python:3.11-alpine', port: 8000, env_vars: {} },
  { label: '📊 Grafana', name: 'my-grafana', image: 'grafana/grafana:latest', port: 3000, env_vars: { GF_AUTH_ANONYMOUS_ENABLED: 'true' } },
];

export default function Deploy() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', image: '', replicas: 1, port: 80 });
  const [envVars, setEnvVars] = useState([{ key: '', value: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const applyPreset = (preset) => {
    setForm({ name: preset.name, image: preset.image, replicas: 1, port: preset.port });
    const entries = Object.entries(preset.env_vars || {});
    setEnvVars(entries.length ? entries.map(([key, value]) => ({ key, value })) : [{ key: '', value: '' }]);
  };

  const handleChange = (e) => {
    const val = e.target.type === 'number' ? parseInt(e.target.value) : e.target.value;
    setForm({ ...form, [e.target.name]: val });
  };

  const updateEnv = (index, field, value) => {
    const updated = [...envVars];
    updated[index][field] = value;
    setEnvVars(updated);
  };

  const addEnvRow = () => setEnvVars([...envVars, { key: '', value: '' }]);
  const removeEnvRow = (index) => setEnvVars(envVars.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const env_vars = {};
    envVars.forEach(({ key, value }) => {
      if (key.trim()) env_vars[key.trim()] = value.trim();
    });

    try {
      const res = await deployApp({ ...form, env_vars });
      const url = res.data.url;
      if (url) {
        const hostname = url.replace('http://', '').split('/')[0];
        alert(`App deployed!\n\nTo access it, run this in your terminal:\n\necho "127.0.0.1 ${hostname}" | sudo tee -a /etc/hosts\n\nThen open: ${url}`);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Deployment failed. Check the app name (lowercase, no spaces).');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Deploy New App</h1>
      <p style={styles.subtitle}>Deploy any public Docker image to your Kubernetes cluster</p>

      <div style={styles.presets}>
        {PRESETS.map(p => (
          <button key={p.label} style={styles.preset} onClick={() => applyPreset(p)}>{p.label}</button>
        ))}
      </div>

      <div style={styles.card}>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>App Name</label>
            <input style={styles.input} name="name" value={form.name}
              onChange={handleChange} placeholder="my-app" required
              pattern="[a-z0-9-]+" title="Lowercase letters, numbers, hyphens only" />
            <p style={styles.hint}>Your app will be at http://{form.name || 'appname'}.local</p>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Docker Image</label>
            <input style={styles.input} name="image" value={form.image}
              onChange={handleChange} placeholder="nginx:alpine" required />
            <p style={styles.hint}>Any public image from Docker Hub</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Environment Variables <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label>
            {envVars.map((env, i) => (
              <div key={i} style={styles.envRow}>
                <input style={styles.envInput} placeholder="KEY" value={env.key}
                  onChange={e => updateEnv(i, 'key', e.target.value)} />
                <input style={styles.envInput} placeholder="value" value={env.value}
                  onChange={e => updateEnv(i, 'value', e.target.value)} />
                <button type="button" style={styles.removeBtn} onClick={() => removeEnvRow(i)}>×</button>
              </div>
            ))}
            <button type="button" style={styles.addEnvBtn} onClick={addEnvRow}>+ Add variable</button>
          </div>

          <button style={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? 'Deploying...' : '⎈ Deploy to Kubernetes'}
          </button>
        </form>
      </div>
    </div>
  );
}
