import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listApps, deleteApp } from '../api/client';
import StatusBadge from '../components/StatusBadge';

const styles = {
  page: { padding: '32px', maxWidth: '960px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '22px', fontWeight: '600' },
  deployBtn: { background: '#7c83fd', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  table: { width: '100%', background: '#fff', borderRadius: '12px', overflow: 'hidden', borderCollapse: 'collapse', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase', letterSpacing: '0.05em' },
  td: { padding: '14px 16px', borderBottom: '1px solid #f3f4f6', fontSize: '14px' },
  appName: { fontWeight: '600', color: '#7c83fd' },
  urlLink: { fontSize: '12px', color: '#059669', textDecoration: 'none', display: 'block', marginTop: '2px' },
  deleteBtn: { background: 'none', border: '1px solid #fca5a5', color: '#ef4444', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  empty: { textAlign: 'center', padding: '64px', color: '#9ca3af' },
};

export default function AppList() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchApps = async () => {
    try {
      const res = await listApps();
      setApps(res.data.filter(a => a.name !== 'platform'));
      setError(null);
    } catch {
      setError('Could not reach Platform API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
    const interval = setInterval(fetchApps, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    await deleteApp(name);
    fetchApps();
  };

  if (loading) return <div style={styles.page}>Loading...</div>;
  if (error) return <div style={{ ...styles.page, color: '#ef4444' }}>{error}</div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Running Apps ({apps.length})</h1>
        <Link to="/deploy"><button style={styles.deployBtn}>+ Deploy App</button></Link>
      </div>

      {apps.length === 0 ? (
        <div style={styles.empty}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No apps deployed yet</p>
          <p>Click "Deploy App" to get started</p>
        </div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Image</th>
              <th style={styles.th}>Pods</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {apps.map(app => (
              <tr key={app.name}>
                <td style={styles.td}>
                  <Link to={`/apps/${app.name}`} style={styles.appName}>{app.name}</Link>
                  {app.url && (
                    <a href={app.url} target="_blank" rel="noreferrer" style={styles.urlLink}>
                      ↗ {app.url}
                    </a>
                  )}
                </td>
                <td style={styles.td}>
                  <code style={{ fontSize: '12px', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>
                    {app.image || '—'}
                  </code>
                </td>
                <td style={styles.td}>{app.ready_pods ?? '—'} / {app.desired_replicas ?? '—'}</td>
                <td style={styles.td}><StatusBadge status={app.status} /></td>
                <td style={styles.td}>
                  <button style={styles.deleteBtn} onClick={() => handleDelete(app.name)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
